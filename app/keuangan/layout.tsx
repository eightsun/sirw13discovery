'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function KeuanganLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="d-flex min-vh-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow-1 main-content">
        {/* Mobile Header */}
        <div className="mobile-header d-lg-none">
          <button 
            className="btn btn-link text-dark p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="fw-bold">SIRW13</span>
        </div>
        
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  )
}