import { UserRole } from '@/types'

// ==========================================
// FORMATTING
// ==========================================

// Format tanggal ke format Indonesia
export function formatDate(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Format tanggal singkat
export function formatDateShort(date: string | Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ==========================================
// MASKING (untuk privasi)
// ==========================================

// Mask NIK untuk privasi
export function maskNIK(nik: string): string {
  if (!nik || nik.length < 6) return '****'
  return nik.substring(0, 6) + '********' + nik.substring(14)
}

// Mask nama untuk privasi
export function maskName(name: string): string {
  if (!name) return '****'
  const parts = name.split(' ')
  return parts.map(part => part.charAt(0) + '***').join(' ')
}

// ==========================================
// ROLE HELPERS
// ==========================================

export function isRWRole(role: UserRole): boolean {
  return ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw'].includes(role)
}

export function isRTRole(role: UserRole): boolean {
  return ['ketua_rt', 'sekretaris_rt', 'bendahara_rt'].includes(role)
}

export function isPengurusRole(role: UserRole): boolean {
  return isRWRole(role) || isRTRole(role)
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ketua_rw: 'Ketua RW',
    wakil_ketua_rw: 'Wakil Ketua RW',
    sekretaris_rw: 'Sekretaris RW',
    bendahara_rw: 'Bendahara RW',
    ketua_rt: 'Ketua RT',
    sekretaris_rt: 'Sekretaris RT',
    bendahara_rt: 'Bendahara RT',
    warga: 'Warga',
  }
  return labels[role] || role
}

// ==========================================
// LABEL HELPERS - A. DATA IDENTITAS
// ==========================================

export function getJenisKelaminLabel(jk: string): string {
  return jk === 'L' ? 'Laki-laki' : 'Perempuan'
}

export function getAgamaLabel(agama: string): string {
  const labels: Record<string, string> = {
    islam: 'Islam',
    kristen: 'Kristen',
    katolik: 'Katolik',
    hindu: 'Hindu',
    budha: 'Buddha',
    konghucu: 'Konghucu',
    lainnya: 'Lainnya',
  }
  return labels[agama] || agama
}

export function getStatusPernikahanLabel(status: string): string {
  const labels: Record<string, string> = {
    belum_kawin: 'Belum Kawin',
    kawin: 'Kawin',
    cerai_hidup: 'Cerai Hidup',
    cerai_mati: 'Cerai Mati',
  }
  return labels[status] || status
}

export function getPendidikanLabel(pendidikan: string): string {
  const labels: Record<string, string> = {
    tidak_sekolah: 'Tidak Sekolah',
    sd: 'SD',
    smp: 'SMP',
    sma: 'SMA',
    diploma_1: 'Diploma 1',
    diploma_2: 'Diploma 2',
    diploma_3: 'Diploma 3',
    diploma_4: 'Diploma 4',
    sarjana_s1: 'Sarjana (S1)',
    magister_s2: 'Magister (S2)',
    doktor_s3: 'Doktor (S3)',
  }
  return labels[pendidikan] || pendidikan || '-'
}

// ==========================================
// LABEL HELPERS - B. STATUS KEPENDUDUKAN
// ==========================================

export function getStatusKependudukanLabel(status: string): string {
  const labels: Record<string, string> = {
    penduduk_tetap: 'Penduduk Tetap',
    penduduk_kontrak: 'Penduduk Kontrak/Sewa',
    menumpang: 'Menumpang',
    pemilik_tidak_tinggal: 'Pemilik Rumah Tidak Tinggal',
  }
  return labels[status] || status
}

export function getStatusRumahLabel(status: string): string {
  const labels: Record<string, string> = {
    milik_sendiri: 'Milik Sendiri',
    sewa: 'Sewa',
    kontrak: 'Kontrak',
    menumpang: 'Menumpang',
    dinas: 'Dinas',
  }
  return labels[status] || status
}

// ==========================================
// LABEL HELPERS - E. STATUS DOKUMEN
// ==========================================

export function getStatusKTPLabel(status: string): string {
  const labels: Record<string, string> = {
    ada_aktif: 'Ada & Aktif',
    ada_alamat_beda: 'Ada tapi Alamat Berbeda',
    proses_pindah: 'Dalam Proses Pindah',
    tidak_ada: 'Tidak Ada',
  }
  return labels[status] || status
}

export function getStatusKKLabel(status: string): string {
  const labels: Record<string, string> = {
    sesuai_domisili: 'Sesuai Domisili',
    alamat_beda: 'Alamat Berbeda',
    proses_perubahan: 'Dalam Proses Perubahan',
  }
  return labels[status] || status
}

export function getStatusSuratDomisiliLabel(status: string): string {
  const labels: Record<string, string> = {
    sudah_ada: 'Sudah Ada',
    belum_ada: 'Belum Ada',
  }
  return labels[status] || status
}

export function getStatusPindahLabel(status: string): string {
  const labels: Record<string, string> = {
    tidak_pindah: 'Tidak Pindah',
    pindah_antar_rt: 'Pindah Antar RT',
    pindah_antar_rw: 'Pindah Antar RW',
    pindah_antar_kota: 'Pindah Antar Kota',
    pendatang_baru: 'Pendatang Baru',
  }
  return labels[status] || status
}

// ==========================================
// LABEL HELPERS - F. DATA KELUARGA
// ==========================================

export function getHubunganKeluargaLabel(hubungan: string): string {
  const labels: Record<string, string> = {
    kepala_keluarga: 'Kepala Keluarga',
    istri: 'Istri',
    suami: 'Suami',
    anak: 'Anak',
    orang_tua: 'Orang Tua',
    mertua: 'Mertua',
    menantu: 'Menantu',
    cucu: 'Cucu',
    kerabat: 'Kerabat',
    lainnya: 'Lainnya',
  }
  return labels[hubungan] || hubungan
}

// ==========================================
// LABEL HELPERS - H. DATA TAMBAHAN
// ==========================================

export function getJenisKendaraanLabel(jenis: string): string {
  const labels: Record<string, string> = {
    motor: 'Motor',
    mobil: 'Mobil',
  }
  return labels[jenis] || jenis
}

export function getMinatOlahragaLabel(minat: string): string {
  const labels: Record<string, string> = {
    futsal: 'Futsal',
    sepak_bola: 'Sepak Bola',
    badminton: 'Badminton',
    tenis: 'Tenis',
    tenis_meja: 'Tenis Meja',
    golf: 'Golf',
    renang: 'Renang',
    bersepeda: 'Bersepeda',
    lari: 'Lari',
    gym: 'Gym/Fitness',
    yoga: 'Yoga',
    basket: 'Basket',
    voli: 'Voli',
    lainnya: 'Lainnya',
  }
  return labels[minat] || minat
}

// Daftar minat olahraga untuk checkbox
export const MINAT_OLAHRAGA_OPTIONS = [
  { value: 'futsal', label: 'Futsal' },
  { value: 'sepak_bola', label: 'Sepak Bola' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'tenis_meja', label: 'Tenis Meja' },
  { value: 'golf', label: 'Golf' },
  { value: 'renang', label: 'Renang' },
  { value: 'bersepeda', label: 'Bersepeda' },
  { value: 'lari', label: 'Lari' },
  { value: 'gym', label: 'Gym/Fitness' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'basket', label: 'Basket' },
  { value: 'voli', label: 'Voli' },
  { value: 'lainnya', label: 'Lainnya' },
]

// ==========================================
// VALIDATION
// ==========================================

export function validateNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik)
}

