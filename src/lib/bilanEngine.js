/**
 * bilanEngine.js — v2 — Moteur de bilan hebdomadaire data-driven
 *
 * Score objectif sur 4 axes pondérés :
 *   1. Calories (30%)      — kcal semaine vs cible, bias selon objectif
 *   2. Protéines (25%)     — center universel, alerte ≥125%
 *   3. Équivalences (25%)  — % d'EQ dans la cible (>60%)
 *   4. Régularité (20%)    — jours loggés / 7
 *
 * COMFORT : EQ 15%, Régularité 30% (focus bien-être)
 *
 * + Insights corporels (poids, MG, tour de taille) phase-aware
 * + Ton bienveillant — observations, jamais de jugement
 */

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════

const WEIGHTS = {
  DEFAULT: { kcal: 0.30, protein: 0.25, eq: 0.25, regularity: 0.20 },
  COMFORT: { kcal: 0.30, protein: 0.25, eq: 0.15, regularity: 0.30 },
}

export const MEASURE_INFO = {
  weight: "Le poids fluctue de 0.5-2kg par jour (eau, transit, glycogène). Une tendance sur 2-3 semaines est plus fiable qu'une pesée isolée.",
  bodyFat: "Le taux de MG distingue la graisse de la masse musculaire. Deux personnes au même poids peuvent avoir des compositions très différentes. C'est un meilleur indicateur de progression que le poids seul.",
  waist: "Le tour de taille reflète la graisse viscérale — celle autour des organes. Un ratio tour de taille/taille inférieur à 0.50 est associé à un risque cardiovasculaire réduit.",
  hip: "Le rapport taille/hanches (RTH) est un indicateur de répartition des graisses. Un RTH inférieur à 0.85 (femmes) ou 0.90 (hommes) est considéré comme favorable.",
  protein: "Les protéines préservent ta masse musculaire et favorisent la satiété. Atteindre 90-110% de ta cible est la zone idéale — au-delà, le surplus n'apporte pas de bénéfice supplémentaire.",
  kcal: "Les calories mesurent l'énergie apportée par ton alimentation. Respecter ta cible permet à ton corps de fonctionner de manière optimale selon ton objectif.",
  regularity: "Logger régulièrement améliore la conscience alimentaire. Les études montrent que le simple fait de noter ce qu'on mange augmente l'adhérence au plan.",
  eq: "Les équivalences assurent la variété nutritionnelle de ton alimentation. Chaque groupe (féculents, protéines, légumes…) apporte des nutriments spécifiques.",
}

// ═══════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════

/**
 * @param {Object} params
 * @param {Object} params.weekNutrients   — { kcal, p, l, g } totals for the week
 * @param {Object} params.weekConsumed    — { [eqId]: qty } consumed this week
 * @param {Object} params.planTargets     — { [eqId]: targetWeek } EQ targets
 * @param {Object} params.weekTargets     — { kcal, p, l, g } weekly nutrient targets
 * @param {number} params.daysLogged      — distinct days with at least 1 log
 * @param {string} params.objective       — PW | MAINT | GAIN | RECOMP | COMFORT (+ legacy codes)
 * @param {Object} params.wellbeing       — { energy, hunger, sleep, stress } 1-5
 * @param {Object|null} params.prevBilan  — previous bilan for trend
 * @param {string} params.firstName       — patient's first name
 * @param {Array}  params.measurements    — [{date, weightKg, bodyFatPct, waistCm, hipCm, muscleMassKg}]
 * @param {string} params.planCreatedAt   — ISO date string (plan creation)
 * @param {number} params.clientHeight    — cm
 * @param {Array}  params.milestones     — [{milestone_type, achieved_at}] recently achieved
 * @returns {Object} complete bilan
 */
