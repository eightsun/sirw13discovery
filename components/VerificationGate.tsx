'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { FiAlertTriangle } from 'react-icons/fi'

interface VerificationGateProps {
  children: React.ReactNode
}

export default function VerificationGate({ children }: VerificationGateProps) {
  const { userData, role, isVerified, loading } = useUser()
  const pathname = usePathname()

  // Hanya blokir warga yang belum diverifikasi
  const isUnverifiedWarga = !loading && userData && role === 'warga' && !isVerified

  if (isUnverifiedWarga) {
    // Izinkan warga mengakses halaman edit profil sendiri
    const isEditOwnProfile = userData.warga_id && pathname === `/warga/edit/${userData.warga_id}`

    if (!isEditOwnProfile) {
      return (
        <div className="fade-in">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="text-center" style={{ maxWidth: '500px' }}>
              <FiAlertTriangle size={64} className="text-warning mb-4" />
              <h3 className="fw-bold mb-3">Menunggu Verifikasi</h3>
              <p className="text-muted mb-4">
                Akun Anda belum diverifikasi oleh pengurus RT/RW.
                Anda belum dapat mengakses fitur ini hingga akun diverifikasi.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <Link href="/dashboard" className="btn btn-primary">
                  Kembali ke Dashboard
                </Link>
                {userData.warga_id && (
                  <Link href={`/warga/edit/${userData.warga_id}`} className="btn btn-outline-primary">
                    Edit Profil
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
