'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Kegiatan, KegiatanPartisipasi, KategoriKegiatan } from '@/types'
import { 
  FiArrowLeft, FiCalendar, FiMapPin, FiUsers, FiClock,
  FiDollarSign, FiShield, FiPhone, FiCheck, FiX, FiEdit2,
  FiTrash2, FiUpload, FiFile, FiLoader, FiExternalLink, FiUserCheck
} from 'react-icons/fi'

const KATEGORI_LABELS: Record<KategoriKegiatan, string> = {
  keagamaan: 'Keagamaan', olahraga: 'Olahraga', sosial: 'Sosial', rapat: 'Rapat',
  gotong_royong: 'Gotong Royong', pendidikan: 'Pendidikan', kesehatan: 'Kesehatan',
  kesenian: 'Kesenian', lingkungan: 'Lingkungan', lainnya: 'Lainnya',
}
const KATEGORI_ICONS: Record<KategoriKegiatan, string> = {
  keagamaan: '🕌', olahraga: '⚽', sosial: '🤝', rapat: '📋',
  gotong_royong: '🧹', pendidikan: '📚', kesehatan: '🏥',
  kesenian: '🎨', lingkungan: '🌿', lainnya: '📌',
}

export default function KegiatanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const notulenInputRef = useRef<HTMLInputElement>(null)

  const [kegiatan, setKegiatan] = useState<Kegiatan | null>(null)
  const [partisipasi, setPartisipasi] = useState<KegiatanPartisipasi[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [uploadingNotulen, setUploadingNotulen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [rtMap, setRtMap] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('rt').select('id, nomor_rt').order('nomor_rt').then(({ data }: { data: { id: string; nomor_rt: string }[] | null }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((rt: { id: string; nomor_rt: string }) => { map[rt.id] = rt.nomor_rt })
        setRtMap(map)
      }
    })
  }, [])

  const id = params.id as string
  const isCreator = kegiatan?.created_by === user?.id
  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw'].includes(userData.role)
  const canManage = isCreator || isRW
  const isUpcoming = kegiatan ? new Date(kegiatan.tanggal_mulai) > new Date() : false
  const isFull = kegiatan?.max_peserta ? (partisipasi.filter(p => p.status === 'registered').length >= kegiatan.max_peserta) : false

  useEffect(() => {
    if (id) fetchDetail()
  }, [id, user])

  const fetchDetail = async () => {
    setLoading(true)
    try {
      // Fetch kegiatan
      const { data: kData, error: kError } = await supabase
        .from('kegiatan')
        .select(`*, penyelenggara:created_by(nama_lengkap, email)`)
        .eq('id', id)
        .single()

      if (kError) throw kError
      setKegiatan(kData)

      // Fetch partisipasi
      const { data: pData } = await supabase
        .from('kegiatan_partisipasi')
        .select(`*, user:user_id(nama_lengkap, email, warga_id)`)
        .eq('kegiatan_id', id)
        .eq('status', 'registered')
        .order('registered_at', { ascending: true })

      setPartisipasi(pData || [])

      // Check if current user registered
      if (user) {
        const myReg = pData?.find((p: KegiatanPartisipasi) => p.user_id === user.id)
        setIsRegistered(!!myReg)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!user) { router.push('/login'); return }
    setRegistering(true)
    try {
      if (isRegistered) {
        // Cancel
        await supabase
          .from('kegiatan_partisipasi')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('kegiatan_id', id)
          .eq('user_id', user.id)
        setIsRegistered(false)
      } else {
        // Register
        const { error } = await supabase
          .from('kegiatan_partisipasi')
          .upsert({
            kegiatan_id: id,
            user_id: user.id,
            status: 'registered',
            registered_at: new Date().toISOString(),
            cancelled_at: null,
          }, { onConflict: 'kegiatan_id,user_id' })
        
        if (error) throw error
        setIsRegistered(true)
      }
      fetchDetail()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal'
      alert(message)
    } finally {
      setRegistering(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!kegiatan) return
    const start = new Date(kegiatan.tanggal_mulai)
    const end = kegiatan.tanggal_selesai ? new Date(kegiatan.tanggal_selesai) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
    
    const formatGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    
    const url = `https://calendar.google.com/calendar/r/eventedit?` +
      `text=${encodeURIComponent(kegiatan.nama_kegiatan)}` +
      `&dates=${formatGCal(start)}/${formatGCal(end)}` +
      `&location=${encodeURIComponent(kegiatan.lokasi)}` +
      `&details=${encodeURIComponent(kegiatan.deskripsi || '')}`
    
    window.open(url, '_blank')
  }

  const handleNotulenUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !kegiatan) return

    setUploadingNotulen(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'notulen')

      const res = await fetch('/api/upload-kegiatan', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await supabase
        .from('kegiatan')
        .update({ notulen_url: data.fileUrl, notulen_filename: file.name })
        .eq('id', kegiatan.id)

      setKegiatan(prev => prev ? { ...prev, notulen_url: data.fileUrl, notulen_filename: file.name } : null)
      alert('Notulen berhasil diupload!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload gagal'
      alert(message)
    } finally {
      setUploadingNotulen(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Hapus kegiatan ini? Semua data partisipasi juga akan terhapus.')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('kegiatan').delete().eq('id', id)
      if (error) throw error
      router.push('/kegiatan')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus'
      alert(message)
      setDeleting(false)
    }
  }

  const formatTanggal = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const formatJam = (dateStr: string) => new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  const formatWaLink = (no: string) => `https://wa.me/${no.replace(/^0/, '62').replace(/[^0-9]/g, '')}`

  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!kegiatan) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Kegiatan tidak ditemukan</p>
        <Link href="/kegiatan" className="btn btn-primary">Kembali</Link>
      </div>
    )
  }

  const registeredCount = partisipasi.filter(p => p.status === 'registered').length
  const penyelenggara = kegiatan.penyelenggara as { nama_lengkap: string; email: string } | undefined

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <Link href="/kegiatan" className="btn btn-outline-secondary btn-sm">
          <FiArrowLeft className="me-1" /> Kembali
        </Link>
        {canManage && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={deleting}>
              <FiTrash2 className="me-1" /> Hapus
            </button>
          </div>
        )}
      </div>

      {/* Banner */}
      {kegiatan.banner_url && (
        <div className="mb-4" style={{ borderRadius: '0.75rem', overflow: 'hidden', maxHeight: '350px' }}>
          <img src={kegiatan.banner_url} alt={kegiatan.nama_kegiatan} style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: '350px' }} />
        </div>
      )}

      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8 mb-4">
          {/* Title & Category */}
          <div className="mb-3">
            <span className="badge bg-primary me-2">
              {KATEGORI_ICONS[kegiatan.kategori]} {KATEGORI_LABELS[kegiatan.kategori]}
            </span>
            {kegiatan.tipe_biaya === 'berbayar' ? (
              <span className="badge bg-warning text-dark">{formatRupiah(kegiatan.biaya_per_orang)}</span>
            ) : (
              <span className="badge bg-success">Gratis</span>
            )}
            {!isUpcoming && <span className="badge bg-secondary ms-2">Selesai</span>}
          </div>

          <h2 className="fw-bold mb-3">{kegiatan.nama_kegiatan}</h2>

          {/* Info Grid */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiCalendar className="text-primary me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">{formatTanggal(kegiatan.tanggal_mulai)}</div>
                      <div className="text-muted small">
                        {formatJam(kegiatan.tanggal_mulai)}
                        {kegiatan.tanggal_selesai && ` - ${formatJam(kegiatan.tanggal_selesai)}`}
                        {' WIB'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiMapPin className="text-danger me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">{kegiatan.lokasi}</div>
                      {kegiatan.alamat_lengkap && <div className="text-muted small">{kegiatan.alamat_lengkap}</div>}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiUsers className="text-info me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">{registeredCount} Peserta Terdaftar</div>
                      {kegiatan.max_peserta && <div className="text-muted small">Maks. {kegiatan.max_peserta} peserta</div>}
                    </div>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="d-flex align-items-start">
                    <FiUserCheck className="text-success me-3 mt-1 flex-shrink-0" size={18} />
                    <div>
                      <div className="fw-bold">Penyelenggara</div>
                      <div className="text-muted small">{penyelenggara?.nama_lengkap || '-'}</div>
                    </div>
                  </div>
                </div>
                {kegiatan.target_rt_ids && kegiatan.target_rt_ids.length > 0 && (
                  <div className="col-12">
                    <div className="d-flex align-items-start">
                      <FiUsers className="text-warning me-3 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <div className="fw-bold">Khusus untuk RT</div>
                        <div className="mt-1">
                          {kegiatan.target_rt_ids.map((rtId: string) => (
                            <span key={rtId} className="badge bg-warning text-dark me-1">RT {rtMap[rtId] || '?'}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {(!kegiatan.target_rt_ids || kegiatan.target_rt_ids.length === 0) && (
                  <div className="col-sm-6">
                    <div className="d-flex align-items-start">
                      <FiUsers className="text-warning me-3 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <div className="fw-bold">Terbuka untuk</div>
                        <div className="text-muted small">Semua RT</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deskripsi */}
          {kegiatan.deskripsi && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0 fw-bold">Detail Kegiatan</h6>
              </div>
              <div className="card-body">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{kegiatan.deskripsi}</div>
              </div>
            </div>
          )}

          {/* Keamanan */}
          {kegiatan.catatan_keamanan && (
            <div className="card mb-4 border-danger">
              <div className="card-header bg-danger text-white">
                <h6 className="mb-0 fw-bold"><FiShield className="me-2" />Standar Keamanan & Keselamatan</h6>
              </div>
              <div className="card-body">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{kegiatan.catatan_keamanan}</div>
              </div>
            </div>
          )}

          {/* Biaya & Pembayaran */}
          {kegiatan.tipe_biaya === 'berbayar' && (
            <div className="card mb-4 border-warning">
              <div className="card-header bg-warning text-dark">
                <h6 className="mb-0 fw-bold"><FiDollarSign className="me-2" />Informasi Pembayaran</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-sm-6">
                    <p className="mb-1"><strong>Biaya Partisipasi:</strong></p>
                    <h4 className="text-primary">{formatRupiah(kegiatan.biaya_per_orang)}</h4>
                  </div>
                  <div className="col-sm-6">
                    {kegiatan.nomor_rekening && (
                      <>
                        <p className="mb-1"><strong>Transfer ke:</strong></p>
                        <p className="mb-0">{kegiatan.nama_bank} - {kegiatan.nomor_rekening}</p>
                        {kegiatan.nama_rekening && <p className="text-muted small">a.n. {kegiatan.nama_rekening}</p>}
                      </>
                    )}
                  </div>
                </div>
                {kegiatan.no_whatsapp_penyelenggara && (
                  <div className="mt-2">
                    <a href={formatWaLink(kegiatan.no_whatsapp_penyelenggara)} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm">
                      <FiPhone className="me-1" /> Konfirmasi Pembayaran via WA
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notulen (untuk rapat) */}
          {kegiatan.kategori === 'rapat' && (
            <div className="card mb-4">
              <div className="card-header">
                <h6 className="mb-0 fw-bold"><FiFile className="me-2" />Notulen Rapat</h6>
              </div>
              <div className="card-body">
                {kegiatan.notulen_url ? (
                  <div className="d-flex align-items-center gap-3">
                    <a href={kegiatan.notulen_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary">
                      <FiExternalLink className="me-1" /> Buka Notulen: {kegiatan.notulen_filename || 'File'}
                    </a>
                    {canManage && (
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => notulenInputRef.current?.click()} disabled={uploadingNotulen}>
                        {uploadingNotulen ? <FiLoader className="spin" /> : 'Ganti'}
                      </button>
                    )}
                  </div>
                ) : canManage ? (
                  <div>
                    <p className="text-muted small mb-2">Belum ada notulen. Upload file notulen rapat (PDF/Foto).</p>
                    <button className="btn btn-primary btn-sm" onClick={() => notulenInputRef.current?.click()} disabled={uploadingNotulen}>
                      {uploadingNotulen ? <><FiLoader className="spin me-1" />Mengupload...</> : <><FiUpload className="me-1" />Upload Notulen</>}
                    </button>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">Notulen belum tersedia</p>
                )}
                <input ref={notulenInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="d-none" onChange={handleNotulenUpload} />
              </div>
            </div>
          )}

          {/* Peserta */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><FiUsers className="me-2" />Peserta ({registeredCount})</h6>
            </div>
            <div className="card-body">
              {partisipasi.length === 0 ? (
                <p className="text-muted text-center py-3 mb-0">Belum ada peserta terdaftar</p>
              ) : (
                <div className="row g-2">
                  {partisipasi.filter(p => p.status === 'registered').map((p, i) => {
                    const pUser = p.user as { nama_lengkap: string; email: string } | undefined
                    return (
                      <div key={p.id} className="col-sm-6 col-md-4">
                        <div className="d-flex align-items-center p-2 border rounded">
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                            {(pUser?.nama_lengkap || '?')[0].toUpperCase()}
                          </div>
                          <div className="ms-2 text-truncate">
                            <div className="small fw-bold text-truncate">{pUser?.nama_lengkap || 'Peserta'}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* CTA Card */}
          <div className="card mb-4 border-primary" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-body">
              {/* Register/Cancel Button */}
              {isUpcoming && userData?.warga_id && (
                <button
                  className={`btn ${isRegistered ? 'btn-outline-danger' : 'btn-primary'} w-100 mb-3`}
                  onClick={handleRegister}
                  disabled={registering || (!isRegistered && isFull)}
                >
                  {registering ? (
                    <><FiLoader className="spin me-1" /> Memproses...</>
                  ) : isRegistered ? (
                    <><FiX className="me-1" /> Batalkan Partisipasi</>
                  ) : isFull ? (
                    'Peserta Penuh'
                  ) : (
                    <><FiCheck className="me-1" /> Daftar Berpartisipasi</>
                  )}
                </button>
              )}

              {!isUpcoming && (
                <div className="alert alert-secondary text-center mb-3">
                  Kegiatan ini sudah berlalu
                </div>
              )}

              {/* Add to Calendar */}
              <button className="btn btn-outline-primary w-100 mb-3" onClick={handleAddToCalendar}>
                <FiCalendar className="me-1" /> Tambahkan ke Kalender
              </button>

              {/* WA Contact */}
              {kegiatan.no_whatsapp_penyelenggara && (
                <a href={formatWaLink(kegiatan.no_whatsapp_penyelenggara)} target="_blank" rel="noopener noreferrer" className="btn btn-outline-success w-100 mb-3">
                  <FiPhone className="me-1" /> Hubungi Penyelenggara
                </a>
              )}

              {/* Quick Stats */}
              <div className="border-top pt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Peserta</span>
                  <span className="fw-bold">{registeredCount}{kegiatan.max_peserta ? ` / ${kegiatan.max_peserta}` : ''}</span>
                </div>
                {kegiatan.max_peserta && (
                  <div className="progress mb-3" style={{ height: '6px' }}>
                    <div className={`progress-bar ${registeredCount >= kegiatan.max_peserta ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${Math.min(100, (registeredCount / kegiatan.max_peserta) * 100)}%` }} />
                  </div>
                )}
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Biaya</span>
                  <span className="fw-bold">{kegiatan.tipe_biaya === 'berbayar' ? formatRupiah(kegiatan.biaya_per_orang) : 'Gratis'}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Kategori</span>
                  <span>{KATEGORI_ICONS[kegiatan.kategori]} {KATEGORI_LABELS[kegiatan.kategori]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}