export function computeBilan({
  weekNutrients, weekConsumed, planTargets, weekTargets,
  daysLogged, objective, wellbeing, prevBilan, firstName,
  measurements, planCreatedAt, clientHeight, milestones,
}) {
  const obj = normalizeObjective(objective)
  const w = obj === 'COMFORT' ? WEIGHTS.COMFORT : WEIGHTS.DEFAULT

  // 1. Kcal adherence (0-100)
  const kcalTarget = weekTargets?.kcal || 1
  const kcalActual = weekNutrients?.kcal || 0
  const kcalRatio = kcalActual / kcalTarget
  const kcalScore = computeRatioScore(kcalRatio, getKcalBias(obj))

  // 2. Protein adherence (0-100) — center universal
  const protTarget = weekTargets?.p || 1
  const protActual = weekNutrients?.p || 0
  const protRatio = protActual / protTarget
  const protScore = computeProteinScore(protRatio)

  // 3. EQ completion (0-100)
  const eqIds = Object.keys(planTargets || {})
  let eqHits = 0, eqTotal = 0
  const eqDetails = []
  for (const eqId of eqIds) {
    const target = planTargets[eqId]
    if (!target || target <= 0) continue
    eqTotal++
    const consumed = weekConsumed?.[eqId] || 0
    const ratio = consumed / target
    const hit = ratio >= 0.6
    if (hit) eqHits++
    eqDetails.push({ eqId, target, consumed, ratio, hit })
  }
  const eqScore = eqTotal > 0 ? Math.round((eqHits / eqTotal) * 100) : 50

  // 4. Regularity (0-100)
  const regScore = Math.round(Math.min(1, (daysLogged || 0) / 7) * 100)

  // Weighted overall score
  const overall = Math.round(
    kcalScore * w.kcal +
    protScore * w.protein +
    eqScore * w.eq +
    regScore * w.regularity
  )

  const breakdown = {
    kcal: { score: kcalScore, ratio: kcalRatio, actual: kcalActual, target: kcalTarget },
    protein: { score: protScore, ratio: protRatio, actual: protActual, target: protTarget },
    eq: { score: eqScore, hits: eqHits, total: eqTotal, details: eqDetails },
    regularity: { score: regScore, days: daysLogged || 0 },
  }

  // Trend — weighted by difference in logging days
  const prevDays = prevBilan?.breakdown?.regularity?.days
  const daysDiff = prevDays != null ? Math.abs((daysLogged || 0) - prevDays) : 0
  const rawDelta = prevBilan?.score != null ? overall - prevBilan.score : null
  let trend = null
  if (rawDelta != null) {
    if (daysDiff > 2) trend = 'inconclusive'
    else trend = rawDelta > 3 ? 'up' : rawDelta < -3 ? 'down' : 'stable'
  }

  // Phase (weeks since plan start)
  const phase = computePhase(planCreatedAt, measurements)

  // Insights
  const insights = [
    ...generateNutritionInsights(breakdown, obj, firstName, wellbeing, daysLogged),
    ...generateBodyInsights(measurements, obj, phase, clientHeight),
  ]

  // Feedback paragraph
  const feedback = generateFeedback(breakdown, overall, obj, trend, firstName, wellbeing, daysLogged, phase, milestones)

  // Tips
  const tips = generateTips(breakdown, obj, measurements, phase, daysLogged)

  // Disclaimers
  const disclaimers = []
  if ((daysLogged || 0) > 0 && (daysLogged || 0) < 3) {
    disclaimers.push(`Ce bilan est basé sur ${daysLogged} jour${daysLogged > 1 ? 's' : ''} de suivi. Pour un bilan plus représentatif, essaie de logger au moins 3 jours par semaine.`)
  }
  if (phase <= 1 && !prevBilan) {
    disclaimers.push('Premier bilan — on pose les bases. Les prochaines semaines permettront de voir ta progression.')
  }

  return {
    score: overall,
    breakdown,
    delta: rawDelta,
    trend,
    insights,
    feedback,
    tips,
    wellbeing,
    disclaimers,
    measureInfo: MEASURE_INFO,
  }
}

// ═══════════════════════════════════════════════
// OBJECTIVE HELPERS
// ═══════════════════════════════════════════════

function normalizeObjective(obj) {
  if (!obj) return 'PW'
  if (obj === 'GAIN_LEAN') return 'RECOMP'
  if (obj === 'GAIN_GUIDE') return 'GAIN'
  if (obj === 'GAIN_COMFORT') return 'COMFORT'
  return obj
}

function getKcalBias(obj) {
  if (obj === 'PW') return 'under'
  if (obj === 'GAIN') return 'over'
  return 'center'
}

// ═══════════════════════════════════════════════
// SCORE COMPUTATION
// ═══════════════════════════════════════════════

function computeRatioScore(ratio, bias) {
  if (ratio <= 0) return 0

  if (bias === 'under') {
    if (ratio >= 0.90 && ratio <= 1.00) return 100
    if (ratio >= 0.80 && ratio < 0.90) return 85
    if (ratio > 1.00 && ratio <= 1.10) return 80
    if (ratio > 1.10 && ratio <= 1.20) return 60
    if (ratio >= 0.65 && ratio < 0.80) return 55
    return Math.max(10, Math.round(40 * ratio))
  }

  if (bias === 'over') {
    if (ratio >= 1.00 && ratio <= 1.15) return 100
    if (ratio >= 0.90 && ratio < 1.00) return 85
    if (ratio >= 0.85 && ratio < 0.90) return 70
    if (ratio > 1.15 && ratio <= 1.25) return 75
    if (ratio >= 0.70 && ratio < 0.85) return 50
    return Math.max(10, Math.round(40 * ratio))
  }

  // center (MAINT, RECOMP, COMFORT)
  if (ratio >= 0.95 && ratio <= 1.05) return 100
  if (ratio >= 0.85 && ratio < 0.95) return 85
  if (ratio > 1.05 && ratio <= 1.15) return 85
  if (ratio >= 0.75 && ratio < 0.85) return 65
  if (ratio > 1.15 && ratio <= 1.25) return 65
  return Math.max(10, 100 - Math.round(Math.abs(1 - ratio) * 200))
}

/**
 * Protein: center universal. No praise for excess. Alert at ≥125%.
 */
function computeProteinScore(ratio) {
  if (ratio <= 0) return 0
  if (ratio >= 0.90 && ratio <= 1.10) return 100
  if (ratio >= 0.80 && ratio < 0.90) return 80
  if (ratio > 1.10 && ratio <= 1.25) return 85
  if (ratio >= 0.70 && ratio < 0.80) return 60
  if (ratio > 1.25) return 60
  return Math.max(10, Math.round(50 * ratio))
}

// ═══════════════════════════════════════════════
// PHASE COMPUTATION
// ═══════════════════════════════════════════════

