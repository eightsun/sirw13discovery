import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES, PENGURUS_RW_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PATCH /api/insiden/[id]/tindakan/[tindakanId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; tindakanId: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const adminClient = createAdminClient()

  // Fetch tindakan
  const { data: tindakan, error: fetchErr } = await adminClient
    .from('insiden_tindakan')
    .select('id, insiden_id, penanggung_jawab_id, status')
    .eq('id', params.tindakanId)
    .eq('insiden_id', params.id)
    .single()

  if (fetchErr || !tindakan) {
    return NextResponse.json({ error: 'Tindakan tidak ditemukan' }, { status: 404 })
  }

  // PIC can update their own tindakan; officers can update any
  const isPIC     = tindakan.penanggung_jawab_id === auth.user.id
  const isOfficer = ALL_PENGURUS_ROLES.includes(auth.role)
  if (!isPIC && !isOfficer) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validStatuses = ['belum_dimulai', 'dalam_proses', 'selesai', 'batal']

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.status !== undefined) {
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
      updateData.status = body.status
      if (body.status === 'selesai') {
        updateData.tanggal_selesai = body.tanggal_selesai || new Date().toISOString().split('T')[0]
      }
    }
    if (isOfficer) {
      if (body.deskripsi           !== undefined) updateData.deskripsi            = body.deskripsi.trim()
      if (body.jenis               !== undefined) updateData.jenis                = body.jenis
      if (body.penanggung_jawab_id !== undefined) updateData.penanggung_jawab_id  = body.penanggung_jawab_id || null
      if (body.target_selesai      !== undefined) updateData.target_selesai       = body.target_selesai || null
    }
    if (body.catatan_penyelesaian !== undefined) {
      updateData.catatan_penyelesaian = body.catatan_penyelesaian
    }

    const { data, error } = await adminClient
      .from('insiden_tindakan')
      .update(updateData)
      .eq('id', params.tindakanId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memperbarui tindakan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/insiden/[id]/tindakan/[tindakanId] — RW officers only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; tindakanId: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  if (!PENGURUS_RW_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Hanya Pengurus RW yang dapat menghapus tindakan' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('insiden_tindakan')
    .delete()
    .eq('id', params.tindakanId)
    .eq('insiden_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
