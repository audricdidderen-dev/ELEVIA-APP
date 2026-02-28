import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localToday } from '../lib/dateUtils'

/**
 * Manages daily logging streaks via user_streaks table.
 * - Fetches current streak on mount
 * - Provides incrementStreak() to call after a log is added
 * - Handles streak reset if a day was missed
 */
export function useStreaks(session) {
  const [streak, setStreak] = useState({ current: 0, longest: 0, lastDate: null })
  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', 'daily_log')
        .maybeSingle()

      if (cancelled) return

      if (data) {
        // Check if streak should be reset (missed a day)
        const today = localToday()
        const last = data.last_activity_date
        let current = data.current_streak || 0

        if (last && last !== today) {
          const lastDate = new Date(last)
          const todayDate = new Date(today)
          const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))
          if (diffDays > 1) {
            // Missed a day — reset streak
            current = 0
          }
        }

        setStreak({
          current,
          longest: data.longest_streak || 0,
          lastDate: last,
        })
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [userId])

  const incrementStreak = useCallback(async () => {
    if (!userId) return

    const today = localToday()
    if (streak.lastDate === today) return // Already counted today

    const newCurrent = streak.current + 1
    const newLongest = Math.max(streak.longest, newCurrent)

    // Optimistic update with rollback on failure
    const prev = { ...streak }
    setStreak({ current: newCurrent, longest: newLongest, lastDate: today })

    const { error } = await supabase.from('user_streaks').upsert({
      user_id: userId,
      streak_type: 'daily_log',
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_activity_date: today,
    }, { onConflict: 'user_id,streak_type' })

    if (error) setStreak(prev)
  }, [userId, streak])

  return { streak, incrementStreak }
}