function computePhase(planCreatedAt, measurements) {
  let startDate = null
  if (planCreatedAt) {
    startDate = new Date(planCreatedAt)
  } else if (measurements?.length > 0) {
    const sorted = [...measurements].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    startDate = new Date(sorted[0].date)
  }
  if (!startDate || isNaN(startDate)) return 99
  const weeks = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.max(1, weeks)
}

// ═══════════════════════════════════════════════
// NUTRITION INSIGHTS
// ═══════════════════════════════════════════════

function generateNutritionInsights(bd, obj, firstName, wb, daysLogged) {
  const insights = []
  const isPW = obj === 'PW'
  const isGain = obj === 'GAIN'
  const isComfort = obj === 'COMFORT'

  // Regularity
  const d = bd.regularity.days
  if (d >= 6) insights.push({ type: 'strength', icon: '📋', text: `${d}/7 jours loggés — excellente régularité.` })
  else if (d >= 4) insights.push({ type: 'neutral', icon: '📋', text: `${d}/7 jours loggés — essaie de compléter les jours manquants.` })
  else if (d >= 1) insights.push({ type: 'weak', icon: '📋', text: `${d} jour${d > 1 ? 's' : ''} loggé${d > 1 ? 's' : ''} sur 7. La régularité du suivi est essentielle pour un bilan fiable.` })
  else insights.push({ type: 'weak', icon: '📋', text: 'Aucun log cette semaine. Commence par noter un repas par jour.' })

  // Kcal
  const kr = bd.kcal.ratio
  const kcalDay = Math.round(bd.kcal.actual / 7)
  const kcalTargetDay = Math.round(bd.kcal.target / 7)

  if (isPW) {
    if (kr >= 0.90 && kr <= 1.02) insights.push({ type: 'strength', icon: '🔥', text: `Kcal maîtrisées : ~${kcalDay} kcal/jour pour une cible de ${kcalTargetDay}.` })
    else if (kr > 1.10) insights.push({ type: 'weak', icon: '🔥', text: `Kcal au-dessus de la cible (+${Math.round((kr - 1) * 100)}%) — ${kcalDay} kcal/jour au lieu de ${kcalTargetDay}. Vérifie tes portions.` })
    else if (kr < 0.80) insights.push({ type: 'weak', icon: '🔥', text: `Kcal trop basses (${kcalDay}/jour). Manger suffisamment protège ton métabolisme et ta progression.` })
    else insights.push({ type: 'neutral', icon: '🔥', text: `Kcal proches de la cible : ${kcalDay}/jour (cible ${kcalTargetDay}).` })
  } else if (isGain) {
    if (kr >= 0.95) insights.push({ type: 'strength', icon: '🔥', text: `Cible calorique atteinte : ${kcalDay} kcal/jour.` })
    else if (kr >= 0.85) insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${Math.round(kr * 100)}% de la cible. Complète tes repas pour atteindre ${kcalTargetDay} kcal/jour.` })
    else insights.push({ type: 'weak', icon: '🔥', text: `Kcal insuffisantes (${kcalDay}/jour pour ${kcalTargetDay} visés). Ton corps a besoin de ce carburant pour progresser.` })
  } else if (isComfort) {
    if (kr >= 0.90 && kr <= 1.10) insights.push({ type: 'strength', icon: '🔥', text: `Apport équilibré : ${kcalDay} kcal/jour — ton corps reçoit ce dont il a besoin.` })
    else if (kr < 0.85) insights.push({ type: 'weak', icon: '🔥', text: `Apport en dessous de la cible (${kcalDay}/jour). Mange à ta faim — sauter des repas n'est pas l'objectif.` })
    else insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${Math.round(kr * 100)}% de la cible (${kcalDay}/jour).` })
  } else {
    // MAINT, RECOMP
    if (kr >= 0.92 && kr <= 1.08) insights.push({ type: 'strength', icon: '🔥', text: `Apport stable : ${kcalDay} kcal/jour — pile dans ta zone d'équilibre.` })
    else if (kr > 1.15) insights.push({ type: 'weak', icon: '🔥', text: `Surplus de ${Math.round((kr - 1) * 100)}% cette semaine. Vérifie tes portions et assaisonnements.` })
    else if (kr < 0.85) insights.push({ type: 'weak', icon: '🔥', text: `Apport en dessous de la cible (${kcalDay}/jour). Mange suffisamment pour maintenir ton équilibre.` })
    else insights.push({ type: 'neutral', icon: '🔥', text: `Kcal légèrement ${kr > 1 ? 'au-dessus' : 'en dessous'} de la cible (${Math.round(kr * 100)}%).` })
  }

  // Protein — center universal
  const pr = bd.protein.ratio
  const protDay = Math.round(bd.protein.actual / 7)
  const protTargetDay = Math.round(bd.protein.target / 7)

  if (pr >= 0.90 && pr <= 1.10) {
    insights.push({ type: 'strength', icon: '🥩', text: `Protéines dans la zone idéale : ${protDay}g/jour sur ${protTargetDay}g visés.` })
  } else if (pr > 1.25) {
    insights.push({ type: 'weak', icon: '🥩', text: `Protéines à ${Math.round(pr * 100)}% de la cible (${protDay}g/${protTargetDay}g). Au-delà de 125%, le surplus n'apporte pas de bénéfice. Redistribue vers les glucides ou lipides.` })
  } else if (pr > 1.10) {
    insights.push({ type: 'neutral', icon: '🥩', text: `Protéines à ${Math.round(pr * 100)}% : ${protDay}g/jour sur ${protTargetDay}g visés.` })
  } else if (pr >= 0.75) {
    insights.push({ type: 'neutral', icon: '🥩', text: `Protéines à ${Math.round(pr * 100)}%. Il manque ~${protTargetDay - protDay}g/jour — ajoute une source à un repas.` })
  } else {
    insights.push({ type: 'weak', icon: '🥩', text: `Protéines en retard (${protDay}g/${protTargetDay}g). Priorise viande, poisson, œufs ou légumineuses.` })
  }

  // EQ completion — top misses and stars
  const sorted = [...bd.eq.details].sort((a, b) => a.ratio - b.ratio)
  const misses = sorted.filter(e => e.ratio < 0.6).slice(0, 2)
  const stars = sorted.filter(e => e.ratio >= 0.9).slice(-2)

  if (stars.length > 0) {
    const labels = stars.map(e => eqLabel(e.eqId)).join(' et ')
    insights.push({ type: 'strength', icon: '⭐', text: `${labels} — bien respecté${stars.length > 1 ? 's' : ''} cette semaine.` })
  }
  if (misses.length > 0) {
    const labels = misses.map(e => `${eqLabel(e.eqId)} (${e.consumed}/${e.target})`).join(', ')
    insights.push({ type: 'weak', icon: '📉', text: `En retard : ${labels}. Concentre-toi dessus cette semaine.` })
  }

  // 7/7 logged but poor nutrition
  if (d >= 7 && bd.kcal.score < 60 && bd.eq.score < 60) {
    insights.push({ type: 'neutral', icon: '💡', text: 'Tu logges régulièrement — c\'est un vrai atout. L\'étape suivante : rapprocher tes choix alimentaires du plan.' })
  }

  // Wellbeing correlations
  if (wb) {
    if (wb.hunger >= 4 && kr < 0.85) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Tu signales peu de faim malgré des kcal basses — vérifie que tu manges suffisamment pour tes besoins réels.' })
    } else if (wb.hunger <= 2 && kr < 0.90) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Tu signales de la faim et tes kcal sont sous la cible — mange davantage, ton corps te le demande.' })
    } else if (wb.hunger <= 2 && kr > 1.10) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Tu ressens de la faim malgré des kcal au-dessus de la cible — c\'est peut-être lié au type d\'aliments ou aux horaires de repas.' })
    }
    if (wb.sleep <= 2 && bd.protein.ratio < 0.80) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Sommeil difficile et protéines basses : un apport suffisant en protéines favorise la récupération et le sommeil.' })
    }
    if (wb.energy >= 4 && bd.kcal.score >= 80) {
      insights.push({ type: 'strength', icon: '⚡', text: 'Énergie au top cette semaine — signe que ton plan te convient.' })
    }
    if (wb.stress <= 2 && isPW && kr <= 1.05) {
      insights.push({ type: 'strength', icon: '💡', text: 'Stress maîtrisé et kcal dans la cible — le stress est souvent le déclencheur n°1 des écarts.' })
    }
  }

  return insights
}

