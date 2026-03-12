'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { Notifikasi } from '@/types'

interface UseNotificationsReturn {
  notifications: Notifikasi[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNotifications(limit = 10): UseNotificationsReturn {
  const { userData } = useUser()
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notifikasi[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userData?.id) return

    try {
      setLoading(true)

      const [notifRes, countRes] = await Promise.all([
        supabase
          .from('notifikasi')
          .select('*')
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('notifikasi')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userData.id)
          .eq('is_read', false)
      ])

      if (notifRes.data) {
        setNotifications(notifRes.data)
      }
      setUnreadCount(countRes.count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userData?.id, limit])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!userData?.id) return

    const channel = supabase
      .channel('notifikasi-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userData.id}`
        },
        (payload: { new: Record<string, unknown> }) => {
          setNotifications((prev) => [payload.new as unknown as Notifikasi, ...prev].slice(0, limit))
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userData?.id, limit])

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    if (!userData?.id) return

    const { error } = await supabase
      .from('notifikasi')
      .update({ is_read: true })
      .eq('user_id', userData.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
