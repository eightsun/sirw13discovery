// ==========================================
// TYPES & INTERFACES - SIRW13
// Disesuaikan dengan Formulir Pendataan Warga
// ==========================================

// Enum untuk Role User
export type UserRole = 
  | 'ketua_rw' 
  | 'wakil_ketua_rw'
  | 'sekretaris_rw' 
  | 'bendahara_rw' 
  | 'ketua_rt' 
  | 'sekretaris_rt'
  | 'bendahara_rt'
  | 'warga';

// Enum untuk Jenis Kelamin
export type JenisKelamin = 'L' | 'P';

// Enum untuk Status Pernikahan
export type StatusPernikahan = 'belum_kawin' | 'kawin' | 'cerai_hidup' | 'cerai_mati';

// Enum untuk Agama
export type Agama = 'islam' | 'kristen' | 'katolik' | 'hindu' | 'budha' | 'konghucu' | 'lainnya';

// Enum untuk Pendidikan Terakhir
export type PendidikanTerakhir = 
  | 'tidak_sekolah'
  | 'sd'
  | 'smp'
  | 'sma'
  | 'diploma_1'
  | 'diploma_2'
  | 'diploma_3'
  | 'diploma_4'
  | 'sarjana_s1'
  | 'magister_s2'
  | 'doktor_s3';

// B. STATUS KEPENDUDUKAN
export type StatusKependudukan = 
  | 'penduduk_tetap'
  | 'penduduk_kontrak'
  | 'menumpang'
  | 'pemilik_tidak_tinggal';

export type StatusRumah = 
  | 'milik_sendiri'
  | 'sewa'
  | 'kontrak'
  | 'sewa_kontrak'
  | 'menumpang'
  | 'dinas';

// E. STATUS DOKUMEN
export type StatusKTP = 
  | 'ada_aktif'
  | 'ada_alamat_beda'
  | 'proses_pindah'
  | 'tidak_ada';

export type StatusKK = 
  | 'sesuai_domisili'
  | 'alamat_beda'
  | 'proses_perubahan';

export type StatusSuratDomisili = 'sudah_ada' | 'belum_ada';

export type StatusPindah = 
  | 'tidak_pindah'
  | 'pindah_antar_rt'
  | 'pindah_antar_rw'
  | 'pindah_antar_kota'
  | 'pendatang_baru';

// Hubungan Keluarga
export type HubunganKeluarga = 
  | 'kepala_keluarga' 
  | 'istri' 
  | 'suami'
  | 'anak' 
  | 'orang_tua' 
  | 'mertua' 
  | 'menantu' 
  | 'cucu' 
  | 'kerabat' 
  | 'lainnya';

// Jenis Kendaraan
export type JenisKendaraan = 'motor' | 'mobil';

// Minat Olahraga
export type MinatOlahraga = 
  | 'futsal'
  | 'sepak_bola'
  | 'badminton'
  | 'tenis'
  | 'tenis_meja'
  | 'golf'
  | 'renang'
  | 'bersepeda'
  | 'lari'
  | 'gym'
  | 'yoga'
  | 'basket'
  | 'voli'
  | 'lainnya';

// ==========================================
// Interface untuk tabel RT
// ==========================================
export interface RT {
  id: string;
  nomor_rt: string;
  nama_ketua?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Interface untuk tabel Jalan
// ==========================================
export interface Jalan {
  id: string;
  nama_jalan: string;
  rt_id: string;
  rt?: RT;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Interface untuk tabel Warga (UPDATED)
// ==========================================
export interface Warga {
  id: string;
  
  // A. DATA IDENTITAS PRIBADI
  nama_lengkap: string;
  nik: string;
  no_kk?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: JenisKelamin;
  agama: Agama;
  status_pernikahan: StatusPernikahan;
  pendidikan_terakhir?: PendidikanTerakhir;
  pekerjaan?: string;
  nama_institusi?: string;
  no_hp: string;
  email?: string;
  
  // B. STATUS KEPENDUDUKAN
  status_kependudukan: StatusKependudukan;
  tanggal_mulai_tinggal?: string;
  lama_tinggal_tahun?: number;
  lama_tinggal_bulan?: number;
  status_rumah: StatusRumah;
  
