'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga, RT, Jalan } from '@/types'
import { 
  getHubunganKeluargaLabel, 
  getJenisKelaminLabel,
  getStatusKependudukanLabel,
  calculateLamaTinggal,
  formatDate
} from '@/utils/helpers'
import { FiArrowLeft, FiUser, FiEdit, FiUserPlus, FiUsers, FiHome } from 'react-icons/fi'

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
          .order('hubungan_keluarga')
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
  const kkGroups: KKGroup[] = useMemo(() => {
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
  }, [wargaList])

  // Statistik Rumah
  const stats = useMemo(() => {
    const today = new Date()
    
    const totalJiwa = wargaList.length
    const lakiLaki = wargaList.filter(w => w.jenis_kelamin === 'L').length
    const perempuan = wargaList.filter(w => w.jenis_kelamin === 'P').length
    
    // Hitung umur untuk dewasa (>=17) dan anak (<17)
    const dewasa = wargaList.filter(w => {
      if (!w.tanggal_lahir) return true // Anggap dewasa jika tidak ada tanggal lahir
      const birthDate = new Date(w.tanggal_lahir)
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 17
    }).length
    
    const anak = totalJiwa - dewasa
    
    return { totalJiwa, lakiLaki, perempuan, dewasa, anak, totalKK: kkGroups.length }
  }, [wargaList, kkGroups])

  // Cek apakah user adalah kepala keluarga di rumah ini
  const isKepalaKeluargaRumahIni = useMemo(() => {
    if (!userData?.warga_id) return false
    return wargaList.some(w => 
      w.id === userData.warga_id && w.hubungan_keluarga === 'kepala_keluarga'
    )
  }, [wargaList, userData])

  // Cek apakah user tinggal di rumah ini
  const isTinggalDiRumahIni = useMemo(() => {
    if (!userData?.warga_id) return false
    return wargaList.some(w => w.id === userData.warga_id)
  }, [wargaList, userData])

  // Bisa tambah anggota jika pengurus atau kepala keluarga di rumah ini
  const canAddAnggota = isPengurus || isKepalaKeluargaRumahIni

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
              <span className="badge bg-info me-2">{stats.totalKK} KK</span>
              <span className="badge bg-success">{stats.totalJiwa} Penghuni</span>
            </p>
          </div>
        </div>
        {canAddAnggota && (
          <Link 
            href={`/warga/tambah?jalan_id=${jalanId}&nomor_rumah=${nomorRumah}&rt_id=${rt?.id || ''}`}
            className="btn btn-primary"
          >
            <FiUserPlus className="me-2" />
            Tambah Anggota
          </Link>
        )}
      </div>

      {/* Statistik Rumah */}
      <div className="row mb-4">
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-primary mb-0">{stats.totalJiwa}</h4>
              <small className="text-muted">Total Jiwa</small>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-info mb-0">{stats.totalKK}</h4>
              <small className="text-muted">Kartu Keluarga</small>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-primary mb-0">{stats.lakiLaki}</h4>
              <small className="text-muted">Laki-laki</small>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-danger mb-0">{stats.perempuan}</h4>
              <small className="text-muted">Perempuan</small>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-success mb-0">{stats.dewasa}</h4>
              <small className="text-muted">Dewasa (≥17)</small>
            </div>
          </div>
        </div>
        <div className="col-md-2 col-4 mb-3">
          <div className="card text-center h-100">
            <div className="card-body py-3">
              <h4 className="text-warning mb-0">{stats.anak}</h4>
              <small className="text-muted">Anak (&lt;17)</small>
            </div>
          </div>
        </div>
      </div>

      {/* Info Rumah */}
      <div className="row mb-4">
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiHome className="me-2" />
                Informasi Alamat
              </h6>
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
              <h6 className="m-0 fw-bold">Wilayah Administratif</h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Kelurahan/Desa</td>
                    <td>{firstWarga?.kelurahan || 'Banjarsari'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kecamatan</td>
                    <td>{firstWarga?.kecamatan || 'Manyar'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kota/Kabupaten</td>
                    <td>{firstWarga?.kota_kabupaten || 'Kabupaten Gresik'}</td>
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
              <FiUsers className="me-2" />
              Kartu Keluarga {kkIndex + 1}
              {kk.no_kk !== '-' && <small className="ms-2 fw-normal">- No. {kk.no_kk}</small>}
            </h6>
            <div>
              <span className="badge bg-light text-dark me-2">
                {1 + kk.anggota.length} Anggota
              </span>
              {(isPengurus || kk.kepala.id === userData?.warga_id) && (
                <Link 
                  href={`/warga/tambah?kepala_keluarga_id=${kk.kepala.id}&jalan_id=${jalanId}&nomor_rumah=${nomorRumah}&rt_id=${rt?.id || ''}`}
                  className="btn btn-sm btn-light"
                  title="Tambah Anggota Keluarga"
                >
                  <FiUserPlus />
                </Link>
              )}
            </div>
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
                    <th>Tgl Lahir</th>
                    <th>Pekerjaan</th>
                    <th>No HP</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Kepala Keluarga */}
                  <tr className="table-primary">
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
                    <td><small>{kk.kepala.tanggal_lahir ? formatDate(kk.kepala.tanggal_lahir) : '-'}</small></td>
                    <td><small>{kk.kepala.pekerjaan || '-'}</small></td>
                    <td><small>{kk.kepala.no_hp || '-'}</small></td>
                    <td>
                      <div className="btn-group btn-group-sm">
                        <Link href={`/warga/${kk.kepala.id}`} className="btn btn-outline-primary" title="Lihat Detail">
                          <FiUser />
                        </Link>
                        {(isPengurus || kk.kepala.id === userData?.warga_id) && (
                          <Link href={`/warga/edit/${kk.kepala.id}`} className="btn btn-outline-warning" title="Edit">
                            <FiEdit />
                          </Link>
                        )}
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
                      <td><small>{anggota.tanggal_lahir ? formatDate(anggota.tanggal_lahir) : '-'}</small></td>
                      <td><small>{anggota.pekerjaan || '-'}</small></td>
                      <td><small>{anggota.no_hp || '-'}</small></td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link href={`/warga/${anggota.id}`} className="btn btn-outline-primary" title="Lihat Detail">
                            <FiUser />
                          </Link>
                          {(isPengurus || kk.kepala.id === userData?.warga_id || anggota.id === userData?.warga_id) && (
                            <Link href={`/warga/edit/${anggota.id}`} className="btn btn-outline-warning" title="Edit">
                              <FiEdit />
                            </Link>
                          )}
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

      {/* Lama Tinggal */}
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h6 className="m-0 fw-bold">Informasi Tambahan</h6>
        </div>
        <div className="card-body">
          <table className="table table-borderless table-sm mb-0">
            <tbody>
              <tr>
                <td width="30%" className="text-muted">Lama Tinggal (KK Pertama)</td>
                <td>
                  {firstWarga ? calculateLamaTinggal(firstWarga.tanggal_mulai_tinggal, firstWarga.lama_tinggal_tahun, firstWarga.lama_tinggal_bulan) : '-'}
                </td>
              </tr>
              <tr>
                <td className="text-muted">Status Kependudukan</td>
                <td>
                  {firstWarga ? getStatusKependudukanLabel(firstWarga.status_kependudukan) : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}