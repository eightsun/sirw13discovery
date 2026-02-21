'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { User, UserRole } from '@/types'

interface UseUserReturn {
  user: any | null
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
  const { userState, setUserState, resetUserState } = useStore()
  const supabase = createClient()
  const fetchingRef = useRef(false)

  const fetchUserData = async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return
    fetchingRef.current = true

    try {
      setUserState({ loading: true })

      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        setUserState({ 
          user: null, 
          userData: null, 
          loading: false, 
          initialized: true 
        })
        fetchingRef.current = false
        return
      }

      // Get user profile from users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        setUserState({ 
          user: authUser, 
          userData: null, 
          loading: false, 
          initialized: true 
        })
      } else {
        setUserState({ 
          user: authUser, 
          userData: profile as User, 
          loading: false, 
          initialized: true 
        })
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setUserState({ loading: false, initialized: true })
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    // Only fetch if not initialized or no user data
    if (!userState.initialized) {
      fetchUserData()
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        if (event === 'SIGNED_OUT') {
          resetUserState()
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchUserData()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const role = userState.userData?.role || null

  // Helper flags
  const rwRoles: UserRole[] = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw']
  const rtRoles: UserRole[] = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']
  const pengurusRoles: UserRole[] = [...rwRoles, ...rtRoles]

  const isRW = role ? rwRoles.includes(role) : false
  const isRT = role ? rtRoles.includes(role) : false
  const isPengurus = role ? pengurusRoles.includes(role) : false

  return {
    user: userState.user,
    userData: userState.userData,
    role,
    loading: userState.loading,
    error: null,
    isRW,
    isRT,
    isPengurus,
    refresh: fetchUserData,
  }
}
