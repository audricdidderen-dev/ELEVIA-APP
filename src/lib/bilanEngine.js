/**
 * bilanEngine.js — v3 — Moteur de bilan hebdomadaire Élevia
 *
 * Score objectif sur 4 axes pondérés :
 *   1. Calories (30%)      — bias PW=under, GAIN=over, else center
 *   2. Protéines (25%)     — center universel, alerte ≥125%
 *   3. Équivalences (25%)  — % d'EQ dans la cible (>60%)
 *   4. Régularité (20%)    — jours loggés / 7
 *   COMFORT : EQ 15%, Régularité 30%
 *
 * Génération de texte :
 *   - 5 profils (PW, GAIN, MAINT, RECOMP, COMFORT) avec vocabulaire propre
 *   - 3 phases (adaptation ≤2, progression 3-6, croisière 7+)
 *   - Insights nutrition + corporels + bien-être + cross-semaine
 *   - Ton Élevia : premium, professionnel, bienveillant
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
    ...generateNutritionInsights(breakdown, obj, firstName, wellbeing, daysLogged, phase),
    ...generateBodyInsights(measurements, obj, phase, clientHeight),
  ]

  // Feedback paragraph
  const feedback = generateFeedback(breakdown, overall, obj, trend, firstName, wellbeing, daysLogged, phase, milestones, prevBilan)

  // Tips
  const tips = generateTips(breakdown, obj, measurements, phase, daysLogged, wellbeing)

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
// SCORE COMPUTATION (unchanged — tested against 64 clients)
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

/** adaptation (1-2), progression (3-6), croisière (7+) */
function phaseName(phase) {
  if (phase <= 2) return 'adaptation'
  if (phase <= 6) return 'progression'
  return 'cruise'
}

// ═══════════════════════════════════════════════
// NUTRITION INSIGHTS
// ═══════════════════════════════════════════════

