# TODO — À faire plus tard

## Recettes
- [ ] **Quantités dynamiques** : adapter les quantités des recettes au plan du patient (ratio kcal patient / kcal standard). Utiliser `eq_summary` pour scaler.
- [ ] **Ajouter plus de recettes** : actuellement 5 seeds, en créer 15-20 couvrant tous les profils (végé, prise de masse, perte de poids, sans gluten, etc.)

## Migrations Supabase à exécuter
- [ ] **005_dietitian_messages.sql** — table messages diététicien
- [ ] **006_rls_fixes.sql** — RLS policies manquantes
- [ ] **007_recipes_fix.sql** — colonnes + seeds recettes
- [ ] **008_capsules_situation_guides.sql** — colonne objective_codes + 10 seeds guides de situation
- [ ] **009_test_profiles_seed.sql** — 5 profils de test (créer d'abord 5 auth users dans Supabase Dashboard)
- [ ] **010_video_guides_seed.sql** — 6 guides vidéo (URLs placeholder à remplacer)

## Moteur de calcul (C2_RULES)
- [ ] **C2_RULES data** — la SEULE table avec headers définis mais DATA VIDE. Bloque la sélection automatique des conseils depuis le questionnaire.
- [ ] **3 sections** : defaults (eq par slot), joiners (eq appariées), conditionnels (if/then questionnaire)

## Conseils
- [ ] **Sélection automatique des conseils** depuis les réponses questionnaire (dépend de C2_RULES)
- [ ] **Micro-tips plan-specific** : ajouter des tips spécifiques par objectif/régime (végé, prise de masse, etc.) — actuellement que des génériques

## Seed data manquante
- [ ] **Seed GAIN_LEAN** : le compte demo-gain@ est créé mais seed PAS exécuté
- [ ] **Seed vidéo guides** : actuellement fallback mock, ajouter de vraies entrées dans plan_video_guides
- [ ] **Seed progression** : ajouter des phases pour les plans GAIN dans plan_progression

## Analytics & Data (Audit 04 restants)
- [ ] **A1 — Historique food logs** : navigation date (prev/next) pour voir les jours passés — P1 mais nécessite refactor useFoodLogs
- [ ] **C1 — Score objectif** : blender kcal adherence + eq completion % dans le score bilan au lieu de 100% subjectif
- [ ] **A3 — Midnight refresh** : visibilitychange listener pour refresh quand l'app revient au premier plan
- [ ] **C2 — Bilan week numbering** : calculer depuis plan_start_date au lieu du magic offset `bilans.length + 3`
- [ ] **C4 — Score trend** : indicator "en progression / en baisse" comparant rolling average 3 derniers bilans
- [ ] **C5 — Wellbeing display** : afficher energy/hunger/sleep/stress dans BilanDetail + chart tendance
- [ ] **D1 — Smart alerts** : détecter overconsumption patterns, EQ sous-consommées, weekends
- [ ] **D2 — Comparison vs last week** : delta kcal/macros vs semaine précédente dans WeekView
- [ ] **B5 — Daily kcal chart** : bar chart des 7-14 derniers jours
- [ ] **E1 — Weekly summary report** : rapport consolidé (kcal, macros, EQ, streak, mesures)
- [ ] **E2 — Export CSV** : wirer le bouton "Exporter mes données" (food_logs, measurements, bilans)
- [ ] **E3 — Goal trajectory** : ReferenceLine target poids + projection linéaire dans le chart
- [ ] **E4 — Notifications** : rappels matin/soir/bilan via Service Worker push
- [ ] **F3 — Error feedback** : notification user quand un insert/delete food_log échoue
- [ ] **F4 — Measurements dédoublonnage** : UNIQUE(user_id, measured_at) + upsert
- [ ] **F5 — Delete rollback** : remettre le log si le delete Supabase échoue

## Smart Feedback (Audit 05 restants)
- [ ] **F6 — Challenge adaptatif** : sélectionner le challenge en fonction du point faible du patient (pas rotation calendrier)
- [ ] **F7 — Mid-week nudge** : composant mercredi-jeudi comparant weekConsumed à 50% des targets
- [ ] **F12 — Score auto-calculé** : blender eq completion % + kcal adherence dans le score bilan
- [ ] **F14 — Milestones supplémentaires** : first_target_day, first_hp_free_day, all_slots_logged, macro_master, weight_milestone
- [ ] **F15 — 30+ micro-tips** : actuellement 6 tips hardcodés dans DEFAULT_MICRO_TIPS — besoin de 30+ en DB
- [ ] **F17 — Time-of-day awareness** : greeting + messaging contextuel (matin/midi/soir)
- [ ] **F19 — Pattern recognition** : détecter les slots systématiquement non loggés
- [ ] **F22 — Messages par équivalence** : nudges ciblés sur les EQ sous-performantes sur 2+ semaines
- [ ] **F23 — Rule engine léger** : 50+ règles condition→message (pas ML, juste if/then pondéré)
- [ ] **F25 — Trend insights** : "Tu as perdu 3.2kg en 6 semaines" / "Score en hausse depuis 3 sem"
- [ ] **F27 — Challenge completion tracking** : checkbox + badge pour les challenges hebdo

## Backend
- [ ] **5 SQL functions** à implémenter : calculate_bmr, calculate_nap, calculate_targets, select_advices, generate_plan
- [ ] **Edge Functions** (Stripe, etc.)
- [ ] **Supabase Realtime** : vérifier que les subscriptions dietitian_messages fonctionnent en prod

## UX / Design
- [ ] **Chunk size warning** : le bundle fait 930KB, envisager code-splitting avec dynamic import()
- [ ] **Images recettes** : ajouter image_url aux recettes (Supabase Storage ou CDN)
- [ ] **Icônes PWA** : créer icon-180.png, icon-192.png, icon-512.png dans /public/icons/ (logo Élevia doré sur fond navy)
- [ ] **Service worker** : ajouter `vite-plugin-pwa` pour support offline (D29)
- [ ] **Refactor CSS variables** : migrer les hardcoded inline colors vers les CSS custom properties --text, --text-muted etc. (D4/D5 — gros refactor)
- [ ] **Escape key dismiss** pour tous les modals (D21)
- [ ] **Ring entrance animation** : animer le ring kcal au chargement (D34)
- [ ] **MAINT eqFilterField** : vérifier si MAINT doit avoir obj_maint ou partager obj_pw (D10)
- [ ] **Defaults GAIN** : DEFAULT_* constants sont PW-centric, ajouter des defaults GAIN pour le mode offline/demo (D11)
