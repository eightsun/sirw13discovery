'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga } from '@/types'
import WargaForm from '@/components/WargaForm'
import { FiArrowLeft } from 'react-icons/fi'

export default function EditWargaPage() {
  const params = useParams()
  const wargaId = params.id as string
  
  const { userData, isPengurus, loading: userLoading } = useUser()
  const [warga, setWarga] = useState<Warga | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchWarga = async () => {
      try {
        setLoading(true)
        
        const { data, error: fetchError } = await supabase
          .from('warga')
          .select('*')
          .eq('id', wargaId)
          .single()

        if (fetchError) throw fetchError
        setWarga(data)
      } catch (err) {
        console.error('Error fetching warga:', err)
        setError('Data warga tidak ditemukan')
      } finally {
        setLoading(false)
      }
    }

    if (wargaId) {
      fetchWarga()
    }
  }, [wargaId])

  // Check access
  const canEdit = isPengurus || userData?.warga_id === wargaId

  if (loading || userLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Memuat data...</p>
      </div>
    )
  }

  if (error || !warga) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger" role="alert">
          {error || 'Data tidak ditemukan'}
        </div>
        <Link href="/warga" className="btn btn-primary">
          <FiArrowLeft className="me-2" />
          Kembali ke Daftar Warga
        </Link>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger" role="alert">
          Anda tidak memiliki akses untuk mengedit data warga ini
        </div>
        <Link href="/warga" className="btn btn-primary">
          <FiArrowLeft className="me-2" />
          Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center mb-4">
        <Link href={`/warga/${wargaId}`} className="btn btn-outline-secondary me-3">
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="page-title mb-0">Edit Data Warga</h1>
          <p className="text-muted mb-0">{warga.nama_lengkap}</p>
        </div>
      </div>

      <WargaForm 
        mode="edit" 
        wargaId={wargaId}
        initialData={{
          nama_lengkap: warga.nama_lengkap,
          nik: warga.nik,
          no_kk: warga.no_kk || undefined,
          tempat_lahir: warga.tempat_lahir || undefined,
          tanggal_lahir: warga.tanggal_lahir || undefined,
          jenis_kelamin: warga.jenis_kelamin,
          agama: warga.agama,
          status_pernikahan: warga.status_pernikahan,
          pendidikan_terakhir: warga.pendidikan_terakhir || undefined,
          pekerjaan: warga.pekerjaan || undefined,
          nama_institusi: warga.nama_institusi || undefined,
          no_hp: warga.no_hp,
          email: warga.email || undefined,
          status_kependudukan: warga.status_kependudukan,
          tanggal_mulai_tinggal: warga.tanggal_mulai_tinggal || undefined,
          lama_tinggal_tahun: warga.lama_tinggal_tahun || undefined,
          lama_tinggal_bulan: warga.lama_tinggal_bulan || undefined,
          status_rumah: warga.status_rumah,
          jalan_id: warga.jalan_id || undefined,
          nomor_rumah: warga.nomor_rumah,
          rt_id: warga.rt_id,
          perumahan: warga.perumahan || undefined,
          kelurahan: warga.kelurahan || undefined,
          kecamatan: warga.kecamatan || undefined,
          kota_kabupaten: warga.kota_kabupaten || undefined,
          kode_pos: warga.kode_pos || undefined,
          alamat_ktp_sama: warga.alamat_ktp_sama,
          alamat_ktp: warga.alamat_ktp || undefined,
          rt_ktp: warga.rt_ktp || undefined,
          rw_ktp: warga.rw_ktp || undefined,
          kelurahan_ktp: warga.kelurahan_ktp || undefined,
          kecamatan_ktp: warga.kecamatan_ktp || undefined,
          kota_kabupaten_ktp: warga.kota_kabupaten_ktp || undefined,
          kode_pos_ktp: warga.kode_pos_ktp || undefined,
          status_ktp: warga.status_ktp,
          status_kk: warga.status_kk,
          status_surat_domisili: warga.status_surat_domisili,
          status_pindah: warga.status_pindah,
          kepala_keluarga_id: warga.kepala_keluarga_id || undefined,
          hubungan_keluarga: warga.hubungan_keluarga,
          nama_kontak_darurat: warga.nama_kontak_darurat || undefined,
          hubungan_kontak_darurat: warga.hubungan_kontak_darurat || undefined,
          no_hp_darurat: warga.no_hp_darurat || undefined,
          minat_olahraga: warga.minat_olahraga || [],
          catatan: warga.catatan || undefined,
        }}
      />
    </div>
  )
}