function generateNutritionInsights(bd, obj, firstName, wb, daysLogged, phase) {
  const insights = []
  const isPW = obj === 'PW'
  const isGain = obj === 'GAIN'
  const isComfort = obj === 'COMFORT'
  const isRecomp = obj === 'RECOMP'
  const isMaint = obj === 'MAINT'
  const ph = phaseName(phase)

  // ── Regularity ──
  const d = bd.regularity.days
  if (d >= 7) {
    insights.push({ type: 'strength', icon: '📋', text: '7/7 jours loggés — suivi irréprochable.' })
  } else if (d >= 6) {
    insights.push({ type: 'strength', icon: '📋', text: `${d}/7 jours loggés — excellente régularité. Le dernier jour manquant n'impacte pas la fiabilité du bilan.` })
  } else if (d >= 4) {
    insights.push({ type: 'neutral', icon: '📋', text: `${d}/7 jours loggés. Compléter les jours restants rendrait le bilan plus représentatif de ta semaine réelle.` })
  } else if (d >= 1) {
    insights.push({ type: 'weak', icon: '📋', text: `${d} jour${d > 1 ? 's' : ''} loggé${d > 1 ? 's' : ''} sur 7. Le suivi régulier est le socle de tout le reste — sans données, le score reflète peu ta réalité.` })
  } else {
    insights.push({ type: 'weak', icon: '📋', text: 'Aucun log cette semaine. Un seul repas logué par jour suffit pour commencer à rendre le bilan utile.' })
  }

  // ── Kcal — objective-specific ──
  const kr = bd.kcal.ratio
  const kcalDay = Math.round(bd.kcal.actual / 7)
  const kcalTargetDay = Math.round(bd.kcal.target / 7)
  const kcalPct = Math.round(kr * 100)

  if (isPW) {
    if (kr >= 0.90 && kr <= 1.00) {
      insights.push({ type: 'strength', icon: '🔥', text: `Balance énergétique maîtrisée : ${kcalDay} kcal/jour pour une cible de ${kcalTargetDay}. En perte de poids, cette zone est idéale — ton corps puise dans ses réserves sans ralentir ton métabolisme.` })
    } else if (kr > 1.00 && kr <= 1.10) {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% de la cible (${kcalDay}/${kcalTargetDay}/jour). C'est légèrement au-dessus mais la marge reste raisonnable — surveille les assaisonnements et les extras.` })
    } else if (kr > 1.10) {
      insights.push({ type: 'weak', icon: '🔥', text: `Surplus calorique de ${kcalPct - 100}% cette semaine (${kcalDay}/${kcalTargetDay}/jour). En perte de poids, chaque excédent régulier ralentit la progression. Vérifie les portions de féculents et les ajouts hors plan.` })
    } else if (kr >= 0.80) {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% — ${kcalDay} kcal/jour. C'est un peu en dessous de ta cible. Manger suffisamment protège ton métabolisme et évite les fringales compensatoires.` })
    } else {
      insights.push({ type: 'weak', icon: '🔥', text: `Apport très bas : ${kcalDay} kcal/jour (${kcalPct}% de ta cible). Un déficit trop prononcé entraîne fatigue, perte de muscle et effet rebond. Ton plan est déjà calibré pour une perte progressive — fais-lui confiance.` })
    }
  } else if (isGain) {
    if (kr >= 1.00 && kr <= 1.15) {
      insights.push({ type: 'strength', icon: '🔥', text: `Objectif calorique atteint : ${kcalDay} kcal/jour. Ton corps dispose du surplus nécessaire pour construire du muscle. C'est exactement ce qu'on cherche.` })
    } else if (kr >= 0.90) {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% de l'objectif (${kcalDay}/${kcalTargetDay}/jour). Presque au niveau — il manque environ ${kcalTargetDay - kcalDay} kcal/jour pour optimiser ta prise de masse.` })
    } else {
      insights.push({ type: 'weak', icon: '🔥', text: `Kcal insuffisantes : ${kcalDay}/${kcalTargetDay}/jour (${kcalPct}%). Sans surplus calorique, ton corps n'a pas le matériau nécessaire pour construire du muscle, même avec un entraînement optimal.` })
    }
  } else if (isRecomp) {
    if (kr >= 0.92 && kr <= 1.08) {
      insights.push({ type: 'strength', icon: '🔥', text: `Apport stable : ${kcalDay} kcal/jour — pile dans ta zone d'équilibre. En recomposition, cette précision permet au corps de remplacer la graisse par du muscle.` })
    } else if (kr > 1.15) {
      insights.push({ type: 'weak', icon: '🔥', text: `Surplus de ${kcalPct - 100}% cette semaine. En recomposition, un excès calorique oriente les gains vers la masse grasse plutôt que le muscle.` })
    } else if (kr < 0.85) {
      insights.push({ type: 'weak', icon: '🔥', text: `Apport trop bas (${kcalPct}%). En recomposition, un déficit trop fort compromet la prise de muscle — mange suffisamment pour soutenir ton entraînement.` })
    } else {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% de ta cible (${kcalDay}/jour). Ajuste légèrement pour rester dans la zone optimale de recomposition.` })
    }
  } else if (isComfort) {
    if (kr >= 0.90 && kr <= 1.10) {
      insights.push({ type: 'strength', icon: '🔥', text: `Apport équilibré : ${kcalDay} kcal/jour. Ton corps reçoit ce dont il a besoin sans excès ni restriction.` })
    } else if (kr < 0.85) {
      insights.push({ type: 'weak', icon: '🔥', text: `Apport en dessous de la cible (${kcalDay}/jour). Mange à ta faim — l'objectif n'est pas de restreindre mais de trouver ton rythme naturel.` })
    } else {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% de ta cible (${kcalDay}/jour). L'équilibre se construit sur la durée — pas besoin d'être au gramme près.` })
    }
  } else {
    // MAINT
    if (kr >= 0.92 && kr <= 1.08) {
      insights.push({ type: 'strength', icon: '🔥', text: `Apport stable : ${kcalDay} kcal/jour, pile dans la zone de maintien. C'est le signe d'un bon équilibre installé.` })
    } else if (kr > 1.15) {
      insights.push({ type: 'weak', icon: '🔥', text: `Surplus de ${kcalPct - 100}% cette semaine (${kcalDay}/jour). Pour le maintien, la régularité de l'apport est plus importante que la quantité absolue.` })
    } else if (kr < 0.85) {
      insights.push({ type: 'weak', icon: '🔥', text: `Apport bas (${kcalPct}%). En maintien, manger sous ta cible peut entraîner fatigue et perte de masse musculaire non souhaitée.` })
    } else {
      insights.push({ type: 'neutral', icon: '🔥', text: `Kcal à ${kcalPct}% de ta cible (${kcalDay}/jour). Proche de l'objectif — un léger ajustement et c'est parfait.` })
    }
  }

  // ── Protein — universal center, objective-contextualized ──
  const pr = bd.protein.ratio
  const protDay = Math.round(bd.protein.actual / 7)
  const protTargetDay = Math.round(bd.protein.target / 7)
  const protPct = Math.round(pr * 100)

  if (pr >= 0.90 && pr <= 1.10) {
    const contextMap = {
      PW: `En déficit calorique, c'est ce qui préserve ta masse musculaire et ta satiété.`,
      GAIN: `C'est la base de la construction musculaire — tu donnes à ton corps le matériau nécessaire.`,
      RECOMP: `Prioritaire en recomposition : tes protéines nourrissent le muscle pendant que le gras recule.`,
      MAINT: `Ton statut protéique est optimal pour maintenir ta composition corporelle.`,
      COMFORT: `Un bon apport protéique soutient ton énergie et ta satiété au quotidien.`,
    }
    insights.push({ type: 'strength', icon: '🥩', text: `Protéines dans la zone idéale : ${protDay}g/jour (${protPct}% de ta cible). ${contextMap[obj] || ''}` })
  } else if (pr > 1.25) {
    insights.push({ type: 'weak', icon: '🥩', text: `Protéines à ${protPct}% (${protDay}g/${protTargetDay}g/jour). Au-delà de 125%, le surplus n'apporte pas de bénéfice supplémentaire et sollicite davantage les reins. Redistribue vers les glucides ou les lipides.` })
  } else if (pr > 1.10) {
    insights.push({ type: 'neutral', icon: '🥩', text: `Protéines à ${protPct}% : ${protDay}g/jour. Légèrement au-dessus, ce qui reste sans conséquence. Pas besoin de les réduire activement.` })
  } else if (pr >= 0.75) {
    const gap = protTargetDay - protDay
    const tipMap = {
      PW: `Consulte les sources protéiques de ton plan pour identifier où ajouter une portion — un ajustement par repas suffit.`,
      GAIN: `En prise de masse, chaque gramme compte. Vérifie tes portions protéiques dans ton plan et assure-toi de les atteindre à chaque repas.`,
      RECOMP: `Sans protéines suffisantes, ton corps ne peut pas remplacer la graisse par du muscle.`,
      MAINT: `Même en maintien, les protéines restent essentielles pour préserver ta composition corporelle.`,
      COMFORT: `Un apport suffisant contribue à la satiété et à l'énergie sur la durée de la journée.`,
    }
    insights.push({ type: 'neutral', icon: '🥩', text: `Protéines à ${protPct}% — il manque ~${gap}g/jour pour atteindre la cible. ${tipMap[obj] || ''}` })
  } else {
    insights.push({ type: 'weak', icon: '🥩', text: `Protéines en retard : ${protDay}g/${protTargetDay}g/jour (${protPct}%). Un déficit protéique prolongé entraîne une perte de masse musculaire, une baisse de satiété et un ralentissement du métabolisme. C'est l'axe prioritaire à corriger.` })
  }

  // ── EQ completion — specific groups ──
  const sorted = [...bd.eq.details].sort((a, b) => a.ratio - b.ratio)
  const misses = sorted.filter(e => e.ratio < 0.6).slice(0, 3)
  const stars = sorted.filter(e => e.ratio >= 0.9).slice(-3)

  if (bd.eq.score >= 80) {
    insights.push({ type: 'strength', icon: '⭐', text: `${bd.eq.hits}/${bd.eq.total} groupes alimentaires atteints — ta diversité nutritionnelle est solide. Chaque groupe couvre des micronutriments spécifiques que les autres ne fournissent pas.` })
  } else if (stars.length > 0 && misses.length > 0) {
    const starLabels = stars.map(e => eqLabel(e.eqId)).join(', ')
    const missLabels = misses.map(e => `${eqLabel(e.eqId)} (${e.consumed}/${e.target})`).join(', ')
    insights.push({ type: 'strength', icon: '⭐', text: `Bien respectés cette semaine : ${starLabels}.` })
    insights.push({ type: 'weak', icon: '📉', text: `En retard : ${missLabels}. Concentre-toi sur ces groupes cette semaine.` })
  } else if (misses.length > 0) {
    const labels = misses.map(e => `${eqLabel(e.eqId)} (${e.consumed}/${e.target})`).join(', ')
    insights.push({ type: 'weak', icon: '📉', text: `Équivalences manquantes : ${labels}. La variété alimentaire protège contre les carences et maintient le plaisir de manger.` })
  }

  // ── Cross-axis insight (when 2+ axes are excellent) ──
  const excellent = [bd.kcal.score, bd.protein.score, bd.eq.score, bd.regularity.score].filter(s => s >= 85).length
  if (excellent >= 3 && d >= 5) {
    insights.push({ type: 'strength', icon: '🏅', text: 'Trois axes ou plus dans le vert — ton plan nutritionnel est bien intégré à ton quotidien. C\'est le signe d\'une vraie maîtrise.' })
  }

  // ── Wellbeing correlations (deeper) ──
  if (wb) {
    if (wb.energy >= 4 && bd.kcal.score >= 80 && bd.protein.score >= 80) {
      insights.push({ type: 'strength', icon: '⚡', text: 'Énergie élevée, calories et protéines dans la cible — ton alimentation soutient bien ton niveau d\'activité. Ce n\'est pas un hasard.' })
    } else if (wb.energy <= 2 && bd.kcal.ratio < 0.85) {
      insights.push({ type: 'neutral', icon: '⚡', text: 'Énergie basse et apport calorique en dessous de la cible — ton corps manque de carburant. Augmenter tes portions devrait avoir un impact direct sur ta vitalité.' })
    }

    if (wb.hunger <= 2 && bd.protein.ratio < 0.85) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Tu signales de la faim et tes protéines sont basses — les protéines sont le macronutriment le plus rassasiant. Augmente-les et la faim devrait diminuer naturellement.' })
    } else if (wb.hunger <= 2 && kr > 1.10) {
      insights.push({ type: 'neutral', icon: '💡', text: 'Tu ressens de la faim malgré un apport supérieur à ta cible — la composition des repas (fibres, protéines) et les horaires comptent autant que la quantité.' })
    } else if (wb.hunger >= 4 && isPW && kr <= 1.00) {
      insights.push({ type: 'strength', icon: '💡', text: 'Aucune faim malgré un déficit calorique — c\'est le signe que la répartition de tes repas et tes choix d\'aliments sont bien adaptés.' })
    }

    if (wb.sleep <= 2 && bd.protein.ratio < 0.80) {
      insights.push({ type: 'neutral', icon: '😴', text: 'Sommeil perturbé et protéines basses — le tryptophane (acide aminé des protéines) est un précurseur de la mélatonine, hormone du sommeil.' })
    }
    if (wb.sleep <= 2 && wb.stress >= 4) {
      insights.push({ type: 'neutral', icon: '😴', text: 'Stress et sommeil dégradés — cette combinaison augmente le cortisol, qui peut favoriser le stockage abdominal et les pulsions sucrées. Prends soin de ta récupération.' })
    }

    if (wb.stress >= 4 && bd.kcal.ratio > 1.15 && isPW) {
      insights.push({ type: 'neutral', icon: '🧠', text: 'Stress élevé et surplus calorique — le stress est le déclencheur n°1 des écarts alimentaires. Ce n\'est pas un manque de volonté, c\'est physiologique.' })
    } else if (wb.stress <= 2 && isPW && kr <= 1.05) {
      insights.push({ type: 'strength', icon: '🧠', text: 'Stress maîtrisé et alimentation dans la cible — la gestion du stress est souvent le facteur silencieux qui fait la différence en perte de poids.' })
    }
  }

  // ── Phase-specific educational insight ──
  if (ph === 'adaptation' && d >= 5) {
    insights.push({ type: 'neutral', icon: '📚', text: 'Phase d\'adaptation : ton corps s\'ajuste à un nouveau rythme alimentaire. Certaines fluctuations de poids et d\'énergie sont normales les premières semaines.' })
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
          insights.push({ type: 'neutral', icon: '⚖️', text: 'Ton poids se stabilise depuis quelques semaines — c\'est un phénomène fréquent et temporaire. Le corps se recalibre par paliers. Continue le plan, les résultats reviendront.' })
        }
      }
    }

    // GAIN stagnation
    if (obj === 'GAIN' && phase > 3) {
      const recent = sorted.filter(m => m.weightKg != null).slice(0, 4)
      if (recent.length >= 3) {
        const min = Math.min(...recent.map(m => m.weightKg))
        const max = Math.max(...recent.map(m => m.weightKg))
        const span = (new Date(recent[0].date) - new Date(recent[recent.length - 1].date)) / (1000 * 60 * 60 * 24)
        if (max - min <= 0.5 && span >= 18) {
          insights.push({ type: 'neutral', icon: '📊', text: 'Ton poids reste stable depuis 3 semaines — pour relancer la progression, une augmentation de 100–200 kcal/jour est une option à envisager.' })
        }
      }
    }
  }

  // ── Body fat cross-reference ──
  if (latest.bodyFatPct != null && oneWeekAgo?.bodyFatPct != null && latest.weightKg != null && oneWeekAgo?.weightKg != null) {
    const wDelta = latest.weightKg - oneWeekAgo.weightKg
    const bfDelta = latest.bodyFatPct - oneWeekAgo.bodyFatPct

    if (obj === 'RECOMP' && Math.abs(wDelta) <= 0.5 && bfDelta < -0.3) {
      insights.push({ type: 'strength', icon: '🎯', text: 'Recomposition en cours — ton poids est stable mais ta composition corporelle évolue. Le muscle remplace progressivement la graisse. C\'est exactement l\'objectif.' })
    }
    if (obj === 'PW') {
      if (wDelta < -0.3 && bfDelta < -0.2) {
        insights.push({ type: 'strength', icon: '✅', text: 'Tu perds du gras — ta masse grasse diminue avec ton poids. C\'est le scénario optimal en perte de poids.' })
      } else if (wDelta < -0.5 && bfDelta >= 0) {
        insights.push({ type: 'neutral', icon: '💡', text: 'Tu perds du poids mais ta masse grasse ne baisse pas encore — maintiens tes protéines et ton activité physique pour orienter la perte vers le gras plutôt que le muscle.' })
      }
    }
    if (obj === 'GAIN') {
      if (wDelta > 0.3 && bfDelta <= 0.2) {
        insights.push({ type: 'strength', icon: '💪', text: 'Prise de qualité — ta masse grasse reste stable, signe que la majeure partie de ta prise est du muscle.' })
      } else if (wDelta > 0.3 && bfDelta > 0.5) {
        insights.push({ type: 'neutral', icon: '💡', text: 'Ta masse grasse augmente proportionnellement — un ajustement des proportions glucides/lipides pourrait orienter la prise davantage vers le muscle.' })
      }
    }
  }

  // ── Waist / height ratio ──
  if (latest.waistCm != null && clientHeight) {
    const ratio = latest.waistCm / clientHeight
    if (ratio < 0.50) {
      insights.push({ type: 'strength', icon: '📏', text: `Ratio tour de taille/taille de ${ratio.toFixed(2)} — sous le seuil de 0.50, c'est un excellent indicateur de santé cardiovasculaire et métabolique.` })
    } else if (ratio < 0.55) {
      insights.push({ type: 'neutral', icon: '📏', text: `Ratio tour de taille/taille de ${ratio.toFixed(2)} — en approche du seuil de 0.50. La tendance compte plus que la valeur absolue.` })
    }
  }

  // ── Measurement frequency ──
  const last7Days = sorted.filter(m => (now - new Date(m.date)) / (1000 * 60 * 60 * 24) <= 7)
  if (last7Days.length >= 3) {
    insights.push({ type: 'neutral', icon: '⚖️', text: 'Se peser 1 à 2 fois par semaine suffit. Les fluctuations quotidiennes (eau, transit, glycogène) ne reflètent pas ta progression réelle et peuvent créer du stress inutile.' })
  }

  const daysSinceLast = (now - latestDate) / (1000 * 60 * 60 * 24)
  if (daysSinceLast > 21) {
    insights.push({ type: 'neutral', icon: '📊', text: 'Pas de pesée depuis plus de 3 semaines — une mesure cette semaine t\'aiderait à confirmer la tendance.' })
  }

  // ── RECOMP without body fat ──
  if (obj === 'RECOMP' && latest.bodyFatPct == null) {
    insights.push({ type: 'neutral', icon: '💡', text: 'Pour évaluer ta recomposition, le taux de masse grasse est plus parlant que le poids seul. Si tu as accès à une balance impédancemètre, c\'est le moment de l\'utiliser.' })
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
  if (obj === 'PW' && phase <= 2 && weeklyRate < 0) {
    if (Math.abs(weeklyRate) > 2) {
      insights.push({
        type: 'neutral', icon: '💧',
        text: 'Perte rapide en début de plan — c\'est principalement de l\'eau et du glycogène musculaire, pas de la masse grasse. Le rythme va naturellement se stabiliser autour de 0.3–0.7 kg/semaine.',
      })
    }
    return
  }

  if (obj === 'PW') {
    const threshold = phase <= 6 ? 1.5 : 1.0
    if (weeklyRate < -threshold) {
      insights.push({
        type: 'neutral', icon: '⚡',
        text: `Perte de ~${Math.abs(weeklyRate).toFixed(1)} kg/semaine. C'est plus rapide que recommandé — vérifie que tu manges suffisamment. Un rythme de 0.3–0.7 kg/semaine préserve ta masse musculaire et ton énergie.`,
      })
    }
    if (weeklyRate > 0.3 && weeks >= 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: 'Ton poids remonte légèrement — rétention d\'eau, cycle hormonal ou transit en sont souvent la cause. Si la tendance persiste 2–3 semaines, un ajustement sera pertinent.',
      })
    }
  }

  if (obj === 'GAIN') {
    if (weeklyRate > 0.7) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: `Prise de ~${weeklyRate.toFixed(1)} kg/semaine — au-delà de 0.5 kg/semaine, une partie significative peut être de la masse grasse. Si possible, mesure ton taux de MG pour ajuster.`,
      })
    }
    if (weeklyRate < -0.3 && weeks >= 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: 'Tu perds du poids malgré un objectif de prise — vérifie que tu atteins ta cible calorique chaque jour, particulièrement les jours d\'entraînement.',
      })
    }
  }

  if (['MAINT', 'RECOMP', 'COMFORT'].includes(obj)) {
    if (Math.abs(totalDelta) > 2) {
      insights.push({
        type: 'neutral', icon: '📊',
        text: `Variation de ${Math.abs(totalDelta).toFixed(1)} kg sur ${weeks} semaine${weeks > 1 ? 's' : ''}. Les fluctuations sont normales, mais cette amplitude mérite d'être surveillée sur les prochaines semaines.`,
      })
    }
  }
}

