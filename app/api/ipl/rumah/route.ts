import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, requireRole, isAuthError, PENGURUS_RW_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET: List all rumah with jalan + rt (authenticated users only)
export async function GET() {
  try {
    const auth = await requireAuth()
    if (isAuthError(auth)) return auth

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
    const msg = error instanceof Error ? error.message : 'Gagal mengambil data rumah'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: Add new rumah
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(PENGURUS_RW_ROLES)
    if (isAuthError(auth)) return auth

    const adminClient = createAdminClient()
    const body = await request.json()
    const { data, error } = await adminClient
      .from('rumah')
      .insert(body)
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, id: data.id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal menambah rumah'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT: Update rumah (tarif_default, etc)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(PENGURUS_RW_ROLES)
    if (isAuthError(auth)) return auth

    const adminClient = createAdminClient()
    const body = await request.json()
    const { id, tarif_default } = body

    const { error } = await adminClient
      .from('rumah')
      .update({ tarif_default })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gagal mengupdate rumah'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
