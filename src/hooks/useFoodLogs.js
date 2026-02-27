import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localToday, getWeekBounds } from '../lib/dateUtils'

/**
 * Manages food_logs for the current user.
 * - Fetches today's logs on mount
 * - Provides addLog (optimistic) and deleteLog
 * - Computes weekConsumed from this week's logs
 */
export function useFoodLogs(session, planData) {
  const [logs, setLogs] = useState([])
  const [weekConsumed, setWeekConsumed] = useState({})
  const [weekNutrients, setWeekNutrients] = useState({ kcal: 0, p: 0, l: 0, g: 0 })
  const [loading, setLoading] = useState(true)

  const userId = session?.user?.id
  const planId = planData?._planId

  // getWeekBounds imported from dateUtils (local timezone safe)

  // Fetch today's logs + this week's logs for weekConsumed
  useEffect(() => {
    if (!userId || !planId) return
    let cancelled = false

    async function fetch() {
      setLoading(true)
      const today = localToday()
      const { start, end } = getWeekBounds()

      const [todayRes, weekRes] = await Promise.all([
        supabase.from('food_logs').select('*')
          .eq('user_id', userId).eq('plan_id', planId).eq('log_date', today)
          .order('created_at'),
        supabase.from('food_logs').select('*')
          .eq('user_id', userId).eq('plan_id', planId)
          .gte('log_date', start).lte('log_date', end),
      ])

      if (cancelled) return

      // Transform today's logs to match prototype shape
      const todayLogs = (todayRes.data || []).map(transformLog)
      setLogs(todayLogs)

      // Compute weekConsumed + weekNutrients from all week logs
      const wc = {}
      const wn = { kcal: 0, p: 0, l: 0, g: 0 }
      for (const log of (weekRes.data || [])) {
        const eqId = log.eq_id
        wc[eqId] = (wc[eqId] || 0) + Number(log.qty || 1)
        const transformed = transformLog(log)
        wn.kcal += transformed.kcal
        wn.p += transformed.p
        wn.l += transformed.l
        wn.g += transformed.g
      }
      setWeekConsumed(wc)
      setWeekNutrients({ kcal: Math.round(wn.kcal), p: Math.round(wn.p), l: Math.round(wn.l), g: Math.round(wn.g) })
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [userId, planId])

  // Transform a Supabase food_log row to the app's log shape
  function transformLog(row) {
    // We need to compute kcal/macros from the catalogue (plan + full ref)
    const catalogue = planData?.CATALOGUE || []
    const fullCatalogue = planData?.FULL_CATALOGUE || []
    const slotAllowed = planData?.SLOT_ALLOWED || {}
    const planTargets = planData?.PLAN_TARGETS || {}
    const eq = catalogue.find(e => e.eqId === row.eq_id) || fullCatalogue.find(e => e.eqId === row.eq_id)
    const item = eq?.items?.find(i => i.itemId === row.item_id)
    const qty = Number(row.qty || 1)

    let kcal, p, l, g
    if (item?.nutrientsPerUnit) {
      kcal = Math.round(item.nutrientsPerUnit.kcal * qty)
      p = Math.round(item.nutrientsPerUnit.p * qty * 10) / 10
      l = Math.round(item.nutrientsPerUnit.l * qty * 10) / 10
      g = Math.round(item.nutrientsPerUnit.g * qty * 10) / 10
    } else if (eq) {
      kcal = Math.round(eq.nutrientsPerPortion.kcal * qty)
      p = Math.round(eq.nutrientsPerPortion.p * qty * 10) / 10
      l = Math.round(eq.nutrientsPerPortion.l * qty * 10) / 10
      g = Math.round(eq.nutrientsPerPortion.g * qty * 10) / 10
    } else {
      kcal = 0; p = 0; l = 0; g = 0
    }

    const allowed = slotAllowed[row.slot_id] || []
    const isOutOfPlan = !(row.eq_id in planTargets) || !allowed.includes(row.eq_id)

    return {
      id: row.id,
      slotId: row.slot_id,
      eqId: row.eq_id,
      itemId: row.item_id,
      nbUnits: qty,
      qtyPortion: qty,
      isOutOfPlan,
      kcal, p, l, g,
    }
  }

  // Add a log (optimistic update + persist)
  const addLog = useCallback(async (logEntry) => {
    // logEntry has the shape from AddModal: { id, slotId, eqId, itemId, nbUnits, qtyPortion, isOutOfPlan, kcal, p, l, g }
    // Optimistic: add to local state immediately
    setLogs(prev => [...prev, logEntry])
    setWeekConsumed(prev => ({
      ...prev,
      [logEntry.eqId]: (prev[logEntry.eqId] || 0) + (logEntry.qtyPortion || 1),
    }))
    setWeekNutrients(prev => ({
      kcal: prev.kcal + (logEntry.kcal || 0),
      p: prev.p + (logEntry.p || 0),
      l: prev.l + (logEntry.l || 0),
      g: prev.g + (logEntry.g || 0),
    }))

    // Persist to Supabase
    const today = localToday()
    const { error } = await supabase.from('food_logs').insert({
      user_id: userId,
      plan_id: planId,
      log_date: today,
      slot_id: logEntry.slotId,
      eq_id: logEntry.eqId,
      item_id: logEntry.itemId,
      qty: logEntry.qtyPortion || 1,
      unit: 'portion',
      ...(logEntry.notes ? { notes: logEntry.notes } : {}),
    })

    if (error) {
      console.error('Error saving food log:', error)
      // Rollback optimistic update
      setLogs(prev => prev.filter(l => l.id !== logEntry.id))
      setWeekConsumed(prev => ({
        ...prev,
        [logEntry.eqId]: Math.max(0, (prev[logEntry.eqId] || 0) - (logEntry.qtyPortion || 1)),
      }))
      setWeekNutrients(prev => ({
        kcal: Math.max(0, prev.kcal - (logEntry.kcal || 0)),
        p: Math.max(0, prev.p - (logEntry.p || 0)),
        l: Math.max(0, prev.l - (logEntry.l || 0)),
        g: Math.max(0, prev.g - (logEntry.g || 0)),
      }))
    }
  }, [userId, planId])

  // Delete a log
  const deleteLog = useCallback(async (logId, eqId, qty, kcal = 0, p = 0, l = 0, g = 0) => {
    setLogs(prev => prev.filter(lo => lo.id !== logId))
    setWeekConsumed(prev => ({
      ...prev,
      [eqId]: Math.max(0, (prev[eqId] || 0) - (qty || 1)),
    }))
    setWeekNutrients(prev => ({
      kcal: Math.max(0, prev.kcal - kcal),
      p: Math.max(0, prev.p - p),
      l: Math.max(0, prev.l - l),
      g: Math.max(0, prev.g - g),
    }))

    const { error } = await supabase.from('food_logs').delete().eq('id', logId)
    if (error) console.error('Error deleting food log:', error)
  }, [])

  return { logs, weekConsumed, weekNutrients, loading, addLog, deleteLog }
}
