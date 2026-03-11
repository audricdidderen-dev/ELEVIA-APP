import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { localToday, getWeekBounds } from '../lib/dateUtils'

/**
 * Quick-Log hook — search QL catalogue, submit quicklog entries to food_logs,
 * fetch day budget and week adherence.
 */
export function useQuickLog(session) {
  const userId = session?.user?.id

  // Search state
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(0)

  // Categories (for browse mode)
  const [categories, setCategories] = useState([])
  const [catItems, setCatItems] = useState([])
  const [browseLoading, setBrowseLoading] = useState(false)

  // Day budget
  const [dayBudget, setDayBudget] = useState([])
  const [budgetLoading, setBudgetLoading] = useState(false)

  // Week adherence
  const [weekAdherence, setWeekAdherence] = useState([])

  // ── Search ──
  const search = useCallback(async (query, category = null, limit = 20) => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    const seq = ++searchRef.current
    setSearching(true)

    const { data, error } = await supabase.rpc('ql_search', {
      p_query: query,
      p_scope: 'EU',
      p_category: category,
      p_limit: limit,
    })

    if (seq !== searchRef.current) return // stale
    if (error) {
      console.error('ql_search error:', error)
      setResults([])
    } else {
      setResults(data || [])
    }
    setSearching(false)
  }, [])

  const clearSearch = useCallback(() => {
    searchRef.current++
    setResults([])
    setSearching(false)
  }, [])

  // ── Browse categories ──
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('ql_categories')
      .select('id, label, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order')
    if (!error) setCategories(data || [])
  }, [])

  const fetchCategoryItems = useCallback(async (categoryId) => {
    setBrowseLoading(true)
    const { data, error } = await supabase
      .from('ql_items')
      .select(`
        id, slug, label, description, category_id, portion_profile_id, is_featured,
        ql_item_portions ( option_key, grams_or_ml, kcal, p, l, g, confidence ),
        ql_flags ( flag_key )
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .eq('catalog_scope', 'EU')
      .order('popularity_rank', { nullsFirst: false })
      .order('label')

    if (!error) {
      // Reshape to match ql_search output format
      const items = (data || []).map(item => ({
        item_id: item.id,
        slug: item.slug,
        label: item.label,
        description: item.description,
        category_id: item.category_id,
        profile_id: item.portion_profile_id,
        is_featured: item.is_featured,
        portions: item.ql_item_portions
          ? item.ql_item_portions.map(p => ({
              option_key: p.option_key,
              grams_or_ml: p.grams_or_ml,
              kcal: p.kcal,
              p: p.p,
              l: p.l,
              g: p.g,
              confidence: p.confidence,
            }))
          : [],
        flags: item.ql_flags ? item.ql_flags.map(f => f.flag_key) : [],
      }))
      setCatItems(items)
    }
    setBrowseLoading(false)
  }, [])

  // ── Fetch Apero items (for session mode) ──
  const fetchAperoItems = useCallback(async () => {
    const [itemsRes, optionsRes] = await Promise.all([
      supabase
        .from('ql_items')
        .select(`
          id, slug, label, description, portion_profile_id, is_featured,
          ql_item_portions ( option_key, grams_or_ml, kcal, p, l, g ),
          ql_flags ( flag_key )
        `)
        .eq('category_id', 'APERO')
        .eq('is_active', true)
        .order('popularity_rank', { nullsFirst: false })
        .order('label'),
      supabase
        .from('ql_portion_options')
        .select('portion_profile_id, option_key, label_short, label_long'),
    ])

    if (itemsRes.error) {
      console.error('fetchAperoItems error:', itemsRes.error)
      return []
    }

    // Build label lookup from portion options
    const optLabels = {}
    for (const opt of (optionsRes.data || [])) {
      optLabels[`${opt.portion_profile_id}::${opt.option_key}`] = opt.label_short || opt.label_long || opt.option_key
    }

    // Enrich item portions with label_short
    return (itemsRes.data || []).map(item => ({
      ...item,
      ql_item_portions: (item.ql_item_portions || []).map(p => ({
        ...p,
        label_short: optLabels[`${item.portion_profile_id}::${p.option_key}`] || p.option_key,
      })),
    }))
  }, [])

  // ── Submit Quick-Log ──
  const submitQuickLog = useCallback(async ({
    slotId,
    qlItemId,
    optionKey,
    labelSnapshot,
    portionLabelSnapshot,
    kcal, p, l, g,
    flagsSnapshot,
    slotStatus = 'REPLACED',
    planId = null,
  }) => {
    if (!userId) return { error: 'No user' }

    const today = localToday()
    const row = {
      user_id: userId,
      log_date: today,
      slot_id: slotId,
      log_type: 'quicklog',
      slot_status: slotStatus,
      ql_item_id: qlItemId,
      ql_option_key: optionKey,
      label_snapshot: labelSnapshot,
      portion_label_snapshot: portionLabelSnapshot,
      kcal_snapshot: kcal,
      p_snapshot: p,
      l_snapshot: l,
      g_snapshot: g,
      flags_snapshot: flagsSnapshot?.length > 0 ? flagsSnapshot : null,
      ...(planId ? { plan_id: planId } : {}),
    }

    const { data, error } = await supabase
      .from('food_logs')
      .insert(row)
      .select()
      .single()

    if (error) {
      console.error('submitQuickLog error:', error)
      return { error }
    }
    return { data }
  }, [userId])

  // ── Soft-delete a quick-log ──
  const deleteQuickLog = useCallback(async (logId) => {
    const { error } = await supabase
      .from('food_logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', logId)

    if (error) console.error('deleteQuickLog error:', error)
    return { error }
  }, [])

  // ── Day budget (RPC) ──
  const fetchDayBudget = useCallback(async (date = null) => {
    if (!userId) return
    setBudgetLoading(true)

    const { data, error } = await supabase.rpc('get_day_budget', {
      p_user_id: userId,
      p_date: date || localToday(),
    })

    if (!error) setDayBudget(data || [])
    else console.error('get_day_budget error:', error)
    setBudgetLoading(false)
  }, [userId])

  // ── Week adherence (RPC) ──
  const fetchWeekAdherence = useCallback(async () => {
    if (!userId) return
    const { start } = getWeekBounds()

    const { data, error } = await supabase.rpc('get_week_adherence', {
      p_user_id: userId,
      p_week_start: start,
    })

    if (!error) setWeekAdherence(data || [])
    else console.error('get_week_adherence error:', error)
  }, [userId])

  return {
    // Search
    results, searching, search, clearSearch,
    // Browse
    categories, catItems, browseLoading, fetchCategories, fetchCategoryItems,
    // Submit
    submitQuickLog, deleteQuickLog, fetchAperoItems,
    // Budget & adherence
    dayBudget, budgetLoading, fetchDayBudget,
    weekAdherence, fetchWeekAdherence,
  }
}
