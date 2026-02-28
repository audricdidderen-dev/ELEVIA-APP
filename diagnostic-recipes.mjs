/**
 * DIAGNOSTIC COMPLET — Système Recettes Élevia
 * Exécute les 8 requêtes de diagnostic + analyse exhaustive
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

async function main() {
  const client = new Client(DB_CONFIG)
  await client.connect()

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  DIAGNOSTIC COMPLET — SYSTÈME RECETTES ÉLEVIA')
  console.log('  ' + new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════════════')

  // ── D1: Recettes avec portions ≠ 1 ──
  console.log('\n\n━━━ D1: RECETTES AVEC PORTIONS ≠ 1 ━━━')
  const d1 = await client.query(`
    SELECT recipe_id, title, elem->>'eqId' as eq_id, elem->>'portions' as portions
    FROM plan_recipes, jsonb_array_elements(eq_summary) elem
    WHERE (elem->>'portions')::numeric != 1 AND is_active = true
    ORDER BY recipe_id
  `)
  if (d1.rows.length === 0) console.log('  ✅ Aucune — toutes les portions = 1')
  else {
    console.log(`  ❌ ${d1.rows.length} entrées avec portions ≠ 1:`)
    for (const r of d1.rows) console.log(`    [${r.recipe_id}] ${r.eq_id} = ${r.portions}`)
  }

  // ── D2: Ingrédients dynamiques sans itemId ──
  console.log('\n\n━━━ D2: INGRÉDIENTS DYNAMIQUES SANS itemId ━━━')
  const d2 = await client.query(`
    SELECT recipe_id, title, ing->>'eqId' as eq_id, ing->>'label' as label
    FROM plan_recipes, jsonb_array_elements(ingredients) ing
    WHERE is_active = true
      AND ing->>'eqId' IS NOT NULL
      AND (ing->>'itemId' IS NULL OR ing->>'itemId' = '')
    ORDER BY recipe_id
  `)
  if (d2.rows.length === 0) console.log('  ✅ Aucun — tous les dynamiques ont un itemId')
  else {
    console.log(`  ❌ ${d2.rows.length} ingrédients sans itemId:`)
    for (const r of d2.rows) console.log(`    [${r.recipe_id}] ${r.label} (eqId=${r.eq_id})`)
  }

  // ── D3: itemId référencés mais absents de ref_eq_items ──
  console.log('\n\n━━━ D3: itemId RÉFÉRENCÉS MAIS ABSENTS DE ref_eq_items ━━━')
  const d3 = await client.query(`
    SELECT DISTINCT ing->>'eqId' as eq_id, ing->>'itemId' as item_id, ing->>'label' as label
    FROM plan_recipes, jsonb_array_elements(ingredients) ing
    WHERE is_active = true
      AND ing->>'itemId' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM ref_eq_items ri
        WHERE ri.eq_id = ing->>'eqId'
        AND ri.item_id = ing->>'itemId'
      )
    ORDER BY eq_id, item_id
  `)
  if (d3.rows.length === 0) console.log('  ✅ Aucun — tous les itemId existent')
  else {
    console.log(`  ❌ ${d3.rows.length} itemId manquants:`)
    for (const r of d3.rows) console.log(`    ${r.eq_id} / ${r.item_id} (${r.label})`)
  }

  // ── D4: Items sans cooked_factor ou usual_g_per_unit ──
  console.log('\n\n━━━ D4: ITEMS INCOMPLETS (cooked_factor ou usual_g_per_unit manquant) ━━━')
  const d4 = await client.query(`
    SELECT ri.eq_id, ri.item_id, ri.food_label, ri.cooked_factor, ri.usual_g_per_unit
    FROM ref_eq_items ri
    WHERE ri.item_id IN (
      SELECT DISTINCT ing->>'itemId'
      FROM plan_recipes, jsonb_array_elements(ingredients) ing
      WHERE ing->>'itemId' IS NOT NULL AND is_active = true
    )
    AND (ri.cooked_factor IS NULL OR ri.usual_g_per_unit IS NULL)
    ORDER BY ri.eq_id
  `)
  if (d4.rows.length === 0) console.log('  ✅ Tous les items utilisés sont complets')
  else {
    console.log(`  ⚠️ ${d4.rows.length} items incomplets:`)
    for (const r of d4.rows) console.log(`    ${r.eq_id} / ${r.item_id}: cooked_factor=${r.cooked_factor ?? 'NULL'}, usual_g_per_unit=${r.usual_g_per_unit ?? 'NULL'}`)
  }

  // ── D5: Doublons d'eqId dans eq_summary ──
  console.log('\n\n━━━ D5: DOUBLONS eqId DANS eq_summary ━━━')
  const d5 = await client.query(`
    SELECT recipe_id, title, elem->>'eqId' as eq_id, COUNT(*) as cnt
    FROM plan_recipes, jsonb_array_elements(eq_summary) elem
    WHERE is_active = true
    GROUP BY recipe_id, title, elem->>'eqId'
    HAVING COUNT(*) > 1
  `)
  if (d5.rows.length === 0) console.log('  ✅ Aucun doublon')
  else {
    console.log(`  ❌ ${d5.rows.length} doublons:`)
    for (const r of d5.rows) console.log(`    [${r.recipe_id}] ${r.eq_id} apparaît ${r.cnt} fois`)
  }

  // ── D6: eqId dans ingredients mais pas dans eq_summary ──
  console.log('\n\n━━━ D6: eqId DANS INGREDIENTS MAIS PAS DANS eq_summary ━━━')
  const d6 = await client.query(`
    SELECT pr.recipe_id, pr.title, ing_eq.eq_id as missing_in_summary
    FROM plan_recipes pr
    CROSS JOIN LATERAL (
      SELECT DISTINCT ing->>'eqId' as eq_id
      FROM jsonb_array_elements(pr.ingredients) ing
      WHERE ing->>'eqId' IS NOT NULL
    ) ing_eq
    WHERE pr.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(pr.eq_summary) es
        WHERE es->>'eqId' = ing_eq.eq_id
      )
  `)
  if (d6.rows.length === 0) console.log('  ✅ Cohérent')
  else {
    console.log(`  ❌ ${d6.rows.length} incohérences:`)
    for (const r of d6.rows) console.log(`    [${r.recipe_id}] ${r.missing_in_summary} dans ingredients mais PAS dans eq_summary`)
  }

  // ── D7: Viande + légumineuse sans féculent en PW/MAINT ──
  console.log('\n\n━━━ D7: COMBOS INTERDITES (viande+légumineuse sans féculent en PW) ━━━')
  const d7 = await client.query(`
    SELECT recipe_id, title, objective_codes, eq_summary::text
    FROM plan_recipes
    WHERE is_active = true
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(eq_summary) e WHERE e->>'eqId' LIKE '%viande%' OR e->>'eqId' LIKE '%poisson%')
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(eq_summary) e WHERE e->>'eqId' LIKE '%legumineuse%')
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(eq_summary) e WHERE e->>'eqId' LIKE '%feculent%')
      )
      AND ('PW' = ANY(objective_codes) OR 'MAINT' = ANY(objective_codes) OR objective_codes = '{}')
  `)
  if (d7.rows.length === 0) console.log('  ✅ Aucune combo interdite')
  else {
    console.log(`  ❌ ${d7.rows.length} recettes avec combo interdite:`)
    for (const r of d7.rows) console.log(`    [${r.recipe_id}] obj=[${r.objective_codes}]`)
  }

  // ── D8: is_vegetarian vs ingrédients protéinés ──
  console.log('\n\n━━━ D8: is_vegetarian INCOHÉRENT ━━━')
  const d8 = await client.query(`
    SELECT recipe_id, title, is_vegetarian,
      jsonb_path_query_array(ingredients, '$[*].eqId') as eq_ids
    FROM plan_recipes
    WHERE is_active = true
      AND is_vegetarian = true
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(ingredients) ing
        WHERE ing->>'eqId' IN ('viandes_faibles_kcal','viandes_moyennes_kcal','poissons_maigres','poissons_gras','poissons_conserves')
      )
  `)
  if (d8.rows.length === 0) console.log('  ✅ Cohérent')
  else {
    console.log(`  ❌ ${d8.rows.length} recettes marquées végé mais avec viande/poisson:`)
    for (const r of d8.rows) console.log(`    [${r.recipe_id}] ${r.title}`)
  }

  // ── D9: portionFraction manquant sur ingrédients dynamiques ──
  console.log('\n\n━━━ D9: INGRÉDIENTS DYNAMIQUES SANS portionFraction ━━━')
  const d9 = await client.query(`
    SELECT recipe_id, title, ing->>'eqId' as eq_id, ing->>'label' as label, ing->>'portionFraction' as pf
    FROM plan_recipes, jsonb_array_elements(ingredients) ing
    WHERE is_active = true
      AND ing->>'eqId' IS NOT NULL
      AND ing->>'portionFraction' IS NULL
    ORDER BY recipe_id
  `)
  console.log(`  ${d9.rows.length === 0 ? '✅' : '⚠️'} ${d9.rows.length} ingrédients sans portionFraction`)
  if (d9.rows.length > 0) {
    const uniqueRecipes = [...new Set(d9.rows.map(r => r.recipe_id))]
    console.log(`    Recettes concernées (${uniqueRecipes.length}): ${uniqueRecipes.slice(0, 10).join(', ')}${uniqueRecipes.length > 10 ? '...' : ''}`)
  }

  // ── D10: Nombre total de recettes actives + répartition ──
  console.log('\n\n━━━ D10: STATISTIQUES GÉNÉRALES ━━━')
  const d10 = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE category = 'meal') as meals,
      COUNT(*) FILTER (WHERE category = 'breakfast') as breakfasts,
      COUNT(*) FILTER (WHERE category = 'snack') as snacks,
      COUNT(*) FILTER (WHERE category = 'sauce') as sauces,
      COUNT(*) FILTER (WHERE objective_codes = '{}' OR objective_codes IS NULL) as universal,
      COUNT(*) FILTER (WHERE 'PW' = ANY(objective_codes)) as pw,
      COUNT(*) FILTER (WHERE 'GAIN_LEAN' = ANY(objective_codes)) as gain
    FROM plan_recipes WHERE is_active = true
  `)
  const s = d10.rows[0]
  console.log(`  Total actives: ${s.total}`)
  console.log(`  Par catégorie: ${s.meals} meals, ${s.breakfasts} breakfasts, ${s.snacks} snacks, ${s.sauces} sauces`)
  console.log(`  Par objectif: ${s.universal} universelles, ${s.pw} PW/MAINT, ${s.gain} GAIN`)

  // ── D11: Ingrédients avec rawRatio legacy ──
  console.log('\n\n━━━ D11: INGRÉDIENTS AVEC rawRatio LEGACY ━━━')
  const d11 = await client.query(`
    SELECT recipe_id, ing->>'label' as label, ing->>'rawRatio' as raw_ratio
    FROM plan_recipes, jsonb_array_elements(ingredients) ing
    WHERE is_active = true AND ing->>'rawRatio' IS NOT NULL
    ORDER BY recipe_id
  `)
  if (d11.rows.length === 0) console.log('  ✅ Aucun rawRatio legacy')
  else {
    console.log(`  ⚠️ ${d11.rows.length} ingrédients avec rawRatio:`)
    for (const r of d11.rows) console.log(`    [${r.recipe_id}] ${r.label}: rawRatio=${r.raw_ratio}`)
  }

  // ── D12: Dump complet de toutes les recettes actives pour audit ──
  console.log('\n\n━━━ D12: DUMP COMPLET DES RECETTES ACTIVES ━━━')
  const d12 = await client.query(`
    SELECT recipe_id, title, category, meal_type, objective_codes,
           is_vegetarian, is_gluten_free, is_lactose_free,
           ingredients, eq_summary, difficulty, prep_time_min, cook_time_min
    FROM plan_recipes WHERE is_active = true
    ORDER BY category, recipe_id
  `)
  for (const r of d12.rows) {
    const ings = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || [])
    const eqs = typeof r.eq_summary === 'string' ? JSON.parse(r.eq_summary) : (r.eq_summary || [])
    const dynamicIngs = ings.filter(i => i.eqId)
    const flags = []
    if (r.is_vegetarian) flags.push('V')
    if (r.is_gluten_free) flags.push('GF')
    if (r.is_lactose_free) flags.push('LF')

    console.log(`\n  ── ${r.recipe_id} ──`)
    console.log(`  "${r.title}" | ${r.category}/${r.meal_type} | obj=[${(r.objective_codes||[]).join(',')||'ALL'}] | [${flags.join(',')}]`)
    console.log(`  eq_summary: ${JSON.stringify(eqs)}`)
    console.log(`  Ingrédients dynamiques (${dynamicIngs.length}):`)
    for (const ing of dynamicIngs) {
      const pf = ing.portionFraction
      console.log(`    - ${ing.label} | eqId=${ing.eqId} | itemId=${ing.itemId || 'MISSING'} | portionFraction=${pf ?? 'MISSING'}${ing.rawRatio ? ` | rawRatio=${ing.rawRatio}` : ''}`)
    }
  }

  // ── RÉSUMÉ ──
  console.log('\n\n═══════════════════════════════════════════════════════════════')
  console.log('  RÉSUMÉ DU DIAGNOSTIC')
  console.log('═══════════════════════════════════════════════════════════════')
  const issues = []
  if (d1.rows.length > 0) issues.push(`D1: ${d1.rows.length} portions ≠ 1`)
  if (d2.rows.length > 0) issues.push(`D2: ${d2.rows.length} sans itemId`)
  if (d3.rows.length > 0) issues.push(`D3: ${d3.rows.length} itemId absents de ref_eq_items`)
  if (d4.rows.length > 0) issues.push(`D4: ${d4.rows.length} items incomplets`)
  if (d5.rows.length > 0) issues.push(`D5: ${d5.rows.length} doublons eq_summary`)
  if (d6.rows.length > 0) issues.push(`D6: ${d6.rows.length} incohérences ing↔summary`)
  if (d7.rows.length > 0) issues.push(`D7: ${d7.rows.length} combos interdites`)
  if (d8.rows.length > 0) issues.push(`D8: ${d8.rows.length} is_vegetarian incohérent`)
  if (d9.rows.length > 0) issues.push(`D9: ${d9.rows.length} sans portionFraction`)
  if (d11.rows.length > 0) issues.push(`D11: ${d11.rows.length} rawRatio legacy`)

  if (issues.length === 0) {
    console.log('  ✅ ZÉRO PROBLÈME DÉTECTÉ')
  } else {
    console.log(`  ❌ ${issues.length} CATÉGORIES DE PROBLÈMES:`)
    for (const i of issues) console.log(`    • ${i}`)
  }

  await client.end()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
