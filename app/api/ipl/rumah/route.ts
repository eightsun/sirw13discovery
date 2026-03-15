import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PENGURUS_RW_ROLES = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']

// GET: List all rumah with jalan + rt
export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('rumah')
      .select(`
        *,
        jalan:jalan_id (id, nama_jalan),
        rt:rt_id (id, nomor_rt)
      `)
      .order('blok')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: unknown) {
    console.error('Get rumah error:', error)
    return NextResponse.json({ error: 'Gagal mengambil data rumah' }, { status: 500 })
  }
}

// POST: Add new rumah
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('role').eq('id', user.id).single()
    if (!userData || !PENGURUS_RW_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const body = await request.json()
    const { data, error } = await adminClient
      .from('rumah')
      .insert(body)
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, id: data.id })
  } catch (error: unknown) {
    console.error('Insert rumah error:', error)
    const msg = error instanceof Error ? error.message : 'Gagal menambah rumah'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT: Update rumah (tarif_default, etc)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: userData } = await adminClient.from('users').select('role').eq('id', user.id).single()
    if (!userData || !PENGURUS_RW_ROLES.includes(userData.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const body = await request.json()
    const { id, tarif_default } = body

    const { error } = await adminClient
      .from('rumah')
      .update({ tarif_default })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Update rumah error:', error)
    const msg = error instanceof Error ? error.message : 'Gagal mengupdate rumah'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
