'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Surat, SuratBaca, KATEGORI_SURAT_LABELS, KategoriSurat } from '@/types'
import {
  FiArrowLeft, FiCalendar, FiEdit2, FiTrash2,
  FiExternalLink, FiEye, FiUpload, FiLoader, FiFileText, FiUser, FiSend
} from 'react-icons/fi'

export default function SuratDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [surat, setSurat] = useState<Surat | null>(null)
  const [readers, setReaders] = useState<SuratBaca[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const id = params.id as string
  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'].includes(userData.role)

  useEffect(() => {
    if (id && user) fetchDetail()
  }, [id, user])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('surat')
        .select('*, pembuat:created_by(nama_lengkap, email)')
        .eq('id', id)
        .single()

      if (error) throw error
      setSurat(data)

      // Fetch readers (for pengurus RW)
      const { data: readersData } = await supabase
        .from('surat_baca')
        .select('*, user:user_id(nama_lengkap, email)')
        .eq('surat_id', id)
        .order('read_at', { ascending: false })

      setReaders(readersData || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Hapus surat ini? Data akan dihapus permanen.')) return
    setDeleting(true)
    try {
      // Delete via API (handles file deletion + bypass RLS)
      const res = await fetch(`/api/surat?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/surat')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus')
      setDeleting(false)
    }
  }

  const handleViewLampiran = async () => {
    if (!surat?.lampiran_url || !user) return
    // Record read via API
    try {
      await fetch('/api/surat/baca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surat_id: id }),
      })
    } catch (_e) { /* ignore */ }
    // Open PDF
    window.open(surat.lampiran_url, '_blank')
    // Refresh readers list
    fetchDetail()
  }

  const handleChangeLampiran = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !surat) return
    setUploading(true)
    try {
      // Delete old file
      if (surat.lampiran_url) {
        const match = surat.lampiran_url.match(/\/surat\/(.+)$/)
        if (match) await supabase.storage.from('surat').remove([match[1]])
      }
      // Upload new file
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-surat', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update record
      await supabase.from('surat')
        .update({ lampiran_url: data.fileUrl, lampiran_filename: file.name })
        .eq('id', surat.id)

      setSurat(prev => prev ? { ...prev, lampiran_url: data.fileUrl, lampiran_filename: file.name } : null)
      alert('Lampiran berhasil diganti!')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  const formatTanggal = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const renderIsiSurat = (text: string) => {
    return text.split('\n').map((line: string, i: number) => {
      let html = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary">$1</a>')
      return <div key={i} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
    })
  }

  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!surat) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Surat tidak ditemukan</p>
        <Link href="/surat" className="btn btn-primary">Kembali</Link>
      </div>
    )
  }

  const pembuat = surat.pembuat as { nama_lengkap: string; email: string } | undefined

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <Link href="/surat" className="btn btn-outline-secondary btn-sm">
          <FiArrowLeft className="me-1" /> Kembali
        </Link>
        {isRW && (
          <div className="d-flex gap-2">
            <Link href={`/surat/${id}/edit`} className="btn btn-outline-primary btn-sm">
              <FiEdit2 className="me-1" /> Edit
            </Link>
            <button className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={deleting}>
              <FiTrash2 className="me-1" /> {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        )}
      </div>

      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8 mb-4">
          <div className="mb-2 d-flex gap-2">
            <span className={`badge ${surat.tipe === 'keluar' ? 'bg-primary' : 'bg-info'}`}>
              {surat.tipe === 'keluar' ? 'Surat Keluar / Pengumuman' : 'Surat Masuk'}
            </span>
            {surat.kategori_surat && (
              <span className="badge bg-warning text-dark">
                {surat.kategori_surat} - {KATEGORI_SURAT_LABELS[surat.kategori_surat as KategoriSurat]}
              </span>
            )}
          </div>
          <h4 className="fw-bold mb-4">{surat.perihal}</h4>

          {/* Info */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiFileText className="text-primary me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">Nomor Surat</div>
                      <div className="text-muted small">{surat.nomor_surat}</div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiCalendar className="text-success me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">Tanggal Rilis</div>
                      <div className="text-muted small">{formatTanggal(surat.tanggal_rilis)}</div>
                    </div>
                  </div>
                </div>
                {surat.tipe === 'masuk' && surat.pengirim && (
                  <div className="col-sm-6">
                    <div className="d-flex align-items-start">
                      <FiSend className="text-warning me-3 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <div className="fw-bold">Pengirim</div>
                        <div className="text-muted small">{surat.pengirim}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiUser className="text-info me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">Dibuat oleh</div>
                      <div className="text-muted small">{pembuat?.nama_lengkap || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Isi Surat */}
          {surat.isi_surat && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0 fw-bold">Isi Surat</h6>
              </div>
              <div className="card-body" style={{ lineHeight: 1.8 }}>
                {renderIsiSurat(surat.isi_surat)}
              </div>
            </div>
          )}

          {/* Lampiran */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold"><FiFileText className="me-2" />Lampiran</h6>
            </div>
            <div className="card-body">
              {surat.lampiran_url ? (
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <button
                    onClick={handleViewLampiran}
                    className="btn btn-outline-primary"
                  >
                    <FiExternalLink className="me-1" /> Lihat: {surat.lampiran_filename || 'Lampiran.pdf'}
                  </button>
                  {isRW && (
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <FiLoader className="spin" /> : <><FiUpload className="me-1" /> Ganti File</>}
                    </button>
                  )}
                </div>
              ) : (
                <div className="d-flex align-items-center gap-3">
                  <p className="text-muted small mb-0">Tidak ada lampiran</p>
                  {isRW && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <><FiLoader className="spin me-1" /> Mengupload...</> : <><FiUpload className="me-1" /> Upload Lampiran</>}
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="d-none"
                onChange={handleChangeLampiran}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Read Tracker (only for Pengurus RW) */}
        <div className="col-lg-4">
          {isRW && (
            <div className="card mb-4" style={{ position: 'sticky', top: '1rem' }}>
              <div className="card-header">
                <h6 className="mb-0 fw-bold">
                  <FiEye className="me-2" />Dibaca oleh {readers.length} orang
                </h6>
              </div>
              <div className="card-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {readers.length === 0 ? (
                  <p className="text-muted text-center py-3 mb-0 small">Belum ada yang membaca</p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {readers.map((r) => {
                      const rUser = r.user as { nama_lengkap: string; email: string } | undefined
                      return (
                        <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                          <div>
                            <div className="small fw-bold">{rUser?.nama_lengkap || 'User'}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rUser?.email}</div>
                          </div>
                          <small className="text-muted">
                            {new Date(r.read_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
