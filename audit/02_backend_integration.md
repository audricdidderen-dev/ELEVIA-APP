# Audit 02 — Backend Integration Supabase ↔ App

**Date** : 27 février 2026
**Scope** : 34 tables schema (001_schema.sql) + ~7 tables ref (migration script) = ~41 tables totales
**Fichiers analysés** :
- `supabase/migrations/001_schema.sql` (34 tables)
- `supabase/migrations/003_rls_policies.sql`
- `supabase/scripts/migrate_excel_to_supabase.py` (populates 16 tables dont 7 ref_*)
- `supabase/scripts/seed_demo_client.py` (PW)
- `supabase/scripts/seed_demo_gain.py` (GAIN_LEAN)
- `src/hooks/useAuth.js`, `usePlanData.js`, `useFoodLogs.js`, `useMeasurements.js`, `useWeeklyBilans.js`
- `src/lib/transformPlanData.js`, `src/lib/objectiveConfig.js`, `src/lib/supabase.js`
- `elevia-prototype.jsx` (composant principal, ~1200 lignes)
- `src/main.jsx` (orchestrateur)

---

## 1. Matrice table par table

### Groupe A — Commerce & Acquisition (3 tables)

| Table | Colonnes | Utilisee dans l'app | Hook/composant | Colonnes non-exploitees | RLS |
|---|---|---|---|---|---|
| **clients** | 19 + 2 FK retardees | NON | Aucun | TOUTES (21 colonnes) | NON |
| **orders** | 17 | NON | Aucun | TOUTES (17 colonnes) | NON |
| **questionnaire_responses** | 10 | NON | Aucun | TOUTES (10 colonnes) | NON |

**Verdict** : Ces 3 tables sont 100% backend/admin. Elles gereront le flux Stripe → questionnaire → creation plan. L'app client n'a pas besoin d'y acceder directement. C'est normal qu'elles ne soient pas connectees pour l'instant.

---

### Groupe B — Plan nutritionnel (11 tables)

| Table | Colonnes | Utilisee dans l'app | Hook/composant | Colonnes non-exploitees | RLS |
|---|---|---|---|---|---|
| **client_plans** | 28 | OUI | `usePlanData` → `transformPlanData` | `version`, `plan_version_number`, `doc_id`, `whatsapp_url`, `support_email`, `plan_start_date`, `plan_expiry_date`, `delivered_at`, `auto_calculated_at`, `auto_calculation_log`, `validated_at`, `validated_by`, `adjustments_made`, `adjustment_notes`, `pdf_url`, `pdf_generated_at` (16 non-exploitees) | OUI (SELECT via active_plan_id) |
| **plan_equivalences** | 31 | OUI | `usePlanData` → `transformPlanData` | `active_v1`, `ref_qty`, `ref_unit`, `portion_unit_label`, `dest_eq_base`, `base_eq_id`, `obj_weight_loss`, `obj_recomposition`, `obj_health_longevity`, `obj_muscle_gain`, `diet_omnivore`, `diet_pescetarian`, `diet_vegetarian`, `gluten_free`, `lactose_free`, `eq_notes_id`, `item_step_source`, `show_unit_hint` (18 non-exploitees) | OUI |
| **plan_items** | 24 | OUI | `usePlanData` → `transformPlanData` | `elevia_pick`, `badge_text`, `qty_1x`, `unit`, `usual_profile_id`, `usual_mode`, `usual_round_step`, `is_gluten_free`, `is_lactose_free`, `cooked_factor`, `item_note_id`, `is_active`, `display_factor`, `qty_final`, `usual_text`, `display_order` (16 non-exploitees) | OUI |
| **plan_targets** | 4 | OUI | `usePlanData` → `transformPlanData` | Aucune (toutes utilisees) | OUI |
| **plan_slot_mapping** | 6 | OUI | `usePlanData` → `transformPlanData` | Aucune | OUI |
| **plan_slots** | 13 | OUI | `usePlanData` → `transformPlanData` | `allowed_eq_group`, `default_eq_id`, `freq_default_week`, `portion_mult_default`, `is_optional`, `dinner_cheat_meal_allowed`, `condition_value`, `enabled` (8 non-exploitees) | OUI |
| **plan_advices** | 16 | OUI | `usePlanData` → `transformPlanData` | `tags` (1 non-exploitee) | OUI |
| **plan_micro_tips** | 5 | OUI | `usePlanData` → `transformPlanData` | `display_context` (1 non-exploitee) | OUI |
| **plan_capsules** | 6 | NON | Aucun | TOUTES (6 colonnes) | NON |
| **plan_recipes** | 12 | NON | Aucun | TOUTES (12 colonnes) | NON |
| **plan_video_guides** | 7 | NON | Aucun | TOUTES (7 colonnes) | NON |
| **plan_progression** | 22 | NON | Aucun | TOUTES (22 colonnes) | NON |

