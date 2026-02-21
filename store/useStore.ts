import { create } from 'zustand'
import { User, RT, Jalan } from '@/types'

interface AppState {
  // User state
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  
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

export const useStore = create<AppState>((set) => ({
  // User state
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
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
}))
