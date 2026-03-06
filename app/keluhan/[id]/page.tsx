'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Keluhan, KeluhanTimeline, StatusKeluhan, KategoriKeluhan } from '@/types'
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiLoader, FiCamera, FiX,
  FiCheckCircle, FiClock, FiEye, FiSearch, FiCalendar,
  FiMapPin, FiUser, FiUpload, FiAlertTriangle, FiDollarSign,
  FiXCircle, FiUserCheck
} from 'react-icons/fi'

const KATEGORI_LABELS: Record<KategoriKeluhan, string> = {
  keselamatan: 'Keselamatan', kebersihan: 'Kebersihan', keamanan: 'Keamanan',
  ketertiban: 'Ketertiban', kenyamanan: 'Kenyamanan', infrastruktur: 'Infrastruktur',
  fasilitas_umum: 'Fasilitas Umum', penerangan: 'Penerangan', saluran_air: 'Saluran Air', lainnya: 'Lainnya',
}

const STATUS_CONFIG: Record<StatusKeluhan, { label: string; color: string; bgLight: string; icon: React.ReactNode }> = {
  dikirim: { label: 'Laporan Dikirim', color: 'bg-info', bgLight: '#e0f7fa', icon: <FiClock /> },
  ditinjau: { label: 'Sedang Ditinjau', color: 'bg-warning text-dark', bgLight: '#fff8e1', icon: <FiEye /> },
  dikerjakan: { label: 'Sedang Dikerjakan', color: 'bg-primary', bgLight: '#e3f2fd', icon: <FiSearch /> },
  selesai: { label: 'Telah Diselesaikan', color: 'bg-success', bgLight: '#e8f5e9', icon: <FiCheckCircle /> },
  ditolak: { label: 'Ditolak', color: 'bg-danger', bgLight: '#ffebee', icon: <FiXCircle /> },
}

const STATUS_ORDER: StatusKeluhan[] = ['dikirim', 'ditinjau', 'dikerjakan', 'selesai']

