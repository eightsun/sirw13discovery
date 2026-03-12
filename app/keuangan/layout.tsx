'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { useUser } from '@/hooks/useUser'
import { FiAlertTriangle } from 'react-icons/fi'

export default function KeuanganLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { userData, isPengurus, isVerified, loading } = useUser()

  // Warga biasa yang belum diverifikasi tidak bisa akses keuangan
  const isBlocked = !loading && userData && !isPengurus && !isVerified

  return (
    <div className="d-flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`content-wrapper flex-grow-1`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="main-content">
          {isBlocked ? (
            <div className="fade-in">
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="text-center" style={{ maxWidth: '500px' }}>
                  <FiAlertTriangle size={64} className="text-warning mb-4" />
                  <h3 className="fw-bold mb-3">Menunggu Verifikasi</h3>
                  <p className="text-muted mb-4">
                    Akun Anda belum diverifikasi oleh pengurus RT/RW.
                    Anda belum dapat mengakses data keuangan hingga akun diverifikasi.
                  </p>
                  <Link href="/dashboard" className="btn btn-primary">
                    Kembali ke Dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
