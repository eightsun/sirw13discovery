'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { PembayaranIPL, Rumah } from '@/types'
import { 
  FiArrowLeft, FiCheck, FiX, FiExternalLink, FiFilter, 
  FiClock, FiCheckCircle, FiXCircle 
} from 'react-icons/fi'

interface PembayaranWithDetails extends PembayaranIPL {
  rumah: Rumah & {
    jalan: { nama_jalan: string }
    rt: { nomor_rt: string }
    kepala_keluarga: { nama_lengkap: string }
  }
  pembayar?: { email: string; nama_lengkap: string }
  verifier?: { nama_lengkap: string }
}

export default function VerifikasiIPLPage() {
  const { userData, isPengurus, isRW, isRT, loading: userLoading } = useUser()
  const supabase = createClient()
  
  const [pembayaranList, setPembayaranList] = useState<PembayaranWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Filter
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  
  // Modal
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('pembayaran_ipl')
        .select(`
          *,
          rumah:rumah_id (
            id,
            nomor_rumah,
            blok,
            jalan:jalan_id (nama_jalan),
            rt:rt_id (id, nomor_rt),
            kepala_keluarga:kepala_keluarga_id (nama_lengkap)
          ),
          pembayar:dibayar_oleh (email, nama_lengkap),
          verifier:verified_by (nama_lengkap)
        `)
        .order('created_at', { ascending: false })

      // Filter by status
      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }

      // If RT, only show payments from their RT
      if (isRT && !isRW && userData?.rt_id) {
        // We need to filter by RT - this requires a subquery or RLS
        // For now, we'll filter client-side
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Client-side filter for RT
      let filteredData = data || []
      if (isRT && !isRW && userData?.rt_id) {
        filteredData = filteredData.filter(p => 
          p.rumah?.rt?.id === userData.rt_id
        )
      }

      setPembayaranList(filteredData)

    } catch (err) {
      console.error('Error fetching pembayaran:', err)
      setError('Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userLoading && isPengurus) {
      fetchData()
    }
  }, [userLoading, isPengurus, filterStatus])

  const handleVerify = async (id: string) => {
    if (!confirm('Verifikasi pembayaran ini?')) return
    
    try {
      setProcessing(id)
      
      const { error: updateError } = await supabase
        .from('pembayaran_ipl')
        .update({
          status: 'verified',
          verified_by: userData?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Refresh data
      await fetchData()
      
    } catch (err: any) {
      console.error('Verify error:', err)
      alert(err.message || 'Gagal memverifikasi pembayaran')
    } finally {
      setProcessing(null)
    }
  }

  const openRejectModal = (id: string) => {
    setRejectingId(id)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectingId) return
    if (!rejectReason.trim()) {
      alert('Masukkan alasan penolakan')
      return
    }
    
    try {
      setProcessing(rejectingId)
      
      const { error: updateError } = await supabase
        .from('pembayaran_ipl')
        .update({
          status: 'rejected',
          verified_by: userData?.id,
          verified_at: new Date().toISOString(),
          rejected_reason: rejectReason,
        })
        .eq('id', rejectingId)

      if (updateError) throw updateError

      setShowRejectModal(false)
      setRejectingId(null)
      setRejectReason('')
      
      // Refresh data
      await fetchData()
      
    } catch (err: any) {
      console.error('Reject error:', err)
      alert(err.message || 'Gagal menolak pembayaran')
    } finally {
      setProcessing(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatBulanList = (bulanList: string[]) => {
    if (!bulanList || bulanList.length === 0) return '-'
    return bulanList.map(b => {
      const date = new Date(b)
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
    }).join(', ')
  }

  if (userLoading || loading) {
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
        <div className="alert alert-danger">
          Anda tidak memiliki akses ke halaman ini
        </div>
        <Link href="/ipl" className="btn btn-primary">
          Kembali ke Tagihan
        </Link>
      </div>
    )
  }

  // Count by status
  const pendingCount = pembayaranList.filter(p => p.status === 'pending').length
  const verifiedCount = pembayaranList.filter(p => p.status === 'verified').length
  const rejectedCount = pembayaranList.filter(p => p.status === 'rejected').length

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-0">Verifikasi Pembayaran IPL</h1>
          <p className="text-muted mb-0">
            {isRW ? 'Semua RT' : `RT ${userData?.rt?.nomor_rt || ''}`}
          </p>
        </div>
        <Link href="/ipl" className="btn btn-outline-secondary">
          <FiArrowLeft className="me-2" />
          Kembali
        </Link>
      </div>

      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div 
            className={`card h-100 ${filterStatus === 'pending' ? 'border-warning border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFilterStatus('pending')}
          >
            <div className="card-body text-center">
              <FiClock size={32} className="text-warning mb-2" />
              <h3 className="text-warning mb-0">{pendingCount}</h3>
              <small className="text-muted">Menunggu Verifikasi</small>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div 
            className={`card h-100 ${filterStatus === 'verified' ? 'border-success border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFilterStatus('verified')}
          >
            <div className="card-body text-center">
              <FiCheckCircle size={32} className="text-success mb-2" />
              <h3 className="text-success mb-0">{verifiedCount}</h3>
              <small className="text-muted">Terverifikasi</small>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div 
            className={`card h-100 ${filterStatus === 'rejected' ? 'border-danger border-2' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={() => setFilterStatus('rejected')}
          >
            <div className="card-body text-center">
              <FiXCircle size={32} className="text-danger mb-2" />
              <h3 className="text-danger mb-0">{rejectedCount}</h3>
              <small className="text-muted">Ditolak</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="form-label small">
                <FiFilter className="me-1" />
                Filter Status
              </label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu Verifikasi</option>
                <option value="verified">Terverifikasi</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">&nbsp;</label>
              <button 
                className="btn btn-outline-secondary d-block"
                onClick={() => fetchData()}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            Daftar Pembayaran ({pembayaranList.length})
          </h6>
        </div>
        <div className="card-body">
          {error ? (
            <div className="alert alert-danger">{error}</div>
          ) : pembayaranList.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <div className="display-1 mb-3">Rp</div>
              <p>Tidak ada data pembayaran</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Alamat</th>
                    <th>Kepala Keluarga</th>
                    <th>Bulan Dibayar</th>
                    <th className="text-end">Jumlah</th>
                    <th>Metode</th>
                    <th>Bukti</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pembayaranList.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <small>{formatDate(p.tanggal_bayar)}</small>
                      </td>
                      <td>
                        <small>
                          {p.rumah?.jalan?.nama_jalan} No. {p.rumah?.nomor_rumah}
                          <br />
                          <span className="text-muted">RT {p.rumah?.rt?.nomor_rt}</span>
                        </small>
                      </td>
                      <td>
                        <small>{p.rumah?.kepala_keluarga?.nama_lengkap || '-'}</small>
                      </td>
                      <td>
                        <small>{formatBulanList(p.bulan_dibayar)}</small>
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(p.jumlah_dibayar)}</strong>
                      </td>
                      <td>
                        <span className={`badge ${
                          p.metode === 'transfer' ? 'bg-info' : 
                          p.metode === 'tunai' ? 'bg-success' : 'bg-secondary'
                        }`}>
                          {p.metode}
                        </span>
                      </td>
                      <td>
                        {p.bukti_url ? (
                          <a 
                            href={p.bukti_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <FiExternalLink />
                          </a>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        {p.status === 'pending' ? (
                          <span className="badge bg-warning text-dark">
                            <FiClock className="me-1" />
                            Pending
                          </span>
                        ) : p.status === 'verified' ? (
                          <span className="badge bg-success">
                            <FiCheck className="me-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <FiX className="me-1" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td>
                        {p.status === 'pending' && (
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-success"
                              onClick={() => handleVerify(p.id)}
                              disabled={processing === p.id}
                              title="Verifikasi"
                            >
                              <FiCheck />
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={() => openRejectModal(p.id)}
                              disabled={processing === p.id}
                              title="Tolak"
                            >
                              <FiX />
                            </button>
                          </div>
                        )}
                        {p.status === 'verified' && (
                          <small className="text-muted">
                            oleh {p.verifier?.nama_lengkap || '-'}
                          </small>
                        )}
                        {p.status === 'rejected' && (
                          <small className="text-danger" title={p.rejected_reason || ''}>
                            {p.rejected_reason?.substring(0, 20)}...
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Tolak Pembayaran</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRejectModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Alasan Penolakan *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Masukkan alasan penolakan..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRejectModal(false)}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={processing !== null}
                >
                  Tolak Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}