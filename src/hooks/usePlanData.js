import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { transformPlanData } from '../lib/transformPlanData'

export function usePlanData(session) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false
    async function fetchAll() {
      setLoading(true)
      setError(null)

      try {
        const userId = session.user.id
        console.log('[usePlanData] Fetching for user:', userId)

        // 1. Get profile (includes active_plan_id)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileErr) {
          console.error('[usePlanData] Profile error:', profileErr)
          throw profileErr
        }
        if (!profile?.active_plan_id) throw new Error('Aucun plan actif trouvé.')

        const planId = profile.active_plan_id
        console.log('[usePlanData] Plan ID:', planId)

        // 2. Fetch all plan data + ref catalogue in parallel
        const results = await Promise.all([
          supabase.from('client_plans').select('*').eq('id', planId).single(),
          supabase.from('plan_equivalences').select('*').eq('plan_id', planId).order('display_order'),
          supabase.from('plan_items').select('*').eq('plan_id', planId).order('item_order'),
          supabase.from('plan_slots').select('*').eq('plan_id', planId).order('slot_order'),
          supabase.from('plan_slot_mapping').select('*').eq('plan_id', planId).order('display_order'),
          supabase.from('plan_targets').select('*').eq('plan_id', planId),
          supabase.from('plan_advices').select('*').eq('plan_id', planId).order('display_order'),
          supabase.from('plan_micro_tips').select('*').eq('plan_id', planId),
          supabase.from('ref_micro_tips').select('*'),
          supabase.from('measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }),
          supabase.from('weekly_bilans').select('*').eq('user_id', userId).order('week_start', { ascending: false }),
          // Full reference catalogue (for "Autres" tab)
          supabase.from('ref_eq_master').select('*').order('eq_id'),
          supabase.from('ref_eq_items').select('*').order('eq_id,item_order'),
          // Content tables
          supabase.from('plan_video_guides').select('*').order('display_order'),
          supabase.from('plan_recipes').select('*').eq('is_active', true),
          supabase.from('plan_progression').select('*').eq('plan_id', planId).order('phase_number'),
          supabase.from('plan_capsules').select('*').order('display_order'),
        ])

        const names = ['client_plans', 'plan_equivalences', 'plan_items', 'plan_slots', 'plan_slot_mapping', 'plan_targets', 'plan_advices', 'plan_micro_tips', 'ref_micro_tips', 'measurements', 'weekly_bilans', 'ref_eq_master', 'ref_eq_items', 'plan_video_guides', 'plan_recipes', 'plan_progression', 'plan_capsules']
        const extracted = {}
        for (let i = 0; i < results.length; i++) {
          const { data: d, error: e } = results[i]
          if (e) {
            console.error(`[usePlanData] ${names[i]} error:`, e)
            throw e
          }
          const count = Array.isArray(d) ? d.length : (d ? 1 : 0)
          console.log(`[usePlanData] ${names[i]}: ${count} rows`)
          extracted[names[i]] = d
        }

        if (cancelled) return

        const transformed = transformPlanData({
          profile,
          plan: extracted.client_plans,
          equivalences: extracted.plan_equivalences,
          items: extracted.plan_items,
          slots: extracted.plan_slots,
          slotMapping: extracted.plan_slot_mapping,
          targets: extracted.plan_targets,
          advices: extracted.plan_advices,
          microTips: extracted.plan_micro_tips,
          refMicroTips: extracted.ref_micro_tips,
          measurements: extracted.measurements,
          bilans: extracted.weekly_bilans,
          refEqMaster: extracted.ref_eq_master,
          refEqItems: extracted.ref_eq_items,
          videoGuides: extracted.plan_video_guides,
          recipes: extracted.plan_recipes,
          progression: extracted.plan_progression,
          capsules: extracted.plan_capsules,
        })

        console.log('[usePlanData] Transformed:', {
          catalogue: transformed.CATALOGUE.length,
          fullCatalogue: transformed.FULL_CATALOGUE.length,
          slots: transformed.SLOTS.length,
          targets: Object.keys(transformed.PLAN_TARGETS).length,
          advices: transformed.ADVICES.length,
          measurements: transformed.MEASUREMENTS.length,
          bilans: transformed.BILANS.length,
        })

        setData(transformed)
      } catch (err) {
        console.error('[usePlanData] Fatal error:', err)
        if (!cancelled) setError(err.message || 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [session?.user?.id])

  return { data, loading, error }
}
