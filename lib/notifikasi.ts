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
 * Send notifications via API route (bypasses RLS issues)
 */
async function sendNotificationsViaAPI(
  notifications: { user_id: string; judul: string; pesan: string; tipe: string; link?: string | null }[]
): Promise<boolean> {
  try {
    console.log('Sending notifications via API:', JSON.stringify(notifications.map(n => ({ user_id: n.user_id, judul: n.judul }))))
    const res = await fetch('/api/notifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications }),
    })

    if (!res.ok) {
      const data = await res.json()
      console.error('Notification API error:', res.status, data.error)
      return false
    }
    console.log('Notifications sent successfully')
    return true
  } catch (err) {
    console.error('Error calling notification API:', err)
    return false
  }
}

/**
 * Create a notification for a single user
 */
export async function createNotifikasi(params: CreateNotifikasiParams) {
  return sendNotificationsViaAPI([{
    user_id: params.user_id,
    judul: params.judul,
    pesan: params.pesan,
    tipe: params.tipe,
    link: params.link || null,
  }])
}

/**
 * Create a notification for multiple users
 */
export async function createNotifikasiBulk(
  userIds: string[],
  data: Omit<CreateNotifikasiParams, 'user_id'>
) {
  if (userIds.length === 0) return true

  const notifications = userIds.map((user_id) => ({
    user_id,
    judul: data.judul,
    pesan: data.pesan,
    tipe: data.tipe,
    link: data.link || null,
  }))

  return sendNotificationsViaAPI(notifications)
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

/**
 * Notify Ketua RW + Ketua RT via server-side API (bypasses RLS on users table lookup)
 * Use this when the caller (e.g., warga) can't query users table due to RLS.
 */
export async function notifyKetuaViaAPI(params: {
  judul: string
  pesan: string
  tipe: TipeNotifikasi
  link?: string | null
  rt_id?: string | null
}): Promise<boolean> {
  try {
    console.log('notifyKetuaViaAPI called with:', params)
    const res = await fetch('/api/notifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notifyPengurus: {
          judul: params.judul,
          pesan: params.pesan,
          tipe: params.tipe,
          link: params.link || null,
          rt_id: params.rt_id || null,
        },
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      console.error('notifyKetuaViaAPI error:', res.status, data.error)
      return false
    }

    const result = await res.json()
    console.log('notifyKetuaViaAPI success:', result)
    return true
  } catch (err) {
    console.error('notifyKetuaViaAPI error:', err)
    return false
  }
}

/**
 * Full server-side warga edit notification flow.
 * Handles: check is_verified, clear rejection_reason, reset verification on RT change,
 * and send notifications to Ketua RW/RT.
 * ALL done server-side via admin client to bypass RLS completely.
 */
export async function notifyWargaEditViaAPI(params: {
  warga_id: string
  nama_warga: string
  rt_id?: string | null
  rt_changed?: boolean
}): Promise<boolean> {
  try {
    console.log('notifyWargaEditViaAPI called with:', params)
    const res = await fetch('/api/notifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wargaEdit: {
          warga_id: params.warga_id,
          nama_warga: params.nama_warga,
          rt_id: params.rt_id || null,
          rt_changed: params.rt_changed || false,
        },
      }),
    })

    const responseText = await res.text()
    console.log('notifyWargaEditViaAPI response:', res.status, responseText)

    if (!res.ok) {
      console.error('notifyWargaEditViaAPI error:', res.status, responseText)
      return false
    }

    return true
  } catch (err) {
    console.error('notifyWargaEditViaAPI fetch error:', err)
    return false
  }
}
