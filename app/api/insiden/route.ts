import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PER_PAGE = 12

// ─────────────────────────────────────────────
// GET /api/insiden  — list incidents (role-filtered via RLS)
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')   || ''
  const jenis    = searchParams.get('jenis')    || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const from     = (page - 1) * PER_PAGE

  try {
    // Server client respects RLS — automatically filters by role
    const supabase = await createClient()

    let query = supabase
      .from('insiden')
      .select(`
        id, kode_insiden, jenis, tanggal_kejadian, waktu_kejadian,
        lokasi, deskripsi, dampak, tingkat_keparahan, foto_urls,
        status, is_anonim, pelapor_id, warga_id, created_at, updated_at
      `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (jenis)  query = query.eq('jenis', jenis)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + PER_PAGE - 1)

    if (error) throw error

    // For officers: attach pelapor name (masked if is_anonim)
    // For warga: RLS already restricts to own + completed records
    const isOfficer = ALL_PENGURUS_ROLES.includes(auth.role)
    let enriched = data || []

    if (isOfficer && enriched.length > 0) {
      const adminClient = createAdminClient()
      const nonAnonIds = enriched
        .filter(i => !i.is_anonim && i.warga_id)
        .map(i => i.warga_id as string)

      if (nonAnonIds.length > 0) {
        const { data: wargaData } = await adminClient
          .from('warga')
          .select('id, nama_lengkap')
          .in('id', nonAnonIds)

        const wargaMap = new Map(wargaData?.map(w => [w.id, w.nama_lengkap]) || [])
        enriched = enriched.map(i => ({
          ...i,
          pelapor_nama: i.is_anonim ? 'Anonim' : (wargaMap.get(i.warga_id) || 'Tidak Diketahui'),
        }))
      }
    }

    return NextResponse.json({
      data: enriched,
      count: count || 0,
      page,
      per_page: PER_PAGE,
      total_pages: Math.ceil((count || 0) / PER_PAGE),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat data insiden'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─────────────────────────────────────────────
// POST /api/insiden  — create new incident report
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const {
      jenis,
      tanggal_kejadian,
      waktu_kejadian,
      lokasi,
      deskripsi,
      dampak,
      tingkat_keparahan,
      is_anonim,
      foto_urls,
    } = body

    // Validate required fields
    if (!jenis || !tanggal_kejadian || !lokasi || !deskripsi || !dampak || !tingkat_keparahan) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    const validJenis    = ['insiden', 'hampir_celaka']
    const validDampak   = ['tidak_ada', 'cedera_ringan', 'cedera_serius', 'kerusakan_properti', 'gangguan_lingkungan']
    const validTingkat  = ['rendah', 'sedang', 'tinggi', 'kritis']

    if (!validJenis.includes(jenis))   return NextResponse.json({ error: 'Jenis insiden tidak valid' }, { status: 400 })
    if (!validDampak.includes(dampak)) return NextResponse.json({ error: 'Dampak tidak valid' }, { status: 400 })
    if (!validTingkat.includes(tingkat_keparahan)) return NextResponse.json({ error: 'Tingkat keparahan tidak valid' }, { status: 400 })

    // Use admin client to insert (bypasses INSERT RLS friction & gets warga_id)
    const adminClient = createAdminClient()

    // Look up warga_id from users table
    const { data: userData } = await adminClient
      .from('users')
      .select('warga_id')
      .eq('id', auth.user.id)
      .single()

    const insertData = {
      kode_insiden: '',           // trigger generates this
      jenis,
      tanggal_kejadian,
      waktu_kejadian: waktu_kejadian || null,
      lokasi: lokasi.trim(),
      deskripsi: deskripsi.trim(),
      dampak,
      tingkat_keparahan,
      foto_urls: foto_urls || [],
      status: 'dilaporkan',
      pelapor_id: auth.user.id,
      warga_id: userData?.warga_id || null,
      is_anonim: Boolean(is_anonim),
    }

    const { data: insiden, error: insertError } = await adminClient
      .from('insiden')
      .insert(insertData)
      .select('id, kode_insiden')
      .single()

    if (insertError) throw insertError

    // Create initial timeline entry
    await adminClient.from('insiden_timeline').insert({
      insiden_id: insiden.id,
      status_lama: null,
      status_baru: 'dilaporkan',
      catatan: 'Laporan insiden dikirim',
      dibuat_oleh: auth.user.id,
    })

    return NextResponse.json({ success: true, id: insiden.id, kode_insiden: insiden.kode_insiden }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat laporan insiden'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
