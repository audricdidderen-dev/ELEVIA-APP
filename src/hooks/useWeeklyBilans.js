import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Manages weekly bilans: syncs from planData, create new ones.
 */
export function useWeeklyBilans(session, planId, initialBilans) {
  const [bilans, setBilans] = useState(initialBilans || [])

  // Sync when planData loads
  useEffect(() => {
    if (initialBilans && initialBilans.length > 0) {
      setBilans(initialBilans)
    }
  }, [initialBilans])

  const userId = session?.user?.id

  const createBilan = useCallback(async ({ weekStart, weekEnd, adherenceScore, energyLevel, hungerLevel, sleepQuality, stressLevel, notes }) => {
    // Prevent duplicate bilan for the same week
    if (bilans.some(b => b.weekStart === weekStart)) {
      return { error: { message: 'Un bilan existe déjà pour cette semaine.' } }
    }

    const { data, error } = await supabase.from('weekly_bilans').insert({
      user_id: userId,
      plan_id: planId,
      week_start: weekStart,
      week_end: weekEnd,
      adherence_score: adherenceScore,
      energy_level: energyLevel,
      hunger_level: hungerLevel,
      sleep_quality: sleepQuality,
      stress_level: stressLevel,
      notes,
    }).select().single()

    if (error) {
      console.error('Error saving bilan:', error)
      return { error }
    }

    // Add to local state
    const scoreLabelMap = (score) => {
      if (score >= 85) return 'Très solide'
      if (score >= 70) return 'Solide'
      if (score >= 55) return 'Correct'
      return 'À ajuster'
    }
    const ws = new Date(weekStart)
    const we = new Date(weekEnd)
    const fmt = (d) => `${d.getDate()} ${['jan','fév','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'][d.getMonth()]}`
    const newBilan = {
      week: `S${bilans.length + 3}`,
      dates: `${fmt(ws)}–${fmt(we)}`,
      score: adherenceScore,
      label: scoreLabelMap(adherenceScore),
      weekStart, weekEnd,
    }
    setBilans(prev => [newBilan, ...prev])
    return { data }
  }, [userId, planId, bilans.length])

  return { bilans, createBilan }
}
