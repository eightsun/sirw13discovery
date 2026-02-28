'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { formatRupiah } from '@/utils/helpers'
import { KategoriPengeluaran, KasTransaksiFormInput } from '@/types'
import { 
  FiSave, 
  FiArrowLeft,
  FiUpload,
  FiX
} from 'react-icons/fi'

export default function TambahTransaksiPage() {
  const router = useRouter()
  const { userData } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [kategoriList, setKategoriList] = useState<KategoriPengeluaran[]>([])
  const [buktiFile, setBuktiFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<KasTransaksiFormInput>({
    defaultValues: {
      jenis_kas: 'rw',
      wilayah: 'Timur',
      tipe: 'pemasukan',
      tanggal: new Date().toISOString().split('T')[0],
    }
  })

  const watchedTipe = watch('tipe')

  // Fetch kategori
  useEffect(() => {
    const fetchKategori = async () => {
      const { data } = await supabase
        .from('kategori_pengeluaran')
        .select('*')
        .eq('is_active', true)
      
      if (data) {
        const sorted = data.sort((a: KategoriPengeluaran, b: KategoriPengeluaran) => 
          parseInt(a.kode) - parseInt(b.kode)
        )
        setKategoriList(sorted)
      }
    }
    fetchKategori()
  }, [])

  // Compress image
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

  // Upload file
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

      // Upload bukti jika ada
      let buktiUrl: string | null = null
      if (buktiFile) {
        buktiUrl = await uploadFile(buktiFile, 'transaksi')
      }

      const transaksiData = {
        jenis_kas: data.jenis_kas,
        wilayah: data.wilayah,
        tipe: data.tipe,
        sumber: 'manual',
        tanggal: data.tanggal,
        kategori_id: data.kategori_id || null,
        jumlah: Number(data.jumlah),
        keterangan: data.keterangan || null,
        bukti_url: buktiUrl,
        created_by: userData?.id
      }

      const { error } = await supabase
        .from('kas_transaksi')
        .insert(transaksiData)

      if (error) throw error

      router.push('/keuangan/transaksi')
    } catch (error) {
      console.error('Error creating transaksi:', error)
      alert('Gagal menyimpan transaksi. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link href="/keuangan/transaksi" className="btn btn-sm btn-outline-secondary mb-2">
            <FiArrowLeft className="me-1" /> Kembali
          </Link>
          <h1 className="page-title mb-1">Tambah Transaksi Manual</h1>
          <p className="text-muted mb-0">
            Catat pemasukan atau pengeluaran kas secara manual
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
                <div className="mb-3">
                  <label className="form-label">
                    <FiUpload className="me-2" />
                    Upload Bukti/Kwitansi
                  </label>
                  <input 
                    type="file" 
                    className="form-control"
                    accept="image/*,.pdf"
                    onChange={(e) => setBuktiFile(e.target.files?.[0] || null)}
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
                <h6 className="mb-0 fw-bold">Simpan Transaksi</h6>
              </div>
              <div className="card-body">
                <div className={`alert ${watchedTipe === 'pemasukan' ? 'alert-success' : 'alert-danger'} small mb-3`}>
                  {watchedTipe === 'pemasukan' 
                    ? '💰 Transaksi ini akan menambah saldo kas'
                    : '💸 Transaksi ini akan mengurangi saldo kas'
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
                      Simpan Transaksi
                    </>
                  )}
                </button>
                <Link href="/keuangan/transaksi" className="btn btn-outline-secondary w-100">
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