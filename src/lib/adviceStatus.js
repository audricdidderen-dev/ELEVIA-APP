/**
 * adviceStatus.js — Compute advice mastery from bilan evaluation history.
 *
 * Cycle:
 *   Active → Mastered (3× Solide) → Hidden 4 weeks → Re-check → loop
 *
 * Evaluation scores: 2 = Solide, 1 = En progrès, 0 = Pas encore
 */

const SOLIDE = 2
const STREAK_NEEDED = 3
const RECHECK_WEEKS = 4

/**
 * @param {Array} bilans — sorted newest first, each with .notes (JSON) and .weekStart
 * @returns {Object} { [advId]: { status: 'active'|'mastered'|'recheck', streak, lastEvalDate } }
 */
export function computeAdviceStatuses(bilans) {
  if (!bilans || bilans.length === 0) return {}

  // Parse evalScores from each bilan
  const timeline = []
  for (const b of bilans) {
    try {
      const parsed = JSON.parse(b.notes || '{}')
      if (parsed.evalScores) {
        timeline.push({ date: b.weekStart || b.weekEnd, scores: parsed.evalScores })
      }
    } catch { /* skip malformed */ }
  }
  if (timeline.length === 0) return {}

  // Collect all evaluated advice IDs
  const allIds = new Set()
  for (const t of timeline) {
    for (const id of Object.keys(t.scores)) allIds.add(id)
  }

  const now = new Date()
  const result = {}

  for (const advId of allIds) {
    // Build evaluation list (newest first, same order as bilans)
    const evals = timeline
      .filter(t => t.scores[advId] !== undefined)
      .map(t => ({ date: t.date, score: t.scores[advId] }))

    if (evals.length === 0) {
      result[advId] = { status: 'active', streak: 0, lastEvalDate: null }
      continue
    }

    // Count consecutive Solide from most recent
    let streak = 0
    for (const ev of evals) {
      if (ev.score === SOLIDE) streak++
      else break
    }

    const lastEvalDate = evals[0].date
    const weeksSince = lastEvalDate
      ? Math.floor((now - new Date(lastEvalDate)) / (7 * 24 * 60 * 60 * 1000))
      : 999

    if (streak >= STREAK_NEEDED) {
      result[advId] = {
        status: weeksSince >= RECHECK_WEEKS ? 'recheck' : 'mastered',
        streak,
        lastEvalDate,
      }
    } else {
      result[advId] = { status: 'active', streak, lastEvalDate }
    }
  }

  return result
}

/**
 * Split advices into those to evaluate and those to skip.
 * @returns {{ active: Array, recheck: Array }}
 */
export function getEvalAdvices(advices, statuses) {
  const active = []
  const recheck = []
  for (const a of advices) {
    const s = statuses[a.id]
    if (!s || s.status === 'active') active.push(a)
    else if (s.status === 'recheck') recheck.push(a)
    // 'mastered' → skip
  }
  return { active, recheck }
}

/**
 * Derive display status for a single advice.
 */
export function getAdviceDisplayStatus(advId, statuses) {
  const s = statuses[advId]
  if (!s) return 'Nouveau'
  if (s.status === 'mastered' || s.status === 'recheck') return 'Acquis'
  if (s.streak > 0) return 'En progrès'
  return 'Nouveau'
}
