import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/insiden/stats — aggregate counts for the dashboard widget
export async function GET() {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  const supabase = await createClient()
  const isOfficer = ALL_PENGURUS_ROLES.includes(auth.role)

  try {
    if (!isOfficer) {
      // Warga: only their own reports
      const { count: myCount } = await supabase
        .from('insiden')
        .select('id', { count: 'exact', head: true })
        .eq('pelapor_id', auth.user.id)

      const { count: myOpen } = await supabase
        .from('insiden')
        .select('id', { count: 'exact', head: true })
        .eq('pelapor_id', auth.user.id)
        .in('status', ['dilaporkan', 'dalam_investigasi', 'menunggu_tindakan'])

      return NextResponse.json({ my_total: myCount || 0, my_open: myOpen || 0 })
    }

    // Officers: full aggregate stats
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: total },
      { count: dilaporkan },
      { count: investigasi },
      { count: menungguTindakan },
      { count: selesaiBulanIni },
      { count: nearMissBulanIni },
      { count: kritis },
    ] = await Promise.all([
      supabase.from('insiden').select('id', { count: 'exact', head: true }),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('status', 'dilaporkan'),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('status', 'dalam_investigasi'),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('status', 'menunggu_tindakan'),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('status', 'selesai').gte('updated_at', firstOfMonth),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('jenis', 'hampir_celaka').gte('created_at', firstOfMonth),
      supabase.from('insiden').select('id', { count: 'exact', head: true }).eq('tingkat_keparahan', 'kritis').in('status', ['dilaporkan', 'dalam_investigasi', 'menunggu_tindakan']),
    ])

    return NextResponse.json({
      total:               total           ?? 0,
      dilaporkan:          dilaporkan      ?? 0,
      dalam_investigasi:   investigasi     ?? 0,
      menunggu_tindakan:   menungguTindakan ?? 0,
      open:                (dilaporkan ?? 0) + (investigasi ?? 0) + (menungguTindakan ?? 0),
      selesai_bulan_ini:   selesaiBulanIni  ?? 0,
      near_miss_bulan_ini: nearMissBulanIni ?? 0,
      kritis_aktif:        kritis           ?? 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat statistik'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
