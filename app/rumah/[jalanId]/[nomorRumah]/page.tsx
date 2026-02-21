'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga, RT, Jalan } from '@/types'
import { 
  getHubunganKeluargaLabel, 
  getJenisKelaminLabel,
  getStatusKependudukanLabel,
  calculateLamaTinggal
} from '@/utils/helpers'
import { FiArrowLeft, FiUser, FiEdit } from 'react-icons/fi'

interface KKGroup {
  kepala: Warga
  anggota: Warga[]
  no_kk: string
}

export default function DetailRumahPage() {
  const params = useParams()
  const jalanId = decodeURIComponent(params.jalanId as string)
  const nomorRumah = decodeURIComponent(params.nomorRumah as string)
  
  const { userData, isPengurus, loading: userLoading } = useUser()
  const [wargaList, setWargaList] = useState<Warga[]>([])
  const [jalan, setJalan] = useState<Jalan | null>(null)
  const [rt, setRt] = useState<RT | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch jalan info
        const { data: jalanData } = await supabase
          .from('jalan')
          .select('*, rt:rt_id(id, nomor_rt)')
          .eq('id', jalanId)
          .single()
        
        if (jalanData) {
          setJalan(jalanData)
          setRt(jalanData.rt as RT)
        }

        // Fetch all warga in this house
        const { data: wargaData, error: wargaError } = await supabase
          .from('warga')
          .select(`
            *,
            rt:rt_id (id, nomor_rt),
            jalan:jalan_id (id, nama_jalan)
          `)
          .eq('jalan_id', jalanId)
          .eq('nomor_rumah', nomorRumah)
          .eq('is_active', true)
          .order('nama_lengkap')

        if (wargaError) throw wargaError
        setWargaList(wargaData || [])

      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Data tidak ditemukan')
      } finally {
        setLoading(false)
      }
    }

    if (jalanId && nomorRumah) {
      fetchData()
    }
  }, [jalanId, nomorRumah])

  // Group warga by KK
  const kkGroups: KKGroup[] = (() => {
    const groups = new Map<string, KKGroup>()
    
    // First pass: find all kepala keluarga
    wargaList.forEach(warga => {
      if (warga.hubungan_keluarga === 'kepala_keluarga') {
        const noKK = warga.no_kk || warga.id
        groups.set(noKK, {
          kepala: warga,
          anggota: [],
          no_kk: warga.no_kk || '-'
        })
      }
    })

    // Second pass: assign anggota to their KK
    wargaList.forEach(warga => {
      if (warga.hubungan_keluarga !== 'kepala_keluarga') {
        let assigned = false
        
        if (warga.no_kk) {
          const group = groups.get(warga.no_kk)
          if (group) {
            group.anggota.push(warga)
            assigned = true
          }
        }
        
        if (!assigned && warga.kepala_keluarga_id) {
          groups.forEach((group) => {
            if (group.kepala.id === warga.kepala_keluarga_id) {
              group.anggota.push(warga)
              assigned = true
            }
          })
        }

        if (!assigned) {
          const tempKey = `unassigned-${warga.id}`
          if (!groups.has(tempKey)) {
            groups.set(tempKey, {
              kepala: warga,
              anggota: [],
              no_kk: warga.no_kk || '-'
            })
          }
        }
      }
    })

    return Array.from(groups.values())
  })()

  // Get first warga for common data
  const firstWarga = wargaList[0]

  if (userLoading || loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Memuat data...</p>
      </div>
    )
  }

  if (error || wargaList.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="alert alert-danger" role="alert">
          {error || 'Data rumah tidak ditemukan'}
        </div>
        <Link href="/rumah" className="btn btn-primary">
          <FiArrowLeft className="me-2" />
          Kembali ke Daftar Rumah
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link href="/rumah" className="btn btn-outline-secondary me-3">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="page-title mb-0">
              {jalan?.nama_jalan} No. {nomorRumah}
            </h1>
            <p className="text-muted mb-0">
              <span className="badge bg-primary me-2">RT {rt?.nomor_rt || '-'}</span>
              <span className="badge bg-info me-2">{kkGroups.length} KK</span>
              <span className="badge bg-success">{wargaList.length} Penghuni</span>
            </p>
          </div>
        </div>
      </div>

      {/* Info Rumah */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">Informasi Alamat</h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Alamat</td>
                    <td><strong>{jalan?.nama_jalan} No. {nomorRumah}</strong></td>
                  </tr>
                  <tr>
                    <td className="text-muted">RT / RW</td>
                    <td>{rt?.nomor_rt || '-'} / 013</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Perumahan</td>
                    <td>{firstWarga?.perumahan || 'Permata Discovery'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">Wilayah</h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Kelurahan</td>
                    <td>{firstWarga?.kelurahan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kecamatan</td>
                    <td>{firstWarga?.kecamatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kota/Kabupaten</td>
                    <td>{firstWarga?.kota_kabupaten || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar KK */}
      {kkGroups.map((kk, kkIndex) => (
        <div className="card mb-4" key={kk.kepala.id}>
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h6 className="m-0 fw-bold">
              Kartu Keluarga {kkIndex + 1}
              {kk.no_kk !== '-' && <small className="ms-2 fw-normal">- No. {kk.no_kk}</small>}
            </h6>
            <span className="badge bg-light text-dark">
              {1 + kk.anggota.length} Anggota
            </span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama Lengkap</th>
                    <th>Hubungan</th>
                    <th>L/P</th>
                    <th>No HP</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Kepala Keluarga */}
                  <tr>
                    <td>1</td>
                    <td>
                      <strong>{kk.kepala.nama_lengkap}</strong>
                      {kk.kepala.email && (
                        <div className="small text-muted">{kk.kepala.email}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-primary">
                        {getHubunganKeluargaLabel(kk.kepala.hubungan_keluarga)}
                      </span>
                    </td>
                    <td>{getJenisKelaminLabel(kk.kepala.jenis_kelamin)}</td>
                    <td><small>{kk.kepala.no_hp || '-'}</small></td>
                    <td>
                      <span className={`badge ${
                        kk.kepala.status_kependudukan === 'penduduk_tetap' ? 'bg-success' : 'bg-info'
                      }`}>
                        {getStatusKependudukanLabel(kk.kepala.status_kependudukan).replace('Penduduk ', '')}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Link href={`/warga/${kk.kepala.id}`} className="btn btn-outline-primary" title="Lihat Detail">
                          <FiUser />
                        </Link>
                        <Link href={`/warga/edit/${kk.kepala.id}`} className="btn btn-outline-warning" title="Edit">
                          <FiEdit />
                        </Link>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Anggota Keluarga */}
                  {kk.anggota.map((anggota, idx) => (
                    <tr key={anggota.id}>
                      <td>{idx + 2}</td>
                      <td>
                        {anggota.nama_lengkap}
                        {anggota.email && (
                          <div className="small text-muted">{anggota.email}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {getHubunganKeluargaLabel(anggota.hubungan_keluarga)}
                        </span>
                      </td>
                      <td>{getJenisKelaminLabel(anggota.jenis_kelamin)}</td>
                      <td><small>{anggota.no_hp || '-'}</small></td>
                      <td>
                        <span className={`badge ${
                          anggota.status_kependudukan === 'penduduk_tetap' ? 'bg-success' : 'bg-info'
                        }`}>
                          {getStatusKependudukanLabel(anggota.status_kependudukan).replace('Penduduk ', '')}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link href={`/warga/${anggota.id}`} className="btn btn-outline-primary" title="Lihat Detail">
                            <FiUser />
                          </Link>
                          <Link href={`/warga/edit/${anggota.id}`} className="btn btn-outline-warning" title="Edit">
                            <FiEdit />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">Ringkasan</h6>
        </div>
        <div className="card-body">
          <div className="row text-center">
            <div className="col-4">
              <h4 className="text-primary mb-0">{kkGroups.length}</h4>
              <small className="text-muted">Kartu Keluarga</small>
            </div>
            <div className="col-4">
              <h4 className="text-success mb-0">{wargaList.length}</h4>
              <small className="text-muted">Total Penghuni</small>
            </div>
            <div className="col-4">
              <h4 className="text-info mb-0">
                {firstWarga ? calculateLamaTinggal(firstWarga.tanggal_mulai_tinggal, firstWarga.lama_tinggal_tahun, firstWarga.lama_tinggal_bulan) : '-'}
              </h4>
              <small className="text-muted">Lama Tinggal</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}