  // C. ALAMAT DOMISILI
  jalan_id?: string;
  jalan?: Jalan;
  nomor_rumah: string;
  rt_id: string;
  rt?: RT;
  perumahan?: string;
  kelurahan?: string;
  kecamatan?: string;
  kota_kabupaten?: string;
  kode_pos?: string;
  
  // D. ALAMAT KTP
  alamat_ktp_sama: boolean;
  alamat_ktp?: string;
  rt_ktp?: string;
  rw_ktp?: string;
  kelurahan_ktp?: string;
  kecamatan_ktp?: string;
  kota_kabupaten_ktp?: string;
  kode_pos_ktp?: string;
  
  // E. STATUS DOKUMEN
  status_ktp: StatusKTP;
  status_kk: StatusKK;
  status_surat_domisili: StatusSuratDomisili;
  status_pindah: StatusPindah;
  
  // F. DATA KELUARGA
  kepala_keluarga_id?: string;
  hubungan_keluarga: HubunganKeluarga;
  kepala_keluarga?: Warga;
  anggota_keluarga?: Warga[];
  
  // G. DATA DARURAT
  nama_kontak_darurat?: string;
  hubungan_kontak_darurat?: string;
  no_hp_darurat?: string;
  
  // H. DATA TAMBAHAN (relasi)
  kendaraan?: Kendaraan[];
  minat_olahraga?: string[]; // Array of MinatOlahraga
  usaha?: Usaha[];
  
  // Metadata
  foto_url?: string;
  catatan?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Interface untuk tabel Kendaraan
// ==========================================
export interface Kendaraan {
  id: string;
  warga_id: string;
  jenis_kendaraan: JenisKendaraan;
  nomor_polisi: string;
  merek: string;
  tipe?: string;
  tahun_pembuatan?: number;
  warna?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Interface untuk tabel Usaha
// ==========================================
export interface Usaha {
  id: string;
  warga_id: string;
  nama_usaha: string;
  deskripsi_usaha?: string;
  alamat_usaha?: string;
  no_whatsapp_usaha?: string;
  link_instagram?: string;
  link_tiktok?: string;
  link_website?: string;
  link_twitter?: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Interface untuk tabel Users
// ==========================================
export interface User {
  id: string;
  email: string;
  role: UserRole;
  warga_id?: string;
  warga?: Warga;
  rt_id?: string;
  rt?: RT;
  nama_lengkap?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Form Input Interfaces
// ==========================================
export interface WargaFormInput {
  // A. DATA IDENTITAS PRIBADI
  nama_lengkap: string;
  nik: string;
  no_kk?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: JenisKelamin;
  agama: Agama;
  status_pernikahan: StatusPernikahan;
  pendidikan_terakhir?: PendidikanTerakhir;
  pekerjaan?: string;
  nama_institusi?: string;
  no_hp: string;
  email?: string;
  
  // B. STATUS KEPENDUDUKAN
  status_kependudukan: StatusKependudukan;
  tanggal_mulai_tinggal?: string;
  lama_tinggal_tahun?: number;  // Deprecated, kept for backward compatibility
  lama_tinggal_bulan?: number;  // Deprecated, kept for backward compatibility
  status_rumah: StatusRumah;
  
  // C. ALAMAT DOMISILI
  jalan_id?: string;
  nomor_rumah: string;
  rt_id: string;
  perumahan?: string;
  kelurahan?: string;
  kecamatan?: string;
  kota_kabupaten?: string;
  kode_pos?: string;
  
  // D. ALAMAT KTP
  alamat_ktp_sama: boolean;
  alamat_ktp?: string;
  rt_ktp?: string;
  rw_ktp?: string;
  kelurahan_ktp?: string;
  kecamatan_ktp?: string;
  kota_kabupaten_ktp?: string;
  kode_pos_ktp?: string;
  
  // E. STATUS DOKUMEN
  status_ktp: StatusKTP;
  status_kk: StatusKK;
  status_surat_domisili: StatusSuratDomisili;
  status_pindah: StatusPindah;
  
  // F. DATA KELUARGA
  kepala_keluarga_id?: string;
  hubungan_keluarga: HubunganKeluarga;
  
  // G. DATA DARURAT
  nama_kontak_darurat?: string;
  hubungan_kontak_darurat?: string;
  no_hp_darurat?: string;
  