// ═══════════════════════════════════════════════
// BODY INSIGHTS (measurements analysis)
// ═══════════════════════════════════════════════

function generateBodyInsights(measurements, obj, phase, clientHeight) {
  const insights = []
  if (!measurements || measurements.length === 0) return insights

  const sorted = [...measurements]
    .filter(m => m.date)
    .sort((a, b) => b.date.localeCompare(a.date))
  if (sorted.length === 0) return insights

  const latest = sorted[0]
  const now = new Date()
  const latestDate = new Date(latest.date)

  // Find measurements ~1 week and ~2 weeks ago
  const oneWeekAgo = findMeasurementAround(sorted, latestDate, 7)
  const twoWeeksAgo = findMeasurementAround(sorted, latestDate, 14)

  // ── Weight trend analysis ──
  if (latest.weightKg != null) {
    if (twoWeeksAgo?.weightKg != null) {
      const delta2w = latest.weightKg - twoWeeksAgo.weightKg
      const weeklyRate = delta2w / 2
      addWeightInsights(insights, weeklyRate, delta2w, obj, phase, 2)
    } else if (oneWeekAgo?.weightKg != null) {
      const delta1w = latest.weightKg - oneWeekAgo.weightKg
      addWeightInsights(insights, delta1w, delta1w, obj, phase, 1)
    }

    // Plateau detection (PW, 3+ measures spanning 3+ weeks)
    if (obj === 'PW' && phase > 2) {
      const recent = sorted.filter(m => m.weightKg != null).slice(0, 4)
      if (recent.length >= 3) {
        const min = Math.min(...recent.map(m => m.weightKg))
        const max = Math.max(...recent.map(m => m.weightKg))
        const span = (new Date(recent[0].date) - new Date(recent[recent.length - 1].date)) / (1000 * 60 * 60 * 24)
        if (max - min <= 0.6 && span >= 18) {
          insights.push({ type: 'neutral', icon: '⚖️', text: 'Ton poids se stabilise depuis quelques semaines — c\'est fréquent et souvent temporaire. Continue le plan, le corps s\'adapte par paliers.' })
        }
      }
    }

    // GAIN stagnation (3+ weeks stable)
    if (obj === 'GAIN' && phase > 3) {
      const recent = sorted.filter(m => m.weightKg != null).slice(0, 4)
      if (recent.length >= 3) {
        const min = Math.min(...recent.map(m => m.weightKg))
        const max = Math.max(...recent.map(m => m.weightKg))
        const span = (new Date(recent[0].date) - new Date(recent[recent.length - 1].date)) / (1000 * 60 * 60 * 24)
        if (max - min <= 0.5 && span >= 18) {
          insights.push({ type: 'neutral', icon: '📊', text: 'Ton poids reste stable — pour progresser en prise de masse, tu pourrais augmenter tes apports de 100-200 kcal/jour.' })
        }
      }
    }
  }

  // ── Body fat cross-reference ──
  if (latest.bodyFatPct != null && oneWeekAgo?.bodyFatPct != null && latest.weightKg != null && oneWeekAgo?.weightKg != null) {
    const wDelta = latest.weightKg - oneWeekAgo.weightKg
    const bfDelta = latest.bodyFatPct - oneWeekAgo.bodyFatPct

    if (obj === 'RECOMP' && Math.abs(wDelta) <= 0.5 && bfDelta < -0.3) {
      insights.push({ type: 'strength', icon: '🎯', text: 'Recomposition en cours — ton poids est stable mais ta composition corporelle évolue. C\'est exactement l\'objectif.' })
    }
    if (obj === 'PW') {
      if (wDelta < -0.3 && bfDelta < -0.2) {
        insights.push({ type: 'strength', icon: '✅', text: 'Tu perds du gras — ta masse grasse diminue avec ton poids. C\'est le scénario idéal.' })
      } else if (wDelta < -0.5 && bfDelta >= 0) {
        insights.push({ type: 'neutral', icon: '💡', text: 'Tu perds du poids mais ta masse grasse ne baisse pas encore — maintiens tes protéines et ton activité physique pour préserver ta masse musculaire.' })
      }
    }
    if (obj === 'GAIN') {
      if (wDelta > 0.3 && bfDelta <= 0.2) {
        insights.push({ type: 'strength', icon: '💪', text: 'Bonne prise — ta masse grasse reste stable, signe que tu construis du muscle.' })
      } else if (wDelta > 0.3 && bfDelta > 0.5) {
        insights.push({ type: 'neutral', icon: '💡', text: 'Ta masse grasse augmente avec ton poids — un ajustement de tes apports pourrait orienter la prise davantage vers le muscle.' })
      }
    }
  }

  // ── Waist / height ratio ──
  if (latest.waistCm != null && clientHeight) {
    const ratio = latest.waistCm / clientHeight
    if (ratio < 0.50) {
      insights.push({ type: 'strength', icon: '📏', text: `Ratio tour de taille/taille de ${ratio.toFixed(2)} — sous le seuil de 0.50, excellent indicateur de santé cardiovasculaire.` })
    } else if (ratio < 0.55) {
      insights.push({ type: 'neutral', icon: '📏', text: `Ratio tour de taille/taille de ${ratio.toFixed(2)} — proche du seuil de 0.50. La tendance compte plus que la valeur absolue.` })
    }
  }

  // ── Measurement frequency ──
  const last7Days = sorted.filter(m => (now - new Date(m.date)) / (1000 * 60 * 60 * 24) <= 7)
  if (last7Days.length >= 3) {
    insights.push({ type: 'neutral', icon: '⚖️', text: 'Se peser 1 à 2 fois par semaine suffit. Les fluctuations quotidiennes sont normales et ne reflètent pas ta progression réelle.' })
  }

  const daysSinceLast = (now - latestDate) / (1000 * 60 * 60 * 24)
  if (daysSinceLast > 21) {
    insights.push({ type: 'neutral', icon: '📊', text: 'Pas de pesée depuis plus de 3 semaines — une mesure cette semaine t\'aiderait à suivre ta progression.' })
  }

  // ── RECOMP without body fat ──
  if (obj === 'RECOMP' && latest.bodyFatPct == null) {
    insights.push({ type: 'neutral', icon: '💡', text: 'Mesure ton taux de masse grasse pour suivre ta recomposition — le poids seul ne suffit pas dans ton cas.' })
  }

  return insights
}

