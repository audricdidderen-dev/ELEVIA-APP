import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { localToday } from '../lib/dateUtils'

/**
 * Manages measurements: syncs from planData, add new ones.
 */
export function useMeasurements(session, initialMeasurements) {
  const [measurements, setMeasurements] = useState(initialMeasurements || [])

  // Sync when planData loads (initialMeasurements changes from undefined to real data)
  useEffect(() => {
    if (initialMeasurements && initialMeasurements.length > 0) {
      setMeasurements(initialMeasurements)
    }
  }, [initialMeasurements])

  const userId = session?.user?.id

  const addMeasurement = useCallback(async ({ weightKg, waistCm, bodyFatPct, hipCm, muscleMassKg }) => {
    const today = localToday()
    const newMeasure = { date: today, weightKg, waistCm, bodyFatPct, hipCm, muscleMassKg }

    // Optimistic
    setMeasurements(prev => [newMeasure, ...prev])

    const { error } = await supabase.from('measurements').insert({
      user_id: userId,
      measured_at: today,
      weight_kg: weightKg,
      waist_cm: waistCm,
      body_fat_pct: bodyFatPct,
      hip_cm: hipCm,
      muscle_mass_kg: muscleMassKg,
    })

    if (error) {
      console.error('Error saving measurement:', error)
      setMeasurements(prev => prev.filter(m => m.date !== today))
    }
  }, [userId])

  return { measurements, addMeasurement }
}
