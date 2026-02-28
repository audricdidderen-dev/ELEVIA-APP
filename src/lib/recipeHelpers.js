/**
 * Recipe helpers — dynamic ingredient display + macro calculation
 */

/**
 * Compute display data for a single ingredient.
 *
 * @param {object} ing         - ingredient from recipe JSON
 * @param {Array}  catalogue   - patient's CATALOGUE (plan equivalences)
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
    const isGrams = rawQty && /^\d+\s*g$/i.test(rawQty.trim())
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
    // No plan grams available — show label + usualHint only
    return {
      label: ing.label,
      grams: null,
      usualValue: ing.usualHint || null,
      prepNote: ing.prepNote || null,
      isFree: false,
    }
  }

  // Calculate dynamic grams
  const rawGrams = eq.qtyPlanGrams * (ing.rawRatio || 1)
  const grams = Math.round(rawGrams)

  // Compute usual value: dynamic from stepper FIRST, usualHint as fallback
  let usualValue = null
  if (eq.items?.length > 0) {
    const item = eq.items.find(it => it.isRecommended && it.stepper)
      || eq.items.find(it => it.stepper)
    if (item?.stepper) {
      const units = grams / item.stepper.usualGPerUnit
      const rounded = Math.round(units * 2) / 2 // round to nearest 0.5
      if (rounded > 0) {
        const unitLabel = rounded <= 1 ? item.stepper.usualUnitSg : item.stepper.usualUnitPl
        usualValue = `≈ ${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} ${unitLabel}`
      }
    }
  }
  if (!usualValue) usualValue = ing.usualHint || null

  return {
    label: ing.label,
    grams: `${grams} g`,
    usualValue,
    prepNote: ing.prepNote || null,
    isFree: false,
  }
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

  for (const entry of eqSummary) {
    const eq = catalogue?.find(c => c.eqId === entry.eqId)
      || fullCatalogue?.find(c => c.eqId === entry.eqId)
    if (!eq?.nutrientsPerPortion) continue

    hasData = true
    const portions = entry.portions || 1
    kcal += eq.nutrientsPerPortion.kcal * portions
    p += eq.nutrientsPerPortion.p * portions
    l += eq.nutrientsPerPortion.l * portions
    g += eq.nutrientsPerPortion.g * portions
  }

  if (!hasData) return null

  return {
    kcal: Math.round(kcal),
    p: Math.round(p),
    l: Math.round(l),
    g: Math.round(g),
  }
}
