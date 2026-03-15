'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { TipeSurat, KategoriSurat, KATEGORI_SURAT_LABELS, BULAN_ROMAWI } from '@/types'
import { FiArrowLeft, FiSave, FiLoader, FiTrash2 } from 'react-icons/fi'

const KATEGORI_OPTIONS = Object.entries(KATEGORI_SURAT_LABELS) as [KategoriSurat, string][]

export default function EditSuratPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userData, loading: userLoading } = useUser()
  const supabase = createClient()
  const id = params.id as string

  const [tipe, setTipe] = useState<TipeSurat>('keluar')
  const [kategori, setKategori] = useState<KategoriSurat | ''>('')
  const [nomorSurat, setNomorSurat] = useState('')
  const [perihal, setPerihal] = useState('')
  const [tanggalRilis, setTanggalRilis] = useState('')
  const [isiSurat, setIsiSurat] = useState('')
  const [pengirim, setPengirim] = useState('')
  const [lampiranUrl, setLampiranUrl] = useState<string | null>(null)
  const [lampiranFilename, setLampiranFilename] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [removeLampiran, setRemoveLampiran] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingNomor, setGeneratingNomor] = useState(false)

  const isRW = userData?.role && ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw'].includes(userData.role)

  useEffect(() => {
    if (id && user) fetchSurat()
  }, [id, user])

  const fetchSurat = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('surat')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setTipe(data.tipe)
      setKategori(data.kategori_surat || '')
      setNomorSurat(data.nomor_surat)
      setPerihal(data.perihal)
      setTanggalRilis(data.tanggal_rilis)
      setIsiSurat(data.isi_surat || '')
      setPengirim(data.pengirim || '')
      setLampiranUrl(data.lampiran_url)
      setLampiranFilename(data.lampiran_filename)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const regenerateNomorSurat = async (kat: KategoriSurat, tanggal: string) => {
    setGeneratingNomor(true)
    try {
      const date = new Date(tanggal)
      const year = date.getFullYear()

      const { count } = await supabase
        .from('surat')
        .select('*', { count: 'exact', head: true })
        .eq('tipe', 'keluar')
        .gte('tanggal_rilis', `${year}-01-01`)
        .lte('tanggal_rilis', `${year}-12-31`)
        .neq('id', id) // Exclude current surat from count

      const nomorUrut = String((count || 0) + 1).padStart(3, '0')
      const bulanRomawi = BULAN_ROMAWI[date.getMonth()]
      setNomorSurat(`${nomorUrut}/${kat}/RW.13/${bulanRomawi}/${year}`)
    } catch (err) {
      console.error('Error generating nomor:', err)
    } finally {
      setGeneratingNomor(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !nomorSurat.trim() || !perihal.trim()) return

    setSaving(true)
    try {
      let newLampiranUrl = lampiranUrl
      let newLampiranFilename = lampiranFilename

      if (removeLampiran || file) {
        if (lampiranUrl) {
          const match = lampiranUrl.match(/\/surat\/(.+)$/)
          if (match) await supabase.storage.from('surat').remove([match[1]])
        }

        if (file) {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/upload-surat', { method: 'POST', body: formData })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          newLampiranUrl = data.fileUrl
          newLampiranFilename = file.name
        } else {
          newLampiranUrl = null
          newLampiranFilename = null
        }
      }

      // Update via API (bypass RLS)
      const updateRes = await fetch('/api/surat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          tipe,
          nomor_surat: nomorSurat.trim(),
          perihal: perihal.trim(),
          isi_surat: isiSurat.trim() || null,
          tanggal_rilis: tanggalRilis,
          lampiran_url: newLampiranUrl,
          lampiran_filename: newLampiranFilename,
          kategori_surat: tipe === 'keluar' && kategori ? kategori : null,
          pengirim: tipe === 'masuk' ? pengirim.trim() || null : null,
        }),
      })
      const updateData = await updateRes.json()
      if (!updateRes.ok) throw new Error(updateData.error)
      router.push(`/surat/${id}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
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

  if (!isRW) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Anda tidak memiliki akses untuk mengedit surat.</p>
        <Link href="/surat" className="btn btn-primary">Kembali</Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="d-flex align-items-center mb-4 gap-2">
        <Link href={`/surat/${id}`} className="btn btn-outline-secondary btn-sm">
          <FiArrowLeft className="me-1" /> Kembali
        </Link>
        <h4 className="fw-bold mb-0">Edit Surat</h4>
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
                  onChange={(e) => {
                    const v = e.target.value as TipeSurat
                    setTipe(v)
                    if (v === 'masuk') setKategori('')
                  }}
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
                  <label className="form-label fw-bold">Kategori Surat</label>
                  <div className="d-flex gap-2">
                    <select
                      className="form-select"
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value as KategoriSurat)}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {KATEGORI_OPTIONS.map(([key, label]) => (
                        <option key={key} value={key}>{key} - {label}</option>
                      ))}
                    </select>
                    {kategori && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm flex-shrink-0"
                        onClick={() => regenerateNomorSurat(kategori as KategoriSurat, tanggalRilis)}
                        disabled={generatingNomor}
                        title="Re-generate nomor surat"
                      >
                        {generatingNomor ? <FiLoader className="spin" /> : 'Re-generate'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Nomor Surat */}
              <div className="col-md-6">
                <label className="form-label fw-bold">
                  Nomor Surat <span className="text-danger">*</span>
                  {generatingNomor && <FiLoader className="spin ms-2" size={14} />}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nomor surat"
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  required
                />
              </div>

              {/* Pengirim - hanya untuk surat masuk */}
              {tipe === 'masuk' && (
                <div className="col-md-12">
                  <label className="form-label fw-bold">Pengirim <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Asal pengirim surat"
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
                {lampiranUrl && !removeLampiran ? (
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge bg-light text-dark border">
                      {lampiranFilename || 'Lampiran.pdf'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setRemoveLampiran(true)}
                    >
                      <FiTrash2 size={14} className="me-1" /> Hapus
                    </button>
                  </div>
                ) : removeLampiran && !file ? (
                  <div className="mb-2">
                    <span className="text-muted small">Lampiran akan dihapus. </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={() => setRemoveLampiran(false)}
                    >
                      Batalkan
                    </button>
                  </div>
                ) : null}
                <input
                  type="file"
                  className="form-control"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null)
                    if (e.target.files?.[0]) setRemoveLampiran(false)
                  }}
                />
                <small className="text-muted">
                  {lampiranUrl && !removeLampiran ? 'Upload file baru untuk mengganti lampiran' : 'Maks. 10MB, format PDF atau Gambar (JPG, PNG). Gambar otomatis dikonversi ke PDF.'}
                </small>
              </div>
            </div>

            <hr />

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><FiLoader className="spin me-1" /> Menyimpan...</> : <><FiSave className="me-1" /> Simpan Perubahan</>}
              </button>
              <Link href={`/surat/${id}`} className="btn btn-outline-secondary">Batal</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