// ═══════════════════════════════════════════════
// FEEDBACK PARAGRAPH (main text the patient reads)
// ═══════════════════════════════════════════════

function generateFeedback(bd, score, obj, trend, firstName, wb, daysLogged, phase, milestones, prevBilan) {
  const name = firstName || 'toi'
  const ph = phaseName(phase)

  const axes = [
    { key: 'kcal', score: bd.kcal.score, label: 'tes calories' },
    { key: 'protein', score: bd.protein.score, label: 'tes protéines' },
    { key: 'eq', score: bd.eq.score, label: 'la variété de tes équivalences' },
    { key: 'regularity', score: bd.regularity.score, label: 'ta régularité de suivi' },
  ].sort((a, b) => b.score - a.score)

  const best = axes[0]
  const worst = axes[axes.length - 1]

  // Assemble the paragraph with contextual transitions
  const parts = []

  // 1. Opener (score-tier × objective × phase)
  parts.push(pick(getOpeners(score, name, obj, ph), 1))

  // 2. Strength (data-driven)
  parts.push(pick(getStrengthLines(best, obj, bd), 2))

  // 3. Weakness (only if worst axis < 70)
  if (worst.score < 70) {
    parts.push(pick(getWeaknessLines(worst, obj, bd), 3))
  }

  // 4. Trend / cross-week narrative
  if (trend === 'up') parts.push(pick(TREND_UP, 4))
  else if (trend === 'down') parts.push(pick(TREND_DOWN, 4))
  else if (trend === 'inconclusive') parts.push(pick(TREND_INCONCLUSIVE, 4))

  // 5. Previous bilan cross-reference (if available and insightful)
  if (prevBilan?.score != null) {
    const prevWorst = getWorstAxis(prevBilan)
    if (prevWorst && bd[prevWorst]?.score >= 80 && prevBilan.breakdown?.[prevWorst]?.score < 70) {
      const axisLabel = { kcal: 'les calories', protein: 'les protéines', eq: 'les équivalences', regularity: 'la régularité' }[prevWorst]
      parts.push(`La semaine dernière, ${axisLabel} étaient un point d'attention — cette semaine tu as corrigé le tir. C'est exactement cette capacité d'ajustement qui fait la différence.`)
    }
  }

  // 6. Milestone (if any this week)
  const milestoneLine = getMilestoneLine(milestones)
  if (milestoneLine) parts.push(milestoneLine)

  // 7. Closer (score-tier × objective × phase)
  parts.push(pick(getClosers(score, obj, ph), 5))

  return parts.filter(Boolean).join(' ')
}