function findMeasurementAround(sorted, refDate, targetDays) {
  let best = null, bestDiff = Infinity
  for (const m of sorted) {
    const daysDiff = (refDate - new Date(m.date)) / (1000 * 60 * 60 * 24)
    const diff = Math.abs(daysDiff - targetDays)
    if (diff < bestDiff && diff <= targetDays * 0.5 && daysDiff > 0) {
      bestDiff = diff
      best = m
    }
  }
  return best
}

function addWeightInsights(insights, weeklyRate, totalDelta, obj, phase, weeks) {
  // Phase 1-2 for PW: high tolerance (water, glycogen)
  if (obj === 'PW' && phase <= 2 && weeklyRate < 0) {
    if (Math.abs(weeklyRate) > 2) {
      insights.push({
        type: 'neutral', icon: '💧',
        text: 'Ta perte de poids est rapide en début de plan — c\'est normal et principalement lié à l\'eau et au glycogène. Le rythme va naturellement se stabiliser.',
      })
    }
    return
  }

  if (obj === 'PW') {
    const threshold = phase <= 6 ? 1.5 : 1.0
    if (weeklyRate < -threshold) {
      insights.push({
        type: 'neutral', icon: '⚡',
        text: `Ta perte est plus rapide que prévu (~${Math.abs(weeklyRate).toFixed(1)}kg/sem). Vérifie que tu manges suffisamment — ton corps a besoin de carburant pour tenir sur la durée.`,
      })
    }
    if (weeklyRate > 0.3 && weeks >= 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: 'Ton poids remonte légèrement — c\'est souvent lié à la rétention d\'eau, au cycle hormonal ou au transit. Si ça persiste, un point avec ton diététicien peut aider à ajuster.',
      })
    }
  }

  if (obj === 'GAIN') {
    if (weeklyRate > 0.7) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: `Prise de ~${weeklyRate.toFixed(1)}kg/sem — au-delà de 0.5kg/sem, une partie peut être de la masse grasse. Surveille ta composition corporelle si possible.`,
      })
    }
    if (weeklyRate < -0.3 && weeks >= 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: 'Tu perds du poids malgré un objectif de prise de masse — vérifie que tu atteins ta cible calorique chaque jour.',
      })
    }
  }

  if (['MAINT', 'RECOMP', 'COMFORT'].includes(obj)) {
    if (Math.abs(totalDelta) > 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: `Variation de ${Math.abs(totalDelta).toFixed(1)}kg sur ${weeks} semaine${weeks > 1 ? 's' : ''} — les fluctuations sont normales, mais surveille la tendance sur les prochaines semaines.`,
      })
    }
  }
}