export default function KeluhanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData, isRW, loading: userLoading } = useUser()
  const supabase = createClient()
  const penyelesaianRef = useRef<HTMLInputElement>(null)

  const [keluhan, setKeluhan] = useState<Keluhan | null>(null)
  const [timeline, setTimeline] = useState<KeluhanTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)
  const [uploadingCompletion, setUploadingCompletion] = useState(false)
  const [koordinatorList, setKoordinatorList] = useState<{ id: string; nama_lengkap: string }[]>([])
  const [selectedKoordinator, setSelectedKoordinator] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const id = params.id as string
  const isCreator = keluhan?.pelapor_id === user?.id
  const canManage = isCreator || isRW
  const isKetuaRW = userData?.role === 'ketua_rw'
  const isKoordinator = userData?.role === 'koordinator_rw'

  // Fetch koordinator list for assignment
  useEffect(() => {
    if (isRW) {
      supabase.from('users').select('id, nama_lengkap').eq('role', 'koordinator_rw').eq('is_active', true)
        .then(({ data }: { data: { id: string; nama_lengkap: string }[] | null }) => {
          setKoordinatorList(data || [])
        })
    }
  }, [isRW])

  useEffect(() => { if (id) fetchDetail() }, [id])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const { data: kData, error } = await supabase
        .from('keluhan')
        .select('*, rt:rt_id(nomor_rt)')
        .eq('id', id)
        .single()
      if (error) throw error
      
      // Fetch linked pengajuan if exists
      if (kData.pengajuan_id) {
        const { data: pData } = await supabase
          .from('pengajuan_pembelian')
          .select('nomor_pengajuan, nilai_transaksi')
          .eq('id', kData.pengajuan_id)
          .single()
        if (pData) kData.pengajuan = pData
      }
      
      setKeluhan(kData)

      const { data: tData } = await supabase
        .from('keluhan_timeline')
        .select('*')
        .eq('keluhan_id', id)
        .order('created_at', { ascending: true })
      setTimeline(tData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: StatusKeluhan) => {
    if (!user || !keluhan || !userData) return
    setUpdatingStatus(true)
    try {
      const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
      
      // If assigning koordinator during ditinjau
      if (newStatus === 'dikerjakan' && selectedKoordinator) {
        const koord = koordinatorList.find((k: { id: string; nama_lengkap: string }) => k.id === selectedKoordinator)
        updateData.assigned_to = selectedKoordinator
        updateData.assigned_nama = koord?.nama_lengkap || null
      }

      // If rejecting
      if (newStatus === 'ditolak') {
        if (!rejectReason.trim()) { alert('Alasan penolakan wajib diisi'); setUpdatingStatus(false); return }
        updateData.alasan_ditolak = rejectReason.trim()
      }

      await supabase.from('keluhan').update(updateData).eq('id', id)
      
      let catatan = statusNote || null
      if (newStatus === 'ditolak') catatan = 'Ditolak: ' + rejectReason.trim()
      if (newStatus === 'dikerjakan' && selectedKoordinator) {
        const koord = koordinatorList.find((k: { id: string; nama_lengkap: string }) => k.id === selectedKoordinator)
        catatan = (statusNote ? statusNote + '. ' : '') + 'Ditugaskan kepada ' + (koord?.nama_lengkap || 'Koordinator')
      }
      
      await supabase.from('keluhan_timeline').insert({
        keluhan_id: id,
        status: newStatus,
        catatan,
        user_id: user.id,
        nama_user: userData.nama_lengkap || user.email || 'Pengurus',
      })
      setStatusNote('')
      setRejectReason('')
      setSelectedKoordinator('')
      fetchDetail()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleUploadCompletion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !keluhan) return
    setUploadingCompletion(true)
    try {
      // Delete old if exists
      if (keluhan.foto_penyelesaian_url) {
        const match = keluhan.foto_penyelesaian_url.match(/\/keluhan\/(.+)$/)
        if (match) await supabase.storage.from('keluhan').remove([match[1]])
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'penyelesaian')
      const res = await fetch('/api/upload-keluhan', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await supabase.from('keluhan').update({ foto_penyelesaian_url: data.fileUrl }).eq('id', id)
      fetchDetail()
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Upload gagal') }
    finally { setUploadingCompletion(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Hapus laporan ini? Semua foto akan dihapus permanen.')) return
    setDeleting(true)
    try {
      if (keluhan) {
        const filesToDelete: string[] = []
        keluhan.foto_urls?.forEach((url: string) => {
          const match = url.match(/\/keluhan\/(.+)$/)
          if (match) filesToDelete.push(match[1])
        })
        if (keluhan.foto_penyelesaian_url) {
          const match = keluhan.foto_penyelesaian_url.match(/\/keluhan\/(.+)$/)
          if (match) filesToDelete.push(match[1])
        }
        if (filesToDelete.length > 0) await supabase.storage.from('keluhan').remove(filesToDelete)
      }
      const { error } = await supabase.from('keluhan').delete().eq('id', id)
      if (error) throw error
      router.push('/keluhan')
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Gagal menghapus'); setDeleting(false) }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formatDateTime = (d: string) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  if (loading || userLoading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
  if (!keluhan) return <div className="text-center py-5"><p className="text-muted">Laporan tidak ditemukan</p><Link href="/keluhan" className="btn btn-primary">Kembali</Link></div>

  const statusCfg = STATUS_CONFIG[keluhan.status]
  const currentIdx = STATUS_ORDER.indexOf(keluhan.status)
  const nextStatus = currentIdx < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIdx + 1] : null

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <Link href="/keluhan" className="btn btn-outline-secondary btn-sm"><FiArrowLeft className="me-1" /> Kembali</Link>
        {canManage && (
          <div className="d-flex gap-2">
            <Link href={`/keluhan/${id}/edit`} className="btn btn-outline-primary btn-sm">
              <FiEdit2 className="me-1" /> Edit
            </Link>
            {isCreator && keluhan.status === 'dikirim' && (
              <button className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={deleting}><FiTrash2 className="me-1" /> Hapus</button>
            )}
          </div>
        )}
      </div>

      <div className="row">
        {/* Main */}
        <div className="col-lg-8 mb-4">
          {/* Status Banner */}
          <div className="card mb-4" style={{ backgroundColor: statusCfg.bgLight, borderLeft: '4px solid' }}>
            <div className="card-body py-3 d-flex justify-content-between align-items-center">
              <div>
                <span className={`badge ${statusCfg.color} me-2`}>{statusCfg.icon} <span className="ms-1">{statusCfg.label}</span></span>
                <span className="badge bg-secondary">{keluhan.nomor_laporan}</span>
              </div>
              <small className="text-muted">{formatDateTime(keluhan.created_at)}</small>
            </div>
          </div>

          {/* Progress */}
          <div className="card mb-4">
            <div className="card-body py-3">
              <div className="d-flex justify-content-between">
                {STATUS_ORDER.map((s, i) => {
                  const done = i <= currentIdx
                  const cfg = STATUS_CONFIG[s]
                  return (
                    <div key={s} className="text-center flex-fill" style={{ position: 'relative' }}>
                      {i > 0 && <div style={{ position: 'absolute', top: 14, left: 0, right: '50%', height: 3, backgroundColor: done ? '#28a745' : '#dee2e6' }} />}
                      {i < STATUS_ORDER.length - 1 && <div style={{ position: 'absolute', top: 14, left: '50%', right: 0, height: 3, backgroundColor: i < currentIdx ? '#28a745' : '#dee2e6' }} />}
                      <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${done ? 'bg-success text-white' : 'bg-light text-muted border'}`} style={{ width: 30, height: 30, position: 'relative', zIndex: 1 }}>
                        {done ? <FiCheckCircle size={14} /> : cfg.icon}
                      </div>
                      <div className={`small mt-1 ${done ? 'fw-bold' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>{cfg.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6"><div className="d-flex"><FiUser className="text-muted me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Pelapor</div><div className="fw-bold">{keluhan.nama_pelapor}</div></div></div></div>
                <div className="col-sm-6"><div className="d-flex"><FiMapPin className="text-muted me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Lokasi</div><div className="fw-bold">{keluhan.blok_rumah} No. {keluhan.nomor_rumah}{keluhan.rt && ` · RT ${keluhan.rt.nomor_rt}`}</div></div></div></div>
                <div className="col-sm-6"><div className="d-flex"><FiAlertTriangle className="text-muted me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Kategori</div><div className="fw-bold">{KATEGORI_LABELS[keluhan.kategori]}</div></div></div></div>
                <div className="col-sm-6"><div className="d-flex"><FiCalendar className="text-muted me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Tanggal Kejadian</div><div className="fw-bold">{formatDate(keluhan.tanggal_kejadian)}</div></div></div></div>
                {keluhan.lokasi_keluhan && (
                  <div className="col-sm-6"><div className="d-flex"><FiMapPin className="text-info me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Lokasi Keluhan</div><div className="fw-bold">{keluhan.lokasi_keluhan}</div></div></div></div>
                )}
                {keluhan.assigned_nama && (
                  <div className="col-sm-6"><div className="d-flex"><FiUserCheck className="text-primary me-2 mt-1 flex-shrink-0" /><div><div className="small text-muted">Ditugaskan kepada</div><div className="fw-bold">{keluhan.assigned_nama}</div></div></div></div>
                )}
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0 fw-bold">Detail Keluhan</h6></div>
            <div className="card-body"><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{keluhan.detail_keluhan}</div></div>
          </div>

          {/* Ditolak Notice */}
          {keluhan.status === 'ditolak' && keluhan.alasan_ditolak && (
            <div className="card mb-4 border-danger">
              <div className="card-header bg-danger text-white"><h6 className="mb-0 fw-bold"><FiXCircle className="me-2" />Alasan Penolakan</h6></div>
              <div className="card-body"><div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{keluhan.alasan_ditolak}</div></div>
            </div>
          )}

          {/* Foto Bukti */}
          {keluhan.foto_urls && keluhan.foto_urls.length > 0 && (
            <div className="card mb-4">
              <div className="card-header"><h6 className="mb-0 fw-bold"><FiCamera className="me-2" />Foto Bukti ({keluhan.foto_urls.length})</h6></div>
              <div className="card-body">
                <div className="row g-2">
                  {keluhan.foto_urls.map((url: string, i: number) => (
                    <div key={i} className="col-4 col-md-3">
                      <img src={url} alt={`Bukti ${i + 1}`} className="rounded" style={{ width: '100%', height: '120px', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setShowPhotoModal(url)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Foto Penyelesaian */}
          {(keluhan.foto_penyelesaian_url || (isRW && keluhan.status === 'dikerjakan')) && (
            <div className="card mb-4 border-success">
              <div className="card-header bg-success text-white"><h6 className="mb-0 fw-bold"><FiCheckCircle className="me-2" />Foto Sesudah Penanganan</h6></div>
              <div className="card-body">
                {keluhan.foto_penyelesaian_url ? (
                  <div>
                    <img src={keluhan.foto_penyelesaian_url} alt="Penyelesaian" className="rounded" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setShowPhotoModal(keluhan.foto_penyelesaian_url!)} />
                    {isRW && <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => penyelesaianRef.current?.click()} disabled={uploadingCompletion}>{uploadingCompletion ? 'Mengupload...' : 'Ganti Foto'}</button>}
                  </div>
                ) : (
                  <div>
                    <p className="text-muted small mb-2">Upload foto sesudah penanganan (opsional)</p>
                    <button className="btn btn-success btn-sm" onClick={() => penyelesaianRef.current?.click()} disabled={uploadingCompletion}>
                      {uploadingCompletion ? <><FiLoader className="spin me-1" />Mengupload...</> : <><FiUpload className="me-1" />Upload Foto</>}
                    </button>
                  </div>
                )}
                <input ref={penyelesaianRef} type="file" accept="image/jpeg,image/png,image/webp" className="d-none" onChange={handleUploadCompletion} />
              </div>
            </div>
          )}

          {/* Biaya & Pengajuan */}
          {(keluhan.biaya_penyelesaian > 0 || keluhan.pengajuan_id) && (
            <div className="card mb-4 border-warning">
              <div className="card-header bg-warning bg-opacity-25"><h6 className="mb-0 fw-bold"><FiDollarSign className="me-2" />Biaya & Pengajuan Terkait</h6></div>
              <div className="card-body">
                {keluhan.biaya_penyelesaian > 0 && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Biaya Penyelesaian:</span>
                    <h5 className="mb-0 text-primary">{formatRupiah(keluhan.biaya_penyelesaian)}</h5>
                  </div>
                )}
                {keluhan.pengajuan_id && keluhan.pengajuan && (
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <span>Pengajuan: <strong>{keluhan.pengajuan.nomor_pengajuan}</strong></span>
                    <Link href={`/keuangan/pengajuan/${keluhan.pengajuan_id}`} className="btn btn-sm btn-outline-primary">
                      Lihat Pengajuan
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Timeline & Actions */}
        <div className="col-lg-4">
          {/* Status Update (pengurus RW only) */}
          {isRW && keluhan.status !== 'selesai' && keluhan.status !== 'ditolak' && nextStatus && (
            <div className="card mb-4 border-primary">
              <div className="card-header bg-primary text-white"><h6 className="mb-0 fw-bold">Update Status</h6></div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label small">Catatan (opsional)</label>
                  <textarea className="form-control form-control-sm" rows={2} placeholder="Catatan untuk perubahan status..." value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                </div>

                {/* Assignment Koordinator - saat mau pindah ke "dikerjakan" */}
                {nextStatus === 'dikerjakan' && koordinatorList.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label small"><FiUserCheck className="me-1" />Tugaskan ke Koordinator</label>
                    <select className="form-select form-select-sm" value={selectedKoordinator} onChange={(e) => setSelectedKoordinator(e.target.value)}>
                      <option value="">-- Pilih Koordinator RW --</option>
                      {koordinatorList.map((k: { id: string; nama_lengkap: string }) => (
                        <option key={k.id} value={k.id}>{k.nama_lengkap}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button className={`btn ${STATUS_CONFIG[nextStatus].color.replace('text-dark', '')} w-100 mb-2`} onClick={() => handleUpdateStatus(nextStatus)} disabled={updatingStatus}>
                  {updatingStatus ? <><FiLoader className="spin me-1" />Memproses...</> : <>{STATUS_CONFIG[nextStatus].icon} <span className="ms-1">Ubah ke: {STATUS_CONFIG[nextStatus].label}</span></>}
                </button>

                {/* Tolak Laporan - hanya Ketua RW */}
                {isKetuaRW && keluhan.status === 'dikirim' && (
                  <div className="border-top pt-3 mt-3">
                    <label className="form-label small text-danger"><FiXCircle className="me-1" />Tolak Laporan</label>
                    <textarea className="form-control form-control-sm mb-2" rows={2} placeholder="Alasan penolakan (wajib diisi)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <button className="btn btn-outline-danger btn-sm w-100" onClick={() => handleUpdateStatus('ditolak')} disabled={updatingStatus || !rejectReason.trim()}>
                      <FiXCircle className="me-1" /> Tolak Tindak Lanjut
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card mb-4" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-header"><h6 className="mb-0 fw-bold"><FiClock className="me-2" />Timeline</h6></div>
            <div className="card-body">
              {timeline.length === 0 ? (
                <p className="text-muted small text-center mb-0">Belum ada aktivitas</p>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: 11, top: 12, bottom: 12, width: 2, backgroundColor: '#dee2e6' }} />
                  
                  {timeline.map((t: KeluhanTimeline, i: number) => {
                    const tCfg = STATUS_CONFIG[t.status]
                    return (
                      <div key={t.id} className="d-flex mb-3" style={{ position: 'relative' }}>
                        <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${t.status === 'selesai' ? 'bg-success' : 'bg-primary'} text-white`} style={{ width: 24, height: 24, zIndex: 1 }}>
                          {tCfg.icon}
                        </div>
                        <div className="ms-3 flex-grow-1">
                          <div className="fw-bold small">{tCfg.label}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{t.nama_user}</div>
                          {t.catatan && <div className="small mt-1 text-muted fst-italic">{t.catatan}</div>}
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{formatDateTime(t.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Zoom Modal */}
      {showPhotoModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setShowPhotoModal(null)}>
          <button className="btn btn-light position-absolute" style={{ top: 20, right: 20, borderRadius: '50%', width: 40, height: 40 }} onClick={() => setShowPhotoModal(null)}><FiX size={20} /></button>
          <img src={showPhotoModal} alt="Zoom" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}