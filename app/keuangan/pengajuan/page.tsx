'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { PengajuanPembelian, StatusPengajuan } from '@/types'
import {
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiFilter,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight
} from 'react-icons/fi'

export default function PengajuanListPage() {
  const { userData, isPengurus, isRW } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [pengajuan, setPengajuan] = useState<PengajuanPembelian[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterWilayah, setFilterWilayah] = useState<string>('')
  const [filterBulan, setFilterBulan] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedPengajuan, setSelectedPengajuan] = useState<PengajuanPembelian | null>(null)
  const [approvalAction, setApprovalAction] = useState<'setujui' | 'tolak' | 'revisi' | null>(null)
  const [approvalNote, setApprovalNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PengajuanPembelian | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isKetuaRW = userData?.role === 'ketua_rw' || userData?.role === 'wakil_ketua_rw'
  const isBendaharaRW = userData?.role === 'bendahara_rw'

  useEffect(() => {
    setCurrentPage(1)
    fetchPengajuan()
  }, [filterStatus, filterWilayah, filterBulan])

  const fetchPengajuan = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('pengajuan_pembelian')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama),
          pemohon:pemohon_id (nama_lengkap, email)
        `)
        .order('created_at', { ascending: false })

      if (filterStatus) {
        query = query.eq('status', filterStatus)
      }
      if (filterWilayah) {
        query = query.eq('wilayah', filterWilayah)
      }
      if (filterBulan) {
        const [year, month] = filterBulan.split('-')
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${lastDay}`
        query = query.gte('tanggal_pengajuan', startDate).lte('tanggal_pengajuan', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      setPengajuan(data || [])
    } catch (error) {
      console.error('Error fetching pengajuan:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: StatusPengajuan) => {
    const badges: Record<StatusPengajuan, { color: string; label: string }> = {
      'diajukan': { color: 'warning', label: 'Menunggu Approval' },
      'direvisi': { color: 'info', label: 'Perlu Revisi' },
      'disetujui': { color: 'primary', label: 'Menunggu Pembayaran' },
      'ditolak': { color: 'danger', label: 'Ditolak' },
      'diproses': { color: 'info', label: 'Pembayaran Diproses' },
      'selesai': { color: 'success', label: 'Selesai' },
      'dibatalkan': { color: 'secondary', label: 'Dibatalkan' }
    }
    const badge = badges[status] || { color: 'secondary', label: status }
    return <span className={`badge bg-${badge.color}`}>{badge.label}</span>
  }

  // Pagination
  const totalPages = Math.ceil(pengajuan.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPengajuan = pengajuan.slice(startIndex, startIndex + itemsPerPage)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const handleApprovalClick = (item: PengajuanPembelian, action: 'setujui' | 'tolak' | 'revisi') => {
    setSelectedPengajuan(item)
    setApprovalAction(action)
    setApprovalNote('')
    setShowApprovalModal(true)
  }

  const handleApprovalSubmit = async () => {
    if (!selectedPengajuan || !approvalAction) return

    try {
      setProcessing(true)

      let newStatus: StatusPengajuan
      let catatan: string

      switch (approvalAction) {
        case 'setujui':
          newStatus = 'disetujui'
          catatan = approvalNote || 'Disetujui oleh Ketua RW, menunggu pembayaran Bendahara'
          break
        case 'tolak':
          newStatus = 'ditolak'
          catatan = approvalNote || 'Ditolak oleh Ketua RW'
          break
        case 'revisi':
          newStatus = 'direvisi'
          catatan = approvalNote || 'Perlu revisi'
          break
        default:
          return
      }

      // Update riwayat status
      const newRiwayat = [
        ...selectedPengajuan.riwayat_status,
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

      const { error } = await supabase
        .from('pengajuan_pembelian')
        .update(updateData)
        .eq('id', selectedPengajuan.id)

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

  const handleDeleteClick = (item: PengajuanPembelian) => {
    setDeleteTarget(item)
    setShowDeleteModal(true)
  }

  // Helper function untuk extract path dari storage URL atau path relatif
  const extractStoragePath = (url: string): string | null => {
    if (!url) return null
    
    // Jika sudah berupa path relatif (tidak dimulai dengan http), langsung return
    if (!url.startsWith('http')) {
      // Hapus query string jika ada
      return url.split('?')[0]
    }
    
    // Jika URL lengkap, extract path setelah /pengajuan/
    // URL formats:
    // 1. Public: https://xxx.supabase.co/storage/v1/object/public/pengajuan/path/file.jpg
    // 2. Signed: https://xxx.supabase.co/storage/v1/object/sign/pengajuan/path/file.jpg?token=...
    const match = url.match(/\/pengajuan\/([^?]+)/)
    return match ? match[1] : null
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)

      // DEBUG: Log deleteTarget untuk cek URL
      console.log('deleteTarget:', deleteTarget)
      console.log('nota_invoice_url:', deleteTarget.nota_invoice_url)
      console.log('bukti_transaksi_url:', deleteTarget.bukti_transaksi_url)
      console.log('bukti_transfer_url:', deleteTarget.bukti_transfer_url)

      // Kumpulkan semua file path yang perlu dihapus
      const filePaths: string[] = []
      
      // Helper untuk menambah path jika valid
      const addPath = (url: string | undefined | null) => {
        console.log('addPath called with:', url)
        if (url) {
          const path = extractStoragePath(url)
          console.log('extracted path:', path)
          if (path) filePaths.push(path)
        }
      }

      // Tambahkan semua file terkait pengajuan
      addPath(deleteTarget.nota_invoice_url)
      addPath(deleteTarget.bukti_transaksi_url)
      addPath(deleteTarget.bukti_transfer_url)
      addPath(deleteTarget.bukti_persetujuan_url)
      
      // Hapus file dari riwayat_status jika ada bukti_url
      if (deleteTarget.riwayat_status && Array.isArray(deleteTarget.riwayat_status)) {
        deleteTarget.riwayat_status.forEach((r: { bukti_url?: string }) => {
          addPath(r.bukti_url)
        })
      }

      console.log('Files to delete:', filePaths)

      // Hapus file dari storage
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('pengajuan')
          .remove(filePaths)
        
        if (storageError) {
          console.error('Error deleting files from storage:', storageError)
          // Lanjut hapus data meski file gagal dihapus
        } else {
          console.log('Successfully deleted', filePaths.length, 'files from storage')
        }
      }

      // Hapus kas_transaksi terkait jika ada
      const { error: kasError } = await supabase
        .from('kas_transaksi')
        .delete()
        .eq('pengajuan_id', deleteTarget.id)
      
      if (kasError) {
        console.error('Error deleting kas_transaksi:', kasError)
      }

      // Hapus pengajuan
      const { error } = await supabase
        .from('pengajuan_pembelian')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error

      setShowDeleteModal(false)
      setDeleteTarget(null)
      fetchPengajuan()
      alert('Pengajuan dan semua file terkait berhasil dihapus')
    } catch (error) {
      console.error('Error deleting pengajuan:', error)
      alert('Gagal menghapus pengajuan')
    } finally {
      setDeleting(false)
    }
  }


  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-1">Pengajuan Pembelian</h1>
          <p className="text-muted mb-0">
            Kelola pengajuan pembelian dan pengeluaran
          </p>
        </div>
        <Link href="/keuangan/pengajuan/tambah" className="btn btn-primary">
          <FiPlus className="me-2" />
          Pengajuan Baru
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small">
                <FiFilter className="me-1" /> Status
              </label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="diajukan">Menunggu Approval</option>
                <option value="direvisi">Perlu Revisi</option>
                <option value="disetujui">Menunggu Pembayaran</option>
                <option value="ditolak">Ditolak</option>
                <option value="diproses">Pembayaran Diproses</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Wilayah</label>
              <select
                className="form-select"
                value={filterWilayah}
                onChange={(e) => setFilterWilayah(e.target.value)}
              >
                <option value="">Semua Wilayah</option>
                <option value="Timur">Discovery Timur</option>
                <option value="Barat">Discovery Barat</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">
                <FiCalendar className="me-1" /> Bulan
              </label>
              <input
                type="month"
                className="form-control"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setFilterStatus('')
                  setFilterWilayah('')
                  setFilterBulan('')
                  setCurrentPage(1)
                }}
              >
                <FiRefreshCw className="me-2" />
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : pengajuan.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">Belum ada pengajuan</p>
            </div>
          ) : (
            <div className="table-responsive desktop-table">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>No. Pengajuan</th>
                    <th>Tanggal</th>
                    <th>Pemohon</th>
                    <th>Deskripsi</th>
                    <th>Wilayah</th>
                    <th>Kategori</th>
                    <th className="text-end">Nilai</th>
                    <th>Status</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPengajuan.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{item.nomor_pengajuan}</td>
                      <td>{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}</td>
                      <td>
                        <div>{item.nama_pemohon}</div>
                        <small className="text-muted">{item.jabatan_pemohon}</small>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                          {item.deskripsi_pembelian}
                        </div>
                      </td>
                      <td>{item.wilayah}</td>
                      <td>{item.kategori?.nama || '-'}</td>
                      <td className="text-end fw-bold">{formatRupiah(item.nilai_transaksi)}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <div className="d-flex justify-content-center gap-1">
                          <Link
                            href={`/keuangan/pengajuan/${item.id}`}
                            className="btn btn-sm btn-outline-primary"
                            title="Lihat Detail"
                          >
                            <FiEye />
                          </Link>
                          
                          {/* Approval buttons for Ketua RW */}
                          {isKetuaRW && item.status === 'diajukan' && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                title="Setujui"
                                onClick={() => handleApprovalClick(item, 'setujui')}
                              >
                                <FiCheck />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                title="Tolak"
                                onClick={() => handleApprovalClick(item, 'tolak')}
                              >
                                <FiX />
                              </button>
                              <button
                                className="btn btn-sm btn-warning"
                                title="Minta Revisi"
                                onClick={() => handleApprovalClick(item, 'revisi')}
                              >
                                <FiRefreshCw />
                              </button>
                            </>
                          )}

                          {/* Edit for pemohon (only own pengajuan with status diajukan/direvisi) */}
                          {item.pemohon_id === userData?.id && ['diajukan', 'direvisi'].includes(item.status) && (
                            <Link
                              href={`/keuangan/pengajuan/${item.id}/edit`}
                              className="btn btn-sm btn-outline-warning"
                              title="Edit"
                            >
                              <FiEdit2 />
                            </Link>
                          )}

                          {/* Delete button - Ketua RW can delete ANY, pemohon only own with status diajukan/direvisi */}
                          {(isKetuaRW || (item.pemohon_id === userData?.id && ['diajukan', 'direvisi'].includes(item.status))) && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              title="Hapus Pengajuan"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


          )}

            {/* Mobile Card View */}
            <div className="mobile-card-list">
              {paginatedPengajuan.map((item) => (
                <div key={item.id} className="mobile-card-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="mc-title" style={{flex:1,whiteSpace:'normal'}}>{item.deskripsi_pembelian}</div>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mc-row">
                    <small className="text-muted">{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')} · {item.nama_pemohon}</small>
                  </div>
                  <div className="mc-row">
                    <span className="mc-label">Nilai</span>
                    <strong>{formatRupiah(item.nilai_transaksi)}</strong>
                  </div>
                  <div className="mc-actions">
                    <Link href={`/keuangan/pengajuan/${item.id}`} className="btn btn-sm btn-outline-primary">
                      <FiEye className="me-1" /> Detail
                    </Link>
                    {isKetuaRW && item.status === 'diajukan' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleApprovalClick(item, 'setujui')}>
                          <FiCheck />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleApprovalClick(item, 'tolak')}>
                          <FiX />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
            <small className="text-muted">
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, pengajuan.length)} dari {pengajuan.length} pengajuan
              {filterBulan && ` untuk bulan ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
            </small>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                    <FiChevronsLeft />
                  </button>
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                    <FiChevronLeft />
                  </button>
                </li>
                {getPageNumbers().map((page, idx) => (
                  <li key={idx} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    <FiChevronRight />
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                    <FiChevronsRight />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
        {totalPages <= 1 && pengajuan.length > 0 && (
          <div className="card-footer">
            <small className="text-muted">
              Menampilkan {pengajuan.length} pengajuan
              {filterBulan && ` untuk bulan ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
            </small>
          </div>
        )}
      </div>


      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <FiTrash2 className="me-2" />
                  Hapus Pengajuan
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Apakah Anda yakin ingin menghapus pengajuan berikut?
                </p>
                <div className="alert alert-secondary">
                  <strong>{deleteTarget.nomor_pengajuan}</strong><br />
                  {deleteTarget.deskripsi_pembelian}<br />
                  <span className="fw-bold text-primary">{formatRupiah(deleteTarget.nilai_transaksi)}</span>
                </div>
                <div className="alert alert-warning small mb-0">
                  <strong>⚠️ Perhatian:</strong>
                  <p className="mb-1 mt-2">File yang akan dihapus:</p>
                  <ul className="mb-1 ps-3">
                    {deleteTarget.nota_invoice_url && <li>Nota/Invoice</li>}
                    {deleteTarget.bukti_transaksi_url && <li>Bukti Transaksi</li>}
                    {deleteTarget.bukti_transfer_url && <li>Bukti Transfer Bank</li>}
                    {deleteTarget.bukti_persetujuan_url && <li>Bukti Persetujuan</li>}
                  </ul>
                  <ul className="mb-0 ps-3 mt-1">
                    <li>Semua file dokumen pendukung akan dihapus</li>
                    <li>Jika sudah ada transaksi kas terkait, akan ikut terhapus</li>
                    <li>Tindakan ini tidak dapat dibatalkan</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Menghapus...</>
                  ) : (
                      <><FiTrash2 className="me-2" />Ya, Hapus Pengajuan</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedPengajuan && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {approvalAction === 'setujui' && 'Setujui Pengajuan'}
                  {approvalAction === 'tolak' && 'Tolak Pengajuan'}
                  {approvalAction === 'revisi' && 'Minta Revisi'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowApprovalModal(false)}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Pengajuan: <strong>{selectedPengajuan.nomor_pengajuan}</strong><br />
                  {selectedPengajuan.deskripsi_pembelian}
                </p>
                <div className="mb-3">
                  <label className="form-label">
                    Catatan {approvalAction === 'revisi' && <span className="text-danger">*</span>}
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder={
                      approvalAction === 'revisi' 
                        ? 'Jelaskan apa yang perlu direvisi...'
                        : 'Catatan (opsional)...'
                    }
                    required={approvalAction === 'revisi'}
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
                    approvalAction === 'setujui' ? 'success' :
                    approvalAction === 'tolak' ? 'danger' : 'warning'
                  }`}
                  onClick={handleApprovalSubmit}
                  disabled={processing || (approvalAction === 'revisi' && !approvalNote)}
                >
                  {processing ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Memproses...</>
                  ) : (
                      <>{approvalAction === 'setujui' && 'Setujui'}{approvalAction === 'tolak' && 'Tolak'}{approvalAction === 'revisi' && 'Kirim ke Revisi'}</>
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

  