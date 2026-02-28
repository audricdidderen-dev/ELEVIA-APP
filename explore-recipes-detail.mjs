/**
 * EXPLORE RECIPES DETAIL — Detailed breakdown of all 98 active recipes
 * Shows eq_summary, dynamic ingredients, portionFraction status, eqId sharing
 * Grouped by category (breakfast, meal, snack, sauce)
 */
import pg from 'pg'
const { Client } = pg

const DB_CONFIG = {
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.rlemorqfkuloyxoydmdj',
  password: 'wifjad-4wikzi-jawniJ',
  ssl: { rejectUnauthorized: false },
}

const CATEGORY_ORDER = ['breakfast', 'meal', 'snack', 'sauce']

async function main() {
  const client = new Client(DB_CONFIG)
  await client.connect()

  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('  EXPLORE RECIPES DETAIL — Breakdown complet des recettes actives')
  console.log('  ' + new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════════════════════════════')

  // ── Fetch all active recipes ──
  const result = await client.query(`
    SELECT recipe_id, title, category, meal_type, objective_codes,
           ingredients, eq_summary
    FROM plan_recipes
    WHERE is_active = true
    ORDER BY
      CASE category
        WHEN 'breakfast' THEN 1
        WHEN 'meal' THEN 2
        WHEN 'snack' THEN 3
        WHEN 'sauce' THEN 4
        ELSE 5
      END,
      recipe_id
  `)

  const recipes = result.rows

  // ── Global counters ──
  let totalRecipes = 0
  let recipesWithPfSet = 0       // at least one ingredient has portionFraction set
  let recipesWithPfMissing = 0   // at least one ingredient has portionFraction missing
  let recipesWithSharedEq = 0    // at least one eqId shared by >1 ingredient
  let recipesWithRawRatio = 0    // at least one ingredient has rawRatio
  let totalDynamicIngs = 0
  let totalPfSet = 0
  let totalPfMissing = 0
  let totalRawRatio = 0
  const categoryCounts = {}
  const needsPfAdjustment = []     // recipes where shared eqId means portionFraction < 1 is needed
  const pfAlreadySet = []          // recipes where portionFraction is already set

  // ── Group by category ──
  const grouped = {}
  for (const cat of CATEGORY_ORDER) grouped[cat] = []
  for (const r of recipes) {
    const cat = r.category || 'unknown'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(r)
  }

  // ── Process each category ──
  for (const cat of CATEGORY_ORDER) {
    const catRecipes = grouped[cat] || []
    if (catRecipes.length === 0) continue

    categoryCounts[cat] = catRecipes.length

    console.log('\n\n')
    console.log('█████████████████████████████████████████████████████████████████████████████')
    console.log(`  CATEGORIE: ${cat.toUpperCase()} (${catRecipes.length} recettes)`)
    console.log('█████████████████████████████████████████████████████████████████████████████')

    for (const r of catRecipes) {
      totalRecipes++
      const ings = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || [])
      const eqs = typeof r.eq_summary === 'string' ? JSON.parse(r.eq_summary) : (r.eq_summary || [])
      const objCodes = (r.objective_codes || []).length > 0 ? r.objective_codes.join(', ') : 'ALL'

      console.log('\n  ────────────────────────────────────────────────────────────────────────')
      console.log(`  ${r.recipe_id}  |  "${r.title}"`)
      console.log(`  category: ${r.category}  |  meal_type: ${r.meal_type || '-'}  |  objectives: [${objCodes}]`)

      // ── eq_summary ──
      console.log(`  eq_summary (${eqs.length} entries):`)
      for (const eq of eqs) {
        console.log(`    - eqId: ${eq.eqId}  |  portions: ${eq.portions}`)
      }

      // ── For sauces: stop here (simplified) ──
      if (cat === 'sauce') {
        continue
      }

      // ── Dynamic ingredients ──
      const dynamicIngs = ings.filter(i => i.eqId)
      const staticIngs = ings.filter(i => !i.eqId && !i.isFree)
      const freeIngs = ings.filter(i => i.isFree)

      // Count items per eqId in this recipe
      const eqIdCounts = {}
      for (const ing of dynamicIngs) {
        eqIdCounts[ing.eqId] = (eqIdCounts[ing.eqId] || 0) + 1
      }
      const sharedEqIds = Object.entries(eqIdCounts).filter(([, count]) => count > 1)

      // Track recipe-level flags
      let thisHasPfSet = false
      let thisHasPfMissing = false
      let thisHasRawRatio = false
      const thisHasSharedEq = sharedEqIds.length > 0

      console.log(`  dynamic ingredients (${dynamicIngs.length}):`)
      for (const ing of dynamicIngs) {
        totalDynamicIngs++
        const pf = ing.portionFraction
        const pfDisplay = pf !== undefined && pf !== null ? pf : 'MISSING'
        const itemIdDisplay = ing.itemId || 'MISSING'
        const sharedCount = eqIdCounts[ing.eqId]

        let line = `    - ${ing.label}`
        line += `  |  eqId: ${ing.eqId}`
        line += `  |  itemId: ${itemIdDisplay}`
        line += `  |  portionFraction: ${pfDisplay}`
        if (ing.rawRatio) {
          line += `  |  rawRatio: ${ing.rawRatio}`
          thisHasRawRatio = true
          totalRawRatio++
        }
        if (sharedCount > 1) {
          line += `  |  [SHARED: ${sharedCount} items use this eqId]`
        }

        console.log(line)

        if (pf !== undefined && pf !== null) {
          thisHasPfSet = true
          totalPfSet++
        } else {
          thisHasPfMissing = true
          totalPfMissing++
        }
      }

      // Show shared eqId warning
      if (thisHasSharedEq) {
        console.log(`  ** SHARED eqId alert: ${sharedEqIds.map(([id, cnt]) => `${id} (${cnt}x)`).join(', ')}`)
        needsPfAdjustment.push({
          recipe_id: r.recipe_id,
          title: r.title,
          shared: sharedEqIds.map(([id, cnt]) => ({ eqId: id, count: cnt })),
        })
      }

      // Static + free ingredient counts
      if (staticIngs.length > 0 || freeIngs.length > 0) {
        console.log(`  static: ${staticIngs.length}  |  free: ${freeIngs.length}`)
      }

      // Update recipe-level counters
      if (thisHasPfSet) recipesWithPfSet++
      if (thisHasPfMissing) recipesWithPfMissing++
      if (thisHasSharedEq) recipesWithSharedEq++
      if (thisHasRawRatio) recipesWithRawRatio++

      if (thisHasPfSet) {
        pfAlreadySet.push({
          recipe_id: r.recipe_id,
          title: r.title,
          ings: dynamicIngs.filter(i => i.portionFraction !== undefined && i.portionFraction !== null)
            .map(i => ({ label: i.label, eqId: i.eqId, pf: i.portionFraction })),
        })
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n\n')
  console.log('═══════════════════════════════════════════════════════════════════════════════')
  console.log('  RESUME GLOBAL')
  console.log('═══════════════════════════════════════════════════════════════════════════════')

  console.log(`\n  Total recettes actives: ${totalRecipes}`)
  console.log(`  Par categorie:`)
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`    ${cat}: ${count}`)
  }

  console.log(`\n  Ingredients dynamiques:`)
  console.log(`    Total: ${totalDynamicIngs}`)
  console.log(`    Avec portionFraction: ${totalPfSet}`)
  console.log(`    Sans portionFraction (MISSING): ${totalPfMissing}`)
  console.log(`    Avec rawRatio: ${totalRawRatio}`)

  console.log(`\n  Recettes (flags):`)
  console.log(`    Au moins 1 portionFraction set: ${recipesWithPfSet}`)
  console.log(`    Au moins 1 portionFraction MISSING: ${recipesWithPfMissing}`)
  console.log(`    Au moins 1 eqId partage (>1 item): ${recipesWithSharedEq}`)
  console.log(`    Au moins 1 rawRatio: ${recipesWithRawRatio}`)

  // ── Recipes needing portionFraction adjustments (shared eqId) ──
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  RECETTES AVEC eqId PARTAGE (${needsPfAdjustment.length}) — portionFraction < 1 probablement requis`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (needsPfAdjustment.length === 0) {
    console.log('  Aucune recette avec eqId partage.')
  } else {
    for (const r of needsPfAdjustment) {
      console.log(`  ${r.recipe_id}: "${r.title}"`)
      for (const s of r.shared) {
        console.log(`    -> ${s.eqId} utilise par ${s.count} ingredients`)
      }
    }
  }

  // ── Recipes already having portionFraction ──
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  RECETTES AVEC portionFraction DEJA SET (${pfAlreadySet.length})`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  if (pfAlreadySet.length === 0) {
    console.log('  Aucune recette avec portionFraction set.')
  } else {
    for (const r of pfAlreadySet) {
      console.log(`  ${r.recipe_id}: "${r.title}"`)
      for (const ing of r.ings) {
        console.log(`    -> ${ing.label} (${ing.eqId}): portionFraction = ${ing.pf}`)
      }
    }
  }

  // ── Decision matrix: which recipes need what ──
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  MATRICE DE DECISION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const sharedIds = new Set(needsPfAdjustment.map(r => r.recipe_id))
  const pfSetIds = new Set(pfAlreadySet.map(r => r.recipe_id))

  // Category A: Has shared eqId AND portionFraction not yet set -> NEEDS ADJUSTMENT
  const catA = needsPfAdjustment.filter(r => !pfSetIds.has(r.recipe_id))
  // Category B: Has shared eqId AND portionFraction already set -> VERIFY VALUES
  const catB = needsPfAdjustment.filter(r => pfSetIds.has(r.recipe_id))
  // Category C: No shared eqId, portionFraction missing -> simple 1.0 default
  const catC_count = totalRecipes - recipesWithPfSet - (recipesWithPfMissing - recipesWithPfSet)

  console.log(`\n  A) NEEDS portionFraction (shared eqId, pf NOT set): ${catA.length} recipes`)
  for (const r of catA) {
    console.log(`     ${r.recipe_id}: "${r.title}" -> ${r.shared.map(s => `${s.eqId}(${s.count}x)`).join(', ')}`)
  }

  console.log(`\n  B) VERIFY portionFraction (shared eqId, pf already set): ${catB.length} recipes`)
  for (const r of catB) {
    const pfInfo = pfAlreadySet.find(p => p.recipe_id === r.recipe_id)
    console.log(`     ${r.recipe_id}: "${r.title}" -> shared: ${r.shared.map(s => `${s.eqId}(${s.count}x)`).join(', ')}`)
    if (pfInfo) {
      for (const ing of pfInfo.ings) {
        console.log(`       pf set: ${ing.label} (${ing.eqId}) = ${ing.pf}`)
      }
    }
  }

  console.log(`\n  C) SIMPLE 1.0 default: all other recipes with missing portionFraction`)
  console.log(`     (No shared eqId -> each dynamic ingredient = full portion)`)
  console.log(`     These recipes just need portionFraction: 1.0 added to all dynamic ingredients`)

  console.log('\n═══════════════════════════════════════════════════════════════════════════════')

  await client.end()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
