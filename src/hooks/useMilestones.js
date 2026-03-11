import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Milestones / "Mon parcours" system.
 * - 10 meaningful milestones tied to real nutritional progress
 * - Queue-based popup (shows all newly unlocked one by one)
 * - Concurrent-safe upserts
 */

const MILESTONE_DEFS = [
  // Suivi
  { type: 'first_log', label: 'Premier pas', desc: 'Tu as suivi ton premier repas.', icon: '🌱', category: 'Suivi',
    check: (ctx) => ctx.totalLogs >= 1 },
  { type: 'week_complete', label: 'Semaine complète', desc: '7 jours loggés sur une semaine — la régularité paie.', icon: '📅', category: 'Suivi',
    check: (ctx) => ctx.weekDaysLogged >= 7 },

  // Régularité
  { type: 'streak_7', label: 'Une semaine', desc: '7 jours consécutifs de suivi.', icon: '🔥', category: 'Régularité',
    check: (ctx) => ctx.streak >= 7 },
  { type: 'streak_30', label: 'Un mois', desc: '30 jours consécutifs — la constance est ton meilleur allié.', icon: '🏆', category: 'Régularité',
    check: (ctx) => ctx.streak >= 30 },

  // Bilan
  { type: 'first_bilan', label: 'Premier bilan', desc: 'Tu as évalué ta première semaine.', icon: '📋', category: 'Bilan',
    check: (ctx) => ctx.bilanCount >= 1 },
  { type: 'bilans_4', label: 'Un mois de bilans', desc: '4 bilans hebdomadaires — tu construis une vraie vision de ta progression.', icon: '📈', category: 'Bilan',
    check: (ctx) => ctx.bilanCount >= 4 },

  // Performance
  { type: 'score_85', label: 'Semaine remarquable', desc: 'Score de bilan ≥ 85 — tout est aligné.', icon: '⭐', category: 'Performance',
    check: (ctx) => (ctx.lastBilanScore ?? 0) >= 85 },
  { type: 'score_improve', label: 'Progression', desc: 'Score en hausse 3 semaines de suite.', icon: '📊', category: 'Performance',
    check: (ctx) => {
      const scores = (ctx.bilans || []).slice(0, 3).map(b => b.score)
      if (scores.length < 3) return false
      return scores[0] > scores[1] && scores[1] > scores[2]
    }
  },

  // Corps
  { type: 'first_measure', label: 'Première mesure', desc: 'Ta première pesée est enregistrée — le suivi corporel commence.', icon: '⚖️', category: 'Corps',
    check: (ctx) => ctx.measureCount >= 1 },

  // Nutrition
  { type: 'protein_zone', label: 'Protéines maîtrisées', desc: 'Protéines dans la zone idéale 2 semaines de suite.', icon: '🥩', category: 'Nutrition',
    check: (ctx) => {
      const recent = (ctx.bilans || []).slice(0, 2)
      if (recent.length < 2) return false
      return recent.every(b => {
        try {
          const bd = JSON.parse(b.notes || '{}').bilanData
          const ratio = bd?.breakdown?.protein?.ratio
          return ratio >= 0.9 && ratio <= 1.1
        } catch { return false }
      })
    }
  },
]

export function useMilestones(session) {
  const [milestones, setMilestones] = useState([])
  const [unlockQueue, setUnlockQueue] = useState([])
  const userId = session?.user?.id

  const newlyUnlocked = unlockQueue[0] || null

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

  const pendingRef = useRef(new Set())

  const checkAndAward = useCallback(async (context) => {
    if (!userId) return

    const achievedTypes = milestones.map(m => m.milestone_type)
    const toAward = MILESTONE_DEFS.filter(
      def => !achievedTypes.includes(def.type)
        && !pendingRef.current.has(def.type)
        && def.check(context)
    )

    if (toAward.length === 0) return

    toAward.forEach(def => pendingRef.current.add(def.type))

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

    toAward.forEach(def => pendingRef.current.delete(def.type))

    if (data) {
      setMilestones(prev => [...prev, ...data])
      setUnlockQueue(prev => [...prev, ...toAward])
    }
    if (error) console.error('checkAndAward upsert error:', error)
  }, [userId, milestones])

  const dismissPopup = useCallback(() => {
    setUnlockQueue(prev => prev.slice(1))
  }, [])

  return {
    milestones,
    milestoneDefs: MILESTONE_DEFS,
    newlyUnlocked,
    checkAndAward,
    dismissPopup,
  }
}
