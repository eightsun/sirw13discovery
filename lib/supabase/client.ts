import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return cached client if exists
  if (client) return client

  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time, env vars might not be available
  // Return a mock client that won't crash
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return mock client for SSR/build time
    const mockClient = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Not available during build' } }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Not available during build' } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: (callback: any) => ({ 
          data: { subscription: { unsubscribe: () => {} } } 
        }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (col: string, val: any) => ({
            single: async () => ({ data: null, error: null }),
            order: (col: string, opts?: any) => ({ data: [], error: null }),
            limit: (n: number) => ({ data: [], error: null }),
          }),
          order: (col: string, opts?: any) => ({ 
            data: [], 
            error: null,
            limit: (n: number) => ({ data: [], error: null }),
          }),
          single: async () => ({ data: null, error: null }),
          limit: (n: number) => ({ data: [], error: null }),
        }),
        insert: (data: any) => ({
          select: (columns?: string) => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
        update: (data: any) => ({
          eq: (col: string, val: any) => ({ data: null, error: null }),
        }),
        delete: () => ({
          eq: (col: string, val: any) => ({ data: null, error: null }),
        }),
      }),
    }
    return mockClient as any
  }
  
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  return client
}
