# SIRW13 - Sistem Informasi RW 013 Permata Discovery

Sistem manajemen warga berbasis web untuk RW 013 Permata Discovery, Desa Banjarsari, Kec. Manyar, Kab. Gresik, Jawa Timur.

## 🔗 Links

- **Production**: https://permatadiscovery.vercel.app
- **Repository**: [GitHub Repository URL]
- **Supabase**: [Supabase Dashboard URL]

---

## 📋 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React Framework (App Router) |
| TypeScript | 5.x | Type Safety |
| Supabase | - | Database + Auth + Storage |
| Bootstrap | 5.3 | CSS Framework |
| React Hook Form | - | Form Management |
| React Icons (Feather) | - | Icon Library |
| Vercel | - | Deployment |

---

## 📁 Project Structure

```
sirw13/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── admin/                    # Admin pages
│   │   └── roles/page.tsx        # Kelola Pengurus RW/RT
│   ├── dashboard/page.tsx        # Dashboard utama
│   ├── ipl/                      # Fase 3: IPL Management
│   │   ├── bayar/page.tsx        # Form bayar IPL (warga)
│   │   ├── tagihan/page.tsx      # Daftar tagihan IPL
│   │   └── verifikasi/page.tsx   # Verifikasi pembayaran (bendahara)
│   ├── keuangan/                 # Fase 4: Keuangan
│   │   ├── page.tsx              # Dashboard Kas
│   │   ├── budget/page.tsx       # Budget Tahunan
│   │   ├── laporan/page.tsx      # Laporan Bulanan
│   │   ├── pengajuan/            # Pengajuan Pembelian
│   │   │   ├── page.tsx          # List pengajuan
│   │   │   ├── tambah/page.tsx   # Form tambah
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Detail pengajuan
│   │   │       └── edit/page.tsx # Edit pengajuan
│   │   └── transaksi/            # Transaksi Kas
│   │       ├── page.tsx          # List transaksi
│   │       ├── tambah/page.tsx   # Form tambah manual
│   │       └── import/page.tsx   # Import dari Excel
│   ├── onboarding/page.tsx       # Form onboarding user baru
│   ├── profile/page.tsx          # Halaman profil user
│   ├── pengaturan/               # Pengaturan
│   │   └── tarif/page.tsx        # Pengaturan tarif IPL
│   ├── rumah/                    # Fase 2: Manajemen Rumah
│   │   ├── page.tsx              # Daftar Rumah
│   │   ├── tambah/page.tsx       # Tambah rumah
│   │   └── [id]/page.tsx         # Detail rumah & keluarga
│   ├── warga/                    # Fase 1: Data Warga
│   │   ├── page.tsx              # Daftar Warga
│   │   ├── tambah/page.tsx       # Tambah warga
│   │   └── [id]/
│   │       ├── page.tsx          # Detail warga
│   │       └── edit/page.tsx     # Edit warga
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # Reusable components
│   ├── AuthGuard.tsx             # Route protection
│   ├── Header.tsx                # Top navigation
│   ├── Sidebar.tsx               # Side navigation (with mobile toggle)
│   ├── WargaForm.tsx             # Form warga (create/edit/onboarding)
│   └── ...
│
├── hooks/                        # Custom hooks
│   └── useUser.ts                # User state & role management
│
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client
│
├── types/
│   └── index.ts                  # TypeScript type definitions
│
├── utils/
│   └── helpers.ts                # Utility functions (formatRupiah, isRWRole, etc.)
│
└── public/                       # Static assets
```

---

## 🗄️ Database Schema (Supabase)

### Tables