function getWorstAxis(bilan) {
  if (!bilan?.breakdown) return null
  const axes = ['kcal', 'protein', 'eq', 'regularity']
  let worst = null, worstScore = 999
  for (const a of axes) {
    const s = bilan.breakdown[a]?.score
    if (s != null && s < worstScore) { worstScore = s; worst = a }
  }
  return worst
}

// ═══════════════════════════════════════════════
// PHRASE BANKS — 5 objectifs × 4 tiers × phases
// ═══════════════════════════════════════════════

function getOpeners(score, name, obj, ph) {
  // ── ≥85 ──
  if (score >= 85) {
    if (obj === 'PW') return [
      `${name}, semaine remarquable.`,
      `${name}, ta rigueur cette semaine est un modèle.`,
      `Rien à redire ${name} — semaine maîtrisée sur tous les plans.`,
      `${name}, tout est aligné cette semaine.`,
      `${name}, semaine de haute volée.`,
      ph === 'adaptation' ? `Dès la phase d'adaptation, ce niveau est impressionnant ${name}.` : null,
      ph === 'cruise' ? `${name}, la constance à ce stade du programme est le signe d'habitudes solidement ancrées.` : null,
    ].filter(Boolean)
    if (obj === 'GAIN') return [
      `${name}, objectif atteint — ton corps a tout ce qu'il lui faut.`,
      `Semaine solide ${name}. La construction avance.`,
      `${name}, tu honores ton plan à la lettre.`,
      `${name}, l'investissement nutritionnel est au rendez-vous.`,
      ph === 'cruise' ? `${name}, après plusieurs semaines à ce niveau, ta prise de masse est sur les rails.` : null,
    ].filter(Boolean)
    if (obj === 'RECOMP') return [
      `${name}, semaine très solide pour ta recomposition.`,
      `${name}, ton cadre nutritionnel est impeccable.`,
      `Semaine maîtrisée ${name} — les conditions sont réunies pour que ta composition évolue.`,
    ]
    if (obj === 'MAINT') return [
      `${name}, ton équilibre alimentaire est parfaitement en place.`,
      `${name}, maintien au top — c'est la preuve que les habitudes sont là.`,
      `Semaine stable et précise ${name}.`,
    ]
    // COMFORT
    return [
      `${name}, belle semaine côté alimentation.`,
      `Très bel équilibre cette semaine ${name}.`,
      `${name}, ton alimentation te fait du bien — ça se voit dans les chiffres.`,
      `${name}, tout est en place pour te sentir bien.`,
    ]
  }

  // ── ≥70 ──
  if (score >= 70) {
    if (obj === 'PW') return [
      `${name}, bonne semaine dans l'ensemble.`,
      `Semaine solide ${name}, la dynamique est là.`,
      `${name}, tu es sur la bonne trajectoire.`,
      `${name}, l'essentiel est en place — quelques détails à affiner.`,
      `Bon travail ${name}. Encore un cran et c'est le vert partout.`,
      ph === 'adaptation' ? `${name}, pour une phase d'adaptation, c'est très encourageant.` : null,
    ].filter(Boolean)
    if (obj === 'GAIN') return [
      `${name}, tu es en route. Les bases sont solides.`,
      `Bonne dynamique ${name} — continue à chercher ta cible calorique.`,
      `${name}, ton programme avance bien. Quelques ajustements et c'est optimal.`,
    ]
    if (obj === 'RECOMP') return [
      `${name}, bonne semaine pour ta recomposition.`,
      `${name}, le cadre est respecté — la rigueur paie.`,
      `Semaine positive ${name}, les conditions sont favorables.`,
    ]
    if (obj === 'MAINT') return [
      `${name}, bonne semaine de maintien.`,
      `${name}, ton équilibre est en bonne voie — il reste quelques détails.`,
      `Semaine correcte ${name}. La stabilité se construit avec ce genre de semaines.`,
    ]
    // COMFORT
    return [
      `${name}, bonne semaine dans l'ensemble.`,
      `${name}, ton équilibre alimentaire se met en place.`,
      `Semaine positive ${name} — la régularité porte ses fruits.`,
      `${name}, tu trouves tes marques.`,
    ]
  }

  // ── ≥55 ──
  if (score >= 55) {
    if (obj === 'PW') return [
      `${name}, semaine correcte avec des marges de progression.`,
      `${name}, les fondations sont là — il reste à consolider.`,
      `${name}, cette semaine montre des bases et des axes d'amélioration clairs.`,
      ph === 'adaptation' ? `${name}, c'est le début — on construit les habitudes semaine après semaine.` : null,
    ].filter(Boolean)
    if (obj === 'GAIN') return [
      `${name}, semaine à renforcer. Tu es en dessous de ton potentiel.`,
      `${name}, les bases sont là mais ton objectif demande plus de régularité.`,
    ]
    if (obj === 'RECOMP') return [
      `${name}, semaine correcte mais la recomposition demande plus de précision.`,
      `${name}, quelques ajustements et tu retrouves le bon rythme.`,
    ]
    if (obj === 'MAINT') return [
      `${name}, semaine correcte. La stabilité demande de la régularité.`,
      `${name}, quelques écarts mais rien d'irréversible.`,
    ]
    // COMFORT
    return [
      `${name}, semaine correcte avec quelques pistes d'amélioration.`,
      `${name}, les bases sont là — quelques ajustements feront la différence.`,
      `${name}, pas de pression — chaque semaine est un apprentissage.`,
    ]
  }

  // ── <55 ──
  if (obj === 'PW') return [
    `${name}, cette semaine nécessite un recadrage.`,
    `Semaine compliquée ${name} — mais chaque lundi est un nouveau départ.`,
    `${name}, on est en dessous de ton potentiel cette semaine. Identifions pourquoi.`,
    ph === 'adaptation' ? `${name}, les premières semaines sont les plus difficiles. Ne te juge pas — ajuste.` : null,
  ].filter(Boolean)
  if (obj === 'GAIN') return [
    `${name}, ta cible nutritionnelle n'est pas atteinte cette semaine.`,
    `${name}, sans apport suffisant, la progression s'arrête. On recentre.`,
  ]
  if (obj === 'RECOMP') return [
    `${name}, cette semaine s'éloigne de l'objectif de recomposition.`,
    `${name}, la recomposition demande de la constance — on reprend le cadre.`,
  ]
  if (obj === 'MAINT') return [
    `${name}, semaine déséquilibrée — reprendre le cadre dès demain est la meilleure réponse.`,
    `${name}, cette semaine s'écarte de ta zone de maintien.`,
  ]
  // COMFORT
  return [
    `${name}, cette semaine mérite un petit recadrage.`,
    `${name}, chaque semaine est une nouvelle occasion de trouver ton équilibre.`,
    `${name}, pas de jugement — identifie ce qui a bloqué et ajuste.`,
  ]
}

