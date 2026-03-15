import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Diagnostik — buka /api/notifikasi di browser untuk cek setup
export async function GET() {
  const diagnostics: Record<string, unknown> = {}

  try {
    // 1. Cek env vars
    diagnostics.SUPABASE_URL = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    diagnostics.ANON_KEY = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    diagnostics.SERVICE_ROLE_KEY = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    // 2. Cek auth via cookie
    let authUserId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      authUserId = user?.id || null
      diagnostics.auth_user = user ? { id: user.id, email: user.email } : null
      diagnostics.auth_error = authError?.message || null
    } catch (e: any) {
      diagnostics.auth_error = e.message
    }

    // 3. Cek admin client
    try {
      const adminSupabase = createAdminClient()

      // Cari ketua
      const { data: ketuaList, error: ketuaError } = await adminSupabase
        .from('users')
        .select('id, role, rt_id, nama_lengkap')
        .eq('is_active', true)
        .in('role', ['ketua_rw', 'ketua_rt'])

      diagnostics.admin_client_works = !ketuaError
      diagnostics.admin_error = ketuaError?.message || null
      diagnostics.ketua_list = ketuaList?.map(k => ({ id: k.id, role: k.role, rt_id: k.rt_id, name: k.nama_lengkap }))

      // Cek jumlah notifikasi total
      const { count, error: countError } = await adminSupabase
        .from('notifikasi')
        .select('id', { count: 'exact', head: true })

      diagnostics.total_notifications = count
      diagnostics.notif_count_error = countError?.message || null

      // Cek notifikasi verifikasi yang ada (via admin, bypass RLS)
      const { data: verifikasiNotifs, error: verifError } = await adminSupabase
        .from('notifikasi')
        .select('id, user_id, judul, tipe, is_read, created_at')
        .eq('tipe', 'verifikasi')
        .order('created_at', { ascending: false })
        .limit(10)

      diagnostics.verifikasi_notifications = verifikasiNotifs
      diagnostics.verifikasi_error = verifError?.message || null

      // Cek notifikasi untuk user yang sedang login (via admin, bypass RLS)
      if (authUserId) {
        const { data: myNotifs, error: myError } = await adminSupabase
          .from('notifikasi')
          .select('id, judul, tipe, is_read, created_at')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false })
          .limit(10)

        diagnostics.my_notifications_via_admin = myNotifs
        diagnostics.my_notifications_error = myError?.message || null

        // Cek apakah user bisa baca notifikasi sendiri via RLS (client biasa)
        const supabaseClient = await createClient()
        const { data: myNotifsRLS, error: rlsError } = await supabaseClient
          .from('notifikasi')
          .select('id, judul, tipe, is_read, created_at')
          .eq('user_id', authUserId)
          .order('created_at', { ascending: false })
          .limit(10)

        diagnostics.my_notifications_via_rls = myNotifsRLS
        diagnostics.my_notifications_rls_error = rlsError?.message || null
        diagnostics.rls_vs_admin_match = (myNotifs?.length || 0) === (myNotifsRLS?.length || 0)
      }
    } catch (e: any) {
      diagnostics.admin_error = e.message
    }

    return NextResponse.json({ status: 'ok', diagnostics })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', error: err.message, diagnostics })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verifikasi user terautentikasi via cookie
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('Notification API: Unauthorized - no user from cookie')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Notification API: authenticated user:', user.id)

    const body = await request.json()
    const { notifications, notifyPengurus, wargaEdit } = body

    // Gunakan admin client untuk bypass RLS
    const adminSupabase = createAdminClient()

    // Mode: wargaEdit — full server-side flow for warga edit notification
    // Handles: check is_verified, clear rejection_reason, notify ketua
    if (wargaEdit) {
      const { warga_id, nama_warga, rt_id, rt_changed } = wargaEdit
      console.log('wargaEdit mode:', { warga_id, nama_warga, rt_id, rt_changed })

      if (!warga_id) {
        return NextResponse.json({ error: 'Missing warga_id' }, { status: 400 })
      }

      // Cek status user terkait via admin client (bypass RLS)
      const { data: linkedUser, error: userError } = await adminSupabase
        .from('users')
        .select('id, rejection_reason, is_verified')
        .eq('warga_id', warga_id)
        .single()

      if (userError) {
        console.error('Error fetching linked user:', userError)
        return NextResponse.json({ error: userError.message }, { status: 500 })
      }

      console.log('Linked user found:', linkedUser ? { id: linkedUser.id, is_verified: linkedUser.is_verified, rejection_reason: !!linkedUser.rejection_reason } : 'null')

      if (!linkedUser) {
        return NextResponse.json({ success: true, message: 'No linked user found' })
      }

      const hadRejection = !!linkedUser.rejection_reason
      const isUnverified = linkedUser.is_verified === false || linkedUser.is_verified === null

      // Hapus rejection_reason jika ada
      if (hadRejection) {
        const { error: clearError } = await adminSupabase
          .from('users')
          .update({ rejection_reason: null })
          .eq('id', linkedUser.id)

        if (clearError) {
          console.error('Error clearing rejection_reason:', clearError)
        } else {
          console.log('Cleared rejection_reason for user:', linkedUser.id)
        }
      }

      // Jika RT berubah, reset verifikasi
      if (rt_changed) {
        const { error: verifyError } = await adminSupabase
          .from('users')
          .update({ is_verified: false, verified_by: null, verified_at: null })
          .eq('id', linkedUser.id)

        if (verifyError) {
          console.error('Error resetting verification:', verifyError)
        } else {
          console.log('Reset verification for user:', linkedUser.id)
        }
      }

      // Kirim notifikasi ke Ketua RW + Ketua RT jika unverified atau RT berubah
      if (isUnverified || rt_changed) {
        const { data: ketuaList, error: ketuaError } = await adminSupabase
          .from('users')
          .select('id, role, rt_id')
          .eq('is_active', true)
          .in('role', ['ketua_rw', 'ketua_rt'])

        if (ketuaError) {
          console.error('Error fetching ketua list:', ketuaError)
          return NextResponse.json({ error: ketuaError.message }, { status: 500 })
        }

        console.log('Ketua list:', ketuaList?.map(k => ({ id: k.id, role: k.role, rt_id: k.rt_id })))

        if (ketuaList && ketuaList.length > 0) {
          const targetIds = ketuaList
            .filter(k => k.role === 'ketua_rw' || (k.role === 'ketua_rt' && k.rt_id === rt_id))
            .map(k => k.id)

          console.log('Target IDs:', targetIds)

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
              console.error('Error inserting wargaEdit notifications:', insertError)
              return NextResponse.json({ error: insertError.message }, { status: 500 })
            }

            console.log('wargaEdit notifications inserted:', insertedData?.length, 'records')
            return NextResponse.json({ success: true, count: insertedData?.length })
          }
        }

        return NextResponse.json({ success: true, count: 0, message: 'No matching ketua' })
      }

      return NextResponse.json({ success: true, message: 'User is already verified, no notification needed' })
    }

    // Mode: notifyPengurus — server looks up target users
    if (notifyPengurus) {
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
        console.error('Error fetching ketua list:', ketuaError)
        return NextResponse.json({ error: ketuaError.message }, { status: 500 })
      }

      console.log('notifyPengurus: Ketua list:', ketuaList?.length)

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
        console.error('Error inserting pengurus notifications:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      console.log('Pengurus notifications inserted:', insertedData?.length)
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
      console.error('Error inserting notifications:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Direct notifications inserted:', insertedData?.length)
    return NextResponse.json({ success: true, count: insertedData?.length })
  } catch (err) {
    console.error('Notification API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
