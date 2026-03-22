import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, isAuthError } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Diagnostik — hanya ketua_rw yang dapat mengakses
export async function GET() {
  try {
    const auth = await requireRole(['ketua_rw'])
    if (isAuthError(auth)) return auth

    const adminSupabase = createAdminClient()

    const { count } = await adminSupabase
      .from('notifikasi')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      status: 'ok',
      total_notifications: count,
      env_configured: {
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications, notifyPengurus, wargaEdit } = body

    const adminSupabase = createAdminClient()

    // Mode: wargaEdit — full server-side flow for warga edit notification
    if (wargaEdit) {
      const { warga_id, nama_warga, rt_id, rt_changed } = wargaEdit

      if (!warga_id) {
        return NextResponse.json({ error: 'Missing warga_id' }, { status: 400 })
      }

      const { data: linkedUser, error: userError } = await adminSupabase
        .from('users')
        .select('id, rejection_reason, is_verified')
        .eq('warga_id', warga_id)
        .single()

      if (userError) {
        return NextResponse.json({ error: userError.message }, { status: 500 })
      }

      if (!linkedUser) {
        return NextResponse.json({ success: true, message: 'No linked user found' })
      }

      const hadRejection = !!linkedUser.rejection_reason
      const isUnverified = linkedUser.is_verified === false || linkedUser.is_verified === null

      if (hadRejection) {
        await adminSupabase
          .from('users')
          .update({ rejection_reason: null })
          .eq('id', linkedUser.id)
      }

      if (rt_changed) {
        await adminSupabase
          .from('users')
          .update({ is_verified: false, verified_by: null, verified_at: null })
          .eq('id', linkedUser.id)
      }

      if (isUnverified || rt_changed) {
        const { data: ketuaList, error: ketuaError } = await adminSupabase
          .from('users')
          .select('id, role, rt_id')
          .eq('is_active', true)
          .in('role', ['ketua_rw', 'ketua_rt'])

        if (ketuaError) {
          return NextResponse.json({ error: ketuaError.message }, { status: 500 })
        }

        if (ketuaList && ketuaList.length > 0) {
          const targetIds = ketuaList
            .filter(k => k.role === 'ketua_rw' || (k.role === 'ketua_rt' && k.rt_id === rt_id))
            .map(k => k.id)

          if (targetIds.length > 0) {
            let judul: string
            let pesan: string

            if (rt_changed) {
              judul = 'Perpindahan RT - Perlu Verifikasi Ulang'
              pesan = `${nama_warga || 'Warga'} telah pindah RT dan memerlukan verifikasi ulang.`
            } else if (hadRejection) {
              judul = 'Warga Sudah Koreksi Data'
              pesan = `${nama_warga || 'Warga'} telah memperbarui datanya dan menunggu verifikasi ulang.`
            } else {
              judul = 'Warga Memperbarui Data - Perlu Verifikasi'
              pesan = `${nama_warga || 'Warga'} telah memperbarui datanya dan menunggu verifikasi.`
            }

            const notifData = targetIds.map(uid => ({
              user_id: uid,
              judul,
              pesan,
              tipe: 'verifikasi',
              link: '/admin/verifikasi-warga',
              is_read: false,
            }))

            const { data: insertedData, error: insertError } = await adminSupabase
              .from('notifikasi')
              .insert(notifData)
              .select('id')

            if (insertError) {
              return NextResponse.json({ error: insertError.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, count: insertedData?.length })
          }
        }

        return NextResponse.json({ success: true, count: 0, message: 'No matching ketua' })
      }

      return NextResponse.json({ success: true, message: 'User is already verified, no notification needed' })
    }

    // Mode: notifyPengurus — server looks up target users (pengurus only)
    if (notifyPengurus) {
      const adminCheck = createAdminClient()
      const { data: callerData } = await adminCheck.from('users').select('role').eq('id', user.id).single()
      const pengurusRoles = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw', 'ketua_rt', 'sekretaris_rt', 'bendahara_rt']
      if (!callerData || !pengurusRoles.includes(callerData.role)) {
        return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
      }

      const { judul, pesan, tipe, link, rt_id } = notifyPengurus

      if (!judul || !pesan || !tipe) {
        return NextResponse.json({ error: 'Missing notifyPengurus fields' }, { status: 400 })
      }

      const { data: ketuaList, error: ketuaError } = await adminSupabase
        .from('users')
        .select('id, role, rt_id')
        .eq('is_active', true)
        .in('role', ['ketua_rw', 'ketua_rt'])

      if (ketuaError) {
        return NextResponse.json({ error: ketuaError.message }, { status: 500 })
      }

      if (!ketuaList || ketuaList.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'No ketua found' })
      }

      const targetIds = ketuaList
        .filter(k => k.role === 'ketua_rw' || (k.role === 'ketua_rt' && k.rt_id === rt_id))
        .map(k => k.id)

      if (targetIds.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'No matching ketua' })
      }

      const notifData = targetIds.map(uid => ({
        user_id: uid,
        judul,
        pesan,
        tipe,
        link: link || null,
        is_read: false,
      }))

      const { data: insertedData, error: insertError } = await adminSupabase
        .from('notifikasi')
        .insert(notifData)
        .select('id')

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, count: insertedData?.length })
    }

    // Mode: direct notifications with explicit user_ids
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json({ error: 'Invalid notifications data' }, { status: 400 })
    }

    const notifData = notifications.map((n: { user_id: string; judul: string; pesan: string; tipe: string; link?: string | null }) => ({
      user_id: n.user_id,
      judul: n.judul,
      pesan: n.pesan,
      tipe: n.tipe,
      link: n.link || null,
      is_read: false,
    }))

    const { data: insertedData, error } = await adminSupabase.from('notifikasi').insert(notifData).select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: insertedData?.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