```
users                    # Auth users dengan role
├── id (uuid, PK)
├── email
├── role (user_role enum)
├── warga_id (FK → warga)
└── nama_lengkap

warga                    # Data warga lengkap
├── id (uuid, PK)
├── nik (unique)
├── nama_lengkap
├── tempat_lahir, tanggal_lahir
├── jenis_kelamin
├── agama
├── status_perkawinan
├── pendidikan_terakhir
├── pekerjaan
├── nomor_rumah
├── rt, kelurahan
├── no_hp, email
├── status_warga (tetap/kontrak/kost)
├── status_kepemilikan
├── status_kk (kepala_keluarga/anggota)
├── nomor_kk
├── hubungan_keluarga
├── tanggal_masuk
├── status_domisili (aktif/pindah/meninggal)
├── foto_url
├── user_id (FK → users)
└── created_by, updated_by

rumah                    # Data rumah
├── id (uuid, PK)
├── nomor_rumah
├── alamat_lengkap
├── rt
├── wilayah (Timur/Barat)
├── status_hunian
├── jumlah_kk
└── catatan

ipl_tagihan              # Tagihan IPL bulanan
├── id (uuid, PK)
├── rumah_id (FK)
├── periode (YYYY-MM)
├── jumlah_tagihan
├── status (belum_bayar/menunggu_verifikasi/lunas)
├── tanggal_bayar
├── bukti_bayar_url
└── verified_by

ipl_tarif                # Pengaturan tarif IPL
├── id, wilayah, tarif_dasar
└── berlaku_mulai

kategori_pengeluaran     # Kategori untuk budget & transaksi
├── id, kode, nama
├── deskripsi
└── is_active

pengajuan_pembelian      # Pengajuan pembelian/pengeluaran
├── id (uuid, PK)
├── nomor_pengajuan (unique, auto: PB/YYYY/MM/XXXX)
├── pemohon_id (FK → users)
├── nama_pemohon, jabatan_pemohon, no_wa
├── deskripsi_pembelian
├── wilayah (Timur/Barat)
├── tanggal_pengajuan, tanggal_target
├── kategori_id (FK)
├── nilai_transaksi
├── link_referensi
├── nota_invoice_url (path, bukan full URL)
├── bukti_transaksi_url
├── bukti_transfer_url
├── bukti_persetujuan_url
├── rekening_penerima, nama_pemilik_rekening, bank
├── catatan_tambahan
├── status (diajukan/direvisi/disetujui/ditolak/dibayar/selesai)
├── riwayat_status (jsonb array)
└── transaksi_id (FK → kas_transaksi)

kas_transaksi            # Transaksi kas masuk/keluar
├── id (uuid, PK)
├── tanggal_transaksi
├── jenis (masuk/keluar)
├── wilayah
├── kategori_id
├── nilai_transaksi
├── keterangan
├── sumber_dana
├── pengajuan_id (FK, nullable)
├── bukti_url
└── created_by

budget_tahunan           # Budget per tahun/wilayah/kategori
├── id, tahun, wilayah
├── kategori_id
├── jumlah_budget
└── created_by
```

### Enums

```sql
-- user_role enum
CREATE TYPE user_role AS ENUM (
  'warga',
  'ketua_rt',
  'sekretaris_rt',
  'bendahara_rt',
  'ketua_rw',
  'wakil_ketua_rw',
  'sekretaris_rw',
  'bendahara_rw',
  'koordinator_rw'  -- BARU ditambahkan
);
```

### Storage Buckets

```
pengajuan/               # File pengajuan pembelian
├── nota/                # Nota/invoice dari pemohon
├── transaksi/           # Bukti transaksi dari pemohon
├── transfer/            # Bukti transfer dari bendahara
└── persetujuan/         # Bukti persetujuan

ipl/                     # Bukti bayar IPL
└── bukti/

warga/                   # Foto warga
└── foto/
```

---

## 👤 Role System

### Role Hierarchy

| Role | Level | Akses |
|------|-------|-------|
| `ketua_rw` | RW | Semua fitur, assign role, approve pengajuan |
| `wakil_ketua_rw` | RW | Sama dengan ketua_rw |
| `sekretaris_rw` | RW | Administrasi, data warga |
| `bendahara_rw` | RW | Keuangan, verifikasi IPL, pembayaran |
| `koordinator_rw` | RW | Keuangan (view & submit), kegiatan |
| `ketua_rt` | RT | Data warga RT, submit pengajuan |
| `sekretaris_rt` | RT | Administrasi RT |
| `bendahara_rt` | RT | Keuangan RT |
| `warga` | - | Data pribadi, bayar IPL |

### Role Checks in Code

```typescript
// hooks/useUser.ts
const rwRoles: UserRole[] = [
  'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 
  'bendahara_rw', 'koordinator_rw'
]

// utils/helpers.ts
export const isRWRole = (role: string): boolean => {
  return ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 
          'bendahara_rw', 'koordinator_rw'].includes(role)
}
```

---

## 🔐 RLS Policies (Key Policies)

### users table
```sql
-- Ketua RW can update any user (untuk assign role)
CREATE POLICY "Users update policy" ON users
FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ketua_rw'
  OR auth.uid() = id
);
```

