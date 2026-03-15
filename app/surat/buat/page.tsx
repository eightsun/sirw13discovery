'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TipeSurat, KategoriSurat, KATEGORI_SURAT_LABELS, BULAN_ROMAWI } from '@/types'
import { createNotifikasiBulk, getWargaUserIds, getPengurusRWUserIds, getPengurusRTUserIds, dedupe } from '@/lib/notifikasi'
import { FiArrowLeft, FiSave, FiLoader } from 'react-icons/fi'

const KATEGORI_OPTIONS = Object.entries(KATEGORI_SURAT_LABELS) as [KategoriSurat, string][]

export default function BuatSuratPage() {
  const router = useRouter()
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()

  const [tipe, setTipe] = useState<TipeSurat>('keluar')
  const [kategori, setKategori] = useState<KategoriSurat | ''>('')
  const [nomorSurat, setNomorSurat] = useState('')
  const [nomorSuratEdited, setNomorSuratEdited] = useState(false)
  const [perihal, setPerihal] = useState('')
  const [tanggalRilis, setTanggalRilis] = useState(new Date().toISOString().split('T')[0])
  const [isiSurat, setIsiSurat] = useState('')
  const [pengirim, setPengirim] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [generatingNomor, setGeneratingNomor] = useState(false)

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'].includes(userData.role)

  // Auto-generate nomor surat saat kategori atau tanggal berubah
  useEffect(() => {
    if (tipe === 'keluar' && kategori && !nomorSuratEdited) {
      generateNomorSurat(kategori, tanggalRilis)
    }
  }, [kategori, tanggalRilis, tipe])

  const generateNomorSurat = async (kat: KategoriSurat, tanggal: string) => {
    setGeneratingNomor(true)
    try {
      const date = new Date(tanggal)
      const year = date.getFullYear()

      // Count surat keluar di tahun ini
      const { count } = await supabase
        .from('surat')
        .select('*', { count: 'exact', head: true })
        .eq('tipe', 'keluar')
        .gte('tanggal_rilis', `${year}-01-01`)
        .lte('tanggal_rilis', `${year}-12-31`)

      const nomorUrut = String((count || 0) + 1).padStart(3, '0')
      const bulanRomawi = BULAN_ROMAWI[date.getMonth()]
      const generated = `${nomorUrut}/${kat}/RW.13/${bulanRomawi}/${year}`
      setNomorSurat(generated)
    } catch (err) {
      console.error('Error generating nomor surat:', err)
    } finally {
      setGeneratingNomor(false)
    }
  }

  const handleKategoriChange = (value: string) => {
    setKategori(value as KategoriSurat)
    setNomorSuratEdited(false) // Reset agar auto-generate jalan lagi
  }

  const handleNomorSuratChange = (value: string) => {
    setNomorSurat(value)
    setNomorSuratEdited(true) // User mengedit manual
  }

  const handleTipeChange = (value: TipeSurat) => {
    setTipe(value)
    if (value === 'masuk') {
      setKategori('')
      setNomorSurat('')
      setNomorSuratEdited(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nomorSurat.trim() || !perihal.trim()) return
    if (tipe === 'keluar' && !kategori) {
      alert('Pilih kategori surat terlebih dahulu')
      return
    }

    setSaving(true)
    try {
      let lampiran_url: string | null = null
      let lampiran_filename: string | null = null

      // Upload file if selected
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload-surat', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        lampiran_url = data.fileUrl
        lampiran_filename = file.name
      }

      // Insert surat via API (bypass RLS)
      const insertRes = await fetch('/api/surat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe,
          nomor_surat: nomorSurat.trim(),
          perihal: perihal.trim(),
          isi_surat: isiSurat.trim() || null,
          tanggal_rilis: tanggalRilis,
          lampiran_url,
          lampiran_filename,
          kategori_surat: tipe === 'keluar' && kategori ? kategori : null,
          pengirim: tipe === 'masuk' ? pengirim.trim() || null : null,
        }),
      })
      const insertData = await insertRes.json()
      if (!insertRes.ok) throw new Error(insertData.error)
      const newSurat = { id: insertData.id }

      // Send notification to all warga for surat keluar
      if (tipe === 'keluar' && newSurat) {
        try {
          const wargaIds = await getWargaUserIds()
          const rwIds = await getPengurusRWUserIds()
          const { data: rtData } = await supabase.from('rt').select('id')
          let rtIds: string[] = []
          if (rtData) {
            const rtPromises = rtData.map((rt: { id: string }) => getPengurusRTUserIds(rt.id))
            const rtResults = await Promise.all(rtPromises)
            rtIds = rtResults.flat()
          }
          const allIds = dedupe(wargaIds, rwIds, rtIds).filter(uid => uid !== user.id)
          if (allIds.length > 0) {
            await createNotifikasiBulk(allIds, {
              judul: 'Surat Keluar Baru',
              pesan: `${perihal.trim()} (${nomorSurat.trim()})`,
              tipe: 'surat',
              link: `/surat/${newSurat.id}`,
            })
          }
        } catch (notifErr) {
          console.error('Notifikasi error (non-blocking):', notifErr)
        }
      }

      router.push(`/surat/${newSurat.id}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan surat')
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

  if (!isRW) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Anda tidak memiliki akses untuk membuat surat.</p>
        <Link href="/surat" className="btn btn-primary">Kembali</Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex align-items-center mb-4 gap-2">
        <Link href="/surat" className="btn btn-outline-secondary btn-sm">
          <FiArrowLeft className="me-1" /> Kembali
        </Link>
        <h4 className="fw-bold mb-0">Buat Surat Baru</h4>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Tipe Surat */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Tipe Surat <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  value={tipe}
                  onChange={(e) => handleTipeChange(e.target.value as TipeSurat)}
                >
                  <option value="keluar">Surat Keluar / Pengumuman</option>
                  <option value="masuk">Surat Masuk</option>
                </select>
              </div>

              {/* Tanggal Rilis */}
              <div className="col-md-6">
                <label className="form-label fw-bold">Tanggal Rilis <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={tanggalRilis}
                  onChange={(e) => setTanggalRilis(e.target.value)}
                  required
                />
              </div>

              {/* Kategori Surat - hanya untuk surat keluar */}
              {tipe === 'keluar' && (
                <div className="col-md-6">
                  <label className="form-label fw-bold">Kategori Surat <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={kategori}
                    onChange={(e) => handleKategoriChange(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {KATEGORI_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>{key} - {label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nomor Surat */}
              <div className={tipe === 'keluar' ? 'col-md-6' : 'col-md-6'}>
                <label className="form-label fw-bold">
                  Nomor Surat <span className="text-danger">*</span>
                  {generatingNomor && <FiLoader className="spin ms-2" size={14} />}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={tipe === 'keluar' ? 'Otomatis terisi saat pilih kategori' : 'Masukkan nomor surat'}
                  value={nomorSurat}
                  onChange={(e) => handleNomorSuratChange(e.target.value)}
                  required
                />
                {tipe === 'keluar' && nomorSuratEdited && (
                  <small className="text-warning">Nomor surat diubah manual. <button type="button" className="btn btn-link btn-sm p-0 text-primary" onClick={() => { setNomorSuratEdited(false); if (kategori) generateNomorSurat(kategori as KategoriSurat, tanggalRilis) }}>Reset ke otomatis</button></small>
                )}
                {tipe === 'keluar' && !nomorSuratEdited && !generatingNomor && nomorSurat && (
                  <small className="text-muted">Nomor surat di-generate otomatis. Bisa diubah manual.</small>
                )}
              </div>

              {/* Pengirim - hanya untuk surat masuk */}
              {tipe === 'masuk' && (
                <div className="col-md-12">
                  <label className="form-label fw-bold">Pengirim <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Asal pengirim surat (contoh: Kelurahan Banjarsari, PT. XYZ)"
                    value={pengirim}
                    onChange={(e) => setPengirim(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Perihal */}
              <div className="col-md-12">
                <label className="form-label fw-bold">Perihal <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Perihal surat"
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  required
                />
              </div>

              {/* Isi Surat */}
              <div className="col-12">
                <label className="form-label fw-bold">Isi Surat</label>
                <textarea
                  className="form-control"
                  rows={8}
                  placeholder="Isi surat (opsional)..."
                  value={isiSurat}
                  onChange={(e) => setIsiSurat(e.target.value)}
                />
                <small className="text-muted">Gunakan **teks** untuk cetak tebal</small>
              </div>

              {/* Lampiran */}
              <div className="col-12">
                <label className="form-label fw-bold">Lampiran (PDF / Gambar)</label>
                <input
                  type="file"
                  className="form-control"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <small className="text-muted">Maks. 10MB, format PDF atau Gambar (JPG, PNG). Gambar otomatis dikonversi ke PDF.</small>
              </div>
            </div>

            <hr />

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><FiLoader className="spin me-1" /> Menyimpan...</> : <><FiSave className="me-1" /> Simpan Surat</>}
              </button>
              <Link href="/surat" className="btn btn-outline-secondary">Batal</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
