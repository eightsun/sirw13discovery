import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, requireRole, isAuthError, PENGURUS_RW_ROLES } from '@/lib/auth/apiAuth'
import { bayarSchema, toggleOccupiedSchema, hapusBayarSchema, generateSchema, safeParseBody } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Ambil data monitoring per tahun (authenticated users only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth

    const { searchParams } = new URL(request.url)
    const tahun = searchParams.get('tahun') || new Date().getFullYear().toString()
    const rt = searchParams.get('rt') // optional filter

    const adminClient = createAdminClient()

    // Get all rumah
    let rumahQuery = adminClient
      .from('rumah')
      .select('*, jalan:jalan_id(id, nama_jalan), rt:rt_id(id, nomor_rt)')
      .order('blok')

    if (rt) {
      rumahQuery = rumahQuery.eq('rt_id', rt)
    }

    const { data: rumahList, error: rumahError } = await rumahQuery
    if (rumahError) throw rumahError

    // Get all tagihan for the year
    const startDate = `${tahun}-01-01`
    const endDate = `${tahun}-12-01`

    const { data: tagihanList, error: tagihanError } = await adminClient
      .from('tagihan_ipl')
      .select('*')
      .gte('bulan', startDate)
      .lte('bulan', endDate)

    if (tagihanError) throw tagihanError

    // Get tarif IPL
    const { data: tarifList } = await adminClient
      .from('tarif_ipl')
      .select('*')
      .order('periode_mulai', { ascending: false })

    // Build monitoring data: rumah x bulan
    const monitoringData = (rumahList || []).map((rumah: Record<string, unknown>) => {
      const rumahTagihan = (tagihanList || []).filter(
        (t: Record<string, unknown>) => t.rumah_id === rumah.id
      )

      const bulanData: Record<string, { jumlah_terbayar: number; jumlah_tagihan: number; status: string; is_occupied: boolean }> = {}

      for (let m = 1; m <= 12; m++) {
        const bulanKey = `${tahun}-${String(m).padStart(2, '0')}-01`
        const tagihan = rumahTagihan.find((t: Record<string, unknown>) => t.bulan === bulanKey)
        bulanData[String(m)] = tagihan
          ? {
              jumlah_terbayar: tagihan.jumlah_terbayar as number,
              jumlah_tagihan: tagihan.jumlah_tagihan as number,
              status: tagihan.status as string,
              is_occupied: tagihan.is_occupied as boolean,
            }
          : { jumlah_terbayar: 0, jumlah_tagihan: 0, status: 'belum_lunas', is_occupied: true }
      }

      return {
        rumah,
        bulan: bulanData,
      }
    })

    // Summary stats
    const totalRumah = rumahList?.length || 0
    const totalTagihan = (tagihanList || []).reduce((sum: number, t: Record<string, unknown>) => sum + (t.jumlah_tagihan as number || 0), 0)
    const totalTerbayar = (tagihanList || []).reduce((sum: number, t: Record<string, unknown>) => sum + (t.jumlah_terbayar as number || 0), 0)
    const totalLunas = (tagihanList || []).filter((t: Record<string, unknown>) => t.status === 'lunas').length
    const totalTagihanCount = (tagihanList || []).length

    return NextResponse.json({
      data: monitoringData,
      tarif: tarifList || [],
      summary: {
        total_rumah: totalRumah,
        total_tagihan: totalTagihan,
        total_terbayar: totalTerbayar,
        total_tunggakan: totalTagihan - totalTerbayar,
        persentase_lunas: totalTagihanCount > 0 ? Math.round((totalLunas / totalTagihanCount) * 100) : 0,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal mengambil data'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: Input pembayaran manual / update tagihan
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(PENGURUS_RW_ROLES)
    if (isAuthError(auth)) return auth

    const adminClient = createAdminClient()

    const body = await request.json()
    const { action } = body

    if (action === 'bayar') {
      const parsed = safeParseBody(bayarSchema, body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

      const { rumah_id, bulan, jumlah_dibayar: nominal, jumlah_tagihan, metode, catatan } = parsed.data
      const bulanDate = `${bulan}-01`
      const tagihanNominal = jumlah_tagihan ?? nominal
      const status = nominal >= tagihanNominal ? 'lunas' : nominal > 0 ? 'sebagian' : 'belum_lunas'

      // Check if tagihan exists
      const { data: existing } = await adminClient
        .from('tagihan_ipl')
        .select('id')
        .eq('rumah_id', rumah_id)
        .eq('bulan', bulanDate)
        .single()

      if (existing) {
        const { error: updateErr } = await adminClient
          .from('tagihan_ipl')
          .update({
            jumlah_tagihan: tagihanNominal,
            jumlah_terbayar: nominal,
            status,
            is_occupied: true,
            tanggal_lunas: status === 'lunas' ? new Date().toISOString() : null,
            keterangan: catatan || null,
          })
          .eq('id', existing.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await adminClient
          .from('tagihan_ipl')
          .insert({
            rumah_id,
            bulan: bulanDate,
            jumlah_tagihan: tagihanNominal,
            jumlah_terbayar: nominal,
            status,
            is_occupied: true,
            tanggal_lunas: status === 'lunas' ? new Date().toISOString() : null,
            keterangan: catatan || null,
          })
        if (insertErr) throw insertErr
      }

      // Insert pembayaran record
      if (nominal > 0) {
        await adminClient.from('pembayaran_ipl').insert({
          rumah_id,
          jumlah_dibayar: nominal,
          tanggal_bayar: new Date().toISOString().split('T')[0],
          metode: metode || 'tunai',
          bulan_dibayar: [bulanDate],
          status: 'verified',
          verified_by: auth.user.id,
          verified_at: new Date().toISOString(),
          dibayar_oleh: auth.user.id,
          catatan: catatan || null,
        })
      }

      return NextResponse.json({ success: true })

    } else if (action === 'toggle_occupied') {
      const parsed = safeParseBody(toggleOccupiedSchema, body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

      const { rumah_id, bulan, is_occupied, jumlah_tagihan } = parsed.data
      const bulanDate = `${bulan}-01`

      const { data: existing } = await adminClient
        .from('tagihan_ipl')
        .select('id')
        .eq('rumah_id', rumah_id)
        .eq('bulan', bulanDate)
        .single()

      if (existing) {
        const { error } = await adminClient
          .from('tagihan_ipl')
          .update({ is_occupied })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await adminClient
          .from('tagihan_ipl')
          .insert({
            rumah_id,
            bulan: bulanDate,
            jumlah_tagihan: jumlah_tagihan || 0,
            jumlah_terbayar: 0,
            status: 'belum_lunas',
            is_occupied,
          })
        if (error) throw error
      }

      return NextResponse.json({ success: true })

    } else if (action === 'hapus_bayar') {
      const parsed = safeParseBody(hapusBayarSchema, body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

      const { rumah_id, bulan } = parsed.data
      const bulanDate = `${bulan}-01`

      const { error } = await adminClient
        .from('tagihan_ipl')
        .update({
          jumlah_terbayar: 0,
          status: 'belum_lunas',
          tanggal_lunas: null,
        })
        .eq('rumah_id', rumah_id)
        .eq('bulan', bulanDate)

      if (error) throw error
      return NextResponse.json({ success: true })

    } else if (action === 'generate') {
      const parsed = safeParseBody(generateSchema, body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

      const { bulan, default_tarif } = parsed.data
      const bulanDate = `${bulan}-01`

      const { data: rumahList } = await adminClient.from('rumah').select('id')
      if (!rumahList) return NextResponse.json({ error: 'Tidak ada data rumah' }, { status: 400 })

      const { data: existing } = await adminClient
        .from('tagihan_ipl')
        .select('rumah_id')
        .eq('bulan', bulanDate)
      const existingIds = new Set((existing || []).map((e: Record<string, unknown>) => e.rumah_id))

      const toInsert = rumahList
        .filter((r: Record<string, unknown>) => !existingIds.has(r.id as string))
        .map((r: Record<string, unknown>) => ({
          rumah_id: r.id,
          bulan: bulanDate,
          jumlah_tagihan: default_tarif || 0,
          jumlah_terbayar: 0,
          status: 'belum_lunas',
          is_occupied: true,
        }))

      if (toInsert.length > 0) {
        const { error } = await adminClient.from('tagihan_ipl').insert(toInsert)
        if (error) throw error
      }

      return NextResponse.json({
        success: true,
        inserted: toInsert.length,
        skipped: existingIds.size,
      })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && 'message' in error) ? String((error as Record<string, unknown>).message) : 'Gagal memproses'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