export function validateNoKK(noKK: string): boolean {
  return /^\d{16}$/.test(noKK)
}

export function validatePhone(phone: string): boolean {
  return /^(\+62|62|0)[0-9]{9,12}$/.test(phone.replace(/\s/g, ''))
}

// ==========================================
// STRING HELPERS
// ==========================================

export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function truncate(text: string, length: number): string {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

// Format alamat lengkap
export function formatAlamat(
  nomor?: string, 
  jalan?: string,
  perumahan?: string,
  kelurahan?: string,
  kecamatan?: string,
  kota?: string
): string {
  const parts: string[] = []
  if (jalan) parts.push(jalan)
  if (nomor) parts.push(`No. ${nomor}`)
  if (perumahan) parts.push(perumahan)
  if (kelurahan) parts.push(`Kel. ${kelurahan}`)
  if (kecamatan) parts.push(`Kec. ${kecamatan}`)
  if (kota) parts.push(kota)
  return parts.join(', ') || '-'
}

// Format lama tinggal
export function formatLamaTinggal(tahun?: number, bulan?: number): string {
  const parts: string[] = []
  if (tahun && tahun > 0) parts.push(`${tahun} tahun`)
  if (bulan && bulan > 0) parts.push(`${bulan} bulan`)
  return parts.join(' ') || '-'
}
