import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Milestones / badges system.
 * - Fetches achieved milestones on mount
 * - Provides checkAndAward() to detect new milestones after actions
 * - Returns newlyUnlocked for the celebration popup
 */

const MILESTONE_DEFS = [
  { type: 'first_log', label: 'Premier pas', desc: 'Tu as loggé ton premier repas', icon: '🌱', check: (ctx) => ctx.totalLogs >= 1 },
  { type: 'logs_10', label: '10 logs', desc: '10 ajouts, beau début !', icon: '📝', check: (ctx) => ctx.totalLogs >= 10 },
  { type: 'logs_50', label: '50 logs', desc: '50 repas suivis, la routine s\'installe', icon: '📊', check: (ctx) => ctx.totalLogs >= 50 },
  { type: 'logs_100', label: 'Centurion', desc: '100 ajouts — tu es régulier(e)', icon: '💯', check: (ctx) => ctx.totalLogs >= 100 },
  { type: 'streak_3', label: '3 jours', desc: '3 jours de suite, bien joué !', icon: '⭐', check: (ctx) => ctx.streak >= 3 },
  { type: 'streak_7', label: 'Semaine parfaite', desc: '7 jours consécutifs', icon: '🔥', check: (ctx) => ctx.streak >= 7 },
  { type: 'streak_14', label: '2 semaines', desc: '14 jours de suite, impressionnant', icon: '💪', check: (ctx) => ctx.streak >= 14 },
  { type: 'streak_30', label: 'Mois complet', desc: '30 jours consécutifs, exceptionnel !', icon: '🏆', check: (ctx) => ctx.streak >= 30 },
  { type: 'first_bilan', label: 'Premier bilan', desc: 'Tu as évalué ta première semaine', icon: '📋', check: (ctx) => ctx.bilanCount >= 1 },
  { type: 'bilans_4', label: '4 bilans', desc: '1 mois de bilans hebdomadaires', icon: '📈', check: (ctx) => ctx.bilanCount >= 4 },
]

export function useMilestones(session) {
  const [milestones, setMilestones] = useState([]) // achieved milestone types
  const [newlyUnlocked, setNewlyUnlocked] = useState(null) // for popup
  const userId = session?.user?.id

  // Fetch existing milestones on mount
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { data } = await supabase
        .from('user_milestones')
        .select('*')
        .eq('user_id', userId)

      if (cancelled) return
      if (data) setMilestones(data)
    }
    fetch()
    return () => { cancelled = true }
  }, [userId])

  // Local set of milestone types currently being inserted (prevents concurrent duplicates)
  const pendingRef = useRef(new Set())

  // Check context and award new milestones
  const checkAndAward = useCallback(async (context) => {
    if (!userId) return

    const achievedTypes = milestones.map(m => m.milestone_type)
    const toAward = MILESTONE_DEFS.filter(
      def => !achievedTypes.includes(def.type)
        && !pendingRef.current.has(def.type)
        && def.check(context)
    )

    if (toAward.length === 0) return

    // Mark as pending to block concurrent calls
    toAward.forEach(def => pendingRef.current.add(def.type))

    // Award all new milestones (upsert to avoid duplicate insert errors)
    const rows = toAward.map(def => ({
      user_id: userId,
      milestone_type: def.type,
      milestone_value: null,
      achieved_at: new Date().toISOString(),
      notified: false,
    }))

    const { data, error } = await supabase
      .from('user_milestones')
      .upsert(rows, { onConflict: 'user_id,milestone_type' })
      .select()

    // Clear pending flags
    toAward.forEach(def => pendingRef.current.delete(def.type))

    if (data) {
      setMilestones(prev => [...prev, ...data])
      // Show popup for the first newly unlocked
      const firstNew = toAward[0]
      setNewlyUnlocked(firstNew)
    }
    if (error) console.error('checkAndAward upsert error:', error)
  }, [userId, milestones])

  const dismissPopup = useCallback(() => setNewlyUnlocked(null), [])

  return {
    milestones,
    milestoneDefs: MILESTONE_DEFS,
    newlyUnlocked,
    checkAndAward,
    dismissPopup,
  }
}
