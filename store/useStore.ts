import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, RT, Jalan, UserRole } from '@/types'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface UserState {
  user: SupabaseUser | null
  userData: User | null
  loading: boolean
  initialized: boolean
}

interface AppState {
  // User state (persisted)
  userState: UserState
  setUserState: (state: Partial<UserState>) => void
  resetUserState: () => void
  
  // Master data
  rtList: RT[]
  setRtList: (list: RT[]) => void
  
  jalanList: Jalan[]
  setJalanList: (list: Jalan[]) => void
  
  // UI state
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const initialUserState: UserState = {
  user: null,
  userData: null,
  loading: true,
  initialized: false,
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // User state
      userState: initialUserState,
      setUserState: (newState) => set((state) => ({ 
        userState: { ...state.userState, ...newState } 
      })),
      resetUserState: () => set({ userState: initialUserState }),
      
      // Master data
      rtList: [],
      setRtList: (list) => set({ rtList: list }),
      
      jalanList: [],
      setJalanList: (list) => set({ jalanList: list }),
      
      // UI state
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      // Loading states
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'sirw13-storage',
      partialize: (state) => ({ 
        userState: state.userState,
        sidebarOpen: state.sidebarOpen 
      }),
    }
  )
)