// ── Strength lines (data-driven) ──
function getStrengthLines(axis, obj, bd) {
  const kcalDay = Math.round(bd.kcal.actual / 7)
  const kcalTargetDay = Math.round(bd.kcal.target / 7)
  const protDay = Math.round(bd.protein.actual / 7)
  const protTargetDay = Math.round(bd.protein.target / 7)
  const d = bd.regularity.days

  const m = {
    kcal: {
      PW: [
        `Ton budget calorique est bien calibré à ${kcalDay} kcal/jour — ton corps puise dans ses réserves tout en restant nourri.`,
        `Les calories sont dans la cible. En perte de poids, c'est le premier indicateur de succès.`,
        `Ta maîtrise des portions est au rendez-vous — ${kcalDay} kcal/jour, exactement ce qu'il faut.`,
      ],
      GAIN: [
        `Ton objectif calorique de ${kcalTargetDay} kcal/jour est atteint — tu donnes à ton corps le surplus nécessaire à la construction.`,
        `Le carburant est là. Chaque calorie au-dessus du maintien contribue à ta progression.`,
      ],
      RECOMP: [
        `Tes calories sont dans la zone de recomposition — assez pour construire du muscle, pas assez pour stocker du gras.`,
        `L'équilibre calorique est juste — c'est la précision qui distingue la recomposition de la prise de poids.`,
      ],
      MAINT: [
        `Tes calories sont stables autour de ${kcalTargetDay} kcal/jour — c'est ce qui maintient ton poids et ton énergie.`,
        `Budget calorique respecté — la stabilité est la marque du maintien réussi.`,
      ],
      COMFORT: [
        `Tu manges à ta faim sans excès — c'est l'équilibre visé.`,
        `Ton apport calorique respecte tes besoins — pas de restriction, pas d'excès.`,
      ],
    },
    protein: {
      PW: [
        `Tes protéines à ${protDay}g/jour sont dans la zone idéale — elles préservent ta masse musculaire malgré le déficit.`,
        `Le quota protéines est atteint. C'est ce qui fait la différence entre perdre du gras et perdre du muscle.`,
        `Protéines maîtrisées — satiété, récupération et préservation musculaire assurées.`,
      ],
      GAIN: [
        `Tes protéines sont au niveau : ${protDay}g/jour. C'est le matériau brut de ta progression.`,
        `Apport protéique solide — chaque gramme contribue à la synthèse musculaire.`,
      ],
      RECOMP: [
        `Tes protéines à ${protDay}g/jour soutiennent la prise de muscle tout en favorisant la perte de gras.`,
        `L'axe protéique est la pierre angulaire de ta recomposition — et il est bien géré.`,
      ],
      MAINT: [
        `Tes protéines sont dans la zone idéale — elles maintiennent ta masse musculaire et ta satiété.`,
      ],
      COMFORT: [
        `Tes protéines contribuent à ta satiété et à ton énergie quotidienne.`,
      ],
    },
    eq: {
      PW: [
        `${bd.eq.hits}/${bd.eq.total} groupes alimentaires atteints — tu exploites bien la diversité du plan.`,
        `Bonne variété alimentaire — chaque groupe couvre des micronutriments spécifiques.`,
      ],
      GAIN: [
        `La diversité de ton alimentation est au rendez-vous — tes muscles profitent d'un spectre complet de nutriments.`,
        `${bd.eq.hits} groupes couverts sur ${bd.eq.total} — la variété soutient la progression.`,
      ],
      RECOMP: [
        `Tu utilises bien la variété des équivalences — c'est important pour une recomposition équilibrée.`,
      ],
      MAINT: [
        `Bonne diversité alimentaire — en maintien, la variété est ce qui rend le plan durable.`,
      ],
      COMFORT: [
        `Tu varies bien ton alimentation — c'est un vrai plus pour le plaisir et la santé.`,
        `Bonne diversité cette semaine. Le plaisir de manger varié, c'est aussi du confort alimentaire.`,
      ],
    },
    regularity: {
      PW: [
        `${d}/7 jours loggés — ta régularité est un vrai atout. Le suivi transforme une intention en résultat.`,
        `Logger chaque jour, c'est déjà 80% du travail. Tu maîtrises cet aspect.`,
      ],
      GAIN: [
        `${d} jours de suivi — la régularité est ce qui distingue la progression de la stagnation.`,
        `Logger te permet de vérifier que tu atteins ta cible chaque jour. C'est fait.`,
      ],
      RECOMP: [
        `La régularité de ton suivi permet un bilan fiable — et le tien l'est.`,
      ],
      MAINT: [
        `Suivi régulier — c'est ce qui t'empêche de dériver sans t'en apercevoir.`,
      ],
      COMFORT: [
        `Ta régularité montre ton engagement — c'est le signe d'une démarche sérieuse.`,
        `Logger régulièrement sans obsession, c'est exactement l'approche saine.`,
      ],
    },
  }

  const pool = m[axis.key]?.[obj] || m[axis.key]?.PW || ['Point fort identifié cette semaine.']
  return pool
}

