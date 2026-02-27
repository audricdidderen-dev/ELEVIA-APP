# Documentation Exhaustive — App Élevia

> **Dernière mise à jour** : 27 février 2026
> **Version** : 1.1.0 (build 42)
> **Stack** : React 18 + Vite + Supabase + Recharts
> **Fichier principal** : `elevia-prototype.jsx` (1577 lignes)

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Système d'authentification](#2-système-dauthentification)
3. [Chargement des données (pipeline)](#3-chargement-des-données-pipeline)
4. [Système d'objectifs (5 objectifs)](#4-système-dobjectifs-5-objectifs)
5. [Thème dynamique](#5-thème-dynamique)
6. [Tab 1 — Plan (vue Jour)](#6-tab-1--plan-vue-jour)
7. [Tab 1 — Plan (vue Semaine)](#7-tab-1--plan-vue-semaine)
8. [Modal d'ajout (AddModal)](#8-modal-dajout-addmodal)
9. [Tab 2 — Conseils](#9-tab-2--conseils)
10. [Tab 3 — Historique](#10-tab-3--historique)
11. [Tab 4 — Profil](#11-tab-4--profil)
12. [Sous-écrans du Profil](#12-sous-écrans-du-profil)
13. [Système de streaks](#13-système-de-streaks)
14. [Système de milestones/badges](#14-système-de-milestonesbadges)
15. [Messages diététicien](#15-messages-diététicien)
16. [Micro-tips](#16-micro-tips)
17. [Challenge hebdomadaire](#17-challenge-hebdomadaire)
18. [Snackbar contextuel](#18-snackbar-contextuel)
19. [Onboarding (première utilisation)](#19-onboarding-première-utilisation)
20. [Splash screen](#20-splash-screen)
21. [Système de food logs (Supabase)](#21-système-de-food-logs-supabase)
22. [Données statiques vs dynamiques](#22-données-statiques-vs-dynamiques)
23. [Tables Supabase utilisées](#23-tables-supabase-utilisées)
24. [Hooks React](#24-hooks-react)
25. [Différences par objectif (tableau)](#25-différences-par-objectif-tableau)
26. [Catalogue d'équivalences](#26-catalogue-déquivalences)
27. [Modes d'input (appInputMode)](#27-modes-dinput-appinputmode)
28. [Formules et calculs](#28-formules-et-calculs)
29. [Profils de test](#29-profils-de-test)
30. [Bugs connus / Pre-existing issues](#30-bugs-connus--pre-existing-issues)
31. [Checklist de test fonctionnel](#31-checklist-de-test-fonctionnel)

---

## 1. Architecture globale

```
main.jsx (point d'entrée)
  ├── useAuth()              → session Supabase
  ├── usePlanData(session)   → fetch 16 tables, transforme via transformPlanData()
  ├── useFoodLogs(session, planData)  → logs du jour + weekConsumed + weekNutrients
  ├── useMeasurements(session)        → mesures corporelles
  ├── useWeeklyBilans(session)        → bilans hebdo
  ├── useStreaks(session)             → streak journalière
  ├── useMilestones(session)          → badges/milestones
  ├── useDietitianMessages(session)   → messages diététicien (realtime)
  │
  └── EleviaApp (elevia-prototype.jsx)
        ├── DataCtx.Provider (données plan)
        ├── Splash screen (1s)
        ├── OnboardingOverlay (si premier lancement)
        ├── MilestonePopup (si nouveau badge)
        ├── Header (logo Élevia)
        ├── Content (tab actif)
        │    ├── PlanTab (jour/semaine)
        │    ├── AdviceTab (focus/biblio)
        │    ├── HistoryTab (bilans + logs récents)
        │    └── ProfileTab (profil + sous-écrans)
        └── TabBar (4 onglets flottants)
```

**Fichiers clés** :
- `elevia-prototype.jsx` — UI complète (composants, CSS inline, logique)
- `src/lib/objectiveConfig.js` — config par objectif (couleurs, seuils, labels)
- `src/lib/transformPlanData.js` — transformation Supabase → app shape
- `src/lib/dateUtils.js` — utilitaires date timezone-safe (Belgique CET/CEST)
- `src/hooks/*.js` — 7 hooks data (auth, plan, foodLogs, measurements, bilans, streaks, milestones, dietMessages)
- `src/components/OnboardingOverlay.jsx` — onboarding 5 étapes
- `src/components/LoginScreen.jsx` — écran connexion

---

## 2. Système d'authentification

**Hook** : `useAuth()`
**Table** : `auth.users` (Supabase Auth)

| État | Comportement |
|------|-------------|
| `authLoading = true` | Splash screen |
| `session = null` | LoginScreen (email + password) |
| `session.user.id` existe | Charge le plan |

**Flux** :
1. `supabase.auth.getSession()` au mount
2. `supabase.auth.onAuthStateChange()` écoute les changements
3. `signIn(email, password)` → `supabase.auth.signInWithPassword()`
4. `signOut()` → `supabase.auth.signOut()`

**Données session** : `session.user.id` (UUID) utilisé partout

---

## 3. Chargement des données (pipeline)

**Hook** : `usePlanData(session)` → `transformPlanData()`

### Étape 1 : Fetch profil
```
profiles WHERE id = userId → profile.active_plan_id
```

### Étape 2 : Fetch en parallèle (16 requêtes)
| # | Table | Filtre | Tri |
|---|-------|--------|-----|
| 1 | `client_plans` | `id = planId` | single |
| 2 | `plan_equivalences` | `plan_id` | `display_order` |
| 3 | `plan_items` | `plan_id` | `item_order` |
| 4 | `plan_slots` | `plan_id` | `slot_order` |
| 5 | `plan_slot_mapping` | `plan_id` | `display_order` |
| 6 | `plan_targets` | `plan_id` | — |
| 7 | `plan_advices` | `plan_id` | `display_order` |
| 8 | `plan_micro_tips` | `plan_id` | — |
| 9 | `measurements` | `user_id` | `measured_at DESC` |
| 10 | `weekly_bilans` | `user_id` | `week_start DESC` |
| 11 | `ref_eq_master` | ALL | `eq_id` |
| 12 | `ref_eq_items` | ALL | `eq_id, item_order` |
| 13 | `plan_video_guides` | ALL | `display_order` |
| 14 | `plan_recipes` | `is_active = true` | — |
| 15 | `plan_progression` | `plan_id` | `phase_number` |
| 16 | `plan_capsules` | ALL | `display_order` |

### Étape 3 : Transformation
`transformPlanData()` produit :
- `CLIENT` : { firstName, programme, heightCm, objectiveCode }
- `WEEK_TARGETS` : { kcal, p, l, g } (semaine)
- `DAY_TARGETS` : { kcal, p, l, g } (jour = semaine/7)
- `CATALOGUE` : [{ eqId, label, eqMode, type, items, nutrientsPerPortion, qtyUi... }]
- `FULL_CATALOGUE` : comme CATALOGUE mais inclut les 63 EQ de ref_eq_master
- `SLOTS` : [{ id, label, time }]
- `SLOT_ALLOWED` : { slotId: [eqId, ...] }
- `PLAN_TARGETS` : { eqId: targetWeek }
- `ADVICES` : [{ id, module, title, axis, priorityScore, body, summaryBullets... }]
- `MICRO_TIPS` : [{ tipId, category, textFr }]
- `MEASUREMENTS` : [{ date, weightKg, waistCm, bodyFatPct, hipCm, muscleMassKg }]
- `BILANS` : [{ week, dates, score, label, weekStart, weekEnd }]
- `PROFILE_TEXT` : string (explication du plan)
- `TYPE_LABELS` : { type: labelFr }
- `VIDEO_GUIDES` : [{ id, title, description, url, duration }]
- `RECIPES` : [{ id, title, ingredients, steps, eqSummary... }]
- `CAPSULES` : [{ id, title, body, category }] (filtrés par objectif)
- `PROGRESSION` : [{ phaseNumber, phaseLabel, focus, actions, kcalDisplay... }] (GAIN only)
- `_planId`, `_userId`, `_planStartDate`, `_lastName` (métadonnées)

---

## 4. Système d'objectifs (5 objectifs)

**Fichier** : `src/lib/objectiveConfig.js`
**Source** : `client_plans.objective_style`

| Code | Label FR | Couleur | Direction | Cible kcal |
|------|----------|---------|-----------|-----------|
| `PW` | Perte de poids | Or `#C6A05B` | down (sous = bien) | Budget (ne pas dépasser) |
| `MAINT` | Maintien | Or `#C6A05B` | neutral | Cible (stabiliser) |
| `GAIN_LEAN` | Prise muscle sèche | Bleu `#3B7BF6` | up (sous = pas assez) | Objectif (atteindre) |
| `GAIN_COMFORT` | Prise poids confort | Bleu `#3B7BF6` | up | Objectif (atteindre) |
| `GAIN_GUIDE` | Prise guidée | Bleu `#3B7BF6` | up | Objectif (atteindre) |

**Chaque objectif définit** :
- `accent`, `accentSoft`, `accentBorder`, `accentBorderStrong`, `accentLine` (couleurs)
- `kcalFraming` : "Budget" / "Cible" / "Objectif"
- `kcalVerb` : "dépensé" / "consommé" / "atteint"
- `progressDir` : "down" / "neutral" / "up"
- `ringOrangeThreshold` + `ringOrangeDir` : seuil orange du ring kcal
- `pbarOrangeAbove` / `pbarGreenAbove` / `pbarOrangeBelow` : seuils barres de progression
- `dayHint` : message sous le ring du jour
- `hpEducation` : message pour la première fois "hors plan"
- `welcomeSubtitle` : sous-titre splash
- `scoreLabels` : [{ min, label }] pour les bilans
- `bilanSummary` : { score: texte } par seuil
- `weekAlertTitle` / `weekAlertMsg` : alerte semaine par défaut
- `eqFilterField` : 'obj_pw' ou 'obj_mass' (filtre catalogue "Autres")
- `kpiDir`, `kpiColor`, `kpiArrow`, `kpiSign` : direction KPI profil

---

## 5. Thème dynamique

Le thème est injecté via CSS custom properties au runtime :

```css
:root {
  --accent: <couleur objectif>;
  --accent-soft: <couleur 12% opacité>;
  --accent-border: <couleur 22% opacité>;
  --accent-border-strong: <couleur 34% opacité>;
  --accent-line: <couleur 55% opacité>;
}
```

**PW / MAINT** → tout or (#C6A05B)
**GAIN_*** → tout bleu (#3B7BF6)

Les couleurs fixes :
- `--navy` : #121E2D (header, tabbar)
- `--bg` : #F5F4F1 (fond ivoire)
- `--text` : #1A1A1A
- `--text-muted` : #6B7280
- `--green` : #34C759 (succès, complété)
- `--orange` : #E8863A (alerte, hors plan)
- `--red` : #FF3B30 (erreur, suppression)

**Fonts** : DM Sans (body), Cormorant Garamond (titres pages)

---

## 6. Tab 1 — Plan (vue Jour)

**Composant** : `PlanTab` (ligne 731)

### Structure de haut en bas :
1. **Header** : "Plan" + "Semaine X · Jour Y" (calculé depuis `_planStartDate`)
2. **Segmented control** : Jour / Semaine
3. **DietMessageBanner** : bandeau message diététicien non lu (cliquable → inbox)
4. **StreakBanner** : streak actuelle ou comeback message
5. **WeeklyChallenge** : challenge de la semaine (rotation par semaine ISO)
6. **Micro-tip** : 1 tip rotatif (par jour de l'année)
7. **Carte kcal du jour** :
   - **Ring SVG** (cercle progress 64x64) : % kcal jour
     - Couleur ring : `accent` (normal), `#34C759` (≥95%), `#E8863A` (orange selon seuil objectif)
     - Pulse animation quand kcal change
   - **Texte** : "[kcalFraming] du jour" + "X / Y kcal"
   - **3 macro pills** : P / L / G (valeur / cible)
   - **Day hint** : texte italic objectif-aware
8. **Slots** (5 ou 7 selon objectif) :
   - Chaque slot : nom + heure + bouton "+"
   - Si logs dans le slot : liste des ajouts (label + kcal + portions + chip HP)
   - Si vide : "Appuie sur + pour commencer ce repas"
   - **Quick-add** : boutons de re-log rapide (derniers items loggés dans ce slot, via localStorage)
   - **Clic sur un log** : modal confirmation suppression

### Slots disponibles
| Slot ID | Label | Heure | Disponibilité |
|---------|-------|-------|---------------|
| `breakfast` | Petit-déjeuner | 7h30 | Tous |
| `snack1` | Collation matin | 10h | Tous |
| `coldMeal` | Midi — Repas froid | 12h30 | Tous |
| `snack2` | Collation après-midi | 16h | Tous |
| `hotMeal` | Soir — Repas chaud | 19h30 | Tous |
| `preWorkout` | Pré-entraînement | 17h | GAIN_* only |
| `postWorkout` | Post-entraînement | 19h | GAIN_* only |

---

## 7. Tab 1 — Plan (vue Semaine)

**Composant** : `WeekView` (ligne 880)

### Structure :
1. **Alerte dynamique** (F5) :
   - Calcule l'EQ "key" la plus en retard vs progression attendue
   - Si ratio < 70% de l'attendu → alerte personnalisée ("[EQ] en retard — X/Y cette semaine")
   - Si kcal > 105% (PW) ou < 70% attendu (GAIN) → alerte kcal
   - Sinon → alerte par défaut de l'objectif
2. **Carte bilan semaine** :
   - kcal total semaine / cible semaine + barre de progression
   - 3 macro pills semaine (P, L, G)
   - Jours restants dans la semaine
3. **Carte hors plan** (si HP > 0) :
   - kcal HP total + nb ajouts + % de la cible
4. **Barre de recherche** : filtrer les EQ
5. **Liste des EQ du plan** : chacune avec
   - Icône + label + "X/Y sem."
   - Barre de progression colorée :
     - `accent` : en cours
     - `#34C759` : complété (≥100%)
     - `#E8863A` : au-dessus (>130%) ou en retard (<60% + key)
   - Bouton "+" ou check si complété

---

## 8. Modal d'ajout (AddModal)

**Composant** : `AddModal` (ligne 422)

### Deux onglets :
1. **"Dans ton plan"** : EQ autorisées pour ce slot (via SLOT_ALLOWED)
   - Chaque EQ : icône + label + progression semaine + bouton "+"
2. **"Autres"** :
   - Inclut : EQ du plan mais pas dans ce slot + EQ ref non dans le plan
   - **Filtrage objectif** : `_objFlags[eqFilterField]` doit être true
   - **Filtres diététiques** : Tout / Végé / Sans gluten / Sans lactose (via `_dietFlags`)
   - **Recherche** par nom
   - **Groupé par type** avec headers (Féculents, Protéines, etc.)
   - Chip "HP" (hors plan) + orange accent

### Flux d'ajout selon `appInputMode` :
| Mode | Comportement |
|------|-------------|
| `COMPLETION_ONLY` | Log immédiat (1 portion, pas de modal) |
| `ITEM_FIRST_PICK` | Affiche items → sélection → stepper quantité |
| `ITEM_UNIT_STEPPER` | Bouton "Ajouter 1 portion" + lien "Modifier la quantité" → stepper |
| `ITEM_SPOON_STEPPER` | Idem ITEM_UNIT_STEPPER |
| `PORTION_TAP` | Stepper par portions (0.25 step) |

### Détail stepper :
- Boutons −/+ avec min/max
- Affichage : valeur + unité (sg/pl selon quantité)
- **Live calc** : "≈ Xg · Y kcal" + "P L G"
- Bouton "Valider X portion(s)"

### Note Élevia :
- Icône info en haut à droite
- Toggle une note éducative par EQ (`noteElevia`)

### Éducation hors plan :
- Premier log HP → popup motivationnel :
  - Emoji 🙌 + "Tu peux le faire"
  - Message : `obj.hpEducation`
  - Bouton "Compris"

---

## 9. Tab 2 — Conseils

**Composant** : `AdviceTab` (ligne 971)

### Deux sous-vues :

#### Vue "Focus"
1. **Tip banner** : micro-tip rotatif + bouton "Suivant →"
2. **Axes prioritaires** : top 3 advices par `priorityScore DESC` où `axis = "priority"`
3. **Axes secondaires** : top 3 advices où `axis = "secondary"`
4. **CTA "Évaluer ma semaine"** : ouvre le modal bilan

#### Vue "Bibliothèque"
1. **Recherche** (placeholder seulement, pas connecté)
2. **Groupé par statut** : "À renforcer" / "En progrès" / "Solide" / "Nouveau"
   - Statuts hardcodés dans `statuses` object (mock)
3. **Astuces Élevia** : premiers 4 micro-tips

### Advice item
- Titre + shortBody
- Badges : Prioritaire/Secondaire + statut
- Bouton Lu/Non lu (toggle, local state)
- **Clic** → `AdviceDetail` modal

### AdviceDetail modal (ligne 942)
- Titre + badges (Prioritaire/Secondaire + statut)
- `shortBody` : résumé court
- **Objectif** : `summaryObjective`
- **Plan d'action** : `summaryBullets` (3 bullets max)
- **Tip Élevia** : `summaryTip` (dans un encadré accent)
- **"Comprendre en détail"** : toggle expandable → `body` (texte long)

### Modal évaluation semaine (bilan)
- Score par conseil (Solide=2 / En progrès=1 / Pas encore=0)
- **Wellbeing sliders** (1-5) :
  - Énergie (😴→⚡)
  - Gestion faim (😫→🎯)
  - Sommeil (😵→😴💤)
  - Stress (🔴→💚)
- Bouton "Enregistrer" → calcule adherenceScore = avg(scores) / 2 * 100
- Calcule weekStart/weekEnd (lundi-dimanche)
- Appelle `onCreateBilan()` avec les données

---

## 10. Tab 3 — Historique

**Composant** : `HistoryTab` (ligne 1117)

### Structure :
1. **Dernier bilan** (carte mise en avant) :
   - Score dans un cercle coloré + label + "Voir le rapport complet →"
   - Si aucun bilan : message "Pas encore de bilan" avec icône 📊
2. **Historique des bilans** :
   - Liste de toutes les semaines : score + "SX · dates" + label
   - Clic → `BilanDetail`
3. **Ajouts récents** :
   - 8 derniers logs (inversés) : icône + label + kcal + slot + macros
   - Si aucun : "Tes ajouts du jour apparaîtront ici"

### BilanDetail (ligne 1072)
- **Score** grand cercle coloré (couleur selon seuil)
- **Delta vs semaine précédente** : "+X" / "-X" en vert/orange
- **Trend messaging** (F9) :
  - Si score[0] > score[1] → "Belle progression [prénom] ! Continue comme ça."
  - Si score[0] < score[1] → "Attention, ton score baisse — relis tes conseils prioritaires."
- **Label** : via `getScoreLabel(obj, score)`
- **Résumé** : via `getBilanSummary(obj, score)` — texte objectif-aware
- **Conseils** : texte conditionnel (≥70 → maintenir, <70 → préparer à l'avance)

### Couleurs score :
| Score | Couleur |
|-------|---------|
| ≥ 85 | #34C759 (vert) |
| ≥ 70 | obj.accent (or/bleu) |
| ≥ 55 | #6B7280 (gris) |
| < 55 | #E8863A (orange) |

---

## 11. Tab 4 — Profil

**Composant** : `ProfileTab` (ligne 1160)

### Structure (écran principal) :
1. **Profile card** (fond navy gradient) :
   - Nom complet (firstName + _lastName)
   - Programme + taille cm
   - "Depuis : [date] · Semaine X"
   - **3 KPI boxes** : Poids / Tour taille / % MG
     - Valeur actuelle + delta depuis première mesure
     - Couleur delta : vert/orange selon objectif et direction
2. **Badges** (si milestoneDefs existe) :
   - Grille 4 colonnes, icônes + labels
   - Achievé = coloré + pleine opacité, non achievé = gris + 40% opacité
   - Compteur "X/Y débloqués"
3. **Menu items** :
   - **Pourquoi ce plan est le tien** → sous-écran "why"
   - **Section "Outils"** :
     - Suivi mesures & graphiques → sous-écran "measures"
     - Recettes → sous-écran "recipes"
     - Messages de ton diététicien → sous-écran "messages" (+ badge unread)
   - **Section "Apprendre"** :
     - Guides de situation → sous-écran "situation"
     - Guides & tutoriels → sous-écran "guides"
     - Comprendre ton plan (non connecté)
     - Ma roadmap → sous-écran "progression" (GAIN only, conditionnel)
   - **Section "Réglages"** :
     - Paramètres → sous-écran "settings"
4. **Footer** : "Élevia v1.1.0 (build 42)"

### Badge non-lu messages :
- Dot rouge sur l'icône profil dans la tabbar si `dietUnread > 0`
- Badge count à côté de "Messages de ton diététicien"

---

## 12. Sous-écrans du Profil

### 12.1 — Pourquoi ce plan est le tien (`subScreen="why"`)
- Affiche `PROFILE_TEXT` (texte explicatif du plan, vient de `client_plans.profile_text`)

### 12.2 — Suivi mesures & graphiques (`subScreen="measures"`)
- **3 KPI** en haut : Poids / Tour taille / % MG (avec deltas)
- **Metric chips** (7 métriques) :
  - Poids (kg) — couleur obj.accent
  - Tour de taille (cm) — #E8863A
  - % Masse grasse — #3B82F6
  - Tour de hanches (cm) — #F472B6
  - Masse musculaire (kg) — #10B981
  - IMC — #34C759 (calculé : weight / (height/100)²)
  - Ratio taille/TT — #8B5CF6 (calculé : waist / height)
- **Graphique principal** (AreaChart Recharts) : métrique sélectionnée dans le temps
- **Score nutrition** (BarChart) : scores bilans par semaine + ligne de référence à 70
- **Score d'adhérence** (BarChart duplicate — bug visuel)
- **Tableau historique** : Date / Poids / Taille / %MG / IMC
- **Bouton "Ajouter une mesure"** → modal formulaire :
  - Poids (requis), Tour taille, % MG, Tour hanches, Masse musculaire
  - Enregistre via `onAddMeasurement()`

### 12.3 — Recettes (`subScreen="recipes"`)
- **Source** : `RECIPES` (depuis `plan_recipes`)
- **Liste** : titre + temps + catégorie
- **Clic sur une recette** :
  - Titre + description
  - Prépa X min + Cuisson Y min + Z pers.
  - **Ingrédients** : liste (string ou {qty, unit, name})
  - **Étapes** : numérotées avec cercle accent
  - **Équivalences par portion** : icône EQ + label + X portions
- Si aucune recette : "Bientôt disponible"

### 12.4 — Messages diététicien (`subScreen="messages"`)
- **Composant** : `DietInbox`
- Liste chronologique inversée
- Chaque message : icône type + sender_name + date + title + body
- Bordure gauche accent si non lu
- Clic → marque comme lu

### 12.5 — Guides de situation (`subScreen="situation"`)
- **Source** : `CAPSULES` (depuis `plan_capsules`, filtrées par objectif)
- **Accordion** : clic toggle expand/collapse
- Icône rotative (🍽️🥂📅✈️👨‍👩‍👧🎉💼💪🏋️😌)
- **Fallback** si aucune capsule : 4 guides hardcodés
- Filtrage objectif : `objective_codes` null = universel, sinon doit contenir le code

### 12.6 — Guides vidéo (`subScreen="guides"`)
- **Source** : `VIDEO_GUIDES` (depuis `plan_video_guides`)
- Lettre É/L/E/V/I/A dans un carré accent
- Clic → ouvre URL vidéo dans nouvel onglet
- **Fallback** si aucun guide : 6 guides mock (sans URL)

### 12.7 — Ma roadmap (`subScreen="progression"`)
- **Conditionnel** : visible seulement si `PROGRESSION.length > 0` (GAIN plans)
- **Source** : `PROGRESSION` (depuis `plan_progression`)
- Cartes par phase : phaseLabel + monthsDisplay + focus + kcalDisplay + actions + eqChanges + mindset
- Bordure gauche accent pour la phase active (première)

### 12.8 — Paramètres (`subScreen="settings"`)
- **Notifications** (toggles, mock) :
  - Rappel matin (activé)
  - Rappel soir (activé)
  - Rappel bilan dimanche (désactivé)
- **Données** (liens, non connectés) :
  - Exporter mes données
  - Réinitialiser la semaine
  - Supprimer toutes mes données (rouge)
- **Abonnement** (liens, non connectés) :
  - Gérer mon abonnement
  - Restaurer mes achats
- **Support** :
  - Contacter le support
  - Signaler un problème
- **À propos** : Version 1.1.0 + CGU + Politique de confidentialité + Licences
- **Bouton déconnexion** (rouge, bas de page)

---

## 13. Système de streaks

**Hook** : `useStreaks(session)`
**Table** : `user_streaks` (user_id, streak_type, current_streak, longest_streak, last_activity_date)
**Composant** : `StreakBanner` (ligne 703)

### Logique :
- Au mount : fetch streak `streak_type = 'daily_log'`
- Si `last_activity_date` ≠ aujourd'hui ET diff > 1 jour → reset current à 0
- `incrementStreak()` appelé au premier log du jour :
  - +1 current, update longest si nouveau record
  - Upsert dans Supabase

### Affichage (StreakBanner) :
| Streak | Icône | Message |
|--------|-------|---------|
| ≥ 30 | 🔥 | "Un mois complet !" |
| ≥ 21 | 🔥 | "3 semaines, la routine s'installe !" |
| ≥ 14 | 🔥 | "Deux semaines d'affilée !" |
| ≥ 7 | 🔥 | "Semaine parfaite !" |
| ≥ 3 | ✨ | "Beau début !" |
| 1-2 | ⭐ | "de suite" |

**Record** : badge vert "Record !" si current === longest ET current ≥ 3

### Comeback (F16) :
- Si streak = 0 ET lastDate existe :
  - ≥ 7 jours : "Content de te revoir [prénom] ! Reprends doucement."
  - 2-6 jours : "[N] jours sans logger — une nouvelle série commence maintenant !"

---

## 14. Système de milestones/badges

**Hook** : `useMilestones(session)`
**Table** : `user_milestones`
**Composants** : `MilestonePopup` (ligne 589) + `BadgesGrid` (ligne 603)

### 10 milestones :
| Type | Label | Icône | Condition |
|------|-------|-------|-----------|
| `first_log` | Premier pas | 🌱 | totalLogs ≥ 1 |
| `logs_10` | 10 logs | 📝 | totalLogs ≥ 10 |
| `logs_50` | 50 logs | 📊 | totalLogs ≥ 50 |
| `logs_100` | Centurion | 💯 | totalLogs ≥ 100 |
| `streak_3` | 3 jours | ⭐ | streak ≥ 3 |
| `streak_7` | Semaine parfaite | 🔥 | streak ≥ 7 |
| `streak_14` | 2 semaines | 💪 | streak ≥ 14 |
| `streak_30` | Mois complet | 🏆 | streak ≥ 30 |
| `first_bilan` | Premier bilan | 📋 | bilanCount ≥ 1 |
| `bilans_4` | 4 bilans | 📈 | bilanCount ≥ 4 |

### Flux :
1. Chaque fois qu'un log est ajouté → `checkAndAward({ totalLogs, streak, bilanCount })`
2. Compare avec milestones déjà achievés
3. Insert nouvelles milestones dans Supabase
4. Affiche popup célébration pour la première nouvelle

### MilestonePopup :
- Overlay fullscreen sombre
- Carte blanche centrée : icône 48px + "Badge débloqué !" + label + desc
- Bouton "Super !" ferme le popup

### BadgesGrid (dans ProfileTab) :
- Grille 4 colonnes
- Achievé : coloré, border accent, opacité 100%
- Non achievé : gris, border muted, opacité 40%, grayscale

---

## 15. Messages diététicien

**Hook** : `useDietitianMessages(session)`
**Table** : `dietitian_messages`
**Composants** : `DietMessageBanner` (ligne 619), `DietInbox` (ligne 639)

### Table schema :
- `id`, `user_id`, `message_type`, `title`, `body`, `read_at`, `sender_name`, `created_at`

### Types de messages :
| Type | Icône |
|------|-------|
| `encouragement` | 💬 |
| `adjustment` | 🔧 |
| `milestone_comment` | 🏅 |
| `bilan_feedback` | 📋 |
| `alert` | ⚠️ |
| `general` | 💬 |

### Realtime :
- Subscription Supabase sur `postgres_changes` INSERT pour `dietitian_messages`
- Nouveau message → ajouté en tête + unreadCount++

### DietMessageBanner (PlanTab) :
- Visible si unread > 0
- Affiche le dernier non lu : icône + sender + title + body (2 lignes max)
- Badge count si > 1 non lu
- Clic → marque comme lu + navigue vers inbox

### DietInbox (ProfileTab > Messages) :
- Liste complète : icône + sender + date + title + body
- Non lu : bordure gauche accent
- Clic non lu → marque comme lu
- Vide : "Pas encore de message" + 💬

### Indicateurs :
- **Tabbar** : dot rouge sur icône Profil si unread > 0
- **Menu profil** : badge count à côté de "Messages de ton diététicien"

---

## 16. Micro-tips

**Source** : `MICRO_TIPS` (depuis `plan_micro_tips`)
**Fallback** : 6 tips hardcodés dans DEFAULT_MICRO_TIPS

### Affichage :
1. **PlanTab (jour)** : 1 tip, rotation par jour de l'année (`dayOfYear % MICRO_TIPS.length`)
2. **AdviceTab (focus)** : tip banner avec bouton "Suivant →" (rotation manuelle `tipIdx++`)
3. **AdviceTab (biblio)** : 4 premiers tips listés

### Catégories : nutrition, hydratation, sommeil, astuces, activite, stress

---

## 17. Challenge hebdomadaire

**Composant** : `WeeklyChallenge` (ligne 688)

### Rotation :
- Basé sur le numéro de semaine ISO : `challenges[weekNum % challenges.length]`

### Challenges PW (6) :
1. 🎯 Logge tes 3 repas principaux chaque jour
2. 🥝 Essaie un fruit ou légume que tu n'as pas encore loggé
3. 💪 Atteins ta cible protéines 5 jours sur 7
4. ✨ Reste dans ton budget kcal 6 jours cette semaine
5. 🏆 Remplis toutes tes équivalences clés au moins 1 jour
6. 🔒 Zéro hors-plan pendant 3 jours consécutifs

### Challenges GAIN (6) :
1. 🎯 Atteins ta cible kcal chaque jour cette semaine
2. 🥩 Varie tes sources de protéines sur 5 repas
3. 💪 Ne saute aucune collation pré ou post-entraînement
4. ⏰ Logge tous tes repas avant 21h chaque jour
5. 🏆 Remplis 100% de tes équivalences clés 3 jours de suite
6. 🍚 Essaie un féculent que tu n'as pas encore loggé

---

## 18. Snackbar contextuel

**Affiché** : en bas de l'écran (position absolute, z-index 300) pendant 2.8 secondes

### Messages contextuels (dans `handleLog()`) :
| Condition | Message |
|-----------|---------|
| Premier log du jour | "Bon matin [prénom] !" (avant midi) / "Bonne journée [prénom] !" |
| Objectif jour atteint (PW: 90-105%, GAIN: ≥95%) | "Objectif du jour atteint, [prénom] !" |
| EQ cible semaine atteinte | "[label EQ] — cible semaine atteinte !" |
| Macro du jour croisée 100% | "Cible protéines du jour ✓" (ou lipides/glucides) |
| Log hors plan | Rotation : "C'est noté — l'important c'est la transparence" / "Loggé, c'est l'essentiel" / "Noté, on continue !" |
| Log normal (PW) | Rotation : "Bien joué !" / "C'est noté !" / "Tu restes dans ton budget !" / "On avance !" |
| Log normal (GAIN) | Rotation : "Bien joué !" / "C'est noté !" / "Tu te rapproches de ta cible !" / "On avance !" |
| Suppression | "✓ Supprimé" (2s) |

### Animation : `snackPop` (bounce-in)

---

## 19. Onboarding (première utilisation)

**Composant** : `OnboardingOverlay` (`src/components/OnboardingOverlay.jsx`)
**Storage** : `localStorage.elevia_onboarding_done`

### 5 étapes (adaptées par objectif) :

#### PW :
1. ✨ "Bienvenue sur Élevia" — plan prêt, 30 secondes intro
2. 🎯 "Ton budget du jour" — ne pas dépasser, cercle progress
3. 🍽️ "Les équivalences" — catégories d'aliments, bouton +
4. 📊 "L'équilibre sur la semaine" — vue semaine, pas de stress
5. 💪 "C'est parti !" — commence par le prochain repas

#### GAIN :
1. ✨ "Bienvenue sur Élevia" — plan de prise de masse
2. 🎯 "Ton objectif du jour" — atteindre, pas rester en-dessous
3. 🍽️ "Les équivalences" — collations pré/post-entraînement
4. 📊 "L'équilibre sur la semaine" — régularité construit le muscle
5. 💪 "C'est parti !" — chaque gramme de protéine compte

### UI : overlay sombre + dots de progression + Précédent/Suivant + "Passer l'introduction"

---

## 20. Splash screen

**Durée** : 1 seconde
**Fond** : dégradé navy (#0A1620 → #121E2D → #122438)
**Contenu** :
- Orbe radial gradient accent (subtil)
- Logo ÉLEVIA SVG
- Sous-titre objectif-aware (`obj.welcomeSubtitle`)
- Version "v1.1.0"

---

## 21. Système de food logs (Supabase)

**Hook** : `useFoodLogs(session, planData)`
**Table** : `food_logs`

### Schema food_logs :
- `id` (uuid), `user_id`, `plan_id`, `log_date`, `slot_id`, `eq_id`, `item_id`, `qty`, `unit`, `notes`, `created_at`

### Flux :
1. **Fetch au mount** : logs du jour (`log_date = localToday()`) + logs de la semaine (lundi-dimanche)
2. **weekConsumed** : `{ eqId: totalQty }` agrégé sur la semaine
3. **weekNutrients** : `{ kcal, p, l, g }` agrégé sur la semaine
4. **addLog** (optimistic) :
   - Ajoute immédiatement au state local
   - Update weekConsumed + weekNutrients
   - INSERT dans Supabase
   - Si erreur → rollback state local
5. **deleteLog** (optimistic) :
   - Retire du state local
   - Recalcule weekConsumed + weekNutrients
   - DELETE dans Supabase

### Calcul kcal/macros :
- Si item a `nutrientsPerUnit` → `nutrientsPerUnit * qty`
- Sinon si EQ trouvée → `nutrientsPerPortion * qty`
- Sinon → 0

### isOutOfPlan :
- `eqId NOT IN planTargets` OU `eqId NOT IN SLOT_ALLOWED[slotId]`

---

## 22. Données statiques vs dynamiques

### Statiques (hardcodées dans elevia-prototype.jsx) :
| Donnée | Contenu |
|--------|---------|
| `B` (colors) | Palette complète (navy, gold, ivory, etc.) |
| `DEFAULT_*` | Fallbacks complets pour tous les datasets |
| `CHALLENGES_PW` / `CHALLENGES_GAIN` | 6+6 challenges hebdo |
| `MSG_TYPE_ICONS` | Mapping type → emoji |
| `EQ_ICONS` | Mapping eqId → composant SVG |
| `typeIcons` | Mapping type → emoji (dans transformPlanData) |
| `TYPE_LABELS` | Mapping type → label FR |
| `defaultTimes` | Heures par défaut des slots |
| `MILESTONE_DEFS` | 10 milestones (dans useMilestones.js) |
| CSS complet | Variable css (300 lignes) |
| SVG icons | 15 composants SVG inline |

### Dynamiques (Supabase) :
| Donnée | Source | Refresh |
|--------|--------|---------|
| Profil client | `profiles` + `client_plans` | Au mount |
| Équivalences + items | `plan_equivalences` + `plan_items` | Au mount |
| Slots + mapping | `plan_slots` + `plan_slot_mapping` | Au mount |
| Targets semaine | `plan_targets` | Au mount |
| Conseils | `plan_advices` | Au mount |
| Micro-tips | `plan_micro_tips` | Au mount |
| Mesures | `measurements` | Au mount + après ajout |
| Bilans | `weekly_bilans` | Au mount + après création |
| Food logs | `food_logs` | Au mount + optimistic updates |
| Streaks | `user_streaks` | Au mount + après premier log jour |
| Milestones | `user_milestones` | Au mount + après check |
| Messages diététicien | `dietitian_messages` | Au mount + **realtime** |
| Catalogue ref | `ref_eq_master` + `ref_eq_items` | Au mount |
| Guides vidéo | `plan_video_guides` | Au mount |
| Recettes | `plan_recipes` | Au mount |
| Progression | `plan_progression` | Au mount |
| Capsules | `plan_capsules` | Au mount |

---

## 23. Tables Supabase utilisées

### Tables lues (SELECT) :
| Table | Filtré par | Lignes typiques |
|-------|-----------|-----------------|
| `profiles` | user_id | 1 |
| `client_plans` | plan_id | 1 |
| `plan_equivalences` | plan_id | 10-15 |
| `plan_items` | plan_id | 30-60 |
| `plan_slots` | plan_id | 5-7 |
| `plan_slot_mapping` | plan_id | 30-50 |
| `plan_targets` | plan_id | 10-20 |
| `plan_advices` | plan_id | 3-6 |
| `plan_micro_tips` | plan_id | 3-6 |
| `measurements` | user_id | 2-10 |
| `weekly_bilans` | user_id | 0-20 |
| `food_logs` | user_id + plan_id + date | 0-30/jour |
| `user_streaks` | user_id | 1 |
| `user_milestones` | user_id | 0-10 |
| `dietitian_messages` | user_id | 0-20 |
| `ref_eq_master` | ALL | 63 |
| `ref_eq_items` | ALL | ~300 |
| `plan_video_guides` | ALL | 0-6 |
| `plan_recipes` | is_active | 0-20 |
| `plan_progression` | plan_id | 0-3 |
| `plan_capsules` | ALL | 0-15 |

### Tables écrites (INSERT/UPDATE/DELETE) :
| Table | Opération | Depuis |
|-------|-----------|--------|
| `food_logs` | INSERT, DELETE | useFoodLogs |
| `measurements` | INSERT | useMeasurements |
| `weekly_bilans` | INSERT | useWeeklyBilans |
| `user_streaks` | UPSERT | useStreaks |
| `user_milestones` | INSERT | useMilestones |
| `dietitian_messages` | UPDATE (read_at) | useDietitianMessages |

---

## 24. Hooks React

| Hook | Fichier | Rôle | State exposé |
|------|---------|------|-------------|
| `useAuth` | `hooks/useAuth.js` | Session Supabase | session, loading, signIn, signOut |
| `usePlanData` | `hooks/usePlanData.js` | Fetch + transform 16 tables | data, loading, error |
| `useFoodLogs` | `hooks/useFoodLogs.js` | CRUD food logs + weekConsumed | logs, weekConsumed, weekNutrients, addLog, deleteLog |
| `useMeasurements` | `hooks/useMeasurements.js` | CRUD mesures corporelles | measurements, addMeasurement |
| `useWeeklyBilans` | `hooks/useWeeklyBilans.js` | CRUD bilans | bilans, createBilan |
| `useStreaks` | `hooks/useStreaks.js` | Streak daily_log | streak, incrementStreak |
| `useMilestones` | `hooks/useMilestones.js` | 10 badges | milestones, milestoneDefs, newlyUnlocked, checkAndAward, dismissPopup |
| `useDietitianMessages` | `hooks/useDietitianMessages.js` | Messages + realtime | messages, unreadCount, markAsRead, markAllAsRead |

### Custom hooks dans le prototype :
| Hook | Rôle |
|------|------|
| `useData()` | Accède au DataCtx (planData) |
| `useObjective()` | Retourne getObjectiveConfig(code) |
| `useHelpers()` | getEq, isInPlan, getLogLabel, getLogSub |

---

## 25. Différences par objectif (tableau)

| Aspect | PW | MAINT | GAIN_LEAN | GAIN_COMFORT | GAIN_GUIDE |
|--------|-----|-------|-----------|--------------|------------|
| **Couleur accent** | Or #C6A05B | Or | Bleu #3B7BF6 | Bleu | Bleu |
| **kcalFraming** | "Budget" | "Cible" | "Objectif" | "Objectif" | "Objectif" |
| **kcalVerb** | "dépensé" | "consommé" | "atteint" | "atteint" | "atteint" |
| **Ring orange si** | >115% | >115% | <85% | <85% | <85% |
| **PBar orange si** | >120% | >120% | <80% | <80% | <80% |
| **dayHint** | "Repère indicatif..." | "Régularité..." | "Les muscles..." | "Manger suffisamment..." | "Chaque repas..." |
| **hpEducation** | "...revenir au cadre" | "...stabiliser" | "...cible calorique" | "...cible calorique" | "...cible calorique" |
| **welcomeSubtitle** | "Nutrition personnalisée" | "Nutrition personnalisée" | "Performance nutritionnelle" | "Nutrition personnalisée" | "Nutrition guidée" |
| **Score 85+** | "Très solide" | "Très solide" | "Solide" | "Solide" | "Solide" |
| **Score 70-84** | "Solide" | "Solide" | "En route" | "En route" | "En route" |
| **Score 55-69** | "Correct" | "Correct" | "À renforcer" | "À renforcer" | "À renforcer" |
| **Score <55** | "À ajuster" | "À ajuster" | "Insuffisant" | "Insuffisant" | "Insuffisant" |
| **eqFilterField** | obj_pw | obj_pw | obj_mass | obj_mass | obj_mass |
| **kpiDir** | down | neutral | up | up | up |
| **kpiColor** | #34C759 | #C6A05B | #3B7BF6 | #3B7BF6 | #3B7BF6 |
| **kpiArrow** | ↓ | → | ↑ | ↑ | ↑ |
| **Slots** | 5 | 5 | 7 (+pre/post) | 7 | 7 |
| **Challenges** | PW set | PW set | GAIN set | GAIN set | GAIN set |
| **Onboarding** | PW steps | PW steps | GAIN steps | GAIN steps | GAIN steps |
| **Roadmap** | Non | Non | Oui | Oui | Oui |
| **Snackbar "normal"** | "Tu restes dans ton budget !" | "Tu restes dans ton budget !" | "Tu te rapproches de ta cible !" | "Tu te rapproches de ta cible !" | "Tu te rapproches de ta cible !" |

---

## 26. Catalogue d'équivalences

### Plan catalogue (typique PW, ~19 EQ) :
| eqId | Label | Type | eqMode | Importance |
|------|-------|------|--------|------------|
| pain | Pain | carbs | R | normal |
| cereales_ig_modere | Céréales IG modéré | carbs | R | normal |
| feculents_chauds | Féculents chauds | carbs | R | normal |
| fruits_natures | Fruits natures | fruits | R | key |
| legumes_cuits | Légumes cuits | veg | F | key |
| legumes_crus | Légumes crus | veg | F | key |
| viandes_faibles_kcal | Viandes maigres | vvpo | F | key |
| poissons_maigres | Poissons maigres | vvpo | F | key |
| oleagineux_nature | Oléagineux | fat | R | normal |
| pl_0_riche_p | PL faibles en kcal | dairy | R | normal |
| pl_50_100_kcal | PL 50–100 kcal | dairy | R | normal |
| fromages_20_30_mg | Fromages 20–30%MG | dairy | R | normal |
| assaisonnement_repas_froid | Assaisonnement froid | fat | F | flex |
| assaisonnement_repas_chaud | Assaisonnement chaud | fat | F | flex |
| mg_cuisson | MG cuisson | fat | F | flex |
| mg_tartinables | MG tartinables | fat | F | flex |
| garnitures_sucrees_pain | Garnitures sucrées | carbs | R | flex |
| chocolat_noir_mt70 | Chocolat noir ≥70% | extras | R | flex |
| charcuteries_maigres | Charcuteries maigres | vvpo | F | normal |

### Hors plan (extras accessibles) :
| eqId | Label | Type |
|------|-------|------|
| alcool_leger_1u | Alcool léger | drinks |
| extras_except_patisserie | Extras | extras |
| patisserie | Pâtisserie | extras |

### Full catalogue (ref) : 63 EQ couvrant tous les types

### eqMode :
- `R` (Ration) : quantité comptée en portions
- `F` (Forfait) : completion seulement (présent/absent)

### eqImportance :
- `key` : EQ essentielles (déclenchent alertes si en retard)
- `normal` : EQ standards
- `flex` : EQ flexibles (assaisonnements, extras)

---

## 27. Modes d'input (appInputMode)

| Mode | Comportement | Exemples |
|------|-------------|----------|
| `COMPLETION_ONLY` | Clic = logge 1 portion, pas de modal | Légumes cuits, Légumes crus |
| `ITEM_FIRST_PICK` | Liste items affichée d'abord → sélection → stepper | Fruits (pomme, banane...), Oléagineux |
| `ITEM_UNIT_STEPPER` | Bouton "Ajouter 1 portion" + option "Modifier quantité" → stepper | Pain, PL, Fromages |
| `ITEM_SPOON_STEPPER` | Comme ITEM_UNIT_STEPPER, unité = cuillère à soupe | Céréales, Garnitures |
| `PORTION_TAP` | Stepper par portions (0.25/0.25/4 par défaut) | Viandes, Poissons |

### defaultAction :
- `LOG_COMPLETION` : log direct (pour eqMode F)
- `LOG_1_PORTION` : bouton rapide 1 portion
- `PICK_ITEM` : afficher la liste d'items

---

## 28. Formules et calculs

### Kcal du jour
```
dayNut = sum(logs.kcal) pour le jour
DAY_TARGETS = WEEK_TARGETS / 7 (ou kcal_day, protein_day_g si stored generated)
```

### Ring progress
```
pct = dayNut.kcal / DAY_TARGETS.kcal
Ring color :
  PW/MAINT : pct > 1.15 → orange, pct >= 0.95 → vert, sinon → accent
  GAIN_* : pct < 0.85 → orange, pct >= 0.95 → vert, sinon → accent
```

### Progress bars (PBar)
```
PW/MAINT : > pbarOrangeAbove(120)% → orange, >= 100% → vert, < → accent
GAIN_* : < pbarOrangeBelow(80)% → orange, >= 100% → vert, entre → accent
```

### Week alert (F5)
```
Pour chaque EQ key :
  expectedPct = dayOfWeek / 7 * 100
  ratio = weekConsumed[eqId] / planTarget[eqId]
  Si ratio < expectedPct * 0.7 → "[EQ] en retard"
Si kcal PW > 105% ou GAIN < expected*0.7 → alerte kcal
Sinon → alerte par défaut objective
```

### Bilan score
```
adherenceScore = avg(evalScores) / 2 * 100
  (evalScores : Solide=2, En progrès=1, Pas encore=0)
```

### IMC (dans mesures)
```
bmi = weightKg / (heightCm / 100)²
```

### Ratio taille/TT
```
ratio = waistCm / heightCm
```

### Streak reset
```
Si (today - lastActivityDate) > 1 jour → current = 0
```

### Semaine/Jour du plan
```
daysSinceStart = floor((now - planStartDate) / 86400000)
weekNum = floor(daysSinceStart / 7) + 1
dayNum = daysSinceStart + 1
```

---

## 29. Profils de test

**Migration** : `009_test_profiles_seed.sql`

| Email | Objectif | Sexe/Âge | Poids | Streak | Bilans | Particularité |
|-------|----------|----------|-------|--------|--------|---------------|
| test-emma@elevia.app | PW | F/32 | 68→58kg | 12 | 4 (70-85) | Bon suivi, 5 slots |
| test-lucas@elevia.app | GAIN_LEAN | M/24 | 72→80kg | 8 | 3 (78-88) | 7 slots, progression |
| test-sophie@elevia.app | MAINT | F/45 | 62kg stable | 5 | 3 (62-78) | Modérée |
| test-thomas@elevia.app | GAIN_COMFORT | M/19 | 55→65kg | 3 | 2 (45-60) | Struggling |
| test-julie@elevia.app | GAIN_GUIDE | F/28 | 50→56kg | 4 | 2 (55-68) | Pescétarienne, nouvelle |

**Prérequis** : créer les auth users dans Supabase Dashboard, puis remplacer les UUID placeholders

---

## 30. Bugs connus / Pre-existing issues

| # | Sévérité | Description | Localisation |
|---|----------|-------------|-------------|
| ~~1~~ | ~~P1~~ | ~~`plan_video_guides` : transform lit `video_url`/`duration_label` mais DB a `youtube_url`/`duration_seconds`~~ **CORRIGÉ** — transform lit maintenant `youtube_url`/`duration_seconds` | transformPlanData.js L292-298 |
| 2 | P1 | `profiles` n'a pas de colonne `last_name` → code référence `profile.last_name` | transformPlanData.js L364 |
| 3 | P2 | Score d'adhérence chart dupliqué (2x le même BarChart dans measures) | elevia-prototype.jsx L1270-1310 |
| 4 | P2 | Recherche bibliothèque (AdviceTab) : input placeholder sans handler onChange | elevia-prototype.jsx L1017 |
| 5 | P2 | "Comprendre ton plan" menu item : pas de `onClick` → non cliquable | elevia-prototype.jsx L1516 |
| 6 | P2 | Notifications toggles (settings) : purement visuels, pas de state réel | elevia-prototype.jsx L1468 |
| 7 | P3 | Mock times hardcodés dans les slots (breakfast "7h42", etc.) | elevia-prototype.jsx L855 |
| 8 | P3 | Statuts des conseils hardcodés en local (pas depuis DB) | elevia-prototype.jsx L983 |
| 9 | P3 | `generated ALWAYS` columns (`kcal_day`, `protein_day_g`) → ne pas INSERT | 001_schema.sql |

---

## 31. Checklist de test fonctionnel

### Authentification
- [ ] Connexion avec email/password valides
- [ ] Connexion avec mauvais mot de passe → erreur affichée
- [ ] Déconnexion depuis Paramètres
- [ ] Session persistée au refresh

### Chargement
- [ ] Splash screen affiché 1 seconde
- [ ] Onboarding au premier lancement (5 étapes)
- [ ] Onboarding PW (texte "budget", "ne pas dépasser")
- [ ] Onboarding GAIN (texte "objectif", "atteindre")
- [ ] "Passer l'introduction" fonctionne
- [ ] Onboarding ne réapparaît pas après localStorage set
- [ ] Chargement des 16 tables sans erreur
- [ ] Message erreur si aucun plan actif

### Plan — Vue Jour
- [ ] Ring kcal affiché avec bon pourcentage
- [ ] Ring couleur correcte (accent/vert/orange selon objectif)
- [ ] Ring pulse à chaque ajout
- [ ] Macros P/L/G affichées et correctes
- [ ] Day hint texte objectif-aware
- [ ] 5 slots pour PW/MAINT, 7 slots pour GAIN_*
- [ ] Bouton + ouvre AddModal
- [ ] Logs affichés dans le bon slot
- [ ] Chip "HP" sur les logs hors plan
- [ ] Clic sur log → modal suppression
- [ ] Suppression effective (disparaît + kcal recalculé)
- [ ] Quick-add (boutons récents sous le slot)
- [ ] Streak banner avec bon message et icône
- [ ] Comeback message si streak cassée ≥2 jours
- [ ] Challenge hebdomadaire affiché
- [ ] Micro-tip rotatif affiché
- [ ] Message diététicien banner si non lu
- [ ] Semaine X · Jour Y affichés correctement

### Plan — Vue Semaine
- [ ] Alerte dynamique (EQ en retard ou kcal)
- [ ] Bilan semaine (kcal total + macros + barre + jours restants)
- [ ] Carte hors plan (si HP > 0 : kcal + nb ajouts)
- [ ] Liste EQ avec progression (X/Y sem.)
- [ ] Barres colorées (accent/vert/orange)
- [ ] Check vert si EQ complétée
- [ ] Recherche EQ fonctionnelle

### AddModal
- [ ] Onglet "Dans ton plan" : EQ correctes pour le slot
- [ ] Onglet "Autres" : EQ hors slot + ref filtré par objectif
- [ ] Filtres diététiques (Végé / Sans gluten / Sans lactose)
- [ ] Recherche dans "Autres"
- [ ] Mode COMPLETION_ONLY : log direct, pas de stepper
- [ ] Mode ITEM_FIRST_PICK : liste items → sélection → stepper
- [ ] Mode ITEM_UNIT_STEPPER : "Ajouter 1 portion" + "Modifier"
- [ ] Mode PORTION_TAP : stepper portions (0.25 step)
- [ ] Live calc affiche grammes + kcal + macros
- [ ] Note Élevia (toggle info)
- [ ] Éducation HP au premier log hors plan
- [ ] Snackbar après ajout

### Conseils
- [ ] Vue Focus : 3 prioritaires + 3 secondaires
- [ ] Vue Biblio : groupé par statut + micro-tips
- [ ] Tip banner rotatif avec "Suivant →"
- [ ] Clic conseil → AdviceDetail modal
- [ ] AdviceDetail : shortBody + objectif + bullets + tip + body expandable
- [ ] Toggle Lu/Non lu
- [ ] "Évaluer ma semaine" → modal bilan
- [ ] Bilan : score par conseil + wellbeing sliders + enregistrer

### Historique
- [ ] Dernier bilan mis en avant
- [ ] Liste des bilans avec score + couleur + label
- [ ] Clic bilan → BilanDetail
- [ ] BilanDetail : score + delta + trend + résumé + conseils
- [ ] Ajouts récents (8 derniers logs)
- [ ] Si aucun bilan : "Pas encore de bilan"
- [ ] Si aucun log : message vide

### Profil
- [ ] Profile card : nom + programme + taille + date + semaine
- [ ] KPI boxes : poids + tour taille + %MG + deltas
- [ ] Couleur delta correcte selon objectif
- [ ] Badges grid : achievés colorés, non-achievés gris
- [ ] Compteur "X/Y débloqués"
- [ ] Menu "Pourquoi ce plan est le tien" → texte
- [ ] Menu "Suivi mesures & graphiques" → charts
- [ ] Menu "Recettes" → liste + détail
- [ ] Menu "Messages" → inbox + badge unread
- [ ] Menu "Guides de situation" → accordion capsules
- [ ] Menu "Guides vidéo" → liste avec fallback
- [ ] Menu "Ma roadmap" → phases (GAIN only)
- [ ] Menu "Paramètres" → settings page
- [ ] Dot rouge tabbar si messages non lus

### Mesures & Graphiques
- [ ] 3 KPI en haut (poids, taille, %MG)
- [ ] 7 métriques sélectionnables (chips)
- [ ] AreaChart pour chaque métrique
- [ ] BarChart score nutrition
- [ ] Tableau historique
- [ ] Bouton "Ajouter une mesure" → formulaire
- [ ] Ajout mesure (au moins poids requis)

### Messages diététicien
- [ ] Liste des messages avec date + sender + type
- [ ] Non lu : bordure accent
- [ ] Clic → marque comme lu
- [ ] Realtime : nouveau message apparaît sans refresh
- [ ] Banner sur PlanTab si non lu
- [ ] Badge count dans menu profil

### Streaks
- [ ] Streak incrémentée au premier log du jour
- [ ] Pas de double incrémentation le même jour
- [ ] Streak reset si 2+ jours sans log
- [ ] Record badge si current === longest >= 3

### Milestones/Badges
- [ ] first_log débloqué au premier log
- [ ] Popup célébration apparaît
- [ ] Bouton "Super !" ferme le popup
- [ ] Badge affiché dans la grille profil
- [ ] streak_3, streak_7 etc. débloqués à la bonne valeur
- [ ] first_bilan débloqué au premier bilan
- [ ] Pas de doublon (check achievedTypes)

### Recettes
- [ ] Liste avec titre + temps + catégorie
- [ ] Détail : description + ingrédients + étapes numérotées
- [ ] Équivalences par portion affichées
- [ ] Si aucune recette : "Bientôt disponible"

### Capsules (Guides de situation)
- [ ] Liste avec icônes + titres
- [ ] Accordion expand/collapse
- [ ] Filtrage par objectif (GAIN-specific visible pour GAIN, universel pour tous)
- [ ] Fallback si aucune capsule en DB

### Onboarding
- [ ] 5 étapes avec navigation
- [ ] Adapté PW vs GAIN
- [ ] "Passer" → skip
- [ ] localStorage marqué → ne réapparaît plus

### Cross-cutting
- [ ] Thème or pour PW/MAINT
- [ ] Thème bleu pour GAIN_*
- [ ] Toutes les couleurs suivent le thème (accent, rings, bars, badges, etc.)
- [ ] Pas de crash si aucune donnée (fallbacks fonctionnent)
- [ ] Timezone Belgique (CET/CEST) correcte pour dates

---

*Ce document est maintenu à jour. Toute modification de l'app doit être reflétée ici.*
