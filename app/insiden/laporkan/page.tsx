'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import InsidenForm from '@/components/insiden/InsidenForm'
import { FiArrowLeft, FiShield } from 'react-icons/fi'

export default function LaporkanInsidenPage() {
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const [rtId, setRtId] = useState<string | null>(null)

  // Load the reporter's RT for targeted notifications
  useEffect(() => {
    const loadRtId = async () => {
      if (!userData?.warga_id) return
      const { data } = await supabase
        .from('warga')
        .select('rt_id')
        .eq('id', userData.warga_id)
        .single()
      if (data?.rt_id) setRtId(data.rt_id)
    }
    loadRtId()
  }, [userData])

  if (userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Anda harus login untuk melaporkan insiden.</p>
        <Link href="/login" className="btn btn-danger btn-sm">Login</Link>
      </div>
    )
  }

  if (!userData?.is_verified) {
    return (
      <div className="text-center py-5">
        <FiShield size={48} className="text-muted mb-3" />
        <p className="text-muted mb-1">Akun Anda belum diverifikasi.</p>
        <p className="text-muted small">Hubungi pengurus RW untuk verifikasi akun Anda.</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Link href="/insiden" className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Laporkan Insiden</h1>
          <small className="text-muted">Laporkan insiden atau kejadian hampir celaka di lingkungan RW 013</small>
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <InsidenForm rtId={rtId} />
        </div>
      </div>
    </div>
  )
}