// ── Weakness lines (data-driven) ──
function getWeaknessLines(axis, obj, bd) {
  const kcalDay = Math.round(bd.kcal.actual / 7)
  const kcalTargetDay = Math.round(bd.kcal.target / 7)
  const protDay = Math.round(bd.protein.actual / 7)
  const protTargetDay = Math.round(bd.protein.target / 7)
  const gap = protTargetDay - protDay

  const m = {
    kcal: {
      PW: [
        `Le point d'attention : tes calories à ${kcalDay}/${kcalTargetDay} kcal/jour. Vérifie tes portions de féculents et tes ajouts (sauces, huile, fromage).`,
        `L'axe calorique mérite un ajustement — relis tes portions de référence sur ton plan.`,
        `Côté kcal, l'écart est corrigible. Commence par peser tes féculents 2–3 jours cette semaine pour recalibrer ton œil.`,
      ],
      GAIN: [
        `Tu n'atteins pas ton objectif calorique (${kcalDay}/${kcalTargetDay}/jour). Sans surplus, la progression stagne.`,
        `Il manque ~${kcalTargetDay - kcalDay} kcal/jour. Revois les portions prévues dans ton plan et assure-toi de compléter chaque repas et collation.`,
      ],
      RECOMP: [
        `Tes calories s'éloignent de la zone de recomposition — la précision est clé pour cet objectif.`,
      ],
      MAINT: [
        `Tes calories sortent de la zone de maintien. Vérifie tes portions cette semaine.`,
      ],
      COMFORT: [
        `Vérifie que tu manges à ta faim — ni trop, ni trop peu. L'écoute de tes sensations est ta boussole.`,
      ],
    },
    protein: {
      PW: [
        `Les protéines sont en retard : ${protDay}g/${protTargetDay}g/jour. En déficit calorique, c'est l'axe n°1 à protéger.`,
        `Il manque ~${gap}g/jour de protéines. Vérifie dans ton plan les équivalences protéiques prévues et assure-toi de les consommer à chaque repas.`,
        `Tes protéines méritent ton attention — même un ajout modeste par repas suffit à atteindre la cible.`,
      ],
      GAIN: [
        `Protéines insuffisantes : ${protDay}g/${protTargetDay}g/jour. Pas de construction musculaire sans matériau.`,
        `Il manque ~${gap}g/jour. Revois les portions protéiques de ton plan — chaque repas devrait atteindre la quantité prévue.`,
      ],
      RECOMP: [
        `En recomposition, les protéines sont non négociables — et elles manquent cette semaine (${protDay}g/${protTargetDay}g/jour).`,
      ],
      MAINT: [
        `Protéines en dessous de la cible. Même en maintien, elles préservent ta masse musculaire.`,
      ],
      COMFORT: [
        `Tes protéines sont un peu basses — elles contribuent pourtant à la satiété et à l'énergie tout au long de la journée.`,
      ],
    },
    eq: {
      PW: [
        `Certaines équivalences manquent à l'appel — la variété protège contre les carences et maintient le plaisir sur la durée.`,
        `La diversité alimentaire est un levier sous-estimé : chaque groupe d'aliments couvre des micronutriments que les autres ne fournissent pas.`,
      ],
      GAIN: [
        `La variété alimentaire peut progresser — en prise de masse aussi, la diversité nourrit mieux que la monotonie.`,
      ],
      RECOMP: [
        `Quelques groupes alimentaires manquent — la variété soutient à la fois la perte de gras et la prise de muscle.`,
      ],
      MAINT: [
        `Quelques équivalences en retard — la variété est ce qui rend un maintien durable et plaisant.`,
      ],
      COMFORT: [
        `Essaie de varier un peu plus tes choix — le plaisir passe aussi par la découverte.`,
      ],
    },
    regularity: {
      PW: [
        `Le suivi manque de régularité. Sans données, le bilan perd en fiabilité et en utilité.`,
        `Plus tu logges, plus tu développes une conscience alimentaire — c'est le mécanisme le plus efficace pour la perte de poids.`,
        `La constance du suivi est le levier n°1. Même un log rapide vaut mieux que rien.`,
      ],
      GAIN: [
        `Logger te permet de vérifier que tu atteins ta cible — sans suivi, tu navigues à vue.`,
      ],
      RECOMP: [
        `La recomposition demande de la précision — et la précision passe par le suivi.`,
      ],
      MAINT: [
        `En maintien, logger est ce qui empêche le glissement progressif. Vise au moins 5 jours cette semaine.`,
      ],
      COMFORT: [
        `Logger sans pression, même 3 repas par jour, suffit à garder le cap.`,
      ],
    },
  }

  const pool = m[axis.key]?.[obj] || m[axis.key]?.PW || ['Un point mérite ton attention cette semaine.']
  return pool
}

// ── Trend phrases ──
const TREND_UP = [
  'La tendance est positive — tu progresses semaine après semaine.',
  'En progression par rapport à la semaine dernière — la dynamique est là.',
  'Score en hausse : preuve que les ajustements portent leurs fruits.',
  'Progression visible — c\'est la constance qui produit ça.',
]

const TREND_DOWN = [
  'Le score recule par rapport à la semaine dernière — identifie ce qui a changé et corrige le tir.',
  'Léger recul cette semaine — les fluctuations sont normales, ce qui compte c\'est la tendance sur 3–4 semaines.',
  'La tendance est à surveiller. Recentre-toi sur le fondamental : repas complets, loggés chaque jour.',
  'Score en baisse — pas de panique. Une semaine ne définit pas ta progression.',
]

const TREND_INCONCLUSIVE = [
  'Le nombre de jours loggés varie entre les deux semaines — la comparaison est à prendre avec recul.',
  'La différence de jours loggés rend la comparaison moins fiable. Vise 5+ jours cette semaine pour un bilan plus précis.',
]

// ── Milestone line ──
function getMilestoneLine(milestones) {
  if (!milestones || milestones.length === 0) return null
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentMs = milestones.filter(m => m.achieved_at && new Date(m.achieved_at).getTime() > weekAgo)
  if (recentMs.length === 0) return null
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
    return `Tu as franchi un cap important : ${label}. 30 jours de constance, c'est la preuve que les habitudes sont ancrées.`
  }
  return `Tu as débloqué « ${label} » cette semaine — c'est un marqueur concret de ta progression.`
}