**Gaps critiques** :
- **plan_capsules** : contenu educatif charge par migration Excel mais jamais affiche. Pourrait alimenter la section "Conseils" ou un carrousel educatif.
- **plan_recipes** : recettes avec ingredients JSON et etapes, migration faite, UI absente.
- **plan_video_guides** : guides video avec URLs YouTube, migration faite, UI absente.
- **plan_progression** : phases GAIN (mois 0-3, 3-6, etc.) avec actions, indicateurs, mindset — table riche, non-connectee. Critique pour les objectifs GAIN qui sont multi-phases.

---

### Groupe C — App Cockpit (6 tables)

| Table | Colonnes | Utilisee dans l'app | Hook/composant | Colonnes non-exploitees | RLS |
|---|---|---|---|---|---|
| **profiles** | 7 | OUI | `usePlanData` (requete directe) | Aucune | OUI (SELECT + UPDATE) |
| **food_logs** | 10 | OUI | `useFoodLogs` (CRUD complet) | `notes` (1 non-exploitee) | OUI (SELECT + INSERT + DELETE) |
| **measurements** | 8 | OUI | `useMeasurements` + `usePlanData` | `hip_cm`, `muscle_mass_kg` (2 non-exploitees) | OUI (SELECT + INSERT) |
| **weekly_bilans** | 10 | PARTIELLEMENT | `useWeeklyBilans` + `usePlanData` | `energy_level`, `hunger_level`, `sleep_quality`, `stress_level`, `dietitian_feedback` (5 non-exploitees dans l'UI) | OUI (SELECT + INSERT) |
| **user_streaks** | 6 | NON | Aucun | TOUTES (6 colonnes) | OUI |
| **user_milestones** | 6 | NON | Aucun | TOUTES (6 colonnes) | OUI |

**Gaps critiques** :
- **weekly_bilans** : le hook `useWeeklyBilans.createBilan()` accepte `energyLevel`, `hungerLevel`, `sleepQuality`, `stressLevel` en parametre et les insere dans Supabase, MAIS `onCreateBilan` n'est jamais appele dans le prototype. L'UI n'a aucun formulaire de bilan hebdomadaire. Les bilans existent uniquement via les seeds.
- **measurements** : `hip_cm` et `muscle_mass_kg` ne sont pas proposees dans le formulaire de mesure (seuls `weightKg`, `waistCm`, `bodyFatPct` sont utilises).
- **user_streaks** : table prete avec RLS, jamais requetee. Pourrait alimenter une UI de "streak" (X jours consecutifs de logging).
- **user_milestones** : table prete avec RLS, jamais requetee. Pourrait celebrer des etapes (1er kg perdu, 7 jours streak, etc.).

---

### Groupe D — Infrastructure (5 tables)

| Table | Colonnes | Utilisee dans l'app | Hook/composant | Colonnes non-exploitees | RLS |
|---|---|---|---|---|---|
| **notifications** | 17 | NON | Aucun | TOUTES | NON |
| **audit_log** | 11 | NON | Aucun | TOUTES | NON |
| **failed_jobs** | 11 | NON | Aucun | TOUTES | NON |
| **feature_flags** | 9 | NON | Aucun | TOUTES | NON |
| **plan_templates** | 16 | NON | Aucun | TOUTES | NON |

**Verdict** : Tables d'infrastructure backend/admin. Normal qu'elles ne soient pas dans l'app client. `notifications` et `feature_flags` devront etre connectees quand les features in-app seront activees.

---

### Groupe E — Moteur de calcul (9 tables)

| Table | Colonnes | Utilisee dans l'app | Hook/composant | Colonnes non-exploitees | RLS |
|---|---|---|---|---|---|
| **calc_params_henry** | 7 | NON (backend only) | — | — | NON |
| **calc_params_nap** | 6 | NON (backend only) | — | — | NON |
| **calc_params_objectives** | 11 | NON (backend only) | — | — | NON |
| **calc_advice_rules** | 12 | NON (backend only) | — | — | NON |
| **calc_advice_engine_config** | 6 | NON (backend only) | — | — | NON |
| **calc_usual_rules** | 9 | NON (backend only) | — | — | NON |
| **calc_eq_variants** | 8 | NON (backend only) | — | — | NON |
| **calc_c2_rules** | 5 | NON (backend only, vide) | — | — | NON |
| **calc_enums** | 5 | NON (backend only) | — | — | NON |

**Verdict** : 100% backend. Ces tables alimentent les SQL functions qui calculent le plan. L'app client ne les requete jamais directement — c'est le resultat (client_plans, plan_equivalences, etc.) qui est consomme.

---

### Tables hors schema (creees par migration script, non dans 001_schema.sql)

| Table | Utilisee dans l'app | Hook/composant | Notes |
|---|---|---|---|
| **ref_eq_master** | OUI | `usePlanData` (requete directe) | Catalogue reference 63 EQ, utilise pour l'onglet "Autres" |
| **ref_eq_items** | OUI | `usePlanData` (requete directe) | Items de reference pour le catalogue complet |
| **ref_micro_tips** | NON | Aucun | Tips de reference, non utilises (les tips viennent de plan_micro_tips) |
| **ref_progression_phases** | NON | Aucun | Phases de progression reference, non connectees |
| **ref_theme_objectives** | NON | Aucun | Themes par objectif, non utilises |
| **ref_plan_slots** | NON | Aucun | Slots de reference, non utilises (les slots viennent de plan_slots) |

**Gap critique** : `ref_eq_master` et `ref_eq_items` sont requetees dans `usePlanData` (lignes 51-52) mais n'ont PAS de RLS. Comme elles sont lues avec la cle anon, elles doivent etre protegees ou etre explicitement publiques (lecture seule pour tous les utilisateurs authentifies).

---

## 2. Analyse de coherence par objectif

### PW (Perte de poids) — seed_demo_client.py

| Element | Attendu | Seed | Coherent |
|---|---|---|---|
| Slots | 5 (breakfast, snack1, coldMeal, snack2, hotMeal) | 5 slots | OUI |
| Equivalences | 19 | 19 dans CATALOGUE | OUI |
| Items | Variable | 17 items | OUI |
| Targets | 19 eq_ids | 19 | OUI |
| Slot mapping | 5 slots × ~3-6 eq chacun | 24 mappings | OUI |
| Advices | 6 (3 priority + 3 secondary) | 6 | OUI |
| Micro tips | 6 | 6 | OUI |
| Measurements | 6 points descending | 6 (84.8→88.0) | OUI (descending = PW) |
| Bilans | 6 semaines | 6 | OUI |
| objective_style | PW | "PW" | OUI |
| preWorkout/postWorkout | Absents | Absents des slots | OUI |

### GAIN_LEAN (Prise muscle seche) — seed_demo_gain.py

| Element | Attendu | Seed | Coherent |
|---|---|---|---|
| Slots | 7 (+ preWorkout, postWorkout) | 7 slots | OUI |
| Equivalences | 19 (dont pates_blanches, fruits_seches, oeufs_entiers) | 19 | OUI |
| Items | Variable | 20 items | OUI |
| Targets | 19 eq_ids | 19 | OUI |
| Slot mapping | 7 slots × ~3-7 eq chacun | 32 mappings | OUI |
| Advices | 6 (3 priority + 3 secondary, GAIN-adapted) | 6 | OUI |
| Micro tips | 6 (GAIN-adapted) | 6 | OUI |
| Measurements | 6 points ascending | 6 (80.5→83.2) | OUI (ascending = GAIN) |
| Bilans | 6 semaines | 6 | OUI |
| objective_style | GAIN_LEAN | "GAIN_LEAN" | OUI |
| preWorkout/postWorkout | Presents | 2 slots supplementaires | OUI |
| Kcal surplus | ~3100/day vs ~2350 PW | 21700/week (3100/day) | OUI |

### Transform coherence PW vs GAIN

Le `transformPlanData.js` gere correctement les deux cas :
- Les slots sont dynamiques (pas hardcodes a 5)
- Les default times ne couvrent que les 5 slots classiques (pas de default time pour preWorkout/postWorkout) — **gap mineur**, le time sera vide
- Le catalogue est construit dynamiquement a partir des equivalences du plan
- L'onglet "Autres" utilise ref_eq_master avec filtrage par `_objFlags` (obj_pw / obj_mass)

**Gap identifie** : `defaultTimes` dans transformPlanData.js (ligne 93) ne couvre que 5 slots. Pour GAIN, preWorkout et postWorkout n'auront pas de time affiche. C'est mineur mais pourrait etre ameliore.

---

## 3. Analyse RLS

### Tables AVEC RLS (13/34 tables schema)

| Table | Policies | Operations | Securite |
|---|---|---|---|
| profiles | 2 | SELECT + UPDATE | OK — filtre sur `id = auth.uid()` |
| client_plans | 1 | SELECT | OK — filtre via `active_plan_id` de profiles |
| plan_equivalences | 1 | SELECT | OK — filtre via plan_id de active_plan |
| plan_items | 1 | SELECT | OK — filtre via plan_id |
| plan_slots | 1 | SELECT | OK — filtre via plan_id |
| plan_slot_mapping | 1 | SELECT | OK — filtre via plan_id |
| plan_targets | 1 | SELECT | OK — filtre via plan_id |
| plan_advices | 1 | SELECT | OK — filtre via plan_id |
| plan_micro_tips | 1 | SELECT | OK — filtre via plan_id |
| food_logs | 3 | SELECT + INSERT + DELETE | OK — filtre sur `user_id = auth.uid()` |
| measurements | 2 | SELECT + INSERT | OK — manque UPDATE et DELETE |
| weekly_bilans | 2 | SELECT + INSERT | OK — manque UPDATE |
| user_streaks | 2 | SELECT + ALL | OK |
| user_milestones | 1 | SELECT | OK — manque INSERT (qui va creer les milestones ?) |

### Tables SANS RLS (21/34 tables schema)

| Table | Risque | Action requise |
|---|---|---|
| clients | Faible (admin only) | Ajouter RLS quand admin panel existe |
| orders | Faible (admin only) | Idem |
| questionnaire_responses | Faible | Idem |
| plan_capsules | Moyen — lecture publique voulue ? | Ajouter RLS SELECT pour users authentifies |
| plan_recipes | Moyen | Idem |
| plan_video_guides | Moyen | Idem |
| plan_progression | Moyen — contient des donnees plan-specifiques | Devrait avoir RLS filtre par plan_id |
| notifications | Faible (pas encore utilise) | A securiser avant activation |
| audit_log | Faible (admin only) | Bloquer tout acces client |
| failed_jobs | Faible (admin only) | Bloquer tout acces client |
| feature_flags | Faible | Lecture seule pour tous |
| plan_templates | Faible (admin only) | Bloquer |
| calc_* (9 tables) | Faible (backend only) | Bloquer tout acces client |

### Tables hors schema SANS RLS

| Table | Risque | Action requise |
|---|---|---|
| **ref_eq_master** | MOYEN — requetee par l'app avec cle anon | Ajouter RLS SELECT pour users authentifies |
| **ref_eq_items** | MOYEN — requetee par l'app avec cle anon | Idem |
| ref_micro_tips | Faible | Lecture seule authentifiee |
| ref_progression_phases | Faible | Idem |
| ref_theme_objectives | Faible | Idem |
| ref_plan_slots | Faible | Idem |

### Failles RLS identifiees

1. **ref_eq_master / ref_eq_items** : Requetees par `usePlanData` mais pas de RLS. Avec la cle anon, tout utilisateur non-authentifie pourrait theoriquement lire le catalogue complet. Solution : `ALTER TABLE ref_eq_master ENABLE ROW LEVEL SECURITY; CREATE POLICY "Authenticated users can read" ON ref_eq_master FOR SELECT USING (auth.role() = 'authenticated');`

2. **measurements** : Pas de policy UPDATE. Si un utilisateur veut corriger une mesure, il ne peut pas. Pas de policy DELETE non plus.

3. **weekly_bilans** : Pas de policy UPDATE. Si l'utilisateur veut modifier un bilan (changer le score, ajouter des notes), impossible.

4. **user_milestones** : Seulement SELECT. Aucune policy INSERT — qui va inserer les milestones ? Si c'est un trigger backend, c'est OK. Si c'est l'app, il faut ajouter INSERT.

5. **plan_progression** : Pas de RLS mais contient des donnees plan-specifiques. Si cette table est exposee a l'app, elle doit etre securisee.

---

## 4. Colonnes non-exploitees — Detail par importance

### HAUTE priorite (donnees presentes, UI absente)

| Table.colonne | Contenu | Impact |
|---|---|---|
| `weekly_bilans.energy_level` | Niveau d'energie 1-5 | Le hook INSERT ces colonnes mais l'UI n'a pas de formulaire de bilan |
| `weekly_bilans.hunger_level` | Niveau de faim 1-5 | Idem |
| `weekly_bilans.sleep_quality` | Qualite sommeil 1-5 | Idem |
| `weekly_bilans.stress_level` | Niveau stress 1-5 | Idem |
| `weekly_bilans.dietitian_feedback` | Retour dieteticien | Admin feature — texte du dieteticien affichable dans le bilan |
| `measurements.hip_cm` | Tour de hanches | Utile pour ratio taille/hanches |
| `measurements.muscle_mass_kg` | Masse musculaire | Critique pour GAIN — pourrait remplacer body_fat comme KPI |
| `food_logs.notes` | Notes texte libre | Permettrait "J'avais faim", "Restaurant" |

### MOYENNE priorite (tables entieres non-connectees)

| Table | Contenu potentiel | Impact |
|---|---|---|
| **plan_progression** (22 cols) | Phases GAIN avec actions, indicateurs, mindset, changements EQ | Critique pour GAIN — donne un roadmap multi-mois |
| **plan_capsules** (6 cols) | Contenu educatif (templates d'advice) | Enrichit la section conseils |
| **plan_recipes** (12 cols) | Recettes avec ingredients et etapes | Feature majeure — "que cuisiner ce soir" |
| **plan_video_guides** (7 cols) | Videos explicatives YouTube | Enrichit l'experience |
| **user_streaks** (6 cols) | Streak de jours consecutifs | Gamification / adherence |
| **user_milestones** (6 cols) | Etapes celebrees | Gamification / motivation |

### BASSE priorite (colonnes admin/calcul)

| Table.colonnes | Raison |
|---|---|
| `client_plans.version`, `plan_version_number`, `doc_id` | Metadata interne |
| `client_plans.auto_calculation_log`, `validated_by` | Workflow admin |
| `client_plans.pdf_url`, `pdf_generated_at` | PDF pipeline (separee) |
| `plan_equivalences.active_v1`, `ref_qty`, `ref_unit` | Donnees de reference calcul |
| `plan_equivalences.obj_*`, `diet_*`, `gluten_free`, `lactose_free` | Flags de filtrage — potentiellement utiles pour filtrage allergies |
| `plan_items.elevia_pick`, `badge_text` | UI enrichie future |
| `plan_items.qty_1x`, `cooked_factor` | Calcul backend |
| `plan_slots.freq_default_week`, `portion_mult_default` | Calcul backend |

---

## 5. Flags alimentaires — Analyse specifique

Les flags `gluten_free`, `lactose_free`, `diet_vegetarian` existent a 3 niveaux :
1. **plan_equivalences** : `diet_omnivore`, `diet_pescetarian`, `diet_vegetarian`, `gluten_free`, `lactose_free`
2. **plan_items** : `is_gluten_free`, `is_lactose_free`
3. **ref_eq_master** : `diet_omni`, `diet_pesco`, `diet_vegetarian`, `gluten_free`, `lactose_free`
4. **clients** : `diet_profile` (texte libre)

**Etat actuel** : AUCUN de ces flags n'est exploite dans l'UI. Ils sont stockes dans Supabase mais jamais lus par le frontend.

**Opportunite** : Ajouter un filtre dans le catalogue ("Sans gluten", "Vegetarien") pour les patients concernes. Le `diet_profile` de `clients` pourrait driver ce filtre automatiquement.

---

## 6. Hooks et services a creer

### Hooks manquants

| Hook | Tables | Fonctionnalite |
|---|---|---|
| `useStreaks` | `user_streaks` | Calcul/affichage du streak de logging consecutif |
| `useMilestones` | `user_milestones` | Detection et affichage des etapes atteintes |
| `useRecipes` | `plan_recipes` | Affichage des recettes liees au plan |
| `useProgression` | `plan_progression` | Phases GAIN avec roadmap multi-mois |
| `useNotifications` | `notifications` | In-app notifications |

### Queries a ajouter dans usePlanData

```js
// Ajouter dans le Promise.all de usePlanData (ligne 39-53) :
supabase.from('plan_capsules').select('*').order('display_order'),
supabase.from('plan_progression').select('*').eq('plan_id', planId).order('phase_number'),
supabase.from('plan_recipes').select('*').eq('is_active', true),
supabase.from('plan_video_guides').select('*').order('display_order'),
```

### RLS a ajouter

```sql
-- ref_eq_master / ref_eq_items (lecture pour authentifies)
ALTER TABLE ref_eq_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read ref_eq_master"
  ON ref_eq_master FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE ref_eq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read ref_eq_items"
  ON ref_eq_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- plan_capsules, plan_recipes, plan_video_guides (lecture pour authentifies)
ALTER TABLE plan_capsules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read capsules"
  ON plan_capsules FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE plan_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read recipes"
  ON plan_recipes FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE plan_video_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read video guides"
  ON plan_video_guides FOR SELECT
  USING (auth.role() = 'authenticated');

-- plan_progression (filtre par plan_id)
ALTER TABLE plan_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progression"
  ON plan_progression FOR SELECT
  USING (plan_id IN (SELECT active_plan_id FROM profiles WHERE id = auth.uid()));

-- measurements UPDATE + DELETE
CREATE POLICY "Users can update own measurements"
  ON measurements FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own measurements"
  ON measurements FOR DELETE
  USING (user_id = auth.uid());

-- weekly_bilans UPDATE
CREATE POLICY "Users can update own bilans"
  ON weekly_bilans FOR UPDATE
  USING (user_id = auth.uid());

-- Bloquer les tables admin (calc_*, audit_log, failed_jobs)
ALTER TABLE calc_params_henry ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_params_nap ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_params_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_advice_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_advice_engine_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_usual_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_eq_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_c2_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_enums ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_jobs ENABLE ROW LEVEL SECURITY;
-- (pas de policy = personne ne peut lire via anon/authenticated)
```

### Services/fonctions a ajouter

| Service | Description | Priorite |
|---|---|---|
| **Streak calculator** | Trigger ou Edge Function qui met a jour `user_streaks` a chaque INSERT dans `food_logs` | Haute |
| **Milestone detector** | Trigger qui detecte les milestones (1er kg, streak 7j, etc.) et insere dans `user_milestones` | Moyenne |
| **Bilan auto-generator** | Edge Function ou cron qui calcule `adherence_score` a partir des food_logs de la semaine | Haute |
| **Weekly recap** | Notification push/email hebdomadaire avec resume | Moyenne |

---

## 7. Resume executif

### Etat global

| Categorie | Tables totales | Connectees | Partiellement | Non-connectees |
|---|---|---|---|---|
| Commerce (A) | 3 | 0 | 0 | 3 (normal) |
| Plan (B) | 11 | 8 | 0 | 3 (capsules, recipes, video) + progression |
| Cockpit (C) | 6 | 3 | 1 (weekly_bilans) | 2 (streaks, milestones) |
| Infrastructure (D) | 5 | 0 | 0 | 5 (normal) |
| Moteur calcul (E) | 9 | 0 | 0 | 9 (normal) |
| Ref (hors schema) | ~7 | 2 | 0 | ~5 |
| **TOTAL** | **~41** | **13** | **1** | **~27** |

### Top 5 gaps critiques

1. **Pas de formulaire bilan hebdomadaire** : `onCreateBilan` est passe en prop mais jamais appele. Les 5 colonnes qualitatives (energy, hunger, sleep, stress, dietitian_feedback) sont inutilisees. C'est la feature d'adherence la plus importante manquante.

2. **plan_progression non-connectee** : Pour les objectifs GAIN, la roadmap multi-phases est essentielle (quand augmenter les kcal, quand decharger). Les donnees existent dans Supabase mais l'app ne les affiche pas.

3. **user_streaks et user_milestones** : Tables pretes avec RLS mais aucun hook, aucun trigger, aucune UI. Ce sont les leviers de gamification les plus basiques.

4. **Recettes et videos absentes** : `plan_recipes` et `plan_video_guides` sont remplies par la migration Excel mais n'ont aucune UI. Feature differenciante importante.

5. **RLS manquant sur ref_eq_master/ref_eq_items** : Ces tables sont requetees par l'app mais n'ont pas de Row Level Security. Tout utilisateur non-authentifie pourrait lire le catalogue complet via la cle anon.

### Ce qui fonctionne bien

- Le pipeline `usePlanData` → `transformPlanData` → `DataCtx` est solide et bien structure
- Le CRUD food_logs (optimistic updates + rollback) est robuste
- La separation hook/composant est propre (5 hooks, chacun avec une responsabilite claire)
- La coherence PW vs GAIN dans les seeds est excellente
- Le systeme de catalogue avec ref_eq_master + _objFlags pour le filtrage "Autres" est elegant
- Les RLS existantes sont correctement implementees (filtre via active_plan_id)
