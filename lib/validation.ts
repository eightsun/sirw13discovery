import { z } from 'zod'

// === IPL Tagihan Schemas ===

export const bayarSchema = z.object({
  action: z.literal('bayar'),
  rumah_id: z.string().min(1, 'rumah_id wajib diisi'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/, 'Format bulan harus YYYY-MM'),
  jumlah_dibayar: z.union([z.number(), z.string()]).transform(v => {
    const n = typeof v === 'string' ? parseInt(v) : v
    return isNaN(n) ? 0 : n
  }).pipe(z.number().int().min(0, 'Jumlah tidak boleh negatif').max(100_000_000, 'Jumlah terlalu besar')),
  jumlah_tagihan: z.union([z.number(), z.string()]).optional().transform(v => {
    if (v === undefined || v === null) return undefined
    const n = typeof v === 'string' ? parseInt(v) : v
    return isNaN(n) ? undefined : n
  }).pipe(z.number().int().min(0).max(100_000_000).optional()),
  metode: z.string().max(50).default('tunai'),
  catatan: z.string().max(500).optional().nullable(),
})

export const toggleOccupiedSchema = z.object({
  action: z.literal('toggle_occupied'),
  rumah_id: z.string().min(1),
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
  is_occupied: z.boolean(),
  jumlah_tagihan: z.number().int().min(0).max(100_000_000).optional(),
})

export const hapusBayarSchema = z.object({
  action: z.literal('hapus_bayar'),
  rumah_id: z.string().min(1),
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
})

export const generateSchema = z.object({
  action: z.literal('generate'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/),
  default_tarif: z.number().int().min(0).max(100_000_000).optional(),
})

// === Notifikasi Schemas ===

export const notifyPengurusSchema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi').max(200),
  pesan: z.string().min(1, 'Pesan wajib diisi').max(1000),
  tipe: z.string().min(1).max(50),
  link: z.string().max(500).optional().nullable(),
  rt_id: z.string().optional().nullable(),
})

export const notificationItemSchema = z.object({
  user_id: z.string().min(1),
  judul: z.string().min(1).max(200),
  pesan: z.string().min(1).max(1000),
  tipe: z.string().min(1).max(50),
  link: z.string().max(500).optional().nullable(),
})

// === Helper ===

/**
 * Safely parse request body with Zod schema.
 * Returns parsed data or error message string.
 */
export function safeParseBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
  return { success: false, error: messages }
}
