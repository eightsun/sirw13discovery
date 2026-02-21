'use client'

export const dynamic = 'force-dynamic'

import { useUser } from '@/hooks/useUser'
import WargaForm from '@/components/WargaForm'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'

export default function TambahWargaPage() {
  const { isPengurus, loading } = useUser()

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isPengurus) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger" role="alert">
          Anda tidak memiliki akses untuk menambah data warga
        </div>
        <Link href="/warga" className="btn btn-primary">
          <FiArrowLeft className="me-2" />
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href="/warga" className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Tambah Data Warga</h1>
          <p className="text-muted mb-0">Formulir Pendataan Warga RW 013</p>
        </div>
      </div>

      <WargaForm mode="create" />
    </div>
  )
}
