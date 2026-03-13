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

        // 1. Get profile (includes active_plan_id)
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (profileErr) {
          console.error('[usePlanData] Profile error:', profileErr)
          throw new Error('Ton profil n\'a pas encore été configuré. Contacte ton diététicien pour activer ton plan.')
        }
        if (!profile?.active_plan_id) throw new Error('Aucun plan alimentaire n\'est encore associé à ton compte. Contacte ton diététicien pour démarrer.')

        const planId = profile.active_plan_id

        // 2. Fetch all plan data + ref catalogue in parallel
        const results = await Promise.all([
          supabase.from('client_plans').select('*').eq('id', planId).single(),
          supabase.from('plan_equivalences').select('*').eq('plan_id', planId).order('display_order'),
          supabase.from('plan_items').select('*').eq('plan_id', planId).eq('is_active', true).order('item_order'),
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
          // Content tables (video_guides + capsules are global, no plan_id column)
          supabase.from('plan_video_guides').select('*').order('display_order'),
          supabase.from('plan_recipes').select('*').eq('is_active', true),
          supabase.from('plan_progression').select('*').eq('plan_id', planId).order('phase_number'),
          supabase.from('plan_capsules').select('*').order('display_order'),
          supabase.from('calc_usual_rules').select('*'),
          supabase.from('ref_item_variants').select('*').order('parent_eq_id').order('parent_item_id').order('rank'),
          supabase.from('calc_advice_templates').select('advice_id, icon_key'),
        ])

        const names = ['client_plans', 'plan_equivalences', 'plan_items', 'plan_slots', 'plan_slot_mapping', 'plan_targets', 'plan_advices', 'plan_micro_tips', 'ref_micro_tips', 'measurements', 'weekly_bilans', 'ref_eq_master', 'ref_eq_items', 'plan_video_guides', 'plan_recipes', 'plan_progression', 'plan_capsules', 'calc_usual_rules', 'ref_item_variants', 'calc_advice_templates']
        const extracted = {}
        for (let i = 0; i < results.length; i++) {
          const { data: d, error: e } = results[i]
          if (e) {
            console.error(`[usePlanData] ${names[i]} error:`, e)
            throw new Error('Un problème est survenu lors du chargement de ton plan. Réessaie ou contacte ton diététicien.')
          }
          extracted[names[i]] = d
        }

        if (cancelled) return

        // 3. Fetch questionnaire responses (for capsule filtering)
        let questionnaireResponses = null
        if (profile.client_id) {
          const { data: client } = await supabase
            .from('clients')
            .select('questionnaire_id')
            .eq('id', profile.client_id)
            .single()
          if (client?.questionnaire_id) {
            const { data: qr } = await supabase
              .from('questionnaire_responses')
              .select('responses')
              .eq('id', client.questionnaire_id)
              .single()
            questionnaireResponses = qr?.responses || null
          }
        }
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
          usualRules: extracted.calc_usual_rules,
          itemVariants: extracted.ref_item_variants,
          adviceTemplates: extracted.calc_advice_templates,
          questionnaireResponses,
        })

        setData(transformed)
      } catch (err) {
        console.error('[usePlanData] Fatal error:', err)
        if (!cancelled) setError(err.message || 'Un problème est survenu. Réessaie dans quelques instants.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [session?.user?.id])

  return { data, loading, error }
}
