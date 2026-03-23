'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ConfirmDialog'
import { Surat, TipeSurat, KATEGORI_SURAT_LABELS, KategoriSurat } from '@/types'
import {
  FiFileText, FiPlus, FiEye, FiEdit2, FiTrash2,
  FiExternalLink, FiInbox, FiSend, FiChevronLeft, FiChevronRight, FiDownload
} from 'react-icons/fi'
import * as XLSX from 'xlsx'

const ITEMS_PER_PAGE = 10

export default function SuratPage() {
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const toast = useToast()
  const confirm = useConfirm()

  const [activeTab, setActiveTab] = useState<TipeSurat>('keluar')
  const [suratList, setSuratList] = useState<Surat[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'].includes(userData.role)

  useEffect(() => {
    setPage(0)
  }, [activeTab])

  useEffect(() => {
    if (user) fetchSurat()
  }, [user, activeTab, page])

  const fetchSurat = async () => {
    setLoading(true)
    try {
      // Get count
      const { count } = await supabase
        .from('surat')
        .select('*', { count: 'exact', head: true })
        .eq('tipe', activeTab)

      setTotalCount(count || 0)

      // Get data
      const { data, error } = await supabase
        .from('surat')
        .select('*, pembuat:created_by(nama_lengkap, email)')
        .eq('tipe', activeTab)
        .order('tanggal_rilis', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)

      if (error) throw error
      setSuratList(data || [])
    } catch (error) {
      console.error('Error fetching surat:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (surat: Surat) => {
    const confirmed = await confirm({
      title: 'Hapus Surat',
      message: `Hapus surat "${surat.perihal}"? Data akan dihapus permanen.`,
      confirmLabel: 'Ya, Hapus',
      variant: 'danger',
    })
    if (!confirmed) return

    setDeleting(surat.id)
    try {
      // Delete via API (handles file deletion + bypass RLS)
      const res = await fetch(`/api/surat?id=${surat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Surat berhasil dihapus')
      fetchSurat()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus surat')
    } finally {
      setDeleting(null)
    }
  }

  const formatTanggal = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      // Fetch ALL surat for current tab (no pagination)
      const { data, error } = await supabase
        .from('surat')
        .select('*, pembuat:created_by(nama_lengkap)')
        .eq('tipe', activeTab)
        .order('tanggal_rilis', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        toast.warning('Tidak ada data untuk diexport')
        return
      }

      const rows = data.map((s: Surat & { pembuat?: { nama_lengkap: string } | null }, i: number) => {
        const row: Record<string, string | number> = {
          'No': i + 1,
          'Tanggal Rilis': new Date(s.tanggal_rilis).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          'Nomor Surat': s.nomor_surat,
        }
        if (activeTab === 'keluar') {
          row['Kategori'] = s.kategori_surat ? `${s.kategori_surat} - ${KATEGORI_SURAT_LABELS[s.kategori_surat as KategoriSurat] || ''}` : '-'
        }
        if (activeTab === 'masuk') {
          row['Pengirim'] = s.pengirim || '-'
        }
        row['Perihal'] = s.perihal
        row['Lampiran'] = s.lampiran_filename || '-'
        row['Dibuat Oleh'] = (s.pembuat as { nama_lengkap: string } | null)?.nama_lengkap || '-'
        return row
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      const sheetName = activeTab === 'keluar' ? 'Surat Keluar' : 'Surat Masuk'
      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      ws['!cols'] = [
        { wch: 5 }, { wch: 20 }, { wch: 25 },
        ...(activeTab === 'keluar' ? [{ wch: 25 }] : []),
        { wch: 40 }, { wch: 25 }, { wch: 20 },
      ]

      const year = new Date().getFullYear()
      const fileName = `arsip_surat_${activeTab}_${year}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh data')
    } finally {
      setDownloading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h4 className="fw-bold mb-1">Arsip Surat</h4>
          <p className="text-muted mb-0 small">Administrasi surat masuk dan keluar RW 13</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-success"
            onClick={handleDownloadExcel}
            disabled={downloading || totalCount === 0}
          >
            <FiDownload className="me-1" /> {downloading ? 'Mengunduh...' : 'Download Excel'}
          </button>
          {isRW && (
            <Link href="/surat/buat" className="btn btn-primary">
              <FiPlus className="me-1" /> Buat Surat
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'keluar' ? 'active' : ''}`}
            onClick={() => setActiveTab('keluar')}
          >
            <FiSend className="me-1" /> Surat Keluar / Pengumuman
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'masuk' ? 'active' : ''}`}
            onClick={() => setActiveTab('masuk')}
          >
            <FiInbox className="me-1" /> Surat Masuk
          </button>
        </li>
      </ul>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : suratList.length === 0 ? (
            <div className="text-center py-5">
              <FiFileText size={48} className="text-muted mb-3" />
              <p className="text-muted">
                Belum ada {activeTab === 'keluar' ? 'surat keluar' : 'surat masuk'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-responsive desktop-table">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '120px' }}>Tanggal</th>
                      <th style={{ width: '160px' }}>Nomor Surat</th>
                      {activeTab === 'keluar' && <th style={{ width: '120px' }}>Kategori</th>}
                      {activeTab === 'masuk' && <th style={{ width: '180px' }}>Pengirim</th>}
                      <th>Perihal</th>
                      <th style={{ width: '100px' }}>Lampiran</th>
                      <th style={{ width: '140px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suratList.map((surat) => (
                      <tr key={surat.id}>
                        <td className="small">{formatTanggal(surat.tanggal_rilis)}</td>
                        <td>
                          <Link href={`/surat/${surat.id}`} className="text-primary fw-bold text-decoration-none">
                            {surat.nomor_surat}
                          </Link>
                        </td>
                        {activeTab === 'keluar' && (
                          <td>
                            {surat.kategori_surat ? (
                              <span className="badge bg-info text-dark">{surat.kategori_surat}</span>
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </td>
                        )}
                        {activeTab === 'masuk' && (
                          <td>{surat.pengirim || <span className="text-muted small">-</span>}</td>
                        )}
                        <td>{surat.perihal}</td>
                        <td>
                          {surat.lampiran_url ? (
                            <a
                              href={surat.lampiran_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm"
                            >
                              <FiExternalLink size={14} className="me-1" /> PDF
                            </a>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Link
                              href={`/surat/${surat.id}`}
                              className="btn btn-outline-secondary btn-sm"
                              title="Lihat Detail"
                            >
                              <FiEye size={14} />
                            </Link>
                            {isRW && (
                              <>
                                <Link
                                  href={`/surat/${surat.id}/edit`}
                                  className="btn btn-outline-primary btn-sm"
                                  title="Edit"
                                >
                                  <FiEdit2 size={14} />
                                </Link>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  title="Hapus"
                                  onClick={() => handleDelete(surat)}
                                  disabled={deleting === surat.id}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="mobile-card-list">
                {suratList.map((surat) => (
                  <div key={surat.id} className="mobile-card-item">
                    {/* Header: Badge + Date */}
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      {activeTab === 'keluar' && surat.kategori_surat ? (
                        <span className="badge bg-info text-dark" style={{ fontSize: '0.65rem' }}>{surat.kategori_surat}</span>
                      ) : activeTab === 'masuk' && surat.pengirim ? (
                        <span className="text-muted" style={{ fontSize: '0.72rem' }}>{surat.pengirim}</span>
                      ) : (
                        <span />
                      )}
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>{formatTanggal(surat.tanggal_rilis)}</small>
                    </div>

                    {/* Nomor Surat */}
                    <Link href={`/surat/${surat.id}`} className="text-primary fw-bold text-decoration-none" style={{ fontSize: '0.85rem' }}>
                      {surat.nomor_surat}
                    </Link>

                    {/* Perihal */}
                    <div className="mc-title" style={{ marginTop: '2px' }}>{surat.perihal}</div>

                    {/* Actions */}
                    <div className="mc-actions">
                      {surat.lampiran_url && (
                        <a
                          href={surat.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-primary btn-sm"
                        >
                          <FiExternalLink size={12} className="me-1" /> PDF
                        </a>
                      )}
                      <Link href={`/surat/${surat.id}`} className="btn btn-outline-secondary btn-sm">
                        <FiEye size={12} className="me-1" /> Lihat
                      </Link>
                      {isRW && (
                        <>
                          <Link href={`/surat/${surat.id}/edit`} className="btn btn-outline-primary btn-sm">
                            <FiEdit2 size={12} />
                          </Link>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(surat)}
                            disabled={deleting === surat.id}
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Menampilkan {page * ITEMS_PER_PAGE + 1}-{Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} dari {totalCount} surat
            </small>
            <div className="d-flex gap-1">
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <FiChevronLeft />
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