### pengajuan_pembelian table
```sql
-- SELECT: Semua pengurus bisa lihat
-- INSERT: Semua pengurus bisa buat
-- UPDATE: Semua pengurus bisa update
-- DELETE: Ketua, Wakil, Sekretaris, Bendahara, Koordinator RW

CREATE POLICY "Pengurus can delete pengajuan"
ON pengajuan_pembelian FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN (
      'ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 
      'bendahara_rw', 'koordinator_rw'
    )
  )
);
```

### storage.objects (pengajuan bucket)
```sql
-- DELETE: Authenticated users can delete files
CREATE POLICY "Delete pengajuan files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pengajuan');
```

---

## 🧭 Navigation (Sidebar Menu)

```typescript
// components/Sidebar.tsx - Menu Structure

const menuItems = [
  // WARGA
  { title: 'Dashboard', href: '/dashboard', icon: FiHome, roles: ['all'] },
  { title: 'Profil Saya', href: '/profile', roles: ['all'] },
  
  // IPL
  { title: 'Tagihan IPL', href: '/ipl/tagihan', roles: ['pengurus'] },
  { title: 'Bayar IPL', href: '/ipl/bayar', roles: ['warga'] },
  { title: 'Verifikasi', href: '/ipl/verifikasi', roles: ['bendahara'] },
  { title: 'Pengaturan Tarif', href: '/pengaturan/tarif', roles: ['ketua_rw'] },
  
  // ADMINISTRASI
  { title: 'Kegiatan', href: '/kegiatan', roles: ['pengurus'] },
  
  // KEUANGAN (koordinator_rw included)
  { title: 'Dashboard Kas', href: '/keuangan', roles: ['keuangan_roles'] },
  { title: 'Pengajuan', href: '/keuangan/pengajuan', roles: ['keuangan_roles'] },
  { title: 'Transaksi Kas', href: '/keuangan/transaksi', roles: ['keuangan_roles'] },
  { title: 'Budget Tahunan', href: '/keuangan/budget', roles: ['ketua_bendahara'] },
  { title: 'Laporan Bulanan', href: '/keuangan/laporan', roles: ['keuangan_roles'] },
  
  // DATA MASTER
  { title: 'Daftar Warga', href: '/warga', roles: ['pengurus'] },
  { title: 'Daftar Rumah', href: '/rumah', roles: ['pengurus'] },
  { title: 'Kelola Pengurus', href: '/admin/roles', roles: ['ketua_rw'] },
]
```

---

## 📦 Key Files & Their Purpose

### Core Components

| File | Purpose |
|------|---------|
| `components/Sidebar.tsx` | Navigation dengan role-based menu |
| `components/Header.tsx` | Top bar dengan user info |
| `components/AuthGuard.tsx` | Route protection |
| `components/WargaForm.tsx` | Form warga lengkap |
| `hooks/useUser.ts` | User state, role checks |
| `utils/helpers.ts` | formatRupiah, isRWRole, getRoleLabel |
| `types/index.ts` | TypeScript interfaces |

### Keuangan Module

| File | Purpose |
|------|---------|
| `app/keuangan/page.tsx` | Dashboard kas (saldo, chart) |
| `app/keuangan/pengajuan/page.tsx` | List pengajuan + delete dengan file cleanup |
| `app/keuangan/pengajuan/[id]/page.tsx` | Detail pengajuan + approve/reject/revisi |
| `app/keuangan/pengajuan/[id]/edit/page.tsx` | Edit pengajuan + riwayat status |
| `app/keuangan/pengajuan/tambah/page.tsx` | Form tambah pengajuan |
| `app/keuangan/transaksi/page.tsx` | List transaksi kas |
| `app/keuangan/budget/page.tsx` | Budget tahunan management |
| `app/keuangan/laporan/page.tsx` | Laporan bulanan + PDF |

---

## 🔄 Pengajuan Workflow

```
┌──────────────┐
│   DIAJUKAN   │ ← Pemohon submit
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  DISETUJUI   │ ←── │   DIREVISI   │ ← Ketua minta revisi
└──────┬───────┘     └──────────────┘
       │                    ↑
       │                    │
       │              Pemohon edit & resubmit
       ▼
┌──────────────┐
│   DIBAYAR    │ ← Bendahara upload bukti transfer
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   SELESAI    │ ← Pemohon konfirmasi
└──────────────┘
```

### Status Colors & Icons