// ── Closers ──
function getClosers(score, obj, ph) {
  // ── ≥85 ──
  if (score >= 85) {
    if (obj === 'PW') return [
      'Continue exactement comme ça.',
      'Garde ce rythme — c\'est comme ça qu\'on atteint ses objectifs.',
      'La constance paie. Tu en es la preuve cette semaine.',
      'Ton plan fonctionne. La prochaine semaine est à toi.',
      ph === 'cruise' ? 'Les habitudes sont là — il s\'agit maintenant de les maintenir sur la durée.' : null,
    ].filter(Boolean)
    if (obj === 'GAIN') return [
      'Ton corps a tout ce qu\'il faut pour progresser. Continue.',
      'Le travail en cuisine est fait — le reste se joue à l\'entraînement.',
      'La régularité à ce niveau va produire des résultats visibles.',
    ]
    if (obj === 'RECOMP') return [
      'Les conditions sont réunies pour que ta composition évolue.',
      'Continue avec cette précision — la recomposition est un marathon, pas un sprint.',
    ]
    if (obj === 'MAINT') return [
      'Ton équilibre est en place. Garde ce cap.',
      'La stabilité, c\'est aussi un résultat. Et le tien est solide.',
    ]
    // COMFORT
    return [
      'Continue d\'écouter tes sensations — c\'est la clé.',
      'Ton équilibre alimentaire est solide. Profites-en.',
      'Ce niveau de confort alimentaire, c\'est l\'objectif. Mission accomplie cette semaine.',
    ]
  }

  // ── ≥70 ──
  if (score >= 70) {
    if (obj === 'PW') return [
      'Quelques ajustements et tu passes au niveau supérieur.',
      'Tu es proche de l\'excellence — les détails font la différence.',
      'Concentre-toi sur le point faible identifié et la semaine prochaine sera encore meilleure.',
      'Le cadre est bon. Affine les détails et tout sera au vert.',
    ]
    if (obj === 'GAIN') return [
      'Tu es sur la bonne voie. Pousse encore un peu sur l\'alimentation.',
      'L\'essentiel est là — vise ta cible chaque jour cette semaine.',
    ]
    if (obj === 'RECOMP') return [
      'Un cran de plus et ta recomposition sera sur les rails.',
      'La base est solide — affine les détails et les résultats suivront.',
    ]
    if (obj === 'MAINT') return [
      'Quelques ajustements pour retrouver ta zone de maintien.',
      'La régularité est ta meilleure alliée — continue de logger.',
    ]
    // COMFORT
    return [
      'Quelques ajustements et ton confort alimentaire sera optimal.',
      'Tu es sur la bonne voie — continue de prendre soin de toi.',
    ]
  }

  // ── ≥55 ──
  if (score >= 55) {
    if (obj === 'PW') return [
      'Identifie 1 habitude à solidifier cette semaine — pas 5, une seule.',
      'La prochaine étape : consolider les bases. Commence par tes repas principaux.',
      'Choisis un seul axe à améliorer et concentre toute ton énergie dessus.',
    ]
    if (obj === 'GAIN') return [
      'Concentre-toi sur une chose : atteindre ta cible calorique chaque jour.',
      'Pas besoin de tout changer — assure le minimum : 3 repas complets + 1 collation.',
    ]
    if (obj === 'RECOMP') return [
      'Recentre-toi sur les protéines et la régularité — c\'est la base de la recomposition.',
    ]
    if (obj === 'MAINT') return [
      'Un axe à corriger cette semaine : choisis-le et concentre-toi dessus.',
    ]
    // COMFORT
    return [
      'Choisis une habitude à solidifier cette semaine.',
      'Pas besoin de tout changer — un seul ajustement peut faire la différence.',
    ]
  }

  // ── <55 ──
  if (obj === 'PW') return [
    'Reviens à l\'essentiel : 3 repas complets, loggés chaque jour.',
    'Pas besoin d\'être parfait — juste régulier. Commence demain matin.',
    'Chaque semaine est indépendante. Celle-ci commence maintenant.',
    ph === 'adaptation' ? 'Les premières semaines sont les plus dures. Chaque effort compte, même petit.' : null,
  ].filter(Boolean)
  if (obj === 'GAIN') return [
    'L\'essentiel : mange suffisamment et régulièrement. Le reste suivra.',
    'Reviens aux fondamentaux — 3 repas + 2 collations, loggés chaque jour.',
  ]
  if (obj === 'RECOMP') return [
    'La recomposition est exigeante — reprends le cadre une semaine à la fois.',
  ]
  if (obj === 'MAINT') return [
    'Reprends le rythme : repas réguliers, portions calibrées.',
  ]
  // COMFORT
  return [
    'Reviens à l\'essentiel : des repas réguliers, mangés avec attention.',
    'Chaque semaine est indépendante. Celle-ci commence maintenant.',
  ]
}

// ═══════════════════════════════════════════════
// TIPS — objectif × phase × axe le plus faible
// ═══════════════════════════════════════════════

