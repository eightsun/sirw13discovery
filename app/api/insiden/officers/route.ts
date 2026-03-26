import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth, isAuthError, ALL_PENGURUS_ROLES } from '@/lib/auth/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/insiden/officers — list of active officers for PIC selector
export async function GET() {
  const auth = await requireAuth()
  if (isAuthError(auth)) return auth

  if (!ALL_PENGURUS_ROLES.includes(auth.role)) {
    return NextResponse.json({ officers: [] })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('users')
    .select('id, nama_lengkap, role')
    .eq('is_active', true)
    .in('role', ALL_PENGURUS_ROLES)
    .order('nama_lengkap')

  if (error) return NextResponse.json({ officers: [] })

  return NextResponse.json({ officers: data || [] })
}
