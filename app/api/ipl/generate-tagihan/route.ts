import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication & authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is RW admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']
    if (!userData || !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { bulan } = body // Format: 'YYYY-MM'

    if (!bulan || !/^\d{4}-\d{2}$/.test(bulan)) {
      return NextResponse.json(
        { error: 'Invalid bulan format. Use YYYY-MM' },
        { status: 400 }
      )
    }

    // Convert to first day of month
    const bulanDate = `${bulan}-01`

    // Define type for rumah with relations
    type RumahWithRelations = {
      id: string
      blok: string | null
      is_occupied: boolean
      jalan: { nama_jalan: string } | null
      nomor_rumah: string
      rt: { nomor_rt: string } | null
    }

    // Get all rumah
    const { data: rumahList, error: rumahError } = await supabase
      .from('rumah')
      .select(`
        id,
        blok,
        is_occupied,
        jalan:jalan_id (nama_jalan),
        nomor_rumah,
        rt:rt_id (nomor_rt)
      `)
      .returns<RumahWithRelations[]>()

    if (rumahError) {
      throw new Error(`Failed to fetch rumah: ${rumahError.message}`)
    }

    // Get applicable tarif for this month
    const { data: tarifList, error: tarifError } = await supabase
      .from('tarif_ipl')
      .select('*')
      .lte('periode_mulai', bulanDate)
      .or(`periode_selesai.is.null,periode_selesai.gte.${bulanDate}`)
      .order('periode_mulai', { ascending: false })

    if (tarifError) {
      throw new Error(`Failed to fetch tarif: ${tarifError.message}`)
    }

    // Helper function to get tarif for a rumah
    const getTarifForRumah = (blok: string, isOccupied: boolean): number | null => {
      // Find matching tarif
      const tarif = tarifList?.find(t => 
        t.blok === blok || t.blok === 'Semua'
      )

      if (!tarif) return null

      if (isOccupied) {
        return tarif.tarif_berpenghuni
      } else {
        return tarif.tarif_tidak_berpenghuni || tarif.tarif_berpenghuni
      }
    }

    // Check existing tagihan for this month
    const { data: existingTagihan } = await supabase
      .from('tagihan_ipl')
      .select('rumah_id')
      .eq('bulan', bulanDate)

    const existingRumahIds = new Set(existingTagihan?.map(t => t.rumah_id) || [])

    // Prepare tagihan to insert
    const tagihanToInsert: any[] = []
    const skipped: string[] = []
    const noTarif: string[] = []

    for (const rumah of rumahList || []) {
      // Skip if already has tagihan
      if (existingRumahIds.has(rumah.id)) {
        skipped.push(`${rumah.jalan?.nama_jalan || ''} No.${rumah.nomor_rumah}`)
        continue
      }

      // Get tarif
      const tarif = getTarifForRumah(rumah.blok || 'Timur', rumah.is_occupied)
      
      if (tarif === null) {
        noTarif.push(`${rumah.jalan?.nama_jalan || ''} No.${rumah.nomor_rumah} (${rumah.blok})`)
        continue
      }

      tagihanToInsert.push({
        rumah_id: rumah.id,
        bulan: bulanDate,
        jumlah_tagihan: tarif,
        status: 'belum_lunas',
        jumlah_terbayar: 0,
      })
    }

    // Insert tagihan
    let inserted = 0
    if (tagihanToInsert.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('tagihan_ipl')
        .insert(tagihanToInsert)
        .select()

      if (insertError) {
        throw new Error(`Failed to insert tagihan: ${insertError.message}`)
      }

      inserted = insertedData?.length || 0
    }

    return NextResponse.json({
      success: true,
      bulan: bulanDate,
      summary: {
        total_rumah: rumahList?.length || 0,
        inserted,
        skipped: skipped.length,
        no_tarif: noTarif.length,
      },
      details: {
        skipped_list: skipped.slice(0, 10), // Limit for response size
        no_tarif_list: noTarif,
      },
      message: `Berhasil membuat ${inserted} tagihan untuk bulan ${bulan}`
    })

  } catch (error: any) {
    console.error('Generate tagihan error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate tagihan' },
      { status: 500 }
    )
  }
}

// GET: Get tagihan summary for a month
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bulan = searchParams.get('bulan') // Format: YYYY-MM

    let query = supabase
      .from('tagihan_ipl')
      .select(`
        *,
        rumah:rumah_id (
          id,
          nomor_rumah,
          blok,
          jalan:jalan_id (nama_jalan),
          rt:rt_id (nomor_rt),
          kepala_keluarga:kepala_keluarga_id (nama_lengkap)
        )
      `)
      .order('bulan', { ascending: false })

    if (bulan) {
      query = query.eq('bulan', `${bulan}-01`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ data })

  } catch (error: any) {
    console.error('Get tagihan error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get tagihan' },
      { status: 500 }
    )
  }
}