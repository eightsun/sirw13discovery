'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { FiLock, FiEye, FiEyeOff, FiCheck, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'

export default function PengaturanPage() {
  const { userData, user, loading: userLoading } = useUser()
  const supabase = createClient()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPassword) { setError('Password baru wajib diisi'); return }
    if (newPassword.length < 6) { setError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak sama'); return }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setSuccess('Password berhasil diubah!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah password'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href="/dashboard" className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Pengaturan</h1>
          <small className="text-muted">Ubah password akun Anda</small>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold"><FiLock className="me-2" />Ubah Password</h6>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger alert-dismissible">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')} />
                </div>
              )}
              {success && (
                <div className="alert alert-success alert-dismissible">
                  <FiCheck className="me-2" />{success}
                  <button type="button" className="btn-close" onClick={() => setSuccess('')} />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label text-muted small">Email Akun</label>
                <input type="text" className="form-control" value={user?.email || '-'} disabled />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Password Baru <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type={showNew ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNew(!showNew)}>
                      {showNew ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Konfirmasi Password Baru <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Ketik ulang password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <small className="text-danger">Password tidak sama</small>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</>
                  ) : (
                    <><FiLock className="me-2" />Ubah Password</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0 fw-bold">Informasi Akun</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label text-muted small">Nama</label>
                <p className="mb-0 fw-bold">{userData?.nama_lengkap || '-'}</p>
              </div>
              <div className="mb-3">
                <label className="form-label text-muted small">Email</label>
                <p className="mb-0">{user?.email || '-'}</p>
              </div>
              <div className="mb-0">
                <label className="form-label text-muted small">Role</label>
                <p className="mb-0">{userData?.role || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}