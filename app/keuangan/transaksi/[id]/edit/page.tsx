'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { KategoriPengeluaran, KasTransaksiFormInput } from '@/types'
import {
  FiSave,
  FiArrowLeft,
  FiUpload,
  FiX
} from 'react-icons/fi'

export default function EditTransaksiPage() {
  const params = useParams()
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  const [buktiFile, setBuktiFile] = useState<File | null>(null)
  const [existingBuktiUrl, setExistingBuktiUrl] = useState<string | null>(null)
  const [removeBukti, setRemoveBukti] = useState(false)

  const isKetuaRW = userData?.role === 'ketua_rw'

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<KasTransaksiFormInput>()

  const watchedTipe = watch('tipe')

  useEffect(() => {
    fetchData()
  }, [params.id])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch transaksi and kategori in parallel
      const [transaksiRes, kategoriRes] = await Promise.all([
        supabase
          .from('kas_transaksi')
          .select('*')
          .eq('id', params.id)
          .single(),
        supabase
          .from('kategori_pengeluaran')
          .select('*')
          .eq('is_active', true)
      ])

      if (transaksiRes.error) throw transaksiRes.error

      const t = transaksiRes.data
      reset({
        jenis_kas: t.jenis_kas,
        wilayah: t.wilayah,
        tipe: t.tipe,
        tanggal: t.tanggal,
        kategori_id: t.kategori_id || undefined,
        jumlah: t.jumlah,
        keterangan: t.keterangan || '',
      })

      if (t.bukti_url) {
        setExistingBuktiUrl(t.bukti_url)
      }

      if (kategoriRes.data) {
        const sorted = kategoriRes.data.sort((a: KategoriPengeluaran, b: KategoriPengeluaran) =>
          parseInt(a.kode) - parseInt(b.kode)
        )
        setKategoriList(sorted)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Gagal memuat data transaksi')
      router.push('/keuangan/transaksi')
    } finally {
      setLoading(false)
    }
  }

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const maxDim = 1200
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim
            width = maxDim
          } else {
            width = (width / height) * maxDim
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      let uploadData: Blob | File = file

      if (file.type.startsWith('image/')) {
        uploadData = await compressImage(file)
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error } = await supabase.storage
        .from('pengajuan')
        .upload(fileName, uploadData, { cacheControl: '3600', upsert: false })

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      return fileName
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const onSubmit = async (data: KasTransaksiFormInput) => {
    try {
      setSubmitting(true)

      let buktiUrl: string | null | undefined = undefined

      // Handle file removal
      if (removeBukti && existingBuktiUrl) {
        const path = existingBuktiUrl.startsWith('http')
          ? existingBuktiUrl.match(/\/pengajuan\/([^?]+)/)?.[1]
          : existingBuktiUrl.split('?')[0]

        if (path) {
          await supabase.storage.from('pengajuan').remove([path])
        }
        buktiUrl = null
      }

      // Handle new file upload
      if (buktiFile) {
        // Delete old file first
        if (existingBuktiUrl) {
          const path = existingBuktiUrl.startsWith('http')
            ? existingBuktiUrl.match(/\/pengajuan\/([^?]+)/)?.[1]
            : existingBuktiUrl.split('?')[0]

          if (path) {
            await supabase.storage.from('pengajuan').remove([path])
          }
        }

        buktiUrl = await uploadFile(buktiFile, 'transaksi')
      }

      const updateData: Record<string, unknown> = {
        jenis_kas: data.jenis_kas,
        wilayah: data.wilayah,
        tipe: data.tipe,
        tanggal: data.tanggal,
        kategori_id: data.kategori_id || null,
        jumlah: Number(data.jumlah),
        keterangan: data.keterangan || null,
      }

      if (buktiUrl !== undefined) {
        updateData.bukti_url = buktiUrl
      }

      const { error } = await supabase
        .from('kas_transaksi')
        .update(updateData)
        .eq('id', params.id)

      if (error) throw error

      router.push(`/keuangan/transaksi/${params.id}`)
    } catch (error) {
      console.error('Error updating transaksi:', error)
      alert('Gagal mengupdate transaksi. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
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

  if (!isKetuaRW) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Anda tidak memiliki akses untuk mengedit transaksi</p>
        <Link href="/keuangan/transaksi" className="btn btn-primary">
          Kembali ke Daftar Transaksi
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href={`/keuangan/transaksi/${params.id}`} className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Edit Transaksi</h1>
          <p className="text-muted mb-0">
            Ubah data transaksi kas
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="row">
          <div className="col-lg-8">
            {/* Informasi Transaksi */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Informasi Transaksi</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Jenis Kas <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      {...register('jenis_kas', { required: true })}
                    >
                      <option value="rw">Kas RW</option>
                      <option value="rt">Kas RT</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Wilayah <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      {...register('wilayah', { required: true })}
                    >
                      <option value="Timur">Discovery Timur</option>
                      <option value="Barat">Discovery Barat</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Tipe Transaksi <span className="text-danger">*</span></label>
                    <select
                      className={`form-select ${watchedTipe === 'pemasukan' ? 'border-success' : 'border-danger'}`}
                      {...register('tipe', { required: true })}
                    >
                      <option value="pemasukan">Pemasukan (+)</option>
                      <option value="pengeluaran">Pengeluaran (-)</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tanggal Transaksi <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className={`form-control ${errors.tanggal ? 'is-invalid' : ''}`}
                      {...register('tanggal', { required: 'Tanggal wajib diisi' })}
                    />
                    {errors.tanggal && <div className="invalid-feedback">{errors.tanggal.message}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Jumlah <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">Rp</span>
                      <input
                        type="number"
                        className={`form-control ${errors.jumlah ? 'is-invalid' : ''}`}
                        placeholder="0"
                        {...register('jumlah', {
                          required: 'Jumlah wajib diisi',
                          min: { value: 1, message: 'Jumlah minimal Rp 1' }
                        })}
                      />
                    </div>
                    {errors.jumlah && <div className="text-danger small mt-1">{errors.jumlah.message}</div>}
                  </div>
                  {watchedTipe === 'pengeluaran' && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Kategori Pengeluaran</label>
                      <select
                        className="form-select"
                        {...register('kategori_id', { valueAsNumber: true })}
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {kategoriList.map((k) => (
                          <option key={k.id} value={k.id}>{k.kode}. {k.nama}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-12 mb-3">
                    <label className="form-label">Keterangan <span className="text-danger">*</span></label>
                    <textarea
                      className={`form-control ${errors.keterangan ? 'is-invalid' : ''}`}
                      rows={3}
                      placeholder="Jelaskan detail transaksi..."
                      {...register('keterangan', { required: 'Keterangan wajib diisi' })}
                    />
                    {errors.keterangan && <div className="invalid-feedback">{errors.keterangan.message}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Bukti */}
            <div className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0 fw-bold">Bukti Transaksi (Opsional)</h6>
              </div>
              <div className="card-body">
                {existingBuktiUrl && !removeBukti && !buktiFile && (
                  <div className="mb-3 p-2 bg-light rounded d-flex align-items-center">
                    <span className="flex-grow-1 small">Bukti transaksi sudah ada</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={() => setRemoveBukti(true)}
                    >
                      <FiX className="me-1" /> Hapus
                    </button>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">
                    <FiUpload className="me-2" />
                    {existingBuktiUrl ? 'Ganti Bukti/Kwitansi' : 'Upload Bukti/Kwitansi'}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      setBuktiFile(e.target.files?.[0] || null)
                      setRemoveBukti(false)
                    }}
                  />
                  <small className="text-muted">Format: JPG, PNG, atau PDF (maks. 5MB)</small>
                  {buktiFile && (
                    <div className="mt-2 p-2 bg-light rounded small d-flex align-items-center">
                      <span className="flex-grow-1">{buktiFile.name}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => setBuktiFile(null)}
                      >
                        <FiX />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Submit */}
          <div className="col-lg-4">
            <div className="card position-sticky" style={{ top: '1rem' }}>
              <div className="card-header bg-secondary text-white">
                <h6 className="mb-0 fw-bold">Simpan Perubahan</h6>
              </div>
              <div className="card-body">
                <div className={`alert ${watchedTipe === 'pemasukan' ? 'alert-success' : 'alert-danger'} small mb-3`}>
                  {watchedTipe === 'pemasukan'
                    ? 'Transaksi pemasukan (+)'
                    : 'Transaksi pengeluaran (-)'
                  }
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <FiSave className="me-2" />
                      Simpan Perubahan
                    </>
                  )}
                </button>
                <Link href={`/keuangan/transaksi/${params.id}`} className="btn btn-outline-secondary w-100">
                  Batal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