function generateTips(bd, obj, measurements, phase, daysLogged, wb) {
  const tips = []
  const isPW = obj === 'PW'
  const isGain = obj === 'GAIN'
  const isComfort = obj === 'COMFORT'
  const isRecomp = obj === 'RECOMP'
  const ph = phaseName(phase)

  const axes = [
    { key: 'kcal', score: bd.kcal.score },
    { key: 'protein', score: bd.protein.score },
    { key: 'eq', score: bd.eq.score },
    { key: 'regularity', score: bd.regularity.score },
  ].sort((a, b) => a.score - b.score)

  const weakest = axes[0]
  const secondWeakest = axes[1]

  // ── Primary tip (weakest axis) ──
  if (weakest.key === 'kcal') {
    if (bd.kcal.ratio > 1.1 && isPW) {
      tips.push('Prépare tes repas à l\'avance pour contrôler les quantités. Le batch cooking du dimanche est un levier puissant.')
    } else if (bd.kcal.ratio > 1.1 && isPW) {
      tips.push('Pèse tes féculents (riz, pâtes, pain) 3 jours cette semaine — l\'œil sous-estime souvent les portions après quelques semaines.')
    } else if (bd.kcal.ratio < 0.85 && isGain) {
      tips.push('Revois les collations prévues dans ton plan et assure-toi de ne pas en sauter. Chaque repas et collation comptent pour atteindre ta cible.')
    } else if (bd.kcal.ratio < 0.85 && isPW) {
      tips.push('Tes calories sont trop basses. Vérifie que tu consommes bien toutes les portions prévues dans ton plan, collations comprises. Ton métabolisme a besoin d\'énergie pour fonctionner.')
    } else if (isComfort) {
      tips.push('Essaie de manger à heures régulières — la structure des repas favorise le confort digestif et la satiété.')
    } else if (isRecomp) {
      tips.push('En recomposition, la précision calorique est importante. Pèse tes féculents et tes matières grasses 2-3 jours cette semaine.')
    } else {
      tips.push('Pèse tes portions 2-3 jours cette semaine pour recalibrer ton estimation visuelle.')
    }
  }

  if (weakest.key === 'protein') {
    if (isPW) {
      tips.push('Vérifie que chaque repas contient bien la portion protéique prévue dans ton plan. C\'est l\'axe prioritaire en perte de poids.')
    } else if (isGain) {
      tips.push('Chaque repas doit contenir la source de protéines prévue dans ton plan. En collation aussi — vérifie que tu consommes bien ce qui est prévu.')
    } else if (isRecomp) {
      tips.push('Les protéines sont prioritaires en recomposition. Vise au moins 30g par repas principal.')
    } else {
      tips.push('Consulte les équivalences protéiques de ton plan — même une portion supplémentaire par jour peut suffire à remonter ton score.')
    }
  }

  if (weakest.key === 'eq') {
    const misses = bd.eq.details.filter(e => e.ratio < 0.6).slice(0, 2)
    if (misses.length > 0) {
      tips.push(`Cette semaine, concentre-toi sur : ${misses.map(e => eqLabel(e.eqId)).join(' et ')}. Consulte les alternatives dans ton plan pour chaque groupe.`)
    } else {
      tips.push('Explore les équivalences que tu n\'utilises pas encore — chaque nouveau choix enrichit ta couverture en micronutriments.')
    }
  }

  if (weakest.key === 'regularity') {
    if (ph === 'adaptation') {
      tips.push('Commence par logger un seul repas par jour (le petit-déjeuner par exemple). Une fois que c\'est une habitude, ajoute les autres.')
    } else {
      tips.push('Mets un rappel à 20h pour logger ta journée — 2 minutes suffisent. La régularité du suivi est le premier levier de progression.')
    }
  }

  // ── Secondary tip (second weakest, only if < 70) ──
  if (secondWeakest.score < 70 && tips.length < 3) {
    if (secondWeakest.key === 'protein' && !tips.some(t => t.includes('protéine'))) {
      if (isPW || isRecomp) {
        tips.push('Revois les collations protéiques de ton plan — les consommer systématiquement peut suffire à combler le gap.')
      } else {
        tips.push('Vérifie que tes collations incluent bien la part protéique prévue dans ton plan.')
      }
    }
    if (secondWeakest.key === 'regularity' && !tips.some(t => t.includes('rappel') || t.includes('logger'))) {
      tips.push('Logger même imparfaitement vaut mieux que ne pas logger. Commence par tes repas principaux (PDJ, midi, soir).')
    }
    if (secondWeakest.key === 'eq') {
      const eqMisses = bd.eq.details.filter(e => e.ratio < 0.6).slice(0, 2)
      if (eqMisses.length > 0) {
        tips.push(`Les groupes ${eqMisses.map(e => eqLabel(e.eqId)).join(' et ')} sont en retard. Consulte les alternatives proposées dans ton plan pour chacun.`)
      }
    }
  }

  // ── Wellbeing-based tip ──
  if (wb && tips.length < 3) {
    if (wb.sleep <= 2 && isPW) {
      tips.push('Le manque de sommeil augmente la ghréline (hormone de la faim) et diminue la leptine (satiété). Dormir mieux, c\'est aussi mieux gérer son poids.')
    }
    if (wb.stress >= 4 && tips.length < 3) {
      tips.push('Quand le stress est élevé, simplifie tes repas : prépare 2-3 options fiables que tu peux reproduire sans effort, même les jours difficiles.')
    }
  }

  // ── Success reinforcement (when score is high) ──
  if (weakest.score >= 75 && tips.length < 2) {
    if (isPW) tips.push('Ton plan fonctionne — ne change rien. La tentation d\'aller plus vite (réduire les portions, sauter un repas) est contre-productive.')
    else if (isGain) tips.push('La constance à ce niveau va produire des résultats visibles dans les prochaines semaines. Patience et discipline.')
    else if (isRecomp) tips.push('La recomposition est un processus lent — les changements de composition corporelle précèdent souvent les changements sur la balance.')
    else if (isComfort) tips.push('Ton rapport à l\'alimentation est sain — continue de manger avec attention et plaisir.')
    else tips.push('Tu es dans une excellente dynamique. Continue à logger pour maintenir cette conscience alimentaire.')
  }

  // ── Measurement-based tip ──
  if (measurements && measurements.length > 0 && tips.length < 3) {
    const sortedM = [...measurements].filter(m => m.date).sort((a, b) => b.date.localeCompare(a.date))
    const daysSince = sortedM.length > 0 ? (Date.now() - new Date(sortedM[0].date).getTime()) / (1000 * 60 * 60 * 24) : 999
    if (daysSince > 14) {
      tips.push('Pèse-toi cette semaine — le matin à jeun, dans les mêmes conditions, une fois par semaine suffit.')
    }
  } else if (!measurements || measurements.length === 0) {
    if (tips.length < 3) {
      tips.push('Ajoute ta première mesure corporelle cette semaine — elle servira de point de départ pour suivre ta progression.')
    }
  }

  return tips.slice(0, 3)
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Deterministic per-section selection — uses salt to avoid
 * picking the same index across all phrase banks in the same week.
 */
function pick(arr, salt = 0) {
  if (!arr || arr.length === 0) return ''
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  const idx = Math.abs(weekNum * 7 + salt * 13) % arr.length
  return arr[idx]
}

// ── Complete EQ_LABELS (53 equivalences) ──
const EQ_LABELS = {
  // carbs
  feculents: 'Féculents', pain: 'Pain',
  cereales_ig_modere: 'Céréales', combos_cereales_legumineuses: 'Céréales-légumineuses',
  // dairy
  pl_0_riche_p: 'Produits laitiers protéinés', pl_50_100_kcal: 'Yaourts',
  fromages_10_20_mg: 'Fromages maigres', fromages_20_30_mg: 'Fromages',
  laits_riche_p: 'Laits riches en protéines',
  // fat
  oleagineux_nature: 'Oléagineux', mg_cuisson: 'MG cuisson',
  mg_tartinables: 'MG tartinables', demi_avocat: 'Avocat',
  assaisonnement_repas_chaud: 'Assaisonnement chaud',
  assaisonnement_repas_froid: 'Assaisonnement froid',
  // fruits
  fruits_natures: 'Fruits',
  // veg
  legumes_cuits: 'Légumes cuits', legumes_crus: 'Légumes crus',
  // vvpo
  viandes_faibles_kcal: 'Viandes maigres', viandes_moderees_kcal: 'Viandes modérées',
  viandes_elevees_kcal: 'Viandes riches',
  poissons_maigres: 'Poissons maigres', poissons_gras: 'Poissons gras',
  poissons_conserves_gras: 'Conserves poisson gras', poissons_conserves_maigres: 'Conserves poisson maigre',
  oeuf_poule: 'Œufs', charcuteries_maigres: 'Charcuteries maigres',
  legumineuses_seches: 'Légumineuses', complement_proteine_poudre: 'Protéine en poudre',
  proteine_mixte_2_3_1_3: 'Protéine mixte',
  // protein_v
  proteines_vege_tofu_150g: 'Protéines végétales',
  // vege
  laits_vege: 'Laits végétaux',
  garnitures_tartinables_vege_legumes: 'Garnitures végétales',
  garnitures_tartinables_vege_riche_p: 'Garnitures végé protéinées',
  // toppings
  graines_nature: 'Graines', toppings_pl_bowls: 'Toppings bowls',
  toppings_repas_froid: 'Toppings repas froid',
  // extras
  chocolat_noir_mt70: 'Chocolat noir', extras_glaces: 'Glaces',
  extras_plaisir: 'Extras plaisir', extras_except_patisserie: 'Extras plaisir',
  extras_lactes: 'Desserts lactés', extras_petit_dejeuner: 'Extras petit-déjeuner',
  biscuits: 'Biscuits',
  garnitures_sucrees_pain: 'Garnitures sucrées', garnitures_sucrees_grasses_pain: 'Garnitures sucrées-grasses',
  garnitures_sucrees_variees_pain: 'Garnitures sucrées variées',
  garnitures_sucrees_pl_bowls: 'Garnitures sucrées bowls',
  // recipe
  recettes_plaisirs_proteinees: 'Recettes protéinées', soupe_faible_kcal: 'Soupes légères',
  // alcohol
  alcool_leger_1u: 'Alcool léger', alcool_fort_1_3_1_8u: 'Alcool fort', alcool_mix: 'Cocktails',
}

function eqLabel(eqId) {
  return EQ_LABELS[eqId] || eqId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
