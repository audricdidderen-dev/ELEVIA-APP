import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env','utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);
const {data:plan} = await sb.from('client_plans').select('auto_calculation_log').eq('id','d182dbcc-2d54-4be5-8b04-390526c613de').single();
const adj = plan?.auto_calculation_log?.adjusted_state || [];
const byEq = {};
for (const e of adj) {
  const k = e.eq_id;
  if (byEq[k] === undefined) byEq[k] = [];
  byEq[k].push({slot: e.slot_id, qtyMax: e.qty_max, freq: e.freq_week});
}
for (const eq of Object.keys(byEq).sort()) {
  const slots = byEq[eq];
  console.log(eq + ':');
  for (const s of slots) console.log('  ', s.slot, 'qty_max=' + s.qtyMax, 'freq=' + s.freq);
}
