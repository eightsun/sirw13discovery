'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import VerificationGate from '@/components/VerificationGate'
import { ToastProvider } from '@/components/ToastProvider'
import { ConfirmProvider } from '@/components/ConfirmDialog'

export default function SuratLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="d-flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className={`content-wrapper flex-grow-1`}>
            <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <main className="main-content">
              <VerificationGate>{children}</VerificationGate>
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
