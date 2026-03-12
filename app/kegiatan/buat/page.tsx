'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { KategoriKegiatan } from '@/types'
import { createNotifikasiBulk, getPengurusRWUserIds, getPengurusRTUserIds, getWargaUserIds, dedupe } from '@/lib/notifikasi'
import {
  FiArrowLeft, FiSave, FiImage, FiCalendar, FiMapPin,
  FiDollarSign, FiShield, FiUsers, FiPhone, FiLoader, FiLink
} from 'react-icons/fi'

const KATEGORI_OPTIONS: { value: KategoriKegiatan; label: string; icon: string }[] = [
  { value: 'keagamaan', label: 'Keagamaan', icon: '🕌' },
  { value: 'olahraga', label: 'Olahraga', icon: '⚽' },
  { value: 'sosial', label: 'Sosial', icon: '🤝' },
  { value: 'rapat', label: 'Rapat', icon: '📋' },
  { value: 'gotong_royong', label: 'Gotong Royong', icon: '🧹' },
  { value: 'pendidikan', label: 'Pendidikan', icon: '📚' },
  { value: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
  { value: 'kesenian', label: 'Kesenian', icon: '🎨' },
  { value: 'lingkungan', label: 'Lingkungan', icon: '🌿' },
  { value: 'lainnya', label: 'Lainnya', icon: '📌' },
]

export default function BuatKegiatanPage() {
  const router = useRouter()
  const { userData, user, loading: userLoading } = useUser()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [rtList, setRtList] = useState<{ id: string; nomor_rt: string }[]>([])
  const [targetRtMode, setTargetRtMode] = useState<'semua' | 'tertentu'>('semua')
  const [selectedRtIds, setSelectedRtIds] = useState<string[]>([])

  // Fetch RT list
  useEffect(() => {
    supabase.from('rt').select('id, nomor_rt').order('nomor_rt').then(({ data }: { data: { id: string; nomor_rt: string }[] | null }) => {
      if (data) setRtList(data)
    })
  }, [])

  // Form state
  const [form, setForm] = useState({
    nama_kegiatan: '',
    deskripsi: '',
    kategori: 'sosial' as KategoriKegiatan,
    tanggal_mulai: '',
    jam_mulai: '',
    jam_selesai: '',
    lokasi: '',
    alamat_lengkap: '',
    tipe_biaya: 'gratis' as 'gratis' | 'berbayar',
    biaya_per_orang: '',
    nama_rekening: '',
    nomor_rekening: '',
    nama_bank: '',
    no_whatsapp_penyelenggara: '',
    max_peserta: '',
    catatan_keamanan: '',
    link_online: '',
  })

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format banner harus JPG, PNG, atau WEBP')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran banner maksimal 10MB')
      return
    }

    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setError('')
  }

  const uploadBanner = async (): Promise<string | null> => {
    if (!bannerFile) return null
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', bannerFile)
      formData.append('type', 'banner')

      const res = await fetch('/api/upload-kegiatan', { method: 'POST', body: formData })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Upload gagal')
      return data.fileUrl
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload banner gagal'
      setError(message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!form.nama_kegiatan.trim()) { setError('Nama kegiatan wajib diisi'); return }
    if (!form.tanggal_mulai) { setError('Tanggal kegiatan wajib diisi'); return }
    if (!form.jam_mulai) { setError('Jam mulai wajib diisi'); return }
    if (!form.lokasi.trim()) { setError('Lokasi wajib diisi'); return }
    if (!form.catatan_keamanan.trim()) { setError('Catatan keamanan & keselamatan wajib diisi'); return }
    if (targetRtMode === 'tertentu' && selectedRtIds.length === 0) { setError('Pilih minimal 1 RT untuk kegiatan ini'); return }
    if (form.tipe_biaya === 'berbayar') {
      if (!form.biaya_per_orang || Number(form.biaya_per_orang) <= 0) { setError('Biaya per orang wajib diisi untuk kegiatan berbayar'); return }
      if (!form.nomor_rekening.trim()) { setError('Nomor rekening wajib diisi untuk kegiatan berbayar'); return }
    }
    if (!user) { setError('Anda harus login'); return }

    setSaving(true)
    try {
      // Upload banner if selected
      let bannerUrl = null
      if (bannerFile) {
        bannerUrl = await uploadBanner()
        if (bannerFile && !bannerUrl) {
          setSaving(false)
          return // Upload error already set
        }
      }

      // Build datetime
      const tanggalMulai = new Date(`${form.tanggal_mulai}T${form.jam_mulai}:00`)
      let tanggalSelesai = null
      if (form.jam_selesai) {
        tanggalSelesai = new Date(`${form.tanggal_mulai}T${form.jam_selesai}:00`)
      }

      // Get user WA from warga if not provided
      let noWa = form.no_whatsapp_penyelenggara
      if (!noWa && userData?.warga_id) {
        const { data: wargaData } = await supabase
          .from('warga')
          .select('no_hp')
          .eq('id', userData.warga_id)
          .single()
        noWa = wargaData?.no_hp || ''
      }

      const insertData = {
        nama_kegiatan: form.nama_kegiatan.trim(),
        deskripsi: form.deskripsi.trim() || null,
        kategori: form.kategori,
        status: 'published',
        tanggal_mulai: tanggalMulai.toISOString(),
        tanggal_selesai: tanggalSelesai?.toISOString() || null,
        lokasi: form.lokasi.trim(),
        alamat_lengkap: form.alamat_lengkap.trim() || null,
        tipe_biaya: form.tipe_biaya,
        biaya_per_orang: form.tipe_biaya === 'berbayar' ? Number(form.biaya_per_orang) : 0,
        nama_rekening: form.tipe_biaya === 'berbayar' ? form.nama_rekening.trim() : null,
        nomor_rekening: form.tipe_biaya === 'berbayar' ? form.nomor_rekening.trim() : null,
        nama_bank: form.tipe_biaya === 'berbayar' ? form.nama_bank.trim() : null,
        no_whatsapp_penyelenggara: noWa || null,
        banner_url: bannerUrl,
        link_online: form.link_online.trim() || null,
        catatan_keamanan: form.catatan_keamanan.trim(),
        max_peserta: form.max_peserta ? Number(form.max_peserta) : null,
        target_rt_ids: targetRtMode === 'tertentu' ? selectedRtIds : null,
        created_by: user.id,
      }

      const { data, error: insertError } = await supabase
        .from('kegiatan')
        .insert(insertData)
        .select('id')
        .single()

      if (insertError) throw insertError

      // Kirim notifikasi
      try {
        const targetRtIds = targetRtMode === 'tertentu' ? selectedRtIds : null

        // Notify pengurus RW (selalu)
        const rwIds = await getPengurusRWUserIds()

        // Notify pengurus RT (sesuai target atau semua)
        let rtUserIds: string[] = []
        if (targetRtIds && targetRtIds.length > 0) {
          const promises = targetRtIds.map(rtId => getPengurusRTUserIds(rtId))
          const results = await Promise.all(promises)
          rtUserIds = results.flat()
        } else {
          // Semua RT - fetch all RT pengurus
          const { data: allRts } = await supabase.from('rt').select('id')
          if (allRts) {
            const promises = allRts.map((rt: { id: string }) => getPengurusRTUserIds(rt.id))
            const results = await Promise.all(promises)
            rtUserIds = results.flat()
          }
        }

        // Notify warga sesuai target RT
        const wargaIds = await getWargaUserIds(targetRtIds)

        // Gabungkan dan dedupe, kecuali user yang buat
        const allIds = dedupe(rwIds, rtUserIds, wargaIds)
          .filter(id => id !== user.id)

        if (allIds.length > 0) {
          await createNotifikasiBulk(allIds, {
            judul: 'Kegiatan Baru',
            pesan: `Kegiatan "${form.nama_kegiatan.trim()}" telah dibuat. Tanggal: ${form.tanggal_mulai}, Lokasi: ${form.lokasi.trim()}`,
            tipe: 'kegiatan',
            link: `/kegiatan/${data.id}`,
          })
        }
      } catch (notifErr) {
        console.error('Error sending kegiatan notifications:', notifErr)
      }

      router.push(`/kegiatan/${data.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan kegiatan'
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
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <Link href="/kegiatan" className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Buat Kegiatan Baru</h1>
          <small className="text-muted">Semua warga bisa menyelenggarakan kegiatan</small>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      <div className="row">
        <div className="col-lg-8">
          {/* Info Dasar */}
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0 fw-bold"><FiCalendar className="me-2" />Informasi Kegiatan</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Nama Kegiatan <span className="text-danger">*</span></label>
                <input type="text" className="form-control" placeholder="Contoh: Pengajian Rutin Bulanan" value={form.nama_kegiatan} onChange={(e) => updateForm('nama_kegiatan', e.target.value)} maxLength={255} />
              </div>

              <div className="mb-3">
                <label className="form-label">Kategori <span className="text-danger">*</span></label>
                <select className="form-select" value={form.kategori} onChange={(e) => updateForm('kategori', e.target.value)}>
                  {KATEGORI_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Deskripsi / Detail Kegiatan</label>
                <textarea className="form-control" rows={5} placeholder="Jelaskan detail kegiatan, agenda, dan informasi penting lainnya...&#10;&#10;Tips formatting:&#10;**teks** untuk bold&#10;Link URL otomatis terdeteksi" value={form.deskripsi} onChange={(e) => updateForm('deskripsi', e.target.value)} />
                <small className="text-muted">Gunakan **teks** untuk <strong>bold</strong>. Link URL otomatis menjadi klik-able.</small>
              </div>

              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label">Tanggal <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" value={form.tanggal_mulai} onChange={(e) => updateForm('tanggal_mulai', e.target.value)} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Jam Mulai <span className="text-danger">*</span></label>
                  <input type="time" className="form-control" value={form.jam_mulai} onChange={(e) => updateForm('jam_mulai', e.target.value)} />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label">Jam Selesai</label>
                  <input type="time" className="form-control" value={form.jam_selesai} onChange={(e) => updateForm('jam_selesai', e.target.value)} />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Maksimal Peserta</label>
                <input type="number" className="form-control" placeholder="Kosongkan jika tidak terbatas" value={form.max_peserta} onChange={(e) => updateForm('max_peserta', e.target.value)} min="1" />
              </div>

              <div className="mb-3">
                <label className="form-label">Target Peserta RT <span className="text-danger">*</span></label>
                <div className="mb-2">
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="target_rt" id="rt_semua" checked={targetRtMode === 'semua'} onChange={() => { setTargetRtMode('semua'); setSelectedRtIds([]) }} />
                    <label className="form-check-label" htmlFor="rt_semua">Semua RT (terbuka untuk seluruh warga)</label>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="target_rt" id="rt_tertentu" checked={targetRtMode === 'tertentu'} onChange={() => setTargetRtMode('tertentu')} />
                    <label className="form-check-label" htmlFor="rt_tertentu">RT Tertentu (hanya warga RT terpilih)</label>
                  </div>
                </div>
                {targetRtMode === 'tertentu' && (
                  <div className="border rounded p-3 mt-2 bg-light">
                    <small className="text-muted d-block mb-2">Pilih RT yang boleh berpartisipasi:</small>
                    <div className="row g-2">
                      {rtList.map(rt => (
                        <div key={rt.id} className="col-4 col-md-3">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`rt_${rt.id}`}
                              checked={selectedRtIds.includes(rt.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRtIds(prev => [...prev, rt.id])
                                } else {
                                  setSelectedRtIds(prev => prev.filter(id => id !== rt.id))
                                }
                              }}
                            />
                            <label className="form-check-label" htmlFor={`rt_${rt.id}`}>RT {rt.nomor_rt}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {targetRtMode === 'tertentu' && selectedRtIds.length === 0 && (
                      <small className="text-danger mt-2 d-block">Pilih minimal 1 RT</small>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lokasi */}
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0 fw-bold"><FiMapPin className="me-2" />Lokasi</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Nama Lokasi <span className="text-danger">*</span></label>
                <input type="text" className="form-control" placeholder="Contoh: Masjid Al-Ikhlas Permata Discovery" value={form.lokasi} onChange={(e) => updateForm('lokasi', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Alamat Lengkap</label>
                <textarea className="form-control" rows={2} placeholder="Alamat detail lokasi kegiatan" value={form.alamat_lengkap} onChange={(e) => updateForm('alamat_lengkap', e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Link Online Meeting</label>
                <input type="url" className="form-control" placeholder="https://meet.google.com/... atau https://zoom.us/... atau link YouTube" value={form.link_online} onChange={(e) => updateForm('link_online', e.target.value)} />
                <small className="text-muted">Opsional. Google Meet, Zoom, YouTube, atau link lainnya untuk kegiatan daring/hybrid</small>
              </div>
            </div>
          </div>

          {/* Biaya */}
          <div className="card mb-4">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0 fw-bold"><FiDollarSign className="me-2" />Biaya Partisipasi</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="tipe_biaya" id="gratis" checked={form.tipe_biaya === 'gratis'} onChange={() => updateForm('tipe_biaya', 'gratis')} />
                  <label className="form-check-label" htmlFor="gratis">Gratis</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" name="tipe_biaya" id="berbayar" checked={form.tipe_biaya === 'berbayar'} onChange={() => updateForm('tipe_biaya', 'berbayar')} />
                  <label className="form-check-label" htmlFor="berbayar">Berbayar</label>
                </div>
              </div>

              {form.tipe_biaya === 'berbayar' && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Biaya per Orang <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">Rp</span>
                      <input type="number" className="form-control" placeholder="50000" value={form.biaya_per_orang} onChange={(e) => updateForm('biaya_per_orang', e.target.value)} min="0" />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Nama Bank</label>
                      <input type="text" className="form-control" placeholder="BCA, BNI, dll" value={form.nama_bank} onChange={(e) => updateForm('nama_bank', e.target.value)} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">No. Rekening <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" placeholder="1234567890" value={form.nomor_rekening} onChange={(e) => updateForm('nomor_rekening', e.target.value)} />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Atas Nama</label>
                      <input type="text" className="form-control" placeholder="Nama pemilik rekening" value={form.nama_rekening} onChange={(e) => updateForm('nama_rekening', e.target.value)} />
                    </div>
                  </div>
                  <div className="alert alert-info small mb-0">
                    <FiPhone className="me-2" />
                    Nomor WA penyelenggara akan dicantumkan otomatis untuk konfirmasi pembayaran.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Keamanan */}
          <div className="card mb-4">
            <div className="card-header bg-danger text-white">
              <h6 className="mb-0 fw-bold"><FiShield className="me-2" />Standar Keamanan & Keselamatan</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Catatan Keamanan & Keselamatan <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={4} placeholder="Contoh:&#10;- Peserta wajib menggunakan sepatu olahraga&#10;- Membawa air minum sendiri&#10;- Anak di bawah 12 tahun wajib didampingi orang tua&#10;- Lokasi tidak menyediakan P3K, harap bawa obat pribadi" value={form.catatan_keamanan} onChange={(e) => updateForm('catatan_keamanan', e.target.value)} />
                <small className="text-muted">Penyelenggara wajib mengisi informasi keamanan dan keselamatan peserta</small>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Banner */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold"><FiImage className="me-2" />Banner Kegiatan</h6>
            </div>
            <div className="card-body">
              {bannerPreview ? (
                <div className="position-relative mb-3">
                  <img src={bannerPreview} alt="Banner" className="img-fluid rounded" style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }} />
                  <button className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" onClick={() => { setBannerFile(null); setBannerPreview(null) }}>×</button>
                </div>
              ) : (
                <div className="border rounded p-4 text-center text-muted mb-3" style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => fileInputRef.current?.click()}>
                  <FiImage size={32} className="mb-2" />
                  <p className="small mb-0">Klik untuk upload banner</p>
                  <p className="small mb-0 text-muted">JPG, PNG, WEBP. Max 10MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="d-none" onChange={handleBannerSelect} />
              {!bannerPreview && (
                <button className="btn btn-outline-primary btn-sm w-100" onClick={() => fileInputRef.current?.click()}>
                  <FiImage className="me-1" /> Pilih Banner
                </button>
              )}
            </div>
          </div>

          {/* Kontak */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0 fw-bold"><FiPhone className="me-2" />Kontak Penyelenggara</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">No. WhatsApp</label>
                <input type="text" className="form-control" placeholder="08xx (otomatis dari profil jika kosong)" value={form.no_whatsapp_penyelenggara} onChange={(e) => updateForm('no_whatsapp_penyelenggara', e.target.value)} />
                <small className="text-muted">Akan ditampilkan di halaman detail kegiatan</small>
              </div>
              <div className="mb-0">
                <label className="form-label">Penyelenggara</label>
                <input type="text" className="form-control" value={userData?.nama_lengkap || '-'} disabled />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-body">
              <button className="btn btn-primary w-100 mb-2" onClick={handleSubmit} disabled={saving || uploading}>
                {saving || uploading ? (
                  <><FiLoader className="spin me-2" />{ uploading ? 'Mengupload...' : 'Menyimpan...'}</>
                ) : (
                  <><FiSave className="me-2" />Publikasikan Kegiatan</>
                )}
              </button>
              <Link href="/kegiatan" className="btn btn-outline-secondary w-100">Batal</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}