| Status | Badge Color | Icon |
|--------|-------------|------|
| diajukan | warning | FiFileText |
| direvisi | info | FiRefreshCw |
| disetujui | success | FiCheckCircle |
| ditolak | danger | FiXCircle |
| dibayar | primary | FiDollarSign |
| selesai | success | FiCheckCircle |

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm/yarn
- Git
- VS Code (recommended)

### Setup
```bash
git clone [repository-url]
cd sirw13
npm install
cp .env.example .env.local
# Edit .env.local dengan Supabase credentials
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Build & Deploy
```bash
npm run build    # Check TypeScript errors
git push         # Auto deploy to Vercel
```

---

## 📝 Recent Updates (March 2026)

### Session: TypeScript Fixes & Koordinator RW Access

1. **TypeScript Strict Mode Compliance**
   - Fixed implicit `any` types in filter/map/reduce callbacks
   - Fixed union type errors for Wilayah field

2. **Koordinator RW Role**
   - Added to `user_role` enum
   - Added to menu access in Sidebar.tsx
   - Added to `isRWRole()` helper
   - Added to `rwRoles` array in useUser.ts
   - Full access to Keuangan menu (except Budget Tahunan)

3. **Delete Pengajuan with File Cleanup**
   - `extractStoragePath()` function handles both:
     - Relative paths: `nota/file.jpg`
     - Full URLs: `https://xxx.supabase.co/storage/v1/object/sign/pengajuan/nota/file.jpg?token=...`
   - Deletes all related files from storage:
     - nota_invoice_url
     - bukti_transaksi_url
     - bukti_transfer_url
     - bukti_persetujuan_url
     - Files from riwayat_status

4. **RLS Policies Updated**
   - users: Ketua RW can update any user
   - pengajuan_pembelian: All pengurus can CRUD
   - storage.objects: Authenticated can delete pengajuan files

5. **Edit Pengajuan Page**
   - Added Riwayat Status section matching Detail page design
   - Timeline with colored icons, dates, names, and notes

---

## 🐛 Known Issues & Solutions

### TypeScript Strict Mode
```typescript
// Problem: Parameter 'u' implicitly has 'any' type
users.filter(u => u.id === id)

// Solution: Add explicit type
users.filter((u: UserWithWarga) => u.id === id)
```

### Storage File Deletion
```typescript
// Problem: URL stored has token query string
// nota_invoice_url: "nota/file.jpg" (relative path)

// Solution: Check if relative path first
const extractStoragePath = (url: string): string | null => {
  if (!url) return null
  if (!url.startsWith('http')) {
    return url.split('?')[0]  // Return path directly
  }
  const match = url.match(/\/pengajuan\/([^?]+)/)
  return match ? match[1] : null
}
```

### RLS Silent Failures
```sql
-- Problem: UPDATE succeeds in frontend but data unchanged
-- Cause: RLS policy blocking silently

-- Solution: Check policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'table_name';

-- And ensure proper USING clause
CREATE POLICY "..." ON table FOR UPDATE
USING (proper_condition);
```

---

## 📚 Transcripts Reference

All development sessions are documented in `/mnt/transcripts/`:

| Date | File | Summary |
|------|------|---------|
| 21 Feb | `sirw13-nextjs-supabase-setup.txt` | Initial project setup |
| 21 Feb | `sirw13-form-update-complete.txt` | Form redesign |
| 22 Feb | `fase2-manajemen-rumah-keluarga.txt` | Rumah & keluarga |
| 22 Feb | `fase3-ipl-implementation.txt` | IPL system |
| 28 Feb | `fase4-keuangan-implementation.txt` | Keuangan start |
| 28 Feb | `fase4-budget-tahunan-setup.txt` | Budget feature |
| 28 Feb | `fase4-kelola-pengurus-sidebar-fix.txt` | Admin roles page |
| 01 Mar | `fase4-kelola-pengurus-typescript-fixes.txt` | TypeScript fixes |

---

## 🚀 Next Steps / TODO

- [ ] Dashboard charts (penggunaan budget, trend IPL)
- [ ] Export to Excel/CSV
- [ ] IPL → Kas automation
- [ ] Notification system (WhatsApp/Email)
- [ ] Kegiatan management module
- [ ] Mobile responsive improvements
- [ ] Unit tests

---

## 👥 Contributors

- **Ichsan Yudha Pratama** - Ketua RW 013, Business Process Manager

---

*Last updated: 01 March 2026*