'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import WargaForm from '@/components/WargaForm'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import { Warga } from '@/types'

function TambahWargaContent() {
  const searchParams = useSearchParams()
  const { userData, isPengurus, loading: userLoading } = useUser()
  const [kepalaKeluarga, setKepalaKeluarga] = useState<Warga | null>(null)
  const [loading, setLoading] = useState(true)
  const [canAdd, setCanAdd] = useState(false)
  
  const supabase = createClient()
  
  // Get query params
  const jalanId = searchParams.get('jalan_id')
  const nomorRumah = searchParams.get('nomor_rumah')
  const rtId = searchParams.get('rt_id')
  const kepalaKeluargaId = searchParams.get('kepala_keluarga_id')

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true)
      
      // Pengurus selalu bisa tambah
      if (isPengurus) {
        setCanAdd(true)
        setLoading(false)
        return
      }
      
      // Cek apakah user adalah Kepala Keluarga
      if (userData?.warga_id) {
        // Cek apakah user terdaftar sebagai kepala keluarga di tabel rumah
        const { data: rumahData, error: rumahError } = await supabase
          .from('rumah')
          .select('id, kepala_keluarga_id')
          .eq('kepala_keluarga_id', userData.warga_id)
          .maybeSingle()
        
        console.log('Check rumah for kepala keluarga:', { 
          warga_id: userData.warga_id, 
          rumahData, 
          rumahError 
        })
        
        if (rumahData) {
          // User adalah Kepala Keluarga, izinkan akses
          setCanAdd(true)
          
          // Jika tidak ada kepala_keluarga_id di URL, set dari user
          if (!kepalaKeluargaId) {
            // Fetch data warga user sebagai kepala keluarga
            const { data: wargaData } = await supabase
              .from('warga')
              .select('*')
              .eq('id', userData.warga_id)
              .single()
            
            if (wargaData) {
              setKepalaKeluarga(wargaData)
            }
          }
        }
      }
      
      // Jika ada kepala_keluarga_id di URL, cek apakah user adalah kepala keluarga tersebut
      if (kepalaKeluargaId) {
        const { data } = await supabase
          .from('warga')
          .select('*')
          .eq('id', kepalaKeluargaId)
          .single()
        
        if (data) {
          setKepalaKeluarga(data)
          // Kepala keluarga bisa tambah anggota untuk dirinya sendiri
          if (userData?.warga_id === data.id) {
            setCanAdd(true)
          }
        }
      }
      
      setLoading(false)
    }

    if (!userLoading) {
      checkAccess()
    }
  }, [userLoading, isPengurus, userData, kepalaKeluargaId])

  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!canAdd && !isPengurus) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger" role="alert">
          Anda tidak memiliki akses untuk menambah data warga
        </div>
        <Link href="/warga" className="btn btn-primary">
          <FiArrowLeft className="me-2" />
          Kembali
        </Link>
      </div>
    )
  }

  // Build initial data from query params or kepala keluarga
  const initialData: Partial<Warga> = {}
  
  if (kepalaKeluarga) {
    // Copy alamat dari kepala keluarga
    initialData.jalan_id = kepalaKeluarga.jalan_id
    initialData.nomor_rumah = kepalaKeluarga.nomor_rumah
    initialData.rt_id = kepalaKeluarga.rt_id
    initialData.perumahan = kepalaKeluarga.perumahan
    initialData.kelurahan = kepalaKeluarga.kelurahan
    initialData.kecamatan = kepalaKeluarga.kecamatan
    initialData.kota_kabupaten = kepalaKeluarga.kota_kabupaten
    initialData.kode_pos = kepalaKeluarga.kode_pos
    initialData.kepala_keluarga_id = kepalaKeluarga.id
    initialData.no_kk = kepalaKeluarga.no_kk
    initialData.hubungan_keluarga = 'anak' // Default untuk anggota baru
  } else {
    // Use query params
    if (jalanId) initialData.jalan_id = jalanId
    if (nomorRumah) initialData.nomor_rumah = nomorRumah
    if (rtId) initialData.rt_id = rtId
  }

  // Determine back link
  const backLink = kepalaKeluarga && kepalaKeluarga.jalan_id && kepalaKeluarga.nomor_rumah
    ? `/rumah/${encodeURIComponent(kepalaKeluarga.jalan_id)}/${encodeURIComponent(kepalaKeluarga.nomor_rumah)}`
    : '/warga'

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href={backLink} className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">
            {kepalaKeluarga ? 'Tambah Anggota Keluarga' : 'Tambah Data Warga'}
          </h1>
          <p className="text-muted mb-0">
            {kepalaKeluarga 
              ? `Anggota keluarga ${kepalaKeluarga.nama_lengkap}`
              : 'Formulir Pendataan Warga RW 013'
            }
          </p>
        </div>
      </div>

      {kepalaKeluarga && (
        <div className="alert alert-info mb-4">
          <strong>Info:</strong> Alamat akan otomatis sama dengan kepala keluarga: 
          <strong> {kepalaKeluarga.jalan?.nama_jalan || 'Jl.'} No. {kepalaKeluarga.nomor_rumah}</strong>
        </div>
      )}

      <WargaForm 
        mode="create" 
        initialData={initialData}
      />
    </div>
  )
}

export default function TambahWargaPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <TambahWargaContent />
    </Suspense>
  )
}