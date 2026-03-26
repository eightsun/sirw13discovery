import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/insiden/[id] — full detail with investigasi, tindakan, timeline
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const { id } = params
  const adminClient = createAdminClient()
  const isOfficer = ALL_PENGURUS_ROLES.includes(auth.role)

  try {
    // Fetch incident
    const { data: insiden, error } = await adminClient
      .from('insiden')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !insiden) {
      return NextResponse.json({ error: 'Insiden tidak ditemukan' }, { status: 404 })
    }

    // Access control: warga can only see own reports or completed/closed non-anonymous
    if (!isOfficer) {
      const isOwn     = insiden.pelapor_id === auth.user.id
      const isPublic  = ['selesai', 'ditutup'].includes(insiden.status) && !insiden.is_anonim
      if (!isOwn && !isPublic) {
        return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
      }
    }

    // Fetch investigation
    const { data: investigasi } = await adminClient
      .from('insiden_investigasi')
      .select('*')
      .eq('insiden_id', id)
      .maybeSingle()

    // Only officers see draft investigations
    const visibleInvestigasi = (investigasi && (isOfficer || investigasi.status === 'final'))
      ? investigasi
      : null

    // Fetch action items
    const { data: tindakan } = await adminClient
      .from('insiden_tindakan')
      .select('*')
      .eq('insiden_id', id)
      .order('created_at', { ascending: true })

    // Fetch timeline
    const { data: timeline } = await adminClient
      .from('insiden_timeline')
      .select('*')
      .eq('insiden_id', id)
      .order('created_at', { ascending: true })

    // Enrich: pelapor name (hide for anonim if not officer)
    let pelaporNama: string | null = null
    if (!insiden.is_anonim || isOfficer) {
      if (insiden.warga_id) {
        const { data: w } = await adminClient
          .from('warga')
          .select('nama_lengkap, no_hp')
          .eq('id', insiden.warga_id)
          .single()
        pelaporNama = w?.nama_lengkap || null
      }
    }

    // Enrich timeline with creator names
    const creatorIds = Array.from(new Set((timeline || []).map((t: { dibuat_oleh: string | null }) => t.dibuat_oleh).filter(Boolean))) as string[]
    const creatorMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      const { data: creators } = await adminClient
        .from('users')
        .select('id, nama_lengkap')
        .in('id', creatorIds)
      creators?.forEach((c: { id: string; nama_lengkap: string }) => creatorMap.set(c.id, c.nama_lengkap))
    }

    // Enrich tindakan with PIC names
    const picIds = Array.from(new Set((tindakan || []).map((t: { penanggung_jawab_id: string | null }) => t.penanggung_jawab_id).filter(Boolean))) as string[]
    const picMap = new Map<string, string>()
    if (picIds.length > 0) {
      const { data: pics } = await adminClient
        .from('users')
        .select('id, nama_lengkap')
        .in('id', picIds)
      pics?.forEach((p: { id: string; nama_lengkap: string }) => picMap.set(p.id, p.nama_lengkap))
    }

    // Enrich investigator name
    let investigatorNama: string | null = null
    if (visibleInvestigasi?.investigator_id) {
      const { data: inv } = await adminClient
        .from('users')
        .select('nama_lengkap')
        .eq('id', visibleInvestigasi.investigator_id)
        .single()
      investigatorNama = inv?.nama_lengkap || null
    }

    return NextResponse.json({
      ...insiden,
      pelapor_nama: insiden.is_anonim && !isOfficer ? 'Anonim' : (pelaporNama || 'Tidak Diketahui'),
      investigasi: visibleInvestigasi
        ? { ...visibleInvestigasi, investigator_nama: investigatorNama }
        : null,
      tindakan: (tindakan || []).map((t: { penanggung_jawab_id: string | null }) => ({
        ...t,
        pic_nama: t.penanggung_jawab_id ? (picMap.get(t.penanggung_jawab_id) || null) : null,
      })),
      timeline: (timeline || []).map((t: { dibuat_oleh: string | null }) => ({
        ...t,
        pembuat_nama: t.dibuat_oleh ? (creatorMap.get(t.dibuat_oleh) || null) : null,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat detail insiden'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