  // H. DATA TAMBAHAN
  minat_olahraga?: string[];
  
  catatan?: string;
}

export interface KendaraanFormInput {
  jenis_kendaraan: JenisKendaraan;
  nomor_polisi: string;
  merek: string;
  tipe?: string;
  tahun_pembuatan?: number;
  warna?: string;
}

export interface UsahaFormInput {
  nama_usaha: string;
  deskripsi_usaha?: string;
  alamat_usaha?: string;
  no_whatsapp_usaha?: string;
  link_instagram?: string;
  link_tiktok?: string;
  link_website?: string;
  link_twitter?: string;
}

export interface LoginFormInput {
  email: string;
  password: string;
}

export interface RegisterFormInput {
  email: string;
  password: string;
  confirmPassword: string;
  nama_lengkap: string;
}

// ==========================================
// Dashboard Stats
// ==========================================
export interface DashboardStats {
  total_warga: number;
  total_kk: number;
  total_rumah_terisi: number;
  total_rumah_kosong: number;
  warga_per_rt: { rt: string; jumlah: number }[];
}

// Helper type
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

// ==========================================
// FASE 3: IPL Types
// ==========================================

// Interface untuk tabel Rumah
export interface Rumah {
  id: string;
  jalan_id?: string;
  jalan?: Jalan;
  nomor_rumah: string;
  rt_id?: string;
  rt?: RT;
  kepala_keluarga_id?: string;
  kepala_keluarga?: Warga;
  is_occupied: boolean;
  blok: 'Timur' | 'Barat';
  created_at: string;
  updated_at: string;
}

// Interface untuk tabel Tarif IPL
export interface TarifIPL {
  id: number;
  blok: 'Timur' | 'Barat' | 'Semua';
  periode_mulai: string;
  periode_selesai?: string;
  tarif_berpenghuni: number;
  tarif_tidak_berpenghuni?: number;
  keterangan?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Interface untuk tabel Tagihan IPL
export interface TagihanIPL {
  id: string;
  rumah_id: string;
  rumah?: Rumah;
  bulan: string; // Format: 'YYYY-MM-01'
  jumlah_tagihan: number;
  status: 'lunas' | 'belum_lunas' | 'sebagian';
  jumlah_terbayar: number;
  tanggal_lunas?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
}

// Interface untuk tabel Pembayaran IPL
export interface PembayaranIPL {
  id: string;
  rumah_id: string;
  rumah?: Rumah;
  jumlah_dibayar: number;
  tanggal_bayar: string;
  metode: 'transfer' | 'tunai' | 'lainnya';
  bukti_url?: string;
  bukti_file_id?: string;
  dibayar_oleh?: string;
  nama_pembayar?: string;
  bulan_dibayar: string[]; // Array of dates ['2025-01-01', '2025-02-01']
  status: 'pending' | 'verified' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  rejected_reason?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
}

// Form Input Types
export interface TarifIPLFormInput {
  blok: 'Timur' | 'Barat' | 'Semua';
  periode_mulai: string;
  periode_selesai?: string;
  tarif_berpenghuni: number;
  tarif_tidak_berpenghuni?: number;
  keterangan?: string;
}

export interface PembayaranIPLFormInput {
  rumah_id: string;
  bulan_dibayar: string[];
  jumlah_dibayar: number;
  tanggal_bayar: string;
  metode: 'transfer' | 'tunai' | 'lainnya';
  bukti_url?: string;
  bukti_file_id?: string;
  nama_pembayar?: string;
  catatan?: string;
}

// View/Summary Types
export interface IPLSummary {
  rumah_id: string;
  nomor_rumah: string;
  blok: string;
  nama_jalan: string;
  nomor_rt: string;
  kepala_keluarga: string;
  is_occupied: boolean;
  total_tagihan: number;
  total_terbayar: number;
  sisa_tunggakan: number;
  bulan_tunggakan: number;
}

export interface IPLDashboardStats {
  total_rumah: number;
  total_tagihan: number;
  total_terbayar: number;
  total_tunggakan: number;
  persentase_lunas: number;
  tunggakan_per_rt: { rt: string; jumlah: number }[];
  pembayaran_pending: number;
}
