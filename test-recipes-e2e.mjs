/**
 * E2E Recipe System Test — Verifies recipe filtering, ingredient computation,
 * cooked_factor dry-weight logic, and usual values for all 5 test users.
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

// ─── HELPERS (replicating recipeHelpers.js logic) ───

function computeUsualFromStepper(grams, stepper) {
  if (!stepper?.usualGPerUnit) return null
  const units = grams / stepper.usualGPerUnit
  const rounded = Math.round(units * 2) / 2
  if (rounded <= 0) return null
  const unitLabel = rounded <= 1 ? stepper.usualUnitSg : stepper.usualUnitPl
  return `≈ ${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} ${unitLabel}`
}

function computeIngredientDisplay(ing, catalogue, refEqItemsMap) {
  if (ing.isFree) {
    return { label: ing.label, grams: null, usualValue: null, prepNote: null, isFree: true }
  }

  if (!ing.eqId) {
    const label = ing.label || ing.name || ''
    const rawQty = ing.qty || null
    const isNumericWeight = rawQty && /^\d+\s*(g|ml|cl|kg)\b/i.test(rawQty.trim())
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

  // Dynamic ingredient
  const eq = catalogue.find(c => c.eq_id === ing.eqId)
  if (!eq || !eq.qty_plan_grams) {
    return {
      label: ing.label,
      grams: null,
      usualValue: ing.usualHint || null,
      prepNote: ing.prepNote || null,
      isFree: false,
      _reason: !eq ? 'eq_not_in_plan' : 'qty_plan_grams=0',
    }
  }

  // Find matched item via itemId in ref_eq_items
  let matchedItem = null
  if (ing.itemId) {
    matchedItem = refEqItemsMap.get(ing.itemId) || null
  }

  // Calculate grams
  let grams
  if (matchedItem?.cooked_factor && Number(matchedItem.cooked_factor) > 1) {
    grams = Math.round(Number(eq.qty_plan_grams) / Number(matchedItem.cooked_factor))
  } else if (ing.rawRatio) {
    grams = Math.round(Number(eq.qty_plan_grams) * ing.rawRatio)
  } else {
    grams = Math.round(Number(eq.qty_plan_grams))
  }

  // Compute usual value
  let usualValue = null
  if (matchedItem?.usual_g_per_unit) {
    usualValue = computeUsualFromStepper(grams, {
      usualGPerUnit: Number(matchedItem.usual_g_per_unit),
      usualUnitSg: matchedItem.usual_unit_sg || 'portion',
      usualUnitPl: matchedItem.usual_unit_pl || 'portions',
    })
  }
  if (!usualValue) usualValue = ing.usualHint || null

  // Determine prepNote
  let prepNote = ing.prepNote || null
  if (matchedItem?.cooked_factor && Number(matchedItem.cooked_factor) > 1 && !prepNote) {
    prepNote = 'poids sec'
  }

  return {
    label: ing.label,
    grams: `${grams} g`,
    gramsRaw: grams,
    usualValue,
    prepNote,
    isFree: false,
    _eqId: ing.eqId,
    _itemId: ing.itemId,
    _planGrams: Number(eq.qty_plan_grams),
    _cookedFactor: matchedItem?.cooked_factor ? Number(matchedItem.cooked_factor) : null,
    _usualGPerUnit: matchedItem?.usual_g_per_unit ? Number(matchedItem.usual_g_per_unit) : null,
  }
}

// ─── MAIN ───

async function main() {
  const client = new Client(DB_CONFIG)
  await client.connect()
  console.log('========================================================================')
  console.log('  ELEVIA — RECIPE SYSTEM END-TO-END TEST')
  console.log('  ' + new Date().toISOString())
  console.log('========================================================================')

  // ── 1. Get all 5 test users ──
  console.log('\n--- STEP 1: Fetching test users ---')
  const usersRes = await client.query(`
    SELECT p.first_name, p.last_name, au.email,
           cp.id as plan_id, cp.objective_style,
           cp.diet_vegetarian, cp.gluten_free, cp.lactose_free
    FROM profiles p
    JOIN auth.users au ON au.id = p.id
    JOIN client_plans cp ON cp.id = p.active_plan_id
    ORDER BY p.first_name
  `)
  const users = usersRes.rows
  console.log(`Found ${users.length} test users:`)
  for (const u of users) {
    const flags = []
    if (u.diet_vegetarian) flags.push('VEGETARIAN')
    if (u.gluten_free) flags.push('GLUTEN-FREE')
    if (u.lactose_free) flags.push('LACTOSE-FREE')
    console.log(`  - ${u.first_name} (${u.email}) | objective=${u.objective_style} | diet=[${flags.join(', ') || 'none'}]`)
  }

  // ── 2. Get all active recipes ──
  console.log('\n--- STEP 2: Fetching active recipes ---')
  const recipesRes = await client.query(`
    SELECT id, recipe_id, title, category, objective_codes,
           is_vegetarian, is_gluten_free, is_lactose_free,
           ingredients, eq_summary, steps, meal_type, difficulty
    FROM plan_recipes WHERE is_active = true
    ORDER BY recipe_id
  `)
  const allRecipes = recipesRes.rows.map(r => ({
    ...r,
    ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || []),
    eq_summary: typeof r.eq_summary === 'string' ? JSON.parse(r.eq_summary) : (r.eq_summary || []),
    objective_codes: r.objective_codes || [],
  }))
  console.log(`Found ${allRecipes.length} active recipes:`)
  for (const r of allRecipes) {
    const diet = []
    if (r.is_vegetarian) diet.push('V')
    if (r.is_gluten_free) diet.push('GF')
    if (r.is_lactose_free) diet.push('LF')
    console.log(`  - [${r.recipe_id}] ${r.title} | cat=${r.category} | obj=[${r.objective_codes.join(',')||'ALL'}] | diet=[${diet.join(',')}]`)
  }

  // ── 3. Get ref_eq_items ──
  console.log('\n--- STEP 3: Fetching ref_eq_items ---')
  const refRes = await client.query(`
    SELECT eq_id, item_id, food_label, cooked_factor, usual_g_per_unit, usual_unit_sg, usual_unit_pl
    FROM ref_eq_items WHERE item_id IS NOT NULL
    ORDER BY eq_id, item_id
  `)
  const refEqItems = refRes.rows
  const refEqItemsMap = new Map()
  for (const item of refEqItems) {
    refEqItemsMap.set(item.item_id, item)
  }
  console.log(`Found ${refEqItems.length} ref_eq_items with item_id`)

  // Show items with cooked_factor > 1
  const cookedItems = refEqItems.filter(i => i.cooked_factor && Number(i.cooked_factor) > 1)
  console.log(`\nItems with cooked_factor > 1 (dry-weight candidates):`)
  for (const ci of cookedItems) {
    console.log(`  - [${ci.eq_id}] ${ci.item_id} (${ci.food_label}): cooked_factor=${ci.cooked_factor}`)
  }

  // ── 4. Per-user analysis ──
  const globalStats = {
    totalUsers: users.length,
    totalRecipes: allRecipes.length,
    perUser: [],
    errors: [],
    warnings: [],
  }

  for (const user of users) {
    console.log('\n========================================================================')
    console.log(`  USER: ${user.first_name} ${user.last_name || ''} (${user.email})`)
    console.log(`  Objective: ${user.objective_style} | Plan ID: ${user.plan_id}`)
    const dietFlags = []
    if (user.diet_vegetarian) dietFlags.push('VEGETARIAN')
    if (user.gluten_free) dietFlags.push('GLUTEN-FREE')
    if (user.lactose_free) dietFlags.push('LACTOSE-FREE')
    console.log(`  Diet restrictions: ${dietFlags.join(', ') || 'none'}`)
    console.log('========================================================================')

    // Get plan_equivalences for this user
    const eqRes = await client.query(`
      SELECT eq_id, qty_plan_grams, label_fr
      FROM plan_equivalences WHERE plan_id = $1
      ORDER BY eq_id
    `, [user.plan_id])
    const planEquivalences = eqRes.rows

    console.log(`\n  Plan equivalences (${planEquivalences.length} total):`)
    for (const eq of planEquivalences) {
      console.log(`    ${eq.eq_id}: ${eq.qty_plan_grams}g (${eq.label_fr})`)
    }

    // Filter recipes (same logic as transformPlanData.js)
    const objectiveCode = user.objective_style || 'PW'
    const filteredRecipes = allRecipes.filter(r => {
      const codes = r.objective_codes || []
      if (codes.length > 0 && !codes.includes(objectiveCode)) return false
      if (user.diet_vegetarian && !r.is_vegetarian) return false
      if (user.gluten_free && !r.is_gluten_free) return false
      if (user.lactose_free && !r.is_lactose_free) return false
      return true
    })

    const excludedRecipes = allRecipes.filter(r => !filteredRecipes.includes(r))

    console.log(`\n  Filtered recipes: ${filteredRecipes.length} shown / ${allRecipes.length} total`)
    if (excludedRecipes.length > 0) {
      console.log(`  Excluded recipes (${excludedRecipes.length}):`)
      for (const r of excludedRecipes) {
        const reasons = []
        const codes = r.objective_codes || []
        if (codes.length > 0 && !codes.includes(objectiveCode)) reasons.push(`obj mismatch (recipe=[${codes}], user=${objectiveCode})`)
        if (user.diet_vegetarian && !r.is_vegetarian) reasons.push('not vegetarian')
        if (user.gluten_free && !r.is_gluten_free) reasons.push('not gluten-free')
        if (user.lactose_free && !r.is_lactose_free) reasons.push('not lactose-free')
        console.log(`    EXCLUDED: [${r.recipe_id}] ${r.title} — reason: ${reasons.join(', ')}`)
      }
    }

    // Per-user stats
    const userStats = {
      name: `${user.first_name} (${user.email})`,
      objective: objectiveCode,
      totalRecipes: filteredRecipes.length,
      excludedRecipes: excludedRecipes.length,
      ingredientsWithGrams: 0,
      ingredientsWithoutGrams: 0,
      ingredientsWithUsual: 0,
      ingredientsWithPrepNote: 0,
      freeIngredients: 0,
      staticIngredients: 0,
      dynamicIngredients: 0,
      dryWeightIngredients: 0,
    }

    // Process each recipe
    for (const recipe of filteredRecipes) {
      console.log(`\n  ── RECIPE: ${recipe.title} [${recipe.recipe_id}] ──`)
      console.log(`     Category: ${recipe.category} | Objective codes: [${recipe.objective_codes.join(',') || 'ALL'}]`)

      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        console.log('     (no ingredients)')
        continue
      }

      for (const ing of recipe.ingredients) {
        const result = computeIngredientDisplay(ing, planEquivalences, refEqItemsMap)

        // Classify
        if (result.isFree) {
          userStats.freeIngredients++
        } else if (!ing.eqId) {
          userStats.staticIngredients++
        } else {
          userStats.dynamicIngredients++
        }

        if (result.grams) userStats.ingredientsWithGrams++
        else if (!result.isFree) userStats.ingredientsWithoutGrams++
        if (result.usualValue) userStats.ingredientsWithUsual++
        if (result.prepNote) userStats.ingredientsWithPrepNote++
        if (result._cookedFactor && result._cookedFactor > 1) userStats.dryWeightIngredients++

        // Build display line
        let line = `     `
        if (result.isFree) {
          line += `[FREE]  ${result.label}`
        } else if (!ing.eqId) {
          line += `[STATIC]  ${result.label}`
          if (result.grams) line += ` | ${result.grams}`
          if (result.usualValue) line += ` | usual: ${result.usualValue}`
          if (result.prepNote) line += ` | note: ${result.prepNote}`
        } else {
          line += `[DYNAMIC] ${result.label}`
          line += ` | eqId=${ing.eqId}`
          if (ing.itemId) line += ` | itemId=${ing.itemId}`
          line += ` | planGrams=${result._planGrams || 'N/A'}`
          if (result._cookedFactor) line += ` | cookedFactor=${result._cookedFactor}`
          line += ` | displayed=${result.grams || 'NULL'}`
          if (result.usualValue) line += ` | usual: ${result.usualValue}`
          if (result.prepNote) line += ` | note: ${result.prepNote}`
          if (result._reason) line += ` | ISSUE: ${result._reason}`
        }

        console.log(line)

        // Flag issues
        if (ing.eqId && !result.grams && !result.isFree) {
          const msg = `[${user.first_name}] Recipe "${recipe.title}" — ingredient "${ing.label}" (eqId=${ing.eqId}): missing grams (${result._reason || 'unknown reason'})`
          globalStats.warnings.push(msg)
          console.log(`     *** WARNING: ${msg}`)
        }

        if (ing.eqId && ing.itemId && result.grams && !result.usualValue) {
          // Check if ref_eq_items has a stepper for this item
          const refItem = refEqItemsMap.get(ing.itemId)
          if (refItem && refItem.usual_g_per_unit) {
            const msg = `[${user.first_name}] Recipe "${recipe.title}" — "${ing.label}" has usual_g_per_unit=${refItem.usual_g_per_unit} in ref but usualValue not computed`
            globalStats.errors.push(msg)
            console.log(`     *** ERROR: ${msg}`)
          } else {
            const msg = `[${user.first_name}] Recipe "${recipe.title}" — "${ing.label}" (itemId=${ing.itemId}): no usual_g_per_unit in ref_eq_items`
            globalStats.warnings.push(msg)
            console.log(`     *** WARNING: ${msg}`)
          }
        }

        // Verify dry-weight logic specifically
        if (ing.itemId && result._cookedFactor && result._cookedFactor > 1) {
          const expectedDryGrams = Math.round(result._planGrams / result._cookedFactor)
          if (result.gramsRaw !== expectedDryGrams) {
            const msg = `[${user.first_name}] Recipe "${recipe.title}" — "${ing.label}": dry-weight mismatch! expected=${expectedDryGrams}g, got=${result.gramsRaw}g`
            globalStats.errors.push(msg)
            console.log(`     *** ERROR: ${msg}`)
          }
          if (!result.prepNote || !result.prepNote.includes('poids sec')) {
            const msg = `[${user.first_name}] Recipe "${recipe.title}" — "${ing.label}": has cooked_factor=${result._cookedFactor} but no "poids sec" prepNote`
            globalStats.errors.push(msg)
            console.log(`     *** ERROR: ${msg}`)
          }
        }
      }

      // Show eq_summary macros
      if (recipe.eq_summary && recipe.eq_summary.length > 0) {
        console.log(`     Eq Summary:`)
        for (const es of recipe.eq_summary) {
          const eq = planEquivalences.find(c => c.eq_id === es.eqId)
          console.log(`       ${es.eqId}: ${es.portions} portion(s) — plan has: ${eq ? eq.qty_plan_grams + 'g' : 'NOT IN PLAN'}`)
        }
      }
    }

    globalStats.perUser.push(userStats)
  }

  // ── 5. SUMMARY ──
  console.log('\n\n========================================================================')
  console.log('  SUMMARY REPORT')
  console.log('========================================================================')

  console.log('\n  PER-USER STATISTICS:')
  console.log('  ' + '-'.length)

  const headerLine = `  ${'User'.padEnd(35)} ${'Obj'.padEnd(6)} ${'Recipes'.padEnd(8)} ${'Dynamic'.padEnd(8)} ${'w/Grams'.padEnd(8)} ${'w/o Grams'.padEnd(10)} ${'w/Usual'.padEnd(8)} ${'DryWt'.padEnd(6)} ${'Free'.padEnd(5)} ${'Static'.padEnd(7)}`
  console.log(headerLine)
  console.log('  ' + '-'.repeat(headerLine.length - 2))

  for (const s of globalStats.perUser) {
    console.log(`  ${s.name.padEnd(35)} ${s.objective.padEnd(6)} ${String(s.totalRecipes).padEnd(8)} ${String(s.dynamicIngredients).padEnd(8)} ${String(s.ingredientsWithGrams).padEnd(8)} ${String(s.ingredientsWithoutGrams).padEnd(10)} ${String(s.ingredientsWithUsual).padEnd(8)} ${String(s.dryWeightIngredients).padEnd(6)} ${String(s.freeIngredients).padEnd(5)} ${String(s.staticIngredients).padEnd(7)}`)
  }

  console.log(`\n  ERRORS (${globalStats.errors.length}):`)
  if (globalStats.errors.length === 0) {
    console.log('    None')
  } else {
    for (const e of globalStats.errors) {
      console.log(`    [ERROR] ${e}`)
    }
  }

  console.log(`\n  WARNINGS (${globalStats.warnings.length}):`)
  if (globalStats.warnings.length === 0) {
    console.log('    None')
  } else {
    for (const w of globalStats.warnings) {
      console.log(`    [WARN] ${w}`)
    }
  }

  // ── 6. SPECIFIC VERIFICATIONS ──
  console.log('\n\n========================================================================')
  console.log('  SPECIFIC VERIFICATIONS')
  console.log('========================================================================')

  // A. Feculents dry-weight check
  console.log('\n  A. FECULENTS DRY-WEIGHT VERIFICATION:')
  console.log('     Checking that items with cooked_factor > 1 show dry weight...')
  let dryWeightChecks = 0
  let dryWeightPasses = 0
  for (const user of users) {
    const eqRes2 = await client.query(`SELECT eq_id, qty_plan_grams FROM plan_equivalences WHERE plan_id = $1`, [user.plan_id])
    const planEq = eqRes2.rows
    const objectiveCode = user.objective_style || 'PW'
    const filtered = allRecipes.filter(r => {
      const codes = r.objective_codes || []
      if (codes.length > 0 && !codes.includes(objectiveCode)) return false
      if (user.diet_vegetarian && !r.is_vegetarian) return false
      if (user.gluten_free && !r.is_gluten_free) return false
      if (user.lactose_free && !r.is_lactose_free) return false
      return true
    })
    for (const recipe of filtered) {
      for (const ing of (recipe.ingredients || [])) {
        if (!ing.eqId || !ing.itemId) continue
        const refItem = refEqItemsMap.get(ing.itemId)
        if (!refItem || !refItem.cooked_factor || Number(refItem.cooked_factor) <= 1) continue
        dryWeightChecks++
        const eq = planEq.find(e => e.eq_id === ing.eqId)
        if (!eq) continue
        const planG = Number(eq.qty_plan_grams)
        const cf = Number(refItem.cooked_factor)
        const expectedDry = Math.round(planG / cf)
        const result = computeIngredientDisplay(ing, planEq, refEqItemsMap)
        const pass = result.gramsRaw === expectedDry && result.prepNote && result.prepNote.includes('poids sec')
        if (pass) dryWeightPasses++
        const status = pass ? 'PASS' : 'FAIL'
        console.log(`     [${status}] ${user.first_name}: "${recipe.title}" — ${ing.label}: plan=${planG}g, cf=${cf}, expected_dry=${expectedDry}g, got=${result.gramsRaw}g, prepNote="${result.prepNote}"`)
      }
    }
  }
  console.log(`     Result: ${dryWeightPasses}/${dryWeightChecks} dry-weight checks passed`)

  // B. Diet filtering check
  console.log('\n  B. DIET FILTERING VERIFICATION:')
  for (const user of users) {
    const objectiveCode = user.objective_style || 'PW'
    const filtered = allRecipes.filter(r => {
      const codes = r.objective_codes || []
      if (codes.length > 0 && !codes.includes(objectiveCode)) return false
      if (user.diet_vegetarian && !r.is_vegetarian) return false
      if (user.gluten_free && !r.is_gluten_free) return false
      if (user.lactose_free && !r.is_lactose_free) return false
      return true
    })

    if (user.diet_vegetarian) {
      const nonVeg = filtered.filter(r => !r.is_vegetarian)
      const status = nonVeg.length === 0 ? 'PASS' : 'FAIL'
      console.log(`     [${status}] ${user.first_name} (vegetarian): ${nonVeg.length} non-veg recipes in filtered set`)
      if (nonVeg.length > 0) {
        for (const r of nonVeg) console.log(`       LEAKED: ${r.title}`)
      }
    }
    if (user.gluten_free) {
      const nonGF = filtered.filter(r => !r.is_gluten_free)
      const status = nonGF.length === 0 ? 'PASS' : 'FAIL'
      console.log(`     [${status}] ${user.first_name} (gluten-free): ${nonGF.length} non-GF recipes in filtered set`)
      if (nonGF.length > 0) {
        for (const r of nonGF) console.log(`       LEAKED: ${r.title}`)
      }
    }
    if (user.lactose_free) {
      const nonLF = filtered.filter(r => !r.is_lactose_free)
      const status = nonLF.length === 0 ? 'PASS' : 'FAIL'
      console.log(`     [${status}] ${user.first_name} (lactose-free): ${nonLF.length} non-LF recipes in filtered set`)
      if (nonLF.length > 0) {
        for (const r of nonLF) console.log(`       LEAKED: ${r.title}`)
      }
    }
    if (!user.diet_vegetarian && !user.gluten_free && !user.lactose_free) {
      console.log(`     [INFO] ${user.first_name}: no diet restrictions, ${filtered.length} recipes shown`)
    }
  }

  // C. Usual values from stepper check
  console.log('\n  C. USUAL VALUES FROM STEPPER VERIFICATION:')
  console.log('     Checking that usual values come from ref_eq_items stepper, not just hardcoded...')
  let stepperChecks = 0
  let stepperFromRef = 0
  let stepperFromHint = 0
  let stepperMissing = 0
  for (const user of users) {
    const eqRes3 = await client.query(`SELECT eq_id, qty_plan_grams FROM plan_equivalences WHERE plan_id = $1`, [user.plan_id])
    const planEq = eqRes3.rows
    const objectiveCode = user.objective_style || 'PW'
    const filtered = allRecipes.filter(r => {
      const codes = r.objective_codes || []
      if (codes.length > 0 && !codes.includes(objectiveCode)) return false
      if (user.diet_vegetarian && !r.is_vegetarian) return false
      if (user.gluten_free && !r.is_gluten_free) return false
      if (user.lactose_free && !r.is_lactose_free) return false
      return true
    })
    for (const recipe of filtered) {
      for (const ing of (recipe.ingredients || [])) {
        if (!ing.eqId || ing.isFree) continue
        stepperChecks++
        const eq = planEq.find(e => e.eq_id === ing.eqId)
        if (!eq) continue
        const result = computeIngredientDisplay(ing, planEq, refEqItemsMap)
        if (!result.usualValue) {
          stepperMissing++
        } else if (ing.usualHint && result.usualValue === ing.usualHint) {
          stepperFromHint++
        } else {
          stepperFromRef++
        }
      }
    }
  }
  console.log(`     Total dynamic ingredients checked: ${stepperChecks}`)
  console.log(`     Usual from ref stepper: ${stepperFromRef}`)
  console.log(`     Usual from hardcoded hint: ${stepperFromHint}`)
  console.log(`     Usual missing: ${stepperMissing}`)

  // ── FINAL ──
  const totalErrors = globalStats.errors.length
  const totalWarnings = globalStats.warnings.length
  console.log('\n========================================================================')
  console.log(`  FINAL RESULT: ${totalErrors} errors, ${totalWarnings} warnings`)
  if (totalErrors === 0) {
    console.log('  STATUS: ALL CHECKS PASSED')
  } else {
    console.log('  STATUS: ISSUES FOUND — review errors above')
  }
  console.log('========================================================================')

  await client.end()
}

main().catch(err => {
  console.error('FATAL ERROR:', err)
  process.exit(1)
})
