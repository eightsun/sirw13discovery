'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KasTransaksi } from '@/types'
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiTrendingUp,
  FiTrendingDown,
  FiImage
} from 'react-icons/fi'

export default function DetailTransaksiPage() {
  const params = useParams()
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [transaksi, setTransaksi] = useState<KasTransaksi | null>(null)
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isKetuaRW = userData?.role === 'ketua_rw'

  useEffect(() => {
    fetchTransaksi()
  }, [params.id])

  const fetchTransaksi = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('kas_transaksi')
        .select(`
          *,
          kategori:kategori_id (id, kode, nama),
          creator:created_by (nama_lengkap, email)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setTransaksi(data)

      // Get bukti URL if exists
      if (data.bukti_url) {
        if (data.bukti_url.startsWith('http')) {
          setBuktiUrl(data.bukti_url)
        } else {
          const { data: signedData } = await supabase.storage
            .from('pengajuan')
            .createSignedUrl(data.bukti_url, 3600)
          setBuktiUrl(signedData?.signedUrl || null)
        }
      }
    } catch (error) {
      console.error('Error fetching transaksi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!transaksi) return

    try {
      setDeleting(true)

      if (transaksi.bukti_url) {
        const path = transaksi.bukti_url.startsWith('http')
          ? transaksi.bukti_url.match(/\/pengajuan\/([^?]+)/)?.[1]
          : transaksi.bukti_url.split('?')[0]

        if (path) {
          await supabase.storage.from('pengajuan').remove([path])
        }
      }

      const { error } = await supabase
        .from('kas_transaksi')
        .delete()
        .eq('id', transaksi.id)

      if (error) throw error

      alert('Transaksi berhasil dihapus')
      router.push('/keuangan/transaksi')
    } catch (error) {
      console.error('Error deleting transaksi:', error)
      alert('Gagal menghapus transaksi')
    } finally {
      setDeleting(false)
    }
  }

  const getSumberLabel = (sumber: string) => {
    const labels: Record<string, string> = {
      'ipl': 'IPL',
      'pengajuan': 'Pengajuan',
      'manual': 'Manual'
    }
    return labels[sumber] || sumber
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!transaksi) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Transaksi tidak ditemukan</p>
        <Link href="/keuangan/transaksi" className="btn btn-primary">
          Kembali ke Daftar Transaksi
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <Link href="/keuangan/transaksi" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Detail Transaksi</h1>
          <p className="text-muted mb-0">
            Informasi lengkap transaksi kas
          </p>
        </div>
        {isKetuaRW && (
          <div className="d-flex gap-2">
            <Link href={`/keuangan/transaksi/${transaksi.id}/edit`} className="btn btn-warning">
              <FiEdit2 className="me-1" /> Edit
            </Link>
            <button
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              <FiTrash2 className="me-1" /> Hapus
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <div className="col-lg-8">
          {/* Informasi Transaksi */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold">Informasi Transaksi</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Tanggal</label>
                  <p className="fw-bold mb-0">{new Date(transaksi.tanggal).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Tipe Transaksi</label>
                  <p className="mb-0">
                    {transaksi.tipe === 'pemasukan' ? (
                      <span className="text-success fw-bold">
                        <FiTrendingUp className="me-1" /> Pemasukan
                      </span>
                    ) : (
                      <span className="text-danger fw-bold">
                        <FiTrendingDown className="me-1" /> Pengeluaran
                      </span>
                    )}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Jenis Kas</label>
                  <p className="mb-0">
                    <span className={`badge bg-${transaksi.jenis_kas === 'rw' ? 'primary' : 'secondary'}`}>
                      {transaksi.jenis_kas.toUpperCase()}
                    </span>
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Wilayah</label>
                  <p className="fw-bold mb-0">Discovery {transaksi.wilayah}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Sumber</label>
                  <p className="mb-0">
                    <span className={`badge bg-${
                      transaksi.sumber === 'ipl' ? 'info' :
                      transaksi.sumber === 'pengajuan' ? 'warning' : 'secondary'
                    }`}>
                      {getSumberLabel(transaksi.sumber)}
                    </span>
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted small mb-0">Kategori</label>
                  <p className="fw-bold mb-0">
                    {transaksi.kategori ? `${transaksi.kategori.kode}. ${transaksi.kategori.nama}` : '-'}
                  </p>
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label text-muted small mb-0">Keterangan</label>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{transaksi.keterangan || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bukti Transaksi */}
          {buktiUrl && (
            <div className="card mb-4">
              <div className="card-header bg-secondary text-white">
                <h6 className="mb-0 fw-bold">
                  <FiImage className="me-2" />
                  Bukti Transaksi
                </h6>
              </div>
              <div className="card-body text-center">
                <img
                  src={buktiUrl}
                  alt="Bukti Transaksi"
                  className="img-fluid rounded"
                  style={{ maxHeight: '500px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className={`card-header text-white ${transaksi.tipe === 'pemasukan' ? 'bg-success' : 'bg-danger'}`}>
              <h6 className="mb-0 fw-bold">Jumlah</h6>
            </div>
            <div className="card-body text-center">
              <h3 className={`fw-bold ${transaksi.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                {transaksi.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(transaksi.jumlah)}
              </h3>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-light">
              <h6 className="mb-0 fw-bold">Info Lainnya</h6>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <small className="text-muted">Dibuat oleh</small>
                <p className="mb-0 small">{(transaksi as unknown as { creator?: { nama_lengkap: string } }).creator?.nama_lengkap || '-'}</p>
              </div>
              <div>
                <small className="text-muted">Tanggal dibuat</small>
                <p className="mb-0 small">{new Date(transaksi.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <FiTrash2 className="me-2" />
                  Hapus Transaksi
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
                  Apakah Anda yakin ingin menghapus transaksi ini?
                </p>
                <div className="alert alert-secondary">
                  <strong>{new Date(transaksi.tanggal).toLocaleDateString('id-ID')}</strong> - {transaksi.wilayah}<br />
                  {transaksi.keterangan || 'Tidak ada keterangan'}<br />
                  <span className={`fw-bold ${transaksi.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                    {transaksi.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(transaksi.jumlah)}
                  </span>
                </div>
                <div className="alert alert-warning small mb-0">
                  <strong>Perhatian:</strong> Tindakan ini tidak dapat dibatalkan.
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
                    <><FiTrash2 className="me-2" />Ya, Hapus Transaksi</>
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
