import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES, PENGURUS_RW_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_TRANSITIONS: Record<string, string[]> = {
  dilaporkan:        ['dalam_investigasi'],
  dalam_investigasi: ['menunggu_tindakan', 'selesai'],
  menunggu_tindakan: ['selesai'],
  selesai:           ['ditutup'],
  ditutup:           [],
}

// PATCH /api/insiden/[id]/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  // Only officers can change status
  if (!ALL_PENGURUS_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  const { id } = params
  const adminClient = createAdminClient()

  try {
    const body = await request.json()
    const { status: newStatus, catatan } = body

    if (!newStatus) {
      return NextResponse.json({ error: 'Status baru wajib diisi' }, { status: 400 })
    }

    // Fetch current incident
    const { data: insiden, error: fetchError } = await adminClient
      .from('insiden')
      .select('id, status, pelapor_id')
      .eq('id', id)
      .single()

    if (fetchError || !insiden) {
      return NextResponse.json({ error: 'Insiden tidak ditemukan' }, { status: 404 })
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[insiden.status] || []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Tidak dapat mengubah status dari "${insiden.status}" ke "${newStatus}"`,
      }, { status: 400 })
    }

    // 'ditutup' only by RW officers
    if (newStatus === 'ditutup' && !PENGURUS_RW_ROLES.includes(auth.role)) {
      return NextResponse.json({ error: 'Hanya Pengurus RW yang dapat menutup insiden' }, { status: 403 })
    }

    // Fetch updater name
    const { data: updaterUser } = await adminClient
      .from('users')
      .select('nama_lengkap')
      .eq('id', auth.user.id)
      .single()
    const updaterNama = updaterUser?.nama_lengkap || auth.user.email || 'Pengurus'

    // Update incident status
    const { error: updateError } = await adminClient
      .from('insiden')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw updateError

    // Log timeline
    await adminClient.from('insiden_timeline').insert({
      insiden_id: id,
      status_lama: insiden.status,
      status_baru: newStatus,
      catatan: catatan || null,
      dibuat_oleh: auth.user.id,
    })

    // Notify pelapor if not the one making the change
    if (insiden.pelapor_id && insiden.pelapor_id !== auth.user.id) {
      const STATUS_LABELS: Record<string, string> = {
        dalam_investigasi: 'Dalam Investigasi',
        menunggu_tindakan: 'Menunggu Tindakan',
        selesai:           'Selesai',
        ditutup:           'Ditutup',
      }
      await adminClient.from('notifikasi').insert({
        user_id: insiden.pelapor_id,
        judul:   `Laporan Insiden ${STATUS_LABELS[newStatus] || newStatus}`,
        pesan:   `Status laporan insiden Anda telah diperbarui menjadi "${STATUS_LABELS[newStatus] || newStatus}" oleh ${updaterNama}.${catatan ? ' Catatan: ' + catatan : ''}`,
        tipe:    'insiden',
        link:    `/insiden/${id}`,
      })
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
