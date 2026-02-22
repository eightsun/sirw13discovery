'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { WargaFormInput, KendaraanFormInput, UsahaFormInput, RT, Jalan, Warga, Kendaraan, Usaha } from '@/types'
import { validateNIK, validateNoKK, validatePhone, MINAT_OLAHRAGA_OPTIONS } from '@/utils/helpers'
import { 
  FiSave, FiX, FiUser, FiMapPin, FiPhone, FiHome, FiFileText, 
  FiUsers, FiAlertCircle, FiPlus, FiTrash2, FiTruck, FiBriefcase
} from 'react-icons/fi'

// Type untuk dropdown kepala keluarga
interface KepalaKeluargaOption {
  id: string
  nama_lengkap: string
  nomor_rumah: string
  jalan?: { nama_jalan: string } | null
}

interface WargaFormProps {
  mode: 'create' | 'edit'
  wargaId?: string
  initialData?: Partial<Warga>
  isOnboarding?: boolean
  defaultEmail?: string
}

// Helper untuk localStorage
const DRAFT_KEY = 'sirw13-warga-draft'

const saveDraft = (data: any, kendaraan: any[], usaha: any[]) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, kendaraan, usaha, timestamp: Date.now() }))
  } catch (e) {
    console.error('Error saving draft:', e)
  }
}

const loadDraft = () => {
  try {
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      const parsed = JSON.parse(draft)
      // Hanya gunakan draft yang kurang dari 24 jam
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Error loading draft:', e)
  }
  return null
}

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch (e) {
    console.error('Error clearing draft:', e)
  }
}

