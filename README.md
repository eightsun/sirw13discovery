# SIRW13 - Sistem Informasi RW 013

Sistem Informasi untuk pengelolaan data warga RW 013 Permata Discovery, Desa Banjarsari, Kec. Manyar, Kabupaten Gresik.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Bootstrap 5
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand, React Hook Form
- **Icons**: React Icons (Feather Icons)
- **Deployment**: Vercel

## 📋 Fitur Utama

### Data Warga Lengkap (Sesuai Formulir Pendataan)

#### A. Data Identitas Pribadi
- Nama Lengkap (sesuai KTP)
- NIK (16 digit)
- Nomor KK
- Tempat & Tanggal Lahir
- Jenis Kelamin (L/P)
- Agama
- Status Perkawinan (Belum Kawin/Kawin/Cerai Hidup/Cerai Mati)
- Pendidikan Terakhir (SD s/d S3)
- Pekerjaan & Nama Institusi
- No. HP/WhatsApp
- Email (untuk login)

#### B. Status Kependudukan
- Status Kependudukan: Penduduk Tetap / Kontrak / Menumpang / Pemilik Tidak Tinggal
- Lama Tinggal (Tahun & Bulan)
- Status Rumah: Milik Sendiri / Sewa / Kontrak / Menumpang / Dinas

#### C. Alamat Domisili
- Blok Rumah (Jl. Discovery Timur 1-7 / Barat 1-4)
- No Rumah
- RT / RW
- Perumahan, Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos

#### D. Alamat Sesuai KTP
- Opsi: Sama dengan alamat domisili / Berbeda
- Jika berbeda: Alamat lengkap KTP

#### E. Status Dokumen Kependudukan
- KTP Elektronik: Ada & Aktif / Ada tapi alamat berbeda / Dalam proses pindah / Tidak ada
- Kartu Keluarga: Sesuai domisili / Alamat berbeda / Dalam proses perubahan
- Surat Domisili: Sudah ada / Belum ada
- Status Pindah: Antar RT / Antar RW / Antar Kota / Pendatang Baru

#### F. Data Keluarga
- Hubungan dalam Keluarga (Kepala Keluarga, Istri, Suami, Anak, dll)
- Link ke Kepala Keluarga
- Daftar Anggota Keluarga

#### G. Data Darurat
- Nama Kontak Darurat
- Hubungan
- No HP

#### H. Data Tambahan
- **Kendaraan**: Jenis (Motor/Mobil), Nomor Polisi, Merek, Tipe, Tahun, Warna (bisa multiple)
- **Minat Olahraga**: Futsal, Badminton, Tenis, Golf, Renang, dll (checkbox multiple)
- **Kepemilikan Usaha**: Nama, Deskripsi, Alamat, WhatsApp (bisa multiple)

### Fitur Sistem
- 🔐 Autentikasi (Login/Register)
- 👥 Role-based Access Control (RW, RT, Warga)
- 📊 Dashboard dengan statistik
- 🔍 Pencarian dan filter data warga
- 🔒 Data masking untuk privasi
- 📱 Responsive design

## 👤 Role & Akses

| Role | Lihat Data | Tambah | Edit | Hapus |
|------|------------|--------|------|-------|
| Ketua/Wakil/Sekretaris RW | Semua warga | ✅ | ✅ | ✅ |
| Bendahara RW | Semua warga | ❌ | ❌ | ❌ |
| Ketua/Sekretaris RT | Warga RT sendiri | ✅ | ✅ | ❌ |
| Bendahara RT | Warga RT sendiri | ❌ | ❌ | ❌ |
| Warga | Data sendiri | ❌ | Data sendiri | ❌ |

## 🛠️ Instalasi

### 1. Setup Supabase

1. Buat project baru di [Supabase](https://supabase.com)
2. Buka SQL Editor dan jalankan script `supabase/schema.sql`
3. Catat **Project URL** dan **anon key** dari Settings > API

### 2. Setup Project

```bash
# Clone repository
git clone <repo-url>
cd sirw13

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local dengan kredensial Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Development

```bash
npm run dev
```

Buka http://localhost:3000

### 4. Deploy ke Vercel

1. Push ke GitHub
2. Import repository di Vercel
3. Tambahkan environment variables
4. Deploy

### 5. Konfigurasi Auth Supabase

Di Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

## 📁 Struktur Project

```
sirw13/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── warga/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── edit/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── tambah/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── WargaForm.tsx
├── hooks/
│   └── useUser.ts
├── lib/
│   └── supabase/
│       ├── client.ts
│       ├── middleware.ts
│       └── server.ts
├── store/
│   └── useStore.ts
├── supabase/
│   └── schema.sql
├── types/
│   └── index.ts
├── utils/
│   └── helpers.ts
├── middleware.ts
├── package.json
└── README.md
```

## 📊 Database Schema

### Tabel Utama

- **rt**: Data RT (001-006)
- **jalan**: Data Jalan (Discovery Timur 1-7, Barat 1-4)
- **warga**: Data warga lengkap (semua field A-H)
- **kendaraan**: Data kendaraan warga
- **usaha**: Data usaha warga
- **users**: Profile user (linked to Supabase Auth)

### Enum Types

- `user_role`: ketua_rw, wakil_ketua_rw, sekretaris_rw, bendahara_rw, ketua_rt, sekretaris_rt, bendahara_rt, warga
- `jenis_kelamin`: L, P
- `status_pernikahan`: belum_kawin, kawin, cerai_hidup, cerai_mati
- `agama`: islam, kristen, katolik, hindu, budha, konghucu, lainnya
- `pendidikan_terakhir`: tidak_sekolah, sd, smp, sma, diploma_1-4, sarjana_s1, magister_s2, doktor_s3
- `status_kependudukan`: penduduk_tetap, penduduk_kontrak, menumpang, pemilik_tidak_tinggal
- `status_rumah`: milik_sendiri, sewa, kontrak, menumpang, dinas
- `status_ktp`: ada_aktif, ada_alamat_beda, proses_pindah, tidak_ada
- `status_kk`: sesuai_domisili, alamat_beda, proses_perubahan
- `status_surat_domisili`: sudah_ada, belum_ada
- `status_pindah`: tidak_pindah, pindah_antar_rt, pindah_antar_rw, pindah_antar_kota, pendatang_baru
- `hubungan_keluarga`: kepala_keluarga, istri, suami, anak, orang_tua, mertua, menantu, cucu, kerabat, lainnya
- `jenis_kendaraan`: motor, mobil

## 🔐 Row Level Security

Semua tabel dilindungi dengan RLS:
- Pengurus RW: akses penuh
- Pengurus RT: akses warga di RT-nya
- Warga: akses data sendiri saja

## 🚀 Roadmap

- [x] Phase 1: CRUD Warga dengan form lengkap A-H
- [x] Phase 1: Kendaraan & Usaha management
- [x] Phase 1: Dashboard statistik
- [ ] Phase 2: Upload foto warga
- [ ] Phase 2: Manajemen dokumen
- [ ] Phase 2: Notifikasi
- [ ] Phase 3: Modul Keuangan (Iuran)
- [ ] Phase 3: Modul Kegiatan
- [ ] Phase 3: Laporan & Export

## 📝 License

MIT License

## 👨‍💻 Developer

Dibuat oleh Ichsan Yudha Pratama untuk RW 013 Permata Discovery
