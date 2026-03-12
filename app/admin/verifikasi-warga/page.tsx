'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { createNotifikasi } from '@/lib/notifikasi'
import {
  FiUserCheck,
  FiXCircle,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiUsers
} from 'react-icons/fi'

interface PendingUser {
  id: string
  email: string
  nama_lengkap: string
  is_verified: boolean
  is_active: boolean
  created_at: string
  warga_id: string
  warga?: {
    id: string
    nama_lengkap: string
    nik: string
    no_hp: string
    rt_id: string
    rt?: { nomor_rt: string }
  }
}

export default function VerifikasiWargaPage() {
  const router = useRouter()
  const { userData, role } = useUser()
  const supabase = createClient()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [stats, setStats] = useState({ pending: 0, verified: 0, total: 0 })

  const isKetuaRW = role === 'ketua_rw'
  const isKetuaRT = role === 'ketua_rt'
  const hasAccess = isKetuaRW || isKetuaRT

  const fetchUsers = useCallback(async () => {
    if (!userData?.id || !hasAccess) return

    try {
      setLoading(true)

      let query = supabase
        .from('users')
        .select(`
          id, email, nama_lengkap, is_verified, is_active, created_at, warga_id,
          warga:warga_id (id, nama_lengkap, nik, no_hp, rt_id, rt:rt_id (nomor_rt))
        `)
        .eq('role', 'warga')
        .not('warga_id', 'is', null)
        .order('created_at', { ascending: false })

      if (filter === 'pending') {
        query = query.eq('is_verified', false).eq('is_active', true)
      } else if (filter === 'verified') {
        query = query.eq('is_verified', true)
      }

      const { data, error } = await query

      if (error) throw error

      let filtered = (data as unknown as PendingUser[]) || []

      // Ketua RT hanya lihat warga di RT nya
      if (isKetuaRT && userData.rt_id) {
        filtered = filtered.filter((u) => u.warga?.rt_id === userData.rt_id)
      }

      // Search filter
      if (search.trim()) {
        const s = search.toLowerCase()
        filtered = filtered.filter(
          (u) =>
            u.nama_lengkap?.toLowerCase().includes(s) ||
            u.email?.toLowerCase().includes(s) ||
            u.warga?.nik?.includes(s)
        )
      }

      setUsers(filtered)

      // Fetch stats
      let statsQuery = supabase
        .from('users')
        .select('id, is_verified, is_active, warga_id, warga:warga_id (rt_id)')
        .eq('role', 'warga')
        .not('warga_id', 'is', null)

      const { data: allUsers } = await statsQuery

      if (allUsers) {
        let statsFiltered = allUsers as unknown as { id: string; is_verified: boolean; is_active: boolean; warga?: { rt_id: string } }[]

        if (isKetuaRT && userData.rt_id) {
          statsFiltered = statsFiltered.filter((u) => u.warga?.rt_id === userData.rt_id)
        }

        setStats({
          pending: statsFiltered.filter((u) => !u.is_verified && u.is_active).length,
          verified: statsFiltered.filter((u) => u.is_verified).length,
          total: statsFiltered.length,
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [userData?.id, filter, search, hasAccess])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Redirect jika tidak punya akses
  useEffect(() => {
    if (!loading && userData && !hasAccess) {
      router.push('/dashboard')
    }
  }, [loading, userData, hasAccess, router])

  const handleVerify = async (user: PendingUser) => {
    try {
      setProcessing(user.id)

      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          verified_by: userData?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      // Kirim notifikasi ke warga
      await createNotifikasi({
        user_id: user.id,
        judul: 'Akun Terverifikasi',
        pesan: 'Selamat! Akun Anda telah diverifikasi oleh pengurus. Anda sekarang dapat mengakses seluruh fitur termasuk data keuangan.',
        tipe: 'info',
        link: '/dashboard',
      })

      await fetchUsers()
      alert('Warga berhasil diverifikasi')
    } catch (error) {
      console.error('Error verifying user:', error)
      alert('Gagal memverifikasi warga')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectClick = (user: PendingUser) => {
    setRejectTarget(user)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return

    try {
      setProcessing(rejectTarget.id)

      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', rejectTarget.id)

      if (error) throw error

      // Kirim notifikasi ke warga
      await createNotifikasi({
        user_id: rejectTarget.id,
        judul: 'Registrasi Ditolak',
        pesan: rejectReason
          ? `Registrasi Anda ditolak. Alasan: ${rejectReason}`
          : 'Registrasi Anda ditolak oleh pengurus. Silakan hubungi pengurus RT/RW untuk informasi lebih lanjut.',
        tipe: 'info',
      })

      setShowRejectModal(false)
      setRejectTarget(null)
      await fetchUsers()
      alert('Registrasi warga ditolak')
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('Gagal menolak registrasi')
    } finally {
      setProcessing(null)
    }
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="page-title mb-1">
            <FiUserCheck className="me-2" />
            Verifikasi Warga
          </h1>
          <p className="text-muted mb-0">
            Verifikasi registrasi warga baru
            {isKetuaRT && ' di RT Anda'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card border-start border-warning border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Menunggu Verifikasi</div>
                  <div className="h4 fw-bold text-warning mb-0">{stats.pending}</div>
                </div>
                <FiClock size={32} className="text-warning opacity-50" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-start border-success border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Terverifikasi</div>
                  <div className="h4 fw-bold text-success mb-0">{stats.verified}</div>
                </div>
                <FiCheckCircle size={32} className="text-success opacity-50" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-start border-primary border-4 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small">Total Warga Terdaftar</div>
                  <div className="h4 fw-bold text-primary mb-0">{stats.total}</div>
                </div>
                <FiUsers size={32} className="text-primary opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FiFilter className="text-muted" />
            <button
              className={`btn btn-sm ${filter === 'pending' ? 'btn-warning' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('pending')}
            >
              Menunggu ({stats.pending})
            </button>
            <button
              className={`btn btn-sm ${filter === 'verified' ? 'btn-success' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('verified')}
            >
              Terverifikasi
            </button>
            <button
              className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('all')}
            >
              Semua
            </button>
            <div className="ms-auto">
              <div className="input-group input-group-sm" style={{ maxWidth: '250px' }}>
                <span className="input-group-text"><FiSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama, email, NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <FiUserCheck size={48} className="text-muted mb-3 opacity-50" />
            <h5 className="text-muted">
              {filter === 'pending'
                ? 'Tidak ada warga yang menunggu verifikasi'
                : 'Tidak ada data ditemukan'}
            </h5>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="card d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Nama Lengkap</th>
                    <th>Email</th>
                    <th>NIK</th>
                    <th>RT</th>
                    <th>No. HP</th>
                    <th>Tanggal Daftar</th>
                    <th>Status</th>
                    {filter !== 'verified' && <th className="text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td className="fw-bold">{user.nama_lengkap || user.warga?.nama_lengkap || '-'}</td>
                      <td className="small">{user.email}</td>
                      <td className="small">{user.warga?.nik || '-'}</td>
                      <td>
                        {user.warga?.rt?.nomor_rt ? (
                          <span className="badge bg-info">RT {user.warga.rt.nomor_rt}</span>
                        ) : '-'}
                      </td>
                      <td className="small">{user.warga?.no_hp || '-'}</td>
                      <td className="small">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        {user.is_verified ? (
                          <span className="badge bg-success">Terverifikasi</span>
                        ) : !user.is_active ? (
                          <span className="badge bg-danger">Ditolak</span>
                        ) : (
                          <span className="badge bg-warning text-dark">Menunggu</span>
                        )}
                      </td>
                      {filter !== 'verified' && (
                        <td className="text-center">
                          {!user.is_verified && user.is_active && (
                            <div className="d-flex gap-1 justify-content-center">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleVerify(user)}
                                disabled={processing === user.id}
                                title="Verifikasi"
                              >
                                {processing === user.id ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <><FiCheckCircle className="me-1" /> Verifikasi</>
                                )}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRejectClick(user)}
                                disabled={processing === user.id}
                                title="Tolak"
                              >
                                <FiXCircle />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="d-md-none">
            {users.map((user) => (
              <div key={user.id} className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0">{user.nama_lengkap || user.warga?.nama_lengkap}</h6>
                      <small className="text-muted">{user.email}</small>
                    </div>
                    {user.is_verified ? (
                      <span className="badge bg-success">Terverifikasi</span>
                    ) : !user.is_active ? (
                      <span className="badge bg-danger">Ditolak</span>
                    ) : (
                      <span className="badge bg-warning text-dark">Menunggu</span>
                    )}
                  </div>
                  <div className="small text-muted mb-2">
                    <div>NIK: {user.warga?.nik || '-'}</div>
                    <div>RT: {user.warga?.rt?.nomor_rt ? `RT ${user.warga.rt.nomor_rt}` : '-'}</div>
                    <div>HP: {user.warga?.no_hp || '-'}</div>
                    <div>Daftar: {new Date(user.created_at).toLocaleDateString('id-ID')}</div>
                  </div>
                  {!user.is_verified && user.is_active && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success flex-grow-1"
                        onClick={() => handleVerify(user)}
                        disabled={processing === user.id}
                      >
                        <FiCheckCircle className="me-1" /> Verifikasi
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRejectClick(user)}
                        disabled={processing === user.id}
                      >
                        <FiXCircle className="me-1" /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <FiXCircle className="me-2" />
                  Tolak Registrasi
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing === rejectTarget.id}
                />
              </div>
              <div className="modal-body">
                <p>
                  Tolak registrasi <strong>{rejectTarget.nama_lengkap}</strong>?
                </p>
                <div className="mb-3">
                  <label className="form-label">Alasan Penolakan (opsional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Jelaskan alasan penolakan..."
                  />
                </div>
                <div className="alert alert-warning small mb-0">
                  Akun warga akan dinonaktifkan dan tidak bisa login.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                  disabled={processing === rejectTarget.id}
                >
                  Batal
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleRejectConfirm}
                  disabled={processing === rejectTarget.id}
                >
                  {processing === rejectTarget.id ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Memproses...</>
                  ) : (
                    <><FiXCircle className="me-1" /> Tolak Registrasi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