// ═══════════════════════════════════════════════
// FEEDBACK GENERATION (paragraph)
// ═══════════════════════════════════════════════

function generateFeedback(bd, score, obj, trend, firstName, wb, daysLogged, phase, milestones) {
  const name = firstName || 'toi'

  const axes = [
    { key: 'kcal', score: bd.kcal.score, label: 'tes calories' },
    { key: 'protein', score: bd.protein.score, label: 'tes protéines' },
    { key: 'eq', score: bd.eq.score, label: 'la variété de tes équivalences' },
    { key: 'regularity', score: bd.regularity.score, label: 'ta régularité de suivi' },
  ].sort((a, b) => b.score - a.score)

  const best = axes[0]
  const worst = axes[axes.length - 1]

  const opener = pick(getOpeners(score, name, obj))
  const strength = pick(getStrengthLines(best, obj))
  const weak = worst.score < 70 ? pick(getWeaknessLines(worst, obj)) : ''

  let trendLine = ''
  if (trend === 'up') trendLine = pick(TREND_UP)
  else if (trend === 'down') trendLine = pick(TREND_DOWN)
  else if (trend === 'inconclusive') trendLine = pick(TREND_INCONCLUSIVE)

  // Milestone reference (if recently achieved this week)
  let milestoneLine = ''
  if (milestones && milestones.length > 0) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentMs = milestones.filter(m => m.achieved_at && new Date(m.achieved_at).getTime() > weekAgo)
    if (recentMs.length > 0) {
      const labels = {
        first_log: 'Premier pas',
        week_complete: 'Semaine complète',
        streak_7: '7 jours consécutifs',
        streak_30: '30 jours consécutifs',
        first_bilan: 'Premier bilan',
        bilans_4: '4 bilans complétés',
        score_85: 'Semaine remarquable',
        score_improve: 'Progression constante',
        first_measure: 'Première mesure',
        protein_zone: 'Protéines maîtrisées',
      }
      const latest = recentMs[0]
      const label = labels[latest.milestone_type] || latest.milestone_type
      if (latest.milestone_type === 'streak_30') {
        milestoneLine = `Tu as franchi une étape importante : ${label}. 30 jours de constance, c'est un vrai cap.`
      } else {
        milestoneLine = `Tu as franchi l'étape « ${label} » cette semaine — c'est un signe concret de ta progression.`
      }
    }
  }

  const closer = pick(getClosers(score, obj))

  return [opener, strength, weak, trendLine, milestoneLine, closer].filter(Boolean).join(' ')
}

// ═══════════════════════════════════════════════
// PHRASE BANKS
// ═══════════════════════════════════════════════

function getOpeners(score, name, obj) {
  const isComfort = obj === 'COMFORT'
  if (score >= 85) return isComfort ? [
    `${name}, belle semaine côté alimentation.`,
    `Très bel équilibre cette semaine ${name}.`,
    `${name}, ton alimentation est bien en place.`,
  ] : [
    `${name}, semaine remarquable.`,
    `Très belle semaine ${name}.`,
    `${name}, tu as assuré cette semaine.`,
    `Rien à redire ${name} — semaine maîtrisée.`,
  ]
  if (score >= 70) return isComfort ? [
    `${name}, bonne semaine dans l'ensemble.`,
    `${name}, ton équilibre alimentaire se met en place.`,
    `Semaine positive ${name} — la régularité porte ses fruits.`,
  ] : [
    `${name}, bonne semaine dans l'ensemble.`,
    `Semaine solide ${name}, la dynamique est là.`,
    `${name}, tu es sur la bonne voie.`,
    `Bon travail ${name} — encore quelques ajustements et c'est parfait.`,
  ]
  if (score >= 55) return isComfort ? [
    `${name}, semaine correcte avec quelques pistes d'amélioration.`,
    `${name}, les bases sont là — quelques ajustements feront la différence.`,
  ] : [
    `${name}, semaine correcte avec des marges de progression.`,
    `${name}, cette semaine montre des bases solides et des pistes d'amélioration.`,
    `${name}, les fondations sont là — il reste à consolider.`,
  ]
  return isComfort ? [
    `${name}, cette semaine mérite un petit recadrage.`,
    `${name}, chaque semaine est une nouvelle occasion de trouver ton équilibre.`,
  ] : [
    `${name}, cette semaine nécessite un recadrage.`,
    `Semaine difficile ${name} — mais chaque lundi est un nouveau départ.`,
    `${name}, on est en dessous de ton potentiel cette semaine.`,
  ]
}

