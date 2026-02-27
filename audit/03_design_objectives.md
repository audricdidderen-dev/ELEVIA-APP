# Audit 03 — Design System, Différenciation par Objectif & Populations Alimentaires

**Date** : 27 février 2026
**Scope** : Design system complet, différenciation UX par objectif nutritionnel, support populations alimentaires
**Fichiers analysés** :
- `elevia-prototype.jsx` (~1145 lignes : CSS inline + 12 composants React)
- `src/lib/objectiveConfig.js` (5 objectifs, config couleurs/textes/seuils)
- `src/lib/transformPlanData.js` (transformation Supabase → UI, flags `_objFlags`)
- `src/components/LoginScreen.jsx` (écran de connexion)

**Références design** : Apple HIG 2025 (Liquid Glass), Noom, Yazio, MyFitnessPal, Lifesum
**Standards** : WCAG 2.2 AA, Apple HIG, Material Design Health

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Audit du Design System actuel](#2-audit-du-design-system-actuel)
3. [Audit de la différenciation par objectif](#3-audit-de-la-différenciation-par-objectif)
4. [Audit du support des populations alimentaires](#4-audit-du-support-des-populations-alimentaires)
5. [Propositions concrètes](#5-propositions-concrètes)
6. [Plan d'action priorisé](#6-plan-daction-priorisé)

---

## 1. Résumé exécutif

### Points forts actuels
- **Palette premium cohérente** : navy + or + ivoire = positionnement haut de gamme clair, distinct des apps "mass market" (MyFitnessPal vert, Yazio bleu vif)
- **Typographie soignée** : DM Sans (corps) + Playfair Display (accents italiques) = excellent duo lisibilité + élégance
- **CSS custom properties** : les variables `--accent-*` permettent déjà un thème dynamique par objectif
- **Logique inversée fonctionnelle** : PW "ne pas dépasser" vs GAIN "atteindre" = correct sur le plan nutritionnel
- **Animations fluides** : `cardIn`, `slideUp`, `splashLogo` = sensation premium
- **Tab bar flottante** : design glassmorphism (backdrop-filter) = tendance Apple 2025

### Lacunes critiques
| # | Lacune | Impact | Priorité |
|---|--------|--------|----------|
| 1 | **Différenciation visuelle minimale** : seulement or vs bleu, tout le reste est identique | Patient GAIN voit la même app qu'un patient PW, aucune sensation de parcours personnalisé | **P0** |
| 2 | **Aucun support UI des populations alimentaires** | Les flags diet_vegetarian, gluten_free, lactose_free existent en DB mais sont totalement ignorés dans l'interface | **P1** |
| 3 | **Contraste insuffisant** sur certains éléments | `textFaint` rgba(15,30,46,.42) sur fond #F7F7F7 = ratio ~2.8:1 (WCAG AA exige 4.5:1) | **P1** |
| 4 | **Dashboard identique** tous objectifs | PW devrait montrer "budget restant", GAIN "objectif à atteindre" — même card, même layout | **P1** |
| 5 | **Aucune illustration/icône par objectif** | Pas d'identité visuelle propre à chaque parcours | **P2** |
| 6 | **Touch targets sous-dimensionnés** | `.slot-add` = 32x32px (Apple HIG minimum = 44x44) | **P1** |
| 7 | **Pas de dark mode** | App ivoire seulement, header navy — pas d'option sombre | **P2** |
| 8 | **Langage motivationnel peu différencié** | `dayHint` et `bilanSummary` varient, mais le vocabulaire du reste de l'UI est identique | **P1** |

---

## 2. Audit du Design System actuel

### 2.1 Typographie

**État actuel** :
- Corps : DM Sans 400/500/600/700/800/900
- Accent : Playfair Display italic 700/800
- Tailles : 10px–24px (11 tailles distinctes)

**Diagnostic** :

| Aspect | Score | Détail |
|--------|-------|--------|
| Hiérarchie | 7/10 | `.page-title` 24px/800 et `.card-title` 15px/800 sont bien distincts, mais il manque un niveau intermédiaire (18-20px) pour les titres de section |
| Lisibilité mobile | 6/10 | Beaucoup de texte à 10-11px (`.macro-letter`, `.kpi-label`, `.slot-time`) — limite de lisibilité sur petit écran |
| Cohérence | 5/10 | Font sizes en dur partout dans les styles inline au lieu d'utiliser des variables CSS |
| Branding | 8/10 | Playfair italic pour "É" et les accents = signature forte |

**Recommandation** : Créer une échelle typographique standardisée :

```css
/* Typography scale — proposition */
:root {
  --fs-xs: 10px;    /* labels, metadata */
  --fs-sm: 12px;    /* secondaire, badges */
  --fs-base: 14px;  /* corps, items */
  --fs-md: 16px;    /* sous-titres */
  --fs-lg: 20px;    /* titres section (NOUVEAU) */
  --fs-xl: 24px;    /* titres page */
  --fs-2xl: 28px;   /* KPI principaux */

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --fw-extrabold: 800;
}
```

### 2.2 Couleurs

**Palette actuelle** :
```
Navy (background header/profil) : #0E1E2E
Ivoire (fond pages)             : #F7F7F7
Or (accent PW/MAINT)            : #C6A05B
Bleu (accent GAIN_*)            : #3B7BF6
Texte principal                  : #1A1A1A
Texte muted                      : #6B7280
Texte faint                      : rgba(15,30,46,.42)
Vert (succès)                    : #34C759
Orange (alerte/excès)            : #E8863A
Rouge (danger)                   : #FF3B30
```

**Diagnostic accessibilité** :

| Paire | Ratio estimé | WCAG AA (4.5:1) | WCAG AAA (7:1) |
|-------|-------------|-----------------|----------------|
| #1A1A1A sur #F7F7F7 | ~15.5:1 | PASS | PASS |
| #C6A05B sur #F7F7F7 | ~3.3:1 | **FAIL** | FAIL |
| #C6A05B sur #0E1E2E | ~4.2:1 | **FAIL** (normal text) | FAIL |
| #6B7280 sur #F7F7F7 | ~4.7:1 | PASS (limite) | FAIL |
| rgba(15,30,46,.42) sur #F7F7F7 | ~2.8:1 | **FAIL** | FAIL |
| #3B7BF6 sur #F7F7F7 | ~3.6:1 | **FAIL** | FAIL |
| #34C759 sur #fff | ~2.5:1 | **FAIL** | FAIL |

**3 problèmes critiques d'accessibilité** :
1. **L'or (#C6A05B) comme couleur de texte** ne passe pas WCAG AA sur fond clair NI sur fond sombre — il est utilisable comme accent graphique (bordures, icônes décoratives) mais PAS pour du texte informatif
2. **Le bleu (#3B7BF6)** a le même problème comme texte sur fond clair
3. **Le vert (#34C759)** utilisé pour les labels "Lu" et les deltas positifs est illisible sur fond blanc

**Recommandation** :
```css
/* Couleurs text-safe (AA compliant) */
--gold-text: #9A7A3E;     /* or assombri, ~5.2:1 sur #F7F7F7 */
--blue-text: #2D5EC4;     /* bleu assombri, ~5.8:1 sur #F7F7F7 */
--green-text: #1E8E3E;    /* vert assombri, ~4.6:1 sur #F7F7F7 */
--gold-on-dark: #D4B878;  /* or éclairci, ~6.2:1 sur #0E1E2E */
```
Garder les couleurs vives actuelles pour les éléments graphiques (rings, barres, icônes) et utiliser les variantes assombries pour tout texte.

### 2.3 Espacements et grille

**État actuel** :
- Padding page : 14px 18px 24px
- Card padding : 14px
- Card border-radius : 20px
- Card margin-bottom : 10px
- Gap entre éléments : variable (6px, 8px, 10px, 12px, 14px)

**Diagnostic** :
- Pas de système d'espacement cohérent (valeurs arbitraires)
- Les cards sont bien arrondies (20px) = premium
- Le padding horizontal de 18px est un peu serré pour du 430px max-width

**Recommandation** — échelle à 4px :
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-pill: 99px;
}
```

### 2.4 Composants

#### Cards (`.card`)
- **Bien** : border-radius 20px, ombre subtile, bordure accent
- **Manque** : pas de variantes (card-elevated, card-flat, card-highlight)
- **Manque** : pas de card spécifique par type de contenu (mesure, bilan, alerte)

#### Boutons
- **Primary** (`.btn-primary`) : 100% width, 14px padding, border-radius 14px
  - **Bien** : effect press (scale .97)
  - **Manque** : pas de bouton secondary (outline), pas de bouton icon-only
  - **Problème** : toujours 100% width — pas adapté quand 2 actions côte à côte

#### Tab bar (`.tbar`)
- **Bien** : glassmorphism, dot indicator active, scale effect
- **Manque** : badge notification sur l'icône Conseils
- **Problème** : 4 onglets seulement — manque "Recettes" qui est dans le profil

#### Slots (`.slot`)
- **Bien** : structure claire, ajout visible
- **Problème** : `.slot-add` = 32x32px, **sous le minimum HIG de 44x44px**
- **Problème** : `.eq-add-btn` = 30x30px, même souci

#### Modals (`.modal`)
- **Bien** : animation slideUp, handle, max-height 75%
- **Manque** : pas de geste swipe-to-dismiss
- **Manque** : pas de backdrop-filter (blur) comme la tab bar

#### Progress bars (`.pbar-*`)
- **Bien** : arrondies, gradient, transitions
- **Manque** : pas d'animation de remplissage au premier rendu
- **Manque** : le vert (#34C759) est trop saturé sur fond blanc — un vert plus doux serait plus premium

### 2.5 Animations et transitions

**État actuel** :
- `cardIn` : fadeIn + translateY(8px), staggered par index (0-160ms)
- `slideUp` : modal from bottom
- `splashLogo` / `splashTag` : splash screen
- `.tbar-item:active` : scale(.92)
- `.btn-primary:active` : scale(.97)

**Diagnostic** : 6/10
- Les micro-interactions de press sont bien
- Il manque des transitions de navigation entre onglets (fade ou slide horizontal)
- Les listes (équivalences, conseils) n'ont pas de transition d'entrée/sortie
- Le ring kcal n'a pas d'animation au premier rendu (devrait se remplir progressivement)

**Recommandation** :
```css
/* Ring animation au rendu */
@keyframes ringFill {
  from { stroke-dasharray: 0 176; }
}
/* Utiliser animation: ringFill 1.2s cubic-bezier(.4,0,.2,1) sur le <circle> */
```

### 2.6 Touch targets

| Élément | Taille actuelle | Minimum Apple HIG | Verdict |
|---------|----------------|-------------------|---------|
| `.slot-add` | 32x32 | 44x44 | **FAIL** |
| `.eq-add-btn` | 30x30 | 44x44 | **FAIL** |
| `.stepper-btn` | 40x40 | 44x44 | **FAIL** (limite) |
| `.tbar-item` | ~flex (OK) | 44x44 | PASS |
| `.btn-primary` | 100% x 42px | 44x44 | PASS (largeur) |
| `.seg-btn` | auto x 34px | 44x44 | **FAIL** |
| `.modal-tab` | auto x 34px | 44x44 | **FAIL** |

**Recommandation** : tous les targets interactifs doivent avoir au minimum 44x44px de zone cliquable (padding invisible si nécessaire).

---

## 3. Audit de la différenciation par objectif

### 3.1 État actuel — Ce qui change entre PW et GAIN

| Dimension | PW/MAINT | GAIN_* | Évaluation |
|-----------|----------|--------|------------|
| Couleur accent | #C6A05B (or) | #3B7BF6 (bleu) | Correct mais insuffisant |
| kcalFraming | "Budget" | "Objectif" | Correct |
| kcalVerb | "dépensé" | "atteint" | Correct |
| progressDir | down / neutral | up | Correct |
| Ring orange | >115% | <85% | Correct |
| PBar orange | >120% | <80% | Correct |
| dayHint | Texte PW | Texte GAIN | Correct mais peu visible |
| scoreLabels | "Très solide"→"À ajuster" | "Solide"→"Insuffisant" | Bon |
| bilanSummary | 4 textes PW | 4 textes GAIN | Bon |
| weekAlert | "Fruits en retard" | "Protéines/Calories" | Bon |
| eqFilterField | obj_pw | obj_mass | Correct |
| KPI direction | poids ↓ = vert | poids ↑ = vert | Correct |
| welcomeSubtitle | "Nutrition personnalisée" | "Performance nutritionnelle" (GAIN_LEAN) | Bien |

### 3.2 Ce qui NE change PAS et devrait

| Dimension manquante | Impact sur l'expérience |
|---------------------|------------------------|
| **Layout du dashboard** | PW et GAIN voient le même ring + macros. PW devrait voir un "budget restant" décroissant, GAIN devrait voir une jauge montante type "objectif du jour" |
| **Icône/illustration d'accueil** | Aucune illustration, aucun symbole visuel par objectif. Le patient PW et le patient GAIN ne ressentent aucune personnalisation visuelle |
| **Palette étendue** | Or et bleu seulement. Pas de dégradés différenciés, pas de couleurs secondaires par objectif |
| **Illustrations de vide** | Quand un slot est vide, même texte italic identique. PW pourrait dire "Rien encore — pas de souci", GAIN pourrait dire "Repas à compléter !" |
| **Onboarding** | Pas d'écran de bienvenue personnalisé par objectif |
| **Langage dans les modals** | Le modal AddModal dit les mêmes choses pour PW et GAIN |
| **Profil card** | Même card profile navy pour tous. PW pourrait avoir un gradient or, GAIN un gradient bleu |
| **Score/bilan visuel** | Même cercle coloré, mêmes textes. Pas de symboles différenciés |
| **Tab "Conseils"** | Mêmes sections pour tous. PW pourrait prioriser "gestion des extras", GAIN "atteindre ses cibles" |

### 3.3 Proposition — Identité visuelle par objectif

#### Palette étendue

```
PW (Perte de poids)
  Primary:     #C6A05B (or)
  Secondary:   #A88A45 (or foncé)
  Gradient:    linear-gradient(135deg, #C6A05B, #D4B878)
  Soft BG:     rgba(198,160,91,.06)
  Mood:        Contrôle, sérénité, cadre rassurant
  Icône:       Balance / Feuille d'or

MAINT (Maintien)
  Primary:     #C6A05B (or)
  Secondary:   #8B9B7A (vert sauge)
  Gradient:    linear-gradient(135deg, #C6A05B, #8B9B7A)
  Soft BG:     rgba(139,155,122,.06)
  Mood:        Stabilité, routine, confiance
  Icône:       Ancre / Cercle complet

GAIN_LEAN (Muscle sec)
  Primary:     #3B7BF6 (bleu)
  Secondary:   #2D5EC4 (bleu foncé)
  Gradient:    linear-gradient(135deg, #3B7BF6, #5B9CF6)
  Soft BG:     rgba(59,123,246,.06)
  Mood:        Force, construction, progression
  Icône:       Flèche montante / Haltère

GAIN_COMFORT (Confort)
  Primary:     #3B7BF6 (bleu)
  Secondary:   #6C8FBF (bleu doux)
  Gradient:    linear-gradient(135deg, #3B7BF6, #8EB5F6)
  Soft BG:     rgba(59,123,246,.04)
  Mood:        Douceur, soutien, bienveillance
  Icône:       Coeur / Main ouverte

GAIN_GUIDE (Guidé)
  Primary:     #3B7BF6 (bleu)
  Secondary:   #5B7FA6 (bleu gris)
  Gradient:    linear-gradient(135deg, #3B7BF6, #7BA3D4)
  Soft BG:     rgba(59,123,246,.05)
  Mood:        Accompagnement, pas-à-pas
  Icône:       Boussole / Étoile guide
```

#### Ajouter à objectiveConfig.js

```js
// Nouvelles propriétés par objectif :
gradient: 'linear-gradient(135deg, #C6A05B, #D4B878)',
secondaryColor: '#A88A45',
moodIcon: '⚖️',              // ou SVG custom
moodWord: 'Équilibre',
emptySlotMsg: "Rien encore ici — prends ton temps.",
profileGradient: 'linear-gradient(135deg, #0E1E2E, #1A2E30)',
dashboardLayout: 'budget',    // 'budget' | 'target' | 'stable'
```

### 3.4 Proposition — Dashboard adapté par objectif

#### PW : Layout "Budget restant" (progressDir === 'down')

```
┌────────────────────────────────┐
│  ⚖️  BUDGET DU JOUR           │
│                                │
│     ┌─────────┐               │
│     │  1817   │  restant      │
│     │  kcal   │               │
│     └─────────┘               │
│                                │
│  ▓▓▓▓▓▓▓░░░░░░  533 dépensé  │
│                  / 2350 kcal  │
│                                │
│  P 23/84   L 14/91   G 68/299│
└────────────────────────────────┘
```

- Ring inversé : part de 100% et se vide
- Couleur dominante = accent (or)
- Texte central = **restant** (pas le % consommé)
- Message sous le ring : "Il te reste de la marge" ou "Presque à ta cible"

#### GAIN_* : Layout "Objectif à atteindre" (progressDir === 'up')

```
┌────────────────────────────────┐
│  💪  OBJECTIF DU JOUR          │
│                                │
│     ┌─────────┐               │
│     │  23%    │  atteint      │
│     │         │               │
│     └─────────┘               │
│                                │
│  ▓▓▓░░░░░░░░░░  533 atteint  │
│                  / 2800 kcal  │
│                                │
│  P 23/120  L 14/95   G 68/380│
│                                │
│  ⚡ Encore 2267 kcal à        │
│     atteindre aujourd'hui     │
└────────────────────────────────┘
```

- Ring classique : part de 0% et se remplit
- Couleur dominante = bleu
- Texte central = **% atteint** (motivation ascendante)
- Message sous les macros : "Encore X kcal à atteindre" = call-to-action clair

#### MAINT : Layout "Zone stable"

```
┌────────────────────────────────┐
│  ⚓  CIBLE DU JOUR             │
│                                │
│     ┌─────────┐               │
│     │  23%    │  de ta cible  │
│     │         │               │
│     └─────────┘               │
│                                │
│  ▓▓▓░░░░░░░░░░  533 consommé │
│       zone OK : 90-110%       │
│                                │
│  P 23/84   L 14/91   G 68/299│
└────────────────────────────────┘
```

- Ring avec "zone cible" (bande 90-110% visible)
- Texte central = % atteint
- Accent sur la stabilité : "Tu es dans la zone" / "Pas encore dans la zone"

### 3.5 Proposition — Langage motivationnel

Chaque objectif mérite un vocabulaire distinct. Pas juste dans `dayHint` et `bilanSummary`, mais partout dans l'UI.

| Contexte UI | PW | MAINT | GAIN_LEAN |
|-------------|-----|-------|-----------|
| Splash subtitle | "Nutrition personnalisée" | "Ton équilibre au quotidien" | "Performance nutritionnelle" |
| Empty slot | "Rien encore — prends ton temps." | "Pas encore rempli — chaque jour compte." | "Repas manquant — atteins ta cible !" |
| Log success | "Ajouté avec succès" | "Ajouté avec succès" | "Bien joué — tu avances !" |
| Ring < 50% | "Bonne marge" | "Tu as de la place" | "Encore du chemin — continue !" |
| Ring 90-110% | "Presque à ta cible" | "Dans la zone !" | "Tu y es presque !" |
| Ring > 115% | "Tu dépasses ta cible" | "Au-dessus de ta zone" | "Objectif atteint !" |
| Score ≥ 85 | "Très solide — bravo" | "Très solide — bravo" | "Excellent — tu construis" |
| Score < 55 | "À ajuster — chaque semaine est une nouvelle occasion" | "À recentrer — la constance prime" | "Insuffisant — les muscles ont besoin de carburant" |
| HP education | "Logger l'honnêteté" | "Logger l'honnêteté" | "Pas de culpabilité — mais atteins ta cible d'abord" |

**Ajouter à `objectiveConfig.js`** :
```js
vocabulary: {
  emptySlot: "Rien encore — prends ton temps.",
  logSuccess: "Ajouté avec succès",
  ringLow: "Bonne marge",
  ringMid: "Presque à ta cible",
  ringHigh: "Tu dépasses ta cible",
},
```

### 3.6 Proposition — Profil card par objectif

Actuellement la `profile-card` utilise un gradient navy identique pour tous. Proposition :

```css
/* PW */
.profile-card--pw {
  background: linear-gradient(135deg, #0E1E2E 0%, #1A2E30 50%, #1E2E28 100%);
  /* Léger reflet doré dans le gradient */
}
.profile-card--pw::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198,160,91,.08) 0%, transparent 70%);
}

/* GAIN_LEAN */
.profile-card--gain-lean {
  background: linear-gradient(135deg, #0E1E2E 0%, #142338 50%, #1A2D4A 100%);
  /* Léger reflet bleu */
}
.profile-card--gain-lean::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59,123,246,.08) 0%, transparent 70%);
}
```

---

## 4. Audit du support des populations alimentaires

### 4.1 État actuel

**En base de données** (colonnes présentes dans `plan_equivalences` et `plan_items`) :
- `diet_omnivore` (bool)
- `diet_pescetarian` (bool)
- `diet_vegetarian` (bool)
- `gluten_free` (bool)
- `lactose_free` (bool)

**Dans l'app** : AUCUN de ces flags n'est utilisé dans l'UI.

- `transformPlanData.js` ne lit PAS `diet_*`, `gluten_free`, `lactose_free` des `plan_equivalences`
- `objectiveConfig.js` ne mentionne aucune population
- `elevia-prototype.jsx` n'affiche aucun badge, filtre ou mention de régime
- Le catalogue "Autres" filtre par `obj_pw`/`obj_mass` mais PAS par `diet_*` ou `*_free`

### 4.2 Impact

Un patient végétarien voit des suggestions de "Viandes maigres" et "Charcuteries maigres" dans son plan. Un patient sans gluten voit du "Pain gris" et des "Pâtes complètes" sans aucun avertissement.

C'est un problème de **confiance** : si l'app montre des aliments incompatibles avec le régime, le patient questionne la crédibilité de tout le plan.

### 4.3 Proposition — Badges alimentaires

#### Badges visuels sur les items

```
┌─────────────────────────────────────────┐
│ 🥩 Viandes maigres                      │
│     Blanc de dinde  ⭐                  │
│     [🥩] [🐟] [SANS GLUTEN]            │
│     6/7 sem.                            │
│     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  85%           │
└─────────────────────────────────────────┘

Badges proposés :
  🌱 Végétarien       → fond vert doux
  🐟 Pescovégétarien  → fond bleu doux
  🚫🌾 Sans gluten    → fond jaune doux
  🚫🥛 Sans lactose   → fond rose doux
```

**CSS** :
```css
.diet-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 99px;
}
.diet-badge--veg {
  background: rgba(52,199,89,.10);
  color: #1E8E3E;
}
.diet-badge--pesco {
  background: rgba(59,130,246,.10);
  color: #2D5EC4;
}
.diet-badge--gf {
  background: rgba(234,179,8,.10);
  color: #A16207;
}
.diet-badge--lf {
  background: rgba(244,114,182,.10);
  color: #BE185D;
}
```

#### Filtrage du catalogue "Autres"

Actuellement, le catalogue "Autres" dans `AddModal` filtre seulement par `obj_pw`/`obj_mass`. Il devrait AUSSI filtrer par régime alimentaire du patient.

**Modification dans `AddModal`** (pseudo-code) :
```js
// Ajouter au filtrage hpAll :
const clientDiet = d?.CLIENT?.dietFlags || {};
// Filtrer les EQ incompatibles
.filter(eq => {
  if (clientDiet.vegetarian && !eq.dietFlags?.diet_vegetarian) return false;
  if (clientDiet.glutenFree && !eq.dietFlags?.gluten_free) return false;
  if (clientDiet.lactoseFree && !eq.dietFlags?.lactose_free) return false;
  return true;
})
```

#### Messages adaptés

Quand le patient est végétarien, le `welcomeSubtitle` pourrait devenir :
- PW végétarien : "Nutrition végétarienne personnalisée"
- GAIN_LEAN végétarien : "Performance végétarienne"

Et les conseils prioritaires devraient inclure des tips spécifiques :
- Végétarien : "Combine légumineuses + céréales pour des protéines complètes"
- Sans gluten : "Privilégie le riz, quinoa, sarrasin"

### 4.4 Données requises dans transformPlanData

Pour que l'UI puisse afficher les badges et filtrer, `transformPlanData` doit extraire :

```js
// Dans CLIENT :
CLIENT.dietFlags = {
  omnivore: profile.diet_omnivore ?? true,
  pescetarian: profile.diet_pescetarian ?? false,
  vegetarian: profile.diet_vegetarian ?? false,
  glutenFree: profile.gluten_free ?? false,
  lactoseFree: profile.lactose_free ?? false,
};

// Dans chaque EQ du CATALOGUE :
dietFlags: {
  diet_vegetarian: eq.diet_vegetarian ?? true,
  diet_pescetarian: eq.diet_pescetarian ?? true,
  gluten_free: eq.gluten_free ?? true,
  lactose_free: eq.lactose_free ?? true,
},
```

---

## 5. Propositions concrètes

### 5.1 [P0] Refactor CSS custom properties par objectif

Actuellement les variables CSS sont injectées via `themeVars` dans le composant principal. C'est correct. Mais il faut étendre avec plus de propriétés :

**Fichier** : `objectiveConfig.js`
```js
// Ajouter à chaque objectif :
gradient: '...',
profileGradient: '...',
dashboardLayout: 'budget' | 'target' | 'stable',
secondaryColor: '...',
vocabulary: { ... },
moodEmoji: '...',
```

**Fichier** : `elevia-prototype.jsx`, section themeVars :
```js
const themeVars = useMemo(() => `
  :root {
    --accent: ${obj.accent};
    --accent-soft: ${obj.accentSoft};
    --accent-border: ${obj.accentBorder};
    --accent-border-strong: ${obj.accentBorderStrong};
    --accent-line: ${obj.accentLine};
    --accent-gradient: ${obj.gradient};
    --secondary: ${obj.secondaryColor};
    --profile-gradient: ${obj.profileGradient};
  }
`, [obj]);
```

### 5.2 [P0] Dashboard conditionnel

**Fichier** : `elevia-prototype.jsx`, dans `PlanTab`, remplacer la card kcal du jour :

```jsx
{/* Dashboard adapté */}
{obj.dashboardLayout === 'budget' ? (
  <BudgetDashboard dayNut={dayNut} targets={DAY_TARGETS} obj={obj} />
) : obj.dashboardLayout === 'target' ? (
  <TargetDashboard dayNut={dayNut} targets={DAY_TARGETS} obj={obj} />
) : (
  <StableDashboard dayNut={dayNut} targets={DAY_TARGETS} obj={obj} />
)}
```

Créer 3 composants dashboard distincts avec le layout décrit en section 3.4.

### 5.3 [P1] Touch targets — correction immédiate

```css
/* Avant */
.slot-add { width: 32px; height: 32px; }
.eq-add-btn { width: 30px; height: 30px; }
.stepper-btn { width: 40px; height: 40px; }
.seg-btn { padding: 8px 0; }
.modal-tab { padding: 8px; }

/* Après */
.slot-add { width: 44px; height: 44px; }
.eq-add-btn { width: 44px; height: 44px; font-size: 18px; }
.stepper-btn { width: 48px; height: 48px; }
.seg-btn { padding: 12px 0; min-height: 44px; }
.modal-tab { padding: 10px; min-height: 44px; }
```

### 5.4 [P1] Accessibilité couleurs

Remplacer toutes les occurrences de couleur accent en tant que texte par les variantes AA-compliant :

```js
// Dans objectiveConfig.js, ajouter :
PW: {
  accentText: '#9A7A3E',     // pour texte sur fond clair
  accentOnDark: '#D4B878',   // pour texte sur fond navy
},
GAIN_LEAN: {
  accentText: '#2D5EC4',
  accentOnDark: '#7BA3F6',
},
```

**Usage dans les composants** : utiliser `obj.accentText` pour les `.card-link`, `.alert-link`, badge-pri text, score labels, etc.

### 5.5 [P1] Badges population alimentaire

Voir section 4.3 pour le CSS complet. Implémenter dans cet ordre :
1. Ajouter `dietFlags` dans `transformPlanData` (CLIENT + chaque EQ)
2. Ajouter composant `<DietBadge flags={eq.dietFlags} />`
3. Afficher dans `AddModal` sur chaque eq-card
4. Filtrer "Autres" selon le profil patient
5. Ajouter message contextuel dans les conseils

### 5.6 [P1] Langage motivationnel étendu

Ajouter l'objet `vocabulary` dans `objectiveConfig.js` (cf. section 3.5) et l'utiliser dans :
- `PlanTab` : empty slot text, log success snackbar
- `AddModal` : HP education message
- `HistoryTab` : bilan detail messages
- `ProfileTab` : profile card subtitle

### 5.7 [P2] Ring kcal animé

Ajouter au SVG circle du ring :
```jsx
<circle
  /* ... existing props ... */
  style={{
    animation: 'ringFill 1.2s cubic-bezier(.4,0,.2,1)',
  }}
/>
```

Et dans le CSS :
```css
@keyframes ringFill {
  from { stroke-dasharray: 0 176; }
}
```

### 5.8 [P2] Notification badge sur tab "Conseils"

```jsx
// Dans la tab bar, pour l'onglet "advice" :
{t.id === 'advice' && unreadCount > 0 && (
  <span style={{
    position: 'absolute',
    top: 2, right: '50%',
    transform: 'translateX(14px)',
    width: 16, height: 16,
    borderRadius: 8,
    background: '#FF3B30',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>{unreadCount}</span>
)}
```

### 5.9 [P2] Splash screen par objectif

Le splash screen utilise déjà `obj.accent` pour le gradient orb et `obj.welcomeSubtitle`. Enrichir avec :

```jsx
// Ajouter un symbole/icône par objectif au centre du splash
<div style={{ fontSize: 32, marginBottom: 12 }}>
  {obj.moodEmoji}
</div>
```

Et varier le gradient de fond :
```js
// PW :  linear-gradient(160deg, #0A1620 0%, #0E1E2E 40%, #1A2820 100%)
// GAIN: linear-gradient(160deg, #0A1620 0%, #0E1E2E 40%, #142A48 100%)
```

### 5.10 [P2] Modal backdrop-filter

```css
/* Avant */
.overlay { background: rgba(0,0,0,.45); }

/* Après — glassmorphism comme la tab bar */
.overlay {
  background: rgba(0,0,0,.3);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
}
```

---

## 6. Plan d'action priorisé

### Phase 1 — P0 : Différenciation core (1-2 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| 1.1 | Ajouter `gradient`, `secondaryColor`, `dashboardLayout`, `vocabulary`, `moodEmoji`, `profileGradient` dans chaque objectif | `objectiveConfig.js` | 30 min |
| 1.2 | Étendre `themeVars` avec les nouvelles CSS custom properties | `elevia-prototype.jsx` | 15 min |
| 1.3 | Créer 3 layouts dashboard distincts (BudgetDashboard, TargetDashboard, StableDashboard) | `elevia-prototype.jsx` | 2h |
| 1.4 | Utiliser `obj.vocabulary.*` dans les textes dynamiques (empty slot, snackbar, ring label) | `elevia-prototype.jsx` | 1h |

### Phase 2 — P1 : Accessibilité + Touch + Populations (1-2 jours)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| 2.1 | Fix touch targets (44px minimum) | CSS dans `elevia-prototype.jsx` | 30 min |
| 2.2 | Ajouter `accentText` et `accentOnDark` à chaque objectif | `objectiveConfig.js` | 15 min |
| 2.3 | Remplacer couleur accent-as-text par `accentText` partout | `elevia-prototype.jsx` | 1h |
| 2.4 | Ajouter `dietFlags` dans `transformPlanData` (CLIENT + EQ) | `transformPlanData.js` | 45 min |
| 2.5 | Créer composant `DietBadge` et l'intégrer dans AddModal + WeekView | `elevia-prototype.jsx` | 1h |
| 2.6 | Filtrer catalogue "Autres" selon `dietFlags` du patient | `elevia-prototype.jsx` (AddModal) | 30 min |

### Phase 3 — P2 : Polish (1 jour)

| # | Action | Fichier | Effort |
|---|--------|---------|--------|
| 3.1 | Animation ring kcal | CSS | 15 min |
| 3.2 | Notification badge tab Conseils | `elevia-prototype.jsx` | 30 min |
| 3.3 | Splash screen différencié par objectif (gradient + emoji) | `elevia-prototype.jsx` | 30 min |
| 3.4 | Modal glassmorphism (backdrop-filter) | CSS | 10 min |
| 3.5 | Profile card gradient par objectif | CSS | 20 min |
| 3.6 | Échelle typographique + spacing en CSS variables | CSS | 1h |

### Phase 4 — Future (après MVP)

| # | Action | Notes |
|---|--------|-------|
| 4.1 | Dark mode complet | Requiert palette sombre inversée, toggle dans settings |
| 4.2 | Illustrations custom SVG par objectif | Designer requis |
| 4.3 | Onboarding différencié (3 écrans par objectif) | Copy + design + logic |
| 4.4 | Recettes filtrées par régime avec badges | Requiert table plan_recipes connectée |
| 4.5 | Transition animée entre onglets | Swipe gesture + CSS transitions |
| 4.6 | Messages contextuels intelligents (heure du jour, score semaine) | Logic + copy |

---

## Annexe A — Comparaison avec les concurrents

| Feature | Élevia (actuel) | Noom | Yazio | MyFitnessPal | Lifesum |
|---------|-----------------|------|-------|--------------|---------|
| Personnalisation visuelle par objectif | Couleur seulement | Fort (CBT-based journeys) | Faible | Aucune | Moyen |
| Support régimes alimentaires UI | Aucun | Faible | Moyen (filtres) | Fort (DB) | Moyen |
| Langage motivationnel adapté | Minimal | Fort | Faible | Aucun | Moyen |
| Dashboard adapté | Non | Oui | Non | Non | Oui |
| Badges alimentaires | Non | Non | Oui | Non | Oui |
| Touch targets conformes | Non | Oui | Oui | Oui | Oui |
| Accessibilité couleurs | Partiel | Moyen | Moyen | Moyen | Moyen |
| Design premium | Fort | Moyen | Moyen | Faible | Fort |

**Positionnement Élevia** : Le design premium (palette navy/or, typo Playfair, glassmorphism) est le principal différenciateur. C'est la direction à maintenir et renforcer. Les apps concurrentes sont soit utilitaires (MyFitnessPal), soit mass-market (Noom). Le créneau "premium diététicien" est quasiment vierge.

---

## Annexe B — Audit spécifique du LoginScreen

**Fichier** : `src/components/LoginScreen.jsx`

**Points forts** :
- Gradient navy cohérent avec l'app
- Orb radial subtil = premium
- Playfair Display italic pour "ÉLEVIA" = branding fort

**Lacunes** :
- `border: 1px solid rgba(198,160,91,.22)` sur fond sombre + `background: rgba(255,255,255,.06)` = champs de saisie presque invisibles
- Pas de gestion de l'objectif : le login screen est identique pour PW et GAIN. Ce n'est pas grave (pas encore de donnée), mais le texte "Nutrition personnalisée" pourrait varier si on connaît l'utilisateur (cookie/cache)
- Pas d'animation d'entrée des champs (fade-in staggeré améliorerait la perception premium)
- Le bouton "Se connecter" n'a pas d'effet press (`:active`) contrairement au reste de l'app

---

*Audit réalisé le 27 février 2026. Basé sur l'analyse du code source, la recherche UX en santé numérique, et les standards Apple HIG / WCAG 2.2 AA.*
