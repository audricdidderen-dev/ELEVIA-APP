import { getObjectiveConfig, getScoreLabel } from './objectiveConfig.js'

/**
 * Transform Supabase rows into the exact shapes expected by elevia-prototype.jsx
 */

// Migration 255 sets FIXED usual values for ALL assaisonnement items in DB.
// No hardcoded fallback needed — all values come from ref_eq_items/plan_items.

export function transformPlanData({ profile, plan, equivalences, items, slots, slotMapping, targets, advices, microTips, refMicroTips, measurements, bilans, refEqMaster, refEqItems, videoGuides, recipes, progression, capsules, usualRules, itemVariants, adviceTemplates, questionnaireResponses }) {

  // --- VARIANTS LOOKUP (eq_id + item_id → variants[]) ---
  const variantsByItem = {}
  for (const v of (itemVariants || [])) {
    const key = `${v.parent_eq_id}::${v.parent_item_id}`
    if (!variantsByItem[key]) variantsByItem[key] = []
    variantsByItem[key].push({ label: v.variant_label, rank: v.rank, featured: v.is_featured })
  }

  // --- USUAL RULES LOOKUP (for PROFILE mode resolution) ---
  const rulesByProfile = {}
  for (const rule of (usualRules || [])) {
    const pid = rule.usual_profile_id
    if (!rulesByProfile[pid]) rulesByProfile[pid] = []
    rulesByProfile[pid].push(rule)
  }
  // Sort each profile's rules by min_g ascending
  for (const pid of Object.keys(rulesByProfile)) {
    rulesByProfile[pid].sort((a, b) => Number(a.min_g || 0) - Number(b.min_g || 0))
  }

  /** Resolve PROFILE item → bracket label by matching qty against rules.
   *  PROFILE labels are COMPLETE ("1 c. à soupe", "2 c. à café") — never multiply.
   *  The rules array is attached so the app can re-resolve for different gram targets. */
  function resolveProfileStepper(item, planQty) {
    const profileId = item.usual_profile_id
    const qty = planQty > 0 ? planQty : (Number(item.qty_1x) || 0)
    const rules = rulesByProfile[profileId]
    if (!rules || rules.length === 0) return null
    const match = rules.find(r => {
      const min = Number(r.min_g) || 0
      const max = Number(r.max_g) || 9999
      return qty >= min && qty <= max
    })
    if (!match) return null
    return {
      usualGPerUnit: Number(match.usual_g_per_unit),
      usualUnitSg: match.usual_unit_sg || '',
      usualUnitPl: match.usual_unit_pl || '',
      unitStep: Number(item.app_unit_step) || 1,
      defaultUnits: 1,
      minUnits: 0,
      maxUnits: 10,
      profileLabel: true,  // label is already a complete quantity description
      profileRules: rules,  // all brackets for re-resolution at different gram targets
    }
  }

  // --- CLIENT ---
  const CLIENT = {
    firstName: profile.first_name,
    programme: profile.programme,
    heightCm: Number(profile.height_cm),
    objectiveCode: plan.objective_style || 'PW',
    dietVegetarian: !!plan.diet_vegetarian,
    glutenFree: !!plan.gluten_free,
    lactoseFree: !!plan.lactose_free,
  }

  // --- WEEK_TARGETS / DAY_TARGETS (macros) ---
  const WEEK_TARGETS = {
    kcal: plan.kcal_week,
    p: plan.protein_week_g,
    l: plan.lipids_week_g,
    g: plan.carbs_week_g,
  }
  const DAY_TARGETS = {
    kcal: plan.kcal_day || Math.round(plan.kcal_week / 7),
    p: plan.protein_day_g || Math.round(plan.protein_week_g / 7),
    l: Math.round(plan.lipids_week_g / 7),
    g: Math.round(plan.carbs_week_g / 7),
  }

  // --- CATALOGUE (equivalences + items joined) ---
  // Build cooked_factor lookup from ref_eq_items (always available, even if plan_items lacks it)
  const cookedFactorByItem = {}
  for (const ri of (refEqItems || [])) {
    if (ri.item_id && ri.cooked_factor != null) {
      cookedFactorByItem[ri.item_id] = Number(ri.cooked_factor)
    }
  }

  // Group items by eq_id
  const itemsByEq = {}
  for (const item of items) {
    if (!itemsByEq[item.eq_id]) itemsByEq[item.eq_id] = []
    itemsByEq[item.eq_id].push(item)
  }

  // icon_key lookup from ref_eq_master (Supabase → icon-registry.js)
  const iconKeyByEq = {}
  for (const ref of (refEqMaster || [])) {
    if (ref.icon_key) iconKeyByEq[ref.eq_id] = ref.icon_key
  }

  const CATALOGUE = equivalences.map(eq => ({
    eqId: eq.eq_id,
    label: eq.label_fr,
    eqMode: eq.eq_mode,
    type: eq.type,
    eqGroupId: eq.eq_group_id || null,
    eqImportance: eq.eq_importance,
    iconKey: iconKeyByEq[eq.eq_id] || null,
    icon: (eq.icon && !String(eq.icon).endsWith('.svg')) ? eq.icon : null,
    nutrientsPerPortion: {
      kcal: Number(eq.kcal_per_portion),
      p: Number(eq.protein_per_portion),
      l: Number(eq.lipids_per_portion),
      g: Number(eq.carbs_per_portion),
    },
    refQty: Number(eq.ref_qty) || 0,
    qtyPlanGrams: Number(eq.qty_plan_grams) || 0,
    qtyUi: {
      appInputMode: eq.app_input_mode || 'ITEM_UNIT_STEPPER',
      showItemListDefault: eq.show_item_list_default || false,
      defaultAction: eq.default_action || 'LOG_1_PORTION',
      showGramFallback: eq.show_gram_fallback || false,
      portionStep: Number(eq.portion_step) || 1,
      portionMin: Number(eq.portion_min) || 0,
      portionMax: Number(eq.portion_max) || 10,
    },
    noteElevia: eq.note_elevia || '',
    items: (itemsByEq[eq.eq_id] || []).map(it => ({
      itemId: it.item_id,
      foodLabel: it.food_label,
      isRecommended: it.elevia_pick || false,
      cookedFactor: cookedFactorByItem[it.item_id] || (it.cooked_factor != null ? Number(it.cooked_factor) : null),
      qty1x: Number(it.qty_1x) || 0,
      stepper: (() => {
        const hasDirectUnit = it.usual_g_per_unit != null
        const pid = it.usual_profile_id || null
        const labelIsQuantity = /^[\d½¼⅓⅔¾]/.test(it.usual_unit_sg || '')
        if (hasDirectUnit) {
          return {
            usualGPerUnit: Number(it.usual_g_per_unit),
            usualUnitSg: it.usual_unit_sg || '',
            usualUnitPl: it.usual_unit_pl || '',
            unitStep: Number(it.app_unit_step) || 1,
            defaultUnits: Number(it.app_default_units) || 1,
            minUnits: Number(it.app_min_units) || 0,
            maxUnits: Number(it.app_max_units) || 10,
            ...(pid ? { profileId: pid } : {}),
          }
        }
        if (pid && rulesByProfile[pid]) return resolveProfileStepper(it, Number(eq.qty_plan_grams) || 0)
        return null
      })(),
      nutrientsPerUnit: (it.kcal_per_unit != null && Number(it.kcal_per_unit) > 0) ? {
        kcal: Number(it.kcal_per_unit),
        p: Number(it.protein_per_unit),
        l: Number(it.lipids_per_unit),
        g: Number(it.carbs_per_unit),
      } : null,
      variants: variantsByItem[`${eq.eq_id}::${it.item_id}`] || [],
    })),
  }))

  // All assaisonnement items now have FIXED usual values in DB (migration 255).
  // No post-processing needed.

  // --- SAFETY: Hide EQs with 0 items after allergen filtering (except COMPLETION_ONLY) ---
  const CATALOGUE_FILTERED = CATALOGUE.filter(eq => {
    if (eq.items.length > 0) return true
    if (eq.qtyUi?.appInputMode === 'COMPLETION_ONLY') return true
    return false
  })

  // --- SLOT_QTY (cascade output: qty per eq × slot) ---
  const adjustedState = plan.auto_calculation_log?.adjusted_state || []
  const SLOT_QTY = {}
  for (const entry of adjustedState) {
    const eqId = entry.eq_id
    const sid = entry.slot_id
    if (!SLOT_QTY[eqId]) SLOT_QTY[eqId] = {}
    SLOT_QTY[eqId][sid] = {
      qtyMax: Number(entry.qty_max),
      qtyMin: Number(entry.qty_min),
      freqWeek: Number(entry.freq_week),
    }
  }

  // --- SLOTS ---
  const SLOTS = slots.map(s => ({
    id: s.slot_id,
    label: s.slot_label,
    time: '', // no time stored in DB, filled client-side
  }))
  // No hardcoded times — user schedule varies (night shifts, etc.)
  SLOTS.forEach(s => { if (!s.time) s.time = '' })

  // --- SLOT_ALLOWED ---
  const SLOT_ALLOWED = {}
  for (const sm of slotMapping) {
    if (!SLOT_ALLOWED[sm.slot_id]) SLOT_ALLOWED[sm.slot_id] = []
    SLOT_ALLOWED[sm.slot_id].push(sm.eq_id)
  }

  // --- PLAN_TARGETS (normalize to portions) ---
  const PLAN_TARGETS = {}
  for (const t of targets) {
    const eq = CATALOGUE.find(c => c.eqId === t.eq_id)
    const portionGrams = eq?.qtyPlanGrams || 0
    const raw = Number(t.target_week)
    // If portion size > 1g, target is in grams → convert to portions
    // If portion size <= 1 (count-based eq like fruits), target is already portions
    PLAN_TARGETS[t.eq_id] = portionGrams > 1 ? Math.round(raw / portionGrams) : raw
  }

  // --- ADVICES ---
  const adviceIconKeys = {}
  for (const t of (adviceTemplates || [])) {
    if (t.icon_key) adviceIconKeys[t.advice_id] = t.icon_key
  }

  const ADVICES = advices.map(a => ({
    id: a.template_id,
    module: a.module,
    iconKey: adviceIconKeys[a.template_id] || null,
    title: a.title,
    axis: a.axis,
    priorityScore: a.priority,
    shortBody: a.short_body || '',
    body: a.body || '',
    summaryObjective: a.summary_objective,
    summaryBullets: [a.summary_bullet_1, a.summary_bullet_2, a.summary_bullet_3].filter(Boolean),
    summaryTip: a.summary_tip || '',
    linkedAlertTypes: Array.isArray(a.linked_alert_types) ? a.linked_alert_types : (a.linked_alert_types ? a.linked_alert_types.split(',').map(s => s.trim()).filter(Boolean) : []),
  }))

  // --- MICRO_TIPS (plan overrides > filtered ref) ---
  const objectiveCode = plan.objective_style || 'PW'
  const objectiveGoalGroup = objectiveCode.startsWith('GAIN_') ? 'GAIN' : objectiveCode
  const hasOverrideTips = microTips && microTips.length > 0

  // Goal cascade: ALL → group (GAIN) → exact (GAIN_LEAN/GAIN_COMFORT)
  const matchesTipGoal = (tipGoal) => {
    if (tipGoal === 'ALL') return true
    if (tipGoal === objectiveCode) return true
    if (tipGoal === objectiveGoalGroup) return true
    return false
  }

  const MICRO_TIPS = hasOverrideTips
    ? microTips.map(t => ({ tipId: t.tip_id, category: t.category, textFr: t.text_fr }))
    : (refMicroTips || [])
        .filter(t => {
          const goal = t.display_context || 'ALL'
          if (!matchesTipGoal(goal)) return false
          const diet = t.target_diet || 'ALL'
          if (diet === 'vegetarian' && !plan.diet_vegetarian) return false
          return true
        })
        .map(t => ({ tipId: t.tip_id, category: t.category, textFr: t.text_fr }))

  // --- MEASUREMENTS ---
  const MEASUREMENTS = measurements.map(m => ({
    id: m.id,
    date: m.measured_at,
    weightKg: m.weight_kg != null ? Number(m.weight_kg) : null,
    waistCm: m.waist_cm != null ? Number(m.waist_cm) : null,
    bodyFatPct: m.body_fat_pct != null ? Number(m.body_fat_pct) : null,
    hipCm: m.hip_cm != null ? Number(m.hip_cm) : null,
    muscleMassKg: m.muscle_mass_kg != null ? Number(m.muscle_mass_kg) : null,
  }))

  // --- BILANS ---
  const objConfig = getObjectiveConfig(plan.objective_style || 'PW')
  const BILANS = bilans.map((b, i) => {
    const ws = new Date(b.week_start)
    const we = new Date(b.week_end)
    const weekNum = bilans.length - i + 2 // approximate week numbering
    const fmt = (d) => `${d.getDate()} ${['jan','fév','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'][d.getMonth()]}`
    const score = Number(b.adherence_score) || 0
    return {
      week: `S${weekNum}`,
      dates: `${fmt(ws)}–${fmt(we)}`,
      score,
      label: getScoreLabel(objConfig, score),
      weekStart: b.week_start,
      weekEnd: b.week_end,
      notes: b.notes || null,
    }
  })

  // --- PROFILE_TEXT ---
  const PROFILE_TEXT = plan.profile_text || ''

  // --- FULL_CATALOGUE (from ref_eq_master + ref_eq_items, for "Autres" tab) ---
  // This includes ALL 63 equivalences, not just the plan's subset
  const planEqIds = new Set(equivalences.map(eq => eq.eq_id))

  // Deduplicate ref_eq_items by (eq_id, food_label) — keep first occurrence
  const deduped = []
  const seen = new Set()
  for (const item of (refEqItems || [])) {
    const key = `${item.eq_id}::${item.food_label}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(item)
    }
  }

  // Group ref items by eq_id
  const refItemsByEq = {}
  for (const item of deduped) {
    if (!refItemsByEq[item.eq_id]) refItemsByEq[item.eq_id] = []
    refItemsByEq[item.eq_id].push(item)
  }

  // Icon map for ref EQ (type-based fallback)
  const typeIcons = {
    carbs: '🍞', vvpo: '🍗', fat: '🫒', dairy: '🥛', fruits: '🍎',
    veg: '🥦', extras: '🍫', alcohol: '🍷', toppings: '🧂',
    protein_v: '🌱', vege: '🥬', recipe: '📖',
  }

  // Build obj flags + diet flags lookup from ref_eq_master
  const refFlagsById = {}
  const refDietById = {}
  for (const ref of (refEqMaster || [])) {
    refFlagsById[ref.eq_id] = {
      obj_pw: !!ref.obj_pw,
      obj_mass: !!ref.obj_mass,
      obj_recomp: !!ref.obj_recomp,
      obj_inflammation_health: !!ref.obj_inflammation_health,
    }
    refDietById[ref.eq_id] = {
      vegetarian: !!ref.diet_vegetarian,
      glutenFree: !!ref.gluten_free,
      lactoseFree: !!ref.lactose_free,
    }
  }

  const FULL_CATALOGUE = (refEqMaster || []).map(ref => {
    // If this EQ is in the plan, use the plan version (richer data) + add flags
    const planEq = CATALOGUE.find(c => c.eqId === ref.eq_id)
    if (planEq) return { ...planEq, _objFlags: refFlagsById[ref.eq_id], _dietFlags: refDietById[ref.eq_id] }

    // Build from ref data
    const refItems = refItemsByEq[ref.eq_id] || []
    return {
      eqId: ref.eq_id,
      label: ref.eq_label,
      eqMode: ref.eq_mode,
      type: ref.type,
      eqGroupId: null,
      eqImportance: 'normal',
      iconKey: ref.icon_key || null,
      icon: typeIcons[ref.type] || '🍽️',
      nutrientsPerPortion: {
        kcal: Number(ref.kcal_ref) || 0,
        p: Number(ref.p_ref) || 0,
        l: Number(ref.l_ref) || 0,
        g: Number(ref.g_ref) || 0,
      },
      qtyPlanGrams: 0, // no plan quantity for ref-only EQ
      qtyUi: {
        appInputMode: refItems.length > 0 ? 'ITEM_UNIT_STEPPER' : 'PORTION_TAP',
        showItemListDefault: false,
        defaultAction: ref.eq_mode === 'F' ? 'LOG_COMPLETION' : 'LOG_1_PORTION',
        showGramFallback: false,
        portionStep: 0.25,
        portionMin: 0.25,
        portionMax: 4,
      },
      noteElevia: '',
      items: refItems.map(it => {
        const itemId = it.food_label.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        // Calculate nutrientsPerUnit from ref_eq_master macros if possible
        let nutrientsPerUnit = null
        if (it.usual_g_per_unit && it.qty_1x && Number(it.qty_1x) > 0) {
          const ratio = Number(it.usual_g_per_unit) / Number(it.qty_1x)
          nutrientsPerUnit = {
            kcal: Math.round(Number(ref.kcal_ref) * ratio * 10) / 10,
            p: Math.round(Number(ref.p_ref) * ratio * 100) / 100,
            l: Math.round(Number(ref.l_ref) * ratio * 100) / 100,
            g: Math.round(Number(ref.g_ref) * ratio * 100) / 100,
          }
        }
        return {
          itemId: it.item_id || itemId,
          foodLabel: it.food_label,
          isRecommended: it.elevia_pick || false,
          cookedFactor: it.cooked_factor != null ? Number(it.cooked_factor) : null,
          stepper: it.usual_g_per_unit ? {
            usualGPerUnit: Number(it.usual_g_per_unit),
            usualUnitSg: it.usual_unit_sg || 'portion',
            usualUnitPl: it.usual_unit_pl || 'portions',
            unitStep: Number(it.app_unit_step) || 1,
            defaultUnits: Number(it.app_default_units) || 1,
            minUnits: Number(it.app_min_units) || 0,
            maxUnits: Number(it.app_max_units) || 10,
          } : (it.usual_mode === 'PROFILE' && it.usual_profile_id)
            ? resolveProfileStepper(it, 0)
            : null,
          nutrientsPerUnit,
        }
      }),
      _isRefOnly: true, // flag: this EQ is from ref, not the client's plan
      _objFlags: {
        obj_pw: !!ref.obj_pw,
        obj_mass: !!ref.obj_mass,
        obj_recomp: !!ref.obj_recomp,
        obj_inflammation_health: !!ref.obj_inflammation_health,
      },
      _dietFlags: refDietById[ref.eq_id],
    }
  })

  // --- TYPE_LABELS (static, same for all) ---
  const TYPE_LABELS = {
    carbs: 'Féculents', vvpo: 'Protéines', fat: 'Matières grasses',
    dairy: 'Produits laitiers', fruits: 'Fruits', veg: 'Légumes',
    extras: 'Extras / Plaisir', drinks: 'Boissons',
    alcohol: 'Alcool', toppings: 'Garnitures', protein_v: 'Protéines végétales',
    vege: 'Végétariens', recipe: 'Recettes',
  }

  // --- VIDEO_GUIDES ---
  const VIDEO_GUIDES = (videoGuides || []).map(v => ({
    id: v.id,
    title: v.title,
    description: v.description,
    url: v.youtube_url,
    duration: v.duration_seconds ? `${Math.round(v.duration_seconds / 60)} min` : '',
    displayOrder: v.display_order,
  }))

  // --- RECIPES (filtered by objective + diet) ---
  const parsed = (v) => v ? (typeof v === 'string' ? JSON.parse(v) : v) : []
  const RECIPES = (recipes || [])
    .filter(r => {
      // Objective filter: empty = universal (shown for all objectives)
      const codes = r.objective_codes || []
      if (codes.length > 0 && !codes.includes(objectiveCode)) return false
      // Diet filter: if patient has restriction, recipe must be compatible
      if (plan.diet_vegetarian && !r.is_vegetarian) return false
      if (plan.gluten_free && !r.is_gluten_free) return false
      if (plan.lactose_free && !r.is_lactose_free) return false
      return true
    })
    .map(r => ({
      id: r.id,
      recipeId: r.recipe_id,
      title: r.title,
      description: r.description,
      ingredients: parsed(r.ingredients),
      steps: parsed(r.steps),
      prepTime: r.prep_time_min,
      cookTime: r.cook_time_min,
      servings: r.servings,
      category: r.category,
      difficulty: r.difficulty,
      mealType: r.meal_type,
      eqSummary: parsed(r.eq_summary),
      tip: r.tip,
      isVegetarian: r.is_vegetarian,
      isGlutenFree: r.is_gluten_free,
      isLactoseFree: r.is_lactose_free,
      objectiveCodes: r.objective_codes || [],
      imageUrl: r.image_url,
    }))

  // --- CAPSULES (situation guides) ---
  // Capsule objective_codes may use any variant of the goal name.
  // Build a set of all aliases for the current plan's objective so matching is robust.
  const CAPSULE_OBJ_ALIASES = {
    PW:          ['PDP','PW','weight_loss'],
    weight_loss: ['PDP','PW','weight_loss'],
    PDP:         ['PDP','PW','weight_loss'],
    MAINT:           ['MAINTIEN','MAINT','maintenance'],
    maintenance:     ['MAINTIEN','MAINT','maintenance'],
    MAINTIEN:        ['MAINTIEN','MAINT','maintenance'],
    GAIN_LEAN:       ['GAIN_LEAN','recomposition'],
    recomposition:   ['GAIN_LEAN','recomposition'],
    GAIN_COMFORT:    ['GAIN_COMFORT','GAIN_GUIDE','muscle_gain'],
    muscle_gain:     ['GAIN_COMFORT','GAIN_GUIDE','muscle_gain'],
    GAIN_GUIDE:      ['GAIN_COMFORT','GAIN_GUIDE','muscle_gain'],
  }
  const capsuleAliases = CAPSULE_OBJ_ALIASES[objectiveCode] || [objectiveCode]

  // Questionnaire filter matcher
  function matchesCapsuleFilter(filterRules, questionnaire) {
    if (!filterRules) return false
    for (const [field, expected] of Object.entries(filterRules)) {
      const actual = questionnaire?.[field]
      // If the questionnaire field is absent, don't hide the capsule (default = show)
      if (actual === undefined || actual === null) continue
      if (Array.isArray(expected)) {
        if (!expected.includes(actual)) return false
      } else {
        if (actual !== expected) return false
      }
    }
    return true
  }

  const qr = questionnaireResponses || plan.auto_calculation_log || null
  const CAPSULES = (capsules || []).filter(c => {
    if (c.objective_codes && c.objective_codes.length > 0) {
      // Objective-specific: match if ANY capsule code is in our aliases
      return c.objective_codes.some(code => capsuleAliases.includes(code))
    }
    // Universal capsule: must match questionnaire filter
    if (c.filter_rules) {
      return matchesCapsuleFilter(c.filter_rules, qr)
    }
    // No objective AND no filter → show for everyone
    return true
  }).map(c => ({
    id: c.capsule_id,
    title: c.title,
    subtitle: c.subtitle || '',
    iconKey: c.icon_key || null,
    icon: c.icon || '',
    body: c.body,
    category: c.category,
    displayOrder: c.display_order,
  }))

  return {
    CLIENT,
    WEEK_TARGETS,
    DAY_TARGETS,
    CATALOGUE: CATALOGUE_FILTERED,
    FULL_CATALOGUE,
    SLOTS,
    SLOT_ALLOWED,
    SLOT_QTY,
    PLAN_TARGETS,
    PROFILE_RULES: rulesByProfile,
    ADVICES,
    MICRO_TIPS,
    MEASUREMENTS,
    BILANS,
    PROFILE_TEXT,
    TYPE_LABELS,
    VIDEO_GUIDES,
    RECIPES,
    CAPSULES,
    PROGRESSION: (progression || []).map(p => ({
      phaseNumber: p.phase_number,
      phaseLabel: p.phase_label,
      monthsDisplay: p.months_display,
      focus: p.focus,
      actions: [p.action_1, p.action_2, p.action_3].filter(Boolean),
      indicator: p.indicator,
      mindset: p.mindset,
      kcalDisplay: p.kcal_display,
      kcalDelta: p.kcal_delta,
      eqChanges: [p.eq_change_1, p.eq_change_2, p.eq_change_3].filter(Boolean),
    })),
    // Raw IDs + metadata for persistence layer
    _planId: plan.id,
    _userId: profile.id,
    _planStartDate: plan.plan_start_date || null,
    _lastName: profile.last_name || '',
  }
}
