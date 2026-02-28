/**
 * EXPLORE ITEMS — For each eq_id that has incomplete items used by recipes,
 * list ALL items in that eq_id (complete AND incomplete).
 * Goal: find existing complete items that could REPLACE incomplete ones.
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

  console.log('═══════════════════════════════════════════════════════════════════════')
  console.log('  EXPLORE ITEMS — Alternatives complètes pour items incomplets')
  console.log('  ' + new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════════════════════')

  // ── Step 1: Get all incomplete items (used by recipes) ──
  const incompleteUsed = await client.query(`
    SELECT DISTINCT ri.eq_id, ri.item_id
    FROM ref_eq_items ri
    WHERE (ri.cooked_factor IS NULL OR ri.usual_g_per_unit IS NULL)
      AND ri.item_id IN (
        SELECT DISTINCT ing->>'itemId'
        FROM plan_recipes, jsonb_array_elements(ingredients) ing
        WHERE ing->>'itemId' IS NOT NULL AND is_active = true
      )
    ORDER BY ri.eq_id
  `)

  if (incompleteUsed.rows.length === 0) {
    console.log('\n  Aucun item incomplet utilisé par les recettes. Rien à explorer.')
    await client.end()
    return
  }

  const targetEqIds = [...new Set(incompleteUsed.rows.map(r => r.eq_id))]
  const incompleteItemIds = new Set(incompleteUsed.rows.map(r => `${r.eq_id}::${r.item_id}`))

  console.log(`\n  ${incompleteUsed.rows.length} items incomplets dans ${targetEqIds.length} catégories d'équivalence`)
  console.log(`  Catégories : ${targetEqIds.join(', ')}`)

  // ── Step 2: Get ALL recipe ingredient references (to mark which items are used) ──
  const recipeRefs = await client.query(`
    SELECT
      ing->>'eqId' as eq_id,
      ing->>'itemId' as item_id,
      ing->>'label' as label,
      pr.recipe_id,
      pr.title
    FROM plan_recipes pr, jsonb_array_elements(pr.ingredients) ing
    WHERE pr.is_active = true
      AND ing->>'eqId' IS NOT NULL
      AND ing->>'itemId' IS NOT NULL
    ORDER BY ing->>'eqId', ing->>'itemId'
  `)

  // Build a map: eq_id::item_id -> [{recipe_id, title, label}]
  const usageMap = new Map()
  for (const r of recipeRefs.rows) {
    const key = `${r.eq_id}::${r.item_id}`
    if (!usageMap.has(key)) usageMap.set(key, [])
    usageMap.get(key).push({ recipe_id: r.recipe_id, title: r.title, label: r.label })
  }

  // ── Step 3: Get ALL items in the target eq_ids ──
  const allItems = await client.query(`
    SELECT
      ri.eq_id, ri.item_id, ri.food_label,
      ri.cooked_factor, ri.usual_g_per_unit,
      ri.usual_unit_sg, ri.usual_unit_pl
    FROM ref_eq_items ri
    WHERE ri.eq_id = ANY($1)
    ORDER BY ri.eq_id, ri.item_id
  `, [targetEqIds])

  // ── Step 4: Output grouped by eq_id ──
  let currentEq = ''
  let eqCompleteCount = 0
  let eqIncompleteCount = 0
  let eqTotal = 0

  for (let i = 0; i < allItems.rows.length; i++) {
    const row = allItems.rows[i]
    const nextRow = allItems.rows[i + 1]
    const key = `${row.eq_id}::${row.item_id}`
    const isComplete = row.cooked_factor != null && row.usual_g_per_unit != null
    const isUsedByRecipe = usageMap.has(key)
    const isIncompleteTarget = incompleteItemIds.has(key)

    // New eq_id group
    if (row.eq_id !== currentEq) {
      // Print summary of previous group
      if (currentEq !== '') {
        console.log(`  ── Bilan: ${eqCompleteCount} complets / ${eqIncompleteCount} incomplets / ${eqTotal} total`)
      }

      currentEq = row.eq_id
      eqCompleteCount = 0
      eqIncompleteCount = 0
      eqTotal = 0

      console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`  EQ_ID: ${row.eq_id}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

      // Show which incomplete items triggered this group
      const triggeredBy = incompleteUsed.rows.filter(r => r.eq_id === row.eq_id)
      console.log(`  Problème: ${triggeredBy.length} item(s) incomplet(s) utilisé(s) par recettes:`)
      for (const t of triggeredBy) {
        const usage = usageMap.get(`${t.eq_id}::${t.item_id}`) || []
        const recipeList = usage.map(u => `${u.recipe_id}`).join(', ')
        console.log(`    -> ${t.item_id} (recettes: ${recipeList})`)
      }
      console.log('')
      console.log('  Tous les items de cette catégorie:')
      console.log('  ─────────────────────────────────────────────────────────────')
    }

    eqTotal++
    if (isComplete) eqCompleteCount++
    else eqIncompleteCount++

    // Status indicator
    let statusTag
    if (isComplete) statusTag = 'COMPLET'
    else if (row.cooked_factor == null && row.usual_g_per_unit == null) statusTag = 'VIDE   '
    else if (row.cooked_factor == null) statusTag = 'NO_CF  '
    else statusTag = 'NO_USU '

    // Usage indicator
    let usageTag = ''
    if (isIncompleteTarget) usageTag = ' <<<< INCOMPLET UTILISÉ PAR RECETTES'
    else if (isUsedByRecipe) usageTag = ' [utilisé par recettes]'

    console.log(`    [${statusTag}] ${row.item_id}`)
    console.log(`             label: ${row.food_label || '(vide)'}`)
    console.log(`             cooked_factor: ${row.cooked_factor != null ? row.cooked_factor : 'NULL'}`)
    console.log(`             usual_g_per_unit: ${row.usual_g_per_unit != null ? row.usual_g_per_unit : 'NULL'}`)
    console.log(`             usual_unit: ${row.usual_unit_sg || '(vide)'} / ${row.usual_unit_pl || '(vide)'}`)
    console.log(`             ${usageTag}`)

    if (isUsedByRecipe) {
      const usage = usageMap.get(key)
      for (const u of usage) {
        console.log(`               -> recette ${u.recipe_id}: "${u.title}" (comme "${u.label}")`)
      }
    }

    // Print summary at end of last group
    if (!nextRow) {
      console.log(`  ── Bilan: ${eqCompleteCount} complets / ${eqIncompleteCount} incomplets / ${eqTotal} total`)
    }
  }

  // ── Grand Summary ──
  console.log('\n\n═══════════════════════════════════════════════════════════════════════')
  console.log('  RÉSUMÉ GLOBAL')
  console.log('═══════════════════════════════════════════════════════════════════════')

  for (const eqId of targetEqIds) {
    const eqItems = allItems.rows.filter(r => r.eq_id === eqId)
    const completeItems = eqItems.filter(r => r.cooked_factor != null && r.usual_g_per_unit != null)
    const incompleteTargets = incompleteUsed.rows.filter(r => r.eq_id === eqId)

    const canReplace = completeItems.length > 0
    const icon = canReplace ? 'OUI' : 'NON'

    console.log(`\n  [${icon}] ${eqId}`)
    console.log(`       ${incompleteTargets.length} item(s) incomplet(s) utilisé(s) par recettes`)
    console.log(`       ${completeItems.length} item(s) complet(s) disponible(s) dans la même catégorie`)

    if (canReplace) {
      console.log('       Candidats de remplacement:')
      for (const c of completeItems) {
        const usedElsewhere = usageMap.has(`${eqId}::${c.item_id}`)
        console.log(`         - ${c.item_id}: "${c.food_label}" (cf=${c.cooked_factor}, usual=${c.usual_g_per_unit} ${c.usual_unit_sg || ''})${usedElsewhere ? ' [déjà utilisé par recettes]' : ''}`)
      }
    } else {
      console.log('       --> AUCUN remplacement possible, il faudra compléter les données manuellement')
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════')

  await client.end()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
