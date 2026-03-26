import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

// Tipe untuk cookie
interface CookieToSet {
  name: string
  value: string
  options?: Record<string, unknown>
}

/**
 * Create an authenticated Supabase client.
 *
 * Pass `request` (NextRequest) when calling from a Route Handler so cookies
 * are read directly from the incoming request — this guarantees RLS receives
 * the correct auth.uid() even when the next/headers async context is not
 * available or has been lost across nested async calls.
 *
 * Omit `request` when calling from Server Components or Server Actions where
 * next/headers cookies() works via React async context.
 */
export async function createClient(request?: NextRequest) {
  if (request) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Route Handlers cannot set response cookies here.
            // Session refresh is handled by middleware.
          },
        },
      }
    )
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