function getStrengthLines(axis, obj) {
  const isComfort = obj === 'COMFORT'
  const m = {
    kcal: isComfort ? [
      'Tu manges à ta faim sans excès — c\'est l\'équilibre visé.',
      'Ton apport calorique est bien calibré.',
    ] : [
      'Ton budget calorique est bien géré — c\'est la base de tout.',
      'Les calories sont dans la cible, ce qui montre une bonne maîtrise de tes portions.',
      'Côté énergie, tu es pile où il faut.',
    ],
    protein: [
      'Tes protéines sont dans la zone idéale — ton corps a ce qu\'il lui faut.',
      'Le quota protéines est atteint. C\'est essentiel pour tes résultats.',
      'Protéines bien gérées — satiété et récupération assurées.',
    ],
    eq: isComfort ? [
      'Tu varies bien ton alimentation — c\'est un vrai plus pour le plaisir et la santé.',
      'Bonne diversité alimentaire cette semaine.',
    ] : [
      'Tu utilises bien la variété des équivalences proposées.',
      'Bonne diversité alimentaire cette semaine — c\'est un vrai plus.',
      'Tu explores bien ton plan — les équivalences sont là pour ça.',
    ],
    regularity: [
      'Ta régularité de suivi est un vrai atout — continue à tout logger.',
      'Le fait de logger chaque jour montre ton engagement. C\'est ce qui fait la différence.',
      'Logger régulièrement, c\'est déjà 80% du travail.',
    ],
  }
  return m[axis.key] || ['Point fort identifié cette semaine.']
}

function getWeaknessLines(axis, obj) {
  const isComfort = obj === 'COMFORT'
  const m = {
    kcal: isComfort ? [
      'Vérifie que tu manges à ta faim — ni trop, ni trop peu.',
      'Ton apport calorique s\'éloigne de la cible. Écoute tes sensations de faim et de satiété.',
    ] : [
      'Le point à surveiller : tes calories. Vérifie tes portions et tes assaisonnements.',
      'L\'axe calorique mérite attention cette semaine — relis tes portions de référence.',
      'Côté kcal, il y a un écart à corriger. Concentre-toi sur les repas principaux d\'abord.',
    ],
    protein: [
      'Les protéines sont en retard. Ajoute une source supplémentaire à un repas par jour.',
      'Tes protéines manquent cette semaine — priorise viande, poisson, œufs ou légumineuses.',
      'Point d\'attention : les protéines. Même un yaourt ou du fromage blanc en collation aide.',
    ],
    eq: isComfort ? [
      'Essaie de varier un peu plus tes choix alimentaires — le plaisir passe aussi par la diversité.',
      'Quelques groupes alimentaires sont sous-représentés. Explore les alternatives du plan.',
    ] : [
      'Certaines équivalences sont sous-utilisées. Explore les alternatives proposées dans le plan.',
      'La diversité alimentaire peut progresser — essaie de varier tes choix cette semaine.',
      'Quelques équivalences sont en retard — c\'est souvent une question d\'habitude à installer.',
    ],
    regularity: [
      'Le suivi manque de régularité. Essaie de logger au moins tes repas principaux chaque jour.',
      'Plus tu logges, plus le bilan est fiable. Vise 5 jours minimum la semaine prochaine.',
      'La constance du suivi est le levier n°1. Même un log rapide vaut mieux que rien.',
    ],
  }
  return m[axis.key] || ['Un point mérite ton attention cette semaine.']
}

const TREND_UP = [
  'La tendance est positive — tu progresses semaine après semaine.',
  'En progression par rapport à la semaine dernière — bon signal.',
  'Score en hausse : la dynamique est là.',
]

const TREND_DOWN = [
  'Le score recule par rapport à la semaine dernière — identifie ce qui a changé.',
  'Léger recul cette semaine — pas de panique, c\'est normal de fluctuer.',
  'La tendance est à surveiller. Recentre-toi sur tes priorités.',
]

const TREND_INCONCLUSIVE = [
  'Le nombre de jours loggés varie entre les deux semaines — la comparaison est à prendre avec recul.',
  'La différence de jours loggés rend la comparaison moins fiable cette semaine.',
]

