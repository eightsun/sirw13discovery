import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: Summary IPL per RT per tahun
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun = searchParams.get('tahun') // optional, if not provided return all years

    const adminClient = createAdminClient()

    // Get all rumah with RT info
    const { data: rumahList } = await adminClient
      .from('rumah')
      .select('id, blok, tarif_default, rt:rt_id(id, nomor_rt)')

    // Get all tagihan
    let tagihanQuery = adminClient.from('tagihan_ipl').select('*')
    if (tahun) {
      tagihanQuery = tagihanQuery
        .gte('bulan', `${tahun}-01-01`)
        .lte('bulan', `${tahun}-12-01`)
    }
    const { data: tagihanList } = await tagihanQuery

    // Get unique years from tagihan
    const years = new Set<string>()
    ;(tagihanList || []).forEach((t: Record<string, unknown>) => {
      const y = (t.bulan as string).substring(0, 4)
      years.add(y)
    })
    // Also add current year if no data
    if (years.size === 0) years.add(new Date().getFullYear().toString())

    // Build summary per RT per year
    const rtMap = new Map<string, { id: string; nomor_rt: string }>()
    const rumahByRT = new Map<string, { id: string; tarif_default: number }[]>()

    ;(rumahList || []).forEach((r: Record<string, unknown>) => {
      const rt = r.rt as { id: string; nomor_rt: string } | null
      if (rt) {
        rtMap.set(rt.id, rt)
        if (!rumahByRT.has(rt.id)) rumahByRT.set(rt.id, [])
        rumahByRT.get(rt.id)!.push({ id: r.id as string, tarif_default: (r.tarif_default as number) || 100000 })
      }
    })

    const summaryData: {
      rt_id: string
      nomor_rt: string
      tahun: string
      total_rumah: number
      bulan_lunas: number
      bulan_belum: number
      total_terbayar: number
      total_tagihan_nominal: number
      persen_lunas: number
    }[] = []

    rtMap.forEach((rt, rtId) => {
      const rumahItems = rumahByRT.get(rtId) || []
      const rumahIds = rumahItems.map(r => r.id)

      years.forEach(year => {
        const rtTagihan = (tagihanList || []).filter((t: Record<string, unknown>) => {
          const tYear = (t.bulan as string).substring(0, 4)
          return rumahIds.includes(t.rumah_id as string) && tYear === year
        })

        // Count bulan yang sudah bayar (jumlah_terbayar > 0)
        const bulanLunas = rtTagihan.filter((t: Record<string, unknown>) => (t.jumlah_terbayar as number) > 0).length
        const totalBulanSeharusnya = rumahItems.length * 12
        const bulanBelum = totalBulanSeharusnya - bulanLunas
        const totalTerbayar = rtTagihan.reduce((sum: number, t: Record<string, unknown>) => sum + ((t.jumlah_terbayar as number) || 0), 0)

        // Calculate tunggakan per rumah using tarif_default (same logic as monitoring)
        let totalTunggakan = 0
        rumahItems.forEach(rumahItem => {
          const rumahTagihan = rtTagihan.filter((t: Record<string, unknown>) => t.rumah_id === rumahItem.id)
          // Find last payment nominal as tarif, fallback to tarif_default
          let tarifAcuan = rumahItem.tarif_default
          for (let m = 12; m >= 1; m--) {
            const bulanDate = `${year}-${String(m).padStart(2, '0')}-01`
            const t = rumahTagihan.find((tag: Record<string, unknown>) => tag.bulan === bulanDate)
            if (t && (t.jumlah_terbayar as number) > 0) {
              tarifAcuan = t.jumlah_terbayar as number
              break
            }
          }
          // Count unpaid months
          for (let m = 1; m <= 12; m++) {
            const bulanDate = `${year}-${String(m).padStart(2, '0')}-01`
            const t = rumahTagihan.find((tag: Record<string, unknown>) => tag.bulan === bulanDate)
            const isOccupied = t ? (t.is_occupied as boolean) : true
            const hasPaid = t && (t.jumlah_terbayar as number) > 0
            if (isOccupied && !hasPaid) {
              totalTunggakan += tarifAcuan
            }
          }
        })

        summaryData.push({
          rt_id: rtId,
          nomor_rt: rt.nomor_rt,
          tahun: year,
          total_rumah: rumahItems.length,
          bulan_lunas: bulanLunas,
          bulan_belum: bulanBelum,
          total_terbayar: totalTerbayar,
          total_tagihan_nominal: totalTerbayar + totalTunggakan, // total seharusnya = bayar + tunggakan
          persen_lunas: totalBulanSeharusnya > 0 ? Math.round((bulanLunas / totalBulanSeharusnya) * 100) : 0,
        })
      })
    })

    // Sort by RT then year
    summaryData.sort((a, b) => {
      if (a.nomor_rt !== b.nomor_rt) return a.nomor_rt.localeCompare(b.nomor_rt)
      return a.tahun.localeCompare(b.tahun)
    })

    // Grand totals
    const grandTotal = {
      total_rumah: rumahList?.length || 0,
      total_terbayar: summaryData.reduce((s, d) => s + d.total_terbayar, 0),
      total_tunggakan: summaryData.reduce((s, d) => s + (d.total_tagihan_nominal - d.total_terbayar), 0),
      years: Array.from(years).sort(),
    }

    return NextResponse.json({ data: summaryData, grand: grandTotal })
  } catch (error: unknown) {
    console.error('IPL summary error:', error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
