import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Record read (bypass RLS)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { surat_id } = await request.json()

    if (!surat_id) {
      return NextResponse.json({ error: 'surat_id diperlukan' }, { status: 400 })
    }

    const adminClient = createAdminClient()
    await adminClient.from('surat_baca').upsert(
      { surat_id, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'surat_id,user_id' }
    )

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Surat baca error:', error)
    return NextResponse.json({ error: 'Gagal' }, { status: 500 })
  }
}
