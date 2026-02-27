import { useState, useMemo, useCallback, useEffect, createContext, useContext } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
import { getObjectiveConfig, getScoreLabel, getBilanSummary } from "./src/lib/objectiveConfig.js";
import OnboardingOverlay from "./src/components/OnboardingOverlay.jsx";

/* ═══ DATA CONTEXT ═══ */
const DataCtx = createContext(null);
function useData() { return useContext(DataCtx); }
function useObjective() {
  const d = useData();
  const code = d?.CLIENT?.objectiveCode || 'PW';
  return useMemo(() => getObjectiveConfig(code), [code]);
}

/* ═══ INLINE SVG ICONS ═══ */
const IcCalendar=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M1.5 2.5h21c.55 0 1 .45 1 1v19c0 .55-.45 1-1 1h-21c-.55 0-1-.45-1-1v-19c0-.55.45-1 1-1z"/><path d="m5.5.5 0 5M18.5.5l0 5M.5 7.5h23M12 7.5v16M6 7.5v16M18 7.5v16M.5 15.5h23M.5 11.5h23M.5 19.5h23"/></svg>;
const IcBulb=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M15 17.24v2.72c0 1.42-1.2 2-3 2s-3-.58-3-2v-2.72"/><path d="M13 17.45v-6a1 1 0 1 1 1 1h-4a1 1 0 0 1 0-2 .95.95 0 0 1 1 1v6"/><path d="M14.5 17.45a6.34 6.34 0 0 0 4-6 6.62 6.62 0 0 0-6.5-6.5 6.62 6.62 0 0 0-6.5 6.5 6.34 6.34 0 0 0 4 6z"/><path d="m9 19.45 6 0M12 .55v1.9M12 21.95v1.5M1 10.45h2.29M3.59 3.05 5.5 4.95M23 10.45h-2.29M20.41 3.05 18.5 4.95"/></svg>;
const IcHistory=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="m13 7 0 5.5 5 0"/><path d="m.5 9 3 4.5 3.5-4"/><path d="M13 21.5A9.5 9.5 0 1 0 3.5 12v1.5"/></svg>;
const IcProfile=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><circle cx="12" cy="6.75" r="5.5"/><path d="M3 22.75a9 9 0 0 1 18 0z"/></svg>;
const IcTarget=({size=14,color="#C6A05B"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><circle cx="11.75" cy="11.75" r="7.83"/><path d="m11.75.98 0 5.87M.98 11.75h5.87M11.75 22.52v-5.87M22.52 11.75h-5.87"/></svg>;
const IcCheck=({size=12,color="#34C759"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="m23 .49-16.16 22.52-6.36-6.36"/></svg>;
const IcApple=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><path d="M12 22.5c1.5 0 .5 1 3.5 1s6-6 6-10-2.5-7-5.5-7-3 1-4 1-1-1-4-1-5.5 3-5.5 7 3 10 6 10 2-1 3.5-1z"/><path d="M12 7.5v-2a2 2 0 0 0-2-2H8"/><path d="M14.63 4.92a4.5 4.5 0 0 0 3.83-3.83.52.52 0 0 0-.59-.59 4.5 4.5 0 0 0-3.83 3.83.52.52 0 0 0 .58.58z"/></svg>;
const IcBread=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><path d="M4 7.24a3 3 0 0 0-.5 1.66V22.5a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1V8.91a3 3 0 0 0-.5-1.66l-.5-.75a3 3 0 0 0 0-6h-15a3 3 0 0 0 0 6z"/><path d="m6.9 13.4 4.5-4.5M8.29 17.67l7.42-7.42M12.56 19.06l4.5-4.5"/></svg>;
const IcBottle=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><path d="M15.5 4.5V1a.5.5 0 0 0-.5-.5H9a.5.5 0 0 0-.5.5v3.5c0 1-2 3.5-2 5.5v11.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V10c0-2-2-4.5-2-5.5z"/><path d="m8.5 3.5 7 0"/></svg>;
const IcAcorn=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><path d="M1.62 21.75c.05.14.14.28.25.38.11.11.24.19.38.25 7.38 2.77 12.25.11 17.11-4.76L6.38 4.64c-4.87 4.86-7.53 9.73-4.76 17.11z"/><path d="M23.18 3.11a1.08 1.08 0 0 0 0-1.53l-.76-.76a1.08 1.08 0 0 0-1.53 0l-2.34 2.34a8.5 8.5 0 0 0-6.32-2.12 8.5 8.5 0 0 0-6.2 2.45c-.17.16-.18.43-.02.6L19.74 18c.17.17.44.16.6-.01a8.5 8.5 0 0 0 2.45-6.2 8.5 8.5 0 0 0-2.12-6.32l2.34-2.34z"/></svg>;
const IcDrumstick=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M4.821 22.7a3.339 3.339 0 0 1-.673-2.795 3.428 3.428 0 0 1-2.848-.722c-2.493-2.493 1.381-6.367 4.076-2.7l3.015-3.073 2.122 2.121L7.5 18.606c3.69 2.673-.185 6.594-2.679 4.094Z"/><path d="m11.27 16.289-3.535-3.537c-1.891-1.89 6.435-17.678 13.813-10.3 7.43 7.428-8.628 15.486-10.278 13.837Z"/></svg>;
const IcCarrot=({size=18,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M20.56 10.47a32.7 32.7 0 0 0-3.24-3.79 32.7 32.7 0 0 0-3.79-3.24 1.58 1.58 0 0 0-2.1.4L.77 21.31a1.37 1.37 0 0 0 1.92 1.92l17.47-10.66a1.58 1.58 0 0 0 .4-2.1Z"/><path d="M15.89 5.34 17.83.5"/><path d="m18.66 8.11 4.84-1.94"/><path d="m17.32 6.68 4.52-4.52"/><path d="m10.42 5.5 4.03 4.04"/><path d="m11.11 12.15 3.69 3.69"/><path d="m8.19 16.53 2.08 2.07"/></svg>;
const IcStar=({size=14,color="#C6A05B"})=><svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><path d="M16.37 12.56a1.18 1.18 0 0 0 .3-1.38l-1.11-2.55a.24.24 0 0 1 .06-.28l2-1.94a1.19 1.19 0 0 0 .28-1.31 1.18 1.18 0 0 0-1.11-.72h-2.25a.25.25 0 0 1-.23-.15L13.1 1.57A1.22 1.22 0 0 0 12 .88a1.22 1.22 0 0 0-1.1.69L9.69 4.23a.25.25 0 0 1-.23.15H7.2a1.17 1.17 0 0 0-1.11.72 1.2 1.2 0 0 0 .29 1.32l2 1.93a.24.24 0 0 1 .06.28l-1.11 2.55a1.18 1.18 0 0 0 .3 1.38 1.22 1.22 0 0 0 1.43.16l2.82-1.59a.25.25 0 0 1 .24 0l2.82 1.59a1.21 1.21 0 0 0 1.43-.16z"/></svg>;

const IcMonoE=({size=16,color="#C6A05B",letter="É"})=><span style={{fontSize:size,fontWeight:700,fontStyle:"italic",color,fontFamily:"'Cormorant Garamond','Georgia','Times New Roman',serif",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{letter}</span>;

const IcInfoEq=({size=14,color="rgba(198,160,91,.5)"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><circle cx="11.75" cy="11.75" r="10.77"/><path d="M11.69 16.5v-6a.86.86 0 0 0-.25-.61.86.86 0 0 0-.61-.25h-.86"/><circle cx="11.26" cy="7.35" r=".43"/><path d="M9.97 16.5h3.55"/></svg>;
const IcInfo=({size=14,color="#3B82F6"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"><circle cx="11.75" cy="11.75" r="10.77"/><path d="M11.69 16.5v-6a.86.86 0 0 0-.25-.61.86.86 0 0 0-.61-.25h-.86"/><circle cx="11.26" cy="7.35" r=".43"/><path d="M9.97 16.5h3.55"/></svg>;
const IcLogo=({height=16})=><svg height={height} viewBox="70 125 250 100" fill="none"><g transform="translate(192,126)"><g fill="#f6f3ee"><g transform="translate(1.54,83.04)"><path d="M.63-48.84h10.89l11.51 37.19h.42l11.44-37.19h10.89L30.14.06H16.27z"/></g><g transform="translate(43.9,83.04)"><path d="M4.11-48.84h10.97V0H4.11z"/></g><g transform="translate(57.58,83.04)"><path d="M31.41-11.3H15.77L12.28 0H1.25l17.38-48.84h10.12L45.98 0H34.95zM28.75-19.61l-5.03-15.77h-.41l-4.89 15.77z"/></g></g></g><g transform="translate(78,142)"><g fill="#f6f3ee"><g transform="translate(1.29,77.92)"><path d="M20.56-33.45c2.84 0 5.23-.17 7.16-.52 1.93-.34 3.46-.88 4.59-1.62 1.14-.74 1.96-1.69 2.45-2.85.5-1.15.75-2.52.75-4.11h2.77v21.59h-2.77c0-1.58-.22-2.95-.67-4.11-.45-1.16-1.24-2.13-2.38-2.89-1.13-.77-2.66-1.35-4.59-1.75-1.92-.39-4.36-.59-7.31-.59v17.88c0 1.74.21 3.18.63 4.31.42 1.14 1.15 2.07 2.19 2.78 1.03.71 2.38 1.21 4.06 1.5 1.69.28 3.77.42 6.25.42 2.8 0 5.18-.2 7.13-.59 1.94-.39 3.58-1.07 4.89-2.02 1.32-.94 2.38-2.2 3.17-3.75.79-1.55 1.45-3.49 1.98-5.81h3l-1.19 15.58H3.56v-3c1.85-.05 3.33-.21 4.47-.47 1.13-.27 2.02-.72 2.64-1.36.63-.63 1.06-1.53 1.27-2.69.22-1.16.33-2.66.33-4.5v-36.86c0-1.84-.09-3.33-.28-4.47-.19-1.13-.56-2.03-1.11-2.69-.55-.66-1.36-1.11-2.42-1.34-1.05-.24-2.42-.41-4.11-.52v-3.02h45.72l.72 13.92h-2.77c-.32-2.1-.84-3.83-1.55-5.17-.71-1.34-1.68-2.41-2.92-3.2-1.24-.79-2.81-1.34-4.72-1.66-1.9-.32-4.19-.48-6.87-.48h-10.05c-.9 0-1.34.45-1.34 1.34z"/></g><g transform="translate(53.17,77.92)"><path d="M16.53-12.34c0 2.01.08 3.62.24 4.84.15 1.21.48 2.16.98 2.84.51.68 1.22 1.15 2.14 1.42.93.26 2.15.42 3.67.47v2.77H1.73v-2.77c1.58-.05 2.85-.22 3.8-.52.94-.29 1.69-.75 2.25-1.37.56-.63.93-1.52 1.11-2.66.19-1.13.28-2.62.28-4.47v-34.09c0-2.84-.04-5.23-.13-7.16-.07-1.93-.18-3.24-.34-3.92-.26-1.21-.88-2.03-1.86-2.44-.98-.43-2.73-.64-5.26-.64v-2.69l14.95-2.92z"/></g><g transform="translate(73.34,77.92)"><path d="M41.28-7.36c-4.48 5.44-10.04 8.16-16.69 8.16-3.1 0-5.92-.52-8.45-1.55-2.53-1.03-4.71-2.48-6.53-4.34-1.82-1.88-3.23-4.12-4.23-6.72s-1.5-5.5-1.5-8.67c0-3.22.52-6.2 1.58-8.94 1.06-2.74 2.55-5.08 4.47-7.03 1.93-1.96 4.22-3.49 6.88-4.59 2.66-1.1 5.58-1.66 8.75-1.66 5.11 0 9.07 1.39 11.86 4.16 2.8 2.76 4.2 6.72 4.2 11.89 0 .74-.15 1.19-.44 1.34-.29.16-.96.24-2.01.24H13.13c-.11.43-.19.95-.24 1.55-.05.6-.08 1.28-.08 2.01 0 2.74.33 5.23.98 7.48.67 2.24 1.62 4.15 2.86 5.74 1.24 1.57 2.71 2.8 4.42 3.67 1.72.87 3.63 1.3 5.74 1.3 2.22 0 4.27-.48 6.17-1.45 1.89-.98 3.84-2.58 5.84-4.8zM28.23-28.72c1.05 0 1.89-.02 2.53-.08.63-.05 1.11-.16 1.42-.31.32-.16.54-.38.64-.67.1-.29.16-.67.16-1.14 0-2.43-.78-4.37-2.34-5.81-1.55-1.46-3.67-2.19-6.36-2.19-5.7 0-9.23 3.4-10.59 10.21z"/></g></g></g></svg>;

const B = {
  navy: "#121E2D", gold: "#C6A05B", goldSoft: "rgba(198,160,91,.12)",
  goldBorder: "rgba(198,160,91,.22)", goldBorderStrong: "rgba(198,160,91,.34)",
  goldLine: "rgba(198,160,91,.55)", ivory: "#F5F4F1", white: "#FFFFFF",
  text: "#1A1A1A", textMuted: "#6B7280", textFaint: "rgba(15,30,46,.50)",
  hairline: "rgba(15,30,46,.10)", border: "#E5E7EB",
  orange: "#E8863A", orangeLight: "rgba(232,134,58,.12)",
  green: "#34C759", greenSoft: "rgba(52,199,89,.12)",
  red: "#FF3B30", blue: "#3B82F6", blueSoft: "rgba(59,130,246,.1)",
};

/* Muted secondary color — no aggressive blue */
const SEC_COLOR = "#6B8299"; // desaturated navy-blue
const SEC_BG = "rgba(107,130,153,.1)";

/* ═══ HARDCODED DEFAULTS (used as fallback when no planData) ═══ */
const DEFAULT_CLIENT = { firstName: "Dupont", programme: "Perte de poids", heightCm: 178 };
const DEFAULT_WEEK_TARGETS = { kcal: 16450, p: 588, l: 637, g: 2093 };
const DEFAULT_DAY_TARGETS = { kcal: 2350, p: 84, l: 91, g: 299 };
const DEFAULT_SLOTS = [
  { id: "breakfast", label: "Petit-déjeuner", time: "7h30" },
  { id: "snack1", label: "Collation matin", time: "10h" },
  { id: "coldMeal", label: "Midi — Repas froid", time: "12h30" },
  { id: "snack2", label: "Collation après-midi", time: "16h" },
  { id: "hotMeal", label: "Soir — Repas chaud", time: "19h30" },
];
const DEFAULT_SLOT_ALLOWED = {
  breakfast: ["pain","fruits_natures","pl_0_riche_p","garnitures_sucrees_pain","cereales_ig_modere","mg_tartinables"],
  snack1: ["fruits_natures","oleagineux_nature"],
  coldMeal: ["pain","viandes_faibles_kcal","legumes_crus","assaisonnement_repas_froid","fromages_20_30_mg","charcuteries_maigres"],
  snack2: ["fruits_natures","pl_50_100_kcal","oleagineux_nature","chocolat_noir_mt70"],
  hotMeal: ["feculents_chauds","viandes_faibles_kcal","poissons_maigres","legumes_cuits","assaisonnement_repas_chaud","mg_cuisson"],
};

const DEFAULT_CATALOGUE = [
  { eqId:"pain",label:"Pain",eqMode:"R",type:"carbs",eqGroupId:"carbs_group",eqImportance:"normal",icon:"🍞",
    nutrientsPerPortion:{kcal:90,p:3.1,l:1.0,g:16.7},qtyPlanGrams:105,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},
    noteElevia:"Le pain est un féculent. Privilégie les versions complètes.",
    items:[
      {itemId:"pain_gris",foodLabel:"Pain gris",isRecommended:true,stepper:{usualGPerUnit:35,usualUnitSg:"tranche",usualUnitPl:"tranches",unitStep:1,defaultUnits:3,minUnits:0,maxUnits:8},nutrientsPerUnit:{kcal:30,p:1.03,l:0.33,g:5.57}},
      {itemId:"pain_complet",foodLabel:"Pain complet",isRecommended:true,stepper:{usualGPerUnit:35,usualUnitSg:"tranche",usualUnitPl:"tranches",unitStep:1,defaultUnits:3,minUnits:0,maxUnits:8},nutrientsPerUnit:{kcal:31.5,p:1.17,l:0.35,g:5.67}},
      {itemId:"baguette_grise",foodLabel:"Baguette grise",isRecommended:false,stepper:{usualGPerUnit:40,usualUnitSg:"tronçon",usualUnitPl:"tronçons",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6},nutrientsPerUnit:{kcal:34.3,p:1.18,l:0.38,g:6.38}},
    ]},
  { eqId:"cereales_ig_modere",label:"Céréales IG modéré",eqMode:"R",type:"carbs",eqGroupId:"carbs_group",eqImportance:"normal",icon:"🥣",
    nutrientsPerPortion:{kcal:95,p:3.5,l:1.2,g:17},qtyPlanGrams:40,
    qtyUi:{appInputMode:"ITEM_SPOON_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},
    noteElevia:"Choisis des céréales avec un index glycémique modéré.",
    items:[{itemId:"flocons_avoine",foodLabel:"Flocons d'avoine",isRecommended:true,stepper:{usualGPerUnit:10,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:4,minUnits:0,maxUnits:10},nutrientsPerUnit:{kcal:23.8,p:0.88,l:0.30,g:4.25}}]},
  { eqId:"feculents_chauds",label:"Féculents chauds",eqMode:"R",type:"carbs",eqGroupId:"carbs_group",eqImportance:"normal",icon:"🍚",
    nutrientsPerPortion:{kcal:130,p:3,l:0.5,g:28},qtyPlanGrams:200,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},
    noteElevia:"Les féculents sont la base énergétique de ton repas chaud.",
    items:[
      {itemId:"riz_basmati",foodLabel:"Riz basmati (cuit)",isRecommended:true,stepper:{usualGPerUnit:50,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:4,minUnits:0,maxUnits:10},nutrientsPerUnit:{kcal:32.5,p:0.75,l:0.13,g:7}},
      {itemId:"pdt_vapeur",foodLabel:"Pommes de terre vapeur",isRecommended:true,stepper:{usualGPerUnit:80,usualUnitSg:"pdt",usualUnitPl:"pdt",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6},nutrientsPerUnit:{kcal:52,p:1.2,l:0.2,g:11.2}},
      {itemId:"pates_completes",foodLabel:"Pâtes complètes (cuites)",isRecommended:true,stepper:{usualGPerUnit:50,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:4,minUnits:0,maxUnits:10},nutrientsPerUnit:{kcal:32.5,p:0.75,l:0.13,g:7}},
    ]},
  { eqId:"fruits_natures",label:"Fruits natures",eqMode:"R",type:"fruits",eqGroupId:"fruit_group",eqImportance:"key",icon:"🍎",
    nutrientsPerPortion:{kcal:89,p:1.9,l:0.1,g:18},qtyPlanGrams:150,
    qtyUi:{appInputMode:"ITEM_FIRST_PICK",showItemListDefault:true,defaultAction:"PICK_ITEM",showGramFallback:false},
    noteElevia:"Les fruits apportent vitamines, fibres et hydratation. Varie les choix !",
    items:[
      {itemId:"banane",foodLabel:"Banane",isRecommended:true,stepper:{usualGPerUnit:100,usualUnitSg:"banane",usualUnitPl:"bananes",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:5},nutrientsPerUnit:{kcal:89,p:1.9,l:0.1,g:18}},
      {itemId:"pomme",foodLabel:"Pomme",isRecommended:true,stepper:{usualGPerUnit:180,usualUnitSg:"pomme",usualUnitPl:"pommes",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4},nutrientsPerUnit:{kcal:72,p:0.4,l:0.2,g:15}},
      {itemId:"clementine",foodLabel:"Clémentine",isRecommended:true,stepper:{usualGPerUnit:80,usualUnitSg:"clémentine",usualUnitPl:"clémentines",unitStep:1,defaultUnits:3,minUnits:0,maxUnits:8},nutrientsPerUnit:{kcal:29.7,p:0.63,l:0.03,g:6}},
      {itemId:"kiwi",foodLabel:"Kiwi",isRecommended:false,stepper:{usualGPerUnit:70,usualUnitSg:"kiwi",usualUnitPl:"kiwis",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6},nutrientsPerUnit:{kcal:42,p:0.7,l:0.1,g:9}},
    ]},
  { eqId:"legumes_cuits",label:"Légumes cuits",eqMode:"F",type:"veg",eqGroupId:"veg_group",eqImportance:"key",icon:"🥦",
    nutrientsPerPortion:{kcal:29,p:1.7,l:0.1,g:4},qtyPlanGrams:200,
    qtyUi:{appInputMode:"COMPLETION_ONLY",showItemListDefault:false,defaultAction:"LOG_COMPLETION",showGramFallback:false},
    noteElevia:"Légumes cuits à volonté !",items:[]},
  { eqId:"legumes_crus",label:"Légumes crus",eqMode:"F",type:"veg",eqGroupId:"veg_group",eqImportance:"key",icon:"🥕",
    nutrientsPerPortion:{kcal:22,p:1.2,l:0.1,g:3.8},qtyPlanGrams:150,
    qtyUi:{appInputMode:"COMPLETION_ONLY",showItemListDefault:false,defaultAction:"LOG_COMPLETION",showGramFallback:false},
    noteElevia:"Les crudités en début de repas ralentissent l'absorption du sucre.",items:[]},
  { eqId:"viandes_faibles_kcal",label:"Viandes maigres",eqMode:"F",type:"vvpo",eqGroupId:"protein_group",eqImportance:"key",icon:"🥩",
    nutrientsPerPortion:{kcal:110,p:21.5,l:2.5,g:0.1},qtyPlanGrams:150,
    qtyUi:{appInputMode:"PORTION_TAP",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true,portionStep:0.25,portionMin:0.25,portionMax:4},
    noteElevia:"Les protéines maigres sont essentielles pour ta composition corporelle.",
    items:[{itemId:"blanc_dinde",foodLabel:"Blanc de dinde",isRecommended:true,stepper:null,nutrientsPerUnit:null},{itemId:"blanc_poulet",foodLabel:"Blanc de poulet",isRecommended:true,stepper:null,nutrientsPerUnit:null}]},
  { eqId:"poissons_maigres",label:"Poissons maigres",eqMode:"F",type:"vvpo",eqGroupId:"protein_group",eqImportance:"key",icon:"🐟",
    nutrientsPerPortion:{kcal:95,p:20,l:1.5,g:0},qtyPlanGrams:150,
    qtyUi:{appInputMode:"PORTION_TAP",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true,portionStep:0.25,portionMin:0.25,portionMax:4},
    noteElevia:"Le poisson apporte des oméga-3.",items:[{itemId:"cabillaud",foodLabel:"Cabillaud",isRecommended:true,stepper:null,nutrientsPerUnit:null}]},
  { eqId:"oleagineux_nature",label:"Oléagineux",eqMode:"R",type:"fat",eqGroupId:"fat_group",eqImportance:"normal",icon:"🥜",
    nutrientsPerPortion:{kcal:90,p:3,l:7,g:2},qtyPlanGrams:15,
    qtyUi:{appInputMode:"ITEM_FIRST_PICK",showItemListDefault:true,defaultAction:"PICK_ITEM",showGramFallback:false},
    noteElevia:"Bonnes graisses, mais en quantité mesurée.",
    items:[
      {itemId:"amandes",foodLabel:"Amandes",isRecommended:true,stepper:{usualGPerUnit:1.2,usualUnitSg:"amande",usualUnitPl:"amandes",unitStep:1,defaultUnits:13,minUnits:0,maxUnits:30},nutrientsPerUnit:{kcal:7,p:0.23,l:0.54,g:0.15}},
      {itemId:"noix",foodLabel:"Noix",isRecommended:true,stepper:{usualGPerUnit:4,usualUnitSg:"noix",usualUnitPl:"noix",unitStep:1,defaultUnits:4,minUnits:0,maxUnits:12},nutrientsPerUnit:{kcal:26,p:0.6,l:2.6,g:0.3}},
    ]},
  { eqId:"pl_0_riche_p",label:"PL faibles en kcal",eqMode:"R",type:"dairy",eqGroupId:"dairy_group",eqImportance:"normal",icon:"🥛",
    nutrientsPerPortion:{kcal:55,p:10,l:0.2,g:3.5},qtyPlanGrams:125,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},
    noteElevia:"Source de protéines et calcium.",
    items:[{itemId:"yaourt_grec_0",foodLabel:"Yaourt grec 0%",isRecommended:true,stepper:{usualGPerUnit:125,usualUnitSg:"pot",usualUnitPl:"pots",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4},nutrientsPerUnit:{kcal:55,p:10,l:0.2,g:3.5}}]},
  { eqId:"pl_50_100_kcal",label:"PL 50–100 kcal",eqMode:"R",type:"dairy",eqGroupId:"dairy_group",eqImportance:"normal",icon:"🧁",
    nutrientsPerPortion:{kcal:75,p:4,l:2,g:10},qtyPlanGrams:125,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},noteElevia:"PL au goûter.",items:[]},
  { eqId:"fromages_20_30_mg",label:"Fromages 20–30%MG",eqMode:"R",type:"dairy",eqGroupId:"dairy_group",eqImportance:"normal",icon:"🧀",
    nutrientsPerPortion:{kcal:80,p:7,l:5.5,g:0.5},qtyPlanGrams:30,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},noteElevia:"Fromages allégés.",items:[]},
  { eqId:"assaisonnement_repas_froid",label:"Assaisonnement froid",eqMode:"F",type:"fat",eqGroupId:"fat_group",eqImportance:"flex",icon:"🫒",
    nutrientsPerPortion:{kcal:45,p:0.1,l:5,g:0.2},qtyPlanGrams:5,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Vinaigrette maison.",items:[]},
  { eqId:"assaisonnement_repas_chaud",label:"Assaisonnement chaud",eqMode:"F",type:"fat",eqGroupId:"fat_group",eqImportance:"flex",icon:"🧈",
    nutrientsPerPortion:{kcal:45,p:0,l:5,g:0},qtyPlanGrams:5,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Noisette de beurre ou huile.",items:[]},
  { eqId:"mg_cuisson",label:"MG cuisson",eqMode:"F",type:"fat",eqGroupId:"fat_group",eqImportance:"flex",icon:"🍳",
    nutrientsPerPortion:{kcal:45,p:0,l:5,g:0},qtyPlanGrams:5,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"MG cuisson.",items:[]},
  { eqId:"mg_tartinables",label:"MG tartinables",eqMode:"F",type:"fat",eqGroupId:"fat_group",eqImportance:"flex",icon:"🧈",
    nutrientsPerPortion:{kcal:36,p:0,l:4,g:0},qtyPlanGrams:5,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Beurre en couche fine.",items:[]},
  { eqId:"garnitures_sucrees_pain",label:"Garnitures sucrées",eqMode:"R",type:"carbs",eqGroupId:null,eqImportance:"flex",icon:"🍯",
    nutrientsPerPortion:{kcal:40,p:0.1,l:0,g:10},qtyPlanGrams:15,
    qtyUi:{appInputMode:"ITEM_SPOON_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Confiture, miel.",items:[]},
  { eqId:"chocolat_noir_mt70",label:"Chocolat noir ≥70%",eqMode:"R",type:"extras",eqGroupId:null,eqImportance:"flex",icon:"🍫",
    nutrientsPerPortion:{kcal:55,p:0.8,l:3.5,g:4},qtyPlanGrams:10,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"2 carrés = 1 portion.",
    items:[{itemId:"choco_noir_70",foodLabel:"Chocolat noir 70%",isRecommended:true,stepper:{usualGPerUnit:5,usualUnitSg:"carré",usualUnitPl:"carrés",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6},nutrientsPerUnit:{kcal:27.5,p:0.4,l:1.75,g:2}}]},
  { eqId:"charcuteries_maigres",label:"Charcuteries maigres",eqMode:"F",type:"vvpo",eqGroupId:"protein_group",eqImportance:"normal",icon:"🥓",
    nutrientsPerPortion:{kcal:70,p:12,l:2.5,g:0.5},qtyPlanGrams:50,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},noteElevia:"Jambon blanc, filet de dinde.",items:[]},
  // Hors plan extras
  { eqId:"alcool_leger_1u",label:"Alcool léger",eqMode:"R",type:"drinks",eqGroupId:null,eqImportance:"flex",icon:"🍷",
    nutrientsPerPortion:{kcal:85,p:0,l:0,g:0.8},qtyPlanGrams:150,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"1 verre de vin = 1 unité. Modération.",
    items:[{itemId:"vin_rouge",foodLabel:"Vin rouge",isRecommended:false,stepper:{usualGPerUnit:150,usualUnitSg:"verre",usualUnitPl:"verres",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4},nutrientsPerUnit:{kcal:85,p:0,l:0,g:0.8}}]},
  { eqId:"extras_except_patisserie",label:"Extras",eqMode:"R",type:"extras",eqGroupId:null,eqImportance:"flex",icon:"🍪",
    nutrientsPerPortion:{kcal:120,p:1.5,l:5,g:16},qtyPlanGrams:30,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},noteElevia:"Biscuits, chips — logge pour garder un suivi honnête.",
    items:[{itemId:"chips",foodLabel:"Chips",isRecommended:false,stepper:{usualGPerUnit:30,usualUnitSg:"poignée",usualUnitPl:"poignées",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:5},nutrientsPerUnit:{kcal:160,p:2,l:10,g:15}}]},
  { eqId:"patisserie",label:"Pâtisserie",eqMode:"R",type:"extras",eqGroupId:null,eqImportance:"flex",icon:"🎂",
    nutrientsPerPortion:{kcal:250,p:3,l:12,g:30},qtyPlanGrams:80,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:true},noteElevia:"Plaisir — logge pour la transparence.",
    items:[{itemId:"croissant",foodLabel:"Croissant",isRecommended:false,stepper:{usualGPerUnit:60,usualUnitSg:"croissant",usualUnitPl:"croissants",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4},nutrientsPerUnit:{kcal:230,p:4.5,l:12,g:25}}]},
];

const DEFAULT_PLAN_TARGETS = {
  pain:14,cereales_ig_modere:3,feculents_chauds:14,fruits_natures:14,legumes_cuits:14,legumes_crus:14,
  viandes_faibles_kcal:7,poissons_maigres:3,oleagineux_nature:7,pl_0_riche_p:7,pl_50_100_kcal:3,
  fromages_20_30_mg:7,assaisonnement_repas_froid:14,assaisonnement_repas_chaud:14,
  mg_cuisson:7,mg_tartinables:7,garnitures_sucrees_pain:7,chocolat_noir_mt70:3,charcuteries_maigres:3,
};

const DEFAULT_WEEK_CONSUMED = {pain:10,cereales_ig_modere:2,feculents_chauds:12,fruits_natures:8,legumes_cuits:14,legumes_crus:11,viandes_faibles_kcal:6,poissons_maigres:2,oleagineux_nature:5,pl_0_riche_p:7,pl_50_100_kcal:2,fromages_20_30_mg:5,assaisonnement_repas_froid:13,assaisonnement_repas_chaud:12,mg_cuisson:5,mg_tartinables:6,garnitures_sucrees_pain:6,chocolat_noir_mt70:2,charcuteries_maigres:2};

const DEFAULT_ADVICES = [
  {id:"adv_01",module:"alcohol",title:"Réduire l'alcool",axis:"priority",priorityScore:85,
    shortBody:"L'alcool freine ta perte de poids. On vise max 5 verres/sem.",
    body:"Si on inclut l'alcool dans ton plan, c'est pour que tu puisses en profiter sans culpabilité — mais avec un cadre clair. L'alcool apporte des calories vides (7 kcal/g) qui ralentissent directement la perte de graisse. Ton foie priorise l'élimination de l'alcool avant de brûler les graisses. Chaque verre retarde ce processus de plusieurs heures.",
    summaryObjective:"Ramener à max 5 verres/sem.",summaryBullets:["Supprime les verres en semaine.","Privilégie la qualité.","Remplace par du thé le soir."],summaryTip:"Un thé chaud le soir remplace l'envie d'un verre.",linkedAlertTypes:["surplus_kcal"]},
  {id:"adv_02",module:"hydration",title:"Hydratation insuffisante",axis:"priority",priorityScore:78,
    shortBody:"Tu bois moins d'1L/jour. L'hydratation aide la satiété et l'énergie.",
    body:"L'eau est ton allié n°1 et le plus sous-estimé. Une déshydratation même légère (1-2%) réduit tes performances cognitives de 10-15%, augmente la fatigue et — surtout — mime la faim. Ton cerveau confond souvent soif et faim. Boire 1,5L minimum par jour aide à réguler l'appétit naturellement, améliore ta digestion et optimise le métabolisme des graisses.",
    summaryObjective:"Boire au moins 1,5L d'eau/jour.",summaryBullets:["Grand verre d'eau au réveil.","Bouteille visible toute la journée.","Citron ou menthe pour varier."],summaryTip:"Un verre avant chaque repas = 750ml.",linkedAlertTypes:[]},
  {id:"adv_03",module:"protein",title:"Manger assez de protéines",axis:"priority",priorityScore:92,
    shortBody:"Tes protéines sont souvent en dessous de ta cible. Essentiel pour garder ta masse musculaire.",
    body:"Les protéines sont le macro le plus important en perte de poids. Elles préservent ta masse musculaire (ce qui maintient ton métabolisme élevé), augmentent la satiété plus que tout autre nutriment, et ont l'effet thermique le plus élevé : ton corps dépense 20-30% des calories protéiques juste pour les digérer. Sans assez de protéines, tu perds du muscle en même temps que du gras, ce qui ralentit ta progression.",
    summaryObjective:"Atteindre ta cible protéines chaque jour.",summaryBullets:["1 source protéine à chaque repas.","Favorise les maigres.","PL 0% ou oeuf en snack."],summaryTip:"Un oeuf ou yaourt grec en snack aide beaucoup.",linkedAlertTypes:["deficit_protein"]},
  {id:"adv_04",module:"coffee",title:"Limiter le sucre dans le café",axis:"secondary",priorityScore:45,
    shortBody:"3 cafés sucrés/jour = ~60 kcal cachées. On réduit progressivement.",
    body:"Chaque sucre dans ton café ajoute ~20 kcal. Ça paraît peu, mais 3 cafés × 1 sucre × 7 jours = 420 kcal/sem — l'équivalent d'un repas entier. Le sevrage du sucre dans le café prend environ 2-3 semaines. Après, ton palais s'adapte et tu trouveras le café sucré trop sucré. La cannelle ou la vanille peuvent aider la transition.",
    summaryObjective:"Réduire puis supprimer le sucre.",summaryBullets:["Réduis d'un demi-sucre/sem.","Essaie cannelle ou vanille.","Café nature en 3 sem."],summaryTip:"Après 2 sem sans sucre, le goût change.",linkedAlertTypes:[]},
  {id:"adv_05",module:"lunch",title:"Mode lunch : sandwich",axis:"secondary",priorityScore:38,
    shortBody:"Ton sandwich peut être un repas parfait s'il est bien structuré.",
    body:"Beaucoup de gens pensent que le sandwich est un mauvais choix diététique. C'est faux — tout dépend de la structure. Un sandwich bien construit (pain complet + protéine maigre + crudités + assaisonnement léger) couvre exactement les mêmes besoins qu'un repas classique. L'erreur courante est d'ajouter trop de sauce commerce (mayonnaise = 80 kcal/càs) ou de négliger les légumes.",
    summaryObjective:"Structurer ton sandwich.",summaryBullets:["Pain complet + protéine + crudités.","Évite sauces commerce.","Ajoute un fruit."],summaryTip:"Un bon sandwich = repas parfait.",linkedAlertTypes:[]},
  {id:"adv_06",module:"rawveg",title:"Crudités au déjeuner",axis:"secondary",priorityScore:30,
    shortBody:"Les crudités en début de repas freinent l'absorption du sucre.",
    body:"Commencer un repas par des crudités active la satiété mécanique (volume dans l'estomac) et ralentit l'absorption des glucides qui suivent, ce qui stabilise ta glycémie. Des études montrent qu'une entrée de crudités réduit la prise calorique totale du repas de 10-15%. Même 3-4 bouchées comptent. Le plus dur c'est l'habitude — pas l'effort.",
    summaryObjective:"Ajouter crudités au déjeuner.",summaryBullets:["Prépare la veille.","Tomates cerises ou carottes.","Quelques bouchées comptent."],summaryTip:"Tomates cerises en tupperware = 30 sec.",linkedAlertTypes:[]},
];

const DEFAULT_MICRO_TIPS = [
  {tipId:"tip_01",category:"nutrition",textFr:"Les fibres ralentissent l'absorption du sucre. Commence ton repas par les légumes."},
  {tipId:"tip_02",category:"hydratation",textFr:"Un verre d'eau avant chaque repas aide à mieux écouter ta faim."},
  {tipId:"tip_03",category:"sommeil",textFr:"Dormir moins de 7h augmente la faim et les envies sucrées le lendemain."},
  {tipId:"tip_04",category:"astuces",textFr:"Prépare tes légumes du lendemain en même temps que ceux du jour."},
  {tipId:"tip_05",category:"activite",textFr:"Une marche de 20 min après le repas stabilise la glycémie."},
  {tipId:"tip_06",category:"stress",textFr:"Le stress augmente le cortisol. Respire 5 min, ça aide."},
];

const DEFAULT_BILANS = [
  {week:"S8",dates:"17–23 fév",score:78,label:"Solide"},
  {week:"S7",dates:"10–16 fév",score:72,label:"Solide"},
  {week:"S6",dates:"3–9 fév",score:65,label:"Correct"},
  {week:"S5",dates:"27 jan–2 fév",score:82,label:"Très solide"},
  {week:"S4",dates:"20–26 jan",score:58,label:"Correct"},
  {week:"S3",dates:"13–19 jan",score:45,label:"À ajuster"},
];

const DEFAULT_MEASUREMENTS = [
  {date:"2026-02-23",weightKg:84.8,waistCm:91.5,bodyFatPct:22.8},
  {date:"2026-02-16",weightKg:85.2,waistCm:92.0,bodyFatPct:23.0},
  {date:"2026-02-09",weightKg:85.9,waistCm:92.8,bodyFatPct:23.4},
  {date:"2026-02-02",weightKg:86.3,waistCm:93.2,bodyFatPct:23.6},
  {date:"2026-01-26",weightKg:86.8,waistCm:93.8,bodyFatPct:23.9},
  {date:"2026-01-12",weightKg:88.0,waistCm:95.0,bodyFatPct:24.5},
];

const DEFAULT_PROFILE_TEXT = "Ton plan est basé sur ton objectif de perte de poids progressive. Il est conçu pour perdre 0.5–1 kg/semaine sans frustration. Les portions sont calculées spécifiquement pour toi. Fais confiance au cadre : la constance est plus importante que la perfection.";

const DEFAULT_INITIAL_LOGS = [
  {id:"l1",slotId:"breakfast",eqId:"pain",itemId:"pain_gris",nbUnits:3,qtyPortion:1,isOutOfPlan:false,kcal:90,p:3.1,l:1.0,g:16.7},
  {id:"l3",slotId:"breakfast",eqId:"pl_0_riche_p",itemId:"yaourt_grec_0",nbUnits:1,qtyPortion:1,isOutOfPlan:false,kcal:55,p:10,l:0.2,g:3.5},
  {id:"l2",slotId:"breakfast",eqId:"fruits_natures",itemId:"pomme",nbUnits:1,qtyPortion:1,isOutOfPlan:false,kcal:72,p:0.4,l:0.2,g:15},
  {id:"l8",slotId:"snack1",eqId:"oleagineux_nature",itemId:"amandes",nbUnits:13,qtyPortion:1,isOutOfPlan:false,kcal:90,p:3,l:7,g:2},
  {id:"l5",slotId:"coldMeal",eqId:"pain",itemId:"pain_complet",nbUnits:3,qtyPortion:1,isOutOfPlan:false,kcal:95,p:3.5,l:1.2,g:17},
  {id:"l6",slotId:"coldMeal",eqId:"viandes_faibles_kcal",itemId:"blanc_dinde",nbUnits:null,qtyPortion:1,isOutOfPlan:false,kcal:110,p:21.5,l:2.5,g:0.1},
  {id:"l7",slotId:"coldMeal",eqId:"legumes_crus",itemId:null,nbUnits:null,qtyPortion:1,isOutOfPlan:false,kcal:22,p:1.2,l:0.1,g:3.8},
];

const DEFAULT_TYPE_LABELS = {carbs:"Féculents",vvpo:"Protéines",fat:"Matières grasses",dairy:"Produits laitiers",fruits:"Fruits",veg:"Légumes",extras:"Extras / Plaisir",drinks:"Boissons"};

function _getEq(catalogue,eqId){return catalogue.find(e=>e.eqId===eqId)}
function _isInPlan(planTargets,eqId){return eqId in planTargets}
function _getLogLabel(catalogue,eqId,itemId){
  const eq=_getEq(catalogue,eqId);if(!eq)return eqId;
  if(eq.qtyUi.appInputMode==="ITEM_FIRST_PICK"&&itemId){
    const item=eq.items.find(i=>i.itemId===itemId);
    if(item)return item.foodLabel;
  }
  return eq.label;
}
function _getLogSub(catalogue,eqId,itemId,nbUnits){
  const eq=_getEq(catalogue,eqId);if(!eq)return"";
  if(eq.qtyUi.appInputMode!=="ITEM_FIRST_PICK"&&itemId){
    const item=eq.items.find(i=>i.itemId===itemId);
    if(item&&nbUnits)return `${nbUnits} ${nbUnits>1?item.stepper?.usualUnitPl:item.stepper?.usualUnitSg} ${item.foodLabel.toLowerCase()}`;
    if(item)return item.foodLabel;
  }
  return"";
}
/* Context-aware wrappers used inside components */
function useHelpers(){
  const d=useData();
  const catalogue=d?.CATALOGUE||DEFAULT_CATALOGUE;
  const fullCatalogue=d?.FULL_CATALOGUE||DEFAULT_CATALOGUE;
  const planTargets=d?.PLAN_TARGETS||DEFAULT_PLAN_TARGETS;
  // Merge: search plan catalogue first, then full catalogue for out-of-plan EQ
  const allEq=useMemo(()=>{const byId=new Map();for(const eq of catalogue)byId.set(eq.eqId,eq);for(const eq of fullCatalogue)if(!byId.has(eq.eqId))byId.set(eq.eqId,eq);return[...byId.values()]},[catalogue,fullCatalogue]);
  return useMemo(()=>({
    getEq:(eqId)=>_getEq(allEq,eqId),
    isInPlan:(eqId)=>_isInPlan(planTargets,eqId),
    getLogLabel:(eqId,itemId)=>_getLogLabel(allEq,eqId,itemId),
    getLogSub:(eqId,itemId,nbUnits)=>_getLogSub(allEq,eqId,itemId,nbUnits),
  }),[allEq,planTargets]);
}

const EQ_ICONS={pain:IcBread,fruits_natures:IcApple,oleagineux_nature:IcAcorn,pl_0_riche_p:IcBottle,pl_50_100_kcal:IcBottle,fromages_20_30_mg:IcBottle,viandes_faibles_kcal:IcDrumstick,legumes_crus:IcCarrot};
function EqIcon({eqId,size=18,color}){const obj=useObjective();const c=color||obj.accent;const Ic=EQ_ICONS[eqId];if(Ic)return <Ic size={size} color={c}/>;const {getEq}=useHelpers();const eq=getEq(eqId);return <span style={{fontSize:size,lineHeight:1}}>{eq?.icon||"•"}</span>}

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
:root{--accent:#C6A05B;--accent-soft:rgba(198,160,91,.12);--accent-border:rgba(198,160,91,.22);--accent-border-strong:rgba(198,160,91,.34);--accent-line:rgba(198,160,91,.55);--navy:#121E2D;--bg:#F5F4F1;--text:#1A1A1A;--text-muted:#6B7280;--text-faint:rgba(15,30,46,.50);--green:#34C759;--orange:#E8863A;--red:#FF3B30;--hairline:rgba(15,30,46,.10)}
*{margin:0;padding:0;box-sizing:border-box}
html{height:100%;-webkit-text-size-adjust:100%}
body{font-family:'DM Sans',-apple-system,sans-serif;background:var(--bg);overflow:hidden;line-height:1.5}
.app-shell{width:100%;max-width:430px;height:100dvh;height:100vh;margin:0 auto;background:var(--bg);display:flex;flex-direction:column;position:relative;overflow:hidden}
.hdr{background:var(--navy);padding:env(safe-area-inset-top,12px) 20px 10px;border-bottom:1px solid var(--accent-line);display:flex;align-items:center;justify-content:center;flex-shrink:0;min-height:48px}
.hdr-logo{font-size:20px;font-weight:800;letter-spacing:2px;color:var(--accent);font-style:italic}
.hdr-back{background:none;border:none;color:var(--accent);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.content{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding-bottom:88px}.content::-webkit-scrollbar{display:none}
.tbar{position:absolute;bottom:0;left:12px;right:12px;margin-bottom:env(safe-area-inset-bottom,8px);background:rgba(18,30,45,.92);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border:1px solid var(--accent-border);border-radius:22px;display:flex;height:auto;padding:10px 4px;box-shadow:0 8px 32px rgba(0,0,0,.25),0 2px 8px rgba(0,0,0,.15);z-index:50}
.tbar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding-top:6px;cursor:pointer;background:none;border:none;font-family:inherit}
.tbar-ic{font-size:22px;line-height:1}.tbar-lb{font-size:11px;font-weight:700}
.tbar-item.active .tbar-lb{color:var(--accent)}.tbar-item:not(.active) .tbar-lb{color:rgba(255,255,255,.55)}.tbar-item:not(.active) .tbar-ic{opacity:.55}
.page{padding:14px 18px 24px}.page-title{font-size:24px;font-weight:700;color:var(--text);font-family:'Cormorant Garamond',serif}.page-meta{font-size:11px;font-weight:700;color:var(--text-muted);margin-top:2px}
.seg{display:flex;background:rgba(15,30,46,.06);border-radius:12px;padding:3px;margin:12px 0 10px}
.seg-btn{flex:1;padding:8px 0;border-radius:10px;text-align:center;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;color:rgba(15,30,46,.4);background:transparent;transition:all .2s}
.seg-btn.active{background:#fff;color:#1A1A1A;box-shadow:0 1px 6px rgba(0,0,0,.08)}
.card{background:#fff;border:1px solid var(--accent-border);border-radius:20px;padding:14px;margin-bottom:10px;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.card-title{font-size:15px;font-weight:800;color:#1A1A1A}
.card-link{font-size:13px;font-weight:800;color:var(--accent);margin-top:8px;cursor:pointer}
.pbar-track{height:8px;background:rgba(15,30,46,.06);border-radius:99px;overflow:hidden}
.pbar-fill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.pbar-accent{background:linear-gradient(90deg,var(--accent),var(--accent))}.pbar-green{background:var(--green)}.pbar-orange{background:var(--orange)}
.macros{display:flex;gap:6px;margin-top:10px}
.macro-pill{flex:1;background:rgba(15,30,46,.025);border:1px solid rgba(15,30,46,.06);border-radius:10px;padding:7px 6px;text-align:center}
.macro-letter{font-size:10px;font-weight:800;color:rgba(15,30,46,.35);text-transform:uppercase}.macro-val{font-size:15px;font-weight:800;color:#1A1A1A;margin-top:1px}.macro-target{font-size:10px;color:rgba(15,30,46,.3);margin-top:1px}
.slot{background:#fff;border:1px solid rgba(15,30,46,.08);border-radius:18px;padding:12px 14px;margin-bottom:8px}
.slot-header{display:flex;justify-content:space-between;align-items:center}.slot-left{display:flex;align-items:center;gap:8px}
.slot-name{font-size:14px;font-weight:700;color:#1A1A1A}.slot-time{font-size:11px;color:rgba(15,30,46,.50)}
.slot-add{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--accent);font-weight:700;cursor:pointer}
.log-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid rgba(15,30,46,.06)}
.log-name{font-size:13px;font-weight:700;color:#1A1A1A}.log-detail{font-size:11px;color:rgba(15,30,46,.50);margin-top:1px}.log-kcal{font-size:12px;font-weight:700;color:#1A1A1A}
.chip-hp{display:inline-block;font-size:9px;font-weight:800;background:rgba(232,134,58,.12);color:#E8863A;padding:2px 7px;border-radius:99px;margin-left:6px}
.eq-card{background:#fff;border:1px solid var(--accent-border);border-radius:18px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,.04);cursor:pointer}
.eq-body{flex:1}.eq-name{font-size:14px;font-weight:700;color:#1A1A1A}.eq-progress{font-size:12px;color:#6B7280;margin-top:2px}
.eq-bar{height:6px;background:rgba(15,30,46,.06);border-radius:99px;margin-top:6px;overflow:hidden}
.eq-bar-fill{height:100%;border-radius:99px;transition:width .6s}
.eq-add-btn{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--accent);cursor:pointer}
.advice-item{background:#fff;border:1px solid var(--accent-border);border-radius:18px;padding:14px;margin-bottom:8px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.advice-title{font-size:14px;font-weight:700;color:#1A1A1A}.advice-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px}
.badge-pri{background:var(--accent-soft);color:var(--accent)}.badge-sec{background:rgba(107,130,153,.1);color:#6B8299}
.badge-st{background:rgba(15,30,46,.06);color:#6B7280}.badge-al{background:var(--accent-soft);color:var(--accent)}
.badge-unread{background:var(--accent);color:#fff}.badge-read{background:rgba(52,199,89,.12);color:#34C759}
.tip-banner{background:linear-gradient(135deg,var(--accent-soft),rgba(198,160,91,.04));border:1px solid var(--accent-border);border-radius:20px;padding:14px;margin-bottom:10px}
.tip-text{font-size:13px;color:#1A1A1A;line-height:1.5;margin-top:4px}
.section-label{font-size:13px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 10px;padding-bottom:4px;border-bottom:1px solid rgba(15,30,46,.10)}
.alert-card{border-radius:20px;padding:14px;margin-bottom:10px;display:flex;gap:10px;align-items:flex-start}
.alert-soft{background:var(--accent-soft);border:1px solid var(--accent-border)}
.alert-title{font-size:13px;font-weight:700;color:#1A1A1A}.alert-msg{font-size:12px;color:#6B7280;margin-top:3px;line-height:1.4}
.alert-link{font-size:12px;font-weight:700;color:var(--accent);margin-top:6px;cursor:pointer}
.search{width:100%;padding:10px 14px;border-radius:12px;border:1px solid rgba(15,30,46,.10);background:rgba(15,30,46,.03);font-size:14px;color:#1A1A1A;font-family:inherit;margin-bottom:12px;outline:none}
.search:focus{border-color:var(--accent-border-strong)}
.flex-between{display:flex;justify-content:space-between;align-items:center}.mt8{margin-top:8px}.mt12{margin-top:12px}
.day-hint{font-size:11px;color:rgba(15,30,46,.50);text-align:center;font-style:italic;margin:4px 0 10px}
.overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:flex-end}
.modal{background:#fff;border-radius:24px 24px 0 0;width:100%;max-height:75%;overflow-y:auto;padding:20px 18px 30px;animation:slideUp .3s ease-out}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-handle{width:40px;height:4px;background:#E5E7EB;border-radius:99px;margin:0 auto 16px}
.modal-title{font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px;font-family:'Cormorant Garamond',serif}
.modal-sub{font-size:13px;color:#6B7280;margin-bottom:16px;line-height:1.4}
.modal-section{font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;margin:12px 0 8px}
.modal-tabs{display:flex;background:#E5E7EB;border-radius:10px;padding:3px;margin-bottom:12px}
.modal-tab{flex:1;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;color:#6B7280;background:transparent}
.modal-tab.active{background:#fff;color:#1A1A1A;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.item-row{display:flex;align-items:center;gap:10px;padding:10px;background:#F5F4F1;border-radius:12px;margin-bottom:6px;cursor:pointer;border:1px solid transparent}
.item-row:hover,.item-row.selected{border-color:var(--accent-border);background:var(--accent-soft)}
.item-label{font-size:14px;font-weight:600;color:#1A1A1A;flex:1}.item-detail{font-size:11px;color:#6B7280}
.stepper{display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0}
.stepper-btn{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);font-size:20px;font-weight:700;color:var(--accent);cursor:pointer;display:flex;align-items:center;justify-content:center}
.stepper-btn:disabled{opacity:.3;cursor:default}
.stepper-val{font-size:24px;font-weight:800;color:#1A1A1A;min-width:80px;text-align:center}
.stepper-unit{font-size:13px;color:#6B7280;text-align:center;margin-top:-4px}
.live-calc{background:rgba(15,30,46,.03);border-radius:12px;padding:10px;text-align:center;margin:8px 0}
.live-main{font-size:13px;font-weight:600;color:#1A1A1A}.live-sub{font-size:11px;color:#6B7280;margin-top:2px}
.btn-primary{width:100%;padding:14px;border-radius:14px;background:var(--accent);color:#fff;font-size:15px;font-weight:800;border:none;cursor:pointer;font-family:inherit}
.btn-text{background:none;border:none;color:var(--accent);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px;display:block;text-align:center;width:100%}
.snackbar{position:absolute;bottom:110px;left:50%;transform:translateX(-50%);background:var(--navy);color:var(--accent);padding:10px 22px;border-radius:99px;font-size:13px;font-weight:700;z-index:300;animation:snackPop .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 4px 24px rgba(0,0,0,.25);white-space:nowrap}
@keyframes snackPop{0%{transform:translateX(-50%) translateY(16px) scale(.95);opacity:0}50%{transform:translateX(-50%) translateY(-3px) scale(1.02)}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
@keyframes milestoneIn{0%{transform:scale(.6) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes splashLogo{from{opacity:0;transform:scale(.8) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes splashTag{from{opacity:0;transform:translateY(8px)}60%{opacity:0}to{opacity:1;transform:translateY(0)}}
@keyframes cardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.slot,.card,.advice-item,.eq-card,.alert-card,.tip-banner{animation:cardIn .35s ease-out both}
.slot:nth-child(1),.card:nth-child(1){animation-delay:0s}
.slot:nth-child(2),.card:nth-child(2){animation-delay:.04s}
.slot:nth-child(3),.card:nth-child(3){animation-delay:.08s}
.slot:nth-child(4),.card:nth-child(4){animation-delay:.12s}
.slot:nth-child(5),.card:nth-child(5){animation-delay:.16s}
.tbar-item{position:relative;transition:transform .15s ease}
.tbar-item:active{transform:scale(.92)}
.tbar-item.active::before{content:'';position:absolute;top:-2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:2px;background:var(--accent)}
.btn-primary{transition:transform .15s ease,box-shadow .15s ease}.btn-primary:active{transform:scale(.97)}
.slot-add{transition:transform .15s ease}.slot-add:active{transform:scale(.88)}
.eq-add-btn{transition:transform .15s ease}.eq-add-btn:active{transform:scale(.88)}
.eq-card,.advice-item,.menu-item{transition:transform .12s ease,box-shadow .12s ease}.eq-card:active,.advice-item:active,.menu-item:active{transform:scale(.98);box-shadow:0 1px 6px rgba(0,0,0,.08)}
.eq-cat-header{font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px;padding-left:4px}
.profile-card{background:linear-gradient(135deg,#121E2D,#1A2E40);border-radius:20px;padding:18px;color:#fff;margin-bottom:14px}
.kpi-row{display:flex;gap:8px;margin-top:12px}
.kpi-box{flex:1;background:rgba(255,255,255,.1);border-radius:12px;padding:10px;text-align:center}
.kpi-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase}
.kpi-val{font-size:18px;font-weight:800;color:#fff;margin-top:4px}.kpi-delta{font-size:11px;color:var(--accent);margin-top:2px}
.menu-item{display:flex;align-items:center;gap:12px;padding:14px;background:#fff;border-radius:16px;margin-bottom:8px;cursor:pointer;border:1px solid rgba(15,30,46,.10)}
.bilan-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(15,30,46,.10)}
.bilan-score{width:48px;height:48px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800}
`;

/* ═══ COMPONENTS ═══ */
function PBar({value,max,height=8}){
  const obj=useObjective();
  const pct=max>0?Math.min(value/max*100,150):0;
  let c;
  if(obj.progressDir==='up'){
    // GAIN: <80% = orange (not enough), ≥100% = green, between = accent
    c=pct<(obj.pbarOrangeBelow||80)?"pbar-orange":pct>=100?"pbar-green":"pbar-accent";
  } else {
    // PW/MAINT: >120% = orange (too much), ≥100% = green, <100% = accent
    c=pct>(obj.pbarOrangeAbove||120)?"pbar-orange":pct>=100?"pbar-green":"pbar-accent";
  }
  return <div className="pbar-track" style={{height}}><div className={`pbar-fill ${c}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
}
function MPill({letter,value,target}){
  return <div className="macro-pill"><div className="macro-letter">{letter}</div><div className="macro-val">{Math.round(value)}</div><div className="macro-target">/ {Math.round(target)}</div></div>
}

/* ═══ ADD MODAL (Plan + Hors Plan) ═══ */
function AddModal({slotId,onClose,onLog,everLoggedHp,weekConsumed}){
  const d=useData();
  const obj=useObjective();
  const CATALOGUE=d?.CATALOGUE||DEFAULT_CATALOGUE;
  const FULL_CATALOGUE=d?.FULL_CATALOGUE||DEFAULT_CATALOGUE;
  const SLOT_ALLOWED=d?.SLOT_ALLOWED||DEFAULT_SLOT_ALLOWED;
  const PLAN_TARGETS=d?.PLAN_TARGETS||DEFAULT_PLAN_TARGETS;
  const WEEK_CONSUMED=weekConsumed||DEFAULT_WEEK_CONSUMED;
  const TYPE_LABELS=d?.TYPE_LABELS||DEFAULT_TYPE_LABELS;
  const SLOTS=d?.SLOTS||DEFAULT_SLOTS;
  const {getEq,isInPlan}=useHelpers();

  const [tab,setTab]=useState("plan");
  const [selEq,setSelEq]=useState(null);
  const [selItem,setSelItem]=useState(null);
  const [units,setUnits]=useState(1);
  const [portion,setPortion]=useState(1);
  const [showStepper,setShowStepper]=useState(false);
  const [showHpEdu,setShowHpEdu]=useState(false);
  const [showNote,setShowNote]=useState(false);
  const [search,setSearch]=useState("");
  const [dietFilter,setDietFilter]=useState(null); // null | 'vegetarian' | 'glutenFree' | 'lactoseFree'

  const allowed=SLOT_ALLOWED[slotId]||[];
  const planEqs=CATALOGUE.filter(eq=>allowed.includes(eq.eqId)&&isInPlan(eq.eqId));
  // "Autres" shows: 1) plan EQ not in this slot, 2) ref EQ not in plan (filtered by objective)
  const hpAll=[...CATALOGUE.filter(eq=>isInPlan(eq.eqId)&&!allowed.includes(eq.eqId)),...FULL_CATALOGUE.filter(eq=>{
    if(isInPlan(eq.eqId)) return false;
    if(eq._objFlags&&!eq._objFlags[obj.eqFilterField]) return false;
    return true;
  })];
  const hpAfterDiet=dietFilter?hpAll.filter(eq=>eq._dietFlags&&eq._dietFlags[dietFilter]):hpAll;
  const hpFiltered=search?hpAfterDiet.filter(eq=>eq.label.toLowerCase().includes(search.toLowerCase())):hpAfterDiet;
  const hpGroups={};hpFiltered.forEach(eq=>{if(!hpGroups[eq.type])hpGroups[eq.type]=[];hpGroups[eq.type].push(eq)});

  function pickEq(eq,hp){
    setSelEq(eq);setShowStepper(false);setSelItem(null);
    if(eq.qtyUi.defaultAction==="LOG_COMPLETION"){doLog(eq,null,1,1,hp);return}
    if(eq.qtyUi.appInputMode==="ITEM_FIRST_PICK"){
      setShowStepper(true);
      const rec=eq.items.find(i=>i.isRecommended)||eq.items[0];
      if(rec){setSelItem(rec);setUnits(rec.stepper?.defaultUnits||1)}
    } else if(eq.qtyUi.appInputMode==="PORTION_TAP"){setPortion(1)}
    else{const rec=eq.items.find(i=>i.isRecommended)||eq.items[0];if(rec){setSelItem(rec);setUnits(rec.stepper?.defaultUnits||1)}}
    if(hp&&!everLoggedHp)setShowHpEdu(true);
  }

  function doLog(eq,item,qty,port,hp){
    const n=item?.nutrientsPerUnit
      ?{kcal:item.nutrientsPerUnit.kcal*qty,p:item.nutrientsPerUnit.p*qty,l:item.nutrientsPerUnit.l*qty,g:item.nutrientsPerUnit.g*qty}
      :{kcal:eq.nutrientsPerPortion.kcal*port,p:eq.nutrientsPerPortion.p*port,l:eq.nutrientsPerPortion.l*port,g:eq.nutrientsPerPortion.g*port};
    const oop=hp||!isInPlan(eq.eqId)||!allowed.includes(eq.eqId);
    onLog({id:`l${Date.now()}`,slotId,eqId:eq.eqId,itemId:item?.itemId||null,nbUnits:qty,qtyPortion:port,isOutOfPlan:oop,
      kcal:Math.round(n.kcal),p:Math.round(n.p*10)/10,l:Math.round(n.l*10)/10,g:Math.round(n.g*10)/10});
    onClose();
  }

  const liveCalc=useMemo(()=>{
    if(!selEq)return null;
    if(selEq.qtyUi.appInputMode==="PORTION_TAP")
      return{grams:Math.round(selEq.qtyPlanGrams*portion),kcal:Math.round(selEq.nutrientsPerPortion.kcal*portion),p:Math.round(selEq.nutrientsPerPortion.p*portion*10)/10,l:Math.round(selEq.nutrientsPerPortion.l*portion*10)/10,g:Math.round(selEq.nutrientsPerPortion.g*portion*10)/10,portion};
    if(!selItem?.nutrientsPerUnit)return null;
    const npu=selItem.nutrientsPerUnit;const grams=Math.round(units*(selItem.stepper?.usualGPerUnit||0));
    const port=selEq.qtyPlanGrams>0?Math.round(grams/selEq.qtyPlanGrams*100)/100:1;
    return{grams,kcal:Math.round(npu.kcal*units),p:Math.round(npu.p*units*10)/10,l:Math.round(npu.l*units*10)/10,g:Math.round(npu.g*units*10)/10,portion:port};
  },[selEq,selItem,units,portion]);

  const curHp=tab==="hors_plan"||(selEq&&!allowed.includes(selEq.eqId));

  if(showHpEdu)return(
    <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"50%"}}>
      <div className="modal-handle"/>
      <div style={{textAlign:"center",padding:"10px 0 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>🙌</div>
        <div className="modal-title">Tu peux le faire</div>
        <div className="modal-sub" style={{marginTop:8}}>{obj.hpEducation}</div>
        <button className="btn-primary" onClick={()=>setShowHpEdu(false)}>Compris</button>
      </div>
    </div></div>
  );

  if(selEq&&selEq.qtyUi.defaultAction!=="LOG_COMPLETION"){
    const mode=selEq.qtyUi.appInputMode;
    return(
    <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button className="hdr-back" onClick={()=>{setSelEq(null);setShowStepper(false);setShowNote(false)}} style={{padding:0}}>← Retour</button>
        {selEq.noteElevia&&<button onClick={()=>setShowNote(n=>!n)} style={{background:showNote?obj.accentSoft:"none",border:showNote?`1px solid ${obj.accentBorderStrong}`:"1px solid transparent",borderRadius:99,padding:"4px 8px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all .2s"}}><IcInfoEq size={14} color={showNote?obj.accent:obj.accentLine}/></button>}
      </div>
      {showNote&&selEq.noteElevia&&<div style={{marginBottom:12,padding:10,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,borderRadius:14,fontSize:12,color:"#1A1A1A",lineHeight:1.6,animation:"fadeUp .2s ease-out"}}>{selEq.noteElevia}</div>}
      <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}><EqIcon eqId={selEq.eqId} size={20}/> {selEq.label}{curHp&&<span className="chip-hp" style={{marginLeft:8}}>Hors plan</span>}</div>
      {isInPlan(selEq.eqId)&&<div className="modal-sub">Cible sem. : {PLAN_TARGETS[selEq.eqId]} · Consommé : {WEEK_CONSUMED[selEq.eqId]||0}</div>}

      {mode==="PORTION_TAP"&&<>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>1 portion = {selEq.qtyPlanGrams}g</div>
        <div className="stepper">
          <button className="stepper-btn" disabled={portion<=(selEq.qtyUi.portionMin||0.25)} onClick={()=>setPortion(p=>Math.max(selEq.qtyUi.portionMin||0.25,p-(selEq.qtyUi.portionStep||0.25)))}>−</button>
          <div><div className="stepper-val">{portion}</div><div className="stepper-unit">portion{portion!==1?"s":""}</div></div>
          <button className="stepper-btn" disabled={portion>=(selEq.qtyUi.portionMax||4)} onClick={()=>setPortion(p=>Math.min(selEq.qtyUi.portionMax||4,p+(selEq.qtyUi.portionStep||0.25)))}>+</button>
        </div>
        {liveCalc&&<div className="live-calc"><div className="live-main">≈ {liveCalc.grams}g · {liveCalc.kcal} kcal</div><div className="live-sub">P{liveCalc.p} · L{liveCalc.l} · G{liveCalc.g}</div></div>}
        <button className="btn-primary" onClick={()=>doLog(selEq,null,portion,portion,curHp)}>Valider {portion} portion{portion!==1?"s":""}</button>
      </>}

      {mode!=="PORTION_TAP"&&<>
        {!showStepper&&<>
          <button className="btn-primary" onClick={()=>doLog(selEq,selItem,selItem?.stepper?.defaultUnits||1,1,curHp)}>Ajouter 1 portion</button>
          <button className="btn-text" onClick={()=>setShowStepper(true)}>Modifier la quantité →</button>
        </>}
        {showStepper&&<>
          {selEq.items.length>0&&<>
            <div className="modal-section">{mode==="ITEM_FIRST_PICK"?"Choisis ton item":"Items"}</div>
            {selEq.items.map(item=>(
              <div key={item.itemId} className={`item-row ${selItem?.itemId===item.itemId?"selected":""}`}
                onClick={()=>{setSelItem(item);setUnits(item.stepper?.defaultUnits||1)}}>
                {item.isRecommended&&<IcStar size={13} color={obj.accent}/>}
                <span className="item-label">{item.foodLabel}</span>
                <span className="item-detail">{item.stepper?`${item.stepper.defaultUnits} ${item.stepper.usualUnitPl}`:""}</span>
              </div>
            ))}
          </>}
          {selItem?.stepper&&<>
            <div className="stepper">
              <button className="stepper-btn" disabled={units<=(selItem.stepper.minUnits||0)} onClick={()=>setUnits(u=>Math.max(selItem.stepper.minUnits||0,u-(selItem.stepper.unitStep||1)))}>−</button>
              <div><div className="stepper-val">{units}</div><div className="stepper-unit">{units<=1?selItem.stepper.usualUnitSg:selItem.stepper.usualUnitPl}</div></div>
              <button className="stepper-btn" disabled={units>=(selItem.stepper.maxUnits||20)} onClick={()=>setUnits(u=>Math.min(selItem.stepper.maxUnits||20,u+(selItem.stepper.unitStep||1)))}>+</button>
            </div>
            {liveCalc&&<div className="live-calc"><div className="live-main">≈ {liveCalc.grams}g · {liveCalc.kcal} kcal</div><div className="live-sub">P{liveCalc.p} · L{liveCalc.l} · G{liveCalc.g}</div></div>}
          </>}
          <button className="btn-primary" onClick={()=>doLog(selEq,selItem,units,liveCalc?.portion||1,curHp)}>Valider</button>
        </>}
      </>}
    </div></div>);
  }

  return(
  <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-handle"/>
    <div className="modal-title">Ajouter à {SLOTS.find(s=>s.id===slotId)?.label}</div>
    <div className="modal-tabs">
      <button className={`modal-tab ${tab==="plan"?"active":""}`} onClick={()=>setTab("plan")}>Dans ton plan</button>
      <button className={`modal-tab ${tab==="hors_plan"?"active":""}`} onClick={()=>setTab("hors_plan")}>Autres</button>
    </div>
    {tab==="plan"&&planEqs.map(eq=>{
      const c=WEEK_CONSUMED[eq.eqId]||0,t=PLAN_TARGETS[eq.eqId]||0;
      return <div key={eq.eqId} className="eq-card" onClick={()=>pickEq(eq,false)}>
        <span style={{width:30,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={20}/></span><div className="eq-body"><div className="eq-name">{eq.label}</div><div className="eq-progress">{c}/{t} sem.</div></div><span style={{fontSize:18,color:obj.accent}}>+</span>
      </div>
    })}
    {tab==="hors_plan"&&<>
      <input className="search" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        {[{key:null,label:"Tout"},{key:"vegetarian",label:"Végé 🌱"},{key:"glutenFree",label:"Sans gluten"},{key:"lactoseFree",label:"Sans lactose"}].map(f=>{const sel=dietFilter===f.key;return <button key={f.key||"all"} onClick={()=>setDietFilter(f.key)} style={{padding:"4px 10px",borderRadius:99,fontSize:10,fontWeight:700,background:sel?`${obj.accent}15`:"#F5F4F1",border:`1px solid ${sel?obj.accentBorder:"rgba(15,30,46,.08)"}`,color:sel?obj.accent:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>{f.label}</button>})}
      </div>
      {Object.entries(hpGroups).map(([type,eqs])=><div key={type}>
        <div className="eq-cat-header">{TYPE_LABELS[type]||type}</div>
        {eqs.map(eq=><div key={eq.eqId} className="eq-card" onClick={()=>pickEq(eq,true)}>
          <span style={{width:30,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={20}/></span><div className="eq-body"><div className="eq-name">{eq.label}{isInPlan(eq.eqId)&&<span style={{fontSize:10,color:"#6B7280",marginLeft:4}}>(plan, autre slot)</span>}</div><div className="eq-progress" style={{fontSize:11}}>{eq.nutrientsPerPortion.kcal} kcal/portion</div></div><span style={{fontSize:18,color:"#E8863A"}}>+</span>
        </div>)}
      </div>)}
    </>}
  </div></div>);
}

/* ═══ MILESTONE POPUP ═══ */
function MilestonePopup({milestone,accent,onDismiss}){
  if(!milestone)return null;
  return <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(10,22,32,.85)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",animation:"fadeIn .3s ease-out"}} onClick={onDismiss}>
    <div style={{background:"#fff",borderRadius:24,padding:"32px 28px",maxWidth:300,textAlign:"center",animation:"milestoneIn .4s cubic-bezier(.34,1.56,.64,1)"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:48,marginBottom:12}}>{milestone.icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:accent,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Badge débloqué !</div>
      <div style={{fontSize:18,fontWeight:800,color:"#1A1A1A",marginBottom:8}}>{milestone.label}</div>
      <div style={{fontSize:13,color:"#6B7280",lineHeight:1.5,marginBottom:20}}>{milestone.desc}</div>
      <button onClick={onDismiss} style={{padding:"10px 32px",borderRadius:14,background:accent,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit"}}>Super !</button>
    </div>
  </div>
}

/* ═══ BADGES GRID (for ProfileTab) ═══ */
function BadgesGrid({milestones,milestoneDefs,accent,accentSoft,accentBorder}){
  const achieved=milestones?.map(m=>m.milestone_type)||[];
  return <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
    {(milestoneDefs||[]).map(def=>{
      const done=achieved.includes(def.type);
      return <div key={def.type} style={{textAlign:"center",padding:"10px 4px",borderRadius:14,background:done?accentSoft:"rgba(15,30,46,.02)",border:`1px solid ${done?accentBorder:"rgba(15,30,46,.06)"}`,opacity:done?1:.4}}>
        <div style={{fontSize:24,filter:done?"none":"grayscale(1)"}}>{def.icon}</div>
        <div style={{fontSize:9,fontWeight:700,color:done?"#1A1A1A":"#999",marginTop:4,lineHeight:1.2}}>{def.label}</div>
      </div>
    })}
  </div>
}

/* ═══ DIETITIAN MESSAGES ═══ */
const MSG_TYPE_ICONS={encouragement:"💬",adjustment:"🔧",milestone_comment:"🏅",bilan_feedback:"📋",alert:"⚠️",general:"💬"};

function DietMessageBanner({messages,accent,accentSoft,accentBorder,onMarkRead,onOpenInbox}){
  const unread=messages?.filter(m=>!m.read_at)||[];
  if(!unread.length)return null;
  const latest=unread[0];
  const icon=MSG_TYPE_ICONS[latest.message_type]||"💬";
  return <div onClick={()=>{onMarkRead?.(latest.id);if(onOpenInbox)onOpenInbox()}} style={{padding:"12px 14px",borderRadius:14,background:`linear-gradient(135deg,${accentSoft},rgba(15,30,46,.02))`,border:`1px solid ${accentBorder}`,marginBottom:12,cursor:"pointer",animation:"cardIn .35s ease-out both"}}>
    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
      <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{icon}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:11,fontWeight:700,color:accent}}>{latest.sender_name||"Ton diététicien"}</div>
          {unread.length>1&&<span style={{fontSize:9,fontWeight:700,color:"#fff",background:accent,borderRadius:99,padding:"1px 6px"}}>{unread.length}</span>}
        </div>
        {latest.title&&<div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginTop:3}}>{latest.title}</div>}
        <div style={{fontSize:12,color:"#6B7280",lineHeight:1.5,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{latest.body}</div>
      </div>
    </div>
  </div>
}

function DietInbox({messages,accent,accentSoft,accentBorder,onMarkRead,onBack}){
  return <div className="page">
    <button className="hdr-back" onClick={onBack} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Messages</div>
    <div className="page-meta">{messages?.length||0} message{(messages?.length||0)>1?"s":""}</div>
    {(!messages||messages.length===0)&&<div className="card" style={{textAlign:"center",padding:"32px 20px"}}>
      <div style={{fontSize:32,marginBottom:8}}>💬</div>
      <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Pas encore de message</div>
      <div style={{fontSize:12,color:"#6B7280",marginTop:6,lineHeight:1.5}}>Ton diététicien t'enverra des messages personnalisés ici.</div>
    </div>}
    {messages?.map(m=>{
      const icon=MSG_TYPE_ICONS[m.message_type]||"💬";
      const isUnread=!m.read_at;
      const date=new Date(m.created_at);
      const dateStr=date.toLocaleDateString('fr-BE',{day:'numeric',month:'short'});
      return <div key={m.id} className="card" style={{padding:14,marginBottom:8,borderLeft:isUnread?`3px solid ${accent}`:"3px solid transparent"}} onClick={()=>{if(isUnread)onMarkRead?.(m.id)}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:isUnread?accent:"#6B7280"}}>{m.sender_name||"Ton diététicien"}</span>
              <span style={{fontSize:10,color:"#6B7280"}}>{dateStr}</span>
            </div>
            {m.title&&<div style={{fontSize:13,fontWeight:isUnread?800:600,color:"#1A1A1A",marginTop:4}}>{m.title}</div>}
            <div style={{fontSize:12,color:"#6B7280",lineHeight:1.6,marginTop:4}}>{m.body}</div>
          </div>
        </div>
      </div>
    })}
  </div>
}

/* ═══ TAB: PLAN ═══ */
const CHALLENGES_PW=[
  {text:"Logge tes 3 repas principaux chaque jour",icon:"🎯"},
  {text:"Essaie un fruit ou légume que tu n'as pas encore loggé",icon:"🥝"},
  {text:"Atteins ta cible protéines 5 jours sur 7",icon:"💪"},
  {text:"Reste dans ton budget kcal 6 jours cette semaine",icon:"✨"},
  {text:"Remplis toutes tes équivalences clés au moins 1 jour",icon:"🏆"},
  {text:"Zéro hors-plan pendant 3 jours consécutifs",icon:"🔒"},
];
const CHALLENGES_GAIN=[
  {text:"Atteins ta cible kcal chaque jour cette semaine",icon:"🎯"},
  {text:"Varie tes sources de protéines sur 5 repas",icon:"🥩"},
  {text:"Ne saute aucune collation pré ou post-entraînement",icon:"💪"},
  {text:"Logge tous tes repas avant 21h chaque jour",icon:"⏰"},
  {text:"Remplis 100% de tes équivalences clés 3 jours de suite",icon:"🏆"},
  {text:"Essaie un féculent que tu n'as pas encore loggé",icon:"🍚"},
];
function WeeklyChallenge({objectiveCode,accent,accentSoft,accentBorder}){
  const isGain=objectiveCode?.startsWith('GAIN');
  const challenges=isGain?CHALLENGES_GAIN:CHALLENGES_PW;
  // Rotate by week number (ISO week)
  const now=new Date();const start=new Date(now.getFullYear(),0,1);const weekNum=Math.ceil(((now-start)/86400000+start.getDay()+1)/7);
  const ch=challenges[weekNum%challenges.length];
  return <div style={{padding:"10px 14px",borderRadius:14,background:`linear-gradient(135deg,rgba(15,30,46,.02),${accentSoft})`,border:`1px solid ${accentBorder}`,display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
    <span style={{fontSize:20,flexShrink:0}}>{ch.icon}</span>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:accent,textTransform:"uppercase",letterSpacing:".5px"}}>Challenge de la semaine</div>
      <div style={{fontSize:12,fontWeight:600,color:"#1A1A1A",marginTop:2,lineHeight:1.4}}>{ch.text}</div>
    </div>
  </div>
}

function StreakBanner({current,longest,accent,accentSoft,accentBorder,lastDate,firstName}){
  // F16: Comeback message when streak is broken
  if((!current||current<1)&&lastDate){
    const last=new Date(lastDate);const now=new Date();
    const days=Math.floor((now-last)/86400000);
    if(days>=2){
      const comebackMsg=days>=7
        ?`Content de te revoir${firstName?` ${firstName}`:""} ! Reprends doucement.`
        :`${days} jours sans logger — une nouvelle série commence maintenant !`;
      return <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",marginBottom:12,background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.15)",borderRadius:14}}>
        <span style={{fontSize:18}}>👋</span>
        <span style={{fontSize:12,fontWeight:600,color:"#3B82F6",lineHeight:1.4}}>{comebackMsg}</span>
      </div>
    }
  }
  if(!current||current<1)return null;
  const icon=current>=7?'🔥':current>=3?'✨':'⭐';
  const isRecord=current===longest&&current>=3;
  // F13: Varied streak messages
  const streakMsg=current>=30?"Un mois complet !":current>=21?"3 semaines, la routine s'installe !":current>=14?"Deux semaines d'affilée !":current>=7?"Semaine parfaite !":current>=3?"Beau début !":"de suite";
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 16px",marginBottom:12,background:accentSoft,border:`1px solid ${accentBorder}`,borderRadius:14}}>
    <span style={{fontSize:18}}>{icon}</span>
    <span style={{fontSize:13,fontWeight:800,color:accent}}>{current} jour{current>1?"s":""}</span>
    <span style={{fontSize:11,color:"rgba(15,30,46,.45)"}}>{streakMsg}</span>
    {isRecord&&<span style={{fontSize:10,fontWeight:700,color:"#34C759",background:"rgba(52,199,89,.08)",padding:"2px 8px",borderRadius:99}}>Record !</span>}
  </div>
}

function PlanTab({logs,onAddLog,onDeleteLog,weekConsumed,weekNutrients,streak,onIncrementStreak,onCheckMilestones,bilanCount,dietMessages,onDietMarkRead,onSwitchTab}){
  const d=useData();
  const obj=useObjective();
  const [confirmDel,setConfirmDel]=useState(null);
  const DAY_TARGETS=d?.DAY_TARGETS||DEFAULT_DAY_TARGETS;
  const WEEK_TARGETS=d?.WEEK_TARGETS||DEFAULT_WEEK_TARGETS;
  const SLOTS=d?.SLOTS||DEFAULT_SLOTS;
  const MICRO_TIPS=d?.MICRO_TIPS||DEFAULT_MICRO_TIPS;
  const {getLogLabel}=useHelpers();

  const [view,setView]=useState("day");
  const [addSlot,setAddSlot]=useState(null);
  const [snack,setSnack]=useState(null);
  const hasHp=logs.some(l=>l.isOutOfPlan);
  // Quick-add: track recent items per slot in localStorage
  const recentBySlot=useMemo(()=>{
    try{const raw=localStorage.getItem('elevia_recent_items');return raw?JSON.parse(raw):{}}catch{return{}}
  },[]);
  const saveRecent=useCallback((slotId,log)=>{
    try{
      const all={...recentBySlot};
      const arr=all[slotId]||[];
      const key=`${log.eqId}:${log.itemId||''}`;
      const filtered=arr.filter(r=>r.key!==key);
      filtered.unshift({key,eqId:log.eqId,itemId:log.itemId,qtyPortion:log.qtyPortion,kcal:log.kcal,p:log.p,l:log.l,g:log.g,isOutOfPlan:log.isOutOfPlan});
      all[slotId]=filtered.slice(0,3);
      localStorage.setItem('elevia_recent_items',JSON.stringify(all));
    }catch{}
  },[recentBySlot]);
  const dayNut=useMemo(()=>{const n={kcal:0,p:0,l:0,g:0};logs.forEach(l=>{n.kcal+=l.kcal;n.p+=l.p;n.l+=l.l;n.g+=l.g});return n},[logs]);
  const [ringPulse,setRingPulse]=useState(false);
  const prevKcalRef=useMemo(()=>({v:0}),[]);
  useEffect(()=>{if(dayNut.kcal!==prevKcalRef.v&&prevKcalRef.v!==0){setRingPulse(true);const t=setTimeout(()=>setRingPulse(false),600);return()=>clearTimeout(t)}prevKcalRef.v=dayNut.kcal},[dayNut.kcal]);
  const logCountRef=useMemo(()=>({count:logs.length}),[]);
  function handleLog(log){
    onAddLog(log);
    saveRecent(log.slotId,log);
    const CLIENT=d?.CLIENT||DEFAULT_CLIENT;
    const PLAN_TARGETS=d?.PLAN_TARGETS||{};
    const CATALOGUE=d?.CATALOGUE||[];
    const firstName=CLIENT.firstName||"";
    // Compute new state after this log
    const newKcal=dayNut.kcal+(log.kcal||0);
    const newP=dayNut.p+(log.p||0);
    const newL=dayNut.l+(log.l||0);
    const newG=dayNut.g+(log.g||0);
    const pct=DAY_TARGETS.kcal>0?newKcal/DAY_TARGETS.kcal:0;
    const wasComplete=dayNut.kcal/DAY_TARGETS.kcal>=0.9;
    const isNowComplete=obj.progressDir==="down"?(pct>=0.9&&pct<=1.05):(pct>=0.95);
    // Check eq completion for the week
    const newWc=(weekConsumed[log.eqId]||0)+(log.qtyPortion||1);
    const eqTarget=PLAN_TARGETS[log.eqId]||0;
    const eqJustCompleted=eqTarget>0&&newWc>=eqTarget&&(weekConsumed[log.eqId]||0)<eqTarget;
    const eqLabel=CATALOGUE.find(c=>c.eqId===log.eqId)?.label||"";
    // Check macro crossing 100% today
    const macroCrossed=[];
    if(DAY_TARGETS.p>0&&dayNut.p<DAY_TARGETS.p&&newP>=DAY_TARGETS.p)macroCrossed.push("protéines");
    if(DAY_TARGETS.l>0&&dayNut.l<DAY_TARGETS.l&&newL>=DAY_TARGETS.l)macroCrossed.push("lipides");
    if(DAY_TARGETS.g>0&&dayNut.g<DAY_TARGETS.g&&newG>=DAY_TARGETS.g)macroCrossed.push("glucides");
    // Pick contextual message
    let msg;
    const firstLog=logs.length===0;
    if(firstLog){
      const h=new Date().getHours();
      const greet=h<12?"Bon matin":"Bonne journée";
      msg=firstName?`${greet} ${firstName} !`:"Premier ajout de la journée !";
      if(onIncrementStreak)onIncrementStreak();
    }else if(!wasComplete&&isNowComplete){
      msg=firstName?`Objectif du jour atteint, ${firstName} !`:"Objectif du jour atteint !";
    }else if(eqJustCompleted){
      msg=`${eqLabel} — cible semaine atteinte !`;
    }else if(macroCrossed.length>0){
      msg=`Cible ${macroCrossed[0]} du jour ✓`;
    }else if(log.isOutOfPlan){
      const hpMsgs=["C'est noté — l'important c'est la transparence","Loggé, c'est l'essentiel","Noté, on continue !"];
      msg=hpMsgs[logCountRef.count%hpMsgs.length];
    }else{
      logCountRef.count++;
      const basics=obj.progressDir==="down"
        ?["Bien joué !","C'est noté !","Tu restes dans ton budget !","On avance !"]
        :["Bien joué !","C'est noté !","Tu te rapproches de ta cible !","On avance !"];
      msg=basics[logCountRef.count%basics.length];
    }
    setSnack(`✓ ${msg}`);
    setTimeout(()=>setSnack(null),2800);
    // Check milestones after log
    if(onCheckMilestones){
      const totalLogs=logs.length+1;
      onCheckMilestones({totalLogs,streak:streak?.current||0,bilanCount:bilanCount||0});
    }
  }

  const planStart=d?._planStartDate?new Date(d._planStartDate):null;
  const daysSinceStart=planStart?Math.max(0,Math.floor((new Date()-planStart)/86400000)):null;
  const weekNum=daysSinceStart!=null?Math.floor(daysSinceStart/7)+1:null;
  const dayNum=daysSinceStart!=null?daysSinceStart+1:null;

  return <div className="page">
    <div className="flex-between"><div className="page-title">Plan</div><div className="page-meta">{weekNum?`Semaine ${weekNum} · Jour ${dayNum}`:"Mon plan"}</div></div>
    <div className="seg"><button className={`seg-btn ${view==="day"?"active":""}`} onClick={()=>setView("day")}>Jour</button><button className={`seg-btn ${view==="week"?"active":""}`} onClick={()=>setView("week")}>Semaine</button></div>
    <DietMessageBanner messages={dietMessages} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder} onMarkRead={onDietMarkRead} onOpenInbox={()=>onSwitchTab?.("profile")}/>
    {streak&&<StreakBanner current={streak.current} longest={streak.longest} lastDate={streak.lastDate} firstName={d?.CLIENT?.firstName} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder}/>}
    <WeeklyChallenge objectiveCode={d?.CLIENT?.objectiveCode} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder}/>
    {MICRO_TIPS.length>0&&(()=>{const dayOfYear=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/(1000*60*60*24));const tip=MICRO_TIPS[dayOfYear%MICRO_TIPS.length];return <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",borderRadius:12,background:"rgba(15,30,46,.02)",marginBottom:10}}>
      <span style={{flexShrink:0,marginTop:1}}><IcBulb size={14} color={obj.accent}/></span>
      <div style={{fontSize:11,color:"#6B7280",lineHeight:1.5,fontWeight:500}}>{tip.textFr}</div>
    </div>})()}
    {view==="day"?<>
      <div className="card" style={{padding:16}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{position:"relative",width:64,height:64,flexShrink:0,transition:"filter .3s",filter:ringPulse?`drop-shadow(0 0 8px ${obj.accent})`:"none"}}>
            <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="rgba(15,30,46,.06)" strokeWidth="5"/><circle cx="32" cy="32" r="28" fill="none" stroke={obj.ringOrangeDir==='above'?(dayNut.kcal/DAY_TARGETS.kcal>obj.ringOrangeThreshold?"#E8863A":dayNut.kcal/DAY_TARGETS.kcal>=0.95?"#34C759":obj.accent):(dayNut.kcal/DAY_TARGETS.kcal<obj.ringOrangeThreshold?"#E8863A":dayNut.kcal/DAY_TARGETS.kcal>=0.95?"#34C759":obj.accent)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.min(dayNut.kcal/DAY_TARGETS.kcal,1)*176} 176`} transform="rotate(-90 32 32)" style={{transition:"stroke-dasharray .5s ease-out"}}/></svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{Math.round(dayNut.kcal/DAY_TARGETS.kcal*100)}%</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".3px"}}>{obj.kcalFraming} du jour</div>
            <div style={{fontSize:22,fontWeight:800,color:"#1A1A1A",marginTop:2}}>{Math.round(dayNut.kcal)} <span style={{fontSize:13,fontWeight:600,color:"#6B7280"}}>/ {DAY_TARGETS.kcal} kcal</span></div>
          </div>
        </div>
        <div className="macros"><MPill letter="P" value={dayNut.p} target={DAY_TARGETS.p}/><MPill letter="L" value={dayNut.l} target={DAY_TARGETS.l}/><MPill letter="G" value={dayNut.g} target={DAY_TARGETS.g}/></div>
        <div className="day-hint">{obj.dayHint}</div>
      </div>
      {SLOTS.map(slot=>{
        const sl=logs.filter(l=>l.slotId===slot.id);const sk=sl.reduce((s,l)=>s+l.kcal,0);
        const mockTimes={breakfast:"7h42",snack1:"10h15",coldMeal:"12h38",snack2:"16h05",hotMeal:"19h47"};
        return <div className="slot" key={slot.id} style={sl.length>0?{borderColor:obj.accentBorder}:{}}>
          <div className="slot-header"><div className="slot-left"><div><div className="slot-name">{slot.label}</div><div className="slot-time">{sl.length>0?<><span style={{color:"rgba(15,30,46,.35)"}}>Dernier ajout {mockTimes[slot.id]}</span><span style={{color:obj.accent,fontWeight:600}}> · {Math.round(sk)} kcal</span></>:slot.time}</div></div></div><button className="slot-add" onClick={()=>setAddSlot(slot.id)}>+</button></div>
          {sl.length>0&&<div style={{marginTop:6}}>{sl.map(l=><div className="log-item" key={l.id} onClick={()=>setConfirmDel(l)} style={{cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}><span style={{width:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><EqIcon eqId={l.eqId} size={17}/></span><span className="log-name">{getLogLabel(l.eqId,l.itemId)}</span>{l.isOutOfPlan&&<span className="chip-hp">HP</span>}</div><div style={{textAlign:"right",flexShrink:0,paddingLeft:8,display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>{l.kcal}</span><span style={{fontSize:10,color:l.qtyPortion===1?obj.accentLine:"#E8863A",fontWeight:600,minWidth:38}}>{l.qtyPortion===1?"1 port.":l.qtyPortion+" port."}</span></div></div>)}</div>}
          {sl.length===0&&<div style={{padding:"10px 0 2px",fontSize:12,color:obj.accentLine,fontWeight:500}}>Appuie sur <strong style={{fontWeight:700}}>+</strong> pour commencer ce repas</div>}
          {(()=>{const recent=recentBySlot[slot.id]||[];if(!recent.length)return null;return <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>{recent.map(r=><button key={r.key} onClick={()=>{const id=crypto.randomUUID?.()|| `${Date.now()}-${Math.random()}`;handleLog({id,slotId:slot.id,eqId:r.eqId,itemId:r.itemId,nbUnits:r.qtyPortion||1,qtyPortion:r.qtyPortion||1,isOutOfPlan:r.isOutOfPlan||false,kcal:r.kcal||0,p:r.p||0,l:r.l||0,g:r.g||0})}} style={{padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:"rgba(15,30,46,.03)",border:`1px solid ${obj.accentBorder}`,color:"#6B7280",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}><span style={{color:obj.accent,fontWeight:700}}>+</span>{getLogLabel(r.eqId,r.itemId)}</button>)}</div>})()}
        </div>
      })}
    </>:<WeekView logs={logs} onAdd={setAddSlot} weekConsumed={weekConsumed} weekNutrients={weekNutrients}/>}
    {addSlot&&<AddModal slotId={addSlot} onClose={()=>setAddSlot(null)} onLog={handleLog} everLoggedHp={hasHp} weekConsumed={weekConsumed}/>}
    {confirmDel&&<div className="overlay" onClick={()=>setConfirmDel(null)}><div style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px",animation:"slideUp .25s ease-out"}} onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A"}}>Supprimer cet ajout ?</div>
        <div style={{fontSize:13,color:"#6B7280",marginTop:6}}>{getLogLabel(confirmDel.eqId,confirmDel.itemId)} · {confirmDel.kcal} kcal</div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"12px 0",borderRadius:14,border:"1px solid rgba(15,30,46,.10)",background:"#F5F4F1",fontSize:14,fontWeight:700,color:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
        <button onClick={()=>{onDeleteLog?.(confirmDel.id,confirmDel.eqId,confirmDel.qtyPortion,confirmDel.kcal,confirmDel.p,confirmDel.l,confirmDel.g);setConfirmDel(null);setSnack("✓ Supprimé");setTimeout(()=>setSnack(null),2000)}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",background:"#FF3B30",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Supprimer</button>
      </div>
    </div></div>}
    {snack&&<div className="snackbar">{snack}</div>}
  </div>
}

function WeekView({logs,onAdd,weekConsumed,weekNutrients}){
  const d=useData();
  const obj=useObjective();
  const CATALOGUE=d?.CATALOGUE||DEFAULT_CATALOGUE;
  const PLAN_TARGETS=d?.PLAN_TARGETS||DEFAULT_PLAN_TARGETS;
  const WEEK_TARGETS=d?.WEEK_TARGETS||DEFAULT_WEEK_TARGETS;
  const WEEK_CONSUMED=weekConsumed||DEFAULT_WEEK_CONSUMED;
  const {isInPlan}=useHelpers();

  const [search,setSearch]=useState("");
  const wk=weekNutrients||{kcal:0,p:0,l:0,g:0};
  const planEqs=CATALOGUE.filter(eq=>isInPlan(eq.eqId));
  const filtered=planEqs.filter(eq=>eq.label.toLowerCase().includes(search.toLowerCase()));
  const hpLogs=logs.filter(l=>l.isOutOfPlan);const hpKcal=hpLogs.reduce((s,l)=>s+l.kcal,0);

  // F5: Dynamic weekly alert — find most lagging key equivalence
  const weekAlert=useMemo(()=>{
    const keyEqs=planEqs.filter(eq=>eq.eqImportance==="key");
    const dayOfWeek=new Date().getDay();
    const expectedPct=dayOfWeek===0?100:Math.round(((dayOfWeek===0?7:dayOfWeek)/7)*100);
    let worst=null,worstRatio=1;
    for(const eq of keyEqs){
      const c=WEEK_CONSUMED[eq.eqId]||0;const t=PLAN_TARGETS[eq.eqId]||0;
      if(t>0){const ratio=c/t;if(ratio<worstRatio){worstRatio=ratio;worst=eq}}
    }
    if(worst&&worstRatio<expectedPct/100*0.7){
      const c=WEEK_CONSUMED[worst.eqId]||0;const t=PLAN_TARGETS[worst.eqId]||0;
      return {title:`${worst.label} en retard`,msg:`${c}/${t} cette semaine — essaie d'en ajouter à tes prochains repas.`}
    }
    const kcalPct=WEEK_TARGETS.kcal>0?wk.kcal/WEEK_TARGETS.kcal:0;
    if(obj.progressDir==="down"&&kcalPct>1.05)return {title:"Attention aux calories",msg:"Tu dépasses légèrement ta cible hebdo. Vérifie les portions."};
    if(obj.progressDir==="up"&&kcalPct<expectedPct/100*0.7)return {title:"Calories en retard",msg:"Tu es en dessous de ta cible — n'oublie pas tes collations."};
    return {title:obj.weekAlertTitle,msg:obj.weekAlertMsg}
  },[planEqs,WEEK_CONSUMED,PLAN_TARGETS,wk,WEEK_TARGETS,obj]);

  return <>
    <div className="alert-card alert-soft"><span style={{display:"flex",flexShrink:0,marginTop:2}}><IcBulb size={20} color={obj.accent}/></span><div style={{flex:1}}><div className="alert-title">{weekAlert.title}</div><div className="alert-msg">{weekAlert.msg}</div></div></div>
    <div className="card">
      <div className="flex-between"><span className="card-title">Bilan semaine</span><span style={{fontSize:12,fontWeight:700,color:"#6B7280"}}>{(()=>{const d=new Date().getDay();const r=d===0?0:7-d;return r===0?"Dernier jour":`${r} jour${r>1?"s":""} restant${r>1?"s":""}`})()}</span></div>
      <div className="flex-between mt8"><span style={{fontSize:22,fontWeight:800,color:"#1A1A1A"}}>{wk.kcal.toLocaleString()}</span><span style={{fontSize:13,color:"#6B7280"}}>/ {WEEK_TARGETS.kcal.toLocaleString()} kcal</span></div>
      <PBar value={wk.kcal} max={WEEK_TARGETS.kcal}/>
      <div className="macros"><MPill letter="P" value={wk.p} target={WEEK_TARGETS.p}/><MPill letter="L" value={wk.l} target={WEEK_TARGETS.l}/><MPill letter="G" value={wk.g} target={WEEK_TARGETS.g}/></div>
    </div>
    {hpKcal>0&&<div className="card" style={{borderColor:"rgba(232,134,58,.4)"}}>
      <div className="flex-between"><span style={{fontSize:13,fontWeight:700,color:"#E8863A",display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:4,background:"#E8863A",flexShrink:0}}/>Hors plan</span><span style={{fontSize:13,fontWeight:800,color:"#E8863A"}}>{hpKcal} kcal</span></div>
      <div style={{fontSize:11,color:"#6B7280",marginTop:4}}>{hpLogs.length} ajout{hpLogs.length>1?"s":""} · {Math.round(hpKcal/WEEK_TARGETS.kcal*100)}% de la cible</div>
    </div>}
    <input className="search" placeholder="Rechercher une équivalence…" value={search} onChange={e=>setSearch(e.target.value)}/>
    {filtered.map(eq=>{
      const c=WEEK_CONSUMED[eq.eqId]||0,t=PLAN_TARGETS[eq.eqId]||0,pct=t>0?c/t*100:0;
      const done=pct>=100,over=pct>130,late=pct<60&&eq.eqImportance==="key";
      const col=done?(over?"#E8863A":"#34C759"):obj.accent;
      return <div className="eq-card" key={eq.eqId}>
        <span style={{width:36,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={22}/></span>
        <div className="eq-body"><div className="eq-name">{eq.label}</div><div className="eq-progress">{c}/{t} sem.{done&&!over&&" — complété"}{over&&" — au-dessus"}{late&&" — en retard"}</div><div className="eq-bar"><div className="eq-bar-fill" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div></div>
        {done?<span style={{display:"flex"}}><IcCheck size={16} color="#34C759"/></span>:<button className="eq-add-btn" onClick={()=>onAdd("hotMeal")}>+</button>}
      </div>
    })}
  </>
}

/* ═══ ADVICE DETAIL MODAL ═══ */
function AdviceDetail({adv,onClose,status}){const obj=useObjective();
  const [expanded,setExpanded]=useState(false);
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"85%",display:"flex",flexDirection:"column"}}>
    <div className="modal-handle"/>
    <div style={{overflowY:"auto",flex:1,paddingBottom:8}}>
      <div className="modal-title">{adv.title}</div>
      <div className="advice-badges" style={{marginBottom:14}}><span className={`badge ${adv.axis==="priority"?"badge-pri":"badge-sec"}`}>{adv.axis==="priority"?"Prioritaire":"Secondaire"}</span><span className="badge badge-st">{status||adv.module}</span></div>

      <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.6,marginBottom:14}}>{adv.shortBody}</div>

      <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>Objectif</div>
      <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.6,marginBottom:12}}>{adv.summaryObjective}</div>
      <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>Plan d'action</div>
      {adv.summaryBullets.map((b,i)=><div key={i} style={{fontSize:13,color:"#1A1A1A",lineHeight:1.6,paddingLeft:12,marginBottom:3}}>• {b}</div>)}
      {adv.summaryTip&&<div style={{marginTop:10,padding:10,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,borderRadius:14,fontSize:12,lineHeight:1.5,color:"#1A1A1A",display:"flex",gap:8,alignItems:"flex-start"}}><span style={{flexShrink:0,marginTop:1}}><IcBulb size={14} color={obj.accent}/></span><span>{adv.summaryTip}</span></div>}

      {adv.body&&<>
        <button onClick={()=>setExpanded(e=>!e)} style={{display:"flex",alignItems:"center",gap:6,marginTop:14,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0}}>
          <span style={{fontSize:12,fontWeight:700,color:obj.accent}}>{expanded?"Réduire":"Comprendre en détail"}</span>
          <span style={{fontSize:14,color:obj.accent,transform:expanded?"rotate(180deg)":"rotate(0)",transition:"transform .2s",display:"inline-block"}}>▾</span>
        </button>
        {expanded&&<div style={{marginTop:10,padding:14,background:`linear-gradient(135deg,rgba(14,30,46,.03),${obj.accentSoft})`,border:`1px solid ${obj.accentBorder}`,borderRadius:16,fontSize:13,color:"#1A1A1A",lineHeight:1.7,animation:"fadeUp .2s ease-out"}}>{adv.body}</div>}
      </>}
    </div>
    <button className="btn-primary" style={{marginTop:8,flexShrink:0}} onClick={onClose}>Fermer</button>
  </div></div>
}

/* ═══ TAB: CONSEILS ═══ */
function AdviceTab({onCreateBilan}){
  const d=useData();
  const obj=useObjective();
  const ADVICES=d?.ADVICES||DEFAULT_ADVICES;
  const MICRO_TIPS=d?.MICRO_TIPS||DEFAULT_MICRO_TIPS;

  const [view,setView]=useState("focus");const [tipIdx,setTipIdx]=useState(0);
  const [selAdv,setSelAdv]=useState(null);const [readSet,setReadSet]=useState(new Set(["adv_02","adv_05"]));
  const [evalOpen,setEvalOpen]=useState(false);const [evalScores,setEvalScores]=useState({});
  const [evalWellbeing,setEvalWellbeing]=useState({energy:3,hunger:3,sleep:3,stress:3});
  const pri=ADVICES.filter(a=>a.axis==="priority").sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,3);
  const sec=ADVICES.filter(a=>a.axis==="secondary").sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,3);
  const statuses={adv_01:"En progrès",adv_02:"En progrès",adv_03:"À renforcer",adv_04:"Nouveau",adv_05:"Solide",adv_06:"En progrès"};
  const byStatus={"À renforcer":[],"En progrès":[],"Solide":[],"Nouveau":[]};
  ADVICES.forEach(a=>{const s=statuses[a.id]||"Nouveau";if(byStatus[s])byStatus[s].push(a)});

  function AdvItem({a}){
    const isRead=readSet.has(a.id);
    return(
    <div className="advice-item" onClick={()=>{setSelAdv(a);setReadSet(s=>new Set([...s,a.id]))}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div className="advice-title">{a.title}</div>
          <div style={{fontSize:12,color:"#6B7280",lineHeight:1.5,marginTop:4}}>{a.shortBody}</div>
        </div>
        <button onClick={e=>{e.stopPropagation();setReadSet(s=>{const n=new Set(s);if(n.has(a.id))n.delete(a.id);else n.add(a.id);return n})}} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,background:isRead?"rgba(52,199,89,.08)":obj.accentSoft,border:`1px solid ${isRead?"rgba(52,199,89,.25)":obj.accentBorder}`,borderRadius:99,padding:"4px 10px",cursor:"pointer",transition:"all .2s"}}>
          {isRead&&<IcCheck size={10} color="#34C759"/>}
          <span style={{fontSize:10,fontWeight:700,color:isRead?"#34C759":obj.accent}}>{isRead?"Lu":"Non lu"}</span>
        </button>
      </div>
      <div className="advice-badges" style={{marginTop:8}}>
        <span className={`badge ${a.axis==="priority"?"badge-pri":"badge-sec"}`}>{a.axis==="priority"?"Prioritaire":"Secondaire"}</span>
        <span className="badge badge-st">{statuses[a.id]||"Nouveau"}</span>
      </div>
    </div>
  )}

  return <div className="page">
    <div className="page-title">Conseils</div><div className="page-meta">{(()=>{const ps=d?._planStartDate?new Date(d._planStartDate):null;if(!ps)return"";const w=Math.floor(Math.max(0,(new Date()-ps)/86400000)/7)+1;return `Semaine ${w}`})()}</div>
    <div className="seg"><button className={`seg-btn ${view==="focus"?"active":""}`} onClick={()=>setView("focus")}>Focus</button><button className={`seg-btn ${view==="biblio"?"active":""}`} onClick={()=>setView("biblio")}>Bibliothèque</button></div>
    <div className="tip-banner"><div className="flex-between"><span style={{display:"flex"}}><IcBulb size={18} color={obj.accent}/></span><button onClick={()=>setTipIdx(i=>(i+1)%MICRO_TIPS.length)} style={{background:"none",border:"none",fontSize:11,color:obj.accent,fontWeight:700,cursor:"pointer"}}>Suivant →</button></div><div className="tip-text">{MICRO_TIPS[tipIdx].textFr}</div></div>
    {view==="focus"?<>
      <div className="section-label">Axes prioritaires</div>{pri.map(a=><AdvItem key={a.id} a={a}/>)}
      <div className="section-label">Axes secondaires</div>{sec.map(a=><AdvItem key={a.id} a={a}/>)}
      <div className="card" style={{textAlign:"center",marginTop:16,cursor:"pointer"}} onClick={()=>setEvalOpen(true)}><div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Évaluer ma semaine →</div><div style={{fontSize:12,color:"#6B7280",marginTop:4}}>Disponible dimanche</div></div>
    </>:<>
      <input className="search" placeholder="Rechercher un conseil…"/>
      {Object.entries(byStatus).map(([st,advs])=>advs.length>0&&<div key={st}><div className="section-label">{st}</div>{advs.map(a=><AdvItem key={a.id} a={a}/>)}</div>)}
      <div className="section-label">Astuces Élevia</div>
      {MICRO_TIPS.slice(0,4).map((t,i)=><div key={i} className="tip-banner" style={{marginBottom:8}}><span style={{display:"flex"}}><IcBulb size={18} color={obj.accent}/></span><div className="tip-text">{t.textFr}</div></div>)}
    </>}
    {selAdv&&<AdviceDetail adv={selAdv} onClose={()=>setSelAdv(null)} status={statuses[selAdv.id]}/>}
    {evalOpen&&<div className="overlay" onClick={()=>setEvalOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/><div className="modal-title">Évaluation semaine 8</div><div className="modal-sub">Comment s'est passée ta semaine ?</div>
      {[...pri,...sec].map(a=><div key={a.id} style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>{a.title}</div>
        <div style={{display:"flex",gap:6}}>{[{v:2,l:"Solide",c:"#34C759"},{v:1,l:"En progrès",c:obj.accent},{v:0,l:"Pas encore",c:"#E5342D"}].map(o=>{const sel=evalScores[a.id]===o.v;return <button key={o.v} onClick={()=>setEvalScores(s=>({...s,[a.id]:o.v}))} style={{flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,background:sel?`${o.c}10`:"#F5F4F1",border:`1px solid ${sel?`${o.c}40`:"rgba(15,30,46,.10)"}`,color:sel?o.c:"#6B7280",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{width:6,height:6,borderRadius:3,background:o.c,flexShrink:0}}/>{o.l}</button>})}</div>
      </div>)}
      {/* Wellbeing sliders */}
      <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid rgba(15,30,46,.08)"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#1A1A1A",marginBottom:10}}>Comment tu te sens ?</div>
        {[{key:"energy",label:"Énergie",emoji:["😴","😑","😊","💪","⚡"]},
          {key:"hunger",label:"Gestion faim",emoji:["😫","😕","😌","😊","🎯"]},
          {key:"sleep",label:"Sommeil",emoji:["😵","😴","😐","😊","😴💤"]},
          {key:"stress",label:"Stress",emoji:["🔴","🟠","🟡","🟢","💚"]}
        ].map(s=><div key={s.key} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:600,color:"#6B7280"}}>{s.label}</span>
            <span style={{fontSize:14}}>{s.emoji[evalWellbeing[s.key]-1]}</span>
          </div>
          <div style={{display:"flex",gap:4}}>
            {[1,2,3,4,5].map(v=>{const sel=evalWellbeing[s.key]===v;return <button key={v} onClick={()=>setEvalWellbeing(p=>({...p,[s.key]:v}))} style={{flex:1,padding:"6px 0",borderRadius:8,fontSize:12,fontWeight:700,background:sel?`${obj.accent}15`:"#F5F4F1",border:`1px solid ${sel?obj.accentBorder:"rgba(15,30,46,.08)"}`,color:sel?obj.accent:"#999",cursor:"pointer",fontFamily:"inherit"}}>{v}</button>})}
          </div>
        </div>)}
      </div>
      <button className="btn-primary" style={{marginTop:12}} onClick={()=>{
        const scores=Object.values(evalScores);
        if(scores.length>0&&onCreateBilan){
          const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
          const adherenceScore=Math.round(avg/2*100);
          const now=new Date();const day=now.getDay();const diffToMon=day===0?-6:1-day;
          const mon=new Date(now);mon.setDate(now.getDate()+diffToMon);mon.setHours(0,0,0,0);
          const sun=new Date(mon);sun.setDate(mon.getDate()+6);
          onCreateBilan({
            weekStart:mon.toISOString().slice(0,10),
            weekEnd:sun.toISOString().slice(0,10),
            adherenceScore,
            energyLevel:evalWellbeing.energy,
            hungerLevel:evalWellbeing.hunger,
            sleepQuality:evalWellbeing.sleep,
            stressLevel:evalWellbeing.stress,
            notes:JSON.stringify(evalScores),
          });
        }
        setEvalOpen(false);setEvalScores({});setEvalWellbeing({energy:3,hunger:3,sleep:3,stress:3});
      }}>Enregistrer</button>
    </div></div>}
  </div>
}

/* ═══ TAB: HISTORIQUE ═══ */
function BilanDetail({bilan,allBilans,onBack}){
  const d=useData();
  const obj=useObjective();
  const label=getScoreLabel(obj,bilan.score);
  const col=bilan.score>=85?"#34C759":bilan.score>=70?obj.accent:bilan.score>=55?"#6B7280":"#E8863A";
  // F11: Find previous bilan for delta
  const bilanIdx=(allBilans||[]).findIndex(b=>b.week===bilan.week);
  const prevBilan=bilanIdx>=0&&bilanIdx<(allBilans||[]).length-1?(allBilans||[])[bilanIdx+1]:null;
  const delta=prevBilan?bilan.score-prevBilan.score:null;
  // F9: Score trend messaging
  const recentScores=(allBilans||[]).slice(0,3).map(b=>b.score);
  const isImproving=recentScores.length>=2&&recentScores[0]>recentScores[1];
  const isDeclining=recentScores.length>=2&&recentScores[0]<recentScores[1];
  const firstName=d?.CLIENT?.firstName||"";
  const trendMsg=isImproving?`Belle progression${firstName?` ${firstName}`:""} ! Continue comme ça.`
    :isDeclining?"Attention, ton score baisse — relis tes conseils prioritaires."
    :"";
  return <div className="page">
    <button className="hdr-back" onClick={onBack} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Rapport {bilan.week}</div>
    <div className="page-meta">{bilan.dates}</div>
    <div style={{display:"flex",justifyContent:"center",margin:"20px 0",position:"relative"}}>
      <div style={{width:80,height:80,borderRadius:99,background:`${col}18`,border:`3px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:28,color:col}}>{bilan.score}</div>
      {delta!=null&&delta!==0&&<div style={{position:"absolute",right:"calc(50% - 60px)",top:0,fontSize:12,fontWeight:700,color:delta>0?"#34C759":"#E8863A"}}>{delta>0?`+${delta}`:`${delta}`} vs {prevBilan.week}</div>}
    </div>
    <div style={{textAlign:"center",fontSize:16,fontWeight:700,color:col,marginBottom:4}}>{label}</div>
    <div style={{textAlign:"center",fontSize:13,color:"#6B7280",marginBottom:4}}>Score d'adhérence au plan</div>
    {trendMsg&&<div style={{textAlign:"center",fontSize:12,fontWeight:600,color:isImproving?"#34C759":"#E8863A",marginBottom:16}}>{trendMsg}</div>}
    <div className="card">
      <div className="card-title">Résumé de la semaine</div>
      <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.7,marginTop:8}}>
        {getBilanSummary(obj,bilan.score)}
      </div>
    </div>
    <div className="card" style={{marginTop:12}}>
      <div className="card-title">Conseils pour la suite</div>
      <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.7,marginTop:8,whiteSpace:"pre-line"}}>
        {bilan.score>=70
          ?`• Maintiens tes bonnes habitudes sur les repas principaux\n• Vérifie tes collations — c'est souvent là qu'on peut optimiser\n• Pense à varier tes sources de protéines`
          :`• Essaie de préparer tes repas à l'avance cette semaine\n• Concentre-toi sur les 2-3 équivalences les plus en retard\n• N'hésite pas à utiliser les alternatives dans "Autres"`}
      </div>
    </div>
  </div>
}

function HistoryTab({logs}){
  const d=useData();
  const obj=useObjective();
  const BILANS=d?.BILANS||DEFAULT_BILANS;
  const SLOTS=d?.SLOTS||DEFAULT_SLOTS;
  const {getLogLabel}=useHelpers();
  const [viewBilan,setViewBilan]=useState(null);

  if(viewBilan) return <BilanDetail bilan={viewBilan} allBilans={BILANS} onBack={()=>setViewBilan(null)}/>;

  const latest=BILANS[0];
  const latestCol=latest?(latest.score>=85?"#34C759":latest.score>=70?obj.accent:latest.score>=55?"#6B7280":"#E8863A"):"#6B7280";

  return <div className="page">
    <div className="page-title">Historique</div><div className="page-meta">Bilans & ajouts récents</div>
    {latest?<div className="card mt12">
      <div className="flex-between"><span className="card-title">Bilan {latest.week} ({latest.dates})</span><div style={{width:48,height:48,borderRadius:99,background:`${latestCol}18`,border:`2px solid ${latestCol}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:latestCol}}>{latest.score}</div></div>
      <div style={{fontSize:13,color:"#1A1A1A",marginTop:8,lineHeight:1.5}}><strong>{latest.label}</strong> <span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:latestCol,verticalAlign:"middle",marginLeft:2}}/></div>
      <div className="card-link" onClick={()=>setViewBilan(latest)} style={{cursor:"pointer"}}>Voir le rapport complet →</div>
    </div>:<div style={{textAlign:"center",padding:"28px 24px",background:obj.accentSoft,border:`1px dashed ${obj.accentBorder}`,borderRadius:20,marginTop:12}}>
      <div style={{fontSize:26,marginBottom:10}}>📊</div>
      <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>Pas encore de bilan</div>
      <div style={{fontSize:13,color:"#6B7280",lineHeight:1.6}}>Ton premier bilan sera disponible dimanche, après ta première semaine complète. Continue à logger tes repas !</div>
    </div>}
    <div className="section-label">Historique des bilans</div>
    {BILANS.length>0?<div className="card">{BILANS.map((b,i)=>{
      const col=b.score>=85?"#34C759":b.score>=70?obj.accent:b.score>=55?"#6B7280":"#E8863A";
      const lbl=getScoreLabel(obj,b.score);
      return <div className="bilan-row" key={i} style={{...(i===BILANS.length-1?{borderBottom:"none"}:{}),cursor:"pointer"}} onClick={()=>setViewBilan(b)}>
        <div className="bilan-score" style={{background:`${col}18`,color:col}}>{b.score}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>{b.week} · {b.dates}</div><div style={{fontSize:12,fontWeight:700,color:col}}>{lbl}</div></div>
        <span style={{fontSize:14,color:"#6B7280"}}>›</span>
      </div>
    })}</div>:<div style={{textAlign:"center",padding:"20px",fontSize:13,color:"#6B7280",border:"1px dashed rgba(15,30,46,.10)",borderRadius:16}}>Tes bilans hebdomadaires apparaîtront ici au fil des semaines.</div>}
    <div className="section-label">Ajouts récents</div>
    {logs.length>0?<div className="card" style={{padding:0,overflow:"hidden"}}>{logs.slice().reverse().slice(0,8).map((l,i,arr)=><div key={l.id} style={{padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid rgba(15,30,46,.06)":"none"}}>
      <div className="flex-between"><span style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:700,color:"#1A1A1A"}}><EqIcon eqId={l.eqId} size={15}/>{getLogLabel(l.eqId,l.itemId)}{l.isOutOfPlan&&<span className="chip-hp">HP</span>}</span><span style={{fontSize:12,fontWeight:700,color:"#6B7280"}}>{l.kcal} kcal</span></div>
      <div style={{fontSize:11,color:"#6B7280",marginTop:2,paddingLeft:23}}>{SLOTS.find(s=>s.id===l.slotId)?.label} · P{l.p} L{l.l} G{l.g}</div>
    </div>)}</div>:<div style={{textAlign:"center",padding:"20px",fontSize:13,color:"#6B7280",border:"1px dashed rgba(15,30,46,.10)",borderRadius:16}}>Tes ajouts du jour apparaîtront ici. Commence par logger ton premier repas !</div>}
  </div>
}

/* ═══ TAB: PROFIL ═══ */
function ProfileTab({ signOut, onAddMeasurement, milestones, milestoneDefs, dietMessages, dietUnread, onDietMarkRead }){
  const d=useData();
  const obj=useObjective();
  const CLIENT=d?.CLIENT||DEFAULT_CLIENT;
  const MEASUREMENTS=d?.MEASUREMENTS||DEFAULT_MEASUREMENTS;
  const BILANS=d?.BILANS||DEFAULT_BILANS;
  const PROFILE_TEXT=d?.PROFILE_TEXT||DEFAULT_PROFILE_TEXT;

  const [subScreen,setSubScreen]=useState(null);
  const [metric,setMetric]=useState("weight");
  const [showMeasureForm,setShowMeasureForm]=useState(false);
  const [mForm,setMForm]=useState({weight:"",waist:"",bf:"",hip:"",muscle:""});
  const [mSaving,setMSaving]=useState(false);
  const m=MEASUREMENTS&&MEASUREMENTS.length>0?MEASUREMENTS:DEFAULT_MEASUREMENTS;
  const latest=m[0];const first=m[m.length-1];

  if(subScreen==="messages"){
    return <DietInbox messages={dietMessages} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder} onMarkRead={onDietMarkRead} onBack={()=>setSubScreen(null)}/>
  }

  if(subScreen==="measures"){
    const chartData=m.slice().reverse().map(e=>({
      date:e.date.slice(5),weight:e.weightKg,waist:e.waistCm,bf:e.bodyFatPct,
      hip:e.hipCm,muscle:e.muscleMassKg,
      bmi:e.weightKg?Math.round(e.weightKg/((CLIENT.heightCm/100)**2)*10)/10:null,
      ratio:(e.waistCm&&CLIENT.heightCm)?Math.round(e.waistCm/CLIENT.heightCm*100)/100:null
    }));
    const metrics={weight:{label:"Poids (kg)",key:"weight",color:obj.accent,unit:"kg",domain:['dataMin-2','dataMax+1']},waist:{label:"Tour de taille (cm)",key:"waist",color:"#E8863A",unit:"cm",domain:['dataMin-2','dataMax+2']},bf:{label:"% Masse grasse",key:"bf",color:"#3B82F6",unit:"%",domain:['dataMin-1','dataMax+1']},hip:{label:"Tour de hanches (cm)",key:"hip",color:"#F472B6",unit:"cm",domain:['dataMin-2','dataMax+2']},muscle:{label:"Masse musculaire (kg)",key:"muscle",color:"#10B981",unit:"kg",domain:['dataMin-2','dataMax+1']},bmi:{label:"IMC",key:"bmi",color:"#34C759",unit:"",domain:['dataMin-1','dataMax+1']},ratio:{label:"Ratio taille/TT",key:"ratio",color:"#8B5CF6",unit:"",domain:[0.4,0.6]}};
    const mc=metrics[metric];
    const first=chartData[0];const last=chartData[chartData.length-1];
    const delta=Math.round((last[mc.key]-first[mc.key])*10)/10;
    const weekScoreData=BILANS.slice().reverse().map(b=>({week:b.week,score:b.score,label:b.label}));

    return <div className="page">
      <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Suivi & Graphiques</div>
      <div className="page-meta">Évolution depuis le début</div>

      {/* KPI summary row */}
      {(()=>{
        const wDelta=latest.weightKg-first.weightKg;const wDir=obj.kpiDir==='up'?(wDelta>=0?obj.kpiColor:"#E8863A"):(wDelta<=0?"#34C759":"#E8863A");const wArrow=wDelta>=0?"↑":"↓";
        const tDelta=latest.waistCm-first.waistCm;const tDir=tDelta<=0?"#34C759":"#E8863A";const tArrow=tDelta>=0?"↑":"↓";
        const bDelta=latest.bodyFatPct-first.bodyFatPct;const bDir=bDelta<=0?"#34C759":"#E8863A";const bArrow=bDelta>=0?"↑":"↓";
        return <div className="kpi-row" style={{marginTop:12,marginBottom:16}}>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>Poids</div>
            <div style={{fontSize:20,fontWeight:800,color:"#1A1A1A",marginTop:4}}>{latest.weightKg}</div>
            <div style={{fontSize:11,fontWeight:700,color:wDir}}>{wArrow} {Math.abs(wDelta).toFixed(1)} kg</div>
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>Tour taille</div>
            <div style={{fontSize:20,fontWeight:800,color:"#1A1A1A",marginTop:4}}>{latest.waistCm}</div>
            <div style={{fontSize:11,fontWeight:700,color:tDir}}>{tArrow} {Math.abs(tDelta).toFixed(1)} cm</div>
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>% MG</div>
            <div style={{fontSize:20,fontWeight:800,color:"#1A1A1A",marginTop:4}}>{latest.bodyFatPct}</div>
            <div style={{fontSize:11,fontWeight:700,color:bDir}}>{bArrow} {Math.abs(bDelta).toFixed(1)}%</div>
          </div>
        </div>
      })()}

      {/* Metric chips */}
      <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {Object.entries(metrics).slice(0,3).map(([k,v])=>(
            <button key={k} onClick={()=>setMetric(k)} style={{
              padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",
              background:metric===k?"#121E2D":"rgba(15,30,46,.06)",color:metric===k?obj.accent:"#6B7280",
              transition:"all .2s",whiteSpace:"nowrap"
            }}>{v.label.split("(")[0].trim()}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"center"}}>
          {Object.entries(metrics).slice(3).map(([k,v])=>(
            <button key={k} onClick={()=>setMetric(k)} style={{
              padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",
              background:metric===k?"#121E2D":"rgba(15,30,46,.06)",color:metric===k?obj.accent:"#6B7280",
              transition:"all .2s",whiteSpace:"nowrap"
            }}>{v.label.split("(")[0].trim()}</button>
          ))}
        </div>
      </div>

      {/* Main chart card */}
      <div className="card" style={{padding:16}}>
        <div className="flex-between" style={{marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{mc.label}</span>
          <span style={{fontSize:13,fontWeight:700,color:metric==="weight"?(obj.kpiDir==='up'?(delta>=0?obj.kpiColor:"#E8863A"):(delta<=0?"#34C759":"#E8863A")):(delta<=0?"#34C759":"#E8863A")}}>{delta>0?"+":""}{delta} {mc.unit}</span>
        </div>
        <div style={{width:"100%",height:180}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{top:10,right:5,left:-20,bottom:0}}>
              <defs>
                <linearGradient id={`grad_${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={mc.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={mc.color} stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <YAxis domain={mc.domain} tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"#121E2D",border:"none",borderRadius:12,fontSize:12,color:"#fff",fontWeight:600}} labelStyle={{color:obj.accent}}/>
              <Area type="monotone" dataKey={mc.key} stroke={mc.color} strokeWidth={2.5} fill={`url(#grad_${metric})`} dot={{r:4,fill:mc.color,strokeWidth:2,stroke:"#fff"}} activeDot={{r:6,fill:mc.color,stroke:"#fff",strokeWidth:2}}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly score trend */}
      <div className="card" style={{padding:16}}>
        <div className="flex-between" style={{marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>Score nutrition</span>
          <span style={{fontSize:12,color:"#6B7280"}}>Dernières semaines</span>
        </div>
        <div style={{width:"100%",height:140}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekScoreData} margin={{top:10,right:5,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false}/>
              <XAxis dataKey="week" tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={70} stroke={obj.accentLine} strokeDasharray="4 4" label={{value:getScoreLabel(obj,70),position:"right",fontSize:9,fill:obj.accent}}/>
              <Tooltip contentStyle={{background:"#121E2D",border:"none",borderRadius:12,fontSize:12,color:"#fff",fontWeight:600}} labelStyle={{color:obj.accent}}/>
              <Bar dataKey="score" radius={[6,6,0,0]} fill={obj.accent} maxBarSize={28}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro weekly trend — from real bilan scores */}
      <div className="card" style={{padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:"#1A1A1A",marginBottom:8}}>Score d'adhérence (par semaine)</div>
        {weekScoreData.length>0?<div style={{width:"100%",height:140}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekScoreData} margin={{top:10,right:5,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false}/>
              <XAxis dataKey="week" tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={70} stroke="rgba(15,30,46,.12)" strokeDasharray="4 4"/>
              <Tooltip contentStyle={{background:"var(--navy)",border:"none",borderRadius:12,fontSize:11,color:"#fff",fontWeight:600}} labelStyle={{color:obj.accent}} formatter={(v)=>`${v}%`}/>
              <Bar dataKey="score" fill={obj.accent} radius={[6,6,0,0]} name="Score"/>
            </BarChart>
          </ResponsiveContainer>
        </div>:<div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:"#6B7280"}}>Les données apparaîtront après ton premier bilan</div>}
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:6}}>
          <span style={{fontSize:10,color:obj.accent,fontWeight:700}}>● kcal</span>
          <span style={{fontSize:10,color:"#3B82F6",fontWeight:700}}>● Prot</span>
          <span style={{fontSize:10,color:"#E8863A",fontWeight:700}}>● Lip</span>
        </div>
      </div>

      {/* History table */}
      <div className="section-label">Historique des mesures</div>
      <div className="card" style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:10,fontWeight:800,color:"#6B7280",textTransform:"uppercase",borderBottom:"1px solid rgba(15,30,46,.10)"}}>
          <span style={{width:80}}>Date</span><span style={{width:50,textAlign:"right"}}>Poids</span><span style={{width:50,textAlign:"right"}}>Taille</span><span style={{width:40,textAlign:"right"}}>%MG</span><span style={{width:40,textAlign:"right"}}>IMC</span>
        </div>
        {m.map((e,i)=>{
          const bmi=Math.round(e.weightKg/((CLIENT.heightCm/100)**2)*10)/10;
          return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<m.length-1?"1px solid rgba(15,30,46,.06)":"none",fontSize:12,color:"#1A1A1A"}}>
            <span style={{width:80,fontWeight:600}}>{e.date.slice(5)}</span>
            <span style={{width:50,textAlign:"right"}}>{e.weightKg}</span>
            <span style={{width:50,textAlign:"right"}}>{e.waistCm}</span>
            <span style={{width:40,textAlign:"right"}}>{e.bodyFatPct}</span>
            <span style={{width:40,textAlign:"right",color:"#6B7280"}}>{bmi}</span>
          </div>
        })}
      </div>

      {/* Add measurement CTA */}
      <button className="btn-primary" style={{marginTop:12}} onClick={()=>setShowMeasureForm(true)}>+ Ajouter une mesure</button>
      <div style={{fontSize:11,color:"rgba(15,30,46,.50)",textAlign:"center",fontStyle:"italic",marginTop:12}}>Mesures indicatives. Parle à ton diététicien pour une interprétation personnalisée.</div>

      {/* Measurement form modal */}
      {showMeasureForm&&<div className="overlay" onClick={()=>setShowMeasureForm(false)}><div className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"60%"}}>
        <div className="modal-handle"/>
        <div className="modal-title">Nouvelle mesure</div>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:16}}>Remplis au moins le poids pour enregistrer.</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <label style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>Poids (kg)
            <input type="number" step="0.1" placeholder={latest?.weightKg||"75"} value={mForm.weight} onChange={e=>setMForm(f=>({...f,weight:e.target.value}))} style={{display:"block",width:"100%",marginTop:4,padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
          <label style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>Tour de taille (cm)
            <input type="number" step="0.5" placeholder={latest?.waistCm||"85"} value={mForm.waist} onChange={e=>setMForm(f=>({...f,waist:e.target.value}))} style={{display:"block",width:"100%",marginTop:4,padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
          <label style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>% Masse grasse
            <input type="number" step="0.1" placeholder={latest?.bodyFatPct||"20"} value={mForm.bf} onChange={e=>setMForm(f=>({...f,bf:e.target.value}))} style={{display:"block",width:"100%",marginTop:4,padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
          <label style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>Tour de hanches (cm)
            <input type="number" step="0.5" placeholder="95" value={mForm.hip} onChange={e=>setMForm(f=>({...f,hip:e.target.value}))} style={{display:"block",width:"100%",marginTop:4,padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
          <label style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>Masse musculaire (kg)
            <input type="number" step="0.1" placeholder="35" value={mForm.muscle} onChange={e=>setMForm(f=>({...f,muscle:e.target.value}))} style={{display:"block",width:"100%",marginTop:4,padding:"10px 12px",borderRadius:12,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
        </div>
        <button className="btn-primary" disabled={!mForm.weight||mSaving} style={{marginTop:16,opacity:(!mForm.weight||mSaving)?0.5:1}} onClick={async()=>{
          setMSaving(true);
          if(onAddMeasurement)await onAddMeasurement({weightKg:Number(mForm.weight),waistCm:mForm.waist?Number(mForm.waist):null,bodyFatPct:mForm.bf?Number(mForm.bf):null,hipCm:mForm.hip?Number(mForm.hip):null,muscleMassKg:mForm.muscle?Number(mForm.muscle):null});
          setMSaving(false);setShowMeasureForm(false);setMForm({weight:"",waist:"",bf:"",hip:"",muscle:""});
        }}>{mSaving?"Enregistrement…":"Enregistrer"}</button>
      </div></div>}
    </div>
  }

  if(subScreen==="why") return <div className="page">
    <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Pourquoi ce plan est le tien</div>
    <div style={{fontSize:14,color:"#1A1A1A",lineHeight:1.7,marginTop:12}}>{PROFILE_TEXT}</div>
  </div>;

  if(subScreen==="progression"){
    const phases=d?.PROGRESSION||[];
    return <div className="page">
      <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Ma roadmap</div>
      <div className="page-meta">Ton parcours phase par phase</div>
      {phases.map((p,i)=><div key={i} className="card" style={{padding:16,marginBottom:10,borderLeft:`3px solid ${i===0?obj.accent:"rgba(15,30,46,.10)"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{p.phaseLabel}</div>
          {p.monthsDisplay&&<span style={{fontSize:10,fontWeight:700,color:obj.accent,background:obj.accentSoft,padding:"2px 8px",borderRadius:99}}>{p.monthsDisplay}</span>}
        </div>
        {p.focus&&<div style={{fontSize:12,color:"#6B7280",lineHeight:1.5,marginBottom:8}}>{p.focus}</div>}
        {p.kcalDisplay&&<div style={{fontSize:11,fontWeight:700,color:obj.accent,marginBottom:6}}>{p.kcalDisplay}{p.kcalDelta?` (${p.kcalDelta})`:""}</div>}
        {p.actions.length>0&&<div style={{marginBottom:6}}>{p.actions.map((a,j)=><div key={j} style={{fontSize:12,color:"#1A1A1A",padding:"3px 0",display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:obj.accent,fontWeight:700,flexShrink:0}}>→</span>{a}</div>)}</div>}
        {p.eqChanges.length>0&&<div style={{marginTop:6,padding:"8px 10px",borderRadius:10,background:"rgba(15,30,46,.02)"}}>{p.eqChanges.map((c,j)=><div key={j} style={{fontSize:11,color:"#6B7280",lineHeight:1.5}}>• {c}</div>)}</div>}
        {p.mindset&&<div style={{marginTop:8,fontSize:11,fontStyle:"italic",color:"rgba(15,30,46,.45)"}}>{p.mindset}</div>}
      </div>)}
    </div>
  }

  if(subScreen==="recipes"){
    const recipes=d?.RECIPES||[];
    const [selRecipe,setSelRecipe]=useState(null);
    if(selRecipe) return <div className="page">
      <button className="hdr-back" onClick={()=>setSelRecipe(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">{selRecipe.title}</div>
      {selRecipe.description&&<div style={{fontSize:13,color:"#6B7280",lineHeight:1.5,marginBottom:16}}>{selRecipe.description}</div>}
      <div style={{display:"flex",gap:12,marginBottom:16}}>
        {selRecipe.prepTime&&<div style={{fontSize:11,color:obj.accent,fontWeight:700}}>Prépa {selRecipe.prepTime} min</div>}
        {selRecipe.cookTime&&<div style={{fontSize:11,color:obj.accent,fontWeight:700}}>Cuisson {selRecipe.cookTime} min</div>}
        {selRecipe.servings&&<div style={{fontSize:11,color:"#6B7280",fontWeight:600}}>{selRecipe.servings} pers.</div>}
      </div>
      {selRecipe.ingredients.length>0&&<><div className="section-label">Ingrédients</div><div className="card" style={{padding:12}}>{selRecipe.ingredients.map((ing,i)=><div key={i} style={{fontSize:13,color:"#1A1A1A",padding:"4px 0",borderBottom:i<selRecipe.ingredients.length-1?"1px solid rgba(15,30,46,.06)":"none"}}>{typeof ing==="string"?ing:`${ing.qty||""} ${ing.unit||""} ${ing.name||ing}`}</div>)}</div></>}
      {selRecipe.steps.length>0&&<><div className="section-label">Étapes</div>{selRecipe.steps.map((step,i)=><div key={i} className="card" style={{padding:12,marginBottom:6}}><div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{width:22,height:22,borderRadius:11,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:obj.accent}}>{i+1}</span><div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.6}}>{typeof step==="string"?step:step.text||step}</div></div></div>)}</>}
      {selRecipe.eqSummary&&selRecipe.eqSummary.length>0&&<><div className="section-label">Équivalences par portion</div><div className="card" style={{padding:12}}>{selRecipe.eqSummary.map((eq,i)=>{const cat=d?.CATALOGUE?.find(c=>c.eqId===eq.eqId)||d?.FULL_CATALOGUE?.find(c=>c.eqId===eq.eqId);return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<selRecipe.eqSummary.length-1?"1px solid rgba(15,30,46,.06)":"none"}}><span style={{fontSize:13,color:"#1A1A1A"}}>{cat?.icon||"🍽️"} {cat?.label||eq.eqId}</span><span style={{fontSize:13,fontWeight:700,color:obj.accent}}>{eq.portions} {eq.portions>1?"portions":"portion"}</span></div>})}</div></>}
    </div>
    return <div className="page">
      <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Recettes</div>
      {recipes.length===0&&<div className="card" style={{textAlign:"center",padding:"32px 20px"}}>
        <div style={{fontSize:32,marginBottom:8}}>🍳</div>
        <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Bientôt disponible</div>
        <div style={{fontSize:12,color:"#6B7280",marginTop:6,lineHeight:1.5}}>Tes recettes personnalisées arriveront ici.</div>
      </div>}
      {recipes.map(r=>{const catLabels={meal:"Repas",breakfast:"Petit-déj",snack:"Collation"};const catIcons={meal:"🍽️",breakfast:"🥣",snack:"🥤"};return <div key={r.id} className="menu-item" onClick={()=>setSelRecipe(r)}>
        <span style={{fontSize:20,flexShrink:0}}>{catIcons[r.category]||"🍽️"}</span>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{r.title}</div><div style={{fontSize:11,color:"#6B7280"}}>{r.prepTime?`${r.prepTime+((r.cookTime||0)>0?" + "+r.cookTime:"")} min`:""}{r.category?` · ${catLabels[r.category]||r.category}`:""}</div></div>
        <span style={{fontSize:14,color:"#6B7280"}}>›</span>
      </div>})}
    </div>
  }

  if(subScreen==="guides"){
    const guides=d?.VIDEO_GUIDES||[];
    const fallback=[{title:"Comment fonctionne ton plan",duration:"2 min",description:"Comprendre les équivalences."},{title:"Logger un repas en 15 sec",duration:"1 min 30",description:"Ajouter rapidement."},{title:"Comprendre la vue Semaine",duration:"2 min 30",description:"Lire tes barres et alertes."},{title:"Les conseils et le bilan",duration:"2 min",description:"Évaluer et lire ton score."},{title:"Manger hors plan",duration:"2 min",description:"Gérer restau et extras."},{title:"Suivi mesures",duration:"1 min 30",description:"Peser, mesurer, comprendre."}];
    const list=guides.length>0?guides:fallback;
    const letters=["É","L","E","V","I","A"];
    return <div className="page">
      <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Guides vidéo</div>
      {list.map((v,i)=><div key={v.id||i} className="menu-item" onClick={()=>{if(v.url)window.open(v.url,'_blank')}}><span style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><IcMonoE size={13} color={obj.accent} letter={letters[i%6]}/></span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{v.title}</div><div style={{fontSize:11,color:"#6B7280"}}>{v.duration}{v.description?` · ${v.description}`:""}</div></div><span style={{fontSize:14,color:"#6B7280"}}>{v.url?"▶":"›"}</span></div>)}
    </div>
  }

  if(subScreen==="situation"){
    const capsules=d?.CAPSULES||[];
    const [expandedCapsule,setExpandedCapsule]=useState(null);
    const fallback=[
      {id:"sit_restaurant",title:"Manger au restaurant",body:"Au resto, privilégie les plats simples : grillades, poisson, légumes. Demande les sauces à part."},
      {id:"sit_social",title:"Sorties sociales & apéros",body:"Mange normalement dans la journée. À l'apéro : crudités, olives, noix. Limite l'alcool à 1-2 verres."},
      {id:"sit_weekend",title:"Gérer les weekends",body:"Garde un petit-déj structuré et prépare tes collations. Planifie au moins un repas cadré par jour."},
      {id:"sit_stress",title:"Quand tu as envie de craquer",body:"Attends 10 minutes — souvent ça passe. Si ça persiste, choisis un aliment de ton plan."},
    ];
    const list=capsules.length>0?capsules:fallback;
    const icons=["🍽️","🥂","📅","✈️","👨‍👩‍👧","🎉","💼","💪","🏋️","😌"];
    return <div className="page">
      <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Guides de situation</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:16}}>Des conseils pratiques pour gérer les moments du quotidien tout en suivant ton plan.</div>
      {list.map((c,i)=>{
        const isOpen=expandedCapsule===c.id;
        return <div key={c.id||i} className="card" style={{marginBottom:10,padding:0,overflow:"hidden",cursor:"pointer"}} onClick={()=>setExpandedCapsule(isOpen?null:c.id)}>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px"}}>
            <span style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icons[i%icons.length]}</span>
            <span style={{flex:1,fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{c.title}</span>
            <span style={{fontSize:14,color:"#6B7280",transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none"}}>›</span>
          </div>
          {isOpen&&<div style={{padding:"0 16px 16px",fontSize:13,lineHeight:1.6,color:"#374151",borderTop:`1px solid ${obj.accentBorder}`,background:obj.accentSoft}}>{c.body}</div>}
        </div>
      })}
    </div>
  }

  if(subScreen==="settings") return <div className="page">
    <button className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Paramètres</div>
    <div className="section-label">Notifications</div>
    {["Rappel matin (petit-déj)","Rappel soir (dîner)","Rappel bilan dimanche"].map((n,i)=><div key={i} className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>{n}</span><div style={{width:44,height:24,borderRadius:12,background:i<2?"#34C759":"#E5E7EB",position:"relative",cursor:"pointer"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:i<2?22:2,boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/></div></div>)}
    <div className="section-label">Données</div>
    {["Exporter mes données","Réinitialiser la semaine","Supprimer toutes mes données"].map((n,i)=><div key={i} className="menu-item"><span style={{fontSize:14,fontWeight:600,color:i===2?"#FF3B30":"#1A1A1A",flex:1}}>{n}</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>)}
    <div className="section-label">Abonnement</div>
    {["Gérer mon abonnement","Restaurer mes achats"].map((n,i)=><div key={i} className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>{n}</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>)}
    <div className="section-label">Support</div>
    {["Contacter le support","Signaler un problème"].map((n,i)=><div key={i} className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>{n}</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>)}
    <div className="section-label">À propos</div>
    <div style={{fontSize:12,color:"#6B7280",padding:8}}>Version : 1.1.0 (build 42)</div>
    {["Conditions d'utilisation","Politique de confidentialité","Licences open-source"].map((n,i)=><div key={i} className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>{n}</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>)}
    {signOut&&<button onClick={signOut} style={{width:"100%",padding:14,borderRadius:14,background:"rgba(255,59,48,.08)",border:"1px solid rgba(255,59,48,.2)",color:"#FF3B30",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:20}}>Se déconnecter</button>}
  </div>;

  const menuLetter=(ch)=><span style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><IcMonoE size={13} color={obj.accent} letter={ch}/></span>;

  return <div className="page">
    <div className="profile-card">
      <div style={{fontSize:20,fontWeight:800,fontFamily:"'Cormorant Garamond',serif"}}>{CLIENT.firstName}{d?._lastName?` ${d._lastName}`:""}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:4}}>Programme : <span style={{color:obj.accent}}>{CLIENT.programme}</span> · Taille : {CLIENT.heightCm} cm</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:2}}>{(()=>{const ps=d?._planStartDate?new Date(d._planStartDate):null;if(!ps)return"";const m=["jan.","fév.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];const w=Math.floor(Math.max(0,(new Date()-ps)/86400000)/7)+1;return `Depuis : ${ps.getDate()} ${m[ps.getMonth()]} ${ps.getFullYear()} · Semaine ${w}`})()}</div>
      <div className="kpi-row">
        {(()=>{
          const wDelta=latest.weightKg-first.weightKg;const wDir=obj.kpiDir==='up'?(wDelta>=0?obj.kpiColor:"#E8863A"):(wDelta<=0?"#34C759":"#E8863A");
          const tDelta=latest.waistCm-first.waistCm;const tDir=tDelta<=0?"#34C759":"#E8863A";
          const bDelta=latest.bodyFatPct-first.bodyFatPct;const bDir=bDelta<=0?"#34C759":"#E8863A";
          return <>
            <div className="kpi-box"><div className="kpi-label">Poids</div><div className="kpi-val">{latest.weightKg}</div><div className="kpi-delta" style={{color:wDir}}>{wDelta>0?"+":""}{wDelta.toFixed(1)} kg</div></div>
            <div className="kpi-box"><div className="kpi-label">Tour taille</div><div className="kpi-val">{latest.waistCm}</div><div className="kpi-delta" style={{color:tDir}}>{tDelta>0?"+":""}{tDelta.toFixed(1)} cm</div></div>
            <div className="kpi-box"><div className="kpi-label">% MG</div><div className="kpi-val">{latest.bodyFatPct}</div><div className="kpi-delta" style={{color:bDir}}>{bDelta>0?"+":""}{bDelta.toFixed(1)}%</div></div>
          </>
        })()}
      </div>
    </div>
    {milestoneDefs&&milestoneDefs.length>0&&<>
      <div className="section-label">Mes badges</div>
      <div className="card" style={{padding:14}}>
        <BadgesGrid milestones={milestones} milestoneDefs={milestoneDefs} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder}/>
        <div style={{fontSize:11,color:"#6B7280",textAlign:"center",marginTop:8}}>{milestones?.length||0}/{milestoneDefs.length} débloqués</div>
      </div>
    </>}
    <div className="menu-item" onClick={()=>setSubScreen("why")}>{menuLetter("É")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Pourquoi ce plan est le tien</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="section-label">Outils</div>
    <div className="menu-item" onClick={()=>setSubScreen("measures")}>{menuLetter("L")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Suivi mesures & graphiques</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="menu-item" onClick={()=>setSubScreen("recipes")}>{menuLetter("E")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Recettes</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="menu-item" onClick={()=>setSubScreen("messages")}>{menuLetter("V")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Messages de ton diététicien</span>{dietUnread>0&&<span style={{fontSize:10,fontWeight:800,color:"#fff",background:obj.accent,borderRadius:99,padding:"2px 8px",minWidth:18,textAlign:"center"}}>{dietUnread}</span>}<span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="section-label">Apprendre</div>
    <div className="menu-item" onClick={()=>setSubScreen("situation")}>{menuLetter("I")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Guides de situation</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="menu-item" onClick={()=>setSubScreen("guides")}>{menuLetter("A")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Guides & tutoriels</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div className="menu-item">{menuLetter("É")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Comprendre ton plan</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    {(d?.PROGRESSION?.length>0)&&<div className="menu-item" onClick={()=>setSubScreen("progression")}>{menuLetter("É")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Ma roadmap</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>}
    <div className="section-label">Réglages</div>
    <div className="menu-item" onClick={()=>setSubScreen("settings")}><span style={{width:28,height:28,borderRadius:8,background:"rgba(15,30,46,.04)",border:"1px solid rgba(15,30,46,.08)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#6B7280"}}>⚙</span><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Paramètres</span><span style={{fontSize:14,color:"#6B7280"}}>›</span></div>
    <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"rgba(15,30,46,.50)"}}>Élevia v1.1.0 (build 42)</div>
  </div>
}

/* ═══ MAIN APP ═══ */
export default function EleviaApp({ session, signOut, planData, logs: externalLogs, weekConsumed: externalWeekConsumed, weekNutrients: externalWeekNutrients, onAddLog: externalAddLog, onDeleteLog, onAddMeasurement, onCreateBilan, streak: externalStreak, onIncrementStreak, milestones, milestoneDefs, newlyUnlocked, onCheckMilestones, onDismissMilestone, dietMessages, dietUnread, onDietMarkRead, onDietMarkAllRead }){
  const [tab,setTab]=useState("plan");
  // Use external logs if provided (Supabase), fallback to local state
  const [localLogs,setLocalLogs]=useState(DEFAULT_INITIAL_LOGS);
  const logs=externalLogs||localLogs;
  const addLog=useCallback(l=>{if(externalAddLog)externalAddLog(l);else setLocalLogs(prev=>[...prev,l])},[externalAddLog]);
  const weekConsumed=externalWeekConsumed||DEFAULT_WEEK_CONSUMED;
  const weekNutrients=externalWeekNutrients||{kcal:0,p:0,l:0,g:0};

  const [splash,setSplash]=useState(true);
  const [showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem('elevia_onboarding_done'));
  const tabIcons={plan:IcCalendar,advice:IcBulb,history:IcHistory,profile:IcProfile};
  const tabs=[{id:"plan",label:"Plan"},{id:"advice",label:"Conseils"},{id:"history",label:"Historique"},{id:"profile",label:"Profil"}];

  // Objective-aware theming
  const objCode=planData?.CLIENT?.objectiveCode||'PW';
  const obj=useMemo(()=>getObjectiveConfig(objCode),[objCode]);
  const themeVars=useMemo(()=>`
    :root{--accent:${obj.accent};--accent-soft:${obj.accentSoft};--accent-border:${obj.accentBorder};--accent-border-strong:${obj.accentBorderStrong};--accent-line:${obj.accentLine}}
  `,[obj]);

  useEffect(()=>{const t=setTimeout(()=>setSplash(false),1000);return()=>clearTimeout(t)},[]);

  if(splash) return <DataCtx.Provider value={planData||null}><>
    <style>{css}{themeVars}</style>
    <div style={{width:"100%",maxWidth:430,height:"100dvh",height:"100vh",margin:"0 auto",background:"linear-gradient(160deg,#0A1620 0%,#121E2D 40%,#122438 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      {/* Subtle accent gradient orb */}
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${obj.accentSoft} 0%,transparent 70%)`,top:"35%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{animation:"splashLogo 1.2s ease-out",opacity:1}}>
        <IcLogo height={22}/>
      </div>
      <div style={{marginTop:16,fontSize:11,fontWeight:600,letterSpacing:3,color:`${obj.accent}73`,textTransform:"uppercase",animation:"splashTag 1.4s ease-out"}}>{obj.welcomeSubtitle}</div>
      <div style={{position:"absolute",bottom:40,fontSize:10,color:"rgba(255,255,255,.15)",letterSpacing:1}}>v1.1.0</div>
    </div>
  </></DataCtx.Provider>;

  return <DataCtx.Provider value={planData||null}>
    <style>{css}{themeVars}</style>
    <div className="app-shell">
      <div className="hdr"><IcLogo height={20}/></div>
      <div className="content">
        {tab==="plan"&&<PlanTab logs={logs} onAddLog={addLog} onDeleteLog={onDeleteLog} weekConsumed={weekConsumed} weekNutrients={weekNutrients} streak={externalStreak} onIncrementStreak={onIncrementStreak} onCheckMilestones={onCheckMilestones} bilanCount={planData?.BILANS?.length||0} dietMessages={dietMessages} onDietMarkRead={onDietMarkRead} onSwitchTab={setTab}/>}
        {tab==="advice"&&<AdviceTab onCreateBilan={onCreateBilan}/>}
        {tab==="history"&&<HistoryTab logs={logs}/>}
        {tab==="profile"&&<ProfileTab signOut={signOut} onAddMeasurement={onAddMeasurement} milestones={milestones} milestoneDefs={milestoneDefs} dietMessages={dietMessages} dietUnread={dietUnread} onDietMarkRead={onDietMarkRead}/>}
      </div>
      <div style={{position:"absolute",bottom:76,left:0,right:0,height:24,background:"linear-gradient(to bottom,transparent,#F5F4F1)",pointerEvents:"none",zIndex:10}}/>
      <div className="tbar">{tabs.map(t=>{const Ic=tabIcons[t.id];const active=tab===t.id;return <button key={t.id} className={`tbar-item ${active?"active":""}`} onClick={()=>setTab(t.id)}><span className="tbar-ic" style={{position:"relative"}}><Ic size={20} color={active?obj.accent:"rgba(255,255,255,.45)"}/>{t.id==="profile"&&dietUnread>0&&<span style={{position:"absolute",top:-4,right:-6,width:8,height:8,borderRadius:4,background:"#FF3B30",border:"2px solid #121E2D"}}/>}</span><span className="tbar-lb">{t.label}</span></button>})}</div>
    </div>
    {showOnboarding&&<OnboardingOverlay objectiveCode={objCode} accent={obj.accent} onComplete={()=>{localStorage.setItem('elevia_onboarding_done','1');setShowOnboarding(false)}}/>}
    {newlyUnlocked&&<MilestonePopup milestone={newlyUnlocked} accent={obj.accent} onDismiss={onDismissMilestone}/>}
  </DataCtx.Provider>
}