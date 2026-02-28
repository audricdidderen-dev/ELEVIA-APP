/**
 * Recipe helpers — dynamic ingredient display + macro calculation
 */

/**
 * Compute display data for a single ingredient.
 *
 * @param {object} ing          - ingredient from recipe JSON
 * @param {Array}  catalogue    - patient's CATALOGUE (plan equivalences)
 * @param {Array}  fullCatalogue - FULL_CATALOGUE (ref_eq_master, fallback)
 * @returns {{ label: string, grams: string|null, usualValue: string|null, prepNote: string|null, isFree: boolean }}
 */
export function computeIngredientDisplay(ing, catalogue, fullCatalogue) {
  // Free ingredient (herbs, spices — no quantity)
  if (ing.isFree) {
    return { label: ing.label, grams: null, usualValue: null, prepNote: null, isFree: true }
  }

  // Static ingredient (fixed qty, not linked to plan)
  if (!ing.eqId) {
    const label = ing.label || ing.name || ''
    const rawQty = ing.qty || null

    // Separate gram-based qty from unit-based qty (e.g. "2 tranches", "1 c.s.")
    const isNumericWeight = rawQty && /^\d+\s*(g|ml|cl|kg)\b/i.test(rawQty.trim())

    // Extract embedded qty from label like "Pain complet (2 tranches)"
    let cleanLabel = label
    let extractedHint = null
    const parenMatch = label.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
    if (parenMatch && !rawQty) {
      cleanLabel = parenMatch[1].trim()
      extractedHint = parenMatch[2].trim()
    }

    return {
      label: cleanLabel,
      grams: isNumericWeight ? rawQty : null,
      usualValue: ing.usualHint || (!isNumericWeight && rawQty ? rawQty : null) || extractedHint || null,
      prepNote: ing.prepNote || null,
      isFree: false,
    }
  }

  // Dynamic ingredient — linked to an equivalence
  const eq = catalogue?.find(c => c.eqId === ing.eqId)
    || fullCatalogue?.find(c => c.eqId === ing.eqId)

  if (!eq || !eq.qtyPlanGrams) {
    return {
      label: ing.label,
      grams: null,
      usualValue: ing.usualHint || null,
      prepNote: ing.prepNote || null,
      isFree: false,
    }
  }

  // --- Find the specific item via itemId ---
  let matchedItem = null
  if (ing.itemId && eq.items?.length > 0) {
    matchedItem = eq.items.find(it => it.itemId === ing.itemId)
  }

  // --- Calculate dynamic grams ---
  const fraction = ing.portionFraction || 1.0
  let grams
  if (matchedItem?.cookedFactor && matchedItem.cookedFactor > 1) {
    // Raw/dry weight: plan grams × fraction ÷ cooked factor
    grams = Math.round(eq.qtyPlanGrams * fraction / matchedItem.cookedFactor)
  } else if (ing.rawRatio) {
    // Legacy fallback: explicit rawRatio from recipe JSON
    grams = Math.round(eq.qtyPlanGrams * ing.rawRatio * fraction)
  } else {
    // Direct: plan grams × fraction
    grams = Math.round(eq.qtyPlanGrams * fraction)
  }

  // --- Compute usual value ---
  let usualValue = null

  // Priority 1: matched item's stepper (precise for this specific ingredient)
  if (matchedItem?.stepper) {
    usualValue = computeUsualFromStepper(grams, matchedItem.stepper)
  }

  // Priority 2: any recommended item stepper in the equivalence (generic fallback)
  if (!usualValue && eq.items?.length > 0) {
    const fallbackItem = eq.items.find(it => it.isRecommended && it.stepper)
      || eq.items.find(it => it.stepper)
    if (fallbackItem?.stepper) {
      usualValue = computeUsualFromStepper(grams, fallbackItem.stepper)
    }
  }

  // Priority 3: hardcoded usualHint in recipe JSON (legacy)
  if (!usualValue) usualValue = ing.usualHint || null

  // --- Determine prepNote ---
  let prepNote = ing.prepNote || null
  if (matchedItem?.cookedFactor && matchedItem.cookedFactor > 1) {
    // Always indicate dry weight when cooked_factor applies
    prepNote = prepNote ? `poids sec, ${prepNote}` : 'poids sec'
  }

  return {
    label: ing.label,
    grams: `${grams} g`,
    usualValue,
    prepNote,
    isFree: false,
  }
}

/**
 * Compute usual display string from a stepper config.
 * Rounds to nearest 0.5 for readability.
 */
function computeUsualFromStepper(grams, stepper) {
  if (!stepper?.usualGPerUnit) return null
  const units = grams / stepper.usualGPerUnit
  const rounded = Math.round(units * 2) / 2 // nearest 0.5
  if (rounded <= 0) return null
  const unitLabel = rounded <= 1 ? stepper.usualUnitSg : stepper.usualUnitPl
  return `≈ ${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} ${unitLabel}`
}

/**
 * Compute recipe macros from eq_summary + patient catalogue.
 *
 * @param {Array} eqSummary      - [{ eqId, portions }, ...]
 * @param {Array} catalogue      - patient's CATALOGUE
 * @param {Array} fullCatalogue  - FULL_CATALOGUE (fallback)
 * @returns {{ kcal: number, p: number, l: number, g: number }|null}
 */
export function computeRecipeMacros(eqSummary, catalogue, fullCatalogue) {
  if (!eqSummary || eqSummary.length === 0) return null

  let kcal = 0, p = 0, l = 0, g = 0
  let hasData = false

  // Deduplicate by eqId — each category counts once, portions always = 1 (V2 spec)
  const seen = new Set()
  for (const entry of eqSummary) {
    if (seen.has(entry.eqId)) continue
    seen.add(entry.eqId)

    const eq = catalogue?.find(c => c.eqId === entry.eqId)
      || fullCatalogue?.find(c => c.eqId === entry.eqId)
    if (!eq?.nutrientsPerPortion) continue

    hasData = true
    // V2: portions is always 1 — ignore any legacy 0.5/2 values
    kcal += eq.nutrientsPerPortion.kcal
    p += eq.nutrientsPerPortion.p
    l += eq.nutrientsPerPortion.l
    g += eq.nutrientsPerPortion.g
  }

  if (!hasData) return null

  return {
    kcal: Math.round(kcal),
    p: Math.round(p),
    l: Math.round(l),
    g: Math.round(g),
  }
}
