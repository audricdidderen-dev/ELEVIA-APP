import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches dietitian messages for the current user.
 * - Loads all messages (newest first)
 * - Tracks unread count
 * - Provides markAsRead() to mark a message read
 */
export function useDietitianMessages(session) {
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { data, error } = await supabase
        .from('dietitian_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (cancelled || error) return
      if (data) {
        setMessages(data)
        setUnreadCount(data.filter(m => !m.read_at).length)
      }
    }
    fetch()

    // Realtime subscription for new messages
    const channel = supabase
      .channel('diet-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dietitian_messages',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setMessages(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback(async (messageId) => {
    const now = new Date().toISOString()
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read_at: now } : m))
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase
      .from('dietitian_messages')
      .update({ read_at: now })
      .eq('id', messageId)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId || unreadCount === 0) return
    const now = new Date().toISOString()
    setMessages(prev => prev.map(m => ({ ...m, read_at: m.read_at || now })))
    setUnreadCount(0)

    await supabase
      .from('dietitian_messages')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null)
  }, [userId, unreadCount])

  return { messages, unreadCount, markAsRead, markAllAsRead }
}
