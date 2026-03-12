import { createClient } from '@/lib/supabase/client'
import { TipeNotifikasi } from '@/types'

const PENGURUS_RW_ROLES = ['ketua_rw', 'wakil_ketua_rw', 'sekretaris_rw', 'bendahara_rw', 'koordinator_rw']
const PENGURUS_RT_ROLES = ['ketua_rt', 'sekretaris_rt', 'bendahara_rt']

interface CreateNotifikasiParams {
  user_id: string
  judul: string
  pesan: string
  tipe: TipeNotifikasi
  link?: string | null
}

export function dedupe(...arrays: string[][]): string[] {
  const set = new Set<string>()
  for (const arr of arrays) {
    for (const item of arr) set.add(item)
  }
  return Array.from(set)
}

/**
 * Create a notification for a single user
 */
export async function createNotifikasi(params: CreateNotifikasiParams) {
  const supabase = createClient()

  const { error } = await supabase.from('notifikasi').insert({
    user_id: params.user_id,
    judul: params.judul,
    pesan: params.pesan,
    tipe: params.tipe,
    link: params.link || null,
    is_read: false,
  })

  if (error) {
    console.error('Error creating notification:', error)
  }
  return !error
}

/**
 * Create a notification for multiple users
 */
export async function createNotifikasiBulk(
  userIds: string[],
  data: Omit<CreateNotifikasiParams, 'user_id'>
) {
  if (userIds.length === 0) return true
  const supabase = createClient()

  const rows = userIds.map((user_id) => ({
    user_id,
    judul: data.judul,
    pesan: data.pesan,
    tipe: data.tipe,
    link: data.link || null,
    is_read: false,
  }))

  const { error } = await supabase.from('notifikasi').insert(rows)

  if (error) {
    console.error('Error creating bulk notifications:', error)
  }
  return !error
}

/**
 * Get user IDs for all pengurus RW
 */
export async function getPengurusRWUserIds(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true)
    .in('role', PENGURUS_RW_ROLES)
  return data?.map((u: { id: string }) => u.id) || []
}

/**
 * Get user IDs for pengurus RT of a specific RT
 */
export async function getPengurusRTUserIds(rtId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true)
    .eq('rt_id', rtId)
    .in('role', PENGURUS_RT_ROLES)
  return data?.map((u: { id: string }) => u.id) || []
}

/**
 * Get warga user IDs, optionally filtered by RT IDs
 */
export async function getWargaUserIds(rtIds?: string[] | null): Promise<string[]> {
  const supabase = createClient()

  if (rtIds && rtIds.length > 0) {
    const { data: wargaData } = await supabase
      .from('warga')
      .select('id')
      .eq('is_active', true)
      .in('rt_id', rtIds)

    if (!wargaData || wargaData.length === 0) return []

    const wargaIds = wargaData.map((w: { id: string }) => w.id)
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .eq('role', 'warga')
      .in('warga_id', wargaIds)

    return userData?.map((u: { id: string }) => u.id) || []
  }

  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true)
    .eq('role', 'warga')
  return data?.map((u: { id: string }) => u.id) || []
}

/**
 * Notify pengurus RW + pengurus RT of specific RT
 */
export async function notifyPengurusForRT(
  rtId: string | null,
  data: Omit<CreateNotifikasiParams, 'user_id'>
): Promise<void> {
  try {
    const rwIds = await getPengurusRWUserIds()
    const rtIds = rtId ? await getPengurusRTUserIds(rtId) : []
    const allIds = dedupe(rwIds, rtIds)
    if (allIds.length > 0) {
      await createNotifikasiBulk(allIds, data)
    }
  } catch (err) {
    console.error('Error notifying pengurus:', err)
  }
}
