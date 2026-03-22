import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AuthResult = {
  user: { id: string; email?: string }
  role: string
}

/**
 * Require authenticated user for API routes.
 * Returns user data or a 401 NextResponse.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email },
    role: userData?.role || 'warga',
  }
}

/**
 * Require authenticated user with specific role(s).
 * Returns user data or a 401/403 NextResponse.
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result

  if (!allowedRoles.includes(result.role)) {
    return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
  }

  return result
}

/**
 * Check if result is an error response (NextResponse).
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

// Common role groups
export const PENGURUS_RW_ROLES = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw']
export const PENGURUS_RT_ROLES = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']
export const ALL_PENGURUS_ROLES = [...PENGURUS_RW_ROLES, ...PENGURUS_RT_ROLES]
