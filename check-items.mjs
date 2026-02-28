import pg from 'pg'
const c = new pg.Client({host:'aws-1-ap-south-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.rlemorqfkuloyxoydmdj',password:'wifjad-4wikzi-jawniJ',ssl:{rejectUnauthorized:false}})
await c.connect()

const r = await c.query(`
  SELECT
    ri.eq_id, ri.item_id, ri.food_label,
    ri.cooked_factor, ri.usual_g_per_unit, ri.usual_unit_sg,
    CASE
      WHEN ri.cooked_factor IS NOT NULL AND ri.usual_g_per_unit IS NOT NULL THEN 'COMPLET'
      WHEN ri.cooked_factor IS NOT NULL AND ri.usual_g_per_unit IS NULL THEN 'PAS_USUAL'
      WHEN ri.cooked_factor IS NULL AND ri.usual_g_per_unit IS NOT NULL THEN 'PAS_CF'
      ELSE 'VIDE'
    END as status
  FROM ref_eq_items ri
  WHERE ri.item_id IN (
    SELECT DISTINCT ing->>'itemId'
    FROM plan_recipes, jsonb_array_elements(ingredients) ing
    WHERE ing->>'itemId' IS NOT NULL AND is_active = true
  )
  ORDER BY ri.eq_id, ri.item_id
`)

let complete = 0, pasCF = 0, pasUsual = 0, vide = 0
for (const row of r.rows) {
  if (row.status === 'COMPLET') complete++
  else if (row.status === 'PAS_USUAL') pasUsual++
  else if (row.status === 'PAS_CF') pasCF++
  else vide++
}

console.log('BILAN ref_eq_items (items utilises par les recettes) :')
console.log('Total items references par les recettes :', r.rows.length)
console.log('')
console.log('COMPLET (cf + usual)         :', complete)
console.log('cooked_factor MAIS pas usual :', pasUsual)
console.log('usual MAIS pas cooked_factor :', pasCF)
console.log('LES 2 MANQUENT               :', vide)

console.log('')
console.log('DETAIL :')
let currentEq = ''
for (const row of r.rows) {
  if (row.eq_id !== currentEq) {
    currentEq = row.eq_id
    console.log('')
    console.log('  ' + currentEq + ':')
  }
  const icon = row.status === 'COMPLET' ? 'OK' : 'XX'
  console.log('    [' + icon + '] ' + row.item_id + ' | cf=' + (row.cooked_factor != null ? row.cooked_factor : 'NULL') + ' | usual=' + (row.usual_g_per_unit != null ? row.usual_g_per_unit : 'NULL') + (row.usual_unit_sg ? ' ' + row.usual_unit_sg : ''))
}

await c.end()
