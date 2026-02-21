'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Warga, RT, Jalan, Kendaraan, Usaha } from '@/types'
import { 
  formatDate,
  getStatusKependudukanLabel,
  getStatusRumahLabel,
  getStatusPernikahanLabel,
  getJenisKelaminLabel,
  getAgamaLabel,
  getHubunganKeluargaLabel,
  getPendidikanLabel,
  getStatusKTPLabel,
  getStatusKKLabel,
  getStatusSuratDomisiliLabel,
  getStatusPindahLabel,
  getJenisKendaraanLabel,
  getMinatOlahragaLabel,
  formatLamaTinggal,
  maskName,
  maskNIK
} from '@/utils/helpers'
import { 
  FiArrowLeft, FiEdit, FiUser, FiMapPin, FiPhone, FiHome, 
  FiFileText, FiUsers, FiAlertCircle, FiTruck, FiBriefcase
} from 'react-icons/fi'

export default function DetailWargaPage() {
  const params = useParams()
  const wargaId = params.id as string
  
  const { userData, isRW, isRT, isPengurus, loading: userLoading } = useUser()
  const [warga, setWarga] = useState<Warga | null>(null)
  const [anggotaKeluarga, setAnggotaKeluarga] = useState<Warga[]>([])
  const [kendaraanList, setKendaraanList] = useState<Kendaraan[]>([])
  const [usahaList, setUsahaList] = useState<Usaha[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchWarga = async () => {
      try {
        setLoading(true)
        
        const { data, error: fetchError } = await supabase
          .from('warga')
          .select(`
            *,
            rt:rt_id (id, nomor_rt),
            jalan:jalan_id (id, nama_jalan),
            kepala_keluarga:kepala_keluarga_id (id, nama_lengkap)
          `)
          .eq('id', wargaId)
          .single()

        if (fetchError) throw fetchError
        setWarga(data)

        // Fetch anggota keluarga
        if (data.hubungan_keluarga === 'kepala_keluarga') {
          const { data: anggota } = await supabase
            .from('warga')
            .select('*')
            .eq('kepala_keluarga_id', wargaId)
            .eq('is_active', true)
            .order('nama_lengkap')
          setAnggotaKeluarga(anggota || [])
        }

        // Fetch kendaraan
        const { data: kendaraan } = await supabase
          .from('kendaraan')
          .select('*')
          .eq('warga_id', wargaId)
          .order('created_at')
        setKendaraanList(kendaraan || [])

        // Fetch usaha
        const { data: usaha } = await supabase
          .from('usaha')
          .select('*')
          .eq('warga_id', wargaId)
          .order('created_at')
        setUsahaList(usaha || [])

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

  // Check if data should be masked
  const shouldMask = (): boolean => {
    if (!warga) return true
    if (isRW) return false
    if (userData?.warga_id === wargaId) return false
    if (isRT && userData?.rt_id === warga.rt_id) return false
    return true
  }

  const masked = shouldMask()
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

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Link href="/warga" className="btn btn-outline-secondary me-3">
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="page-title mb-0">
              {masked ? maskName(warga.nama_lengkap) : warga.nama_lengkap}
            </h1>
            <p className="text-muted mb-0">
              <span className="badge bg-primary me-2">RT {(warga.rt as RT)?.nomor_rt || '-'}</span>
              <span className={`badge ${
                warga.status_kependudukan === 'penduduk_tetap' ? 'bg-success' :
                warga.status_kependudukan === 'penduduk_kontrak' ? 'bg-info' :
                'bg-warning'
              }`}>
                {getStatusKependudukanLabel(warga.status_kependudukan)}
              </span>
            </p>
          </div>
        </div>
        {canEdit && (
          <Link href={`/warga/edit/${wargaId}`} className="btn btn-warning">
            <FiEdit className="me-2" />
            Edit
          </Link>
        )}
      </div>

      <div className="row">
        {/* A. DATA IDENTITAS PRIBADI */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiUser className="me-2" />
                A. Data Identitas Pribadi
              </h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Nama Lengkap</td>
                    <td><strong>{masked ? maskName(warga.nama_lengkap) : warga.nama_lengkap}</strong></td>
                  </tr>
                  <tr>
                    <td className="text-muted">NIK</td>
                    <td><code>{masked ? maskNIK(warga.nik) : warga.nik}</code></td>
                  </tr>
                  <tr>
                    <td className="text-muted">No. KK</td>
                    <td><code>{warga.no_kk || '-'}</code></td>
                  </tr>
                  <tr>
                    <td className="text-muted">Tempat, Tgl Lahir</td>
                    <td>{warga.tempat_lahir || '-'}, {formatDate(warga.tanggal_lahir || '')}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Jenis Kelamin</td>
                    <td>{getJenisKelaminLabel(warga.jenis_kelamin)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Agama</td>
                    <td>{getAgamaLabel(warga.agama)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Status Pernikahan</td>
                    <td>{getStatusPernikahanLabel(warga.status_pernikahan)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Pendidikan</td>
                    <td>{getPendidikanLabel(warga.pendidikan_terakhir || '')}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Pekerjaan</td>
                    <td>{warga.pekerjaan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Nama Institusi</td>
                    <td>{warga.nama_institusi || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">No. HP/WA</td>
                    <td>{warga.no_hp || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Email</td>
                    <td>{warga.email || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* B. STATUS KEPENDUDUKAN */}
        <div className="col-lg-6 mb-4">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiFileText className="me-2" />
                B. Status Kependudukan
              </h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Status Kependudukan</td>
                    <td>{getStatusKependudukanLabel(warga.status_kependudukan)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Lama Tinggal</td>
                    <td>{formatLamaTinggal(warga.lama_tinggal_tahun, warga.lama_tinggal_bulan)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Status Rumah</td>
                    <td>{getStatusRumahLabel(warga.status_rumah)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* C. ALAMAT DOMISILI */}
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiMapPin className="me-2" />
                C. Alamat Domisili
              </h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Jalan</td>
                    <td>{(warga.jalan as Jalan)?.nama_jalan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">No. Rumah</td>
                    <td>{warga.nomor_rumah}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">RT / RW</td>
                    <td>{(warga.rt as RT)?.nomor_rt || '-'} / 013</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Perumahan</td>
                    <td>{warga.perumahan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kelurahan</td>
                    <td>{warga.kelurahan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kecamatan</td>
                    <td>{warga.kecamatan || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kota/Kabupaten</td>
                    <td>{warga.kota_kabupaten || '-'}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kode Pos</td>
                    <td>{warga.kode_pos || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* D. ALAMAT KTP */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiHome className="me-2" />
                D. Alamat Sesuai KTP
              </h6>
            </div>
            <div className="card-body">
              {warga.alamat_ktp_sama ? (
                <p className="text-muted mb-0">✓ Sama dengan alamat domisili</p>
              ) : (
                <table className="table table-borderless table-sm mb-0">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Alamat</td>
                      <td>{warga.alamat_ktp || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">RT / RW</td>
                      <td>{warga.rt_ktp || '-'} / {warga.rw_ktp || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Kelurahan</td>
                      <td>{warga.kelurahan_ktp || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Kecamatan</td>
                      <td>{warga.kecamatan_ktp || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Kota/Kabupaten</td>
                      <td>{warga.kota_kabupaten_ktp || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Kode Pos</td>
                      <td>{warga.kode_pos_ktp || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* E. STATUS DOKUMEN */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiFileText className="me-2" />
                E. Status Dokumen
              </h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">KTP Elektronik</td>
                    <td>
                      <span className={`badge ${warga.status_ktp === 'ada_aktif' ? 'bg-success' : 'bg-warning'}`}>
                        {getStatusKTPLabel(warga.status_ktp)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Kartu Keluarga</td>
                    <td>
                      <span className={`badge ${warga.status_kk === 'sesuai_domisili' ? 'bg-success' : 'bg-warning'}`}>
                        {getStatusKKLabel(warga.status_kk)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Surat Domisili</td>
                    <td>
                      <span className={`badge ${warga.status_surat_domisili === 'sudah_ada' ? 'bg-success' : 'bg-secondary'}`}>
                        {getStatusSuratDomisiliLabel(warga.status_surat_domisili)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Status Pindah</td>
                    <td>{getStatusPindahLabel(warga.status_pindah)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* F. DATA KELUARGA */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiUsers className="me-2" />
                F. Data Keluarga
              </h6>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td width="40%" className="text-muted">Hubungan</td>
                    <td><strong>{getHubunganKeluargaLabel(warga.hubungan_keluarga)}</strong></td>
                  </tr>
                  {warga.kepala_keluarga && (
                    <tr>
                      <td className="text-muted">Kepala Keluarga</td>
                      <td>
                        <Link href={`/warga/${(warga.kepala_keluarga as Warga).id}`}>
                          {(warga.kepala_keluarga as Warga).nama_lengkap}
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {warga.hubungan_keluarga === 'kepala_keluarga' && anggotaKeluarga.length > 0 && (
                <>
                  <hr />
                  <h6 className="text-primary mb-2">Anggota Keluarga ({anggotaKeluarga.length})</h6>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Nama</th>
                          <th>Hubungan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anggotaKeluarga.map(anggota => (
                          <tr key={anggota.id}>
                            <td>
                              <Link href={`/warga/${anggota.id}`}>{anggota.nama_lengkap}</Link>
                            </td>
                            <td>{getHubunganKeluargaLabel(anggota.hubungan_keluarga)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* G. DATA DARURAT */}
        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="m-0 fw-bold">
                <FiAlertCircle className="me-2" />
                G. Data Darurat
              </h6>
            </div>
            <div className="card-body">
              {warga.nama_kontak_darurat ? (
                <table className="table table-borderless table-sm mb-0">
                  <tbody>
                    <tr>
                      <td width="40%" className="text-muted">Nama Kontak</td>
                      <td>{warga.nama_kontak_darurat}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Hubungan</td>
                      <td>{warga.hubungan_kontak_darurat || '-'}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">No HP</td>
                      <td>{warga.no_hp_darurat || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-muted mb-0">Belum ada data kontak darurat</p>
              )}
            </div>
          </div>
        </div>

        {/* H. DATA TAMBAHAN - Minat Olahraga */}
        {warga.minat_olahraga && warga.minat_olahraga.length > 0 && (
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h6 className="m-0 fw-bold">Minat Olahraga</h6>
              </div>
              <div className="card-body">
                {warga.minat_olahraga.map((minat, idx) => (
                  <span key={idx} className="badge bg-info me-1 mb-1">
                    {getMinatOlahragaLabel(minat)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* H. DATA TAMBAHAN - Kendaraan */}
        {kendaraanList.length > 0 && (
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h6 className="m-0 fw-bold">
                  <FiTruck className="me-2" />
                  Kendaraan ({kendaraanList.length})
                </h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Jenis</th>
                        <th>No. Polisi</th>
                        <th>Merek/Tipe</th>
                        <th>Tahun</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kendaraanList.map(k => (
                        <tr key={k.id}>
                          <td>{getJenisKendaraanLabel(k.jenis_kendaraan)}</td>
                          <td><code>{k.nomor_polisi}</code></td>
                          <td>{k.merek} {k.tipe}</td>
                          <td>{k.tahun_pembuatan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* H. DATA TAMBAHAN - Usaha */}
        {usahaList.length > 0 && (
          <div className="col-lg-6 mb-4">
            <div className="card h-100">
              <div className="card-header bg-primary text-white">
                <h6 className="m-0 fw-bold">
                  <FiBriefcase className="me-2" />
                  Kepemilikan Usaha ({usahaList.length})
                </h6>
              </div>
              <div className="card-body">
                {usahaList.map(u => (
                  <div key={u.id} className="mb-3 pb-3 border-bottom">
                    <h6 className="mb-1">{u.nama_usaha}</h6>
                    {u.deskripsi_usaha && <p className="text-muted small mb-1">{u.deskripsi_usaha}</p>}
                    {u.alamat_usaha && <p className="small mb-1">📍 {u.alamat_usaha}</p>}
                    {u.no_whatsapp_usaha && <p className="small mb-0">📱 {u.no_whatsapp_usaha}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Catatan */}
        {warga.catatan && (
          <div className="col-12 mb-4">
            <div className="card">
              <div className="card-header">
                <h6 className="m-0 fw-bold text-primary">Catatan</h6>
              </div>
              <div className="card-body">
                <p className="mb-0">{warga.catatan}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