export default function WargaForm({ mode, wargaId, initialData, isOnboarding = false, defaultEmail }: WargaFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rtList, setRtList] = useState<RT[]>([])
  const [jalanList, setJalanList] = useState<Jalan[]>([])
  const [kepalaKeluargaList, setKepalaKeluargaList] = useState<KepalaKeluargaOption[]>([])
  const [draftLoaded, setDraftLoaded] = useState(false)
  
  // Kendaraan state
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([])
  const [newKendaraan, setNewKendaraan] = useState<KendaraanFormInput>({
    jenis_kendaraan: 'motor',
    nomor_polisi: '',
    merek: '',
    tipe: '',
    tahun_pembuatan: undefined,
    warna: ''
  })
  
  // Usaha state
  const [usahaList, setUsahaList] = useState<Usaha[]>([])
  const [newUsaha, setNewUsaha] = useState<UsahaFormInput>({
    nama_usaha: '',
    deskripsi_usaha: '',
    alamat_usaha: '',
    no_whatsapp_usaha: '',
    link_instagram: '',
    link_tiktok: '',
    link_website: '',
    link_twitter: ''
  })

  // Load draft on mount (for create mode, including tambah anggota)
  const draft = mode === 'create' ? loadDraft() : null
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<WargaFormInput>({
    defaultValues: {
      jenis_kelamin: 'L',
      agama: 'islam',
      status_pernikahan: 'belum_kawin',
      status_kependudukan: 'penduduk_tetap',
      status_rumah: 'milik_sendiri',
      tanggal_mulai_tinggal: '',
      alamat_ktp_sama: true,
      status_ktp: 'ada_aktif',
      status_kk: 'sesuai_domisili',
      status_surat_domisili: 'belum_ada',
      status_pindah: 'tidak_pindah',
      hubungan_keluarga: 'kepala_keluarga',
      perumahan: 'Permata Discovery',
      kelurahan: 'Banjarsari',
      kecamatan: 'Manyar',
      kota_kabupaten: 'Kabupaten Gresik',
      kode_pos: '61151',
      minat_olahraga: [],
      email: defaultEmail || '',
      ...initialData,
      // Load from draft if available, but don't override with empty values
      ...(draft?.data ? Object.fromEntries(
        Object.entries(draft.data).filter(([_, value]) => 
          value !== '' && value !== null && value !== undefined
        )
      ) : {}),
    },
  })

  // Load kendaraan & usaha from draft
  useEffect(() => {
    if (mode === 'create' && draft && !draftLoaded) {
      if (draft.kendaraan?.length > 0) {
        setKendaraanList(draft.kendaraan)
      }
      if (draft.usaha?.length > 0) {
        setUsahaList(draft.usaha)
      }
      setDraftLoaded(true)
    }
  }, [mode, draft, draftLoaded])

  // Watch all form values for auto-save
  const watchAllFields = watch()

  // Auto-save draft (debounced)
  useEffect(() => {
    if (mode !== 'create') return
    
    const timeoutId = setTimeout(() => {
      const currentData = getValues()
      saveDraft(currentData, kendaraanList, usahaList)
    }, 1000) // Save after 1 second of no changes

    return () => clearTimeout(timeoutId)
  }, [watchAllFields, kendaraanList, usahaList, mode, getValues])

  // Save draft when tab is hidden or page is closed
  useEffect(() => {
    if (mode !== 'create') return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const currentData = getValues()
        saveDraft(currentData, kendaraanList, usahaList)
      }
    }

    const handleBeforeUnload = () => {
      const currentData = getValues()
      saveDraft(currentData, kendaraanList, usahaList)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [mode, getValues, kendaraanList, usahaList])

  const selectedRT = watch('rt_id')
  const hubunganKeluarga = watch('hubungan_keluarga')
  const alamatKTPSama = watch('alamat_ktp_sama')
  const minatOlahraga = watch('minat_olahraga') || []

  // Set dropdown values after master data is loaded (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Set nilai setelah rtList ter-load
      if (rtList.length > 0 && initialData.rt_id) {
        setValue('rt_id', initialData.rt_id)
      }
      // Set nilai setelah jalanList ter-load
      if (jalanList.length > 0 && initialData.jalan_id) {
        setValue('jalan_id', initialData.jalan_id)
      }
      // Set nilai setelah kepalaKeluargaList ter-load
      if (kepalaKeluargaList.length > 0 && initialData.kepala_keluarga_id) {
        setValue('kepala_keluarga_id', initialData.kepala_keluarga_id)
      }
    }
  }, [mode, initialData, rtList, jalanList, kepalaKeluargaList, setValue])

  // Fetch master data
  useEffect(() => {
    const fetchMasterData = async () => {
      // Fetch RT
      const { data: rtData } = await supabase
        .from('rt')
        .select('*')
        .order('nomor_rt')
      setRtList(rtData || [])

      // Fetch Jalan
      const { data: jalanData } = await supabase
        .from('jalan')
        .select('*, rt:rt_id(nomor_rt)')
        .order('nama_jalan')
      setJalanList(jalanData || [])

      // Fetch Kepala Keluarga
      const { data: kkData } = await supabase
        .from('warga')
        .select('id, nama_lengkap, nomor_rumah, jalan:jalan_id(nama_jalan)')
        .eq('hubungan_keluarga', 'kepala_keluarga')
        .eq('is_active', true)
        .order('nama_lengkap')
      
      // Map data untuk menyesuaikan tipe
      const mappedKK: KepalaKeluargaOption[] = (kkData || []).map((kk: any) => ({
        id: kk.id,
        nama_lengkap: kk.nama_lengkap,
        nomor_rumah: kk.nomor_rumah,
        jalan: kk.jalan ? { nama_jalan: kk.jalan.nama_jalan } : null
      }))
      setKepalaKeluargaList(mappedKK)

      // Fetch kendaraan & usaha jika mode edit
      if (mode === 'edit' && wargaId) {
        const { data: kendaraanData } = await supabase
          .from('kendaraan')
          .select('*')
          .eq('warga_id', wargaId)
          .order('created_at')
        setKendaraanList(kendaraanData || [])

        const { data: usahaData } = await supabase
          .from('usaha')
          .select('*')
          .eq('warga_id', wargaId)
          .order('created_at')
        setUsahaList(usahaData || [])
      }
    }

    fetchMasterData()
  }, [mode, wargaId])

  // Tampilkan semua jalan (tidak difilter berdasarkan RT)
  const filteredJalan = jalanList

  // Handle minat olahraga checkbox
  const handleMinatChange = (value: string) => {
    const current = minatOlahraga || []
    if (current.includes(value)) {
      setValue('minat_olahraga', current.filter(v => v !== value))
    } else {
      setValue('minat_olahraga', [...current, value])
    }
  }

  // Add kendaraan
  const handleAddKendaraan = () => {
    if (!newKendaraan.nomor_polisi || !newKendaraan.merek) {
      alert('Nomor polisi dan merek wajib diisi')
      return
    }
    setKendaraanList([...kendaraanList, { ...newKendaraan, id: `temp-${Date.now()}`, warga_id: wargaId || '', created_at: '', updated_at: '' } as Kendaraan])
    setNewKendaraan({ jenis_kendaraan: 'motor', nomor_polisi: '', merek: '', tipe: '', tahun_pembuatan: undefined, warna: '' })
  }

  // Remove kendaraan
  const handleRemoveKendaraan = (index: number) => {
    setKendaraanList(kendaraanList.filter((_, i) => i !== index))
  }

  // Add usaha
  const handleAddUsaha = () => {
    if (!newUsaha.nama_usaha) {
      alert('Nama usaha wajib diisi')
      return
    }
    setUsahaList([...usahaList, { ...newUsaha, id: `temp-${Date.now()}`, warga_id: wargaId || '', created_at: '', updated_at: '' } as Usaha])
    setNewUsaha({ nama_usaha: '', deskripsi_usaha: '', alamat_usaha: '', no_whatsapp_usaha: '', link_instagram: '', link_tiktok: '', link_website: '', link_twitter: '' })
  }

  // Remove usaha
  const handleRemoveUsaha = (index: number) => {
    setUsahaList(usahaList.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: WargaFormInput) => {
    try {
      setLoading(true)
      setError(null)

      // Validasi NIK - cek hanya warga aktif
      if (mode === 'create' && data.nik) {
        const { data: existingNIK } = await supabase
          .from('warga')
          .select('id, nama_lengkap')
          .eq('nik', data.nik)
          .eq('is_active', true)
          .single()
        
        if (existingNIK) {
          setError(`NIK ${data.nik} sudah terdaftar atas nama ${existingNIK.nama_lengkap}`)
          setLoading(false)
          return
        }
      }

      // Prepare warga data
      const wargaData = {
        ...data,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      let savedWargaId = wargaId

      if (mode === 'create') {
        const { data: insertedWarga, error: insertError } = await supabase
          .from('warga')
          .insert(wargaData)
          .select('id')
          .single()

        if (insertError) throw insertError
        savedWargaId = insertedWarga.id
      } else if (mode === 'edit' && wargaId) {
        const { error: updateError } = await supabase
          .from('warga')
          .update(wargaData)
          .eq('id', wargaId)

        if (updateError) throw updateError
      }

      // Save kendaraan
      if (savedWargaId) {
        // Delete existing kendaraan
        if (mode === 'edit') {
          await supabase.from('kendaraan').delete().eq('warga_id', savedWargaId)
        }
        // Insert new kendaraan
        if (kendaraanList.length > 0) {
          const kendaraanToInsert = kendaraanList.map(k => ({
            warga_id: savedWargaId,
            jenis_kendaraan: k.jenis_kendaraan,
            nomor_polisi: k.nomor_polisi,
            merek: k.merek,
            tipe: k.tipe,
            tahun_pembuatan: k.tahun_pembuatan,
            warna: k.warna,
          }))
          await supabase.from('kendaraan').insert(kendaraanToInsert)
        }

        // Delete existing usaha
        if (mode === 'edit') {
          await supabase.from('usaha').delete().eq('warga_id', savedWargaId)
        }
        // Insert new usaha
        if (usahaList.length > 0) {
          const usahaToInsert = usahaList.map(u => ({
            warga_id: savedWargaId,
            nama_usaha: u.nama_usaha,
            deskripsi_usaha: u.deskripsi_usaha,
            alamat_usaha: u.alamat_usaha,
            no_whatsapp_usaha: u.no_whatsapp_usaha,
            link_instagram: u.link_instagram,
            link_tiktok: u.link_tiktok,
            link_website: u.link_website,
            link_twitter: u.link_twitter,
          }))
          await supabase.from('usaha').insert(usahaToInsert)
        }

        // Jika onboarding, update users.warga_id
        if (isOnboarding && mode === 'create') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('users')
              .update({ warga_id: savedWargaId })
              .eq('id', user.id)
          }
        }

        // Jika kepala keluarga, buat/update rumah
        if (data.hubungan_keluarga === 'kepala_keluarga' && data.jalan_id && data.nomor_rumah) {
          // Cek apakah rumah sudah ada
          const { data: existingRumah } = await supabase
            .from('rumah')
            .select('id, kepala_keluarga_id')
            .eq('jalan_id', data.jalan_id)
            .eq('nomor_rumah', data.nomor_rumah)
            .single()

          if (existingRumah) {
            // Update kepala_keluarga_id jika belum diset
            if (!existingRumah.kepala_keluarga_id) {
              await supabase
                .from('rumah')
                .update({ kepala_keluarga_id: savedWargaId })
                .eq('id', existingRumah.id)
            }
          } else {
            // Buat rumah baru
            const rumahData = {
              jalan_id: data.jalan_id,
              nomor_rumah: data.nomor_rumah,
              rt_id: data.rt_id,
              blok: data.perumahan?.includes('Barat') ? 'Barat' : 'Timur',
              kepala_keluarga_id: savedWargaId,
              is_occupied: true,
            }
            
            await supabase.from('rumah').insert(rumahData)
          }
        }
      }

      // Clear draft setelah berhasil simpan
      clearDraft()

      // Redirect berdasarkan mode
      if (isOnboarding) {
        router.push('/dashboard')
      } else {
        router.push('/warga')
      }
      router.refresh()
    } catch (err: any) {
      console.error('Error saving warga:', err)
      if (err.message?.includes('duplicate') || err.message?.includes('unique') || err.code === '23505') {
        setError('NIK sudah terdaftar. Jika data sebelumnya sudah dihapus, silakan hubungi pengurus RW.')
      } else {
        setError(err.message || 'Gagal menyimpan data. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* ========================================== */}
      {/* A. DATA IDENTITAS PRIBADI */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiUser className="me-2" />
            A. DATA IDENTITAS PRIBADI
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Nama Lengkap (sesuai KTP) *</label>
              <input
                type="text"
                className={`form-control ${errors.nama_lengkap ? 'is-invalid' : ''}`}
                {...register('nama_lengkap', {
                  required: 'Nama lengkap wajib diisi',
                  minLength: { value: 3, message: 'Minimal 3 karakter' },
                })}
              />
              {errors.nama_lengkap && (
                <div className="invalid-feedback">{errors.nama_lengkap.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">NIK *</label>
              <input
                type="text"
                className={`form-control ${errors.nik ? 'is-invalid' : ''}`}
                maxLength={16}
                {...register('nik', {
                  required: 'NIK wajib diisi',
                  validate: (value) => validateNIK(value) || 'NIK harus 16 digit',
                })}
              />
              {errors.nik && (
                <div className="invalid-feedback">{errors.nik.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Nomor Kartu Keluarga</label>
              <input
                type="text"
                className={`form-control ${errors.no_kk ? 'is-invalid' : ''}`}
                maxLength={16}
                {...register('no_kk', {
                  validate: (value) => !value || validateNoKK(value) || 'No KK harus 16 digit',
                })}
              />
              {errors.no_kk && (
                <div className="invalid-feedback">{errors.no_kk.message}</div>
              )}
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Tempat Lahir</label>
              <input
                type="text"
                className="form-control"
                {...register('tempat_lahir')}
              />
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Tanggal Lahir</label>
              <input
                type="date"
                className="form-control"
                {...register('tanggal_lahir')}
              />
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Jenis Kelamin *</label>
              <div className="mt-2">
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    value="L"
                    id="jk_l"
                    {...register('jenis_kelamin', { required: true })}
                  />
                  <label className="form-check-label" htmlFor="jk_l">Laki-laki</label>
                </div>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    value="P"
                    id="jk_p"
                    {...register('jenis_kelamin', { required: true })}
                  />
                  <label className="form-check-label" htmlFor="jk_p">Perempuan</label>
                </div>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">Agama *</label>
              <select className="form-select" {...register('agama', { required: true })}>
                <option value="islam">Islam</option>
                <option value="kristen">Kristen</option>
                <option value="katolik">Katolik</option>
                <option value="hindu">Hindu</option>
                <option value="budha">Buddha</option>
                <option value="konghucu">Konghucu</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Status Perkawinan</label>
              <div className="mt-2">
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="belum_kawin" id="sp_belum" {...register('status_pernikahan')} />
                  <label className="form-check-label" htmlFor="sp_belum">Belum Kawin</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="kawin" id="sp_kawin" {...register('status_pernikahan')} />
                  <label className="form-check-label" htmlFor="sp_kawin">Kawin</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="cerai_hidup" id="sp_ch" {...register('status_pernikahan')} />
                  <label className="form-check-label" htmlFor="sp_ch">Cerai Hidup</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="cerai_mati" id="sp_cm" {...register('status_pernikahan')} />
                  <label className="form-check-label" htmlFor="sp_cm">Cerai Mati</label>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Pendidikan Terakhir</label>
              <select className="form-select" {...register('pendidikan_terakhir')}>
                <option value="">- Pilih Pendidikan -</option>
                <option value="tidak_sekolah">Tidak Sekolah</option>
                <option value="sd">SD</option>
                <option value="smp">SMP</option>
                <option value="sma">SMA</option>
                <option value="diploma_1">Diploma 1</option>
                <option value="diploma_2">Diploma 2</option>
                <option value="diploma_3">Diploma 3</option>
                <option value="diploma_4">Diploma 4</option>
                <option value="sarjana_s1">Sarjana (S1)</option>
                <option value="magister_s2">Magister (S2)</option>
                <option value="doktor_s3">Doktor (S3)</option>
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Pekerjaan</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Karyawan Swasta"
                {...register('pekerjaan')}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Nama Institusi</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nama perusahaan/instansi tempat bekerja"
                {...register('nama_institusi')}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">No. HP/WhatsApp *</label>
              <input
                type="tel"
                className={`form-control ${errors.no_hp ? 'is-invalid' : ''}`}
                placeholder="Contoh: 08123456789"
                {...register('no_hp', {
                  required: 'No. HP wajib diisi',
                  validate: (value) => validatePhone(value) || 'Format no. HP tidak valid',
                })}
              />
              {errors.no_hp && (
                <div className="invalid-feedback">{errors.no_hp.message}</div>
              )}
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Email (untuk login ke sistem)</label>
              <input
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                placeholder="Contoh: nama@email.com"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Format email tidak valid',
                  },
                })}
              />
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* B. STATUS KEPENDUDUKAN */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiFileText className="me-2" />
            B. STATUS KEPENDUDUKAN
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Status Kependudukan di RW ini *</label>
              <div className="mt-2">
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="penduduk_tetap" id="sk_tetap" {...register('status_kependudukan')} />
                  <label className="form-check-label" htmlFor="sk_tetap">Penduduk Tetap</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="penduduk_kontrak" id="sk_kontrak" {...register('status_kependudukan')} />
                  <label className="form-check-label" htmlFor="sk_kontrak">Penduduk Kontrak/Sewa</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="menumpang" id="sk_numpang" {...register('status_kependudukan')} />
                  <label className="form-check-label" htmlFor="sk_numpang">Menumpang</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="pemilik_tidak_tinggal" id="sk_pemilik" {...register('status_kependudukan')} />
                  <label className="form-check-label" htmlFor="sk_pemilik">Pemilik Rumah Tidak Tinggal</label>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Tanggal Mulai Menempati</label>
              <input
                type="date"
                className="form-control"
                {...register('tanggal_mulai_tinggal')}
              />
              <small className="text-muted">Tanggal sejak mulai tinggal di alamat ini</small>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Status Rumah *</label>
              <div className="mt-2">
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="milik_sendiri" id="sr_milik" {...register('status_rumah')} />
                  <label className="form-check-label" htmlFor="sr_milik">Milik Sendiri</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="sewa_kontrak" id="sr_sewa_kontrak" {...register('status_rumah')} />
                  <label className="form-check-label" htmlFor="sr_sewa_kontrak">Sewa/Kontrak</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="menumpang" id="sr_numpang" {...register('status_rumah')} />
                  <label className="form-check-label" htmlFor="sr_numpang">Menumpang</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="dinas" id="sr_dinas" {...register('status_rumah')} />
                  <label className="form-check-label" htmlFor="sr_dinas">Dinas</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* C. ALAMAT DOMISILI */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiMapPin className="me-2" />
            C. ALAMAT DOMISILI (ALAMAT TINGGAL SAAT INI)
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Blok Rumah (Jalan) *</label>
              <select
                className={`form-select ${errors.jalan_id ? 'is-invalid' : ''}`}
                {...register('jalan_id')}
              >
                <option value="">- Pilih Jalan -</option>
                {filteredJalan.map(jalan => (
                  <option key={jalan.id} value={jalan.id}>
                    {jalan.nama_jalan}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">No Rumah *</label>
              <input
                type="text"
                className={`form-control ${errors.nomor_rumah ? 'is-invalid' : ''}`}
                placeholder="Contoh: 12"
                {...register('nomor_rumah', { required: 'No. rumah wajib diisi' })}
              />
              {errors.nomor_rumah && (
                <div className="invalid-feedback">{errors.nomor_rumah.message}</div>
              )}
            </div>

            <div className="col-md-3 mb-3">
              <label className="form-label">RT / RW *</label>
              <div className="input-group">
                <select
                  className={`form-select ${errors.rt_id ? 'is-invalid' : ''}`}
                  {...register('rt_id', { required: 'RT wajib dipilih' })}
                >
                  <option value="">RT</option>
                  {rtList.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.nomor_rt}
                    </option>
                  ))}
                </select>
                <span className="input-group-text">/</span>
                <input type="text" className="form-control" value="013" disabled />
              </div>
              {errors.rt_id && (
                <div className="invalid-feedback d-block">{errors.rt_id.message}</div>
              )}
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Perumahan / Kampung</label>
              <input
                type="text"
                className="form-control"
                {...register('perumahan')}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Kelurahan</label>
              <input
                type="text"
                className="form-control"
                {...register('kelurahan')}
              />
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Kecamatan</label>
              <input
                type="text"
                className="form-control"
                {...register('kecamatan')}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Kota/Kabupaten</label>
              <input
                type="text"
                className="form-control"
                {...register('kota_kabupaten')}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Kode Pos</label>
              <input
                type="text"
                className="form-control"
                maxLength={5}
                {...register('kode_pos')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* D. ALAMAT SESUAI KTP */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiHome className="me-2" />
            D. ALAMAT SESUAI KTP
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-12 mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="alamat_sama"
                  {...register('alamat_ktp_sama')}
                />
                <label className="form-check-label" htmlFor="alamat_sama">
                  Sama dengan alamat domisili
                </label>
              </div>
            </div>

            {!alamatKTPSama && (
              <>
                <div className="col-12 mb-3">
                  <label className="form-label">Alamat</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    {...register('alamat_ktp')}
                  />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">RT / RW</label>
                  <div className="input-group">
                    <input type="text" className="form-control" placeholder="RT" {...register('rt_ktp')} />
                    <span className="input-group-text">/</span>
                    <input type="text" className="form-control" placeholder="RW" {...register('rw_ktp')} />
                  </div>
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Kelurahan</label>
                  <input type="text" className="form-control" {...register('kelurahan_ktp')} />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Kecamatan</label>
                  <input type="text" className="form-control" {...register('kecamatan_ktp')} />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Kota/Kabupaten</label>
                  <input type="text" className="form-control" {...register('kota_kabupaten_ktp')} />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Kode Pos</label>
                  <input type="text" className="form-control" maxLength={5} {...register('kode_pos_ktp')} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* E. STATUS DOKUMEN KEPENDUDUKAN */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiFileText className="me-2" />
            E. STATUS DOKUMEN KEPENDUDUKAN
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">KTP Elektronik</label>
              <div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="ada_aktif" id="ktp_aktif" {...register('status_ktp')} />
                  <label className="form-check-label" htmlFor="ktp_aktif">Ada & Aktif</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="ada_alamat_beda" id="ktp_beda" {...register('status_ktp')} />
                  <label className="form-check-label" htmlFor="ktp_beda">Ada tapi Alamat Berbeda</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="proses_pindah" id="ktp_proses" {...register('status_ktp')} />
                  <label className="form-check-label" htmlFor="ktp_proses">Dalam Proses Pindah</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="tidak_ada" id="ktp_tidak" {...register('status_ktp')} />
                  <label className="form-check-label" htmlFor="ktp_tidak">Tidak Ada</label>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Kartu Keluarga (KK)</label>
              <div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="sesuai_domisili" id="kk_sesuai" {...register('status_kk')} />
                  <label className="form-check-label" htmlFor="kk_sesuai">Sesuai Domisili</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="alamat_beda" id="kk_beda" {...register('status_kk')} />
                  <label className="form-check-label" htmlFor="kk_beda">Alamat Berbeda</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="radio" value="proses_perubahan" id="kk_proses" {...register('status_kk')} />
                  <label className="form-check-label" htmlFor="kk_proses">Dalam Proses Perubahan</label>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Surat Domisili dari RW/RT</label>
              <div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="sudah_ada" id="dom_ada" {...register('status_surat_domisili')} />
                  <label className="form-check-label" htmlFor="dom_ada">Sudah Ada</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="belum_ada" id="dom_belum" {...register('status_surat_domisili')} />
                  <label className="form-check-label" htmlFor="dom_belum">Belum Ada</label>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Status Pindah Datang</label>
              <div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="tidak_pindah" id="pindah_tidak" {...register('status_pindah')} />
                  <label className="form-check-label" htmlFor="pindah_tidak">Tidak Pindah</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="pindah_antar_rt" id="pindah_rt" {...register('status_pindah')} />
                  <label className="form-check-label" htmlFor="pindah_rt">Antar RT</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="pindah_antar_rw" id="pindah_rw" {...register('status_pindah')} />
                  <label className="form-check-label" htmlFor="pindah_rw">Antar RW</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="pindah_antar_kota" id="pindah_kota" {...register('status_pindah')} />
                  <label className="form-check-label" htmlFor="pindah_kota">Antar Kota</label>
                </div>
                <div className="form-check form-check-inline">
                  <input className="form-check-input" type="radio" value="pendatang_baru" id="pindah_baru" {...register('status_pindah')} />
                  <label className="form-check-label" htmlFor="pindah_baru">Pendatang Baru</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* F. DATA KELUARGA */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiUsers className="me-2" />
            F. DATA KELUARGA
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Hubungan dalam Keluarga *</label>
              <select className="form-select" {...register('hubungan_keluarga', { required: true })}>
                <option value="kepala_keluarga">Kepala Keluarga</option>
                <option value="istri">Istri</option>
                <option value="suami">Suami</option>
                <option value="anak">Anak</option>
                <option value="orang_tua">Orang Tua</option>
                <option value="mertua">Mertua</option>
                <option value="menantu">Menantu</option>
                <option value="cucu">Cucu</option>
                <option value="kerabat">Kerabat</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            {hubunganKeluarga !== 'kepala_keluarga' && (
              <div className="col-md-6 mb-3">
                <label className="form-label">Nama Kepala Keluarga</label>
                <select className="form-select" {...register('kepala_keluarga_id')}>
                  <option value="">- Pilih Kepala Keluarga -</option>
                  {kepalaKeluargaList.map(kk => (
                    <option key={kk.id} value={kk.id}>
                      {kk.nama_lengkap} ({kk.jalan?.nama_jalan || '-'} No. {kk.nomor_rumah})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* G. DATA DARURAT */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiAlertCircle className="me-2" />
            G. DATA DARURAT
          </h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Nama Kontak Darurat</label>
              <input type="text" className="form-control" {...register('nama_kontak_darurat')} />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">Hubungan</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Saudara, Orang Tua"
                {...register('hubungan_kontak_darurat')}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="form-label">No HP</label>
              <input type="tel" className="form-control" placeholder="08xxxxxxxxxx" {...register('no_hp_darurat')} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* H. DATA TAMBAHAN */}
      {/* ========================================== */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">
            <FiPlus className="me-2" />
            H. DATA TAMBAHAN
          </h6>
        </div>
        <div className="card-body">
          {/* Minat Olahraga */}
          <div className="mb-4">
            <label className="form-label fw-bold">Minat Olahraga</label>
            <div className="row">
              {MINAT_OLAHRAGA_OPTIONS.map(opt => (
                <div className="col-md-3 col-6" key={opt.value}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`minat_${opt.value}`}
                      checked={minatOlahraga.includes(opt.value)}
                      onChange={() => handleMinatChange(opt.value)}
                    />
                    <label className="form-check-label" htmlFor={`minat_${opt.value}`}>
                      {opt.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kendaraan */}
          <div className="mb-4">
            <label className="form-label fw-bold">
              <FiTruck className="me-2" />
              Kepemilikan Kendaraan
            </label>
            
            {kendaraanList.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Jenis</th>
                      <th>Nomor Polisi</th>
                      <th>Merek</th>
                      <th>Tipe</th>
                      <th>Tahun</th>
                      <th>Warna</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kendaraanList.map((k, idx) => (
                      <tr key={k.id}>
                        <td>{k.jenis_kendaraan === 'motor' ? 'Motor' : 'Mobil'}</td>
                        <td>{k.nomor_polisi}</td>
                        <td>{k.merek}</td>
                        <td>{k.tipe || '-'}</td>
                        <td>{k.tahun_pembuatan || '-'}</td>
                        <td>{k.warna || '-'}</td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveKendaraan(idx)}>
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label small">Jenis</label>
                <select
                  className="form-select form-select-sm"
                  value={newKendaraan.jenis_kendaraan}
                  onChange={e => setNewKendaraan({ ...newKendaraan, jenis_kendaraan: e.target.value as any })}
                >
                  <option value="motor">Motor</option>
                  <option value="mobil">Mobil</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small">No. Polisi *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="D 1234 XX"
                  value={newKendaraan.nomor_polisi}
                  onChange={e => setNewKendaraan({ ...newKendaraan, nomor_polisi: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Merek *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Honda, Toyota"
                  value={newKendaraan.merek}
                  onChange={e => setNewKendaraan({ ...newKendaraan, merek: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Tipe</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Vario, Avanza"
                  value={newKendaraan.tipe || ''}
                  onChange={e => setNewKendaraan({ ...newKendaraan, tipe: e.target.value })}
                />
              </div>
              <div className="col-md-1">
                <label className="form-label small">Tahun</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  placeholder="2020"
                  value={newKendaraan.tahun_pembuatan || ''}
                  onChange={e => setNewKendaraan({ ...newKendaraan, tahun_pembuatan: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">Warna</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Hitam"
                  value={newKendaraan.warna || ''}
                  onChange={e => setNewKendaraan({ ...newKendaraan, warna: e.target.value })}
                />
              </div>
              <div className="col-md-1">
                <button type="button" className="btn btn-sm btn-success" onClick={handleAddKendaraan}>
                  <FiPlus />
                </button>
              </div>
            </div>
          </div>

          {/* Usaha */}
          <div className="mb-3">
            <label className="form-label fw-bold">
              <FiBriefcase className="me-2" />
              Kepemilikan Usaha <span className="text-muted fw-normal">(Opsional)</span>
            </label>
            
            {usahaList.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-sm table-bordered table-usaha">
                  <thead className="table-light">
                    <tr>
                      <th>Nama Usaha</th>
                      <th className="desc-col">Deskripsi</th>
                      <th>Alamat</th>
                      <th>WhatsApp</th>
                      <th className="social-col">Social Media</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usahaList.map((u, idx) => (
                      <tr key={u.id}>
                        <td>{u.nama_usaha}</td>
                        <td>{u.deskripsi_usaha || '-'}</td>
                        <td>{u.alamat_usaha || '-'}</td>
                        <td>{u.no_whatsapp_usaha || '-'}</td>
                        <td className="small">
                          {u.link_instagram && <div>📷 @{u.link_instagram.replace(/.*instagram.com\/|@/g, '')}</div>}
                          {u.link_tiktok && <div>🎵 @{u.link_tiktok.replace(/.*tiktok.com\/@?|@/g, '')}</div>}
                          {u.link_website && <div>🌐 {u.link_website.replace(/https?:\/\//g, '').slice(0, 20)}...</div>}
                          {u.link_twitter && <div>𝕏 @{u.link_twitter.replace(/.*twitter.com\/|.*x.com\/|@/g, '')}</div>}
                          {!u.link_instagram && !u.link_tiktok && !u.link_website && !u.link_twitter && '-'}
                        </td>
                        <td>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveUsaha(idx)}>
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Form Input Usaha - Baris 1 */}
            <div className="row g-2 mb-2">
              <div className="col-md-3">
                <label className="form-label small">Nama Usaha *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Nama usaha"
                  value={newUsaha.nama_usaha}
                  onChange={e => setNewUsaha({ ...newUsaha, nama_usaha: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Deskripsi Usaha</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Jenis/kategori usaha"
                  value={newUsaha.deskripsi_usaha || ''}
                  onChange={e => setNewUsaha({ ...newUsaha, deskripsi_usaha: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Alamat Usaha</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Alamat lokasi usaha"
                  value={newUsaha.alamat_usaha || ''}
                  onChange={e => setNewUsaha({ ...newUsaha, alamat_usaha: e.target.value })}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small">WhatsApp Usaha</label>
                <input
                  type="tel"
                  className="form-control form-control-sm"
                  placeholder="08xxx"
                  value={newUsaha.no_whatsapp_usaha || ''}
                  onChange={e => setNewUsaha({ ...newUsaha, no_whatsapp_usaha: e.target.value })}
                />
              </div>
            </div>
            
            {/* Form Input Usaha - Baris 2: Social Media */}
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small">Instagram</label>
                <div className="input-group input-group-sm social-input">
                  <span className="input-group-text">📷</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="username atau link"
                    value={newUsaha.link_instagram || ''}
                    onChange={e => setNewUsaha({ ...newUsaha, link_instagram: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">TikTok</label>
                <div className="input-group input-group-sm social-input">
                  <span className="input-group-text">🎵</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="username atau link"
                    value={newUsaha.link_tiktok || ''}
                    onChange={e => setNewUsaha({ ...newUsaha, link_tiktok: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Website</label>
                <div className="input-group input-group-sm social-input">
                  <span className="input-group-text">🌐</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://..."
                    value={newUsaha.link_website || ''}
                    onChange={e => setNewUsaha({ ...newUsaha, link_website: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label small">Twitter/X</label>
                <div className="input-group input-group-sm social-input">
                  <span className="input-group-text">𝕏</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="username"
                    value={newUsaha.link_twitter || ''}
                    onChange={e => setNewUsaha({ ...newUsaha, link_twitter: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-1">
                <button type="button" className="btn btn-sm btn-success" onClick={handleAddUsaha}>
                  <FiPlus />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catatan */}
      <div className="card mb-4">
        <div className="card-body">
          <label className="form-label">Catatan Tambahan</label>
          <textarea
            className="form-control"
            rows={3}
            placeholder="Catatan tambahan (opsional)"
            {...register('catatan')}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-end gap-2 mb-4">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          <FiX className="me-2" />
          Batal
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Menyimpan...
            </>
          ) : (
            <>
              <FiSave className="me-2" />
              {mode === 'create' ? 'Simpan Data Warga' : 'Update Data Warga'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}