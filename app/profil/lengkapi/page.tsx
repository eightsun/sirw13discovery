'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import WargaForm from '@/components/WargaForm'
import { FiUser } from 'react-icons/fi'

export default function LengkapiProfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      // Cek apakah user sudah login
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Cek apakah user sudah punya data warga
      const { data: userData } = await supabase
        .from('users')
        .select('warga_id')
        .eq('id', user.id)
        .single()

      if (userData?.warga_id) {
        // Sudah punya data warga, redirect ke dashboard
        router.push('/dashboard')
        return
      }

      setUserEmail(user.email || null)
      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          {/* Header */}
          <div className="card mb-4 border-primary">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <span style={{ fontSize: '3rem' }}>🏘️</span>
                </div>
                <div>
                  <h2 className="mb-1 text-primary">Selamat Datang di SIRW13!</h2>
                  <p className="mb-0 text-muted">
                    Silakan lengkapi data diri Anda sebagai warga RW 013 Permata Discovery.
                    Data ini diperlukan untuk keperluan administrasi warga.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Info */}
          <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
            <FiUser className="me-2" size={20} />
            <div>
              <strong>Pendaftaran Warga Baru</strong><br/>
              Isi formulir di bawah ini dengan data yang sesuai KTP/KK Anda.
            </div>
          </div>

          {/* Form Warga */}
          <WargaForm 
            mode="create" 
            isOnboarding={true}
            defaultEmail={userEmail || undefined}
          />
        </div>
      </div>
    </div>
  )
}