function getClosers(score, obj) {
  const isComfort = obj === 'COMFORT'
  if (score >= 85) return isComfort ? [
    'Continue d\'écouter tes sensations — c\'est la clé.',
    'Ton équilibre alimentaire est solide. Garde ce cap.',
  ] : [
    'Continue exactement comme ça.',
    'Garde ce rythme — c\'est comme ça qu\'on atteint ses objectifs.',
    'La constance paie toujours. Tu en es la preuve.',
  ]
  if (score >= 70) return isComfort ? [
    'Quelques ajustements et ton confort alimentaire sera optimal.',
    'Tu es sur la bonne voie — continue de prendre soin de toi.',
  ] : [
    'Quelques ajustements et tu passes au niveau supérieur.',
    'Tu es proche de l\'excellence — les détails font la différence.',
    'Concentre-toi sur le point faible identifié et la semaine prochaine sera encore meilleure.',
  ]
  if (score >= 55) return isComfort ? [
    'Choisis une habitude à solidifier cette semaine.',
    'Pas besoin de tout changer — un seul ajustement peut faire la différence.',
  ] : [
    'Identifie 1 ou 2 habitudes à solidifier cette semaine.',
    'La prochaine étape : consolider les bases.',
    'Choisis un seul axe à améliorer et concentre toute ton énergie dessus.',
  ]
  return isComfort ? [
    'Reviens à l\'essentiel : des repas réguliers, mangés avec attention.',
    'Chaque semaine est indépendante. Celle-ci commence maintenant.',
  ] : [
    'Reviens à l\'essentiel : 3 repas complets, loggés chaque jour.',
    'Pas besoin d\'être parfait — juste régulier. Recommence demain.',
    'Chaque semaine est indépendante. Celle-ci commence maintenant.',
  ]
}

// ═══════════════════════════════════════════════
// TIPS
// ═══════════════════════════════════════════════

function generateTips(bd, obj, measurements, phase, daysLogged) {
  const tips = []
  const isPW = obj === 'PW'
  const isGain = obj === 'GAIN'
  const isComfort = obj === 'COMFORT'

  const axes = [
    { key: 'kcal', score: bd.kcal.score },
    { key: 'protein', score: bd.protein.score },
    { key: 'eq', score: bd.eq.score },
    { key: 'regularity', score: bd.regularity.score },
  ].sort((a, b) => a.score - b.score)

  const weakest = axes[0]

  if (weakest.key === 'kcal') {
    if (bd.kcal.ratio > 1.1 && isPW) tips.push('Prépare tes repas à l\'avance pour mieux contrôler les quantités.')
    else if (bd.kcal.ratio < 0.85 && isGain) tips.push('Ajoute une collation riche (oléagineux, beurre de cacahuètes, fromage) si tu n\'atteins pas ta cible.')
    else if (isComfort) tips.push('Essaie de manger à heures régulières — la structure des repas favorise le confort digestif.')
    else tips.push('Pèse tes portions 2-3 fois cette semaine pour recalibrer ton œil.')
  }
  if (weakest.key === 'protein') {
    tips.push('Place une source de protéines à chaque repas : viande, poisson, œufs, fromage blanc, légumineuses.')
  }
  if (weakest.key === 'eq') {
    const misses = bd.eq.details.filter(e => e.ratio < 0.6).slice(0, 2)
    if (misses.length > 0) {
      tips.push(`Concentre-toi sur : ${misses.map(e => eqLabel(e.eqId)).join(', ')}.`)
    } else {
      tips.push('Consulte tes équivalences pour découvrir des alternatives que tu n\'as pas encore essayées.')
    }
  }
  if (weakest.key === 'regularity') {
    tips.push('Mets un rappel à 20h pour logger ta journée — ça prend 2 minutes.')
  }

  // Second tip based on second weakest (if score < 70)
  if (axes[1].score < 70) {
    const second = axes[1]
    if (second.key === 'protein' && !tips.some(t => t.includes('protéine'))) {
      tips.push('Un shaker protéiné ou un yaourt en collation peut suffire à combler le gap protéines.')
    }
    if (second.key === 'regularity' && !tips.some(t => t.includes('rappel'))) {
      tips.push('Logger même imparfaitement vaut mieux que ne pas logger. Commence par les repas principaux.')
    }
  }

  // Measurement-based tip
  if (measurements && measurements.length > 0) {
    const sortedM = [...measurements].filter(m => m.date).sort((a, b) => b.date.localeCompare(a.date))
    const daysSince = sortedM.length > 0 ? (Date.now() - new Date(sortedM[0].date).getTime()) / (1000 * 60 * 60 * 24) : 999
    if (daysSince > 14 && tips.length < 3) {
      tips.push('Pèse-toi cette semaine pour suivre ta progression — une fois par semaine suffit.')
    }
  } else if (tips.length < 3) {
    tips.push('Pèse-toi cette semaine pour suivre ta progression — une fois par semaine suffit.')
  }

  return tips.slice(0, 3)
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function pick(arr) {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return arr[weekNum % arr.length]
}

const EQ_LABELS = {
  feculents: 'Féculents', pain: 'Pain', fruits: 'Fruits',
  poissons_maigres: 'Poissons maigres', poissons_gras: 'Poissons gras',
  oleagineux_nature: 'Oléagineux', graines_nature: 'Graines',
  pl_0_riche_p: 'Produits laitiers protéinés', pl_50_100_kcal: 'Yaourts',
  cereales_ig_modere: 'Céréales', charcuteries_maigres: 'Charcuteries maigres',
  mg_cuisson: 'Matière grasse cuisson', laits_vege: 'Laits végétaux',
  assaisonnement_repas_chaud: 'Assaisonnement chaud',
  assaisonnement_repas_froid: 'Assaisonnement froid',
  complement_proteine_poudre: 'Protéine poudre',
  extras_glaces: 'Glaces', extras_chocolat: 'Chocolat',
  proteines_vege_tofu_150g: 'Protéines végétales',
  poissons_conserves_gras: 'Conserves de poisson',
}

function eqLabel(eqId) {
  return EQ_LABELS[eqId] || eqId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
