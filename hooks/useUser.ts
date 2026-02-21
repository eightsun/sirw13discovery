'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User, UserRole } from '@/types'

interface UseUserReturn {
  user: SupabaseUser | null
  userData: User | null
  role: UserRole | null
  loading: boolean
  error: Error | null
  isRW: boolean
  isRT: boolean
  isPengurus: boolean
  refresh: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      
      setUser(authUser)

      if (authUser) {
        // Get user profile from users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            warga:warga_id (*),
            rt:rt_id (*)
          `)
          .eq('id', authUser.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        setUserData(profile as User)
      } else {
        setUserData(null)
      }
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching user:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          await fetchUserData()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const role = userData?.role || null

  // Helper flags
  const rwRoles: UserRole[] = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']
  const rtRoles: UserRole[] = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']
  const pengurusRoles: UserRole[] = [...rwRoles, ...rtRoles]

  const isRW = role ? rwRoles.includes(role) : false
  const isRT = role ? rtRoles.includes(role) : false
  const isPengurus = role ? pengurusRoles.includes(role) : false

  return {
    user,
    userData,
    role,
    loading,
    error,
    isRW,
    isRT,
    isPengurus,
    refresh: fetchUserData,
  }
}
