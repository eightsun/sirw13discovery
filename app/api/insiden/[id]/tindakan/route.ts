import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/insiden/[id]/tindakan
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('insiden_tindakan')
    .select('*')
    .eq('insiden_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with PIC names
  const picIds = Array.from(new Set((data || []).map((t: { penanggung_jawab_id: string | null }) => t.penanggung_jawab_id).filter(Boolean))) as string[]
  const picMap = new Map<string, string>()
  if (picIds.length > 0) {
    const { data: pics } = await adminClient
      .from('users')
      .select('id, nama_lengkap')
      .in('id', picIds)
    pics?.forEach((p: { id: string; nama_lengkap: string }) => picMap.set(p.id, p.nama_lengkap))
  }

  return NextResponse.json(
    (data || []).map((t: { penanggung_jawab_id: string | null }) => ({
      ...t,
      pic_nama: t.penanggung_jawab_id ? (picMap.get(t.penanggung_jawab_id) || null) : null,
    }))
  )
}

// POST /api/insiden/[id]/tindakan — add action item (officers only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  if (!ALL_PENGURUS_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Verify incident exists
  const { data: insiden } = await adminClient
    .from('insiden')
    .select('id')
    .eq('id', params.id)
    .single()
  if (!insiden) return NextResponse.json({ error: 'Insiden tidak ditemukan' }, { status: 404 })

  try {
    const body = await request.json()

    if (!body.jenis || !body.deskripsi?.trim()) {
      return NextResponse.json({ error: 'Jenis dan deskripsi wajib diisi' }, { status: 400 })
    }
    if (!['korektif', 'preventif'].includes(body.jenis)) {
      return NextResponse.json({ error: 'Jenis tidak valid' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('insiden_tindakan')
      .insert({
        insiden_id:           params.id,
        jenis:                body.jenis,
        deskripsi:            body.deskripsi.trim(),
        penanggung_jawab_id:  body.penanggung_jawab_id || null,
        target_selesai:       body.target_selesai       || null,
        status:               'belum_dimulai',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal menambah tindakan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
