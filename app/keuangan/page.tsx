'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { PengajuanPembelian, StatusPengajuan, RiwayatStatus } from '@/types'
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiCheck, 
  FiX, 
  FiRefreshCw,
  FiClock,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiExternalLink,
  FiDownload,
  FiUpload,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi'

export default function DetailPengajuanPage() {
  const params = useParams()
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [pengajuan, setPengajuan] = useState<PengajuanPembelian | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalAction, setApprovalAction] = useState<'setujui' | 'tolak' | 'revisi' | 'proses' | 'selesai' | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const isKetuaRW = userData?.role === 'ketua_rw' || userData?.role === 'wakil_ketua_rw'
  const isBendaharaRW = userData?.role === 'bendahara_rw'
  const isPemohon = pengajuan?.pemohon_id === userData?.id

  useEffect(() => {
    fetchPengajuan()
  }, [params.id])

  const fetchPengajuan = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('pengajuan_pembelian')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama, deskripsi),
          pemohon:pemohon_id (nama_lengkap, email)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setPengajuan(data)
    } catch (error) {
      console.error('Error fetching pengajuan:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: StatusPengajuan) => {
    const badges: Record<StatusPengajuan, { color: string; label: string; icon: React.ReactNode }> = {
      'diajukan': { color: 'warning', label: 'Menunggu Approval', icon: <FiClock /> },
      'direvisi': { color: 'info', label: 'Perlu Revisi', icon: <FiRefreshCw /> },
      'disetujui': { color: 'primary', label: 'Disetujui', icon: <FiCheck /> },
      'ditolak': { color: 'danger', label: 'Ditolak', icon: <FiX /> },
      'diproses': { color: 'info', label: 'Sedang Diproses', icon: <FiClock /> },
      'selesai': { color: 'success', label: 'Selesai', icon: <FiCheckCircle /> },
      'dibatalkan': { color: 'secondary', label: 'Dibatalkan', icon: <FiXCircle /> }
    }
    const badge = badges[status] || { color: 'secondary', label: status, icon: <FiAlertCircle /> }
    return (
      <span className={`badge bg-${badge.color} d-inline-flex align-items-center gap-1 px-3 py-2`}>
        {badge.icon} {badge.label}
      </span>
    )
  }

  const getTimelineIcon = (status: string) => {
    const icons: Record<string, { icon: React.ReactNode; color: string }> = {
      'diajukan': { icon: <FiFileText />, color: 'primary' },
      'direvisi': { icon: <FiRefreshCw />, color: 'info' },
      'disetujui': { icon: <FiCheck />, color: 'success' },
      'ditolak': { icon: <FiX />, color: 'danger' },
      'diproses': { icon: <FiDollarSign />, color: 'info' },
      'selesai': { icon: <FiCheckCircle />, color: 'success' },
      'dibatalkan': { icon: <FiXCircle />, color: 'secondary' }
    }
    return icons[status] || { icon: <FiClock />, color: 'secondary' }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'diajukan': 'Pengajuan Dibuat',
      'direvisi': 'Diminta Revisi oleh Ketua RW',
      'disetujui': 'Disetujui oleh Ketua RW',
      'ditolak': 'Ditolak oleh Ketua RW',
      'diproses': 'Pembayaran Diproses oleh Bendahara',
      'selesai': 'Pengajuan Selesai',
      'dibatalkan': 'Pengajuan Dibatalkan'
    }
    return labels[status] || status
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleApprovalClick = (action: 'setujui' | 'tolak' | 'revisi' | 'proses' | 'selesai') => {
    setApprovalAction(action)
    setApprovalNote('')
    setShowApprovalModal(true)
  }

  const handleApprovalSubmit = async () => {
    if (!pengajuan || !approvalAction) return

    try {
      setProcessing(true)

      let newStatus: StatusPengajuan
      let catatan: string

      switch (approvalAction) {
        case 'setujui':
          newStatus = 'disetujui'
          catatan = approvalNote || 'Disetujui oleh Ketua RW'
          break
        case 'tolak':
          newStatus = 'ditolak'
          catatan = approvalNote || 'Ditolak oleh Ketua RW'
          break
        case 'revisi':
          newStatus = 'direvisi'
          catatan = approvalNote || 'Perlu revisi'
          break
        case 'proses':
          newStatus = 'diproses'
          catatan = approvalNote || 'Pembayaran sedang diproses'
          break
        case 'selesai':
          newStatus = 'selesai'
          catatan = approvalNote || 'Pengajuan selesai'
          break
        default:
          return
      }

      // Update riwayat status
      const newRiwayat: RiwayatStatus[] = [
        ...pengajuan.riwayat_status,
        {
          status: newStatus,
          tanggal: new Date().toISOString(),
          catatan,
          oleh: userData?.id || '',
          nama_user: userData?.nama_lengkap || ''
        }
      ]

      const updateData: Record<string, unknown> = {
        status: newStatus,
        riwayat_status: newRiwayat,
        updated_at: new Date().toISOString()
      }

      if (approvalAction === 'setujui') {
        updateData.disetujui_oleh = userData?.id
        updateData.tanggal_disetujui = new Date().toISOString()
        updateData.catatan_approval = catatan
      }

      if (approvalAction === 'proses' || approvalAction === 'selesai') {
        updateData.diproses_oleh = userData?.id
        updateData.tanggal_diproses = new Date().toISOString()
        updateData.catatan_proses = catatan

        // Jika selesai, buat transaksi pengeluaran di kas
        if (approvalAction === 'selesai') {
          const kasData = {
            jenis_kas: 'rw',
            wilayah: pengajuan.wilayah,
            tipe: 'pengeluaran',
            sumber: 'pengajuan',
            sumber_id: pengajuan.id,
            tanggal: new Date().toISOString().split('T')[0],
            kategori_id: pengajuan.kategori_id,
            jumlah: pengajuan.nilai_transaksi,
            keterangan: pengajuan.deskripsi_pembelian,
            pengajuan_id: pengajuan.id,
            created_by: userData?.id
          }

          const { error: kasError } = await supabase
            .from('kas_transaksi')
            .insert(kasData)

          if (kasError) {
            console.error('Error creating kas transaksi:', kasError)
          }
        }
      }

      const { error } = await supabase
        .from('pengajuan_pembelian')
        .update(updateData)
        .eq('id', pengajuan.id)

      if (error) throw error

      setShowApprovalModal(false)
      fetchPengajuan()
    } catch (error) {
      console.error('Error updating pengajuan:', error)
      alert('Gagal memproses pengajuan')
    } finally {
      setProcessing(false)
    }
  }

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('pengajuan')
      .createSignedUrl(path, 3600) // 1 hour
    return data?.signedUrl
  }

  const openFile = async (path: string | null | undefined) => {
    if (!path) return
    
    // Jika sudah URL lengkap, buka langsung
    if (path.startsWith('http')) {
      window.open(path, '_blank')
      return
    }
    
    // Jika path storage, generate signed URL
    const url = await getSignedUrl(path)
    if (url) window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!pengajuan) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Pengajuan tidak ditemukan</p>
        <Link href="/keuangan/pengajuan" className="btn btn-primary">
          Kembali ke Daftar
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in p-4">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <Link href="/keuangan/pengajuan" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Detail Pengajuan</h1>
          <p className="text-muted mb-0">
            {pengajuan.nomor_pengajuan}
          </p>
        </div>
        <div>
          {getStatusBadge(pengajuan.status)}
        </div>
      </div>

      <div className="row g-4">
        {/* Main Content */}
        <div className="col-lg-8">
          {/* Info Pemohon */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiUser className="me-2" />
                Informasi Pemohon
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Nama Pemohon</label>
                  <p className="mb-0 fw-bold">{pengajuan.nama_pemohon}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Jabatan/Posisi</label>
                  <p className="mb-0">{pengajuan.jabatan_pemohon}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Nomor WhatsApp</label>
                  <p className="mb-0">{pengajuan.no_wa || '-'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Email</label>
                  <p className="mb-0">{pengajuan.pemohon?.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Pengajuan */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiFileText className="me-2" />
                Detail Pengajuan
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-12 mb-3">
                  <label className="text-muted small">Deskripsi Pembelian</label>
                  <p className="mb-0">{pengajuan.deskripsi_pembelian}</p>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="text-muted small">Wilayah</label>
                  <p className="mb-0">
                    <span className={`badge bg-${pengajuan.wilayah === 'Timur' ? 'info' : 'success'}`}>
                      Discovery {pengajuan.wilayah}
                    </span>
                  </p>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="text-muted small">Tanggal Pengajuan</label>
                  <p className="mb-0">{new Date(pengajuan.tanggal_pengajuan).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="col-md-4 mb-3">
                  <label className="text-muted small">Tanggal Target</label>
                  <p className="mb-0">
                    {pengajuan.tanggal_target 
                      ? new Date(pengajuan.tanggal_target).toLocaleDateString('id-ID')
                      : '-'
                    }
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Kategori</label>
                  <p className="mb-0">
                    {pengajuan.kategori 
                      ? `${pengajuan.kategori.kode}. ${pengajuan.kategori.nama}`
                      : '-'
                    }
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="text-muted small">Nilai Transaksi</label>
                  <p className="mb-0 fw-bold text-primary fs-5">{formatRupiah(pengajuan.nilai_transaksi)}</p>
                </div>
                {pengajuan.link_referensi && (
                  <div className="col-12 mb-3">
                    <label className="text-muted small">Link Referensi</label>
                    <p className="mb-0">
                      <a href={pengajuan.link_referensi} target="_blank" rel="noopener noreferrer">
                        {pengajuan.link_referensi} <FiExternalLink />
                      </a>
                    </p>
                  </div>
                )}
                {pengajuan.catatan_tambahan && (
                  <div className="col-12">
                    <label className="text-muted small">Catatan Tambahan</label>
                    <p className="mb-0">{pengajuan.catatan_tambahan}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bukti Upload */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiUpload className="me-2" />
                Dokumen Pendukung
              </h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-2">Bukti Persetujuan</label>
                    {pengajuan.bukti_persetujuan_url ? (
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openFile(pengajuan.bukti_persetujuan_url)}
                      >
                        <FiDownload className="me-1" /> Lihat File
                      </button>
                    ) : (
                      <span className="text-muted">Belum diupload</span>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-2">Nota/Invoice</label>
                    {pengajuan.nota_invoice_url ? (
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openFile(pengajuan.nota_invoice_url)}
                      >
                        <FiDownload className="me-1" /> Lihat File
                      </button>
                    ) : (
                      <span className="text-muted">Belum diupload</span>
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="border rounded p-3 h-100">
                    <label className="text-muted small d-block mb-2">Bukti Transfer</label>
                    {pengajuan.bukti_transaksi_url ? (
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openFile(pengajuan.bukti_transaksi_url)}
                      >
                        <FiDownload className="me-1" /> Lihat File
                      </button>
                    ) : (
                      <span className="text-muted">Belum diupload</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reimbursement Info */}
          {(pengajuan.rekening_penerima || pengajuan.nama_pemilik_rekening || pengajuan.bank) && (
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">
                  <FiDollarSign className="me-2" />
                  Informasi Reimbursement
                </h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="text-muted small">Nomor Rekening</label>
                    <p className="mb-0 fw-bold">{pengajuan.rekening_penerima || '-'}</p>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="text-muted small">Nama Pemilik</label>
                    <p className="mb-0">{pengajuan.nama_pemilik_rekening || '-'}</p>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="text-muted small">Bank</label>
                    <p className="mb-0">{pengajuan.bank || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Timeline & Actions */}
        <div className="col-lg-4">
          {/* Action Buttons */}
          <div className="card mb-4">
            <div className="card-header bg-secondary text-white">
              <h6 className="mb-0 fw-bold">Aksi</h6>
            </div>
            <div className="card-body">
              {/* Ketua RW Actions */}
              {isKetuaRW && pengajuan.status === 'diajukan' && (
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleApprovalClick('setujui')}
                  >
                    <FiCheck className="me-2" /> Setujui
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => handleApprovalClick('revisi')}
                  >
                    <FiRefreshCw className="me-2" /> Minta Revisi
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleApprovalClick('tolak')}
                  >
                    <FiX className="me-2" /> Tolak
                  </button>
                </div>
              )}

              {/* Bendahara Actions */}
              {isBendaharaRW && pengajuan.status === 'disetujui' && (
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-info"
                    onClick={() => handleApprovalClick('proses')}
                  >
                    <FiDollarSign className="me-2" /> Proses Pembayaran
                  </button>
                </div>
              )}

              {isBendaharaRW && pengajuan.status === 'diproses' && (
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={() => handleApprovalClick('selesai')}
                  >
                    <FiCheckCircle className="me-2" /> Selesaikan
                  </button>
                </div>
              )}

              {/* Pemohon Actions */}
              {isPemohon && ['diajukan', 'direvisi'].includes(pengajuan.status) && (
                <div className="d-grid gap-2">
                  <Link 
                    href={`/keuangan/pengajuan/${pengajuan.id}/edit`}
                    className="btn btn-warning"
                  >
                    <FiEdit2 className="me-2" /> Edit Pengajuan
                  </Link>
                </div>
              )}

              {/* Status Complete */}
              {['selesai', 'ditolak', 'dibatalkan'].includes(pengajuan.status) && (
                <p className="text-muted text-center mb-0">
                  Pengajuan sudah {pengajuan.status}
                </p>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">
                <FiClock className="me-2" />
                Riwayat Status
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="timeline p-3">
                {pengajuan.riwayat_status && pengajuan.riwayat_status.length > 0 ? (
                  [...pengajuan.riwayat_status].reverse().map((riwayat, index) => {
                    const { icon, color } = getTimelineIcon(riwayat.status)
                    return (
                      <div key={index} className="timeline-item pb-3 mb-3 border-bottom">
                        <div className="d-flex">
                          <div className="flex-shrink-0 me-3">
                            <div 
                              className={`rounded-circle bg-${color} bg-opacity-10 p-2 d-flex align-items-center justify-content-center`}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <span className={`text-${color}`}>{icon}</span>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold">{getStatusLabel(riwayat.status)}</h6>
                            <p className="mb-1 small text-muted">
                              <FiCalendar className="me-1" />
                              {formatDateTime(riwayat.tanggal)}
                            </p>
                            {riwayat.nama_user && (
                              <p className="mb-1 small text-muted">
                                <FiUser className="me-1" />
                                {riwayat.nama_user}
                              </p>
                            )}
                            {riwayat.catatan && (
                              <p className="mb-0 small fst-italic">
                                &quot;{riwayat.catatan}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-muted text-center py-3 mb-0">Belum ada riwayat</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {approvalAction === 'setujui' && 'Setujui Pengajuan'}
                  {approvalAction === 'tolak' && 'Tolak Pengajuan'}
                  {approvalAction === 'revisi' && 'Minta Revisi'}
                  {approvalAction === 'proses' && 'Proses Pembayaran'}
                  {approvalAction === 'selesai' && 'Selesaikan Pengajuan'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowApprovalModal(false)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  <strong>{pengajuan.nomor_pengajuan}</strong><br />
                  {pengajuan.deskripsi_pembelian}<br />
                  <span className="fw-bold text-primary">{formatRupiah(pengajuan.nilai_transaksi)}</span>
                </p>
                <div className="mb-3">
                  <label className="form-label">
                    Catatan {(approvalAction === 'revisi' || approvalAction === 'tolak') && <span className="text-danger">*</span>}
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder={
                      approvalAction === 'revisi' 
                        ? 'Jelaskan apa yang perlu direvisi...'
                        : approvalAction === 'tolak'
                        ? 'Jelaskan alasan penolakan...'
                        : 'Catatan (opsional)...'
                    }
                    required={approvalAction === 'revisi' || approvalAction === 'tolak'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowApprovalModal(false)}
                  disabled={processing}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className={`btn btn-${
                    approvalAction === 'setujui' || approvalAction === 'selesai' ? 'success' :
                    approvalAction === 'tolak' ? 'danger' : 
                    approvalAction === 'proses' ? 'info' : 'warning'
                  }`}
                  onClick={handleApprovalSubmit}
                  disabled={processing || ((approvalAction === 'revisi' || approvalAction === 'tolak') && !approvalNote)}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      {approvalAction === 'setujui' && 'Setujui'}
                      {approvalAction === 'tolak' && 'Tolak'}
                      {approvalAction === 'revisi' && 'Kirim ke Revisi'}
                      {approvalAction === 'proses' && 'Proses Pembayaran'}
                      {approvalAction === 'selesai' && 'Selesaikan'}
                    </>
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