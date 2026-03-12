import { useState, useMemo, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
import { getObjectiveConfig, getScoreLabel, getBilanSummary } from "./src/lib/objectiveConfig.js";
import { computeBilan } from "./src/lib/bilanEngine.js";
import { computeAdviceStatuses, getEvalAdvices, getAdviceDisplayStatus } from "./src/lib/adviceStatus.js";
import { computeIngredientDisplay, computeRecipeMacros } from "./src/lib/recipeHelpers.js";
import OnboardingOverlay from "./src/components/OnboardingOverlay.jsx";
import GuidedTour from "./src/components/GuidedTour.jsx";
import PwaInstallPrompt from "./src/components/PwaInstallPrompt.jsx";

/* ═══ DATA CONTEXT ═══ */
const DataCtx = createContext(null);
function useData() { return useContext(DataCtx); }
function useObjective() {
  const d = useData();
  const code = d?.CLIENT?.objectiveCode || 'PW';
  return useMemo(() => getObjectiveConfig(code), [code]);
}

/* ═══ INLINE SVG ICONS ═══ */
const IcCalendar=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M1.5 2.501h21s1 0 1 1v19s0 1-1 1h-21s-1 0-1-1v-19s0-1 1-1"/><path d="m5.5.501 0 5"/><path d="m18.5.501 0 5"/><path d="m.5 7.501 23 0"/><path d="m12 7.501 0 16"/><path d="m6 7.501 0 16"/><path d="m18 7.501 0 16"/><path d="m.5 15.501 23 0"/><path d="m.5 11.501 23 0"/><path d="m.5 19.501 23 0"/></svg>;
const IcBulb=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M15 17.239v2.716c0 1.426-1.2 2-3 2s-3-.574-3-2v-2.716"/><path d="M13 17.455v-6a1 1 0 1 1 1 1h-4a1 1 0 0 1 0-2 .951.951 0 0 1 1 1v6"/><path d="M14.5 17.455a6.336 6.336 0 0 0 4-6 6.619 6.619 0 0 0-6.5-6.5 6.619 6.619 0 0 0-6.5 6.5 6.336 6.336 0 0 0 4 6Z"/><path d="m9 19.455 6 0"/><path d="m12 .545 0 1.91"/><path d="m12 21.955 0 1.5"/><path d="m1 10.455 2.291 0"/><path d="M3.591 3.045 5.5 4.955"/><path d="m23 10.455-2.291 0"/><path d="M20.409 3.045 18.5 4.955"/></svg>;
const IcHistory=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="m13 6.998 0 5.5 5 0"/><path d="m.5 8.992 3 4.5 3.5-4"/><path d="M13 21.5A9.5 9.5 0 1 0 3.5 12v1.494"/></svg>;
const IcProfile=({size=20,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M6.5 6.75a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0Z"/><path d="M3 22.75a9 9 0 0 1 18 0Z"/></svg>;

const IcTarget=({size=14,color="#C6A05B"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M3.917 11.748a7.833 7.833 0 1 0 15.666 0 7.833 7.833 0 1 0-15.666 0Z"/><path d="m11.75.977 0 5.875"/><path d="m.979 11.748 5.875 0"/><path d="m11.75 22.519 0-5.875"/><path d="m22.521 11.748-5.875 0"/></svg>;
const IcCheck=({size=12,color="#34C759"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="m23.01.489-16.156 22.521-6.365-6.365"/></svg>;
const IcApple=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M12 22.5c1.5 0 .5 1 3.5 1s6-6 6-10-2.5-7-5.5-7-3 1-4 1-1-1-4-1-5.5 3-5.5 7 3 10 6 10 2-1 3.5-1Z"/><path d="M12 7.5v-2a2.006 2.006 0 0 0-2-2H8"/><path d="M14.628 4.918a4.5 4.5 0 0 0 3.829-3.828.517.517 0 0 0-.585-.585 4.5 4.5 0 0 0-3.828 3.829.515.515 0 0 0 .584.584Z"/></svg>;
const IcBread=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="m12.24 11.73.979 8.832"/><path d="M3.447 11.535a4.259 4.259 0 0 1-2.938-4.083A4.524 4.524 0 0 1 5.004 2.938h6.639a4.524 4.524 0 0 1 4.514 4.514 4.269 4.269 0 0 1-3.917 4.279"/><path d="M18.604 11.75a4.406 4.406 0 0 0 0-8.813h-7.833"/><path d="m3.447 11.535-.842 7.912a.979.979 0 0 0 .979 1.116h16.489a.979.979 0 0 0 .744-.333.979.979 0 0 0 .225-.783l-.852-7.99"/></svg>;
const IcBottle=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M23.5 10.914a1 1 0 0 0-.293-.707L18.5 5.5l-5 5v13h9a1 1 0 0 0 1-1Z"/><path d="M18.5 5.5h-13L.793 10.207a1 1 0 0 0-.293.707V22.5a1 1 0 0 0 1 1h12v-13"/><path d="m23.41 10.5-22.82 0"/><path d="M18.5 5.5V3a2.793 2.793 0 0 0-3-2.5h-7a2.793 2.793 0 0 0-3 2.5v2.5"/><path d="M2.5 13.5h8v4h-8z"/></svg>;
const IcAcorn=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M1.62 21.748c.054.144.139.275.248.384.109.109.24.194.384.248 7.382 2.77 12.247.107 17.113-4.759L6.379 4.636c-4.865 4.864-7.53 9.731-4.759 17.112Z"/><path d="M23.184 3.108a1.08 1.08 0 0 0 0-1.528l-.764-.764a1.08 1.08 0 0 0-1.528 0l-2.336 2.336a8.5 8.5 0 0 0-6.322-2.123 8.5 8.5 0 0 0-6.203 2.45.3.3 0 0 0-.013.388L19.736 17.992a.3.3 0 0 0 .388-.013 8.5 8.5 0 0 0 2.45-6.202 8.5 8.5 0 0 0-2.124-6.322l2.337-2.336Z"/><path d="M17.75 11a.25.25 0 0 1-.25-.25.25.25 0 0 1 .25-.25"/><path d="M17.75 11a.25.25 0 0 0 .25-.25.25.25 0 0 0-.25-.25"/><path d="M18.75 14a.25.25 0 0 1-.25-.25.25.25 0 0 1 .25-.25"/><path d="M18.75 14a.25.25 0 0 0 .25-.25.25.25 0 0 0-.25-.25"/><path d="M20.75 12a.25.25 0 0 1-.25-.25.25.25 0 0 1 .25-.25"/><path d="M20.75 12a.25.25 0 0 0 .25-.25.25.25 0 0 0-.25-.25"/></svg>;
const IcDrumstick=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M4.821 22.7a3.339 3.339 0 0 1-.673-2.795 3.428 3.428 0 0 1-2.848-.722c-2.493-2.493 1.381-6.367 4.076-2.7l3.015-3.073 2.122 2.121L7.5 18.606c3.69 2.673-.185 6.594-2.679 4.094Z"/><path d="m11.27 16.289-3.535-3.537c-1.891-1.89 6.435-17.678 13.813-10.3 7.43 7.428-8.628 15.486-10.278 13.837Z"/></svg>;
const IcCarrot=({size=18,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M20.56 10.47a32.7 32.7 0 0 0-3.24-3.79 32.7 32.7 0 0 0-3.79-3.24 1.58 1.58 0 0 0-2.1.4L.77 21.31a1.37 1.37 0 0 0 1.92 1.92l17.47-10.66a1.58 1.58 0 0 0 .4-2.1Z"/><path d="M15.89 5.34 17.83.5"/><path d="m18.66 8.11 4.84-1.94"/><path d="m17.32 6.68 4.52-4.52"/><path d="m10.42 5.5 4.03 4.04"/><path d="m11.11 12.15 3.69 3.69"/><path d="m8.19 16.53 2.08 2.07"/></svg>;

const IcMonoE=({size=16,color="#C6A05B",letter="É"})=><span style={{fontSize:size,fontWeight:700,fontStyle:"italic",color,fontFamily:"'Cormorant Garamond','Georgia','Times New Roman',serif",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>{letter}</span>;

const IcInfoEq=({size=14,color="currentColor"})=><svg width={size} height={size} viewBox="-0.25 -0.25 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M11.75 22.521c5.949 0 10.771-4.822 10.771-10.771 0-5.949-4.822-10.771-10.771-10.771C5.801.979.979 5.801.979 11.75c0 5.949 4.822 10.771 10.771 10.771Z"/><path d="M11.692 16.5v-6.012a.858.858 0 0 0-.252-.607.858.858 0 0 0-.607-.252h-.859"/><path d="M11.263 7.782a.429.429 0 0 1-.43-.43.429.429 0 0 1 .43-.429"/><path d="M11.263 7.782a.429.429 0 0 0 .43-.43.429.429 0 0 0-.43-.429"/><path d="M9.975 16.5h3.55"/></svg>;

const IcLogo=({height=16})=><svg height={height} viewBox="70 125 250 100" fill="none"><g transform="translate(192,126)"><g fill="#f6f3ee"><g transform="translate(1.54,83.04)"><path d="M.63-48.84h10.89l11.51 37.19h.42l11.44-37.19h10.89L30.14.06H16.27z"/></g><g transform="translate(43.9,83.04)"><path d="M4.11-48.84h10.97V0H4.11z"/></g><g transform="translate(57.58,83.04)"><path d="M31.41-11.3H15.77L12.28 0H1.25l17.38-48.84h10.12L45.98 0H34.95zM28.75-19.61l-5.03-15.77h-.41l-4.89 15.77z"/></g></g></g><g transform="translate(78,142)"><g fill="#f6f3ee"><g transform="translate(1.29,77.92)"><path d="M20.56-33.45c2.84 0 5.23-.17 7.16-.52 1.93-.34 3.46-.88 4.59-1.62 1.14-.74 1.96-1.69 2.45-2.85.5-1.15.75-2.52.75-4.11h2.77v21.59h-2.77c0-1.58-.22-2.95-.67-4.11-.45-1.16-1.24-2.13-2.38-2.89-1.13-.77-2.66-1.35-4.59-1.75-1.92-.39-4.36-.59-7.31-.59v17.88c0 1.74.21 3.18.63 4.31.42 1.14 1.15 2.07 2.19 2.78 1.03.71 2.38 1.21 4.06 1.5 1.69.28 3.77.42 6.25.42 2.8 0 5.18-.2 7.13-.59 1.94-.39 3.58-1.07 4.89-2.02 1.32-.94 2.38-2.2 3.17-3.75.79-1.55 1.45-3.49 1.98-5.81h3l-1.19 15.58H3.56v-3c1.85-.05 3.33-.21 4.47-.47 1.13-.27 2.02-.72 2.64-1.36.63-.63 1.06-1.53 1.27-2.69.22-1.16.33-2.66.33-4.5v-36.86c0-1.84-.09-3.33-.28-4.47-.19-1.13-.56-2.03-1.11-2.69-.55-.66-1.36-1.11-2.42-1.34-1.05-.24-2.42-.41-4.11-.52v-3.02h45.72l.72 13.92h-2.77c-.32-2.1-.84-3.83-1.55-5.17-.71-1.34-1.68-2.41-2.92-3.2-1.24-.79-2.81-1.34-4.72-1.66-1.9-.32-4.19-.48-6.87-.48h-10.05c-.9 0-1.34.45-1.34 1.34z"/></g><g transform="translate(53.17,77.92)"><path d="M16.53-12.34c0 2.01.08 3.62.24 4.84.15 1.21.48 2.16.98 2.84.51.68 1.22 1.15 2.14 1.42.93.26 2.15.42 3.67.47v2.77H1.73v-2.77c1.58-.05 2.85-.22 3.8-.52.94-.29 1.69-.75 2.25-1.37.56-.63.93-1.52 1.11-2.66.19-1.13.28-2.62.28-4.47v-34.09c0-2.84-.04-5.23-.13-7.16-.07-1.93-.18-3.24-.34-3.92-.26-1.21-.88-2.03-1.86-2.44-.98-.43-2.73-.64-5.26-.64v-2.69l14.95-2.92z"/></g><g transform="translate(73.34,77.92)"><path d="M41.28-7.36c-4.48 5.44-10.04 8.16-16.69 8.16-3.1 0-5.92-.52-8.45-1.55-2.53-1.03-4.71-2.48-6.53-4.34-1.82-1.88-3.23-4.12-4.23-6.72s-1.5-5.5-1.5-8.67c0-3.22.52-6.2 1.58-8.94 1.06-2.74 2.55-5.08 4.47-7.03 1.93-1.96 4.22-3.49 6.88-4.59 2.66-1.1 5.58-1.66 8.75-1.66 5.11 0 9.07 1.39 11.86 4.16 2.8 2.76 4.2 6.72 4.2 11.89 0 .74-.15 1.19-.44 1.34-.29.16-.96.24-2.01.24H13.13c-.11.43-.19.95-.24 1.55-.05.6-.08 1.28-.08 2.01 0 2.74.33 5.23.98 7.48.67 2.24 1.62 4.15 2.86 5.74 1.24 1.57 2.71 2.8 4.42 3.67 1.72.87 3.63 1.3 5.74 1.3 2.22 0 4.27-.48 6.17-1.45 1.89-.98 3.84-2.58 5.84-4.8zM28.23-28.72c1.05 0 1.89-.02 2.53-.08.63-.05 1.11-.16 1.42-.31.32-.16.54-.38.64-.67.1-.29.16-.67.16-1.14 0-2.43-.78-4.37-2.34-5.81-1.55-1.46-3.67-2.19-6.36-2.19-5.7 0-9.23 3.4-10.59 10.21z"/></g></g></g></svg>;

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
    qtyUi:{appInputMode:"ITEM_FIRST_PICK",showItemListDefault:true,defaultAction:"PICK_ITEM",showGramFallback:true},
    noteElevia:"Les protéines maigres sont essentielles pour ta composition corporelle.",
    items:[
      {itemId:"blanc_dinde",foodLabel:"Blanc de dinde",isRecommended:true,stepper:{usualGPerUnit:1,usualUnitSg:"gramme",usualUnitPl:"grammes",unitStep:25,defaultUnits:150,minUnits:25,maxUnits:500},nutrientsPerUnit:{kcal:0.733,p:0.143,l:0.017,g:0.001}},
      {itemId:"blanc_poulet",foodLabel:"Blanc de poulet",isRecommended:true,stepper:{usualGPerUnit:1,usualUnitSg:"gramme",usualUnitPl:"grammes",unitStep:25,defaultUnits:150,minUnits:25,maxUnits:500},nutrientsPerUnit:{kcal:0.733,p:0.143,l:0.017,g:0.001}},
    ]},
  { eqId:"poissons_maigres",label:"Poissons maigres",eqMode:"F",type:"vvpo",eqGroupId:"protein_group",eqImportance:"key",icon:"🐟",
    nutrientsPerPortion:{kcal:95,p:20,l:1.5,g:0},qtyPlanGrams:150,
    qtyUi:{appInputMode:"ITEM_FIRST_PICK",showItemListDefault:true,defaultAction:"PICK_ITEM",showGramFallback:true},
    noteElevia:"Le poisson apporte des oméga-3.",items:[
      {itemId:"cabillaud",foodLabel:"Cabillaud",isRecommended:true,stepper:{usualGPerUnit:1,usualUnitSg:"gramme",usualUnitPl:"grammes",unitStep:25,defaultUnits:150,minUnits:25,maxUnits:500},nutrientsPerUnit:{kcal:0.633,p:0.133,l:0.01,g:0}},
    ]},
  { eqId:"oleagineux_nature",label:"Oléagineux",eqMode:"R",type:"fat",eqGroupId:"fat_group",eqImportance:"normal",icon:"🥜",
    nutrientsPerPortion:{kcal:90,p:3,l:7,g:2},qtyPlanGrams:15,
    qtyUi:{appInputMode:"ITEM_FIRST_PICK",showItemListDefault:true,defaultAction:"PICK_ITEM",showGramFallback:false},
    noteElevia:"Bonnes graisses, mais en quantité mesurée.",
    items:[
      {itemId:"amandes",foodLabel:"Amandes",isRecommended:true,stepper:{usualGPerUnit:1.2,usualUnitSg:"amande",usualUnitPl:"amandes",unitStep:5,defaultUnits:15,minUnits:0,maxUnits:40},nutrientsPerUnit:{kcal:7,p:0.23,l:0.54,g:0.15}},
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
    nutrientsPerPortion:{kcal:90,p:0.2,l:10,g:0.4},qtyPlanGrams:10,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Vinaigrette maison ou huile d'assaisonnement.",
    items:[
      {itemId:"huile_dolivecolza",foodLabel:"Huile olive/colza",isRecommended:true,qty1x:10,stepper:{usualGPerUnit:5,usualUnitSg:"c. à café",usualUnitPl:"c. à café",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"mayonnaise_colza_froid",foodLabel:"Mayonnaise colza",isRecommended:false,qty1x:12,stepper:{usualGPerUnit:12,usualUnitSg:"c. à soupe rase",usualUnitPl:"c. à soupe rases",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4}},
      {itemId:"mayonnaise_allegee_froid",foodLabel:"Mayonnaise allégée",isRecommended:false,qty1x:30,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"vinaigrette_vdm_ciboulette",foodLabel:"Vinaigrette Vandemoortele ciboulette",isRecommended:false,qty1x:30,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"vinaigrette_vdm_fh_allegee",foodLabel:"Vinaigrette Vandemoortele fines herbes allégée",isRecommended:false,qty1x:60,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:4,minUnits:0,maxUnits:8}},
      {itemId:"vinaigrette_tahini",foodLabel:"Vinaigrette tahini",isRecommended:true,qty1x:30,stepper:{usualGPerUnit:30,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_yaourt_grec",foodLabel:"Sauce yaourt grec",isRecommended:true,qty1x:56,stepper:{usualGPerUnit:56,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_yaourt",foodLabel:"Sauce au yaourt",isRecommended:true,qty1x:70,stepper:{usualGPerUnit:70,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_avocat_lime",foodLabel:"Sauce avocat-lime",isRecommended:false,qty1x:78,stepper:{usualGPerUnit:78,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"vinaigrette_moutarde_miel",foodLabel:"Vinaigrette moutarde miel",isRecommended:true,qty1x:38,stepper:{usualGPerUnit:38,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
    ]},
  { eqId:"assaisonnement_repas_chaud",label:"Assaisonnement chaud",eqMode:"F",type:"fat",eqGroupId:"fat_group",eqImportance:"flex",icon:"🧈",
    nutrientsPerPortion:{kcal:90,p:0,l:10,g:0},qtyPlanGrams:10,
    qtyUi:{appInputMode:"ITEM_UNIT_STEPPER",showItemListDefault:false,defaultAction:"LOG_1_PORTION",showGramFallback:false},noteElevia:"Noisette de beurre, filet d'huile ou sauce maison.",
    items:[
      {itemId:"huile_dolive",foodLabel:"Huile d'olive",isRecommended:true,qty1x:10,stepper:{usualGPerUnit:5,usualUnitSg:"c. à café",usualUnitPl:"c. à café",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"beurre",foodLabel:"Beurre",isRecommended:true,qty1x:12,stepper:{usualGPerUnit:12,usualUnitSg:"noisette",usualUnitPl:"noisettes",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4}},
      {itemId:"mayonnaise_colza",foodLabel:"Mayonnaise colza",isRecommended:false,qty1x:12,stepper:{usualGPerUnit:12,usualUnitSg:"c. à soupe rase",usualUnitPl:"c. à soupe rases",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:4}},
      {itemId:"mayonnaise_allegee",foodLabel:"Mayonnaise allégée",isRecommended:false,qty1x:30,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"creme_40",foodLabel:"Crème 40%",isRecommended:false,qty1x:25,stepper:{usualGPerUnit:12.5,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"creme_35",foodLabel:"Crème 35%",isRecommended:false,qty1x:30,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:2,minUnits:0,maxUnits:6}},
      {itemId:"creme_20",foodLabel:"Crème 20%",isRecommended:false,qty1x:50,stepper:{usualGPerUnit:15,usualUnitSg:"c. à soupe",usualUnitPl:"c. à soupe",unitStep:1,defaultUnits:3,minUnits:0,maxUnits:8}},
      {itemId:"bechamel_classique",foodLabel:"Béchamel classique",isRecommended:false,qty1x:80,stepper:{usualGPerUnit:80,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"jus_de_viande_au_beurre",foodLabel:"Jus de viande au beurre",isRecommended:false,qty1x:100,stepper:{usualGPerUnit:100,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_moutarde",foodLabel:"Sauce moutarde",isRecommended:true,qty1x:40,stepper:{usualGPerUnit:40,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_a_lamande",foodLabel:"Sauce à l'amande",isRecommended:false,qty1x:40,stepper:{usualGPerUnit:40,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_pesto",foodLabel:"Sauce pesto",isRecommended:true,qty1x:24,stepper:{usualGPerUnit:24,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_aux_herbes_et_ricotta",foodLabel:"Sauce herbes et ricotta",isRecommended:false,qty1x:68,stepper:{usualGPerUnit:68,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_miso_et_sesame",foodLabel:"Sauce miso et sésame",isRecommended:false,qty1x:44,stepper:{usualGPerUnit:44,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
      {itemId:"sauce_tomatee",foodLabel:"Sauce tomatée",isRecommended:true,qty1x:100,stepper:{usualGPerUnit:100,usualUnitSg:"portion",usualUnitPl:"portions",unitStep:1,defaultUnits:1,minUnits:0,maxUnits:2}},
    ]},
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
  { eqId:"alcool_leger_1u",label:"Alcool léger",eqMode:"R",type:"alcohol",eqGroupId:null,eqImportance:"flex",icon:"🍷",
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

const DEFAULT_TYPE_LABELS = {carbs:"Féculents",vvpo:"Protéines",fat:"Matières grasses",dairy:"Produits laitiers",fruits:"Fruits",veg:"Légumes",extras:"Extras / Plaisir",drinks:"Boissons",alcohol:"Boissons"};

function _getEq(catalogue,eqId){return catalogue.find(e=>e.eqId===eqId)}
function _isInPlan(planTargets,eqId){return eqId in planTargets}
function _getLogLabel(catalogue,eqId,itemId){
  if(typeof eqId==='string'&&eqId.startsWith('ql_'))return eqId.slice(3).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
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

const eqIconFile=(eqId)=>({pain:'pain',cereales_ig_modere:'cereales',feculents_chauds:'feculents',fruits_natures:'fruits',legumes_cuits:'legumes_cuits',legumes_crus:'legumes_crus',viandes_faibles_kcal:'Viandes_maigres',poissons_maigres:'poissons_maigres',poissons_gras:'poissons-gras-a',oleagineux_nature:'oleagineux',pl_0_riche_p:'lait_riche_en_p',pl_50_100_kcal:'Laitages_classique',fromages_20_30_mg:'fromages',assaisonnement_repas_froid:'assaisonnement_chaud_froid',assaisonnement_repas_chaud:'assaisonnement_chaud_froid',mg_cuisson:'matière_grasse_cuisson',mg_tartinables:'beurre',garnitures_sucrees_pain:'garniture_sucree_bowl',chocolat_noir_mt70:'chocolat',charcuteries_maigres:'viande_elevee_kcal',alcool_leger_1u:'alcool_leger',extras_except_patisserie:'extra_pdj',patisserie:'patisserie',oeufs:'Oeuf',legumineuses:'legumineuses',laits_vegetaux:'laits_vegetaux',graines:'graines',fruits_secs:'fruits_secs',soupes:'soupes',avocat:'avocat',poudre_proteine:'poudre_protéine',poissons_conserve:'Poisson_conserve',cafe_the:'café',eau:'eau',viandes_moderees_kcal:'viande_moderee_kcal',viandes_elevees_kcal:'viande_elevee_kcal',garnitures_sucrees_pl_bowls:'garniture_sucree_bowl',garniture_vegetales_legumes:'garniture_vegetales_legumes',garnitures_tartinables:'garnitures_tartinables',alcool_fort:'alcool_fort',alcool_mix:'alcool_mix',garnitures_sucrees_grasses:'garniture_sucree_grasse'})[eqId]||null;
const EQ_ICONS={pain:IcBread,fruits_natures:IcApple,oleagineux_nature:IcAcorn,pl_0_riche_p:IcBottle,pl_50_100_kcal:IcBottle,fromages_20_30_mg:IcBottle,viandes_faibles_kcal:IcDrumstick,legumes_crus:IcCarrot};
function EqIcon({eqId,size=18,color}){const obj=useObjective();const c=color||obj.accent;const Ic=EQ_ICONS[eqId];if(Ic)return <Ic size={size} color={c}/>;const f=eqIconFile(eqId);if(f)return <img src={`/icons/${f}.svg`} alt="" width={size} height={size} style={{opacity:.7}}/>;const {getEq}=useHelpers();const eq=getEq(eqId);const icon=eq?.icon;return <span style={{fontSize:size,lineHeight:1}}>{icon&&!icon.endsWith('.svg')?icon:"•"}</span>}

/* ═══ CSS ═══ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
:root{--accent:#C6A05B;--accent-soft:rgba(198,160,91,.12);--accent-border:rgba(198,160,91,.22);--accent-border-strong:rgba(198,160,91,.34);--accent-line:rgba(198,160,91,.55);--navy:#121E2D;--bg:#F5F4F1;--text:#1A1A1A;--text-muted:#6B7280;--text-faint:rgba(15,30,46,.50);--green:#34C759;--orange:#E8863A;--red:#FF3B30;--hairline:rgba(15,30,46,.10)}
*{margin:0;padding:0;box-sizing:border-box}*:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
html,body,#root{height:100%;-webkit-text-size-adjust:100%;background:var(--navy);margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','DM Sans',system-ui,sans-serif;background:var(--navy);overflow:hidden;line-height:1.5;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}
.app-shell{position:fixed;inset:0;width:100%;height:100%;background:var(--bg);display:flex;flex-direction:column;overflow:clip}
.hdr{background:var(--navy);padding:13px 16px;border-bottom:1px solid var(--accent-line);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;padding-top:max(env(safe-area-inset-top,0px) + 13px, 13px);transition:box-shadow .3s ease}
.hdr.scrolled{box-shadow:0 4px 20px rgba(0,0,0,.3)}
.hdr-logo{font-size:20px;font-weight:700;letter-spacing:2px;color:var(--accent);font-style:italic}
.hdr-back{background:none;border:none;color:var(--accent);font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.content{flex:1;overflow-y:auto;overflow-x:clip;padding-bottom:calc(110px + env(safe-area-inset-bottom,16px));-webkit-font-smoothing:antialiased}.content::-webkit-scrollbar{display:none}
.variant-scroll{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}.variant-scroll::-webkit-scrollbar{display:none}
.tbar{position:absolute;bottom:0;left:12px;right:12px;margin-bottom:max(8px, calc(env(safe-area-inset-bottom,8px) - 16px));background:#121E2D;border:1px solid rgba(198,160,91,.30);border-radius:22px;display:flex;height:auto;padding:10px 4px;box-shadow:0 4px 20px rgba(0,0,0,.35),0 1px 6px rgba(0,0,0,.2);z-index:50}
.tbar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding-top:6px;cursor:pointer;background:none;border:none;font-family:inherit}
.tbar-ic{font-size:22px;line-height:1}.tbar-lb{font-size:10px;font-weight:600}
.tbar-item.active .tbar-lb{color:var(--accent)}.tbar-item:not(.active) .tbar-lb{color:rgba(255,255,255,.65)}.tbar-item:not(.active) .tbar-ic{opacity:.7}
.page{padding:16px 18px 24px}.page-title{font-size:26px;font-weight:700;color:var(--text);font-family:'Cormorant Garamond',serif;letter-spacing:-.02em}.page-meta{font-size:12px;font-weight:500;color:var(--text-muted);margin-top:3px;margin-bottom:2px}
.seg{display:flex;background:rgba(15,30,46,.07);border-radius:9px;padding:2px;margin:12px 0 10px;position:relative;overflow:hidden}
.seg-pill{position:absolute;top:2px;bottom:2px;border-radius:7px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.1),0 1px 1px rgba(0,0,0,.06);transition:left .3s cubic-bezier(.4,0,.2,1),width .3s cubic-bezier(.4,0,.2,1);z-index:0;pointer-events:none}
.seg-btn{flex:1;padding:7px 0;border-radius:7px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;color:rgba(15,30,46,.45);background:transparent;transition:color .25s cubic-bezier(.4,0,.2,1);position:relative;z-index:1}
.seg-btn.active{color:#1A1A1A}
.seg-btn:active{transform:scale(.96)}
.card{background:#fff;border:none;border-radius:16px;padding:18px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 14px rgba(0,0,0,.04)}
.card-title{font-size:16px;font-weight:600;color:#1A1A1A}
.card-link{font-size:13px;font-weight:600;color:var(--accent);margin-top:8px;cursor:pointer}
.pbar-track{height:8px;background:rgba(15,30,46,.06);border-radius:99px;overflow:hidden}
.pbar-fill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)}
.pbar-accent{background:linear-gradient(90deg,var(--accent),var(--accent))}.pbar-green{background:var(--green)}.pbar-orange{background:var(--orange)}
.macros{display:flex;gap:8px;margin-top:12px}
.macro-pill{flex:1;background:rgba(15,30,46,.025);border:1px solid rgba(15,30,46,.06);border-radius:12px;padding:9px 6px;text-align:center}
.macro-letter{font-size:10px;font-weight:600;color:rgba(15,30,46,.35);text-transform:uppercase}.macro-val{font-size:15px;font-weight:700;color:#1A1A1A;margin-top:1px}.macro-target{font-size:10px;color:rgba(15,30,46,.3);margin-top:1px}
.slot{background:#fff;border:none;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 2px 10px rgba(0,0,0,.03)}
.slot-header{display:flex;justify-content:space-between;align-items:center}.slot-left{display:flex;align-items:center;gap:8px}
.slot-name{font-size:16px;font-weight:600;color:#1A1A1A}.slot-time{font-size:12px;color:rgba(15,30,46,.45)}
.slot-add{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--accent);font-weight:700;cursor:pointer}
.log-item{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-top:1px solid rgba(15,30,46,.06);transition:opacity .2s ease,transform .2s ease}
.log-item:active{opacity:.7;transform:scale(.98)}
.log-item:first-child{border-top:none}
.log-name{font-size:13px;font-weight:700;color:#1A1A1A}.log-detail{font-size:11px;color:rgba(15,30,46,.50);margin-top:1px}.log-kcal{font-size:12px;font-weight:700;color:#1A1A1A}
.chip-hp{display:inline-block;font-size:9px;font-weight:700;background:rgba(232,134,58,.12);color:#E8863A;padding:2px 7px;border-radius:99px;margin-left:6px}
.eq-card{background:#fff;border:none;border-radius:16px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 2px 10px rgba(0,0,0,.03);cursor:pointer}
.eq-body{flex:1}.eq-name{font-size:15px;font-weight:600;color:#1A1A1A}.eq-progress{font-size:13px;color:#6B7280;margin-top:2px}
.eq-bar{height:6px;background:rgba(15,30,46,.06);border-radius:99px;margin-top:6px;overflow:hidden}
.eq-bar-fill{height:100%;border-radius:99px;transition:width .6s}
.eq-add-btn{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--accent);cursor:pointer}
.advice-item{background:#fff;border:none;border-radius:16px;padding:18px;margin-bottom:12px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.06),0 2px 10px rgba(0,0,0,.03)}
.advice-title{font-size:16px;font-weight:600;color:#1A1A1A;line-height:1.3}.advice-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;align-items:center}
.badge{display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px}
.badge-pri{background:var(--accent-soft);color:var(--accent)}.badge-sec{background:rgba(107,130,153,.1);color:#6B8299}
.badge-st{background:rgba(15,30,46,.06);color:#6B7280}.badge-al{background:var(--accent-soft);color:var(--accent)}
.badge-unread{background:var(--accent);color:#fff}.badge-read{background:rgba(52,199,89,.12);color:#34C759}
.tip-banner{background:linear-gradient(135deg,var(--accent-soft),rgba(198,160,91,.04));border:none;border-radius:16px;padding:16px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start}
.tip-text{font-size:13px;color:#1A1A1A;line-height:1.5;flex:1}
.section-label{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 12px;padding-bottom:6px;border-bottom:1px solid rgba(15,30,46,.08)}
.alert-card{border-radius:16px;padding:16px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start}
.alert-soft{background:var(--accent-soft);border:1px solid var(--accent-border)}
.alert-title{font-size:13px;font-weight:700;color:#1A1A1A}.alert-msg{font-size:12px;color:#6B7280;margin-top:3px;line-height:1.4}
.alert-link{font-size:12px;font-weight:700;color:var(--accent);margin-top:6px;cursor:pointer}
.search{width:100%;padding:10px 14px;border-radius:12px;border:1px solid rgba(15,30,46,.10);background:rgba(15,30,46,.03);font-size:14px;color:#1A1A1A;font-family:inherit;margin-bottom:12px;outline:none}
.search:focus{border-color:var(--accent-border-strong);box-shadow:0 0 0 3px rgba(198,160,91,.12);transition:border-color .15s ease,box-shadow .2s ease}
.flex-between{display:flex;justify-content:space-between;align-items:center}.mt8{margin-top:8px}.mt12{margin-top:12px}
.day-hint{font-size:11px;color:rgba(15,30,46,.50);text-align:center;font-style:italic;margin:4px 0 10px}
.overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-end;animation:overlayIn .25s ease-out;-webkit-transform:translateZ(0);transform:translateZ(0);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
@keyframes overlayIn{from{opacity:0;backdrop-filter:blur(0);-webkit-backdrop-filter:blur(0)}to{opacity:1;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}}
.modal{background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;margin:0 auto;max-height:90dvh;max-height:90vh;overflow-y:auto;padding:20px 18px calc(30px + env(safe-area-inset-bottom,16px));animation:sheetUp .35s cubic-bezier(.32,1.2,.54,1);box-shadow:0 -8px 40px rgba(0,0,0,.15),0 -2px 10px rgba(0,0,0,.06)}
@keyframes sheetUp{0%{transform:translateY(100%)}60%{transform:translateY(-2%)}100%{transform:translateY(0)}}
.modal-handle{width:44px;height:5px;background:#E0E2E6;border-radius:99px;margin:0 auto 18px}
.modal-title{font-size:20px;font-weight:700;color:var(--text);margin-bottom:6px;font-family:'Cormorant Garamond',serif;line-height:1.3}
.modal-sub{font-size:13px;color:#6B7280;margin-bottom:16px;line-height:1.4}
.modal-section{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.4px;margin:14px 0 8px}
.modal-tabs{display:flex;background:#E5E7EB;border-radius:10px;padding:3px;margin-bottom:12px;position:relative;overflow:hidden}
.modal-tab{flex:1;padding:8px;border-radius:8px;text-align:center;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;color:#6B7280;background:transparent;transition:color .2s ease;position:relative;z-index:1}
.modal-tab.active{color:#1A1A1A}
.modal-tab-pill{position:absolute;top:3px;bottom:3px;border-radius:8px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);transition:left .3s cubic-bezier(.4,0,.2,1),width .3s cubic-bezier(.4,0,.2,1);z-index:0;pointer-events:none}
.item-row{display:flex;align-items:center;gap:10px;padding:10px;background:#F5F4F1;border-radius:12px;margin-bottom:6px;cursor:pointer;border:1px solid transparent}
.item-row:hover,.item-row.selected{border-color:var(--accent-border);background:var(--accent-soft)}
.item-label{font-size:14px;font-weight:600;color:#1A1A1A;flex:1}.item-detail{font-size:11px;color:#6B7280}
.stepper{display:flex;align-items:center;justify-content:center;gap:16px;margin:16px 0}
.stepper-btn{width:44px;height:44px;border-radius:99px;background:var(--accent-soft);border:1px solid var(--accent-border);font-size:20px;font-weight:700;color:var(--accent);cursor:pointer;display:flex;align-items:center;justify-content:center}
.stepper-btn:disabled{opacity:.3;cursor:not-allowed}.stepper-btn:disabled:active{transform:none!important}
.stepper-val{font-size:24px;font-weight:700;color:#1A1A1A;min-width:80px;text-align:center;transition:transform .15s cubic-bezier(.34,1.4,.64,1);line-height:1.2}
.stepper-unit{font-size:12px;color:#6B7280;text-align:center;margin-top:2px}
.live-calc{background:rgba(15,30,46,.03);border-radius:12px;padding:10px;text-align:center;margin:8px 0}
.live-main{font-size:13px;font-weight:600;color:#1A1A1A}.live-sub{font-size:11px;color:#6B7280;margin-top:2px}
.btn-primary{width:100%;padding:14px;border-radius:14px;background:var(--accent);color:#fff;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:inherit}
.btn-text{background:none;border:none;color:var(--accent);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:10px;display:block;text-align:center;width:100%}
.snackbar{position:absolute;bottom:110px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#121E2D 0%,#1A2E40 100%);color:var(--accent);padding:11px 24px;border-radius:99px;font-size:13px;font-weight:700;z-index:300;animation:snackPop .45s cubic-bezier(.34,1.56,.64,1);box-shadow:0 4px 24px rgba(0,0,0,.3),0 0 0 1px rgba(198,160,91,.15);white-space:nowrap;letter-spacing:.01em}
@keyframes snackPop{0%{transform:translateX(-50%) translateY(16px) scale(.95);opacity:0}40%{transform:translateX(-50%) translateY(-4px) scale(1.03)}70%{transform:translateX(-50%) translateY(1px) scale(.99)}100%{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
@keyframes milestoneIn{0%{transform:scale(.6) translateY(20px);opacity:0}60%{transform:scale(1.05) translateY(-4px)}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes splashLogo{from{opacity:0;transform:scale(.8) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes splashTag{from{opacity:0;transform:translateY(8px)}60%{opacity:0}to{opacity:1;transform:translateY(0)}}
@keyframes cardIn{0%{opacity:0;transform:translateY(14px) scale(.97)}60%{opacity:1;transform:translateY(-2px) scale(1.005)}100%{transform:translateY(0) scale(1)}}
@keyframes tabEnter{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
@keyframes screenSlideIn{0%{opacity:0;transform:translateX(30px)}100%{opacity:1;transform:translateX(0)}}
@keyframes greetIn{0%{opacity:0;transform:translateY(-6px)}100%{opacity:1;transform:translateY(0)}}
.screen-slide{animation:screenSlideIn .3s cubic-bezier(.25,.46,.45,.94) both}
@keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(198,160,91,0),0 0 0 0 rgba(198,160,91,0)}50%{box-shadow:0 0 0 5px rgba(198,160,91,.08),0 0 12px 2px rgba(198,160,91,.06)}}
@keyframes ringGlow{0%{filter:drop-shadow(0 0 0px transparent)}50%{filter:drop-shadow(0 0 10px var(--accent))}100%{filter:drop-shadow(0 0 0px transparent)}}
@keyframes successPop{0%{transform:scale(1)}30%{transform:scale(1.08)}60%{transform:scale(.97)}100%{transform:scale(1)}}
@keyframes barGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.tab-content{animation:tabEnter .28s ease-out both}
.slot,.card,.advice-item,.eq-card,.alert-card,.tip-banner{animation:cardIn .4s cubic-bezier(.34,1.4,.64,1) both}
.slot:nth-child(1),.card:nth-child(1){animation-delay:0s}
.slot:nth-child(2),.card:nth-child(2){animation-delay:.05s}
.slot:nth-child(3),.card:nth-child(3){animation-delay:.1s}
.slot:nth-child(4),.card:nth-child(4){animation-delay:.15s}
.slot:nth-child(5),.card:nth-child(5){animation-delay:.2s}
.slot:nth-child(6),.card:nth-child(6){animation-delay:.25s}
.pbar-fill{transform-origin:left;animation:barGrow .7s cubic-bezier(.4,0,.2,1) both}
.greet-in{animation:greetIn .5s ease-out both}
.success-pop{animation:successPop .35s cubic-bezier(.34,1.4,.64,1)}
.tbar-item{position:relative;transition:transform .15s ease}
.tbar-item:active{transform:scale(.88)}
.tbar-item.active::before{content:'';position:absolute;top:-2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:2px;background:var(--accent);animation:fadeIn .2s ease-out}
.btn-primary{transition:transform .15s cubic-bezier(.34,1.4,.64,1),box-shadow .15s ease}.btn-primary:active{transform:scale(.95);box-shadow:0 2px 8px rgba(198,160,91,.25)}
.slot-add{transition:transform .15s cubic-bezier(.34,1.4,.64,1)}.slot-add:active{transform:scale(.85)}
.slot-add:not(:active){animation:breathe 2.5s ease-in-out infinite}
.eq-add-btn{transition:transform .15s cubic-bezier(.34,1.4,.64,1)}.eq-add-btn:active{transform:scale(.85)}
.eq-card,.advice-item,.menu-item{transition:transform .15s cubic-bezier(.34,1.4,.64,1),box-shadow .15s ease}.eq-card:active,.advice-item:active,.menu-item:active{transform:scale(.975);box-shadow:0 2px 10px rgba(0,0,0,.1)}
.stepper-btn{transition:transform .12s cubic-bezier(.34,1.4,.64,1)}.stepper-btn:active:not(:disabled){transform:scale(.85)}
.item-row{transition:all .15s ease}.item-row.selected{animation:successPop .25s cubic-bezier(.34,1.4,.64,1)}
@media(hover:hover){.eq-card:hover,.menu-item:hover,.advice-item:hover{box-shadow:0 4px 16px rgba(0,0,0,.1),0 1px 4px rgba(0,0,0,.06);transform:translateY(-1px)}.item-row:hover{background:rgba(198,160,91,.04);border-color:var(--accent-border)}}
.snackbar{cursor:pointer}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}.btn-primary:disabled:active{transform:none!important;box-shadow:none!important}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.skeleton{background:linear-gradient(90deg,rgba(15,30,46,.06) 25%,rgba(15,30,46,.10) 50%,rgba(15,30,46,.06) 75%);background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:8px}
.macro-glow{box-shadow:inset 0 0 0 1px rgba(52,199,89,.2),0 0 8px rgba(52,199,89,.08)!important;border-color:rgba(52,199,89,.25)!important}
@keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(255,59,48,.4)}50%{box-shadow:0 0 0 4px rgba(255,59,48,.1)}}.badge-pulse{animation:badgePulse 2s ease-in-out infinite}
@keyframes sparkle{0%{transform:scale(0) rotate(0deg);opacity:0}50%{opacity:1}100%{transform:scale(1) rotate(180deg);opacity:0}}
@keyframes viewSwitch{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}.view-switch{animation:viewSwitch .25s ease-out both}
@keyframes checkPop{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}.check-pop{animation:checkPop .25s cubic-bezier(.34,1.4,.64,1)}
@keyframes skeletonPulse{0%,100%{opacity:.6}50%{opacity:1}}.skeleton-row{display:flex;gap:10px;margin-bottom:6px}.skeleton-block{border-radius:12px;background:linear-gradient(90deg,rgba(15,30,46,.05) 25%,rgba(15,30,46,.09) 50%,rgba(15,30,46,.05) 75%);background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite}
@keyframes emptyFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.empty-icon{animation:emptyFloat 3s ease-in-out infinite}
.eq-cat-header{font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.3px;margin:12px 0 6px;padding-left:4px}
.profile-card{background:linear-gradient(135deg,#121E2D,#1A2E40);border-radius:16px;padding:18px;color:#fff;margin-bottom:14px}
.kpi-row{display:flex;gap:8px;margin-top:12px}
.kpi-box{flex:1;background:rgba(255,255,255,.1);border-radius:12px;padding:10px;text-align:center}
.kpi-label{font-size:10px;font-weight:600;color:rgba(255,255,255,.6);text-transform:uppercase}
.kpi-val{font-size:18px;font-weight:700;color:#fff;margin-top:4px}.kpi-delta{font-size:11px;color:var(--accent);margin-top:2px}
.menu-item{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border-radius:16px;margin-bottom:8px;cursor:pointer;border:none;box-shadow:0 1px 3px rgba(0,0,0,.06),0 2px 10px rgba(0,0,0,.03)}
.bilan-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(15,30,46,.10)}
.bilan-score{width:48px;height:48px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700}
`;

/* ═══ COMPONENTS ═══ */

/* Haptic feedback — subtle vibration on key actions */
const haptic=(ms=10)=>{try{navigator?.vibrate?.(ms)}catch{}};

/* Animated number — counts up/down like Apple Health */
function AnimNum({value,duration=500,suffix="",prefix="",style={}}){
  const [display,setDisplay]=useState(value);
  const prev=useRef(value);
  const raf=useRef(null);
  useEffect(()=>{
    const from=prev.current;const to=value;
    if(from===to)return;
    const start=performance.now();
    const step=(now)=>{
      const t=Math.min((now-start)/duration,1);
      const ease=1-Math.pow(1-t,3); // ease-out cubic
      setDisplay(Math.round(from+(to-from)*ease));
      if(t<1)raf.current=requestAnimationFrame(step);
    };
    raf.current=requestAnimationFrame(step);
    prev.current=to;
    return()=>{if(raf.current)cancelAnimationFrame(raf.current)};
  },[value,duration]);
  return <span style={style}>{prefix}{display}{suffix}</span>;
}

/* Segmented control with sliding pill */
function Seg({options,value,onChange,tourId}){
  const idx=options.findIndex(o=>o.id===value);
  const count=options.length;
  return <div className="seg" data-tour={tourId}>
    <div className="seg-pill" style={{left:`calc(${idx*(100/count)}% + 2px)`,width:`calc(${100/count}% - 4px)`}}/>
    {options.map(o=><button key={o.id} className={`seg-btn ${value===o.id?"active":""}`} onClick={()=>onChange(o.id)}>{o.label}</button>)}
  </div>
}

/* Skeleton loader rows */
function SkeletonRows({rows=3,h=42}){
  return <div style={{padding:"8px 0"}}>{Array.from({length:rows},(_,i)=><div key={i} className="skeleton-row" style={{animationDelay:`${i*.08}s`}}>
    <div className="skeleton-block" style={{width:42,height:h,flexShrink:0}}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6,justifyContent:"center"}}>
      <div className="skeleton-block" style={{height:12,width:`${70+Math.random()*20}%`}}/>
      <div className="skeleton-block" style={{height:9,width:`${40+Math.random()*25}%`}}/>
    </div>
  </div>)}</div>
}

function PBar({value,max,height=8}){
  const obj=useObjective();
  const pct=max>0?Math.min(value/max*100,150):0;
  let c;
  if(obj.progressDir==='up'){
    // GAIN: <80% = orange (not enough), ≥100% = green, between = accent
    c=pct<(obj.pbarOrangeBelow||80)?"pbar-orange":pct>=100?"pbar-green":"pbar-accent";
  } else if(obj.progressDir==='neutral'){
    // MAINT: >120% or <80% = orange (too far either way), 95-105% = green, rest = accent
    c=pct>(obj.pbarOrangeAbove||120)?"pbar-orange":pct<(obj.pbarOrangeBelow||80)?"pbar-orange":pct>=95&&pct<=105?"pbar-green":"pbar-accent";
  } else {
    // PW: >120% = orange (too much), ≥100% = green, <100% = accent
    c=pct>(obj.pbarOrangeAbove||120)?"pbar-orange":pct>=100?"pbar-green":"pbar-accent";
  }
  return <div className="pbar-track" style={{height}}><div className={`pbar-fill ${c}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
}
function MPill({letter,value,target}){
  const pct=target>0?value/target:0;
  const inZone=pct>=0.9&&pct<=1.1;
  return <div className={`macro-pill${inZone?" macro-glow":""}`}><div className="macro-letter">{letter}</div><div className="macro-val"><AnimNum value={Math.round(value)} duration={400}/></div><div className="macro-target">/ {Math.round(target)}</div></div>
}

/* ═══ APERO SESSION ═══ */
function AperoSession({slotId,onClose,onBack,onLog,quickLog}){
  const obj=useObjective();
  const [items,setItems]=useState([]); // [{...item, checked:false, selectedPortion:null}]
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);

  // Load APERO items when quickLog becomes available
  useEffect(()=>{
    if(!quickLog)return;
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const data=await quickLog.fetchAperoItems();
      if(cancelled)return;
      const mapped=(data||[]).map(it=>{
        const portions=(it.ql_item_portions||[]).sort((a,b)=>{
          const order={S:0,DEMI:0,M:1,REGULAR:1,BOUTEILLE:1,L:2,PINTE:2};
          return (order[a.option_key]??5)-(order[b.option_key]??5);
        });
        const defaultP=portions.find(p=>p.option_key==='M'||p.option_key==='REGULAR'||p.option_key==='DEMI')||portions[0];
        return{
          item_id:it.id,slug:it.slug,label:it.label,
          portions,flags:(it.ql_flags||[]).map(f=>f.flag_key),
          checked:false,selectedPortion:defaultP||null,qty:1,
        };
      });
      setItems(mapped);
      setLoading(false);
    })();
    return()=>{cancelled=true};
  },[quickLog]);

  function toggle(idx){
    setItems(prev=>prev.map((it,i)=>i===idx?{...it,checked:!it.checked}:it));
  }
  function setPortion(idx,p){
    setItems(prev=>prev.map((it,i)=>i===idx?{...it,selectedPortion:p}:it));
  }
  function setQty(idx,q){
    setItems(prev=>prev.map((it,i)=>i===idx?{...it,qty:Math.max(1,Math.min(10,q))}:it));
  }

  const checked=items.filter(it=>it.checked);
  const totalKcal=checked.reduce((s,it)=>s+Number(it.selectedPortion?.kcal||0)*it.qty,0);
  const totalP=checked.reduce((s,it)=>s+Number(it.selectedPortion?.p||0)*it.qty,0);
  const totalL=checked.reduce((s,it)=>s+Number(it.selectedPortion?.l||0)*it.qty,0);
  const totalG=checked.reduce((s,it)=>s+Number(it.selectedPortion?.g||0)*it.qty,0);

  async function submitAll(){
    if(checked.length===0||submitting||!quickLog)return;
    setSubmitting(true);
    for(const it of checked){
      const p=it.selectedPortion;if(!p)continue;
      const kcal=Number(p.kcal)*it.qty;
      const prot=Number(p.p)*it.qty;
      const lip=Number(p.l)*it.qty;
      const glu=Number(p.g)*it.qty;
      const {data:qlData}=await quickLog.submitQuickLog({
        slotId,qlItemId:it.item_id,optionKey:p.option_key,
        labelSnapshot:it.label,
        portionLabelSnapshot:`${it.qty}x ${p.label_short||p.option_key}`,
        kcal,p:prot,l:lip,g:glu,
        flagsSnapshot:it.flags,slotStatus:'REPLACED',
      });
      onLog({
        id:qlData?.id||crypto.randomUUID(),slotId,eqId:`ql_${it.slug}`,itemId:null,
        nbUnits:it.qty,qtyPortion:it.qty,isOutOfPlan:true,qlLabel:it.label,
        kcal:Math.round(kcal),p:Math.round(prot*10)/10,l:Math.round(lip*10)/10,g:Math.round(glu*10)/10,
      });
    }
    setSubmitting(false);
    onClose();
  }

  // Group items by sub-type for visual clarity
  const groups={};
  items.forEach(it=>{
    const isAlcohol=it.flags?.some(f=>f==='alcool');
    const key=isAlcohol?'Boissons':'A grignoter';
    if(!groups[key])groups[key]=[];
    groups[key].push(it);
  });

  return(
  <SwipeModal onClose={onClose} style={{maxHeight:"85vh"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <button aria-label="Retour" className="hdr-back" onClick={onBack||onClose} style={{padding:0}}>← Retour</button>
    </div>
    <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}>Session apéro
      <span style={{fontSize:10,fontWeight:700,color:"#E8863A",background:"rgba(232,134,58,.08)",padding:"2px 8px",borderRadius:99}}>Quick</span>
    </div>
    <div className="modal-sub" style={{marginBottom:10}}>Coche ce que tu as pris, ajuste si besoin</div>

    {loading&&<SkeletonRows rows={4} h={36}/>}

    {!loading&&items.length===0&&<div style={{textAlign:"center",padding:"32px 16px"}}>
      <div style={{fontSize:32,marginBottom:10}}>🍻</div>
      <div style={{fontSize:14,fontWeight:600,color:"#1A1A1A",marginBottom:6}}>Pas encore d'items apéro</div>
      <div style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>Les items apéro seront bientôt disponibles.<br/>En attendant, utilise la recherche pour logger tes consommations.</div>
    </div>}

    {!loading&&Object.entries(groups).map(([groupName,groupItems])=><div key={groupName}>
      <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,marginTop:10}}>{groupName}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
      {groupItems.map(it=>{
        const idx=items.indexOf(it);
        return <div key={it.item_id} style={{
          gridColumn:it.checked?"1 / -1":undefined,
          padding:"8px 10px",marginBottom:0,borderRadius:12,cursor:"pointer",
          background:it.checked?"rgba(232,134,58,.06)":"rgba(15,30,46,.02)",
          border:`1px solid ${it.checked?"rgba(232,134,58,.25)":"rgba(15,30,46,.06)"}`,
          transition:"all .15s",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8}} onClick={()=>{haptic(6);toggle(idx)}}>
            <div className={it.checked?"check-pop":""} style={{width:20,height:20,borderRadius:6,border:`2px solid ${it.checked?"#E8863A":"rgba(15,30,46,.15)"}`,background:it.checked?"#E8863A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
              {it.checked&&<span style={{color:"#fff",fontSize:12,fontWeight:700,lineHeight:1}}>✓</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#1A1A1A"}}>{it.label}</div>
            </div>
            {it.checked&&<span style={{fontSize:11,fontWeight:700,color:"#E8863A",flexShrink:0}}>{Math.round(Number(it.selectedPortion?.kcal||0)*it.qty)} kcal</span>}
          </div>
          {it.checked&&<div style={{marginTop:6,marginLeft:28,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {it.portions.map(p=><button key={p.option_key} onClick={()=>setPortion(idx,p)} style={{
              padding:"3px 8px",borderRadius:99,fontSize:10,fontWeight:700,
              background:it.selectedPortion?.option_key===p.option_key?"rgba(232,134,58,.15)":"#F5F4F1",
              border:`1px solid ${it.selectedPortion?.option_key===p.option_key?"rgba(232,134,58,.3)":"rgba(15,30,46,.08)"}`,
              color:it.selectedPortion?.option_key===p.option_key?"#E8863A":"#6B7280",
              cursor:"pointer",fontFamily:"inherit",
            }}>{p.label_short||p.option_key}</button>)}
            {it.portions.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,marginLeft:4}}>
              <button onClick={()=>setQty(idx,it.qty-1)} disabled={it.qty<=1} style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(15,30,46,.1)",background:"#F5F4F1",fontSize:13,fontWeight:700,cursor:"pointer",color:"#6B7280",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",opacity:it.qty<=1?.4:1}}>−</button>
              <span style={{fontSize:12,fontWeight:700,color:"#1A1A1A",minWidth:16,textAlign:"center"}}>{it.qty}</span>
              <button onClick={()=>setQty(idx,it.qty+1)} disabled={it.qty>=10} style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(15,30,46,.1)",background:"#F5F4F1",fontSize:13,fontWeight:700,cursor:"pointer",color:"#6B7280",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>+</button>
            </div>}
          </div>}
        </div>
      })}
      </div>
    </div>)}

    {/* Sticky footer with total */}
    {checked.length>0&&<div style={{position:"sticky",bottom:0,background:"#fff",paddingTop:10,borderTop:"1px solid rgba(15,30,46,.06)",marginTop:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,fontWeight:600,color:"#6B7280"}}>{checked.length} item{checked.length>1?"s":""}</span>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#E8863A"}}>{Math.round(totalKcal)} kcal</div>
          <div style={{fontSize:10,color:"#6B7280"}}>P{Math.round(totalP)} L{Math.round(totalL)} G{Math.round(totalG)}</div>
        </div>
      </div>
      <button className="btn-primary" onClick={submitAll} disabled={submitting} style={{opacity:submitting?.6:1}}>
        {submitting?"Enregistrement...":"Valider la session"}
      </button>
    </div>}
  </SwipeModal>);
}

/* resolveProfileBracket: find the right bracket label for N grams in a profile's rules.
   Returns { label, grams } or null. */
function resolveProfileBracket(rules, grams){
  if(!rules||!rules.length||!grams)return null;
  const match=rules.find(r=>{
    const min=Number(r.min_g)||0;
    const max=Number(r.max_g)||9999;
    return grams>=min&&grams<=max;
  });
  if(match)return{label:match.usual_unit_sg||'',grams:Number(match.usual_g_per_unit)};
  const last=rules[rules.length-1];
  if(last&&grams>=(Number(last.min_g)||0))return{label:last.usual_unit_sg||'',grams:Number(last.usual_g_per_unit)};
  return null;
}

/* fmtItemQty: format display for an item given total grams.
   profileRulesMap = PROFILE_RULES from data context (all profiles).
   - PROFILE items (digit-prefixed label or profileId): resolve bracket
   - FIXED items: grams / usualGPerUnit → "N unité(s)" */
/* Convert grams to c. à soupe (15ml ≈ 15g) or c. à café (5g) — assaisonnement fallback */
function gramsToCas(g){
  if(!g||g<=0)return'—';
  // Sauces recettes (>20g) → "portion"
  if(g>20){return`1 portion (${Math.round(g)}g)`;}
  // Condiments — cuillères
  const cas=g/15;
  if(cas>=1){const r=Math.round(cas);return`${r} c.à s. (${Math.round(g)}g)`;}
  const cac=g/5;
  if(cac>=0.5){const r=Math.round(cac);return`${r>0?r:1} c.à c. (${Math.round(g)}g)`;}
  return`${Math.round(g)}g`;
}
function fmtItemQty(stepper, totalGrams, profileRulesMap, eqId){
  if(!totalGrams||totalGrams<=0)return'—';
  // If stepper is usable, use it
  if(stepper&&stepper.usualGPerUnit&&stepper.usualGPerUnit>0){
    // 1. Try PROFILE bracket resolution
    const rules=stepper.profileRules||(stepper.profileId&&profileRulesMap?.[stepper.profileId])||null;
    if(rules){
      const resolved=resolveProfileBracket(rules,totalGrams);
      if(resolved)return`${resolved.label} (${Math.round(resolved.grams)}g)`;
    }
    // 2. Detect digit-prefixed labels ("1/2 c. à soupe") — NEVER multiply
    if(/^[\d½¼⅓⅔¾]/.test(stepper.usualUnitSg||'')){
      if(Math.abs(totalGrams-stepper.usualGPerUnit)<1)return`${stepper.usualUnitSg} (${Math.round(totalGrams)}g)`;
      return`${Math.round(totalGrams)}g`;
    }
    // 3. Standard FIXED: "tranche", "carré", "pot", "portion"
    const rawU=totalGrams/stepper.usualGPerUnit;
    const du=rawU>=1?Math.round(rawU):(Math.round(rawU*2)/2||0.5);
    const ul=du<=1?stepper.usualUnitSg:stepper.usualUnitPl;
    if(!ul)return`${Math.round(totalGrams)}g`;
    const fmtN=du===0.5?'½':du%1===0.5?`${Math.floor(du)}½`:String(du);
    const pg=Math.round(stepper.usualGPerUnit*du);
    return`${fmtN} ${ul} (${pg}g)`;
  }
  // No usable stepper — assaisonnement fallback: convert to c.à s. / c.à c.
  if(eqId?.startsWith('assaisonnement'))return gramsToCas(totalGrams);
  // Everything else: just grams
  return`${Math.round(totalGrams)}g`;
}

/* ═══ ADD MODAL (Plan + Hors Plan + Quick-Log) ═══ */
function AddModal({slotId,onClose,onLog,everLoggedHp,weekConsumed,todayLogs,quickLog}){
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
  // Root helper: display unit from Supabase (qty_display_unit) or fallback on type
  const qtyUnit=(eq)=>eq?.qty_display_unit||(eq?.type==="drinks"||eq?.type==="alcohol"?"ml":"g");
  const SLOT_QTY=d?.SLOT_QTY||{};
  const PROFILE_RULES=d?.PROFILE_RULES||{};
  /* slotTargetGrams: total GRAMS for this item at this slot.
     R-mode: qty_max × item.qty1x (qty_max is a multiplier)
     F-mode: qty_max IS grams directly
     Fallback: item.qty1x or eq.qtyPlanGrams */
  function slotTargetGrams(eq,item){
    const sq=SLOT_QTY[eq?.eqId]?.[slotId];
    const refG=item?.qty1x>0?item.qty1x:(eq?.qtyPlanGrams||0);
    if(!sq||sq.qtyMax<=0)return refG||0;
    if(eq?.eqMode==='R')return sq.qtyMax*refG;
    return sq.qtyMax; // F-mode: qty_max = grams
  }
  /* portionGrams: grams for 1 CASCADE PORTION (for "Ajouter 1 portion" button) */
  function portionGrams(eq,item){
    return item?.qty1x>0?item.qty1x:(eq?.qtyPlanGrams||0);
  }

  const [view,setView]=useState("main");
  const [peekEq,setPeekEq]=useState(null); // eq to peek at (table view without logging)
  const [selEq,setSelEq]=useState(null);
  const [selItem,setSelItem]=useState(null);
  const [units,setUnits]=useState(1);
  const [portion,setPortion]=useState(1);
  const [showStepper,setShowStepper]=useState(false);
  const [showTable,setShowTable]=useState(false);
  const [showHpEdu,setShowHpEdu]=useState(false);
  const [showNote,setShowNote]=useState(false);
  const [expandedVariants,setExpandedVariants]=useState(new Set());
  const [search,setSearch]=useState("");
  const [dietFilter,setDietFilter]=useState(null); // null | 'vegetarian' | 'glutenFree' | 'lactoseFree'

  // Quick-Log state
  const [qlSearch,setQlSearch]=useState("");
  const [qlSelected,setQlSelected]=useState(null); // selected QL item
  const [qlPortion,setQlPortion]=useState(null); // selected portion option
  const [qlCatFilter,setQlCatFilter]=useState(null);
  const [qlSubmitting,setQlSubmitting]=useState(false);
  const [showApero,setShowApero]=useState(false);
  const qlDebounceRef=useRef(null);

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

  // Cleanup debounce on unmount
  useEffect(()=>()=>{if(qlDebounceRef.current)clearTimeout(qlDebounceRef.current)},[]);

  // Load QL categories on mount
  useEffect(()=>{
    if(quickLog&&quickLog.categories?.length===0){
      quickLog.fetchCategories();
    }
  },[quickLog]);

  // QL search with debounce
  function handleQlSearch(val){
    setQlSearch(val);
    setQlSelected(null);setQlPortion(null);
    if(qlDebounceRef.current)clearTimeout(qlDebounceRef.current);
    if(!quickLog)return;
    if(val.length<2){quickLog.clearSearch();return}
    qlDebounceRef.current=setTimeout(()=>{quickLog.search(val,qlCatFilter)},250);
  }

  // QL category filter
  function handleQlCatFilter(catId){
    const next=qlCatFilter===catId?null:catId;
    setQlCatFilter(next);
    setQlSelected(null);setQlPortion(null);
    if(!quickLog)return;
    if(qlSearch.length>=2){
      quickLog.search(qlSearch,next);
    } else if(next){
      quickLog.fetchCategoryItems(next);
    }
  }

  // QL select item
  function pickQlItem(item){
    setQlSelected(item);
    // Auto-select medium portion if available
    const portions=item.portions||[];
    const med=portions.find(p=>p.option_key==='M')||portions.find(p=>p.option_key==='REGULAR')||portions[Math.floor(portions.length/2)]||portions[0];
    setQlPortion(med||null);
  }

  // QL submit
  async function submitQl(){
    if(!qlSelected||!qlPortion||!quickLog||qlSubmitting)return;
    setQlSubmitting(true);
    const {data,error}=await quickLog.submitQuickLog({
      slotId,
      qlItemId:qlSelected.item_id,
      optionKey:qlPortion.option_key,
      labelSnapshot:qlSelected.label,
      portionLabelSnapshot:qlPortion.label_short||qlPortion.option_key,
      kcal:Number(qlPortion.kcal),
      p:Number(qlPortion.p),
      l:Number(qlPortion.l),
      g:Number(qlPortion.g),
      flagsSnapshot:qlSelected.flags||[],
      slotStatus:'REPLACED',
    });
    if(!error){
      // Also fire onLog so the local state updates immediately
      onLog({
        id:data?.id||crypto.randomUUID(),slotId,eqId:`ql_${qlSelected.slug||qlSelected.item_id}`,itemId:null,
        nbUnits:1,qtyPortion:1,isOutOfPlan:true,qlLabel:qlSelected.label,
        kcal:Math.round(Number(qlPortion.kcal)),
        p:Math.round(Number(qlPortion.p)*10)/10,
        l:Math.round(Number(qlPortion.l)*10)/10,
        g:Math.round(Number(qlPortion.g)*10)/10,
      });
      onClose();
    }
    setQlSubmitting(false);
  }

  // Items to show in QL browse mode (no search)
  const qlBrowseItems=qlSearch.length>=2?quickLog?.results||[]:quickLog?.catItems||[];

  function pickEq(eq,hp){
    setSelEq(eq);setShowStepper(false);setShowTable(false);setSelItem(null);
    if(eq.qtyUi.defaultAction==="LOG_COMPLETION"){doLog(eq,null,1,1,hp);return}
    if(hp){
      // Hors plan: toujours direct au stepper (pas de "Ajouter 1 portion")
      if(eq.qtyUi.appInputMode==="PORTION_TAP"){setPortion(1)}
      else{
        setShowStepper(true);
        const rec=eq.items.find(i=>i.isRecommended)||eq.items[0];
        if(rec){setSelItem(rec);const g=slotTargetGrams(eq,rec);setUnits(rec.stepper?.usualGPerUnit>0?Math.round(g/rec.stepper.usualGPerUnit)||1:rec.stepper?.defaultUnits||(eq.qtyPlanGrams||100))}
        else if(eq.items.length===0)setUnits(eq.qtyPlanGrams||100);
      }
      if(!everLoggedHp)setShowHpEdu(true);
    } else if(eq.qtyUi.appInputMode==="ITEM_FIRST_PICK"){
      setShowStepper(true);
      const rec=eq.items.find(i=>i.isRecommended)||eq.items[0];
      if(rec){setSelItem(rec);const g=slotTargetGrams(eq,rec);setUnits(rec.stepper?.usualGPerUnit>0?Math.round(g/rec.stepper.usualGPerUnit)||1:1)}
    } else if(eq.qtyUi.appInputMode==="PORTION_TAP"){setPortion(1)}
    else{const rec=eq.items.find(i=>i.isRecommended)||eq.items[0];if(rec){const g=slotTargetGrams(eq,rec);setUnits(rec.stepper?.usualGPerUnit>0?Math.round(g/rec.stepper.usualGPerUnit)||1:1)}}
  }

  function doLog(eq,item,qty,port,hp){
    if(qty<=0&&port<=0)return;
    const n=item?.nutrientsPerUnit
      ?{kcal:item.nutrientsPerUnit.kcal*qty,p:item.nutrientsPerUnit.p*qty,l:item.nutrientsPerUnit.l*qty,g:item.nutrientsPerUnit.g*qty}
      :{kcal:eq.nutrientsPerPortion.kcal*port,p:eq.nutrientsPerPortion.p*port,l:eq.nutrientsPerPortion.l*port,g:eq.nutrientsPerPortion.g*port};
    const oop=hp||!isInPlan(eq.eqId)||!allowed.includes(eq.eqId);
    onLog({id:crypto.randomUUID(),slotId,eqId:eq.eqId,itemId:item?.itemId||null,nbUnits:qty,qtyPortion:port,isOutOfPlan:oop,
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

  const curHp=selEq&&!allowed.includes(selEq.eqId);

  // Apero session overlay
  if(showApero)return <AperoSession slotId={slotId} onClose={onClose} onBack={()=>setShowApero(false)} onLog={onLog} quickLog={quickLog}/>;

  // Peek at eq table (consultation only, no logging)
  if(peekEq)return(
    <SwipeModal onClose={onClose}>
      <button aria-label="Retour" className="hdr-back" onClick={()=>setPeekEq(null)} style={{padding:0,marginBottom:8}}>← Retour</button>
      <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><EqIcon eqId={peekEq.eqId} size={20}/> {peekEq.label}{!allowed.includes(peekEq.eqId)&&<span className="chip-hp" style={{marginLeft:8}}>Hors plan</span>}</div>
      {isInPlan(peekEq.eqId)&&allowed.includes(peekEq.eqId)&&<div style={{display:"flex",gap:12,marginBottom:14}}>
        <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"rgba(15,30,46,.03)",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>Cible semaine</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1A1A1A"}}>{PLAN_TARGETS[peekEq.eqId]}</div>
        </div>
        <div style={{flex:1,padding:"10px 12px",borderRadius:12,background:"rgba(15,30,46,.03)",textAlign:"center"}}>
          <div style={{fontSize:10,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:2}}>Consommé</div>
          <div style={{fontSize:18,fontWeight:700,color:obj.accent}}>{WEEK_CONSUMED[peekEq.eqId]||0}</div>
        </div>
      </div>}
      {peekEq.noteElevia&&<div style={{marginBottom:14,padding:10,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,borderRadius:14,fontSize:12,color:"#1A1A1A",lineHeight:1.6}}>{peekEq.noteElevia}</div>}
      <div style={{fontSize:12,fontWeight:700,color:obj.accent,textTransform:"uppercase",letterSpacing:".3px",marginBottom:8}}>Tes équivalences</div>
      {peekEq.items.length===0&&<div style={{textAlign:"center",padding:"24px 0"}}><div className="empty-icon" style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:12,color:"#6B7280"}}>Aucune équivalence détaillée</div></div>}
      {peekEq.items.map(item=>{
        const isRecipe=peekEq.type==='recette'||item.foodLabel?.toLowerCase().includes('recette');
        const hasV=item.variants&&item.variants.length>0&&!isRecipe;
        const isHP=!allowed.includes(peekEq.eqId);
        return <div key={item.itemId} role={isHP?"button":undefined} tabIndex={isHP?0:undefined}
          onClick={isHP?()=>{setPeekEq(null);pickEq(peekEq,true)}:undefined}
          style={{padding:"10px 12px",marginBottom:4,borderRadius:12,background:"rgba(15,30,46,.02)",border:"1px solid rgba(15,30,46,.06)",cursor:isHP?"pointer":"default",transition:isHP?"background .15s":"none"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}}>
              {item.isRecommended&&<span style={{fontSize:8,color:obj.accent}}>★</span>}
              <span style={{fontSize:13,fontWeight:600,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.foodLabel}</span>
            </div>
            {!isHP&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap",marginLeft:8}}>
              {fmtItemQty(item.stepper,slotTargetGrams(peekEq,item),PROFILE_RULES,peekEq.eqId)}
            </span>}
            {isHP&&<span style={{fontSize:14,color:"#E8863A",flexShrink:0}}>+</span>}
          </div>
          {hasV&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
            {item.variants.map((v,vi)=><span key={vi} style={{fontSize:9.5,fontWeight:500,padding:"2px 7px",borderRadius:99,background:"rgba(15,30,46,.03)",border:"1px solid rgba(15,30,46,.05)",color:"#9CA3AF",lineHeight:"14px",whiteSpace:"nowrap"}}>{v.label}</span>)}
          </div>}
        </div>}
      )}
      <button className="btn-primary" style={{marginTop:14}} onClick={()=>{setPeekEq(null);pickEq(peekEq,!allowed.includes(peekEq.eqId))}}>Logger cette équivalence</button>
    </SwipeModal>
  );

  if(showHpEdu)return(
    <div className="overlay" onClick={onClose}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"50%"}}>
      <div className="modal-handle"/>
      <div style={{textAlign:"center",padding:"10px 0 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>🙌</div>
        <div className="modal-title">Tu peux le faire</div>
        <div className="modal-sub" style={{marginTop:8}}>{obj.hpEducation}</div>
        <button className="btn-primary" onClick={()=>setShowHpEdu(false)}>Compris</button>
      </div>
    </div></div>
  );

  // QL portion picker sub-view
  if(qlSelected){
    const portions=qlSelected.portions||[];
    const flags=qlSelected.flags||[];
    return(
    <div className="overlay" onClick={onClose}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button aria-label="Retour" className="hdr-back" onClick={()=>{setQlSelected(null);setQlPortion(null)}} style={{padding:0}}>← Retour</button>
      </div>
      <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}>
        {qlSelected.label}
        <span className="chip-hp" style={{marginLeft:4,background:"rgba(232,134,58,.1)",color:"#E8863A",border:"1px solid rgba(232,134,58,.2)"}}>Repas ext.</span>
      </div>
      {qlSelected.description&&<div className="modal-sub" style={{marginTop:2}}>{qlSelected.description}</div>}
      {flags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6,marginBottom:8}}>
        {flags.map(f=><span key={f} style={{padding:"2px 8px",borderRadius:99,fontSize:9,fontWeight:700,background:"rgba(15,30,46,.04)",border:"1px solid rgba(15,30,46,.08)",color:"#6B7280",textTransform:"uppercase"}}>{f.replace(/_/g,' ')}</span>)}
      </div>}
      <div className="modal-section" style={{marginTop:8}}>Choisis ta taille</div>
      {portions.map(p=>{
        const sel=qlPortion?.option_key===p.option_key;
        return <div key={p.option_key} onClick={()=>setQlPortion(p)} style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"10px 12px",marginBottom:6,borderRadius:14,cursor:"pointer",
          background:sel?obj.accentSoft:"rgba(15,30,46,.02)",
          border:`1px solid ${sel?obj.accentBorderStrong:"rgba(15,30,46,.06)"}`,
          transition:"all .15s",
        }}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A"}}>{p.label_short||p.label_long||p.option_key}</div>
            <div style={{fontSize:11,color:"#6B7280",marginTop:1}}>{p.grams_or_ml}g</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:sel?obj.accent:"#1A1A1A"}}>{Math.round(Number(p.kcal))} kcal</div>
            <div style={{fontSize:10,color:"#6B7280"}}>P{Math.round(Number(p.p))} L{Math.round(Number(p.l))} G{Math.round(Number(p.g))}</div>
          </div>
        </div>
      })}
      <button className="btn-primary" disabled={!qlPortion||qlSubmitting} onClick={submitQl} style={{marginTop:8,opacity:qlSubmitting?.6:1}}>
        {qlSubmitting?"...":`Valider ${qlPortion?Math.round(Number(qlPortion.kcal))+" kcal":""}`}
      </button>
    </div></div>);
  }

  if(selEq&&selEq.qtyUi.defaultAction!=="LOG_COMPLETION"){
    const mode=selEq.qtyUi.appInputMode;
    return(
    <div className="overlay" onClick={onClose}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <button aria-label="Retour" className="hdr-back" onClick={()=>{setSelEq(null);setShowStepper(false);setShowNote(false)}} style={{padding:0}}>← Retour</button>
        {selEq.noteElevia&&<button onClick={()=>setShowNote(n=>!n)} style={{background:showNote?obj.accentSoft:"none",border:showNote?`1px solid ${obj.accentBorderStrong}`:"1px solid transparent",borderRadius:99,padding:"4px 8px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all .2s"}}><IcInfoEq size={14} color={showNote?obj.accent:obj.accentLine}/></button>}
      </div>
      {showNote&&selEq.noteElevia&&<div style={{marginBottom:12,padding:10,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,borderRadius:14,fontSize:12,color:"#1A1A1A",lineHeight:1.6,animation:"fadeUp .2s ease-out"}}>{selEq.noteElevia}</div>}
      <div className="modal-title" style={{display:"flex",alignItems:"center",gap:8}}><EqIcon eqId={selEq.eqId} size={20}/> {selEq.label}{curHp&&<span className="chip-hp" style={{marginLeft:8}}>Hors plan</span>}</div>
      {!curHp&&isInPlan(selEq.eqId)&&<div style={{display:"flex",gap:12,margin:"10px 0 6px"}}>
        <div style={{flex:1,padding:"8px 10px",borderRadius:10,background:"rgba(15,30,46,.03)",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:1}}>Cible semaine</div>
          <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A"}}>{PLAN_TARGETS[selEq.eqId]}</div>
        </div>
        <div style={{flex:1,padding:"8px 10px",borderRadius:10,background:"rgba(15,30,46,.03)",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:".3px",marginBottom:1}}>Consommé</div>
          <div style={{fontSize:16,fontWeight:700,color:obj.accent}}>{WEEK_CONSUMED[selEq.eqId]||0}</div>
        </div>
      </div>}

      {mode==="PORTION_TAP"&&<>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>1 portion = {selEq.qtyPlanGrams}{qtyUnit(selEq)}</div>
        <div className="stepper">
          <button aria-label="Réduire la quantité" className="stepper-btn" disabled={portion<=(selEq.qtyUi.portionMin||0.25)} onClick={()=>setPortion(p=>Math.max(selEq.qtyUi.portionMin||0.25,p-(selEq.qtyUi.portionStep||0.25)))}>−</button>
          <div><div className="stepper-val">{portion}</div><div className="stepper-unit">portion{portion!==1?"s":""}</div></div>
          <button aria-label="Augmenter la quantité" className="stepper-btn" disabled={portion>=(selEq.qtyUi.portionMax||4)} onClick={()=>setPortion(p=>Math.min(selEq.qtyUi.portionMax||4,p+(selEq.qtyUi.portionStep||0.25)))}>+</button>
        </div>
        {liveCalc&&<div className="live-calc"><div className="live-main">≈ {liveCalc.grams}{qtyUnit(selEq)} · {liveCalc.kcal} kcal</div><div className="live-sub">P{liveCalc.p} · L{liveCalc.l} · G{liveCalc.g}</div></div>}
        <button className="btn-primary" onClick={()=>doLog(selEq,null,portion,portion,curHp)}>Valider {portion} portion{portion!==1?"s":""}</button>
      </>}

      {mode!=="PORTION_TAP"&&<>
        {!showStepper&&!showTable&&!curHp&&<>
          <button className="btn-primary" style={{marginTop:12}} onClick={()=>{const pg=portionGrams(selEq,selItem);const u=selItem?.stepper?.usualGPerUnit>0?Math.round(pg/selItem.stepper.usualGPerUnit)||1:1;doLog(selEq,selItem,u,1,curHp)}}>Ajouter 1 portion</button>
          <button className="btn-text" onClick={()=>{setShowStepper(true);if(selEq.items.length===0)setUnits(selEq.qtyPlanGrams||100)}} style={{margin:"12px auto 0",display:"block",textAlign:"center"}}>Modifier la quantité →</button>
        </>}
        {showTable&&<>
          <div className="modal-section" style={{marginBottom:8}}>Mes équivalences</div>
          {selEq.items.map(item=>{
            const isRecipe=selEq.type==='recette'||item.foodLabel?.toLowerCase().includes('recette');
            const hasV=item.variants&&item.variants.length>0&&!isRecipe;
            return <div key={item.itemId} style={{padding:"9px 12px",marginBottom:4,borderRadius:12,background:"rgba(15,30,46,.02)",border:"1px solid rgba(15,30,46,.06)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.foodLabel}</span>
                </div>
                {!curHp&&isInPlan(selEq.eqId)&&<span style={{fontSize:12,color:"#6B7280",whiteSpace:"nowrap",marginLeft:8}}>
                  {fmtItemQty(item.stepper,slotTargetGrams(selEq,item),PROFILE_RULES,selEq.eqId)}
                </span>}
              </div>
              {hasV&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                {item.variants.map((v,vi)=><span key={vi} style={{fontSize:9.5,fontWeight:500,padding:"2px 7px",borderRadius:99,background:"rgba(15,30,46,.03)",border:"1px solid rgba(15,30,46,.05)",color:"#9CA3AF",lineHeight:"14px",whiteSpace:"nowrap"}}>{v.label}</span>)}
              </div>}
            </div>}
          )}
          <button className="btn-text" onClick={()=>setShowTable(false)} style={{marginTop:8}}>← Retour</button>
        </>}
        {(showStepper||(curHp&&!showTable))&&(()=>{
          const refG=selEq.qtyPlanGrams||100;const npp=selEq.nutrientsPerPortion||{kcal:0,p:0,l:0,g:0};
          const fbCalc=(g)=>({kcal:Math.round(npp.kcal*g/refG),p:Math.round(npp.p*g/refG*10)/10,l:Math.round(npp.l*g/refG*10)/10,g:Math.round(npp.g*g/refG*10)/10});
          return <>
          {selEq.items.length>0&&<>
            <div className="modal-section">{mode==="ITEM_FIRST_PICK"?"Choisis ton item":"Items"}</div>
            {selEq.items.map(item=>(
              <div key={item.itemId} className={`item-row ${selItem?.itemId===item.itemId?"selected":""}`}
                onClick={()=>{setSelItem(item);if(item.stepper?.usualGPerUnit>0){const g=slotTargetGrams(selEq,item);setUnits(Math.round(g/item.stepper.usualGPerUnit)||1)}else{setUnits(item.stepper?.defaultUnits||refG)}}}>
                <span className="item-label">{item.foodLabel}</span>
                <span className="item-detail">{!curHp&&isInPlan(selEq.eqId)?fmtItemQty(item.stepper,slotTargetGrams(selEq,item),PROFILE_RULES,selEq.eqId):""}</span>
              </div>
            ))}
          </>}
          {/* Item avec stepper normal (pain=tranches, fruits=unités, etc.) */}
          {selItem?.stepper&&<>
            <div key={selItem.itemId+"_stepper"} className="stepper" ref={el=>{if(el)setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),50)}}>
              <button aria-label="Réduire la quantité" className="stepper-btn" disabled={units<=(selItem.stepper.minUnits||0)} onClick={()=>{haptic(6);setUnits(u=>Math.max(selItem.stepper.minUnits||0,u-(selItem.stepper.unitStep||1)))}}>−</button>
              <div><div className="stepper-val"><AnimNum value={units} duration={200}/></div><div className="stepper-unit">{units<=1?selItem.stepper.usualUnitSg:selItem.stepper.usualUnitPl}</div></div>
              <button aria-label="Augmenter la quantité" className="stepper-btn" disabled={units>=(selItem.stepper.maxUnits||20)} onClick={()=>{haptic(6);setUnits(u=>Math.min(selItem.stepper.maxUnits||20,u+(selItem.stepper.unitStep||1)))}}>+</button>
            </div>
            {liveCalc&&<div className="live-calc"><div className="live-main">≈ {liveCalc.grams}{qtyUnit(selEq)} · {liveCalc.kcal} kcal</div><div className="live-sub">P{liveCalc.p} · L{liveCalc.l} · G{liveCalc.g}</div></div>}
          </>}
          {/* Fallback grammes: item sans stepper OU EQ sans items */}
          {(selItem&&!selItem.stepper||selEq.items.length===0)&&<>
            <div key={(selItem?.itemId||"eq")+"_fb_stepper"} className="stepper" ref={el=>{if(el)setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),50)}}>
              <button aria-label="Réduire" className="stepper-btn" disabled={units<=25} onClick={()=>{haptic(6);setUnits(u=>Math.max(25,u-25))}}>−</button>
              <div><div className="stepper-val"><AnimNum value={units} duration={200}/></div><div className="stepper-unit">{qtyUnit(selEq)==="ml"?"ml":"grammes"}</div></div>
              <button aria-label="Augmenter" className="stepper-btn" disabled={units>=500} onClick={()=>{haptic(6);setUnits(u=>Math.min(500,u+25))}}>+</button>
            </div>
            {(()=>{const c=fbCalc(units);return <div className="live-calc"><div className="live-main">{c.kcal} kcal</div><div className="live-sub">P{c.p} · L{c.l} · G{c.g}</div></div>})()}
          </>}
          <button className="btn-primary" onClick={()=>{
            if(selItem?.stepper)doLog(selEq,selItem,units,liveCalc?.portion||1,curHp);
            else{const port=units/(refG||100);doLog(selEq,selItem,units,Math.round(port*100)/100,curHp)}
          }}>Valider{!selItem?.stepper&&selEq.items.length===0?` ${units}g`:""}</button>
        </>})()}
      </>}
    </div></div>);
  }

  return(
  <SwipeModal onClose={onClose}>
    <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}><span className="modal-title" style={{margin:0}}>Ajouter à</span><span style={{fontSize:14,color:"rgba(15,30,46,.25)",fontWeight:300}}> — </span><span style={{fontSize:17,fontWeight:700,color:"var(--accent)",fontFamily:"'Cormorant Garamond',serif"}}>{SLOTS.find(s=>s.id===slotId)?.label?.replace(/\s*\(.*\)\s*$/,"")}</span></div>

    {view==="main"&&<>
      {/* Plan equivalences */}
      <div style={{fontSize:11,fontWeight:700,color:"rgba(15,30,46,.35)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Tes équivalences pour ce repas</div>
      {planEqs.map(eq=>{
        const wc=WEEK_CONSUMED[eq.eqId]||0,wt=PLAN_TARGETS[eq.eqId]||0;
        const sqSlots=SLOT_QTY[eq.eqId]||{};
        const totalFreq=Object.values(sqSlots).reduce((s,v)=>s+(v.freqWeek||0),0);
        const isDaily=totalFreq>=7;
        const tc=isDaily?(todayLogs||[]).filter(l=>l.eqId===eq.eqId).reduce((s,l)=>s+(l.qtyPortion||1),0):0;
        const dt=isDaily?Math.round(wt/7):0;
        return <div key={eq.eqId} className="eq-card" role="button" tabIndex={0} onClick={()=>pickEq(eq,false)}>
          <span style={{width:30,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={20}/></span><div className="eq-body"><div className="eq-name">{eq.label}</div><div className="eq-progress">{isDaily?`${tc}/${dt} jour`:`${wc}/${wt} sem.`}</div></div><span onClick={e=>{e.stopPropagation();setPeekEq(eq)}} style={{padding:"4px 6px",cursor:"pointer",display:"flex",alignItems:"center"}} title="Voir le tableau"><svg width="18" height="18" viewBox="-0.25 -0.25 24 24" fill="none" stroke="rgba(15,30,46,.3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M11.75 22.521c5.949 0 10.771-4.822 10.771-10.771 0-5.949-4.822-10.771-10.771-10.771C5.801.979.979 5.801.979 11.75c0 5.949 4.822 10.771 10.771 10.771Z"/><path d="M11.692 16.5v-6.012a.858.858 0 0 0-.252-.607.858.858 0 0 0-.607-.252h-.859"/><path d="M11.263 7.782a.429.429 0 0 1-.43-.43.429.429 0 0 1 .43-.429"/><path d="M11.263 7.782a.429.429 0 0 0 .43-.43.429.429 0 0 0-.43-.429"/><path d="M9.975 16.5h3.55"/></svg></span><span style={{width:32,height:32,borderRadius:99,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={obj.accent} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
        </div>
      })}

      {/* Divider + QL search */}
      <div style={{borderTop:"1px solid rgba(15,30,46,.06)",margin:"14px 0 10px"}}/>
      <input className="search" placeholder="Autre chose ? Pizza, sushi, kebab..." value={qlSearch} onChange={e=>handleQlSearch(e.target.value)} style={{marginBottom:8}}/>

      {/* QL category chips — shown when user is searching or has a filter */}
      {(quickLog?.categories||[]).length>0&&(qlSearch.length>=2||qlCatFilter)&&<div style={{display:"flex",gap:5,marginBottom:8,overflowX:"auto",paddingBottom:4}}>
        {(quickLog?.categories||[]).map(cat=>{
          const sel=qlCatFilter===cat.id;
          return <button key={cat.id} onClick={()=>handleQlCatFilter(cat.id)} style={{
            padding:"4px 10px",borderRadius:99,fontSize:10,fontWeight:700,whiteSpace:"nowrap",flexShrink:0,
            background:sel?"rgba(232,134,58,.1)":"#F5F4F1",
            border:`1px solid ${sel?"rgba(232,134,58,.3)":"rgba(15,30,46,.08)"}`,
            color:sel?"#E8863A":"#6B7280",cursor:"pointer",fontFamily:"inherit",
          }}>{cat.icon?cat.icon+" ":""}{cat.label}</button>
        })}
      </div>}

      {/* QL loading */}
      {(quickLog?.searching||quickLog?.browseLoading)&&<SkeletonRows rows={3} h={38}/>}

      {/* QL results */}
      {!quickLog?.searching&&!quickLog?.browseLoading&&qlBrowseItems.length>0&&qlBrowseItems.map(item=>(
        <div key={item.item_id} className="eq-card" role="button" tabIndex={0} onClick={()=>pickQlItem(item)}>
          <div className="eq-body" style={{flex:1}}>
            <div className="eq-name" style={{display:"flex",alignItems:"center",gap:6}}>
              {item.label}
              {item.is_featured&&<span style={{fontSize:9,fontWeight:700,color:obj.accent,background:obj.accentSoft,padding:"1px 5px",borderRadius:99}}>TOP</span>}
            </div>
            <div className="eq-progress" style={{fontSize:11,display:"flex",alignItems:"center",gap:6}}>
              {item.portions?.length>0&&<span>{Math.round(Number(item.portions[Math.floor(item.portions.length/2)]?.kcal||item.portions[0]?.kcal||0))} kcal</span>}
              {item.category_label&&<span style={{color:"rgba(15,30,46,.3)"}}>· {item.category_label}</span>}
            </div>
          </div>
          <span style={{fontSize:18,color:"#E8863A",flexShrink:0}}>+</span>
        </div>
      ))}

      {/* QL no results */}
      {!quickLog?.searching&&!quickLog?.browseLoading&&qlBrowseItems.length===0&&(qlSearch.length>=2||qlCatFilter)&&(
        <div style={{textAlign:"center",padding:"20px 0"}}><div className="empty-icon" style={{fontSize:24,marginBottom:6}}>🔍</div><div style={{fontSize:13,color:"#6B7280"}}>Aucun résultat</div></div>
      )}

      {/* Bottom action buttons */}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <button onClick={()=>setView("catalogue")} style={{flex:1,padding:"10px 14px",borderRadius:14,background:"rgba(15,30,46,.02)",border:"1px solid rgba(15,30,46,.06)",display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
          <span style={{fontSize:16}}>📚</span>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>Catalogue complet</div>
            <div style={{fontSize:10,color:"#6B7280",marginTop:1}}>Toutes les équivalences</div>
          </div>
          <span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span>
        </button>
        <button onClick={()=>setShowApero(true)} style={{padding:"10px 14px",borderRadius:14,background:"linear-gradient(135deg,rgba(232,134,58,.06),rgba(232,134,58,.02))",border:"1px solid rgba(232,134,58,.15)",display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
          <span style={{fontSize:16}}>🍻</span>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#E8863A"}}>Apéro</div>
          </div>
        </button>
      </div>
    </>}

    {/* Catalogue view (was "Autres" tab) */}
    {view==="catalogue"&&<>
      <button aria-label="Retour" className="hdr-back" onClick={()=>setView("main")} style={{marginBottom:8,padding:0}}>← Mon plan</button>
      <input className="search" placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        {[{key:null,label:"Tout"},{key:"vegetarian",label:"Végé 🌱"},{key:"glutenFree",label:"Sans gluten"},{key:"lactoseFree",label:"Sans lactose"}].map(f=>{const sel=dietFilter===f.key;return <button key={f.key||"all"} onClick={()=>setDietFilter(f.key)} style={{padding:"4px 10px",borderRadius:99,fontSize:10,fontWeight:700,background:sel?`${obj.accent}15`:"#F5F4F1",border:`1px solid ${sel?obj.accentBorder:"rgba(15,30,46,.08)"}`,color:sel?obj.accent:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>{f.label}</button>})}
      </div>
      {Object.entries(hpGroups).map(([type,eqs])=><div key={type}>
        <div className="eq-cat-header">{TYPE_LABELS[type]||type}</div>
        {eqs.map(eq=><div key={eq.eqId} className="eq-card" role="button" tabIndex={0} onClick={()=>pickEq(eq,true)}>
          <span style={{width:30,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={20}/></span><div className="eq-body"><div className="eq-name">{eq.label}{isInPlan(eq.eqId)&&<span style={{fontSize:10,color:"#6B7280",marginLeft:4}}>(plan, autre slot)</span>}</div><div className="eq-progress" style={{fontSize:11}}>{eq.nutrientsPerPortion.kcal} kcal/portion</div></div><span onClick={e=>{e.stopPropagation();setPeekEq(eq)}} style={{padding:"4px 6px",cursor:"pointer",display:"flex",alignItems:"center"}} title="Voir le tableau"><svg width="18" height="18" viewBox="-0.25 -0.25 24 24" fill="none" stroke="rgba(15,30,46,.3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"><path d="M11.75 22.521c5.949 0 10.771-4.822 10.771-10.771 0-5.949-4.822-10.771-10.771-10.771C5.801.979.979 5.801.979 11.75c0 5.949 4.822 10.771 10.771 10.771Z"/><path d="M11.692 16.5v-6.012a.858.858 0 0 0-.252-.607.858.858 0 0 0-.607-.252h-.859"/><path d="M11.263 7.782a.429.429 0 0 1-.43-.43.429.429 0 0 1 .43-.429"/><path d="M11.263 7.782a.429.429 0 0 0 .43-.43.429.429 0 0 0-.43-.429"/><path d="M9.975 16.5h3.55"/></svg></span><span style={{width:32,height:32,borderRadius:99,background:"rgba(232,134,58,.1)",border:"1px solid rgba(232,134,58,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8863A" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
        </div>)}
      </div>)}
    </>}
  </SwipeModal>);
}

/* ═══ MILESTONE POPUP ═══ */
function MilestonePopup({milestone,accent,onDismiss}){
  if(!milestone)return null;
  useEffect(()=>{haptic([10,40,10,40,20])},[]);
  const sparkles=useMemo(()=>Array.from({length:8},(_,i)=>({
    top:`${20+Math.random()*60}%`,left:`${10+Math.random()*80}%`,
    delay:`${i*0.15}s`,size:6+Math.random()*8,
  })),[]);
  return <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(10,22,32,.85)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",animation:"fadeIn .3s ease-out"}} onClick={onDismiss}>
    {sparkles.map((s,i)=><div key={i} style={{position:"absolute",top:s.top,left:s.left,width:s.size,height:s.size,borderRadius:"50%",background:accent,animation:`sparkle .8s ${s.delay} ease-out both`,pointerEvents:"none",zIndex:9999}}/>)}
    <div style={{background:"#fff",borderRadius:24,padding:"32px 28px",maxWidth:300,textAlign:"center",animation:"milestoneIn .5s cubic-bezier(.34,1.56,.64,1)",position:"relative"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:48,marginBottom:12,animation:"successPop .5s .2s cubic-bezier(.34,1.4,.64,1) both"}}>{milestone.icon}</div>
      <div style={{fontSize:10,fontWeight:700,color:accent,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Étape franchie !</div>
      <div style={{fontSize:18,fontWeight:700,color:"#1A1A1A",marginBottom:8}}>{milestone.label}</div>
      <div style={{fontSize:13,color:"#6B7280",lineHeight:1.5,marginBottom:20}}>{milestone.desc}</div>
      <button onClick={onDismiss} style={{padding:"10px 32px",borderRadius:14,background:accent,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",transition:"transform .15s cubic-bezier(.34,1.4,.64,1)"}} onMouseDown={e=>e.currentTarget.style.transform="scale(.95)"} onMouseUp={e=>e.currentTarget.style.transform=""}>Super !</button>
    </div>
  </div>
}

/* ═══ PARCOURS LIST (for ProfileTab) ═══ */
function ParcoursList({milestones,milestoneDefs,accent,accentSoft,accentBorder}){
  const achieved=milestones?.map(m=>m.milestone_type)||[];
  const achievedMap={};(milestones||[]).forEach(m=>{achievedMap[m.milestone_type]=m});
  const doneCount=achieved.length;
  return <div style={{marginTop:8}}>
    {(milestoneDefs||[]).map((def,i)=>{
      const done=achieved.includes(def.type);
      const data=achievedMap[def.type];
      const dateStr=data?.achieved_at?new Date(data.achieved_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}):null;
      return <div key={def.type} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<(milestoneDefs||[]).length-1?"1px solid rgba(15,30,46,.06)":"none",opacity:done?1:.4}}>
        <div style={{width:38,height:38,borderRadius:10,background:done?accentSoft:"rgba(15,30,46,.03)",border:`1px solid ${done?accentBorder:"rgba(15,30,46,.06)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,filter:done?"none":"grayscale(1)"}}>{def.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:done?"#1A1A1A":"#999"}}>{def.label}</div>
          <div style={{fontSize:11,color:done?"#6B7280":"#bbb",lineHeight:1.4}}>{def.desc}</div>
        </div>
        {done&&dateStr&&<div style={{fontSize:10,fontWeight:600,color:accent,background:accentSoft,padding:"3px 8px",borderRadius:99,flexShrink:0,whiteSpace:"nowrap"}}>{dateStr}</div>}
      </div>
    })}
    <div style={{fontSize:11,color:"#6B7280",textAlign:"center",marginTop:10}}>{doneCount}/{(milestoneDefs||[]).length} étapes franchies</div>
  </div>
}

/* ═══ DIETITIAN MESSAGES ═══ */
const MSG_TYPE_ICONS={encouragement:"💬",adjustment:"🔧",milestone_comment:"🏅",bilan_feedback:"📋",alert:"⚠️",general:"💬"};

function DietMessageBanner({messages,accent,accentSoft,accentBorder,onMarkRead,onOpenInbox}){
  const unread=messages?.filter(m=>!m.read_at)||[];
  if(!unread.length)return null;
  const latest=unread[0];
  const icon=MSG_TYPE_ICONS[latest.message_type]||"💬";
  return <div role="button" tabIndex={0} onClick={()=>{onMarkRead?.(latest.id);if(onOpenInbox)onOpenInbox()}} style={{padding:"12px 14px",borderRadius:14,background:`linear-gradient(135deg,${accentSoft},rgba(15,30,46,.02))`,border:`1px solid ${accentBorder}`,marginBottom:12,cursor:"pointer",animation:"cardIn .35s ease-out both"}}>
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
  const msgs=messages||[];
  const unreadCount=msgs.filter(m=>!m.read_at).length;
  const MSG_TYPE_LABELS={encouragement:"Encouragement",adjustment:"Ajustement",milestone_comment:"Badge",bilan_feedback:"Bilan",alert:"Alerte",general:"Message"};
  const handleMarkRead=(id)=>{if(onMarkRead)onMarkRead(id)};

  return <div className="page">
    <button aria-label="Retour" className="hdr-back" onClick={onBack} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Messages</div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2,marginBottom:20}}>
      <span style={{fontSize:12,color:"#9CA3AF",fontWeight:600}}>{msgs.length} message{msgs.length>1?"s":""}</span>
      {unreadCount>0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:accent,borderRadius:99,padding:"2px 8px"}}>{unreadCount} non lu{unreadCount>1?"s":""}</span>}
    </div>

    {msgs.length===0&&<div style={{textAlign:"center",padding:"56px 24px 40px"}}>
      <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${accentBorder}`,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5.5h-10a4 4 0 0 0-4 4v5a4 4 0 0 0 4 4h1v4l4.5-4h4.5a4 4 0 0 0 4-4v-5a4 4 0 0 0-4-4Z"/><path d="M11.5 16.5V18a2.5 2.5 0 0 0 2.5 2.5h2.5l3 3v-3H21a2.5 2.5 0 0 0 2.5-2.5v-3A2.5 2.5 0 0 0 21 12.5h-.5"/></svg>
      </div>
      <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>Pas encore de message</div>
      <div style={{fontSize:13,color:"#9CA3AF",lineHeight:1.6,maxWidth:260,margin:"0 auto"}}>Ton diététicien t'enverra des messages personnalisés pour t'accompagner au quotidien.</div>
    </div>}

    {msgs.map((m,i)=>{
      const icon=MSG_TYPE_ICONS[m.message_type]||"💬";
      const typeLabel=MSG_TYPE_LABELS[m.message_type]||"Message";
      const isUnread=!m.read_at;
      const date=new Date(m.created_at);
      const dateStr=date.toLocaleDateString('fr-BE',{day:'numeric',month:'long'});
      const timeStr=date.toLocaleTimeString('fr-BE',{hour:'2-digit',minute:'2-digit'});
      const prevMsg=i>0?msgs[i-1]:null;
      const prevDate=prevMsg?new Date(prevMsg.created_at).toLocaleDateString('fr-BE',{day:'numeric',month:'long',year:'numeric'}):null;
      const currDate=date.toLocaleDateString('fr-BE',{day:'numeric',month:'long',year:'numeric'});
      const showDateSep=!prevMsg||prevDate!==currDate;

      return <div key={m.id}>
        {showDateSep&&<div style={{textAlign:"center",margin:"16px 0 12px",position:"relative"}}>
          <span style={{fontSize:10,fontWeight:600,color:"#B0B5BC",background:"#F5F4F1",padding:"0 10px",position:"relative",zIndex:1,letterSpacing:.5,textTransform:"uppercase"}}>{currDate}</span>
          <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"rgba(15,30,46,.06)"}}/>
        </div>}
        <div role="button" tabIndex={0} onClick={()=>{if(isUnread)handleMarkRead(m.id)}} style={{
          padding:"16px 16px 14px",marginBottom:10,borderRadius:16,
          background:isUnread?`linear-gradient(135deg,${accentSoft},rgba(255,255,255,.95))`:"#fff",
          border:`1px solid ${isUnread?accentBorder:"rgba(15,30,46,.06)"}`,
          boxShadow:isUnread?"0 2px 12px rgba(198,160,91,.08)":"0 1px 4px rgba(0,0,0,.03)",
          cursor:isUnread?"pointer":"default",transition:"all .2s ease",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{width:32,height:32,borderRadius:10,background:isUnread?`linear-gradient(135deg,${accent},rgba(198,160,91,.8))`:"rgba(15,30,46,.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{fontSize:14,filter:isUnread?"brightness(10)":"none"}}>{icon}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:700,color:isUnread?accent:"#6B7280"}}>{m.sender_name||"Ton diététicien"}</div>
              <div style={{fontSize:10,color:"#B0B5BC",marginTop:1}}>{dateStr} · {timeStr}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,fontWeight:600,color:isUnread?"#1A1A1A":"#9CA3AF",background:isUnread?"rgba(198,160,91,.1)":"rgba(15,30,46,.04)",padding:"2px 8px",borderRadius:99}}>{typeLabel}</span>
              {isUnread&&<div style={{width:8,height:8,borderRadius:99,background:accent,flexShrink:0}}/>}
            </div>
          </div>
          {m.title&&<div style={{fontSize:14,fontWeight:700,color:"#1A1A1A",marginBottom:6,lineHeight:1.4}}>{m.title}</div>}
          <div style={{fontSize:13,color:isUnread?"#374151":"#6B7280",lineHeight:1.7,whiteSpace:"pre-line"}}>{m.body}</div>
          {isUnread&&<div style={{fontSize:10,color:accent,fontWeight:600,marginTop:10,textAlign:"right"}}>Touche pour marquer comme lu</div>}
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
    <span style={{fontSize:13,fontWeight:700,color:accent}}>{current} jour{current>1?"s":""}</span>
    <span style={{fontSize:11,color:"rgba(15,30,46,.45)"}}>{streakMsg}</span>
    {isRecord&&<span style={{fontSize:10,fontWeight:700,color:"#34C759",background:"rgba(52,199,89,.08)",padding:"2px 8px",borderRadius:99}}>Record !</span>}
  </div>
}

function PlanTab({logs,onAddLog,onDeleteLog,weekConsumed,weekNutrients,streak,onIncrementStreak,onCheckMilestones,bilanCount,dietMessages,onDietMarkRead,onSwitchTab,quickLog}){
  const d=useData();
  const obj=useObjective();
  const [confirmDel,setConfirmDel]=useState(null);
  const DAY_TARGETS=d?.DAY_TARGETS||DEFAULT_DAY_TARGETS;
  const WEEK_TARGETS=d?.WEEK_TARGETS||DEFAULT_WEEK_TARGETS;
  const SLOTS=d?.SLOTS||DEFAULT_SLOTS;
  const SLOT_ALLOWED=d?.SLOT_ALLOWED||DEFAULT_SLOT_ALLOWED;
  const MICRO_TIPS=d?.MICRO_TIPS||DEFAULT_MICRO_TIPS;
  const {getLogLabel}=useHelpers();

  const [view,setView]=useState("day");
  const [addSlot,setAddSlot]=useState(null);
  const [snack,setSnack]=useState(null);
  const snackTimer=useRef(null);
  const hasHp=logs.some(l=>l.isOutOfPlan);
  // Quick-add: track recent items per slot in localStorage
  const [recentBySlot,setRecentBySlot]=useState(()=>{
    try{const raw=localStorage.getItem('elevia_recent_items');return raw?JSON.parse(raw):{}}catch{return{}}
  });
  const saveRecent=useCallback((slotId,log)=>{
    try{
      setRecentBySlot(prev=>{
        const all={...prev};
        const arr=all[slotId]||[];
        const key=`${log.eqId}:${log.itemId||''}`;
        const filtered=arr.filter(r=>r.key!==key);
        filtered.unshift({key,eqId:log.eqId,itemId:log.itemId,qtyPortion:log.qtyPortion,kcal:log.kcal,p:log.p,l:log.l,g:log.g,isOutOfPlan:log.isOutOfPlan});
        all[slotId]=filtered.slice(0,3);
        localStorage.setItem('elevia_recent_items',JSON.stringify(all));
        return all;
      });
    }catch{}
  },[]);
  const dayNut=useMemo(()=>{const n={kcal:0,p:0,l:0,g:0};logs.forEach(l=>{n.kcal+=l.kcal;n.p+=l.p;n.l+=l.l;n.g+=l.g});return n},[logs]);
  const [ringPulse,setRingPulse]=useState(false);
  const prevKcalRef=useRef({v:0});
  useEffect(()=>{if(dayNut.kcal!==prevKcalRef.current.v&&prevKcalRef.current.v!==0){setRingPulse(true);const t=setTimeout(()=>setRingPulse(false),600);return()=>clearTimeout(t)}prevKcalRef.current.v=dayNut.kcal},[dayNut.kcal]);
  const logCountRef=useRef({count:0});
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
    const isNowComplete=obj.progressDir==="down"?(pct>=0.9&&pct<=1.05):obj.progressDir==="neutral"?(pct>=0.9&&pct<=1.1):(pct>=0.95);
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
      msg=hpMsgs[logCountRef.current.count%hpMsgs.length];
    }else{
      logCountRef.current.count++;
      const basics=obj.progressDir==="down"
        ?["Bien joué !","C'est noté !","Tu restes dans ton budget !","On avance !"]
        :obj.progressDir==="neutral"
        ?["Bien joué !","C'est noté !","Tu maintiens l'équilibre !","On avance !"]
        :["Bien joué !","C'est noté !","Tu te rapproches de ta cible !","On avance !"];
      msg=basics[logCountRef.current.count%basics.length];
    }
    haptic(10);
    if(snackTimer.current)clearTimeout(snackTimer.current);
    setSnack(`✓ ${msg}`);
    snackTimer.current=setTimeout(()=>setSnack(null),2800);
    // Check milestones after log
    if(onCheckMilestones){
      onCheckMilestones({totalLogs:logs.length+1,streak:streak?.current||0});
    }
  }

  const planStart=d?._planStartDate?new Date(d._planStartDate):null;
  // If plan starts Wed-Sun, official week 1 = next Monday
  const officialStart=useMemo(()=>{
    if(!planStart)return null;
    const dow=planStart.getDay(); // 0=Sun,1=Mon,...6=Sat
    if(dow>=3||dow===0){ // Wed(3)-Sat(6) or Sun(0) → next Monday
      const next=new Date(planStart);
      const daysUntilMon=dow===0?1:(8-dow);
      next.setDate(next.getDate()+daysUntilMon);
      next.setHours(0,0,0,0);
      return next;
    }
    return planStart; // Mon or Tue → starts immediately
  },[planStart]);
  const now=new Date();
  const isWarmup=officialStart&&now<officialStart;
  const warmupDaysTotal=isWarmup&&planStart?Math.ceil((officialStart-planStart)/86400000):0;
  const warmupDaysLeft=isWarmup?Math.ceil((officialStart-now)/86400000):0;
  const daysSinceStart=officialStart?Math.max(0,Math.floor((now-officialStart)/86400000)):null;
  const weekNum=(!isWarmup&&daysSinceStart!=null)?Math.floor(daysSinceStart/7)+1:null;
  const dayNum=(!isWarmup&&daysSinceStart!=null)?daysSinceStart+1:null;

  const todayLabel=(()=>{const now=new Date();const days=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];const months=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`})();
  const greetHour=new Date().getHours();
  const greetText=greetHour<12?"Bonjour":greetHour<18?"Bon après-midi":"Bonsoir";
  const firstName=d?.CLIENT?.firstName||"";

  return <div className="page">
    <div className="greet-in" style={{marginBottom:2}}>
      <div className="page-title" style={{fontSize:24}}>{greetText}{firstName?` ${firstName}`:""}</div>
      <div className="page-meta">{todayLabel.charAt(0).toUpperCase()+todayLabel.slice(1)}{weekNum?` · Semaine ${weekNum}`:""}</div>
    </div>
    <Seg options={[{id:"day",label:"Jour"},{id:"week",label:"Semaine"}]} value={view} onChange={setView} tourId="seg-toggle"/>
    {isWarmup&&<div style={{padding:"14px 16px",borderRadius:16,background:"linear-gradient(135deg,rgba(198,160,91,.06),rgba(198,160,91,.02))",border:`1px solid ${obj.accentBorder}`,marginBottom:10}}>
      <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:4}}>Prise en main</div>
      <div style={{fontSize:12,color:"#6B7280",lineHeight:1.5}}>Ton suivi officiel commence dans <strong style={{color:obj.accent}}>{warmupDaysLeft} jour{warmupDaysLeft>1?"s":""}</strong>. D'ici là, familiarise-toi avec l'app et tes équivalences.</div>
      <div style={{display:"flex",gap:4,marginTop:8}}>
        {Array.from({length:warmupDaysTotal},(_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<(warmupDaysTotal-warmupDaysLeft)?obj.accent:"rgba(15,30,46,.08)"}}/>)}
      </div>
    </div>}
    <DietMessageBanner messages={dietMessages} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder} onMarkRead={onDietMarkRead} onOpenInbox={()=>onSwitchTab?.("profile")}/>
    {!isWarmup&&streak&&<StreakBanner current={streak.current} longest={streak.longest} lastDate={streak.lastDate} firstName={d?.CLIENT?.firstName} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder}/>}
    {/* WeeklyChallenge removed — conseils cycle handles this better */}
    {MICRO_TIPS.length>0&&(()=>{const dayOfYear=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/(1000*60*60*24));const tip=MICRO_TIPS[dayOfYear%MICRO_TIPS.length];return <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",borderRadius:12,background:"rgba(15,30,46,.02)",marginBottom:10}}>
      <span style={{flexShrink:0,marginTop:1}}><IcBulb size={14} color={obj.accent}/></span>
      <div style={{fontSize:11,color:"#6B7280",lineHeight:1.5,fontWeight:500}}>{tip.textFr}</div>
    </div>})()}
    {view==="day"?<div key="day-view" className="view-switch">
      <div className="card" data-tour="kcal-ring" style={{padding:16}} aria-live="polite" aria-label="Progression calorique du jour">
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div className={ringPulse?"success-pop":""} style={{position:"relative",width:64,height:64,flexShrink:0,transition:"filter .4s ease-out",filter:ringPulse?`drop-shadow(0 0 10px ${obj.accent})`:"none"}}>
            <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="rgba(15,30,46,.06)" strokeWidth="5"/><circle cx="32" cy="32" r="28" fill="none" stroke={obj.ringOrangeDir==='above'?(dayNut.kcal/DAY_TARGETS.kcal>obj.ringOrangeThreshold?"#E8863A":dayNut.kcal/DAY_TARGETS.kcal>=0.95?"#34C759":obj.accent):(dayNut.kcal/DAY_TARGETS.kcal<obj.ringOrangeThreshold?"#E8863A":dayNut.kcal/DAY_TARGETS.kcal>=0.95?"#34C759":obj.accent)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.min(dayNut.kcal/DAY_TARGETS.kcal,1)*176} 176`} transform="rotate(-90 32 32)" style={{transition:"stroke-dasharray .6s cubic-bezier(.4,0,.2,1)"}}/></svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#1A1A1A"}}><AnimNum value={Math.round(dayNut.kcal/DAY_TARGETS.kcal*100)} duration={600} suffix="%"/></div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".3px"}}>{obj.kcalFraming} du jour</div>
            <div style={{fontSize:22,fontWeight:700,color:"#1A1A1A",marginTop:2}}><AnimNum value={Math.round(dayNut.kcal)} duration={500}/> <span style={{fontSize:13,fontWeight:600,color:"#6B7280"}}>/ {DAY_TARGETS.kcal} kcal</span></div>
          </div>
        </div>
        <div className="macros" data-tour="macros"><MPill letter="P" value={dayNut.p} target={DAY_TARGETS.p}/><MPill letter="L" value={dayNut.l} target={DAY_TARGETS.l}/><MPill letter="G" value={dayNut.g} target={DAY_TARGETS.g}/></div>
        <div className="day-hint">{obj.dayHint}</div>
      </div>
      {(()=>{
        const planKcal=logs.filter(l=>!l.eqId?.startsWith?.('ql_')).reduce((s,l)=>s+l.kcal,0);
        const qlKcal=logs.filter(l=>l.eqId?.startsWith?.('ql_')).reduce((s,l)=>s+l.kcal,0);
        const target=DAY_TARGETS.kcal||1;const remaining=Math.max(0,target-planKcal-qlKcal);
        const pPlan=Math.min(planKcal/target,1);const pQl=Math.min(qlKcal/target,1-pPlan);
        if(qlKcal===0)return null;
        return <div style={{marginBottom:10,padding:"8px 14px",borderRadius:14,background:"rgba(15,30,46,.02)",border:"1px solid rgba(15,30,46,.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:".3px"}}>Budget restant</span>
            <span style={{fontSize:12,fontWeight:700,color:remaining>0?"#1A1A1A":"#E8863A"}}>{Math.round(remaining)} kcal</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"rgba(15,30,46,.06)",overflow:"hidden",display:"flex"}}>
            {pPlan>0&&<div style={{width:`${pPlan*100}%`,height:"100%",background:obj.accent,transition:"width .4s ease-out"}}/>}
            {pQl>0&&<div style={{width:`${pQl*100}%`,height:"100%",background:"#E8863A",transition:"width .4s ease-out"}}/>}
          </div>
          <div style={{display:"flex",gap:12,marginTop:5,fontSize:10,color:"#6B7280",fontWeight:500}}>
            <span><span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:obj.accent,marginRight:3,verticalAlign:"middle"}}/>Plan {Math.round(planKcal)}</span>
            <span><span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"#E8863A",marginRight:3,verticalAlign:"middle"}}/>Repas ext. {Math.round(qlKcal)}</span>
          </div>
        </div>
      })()}
      {SLOTS.map((slot,slotIdx)=>{
        const sl=logs.filter(l=>l.slotId===slot.id);const sk=sl.reduce((s,l)=>s+l.kcal,0);
        // Clean slot label: remove parenthetical, add format hint underneath
        const slotDisplay=(()=>{
          const formatHints={"REPAS_FROID_PAIN":"Base pain","REPAS_FROID_BOWL":"Base bowl / meal prep","PRE_WO":"Avant l'entraînement","POST_WO":"Après l'entraînement"};
          // PDJ: derive base from assigned eqs
          let pdjHint=null;
          if(slot.id==="PDJ"){
            const pdjEqs=SLOT_ALLOWED[slot.id]||[];
            const hasPain=pdjEqs.includes("pain");
            const hasCereales=pdjEqs.includes("cereales_ig_modere");
            if(hasPain&&hasCereales)pdjHint="Base tartines & céréales";
            else if(hasPain)pdjHint="Base tartines";
            else if(hasCereales)pdjHint="Base céréales";
          }
          const clean=slot.label.replace(/\s*\(.*\)\s*$/,"");
          const hint=pdjHint||formatHints[slot.id]||null;
          return {name:clean,hint};
        })();
        return <div className="slot" key={slot.id} style={{borderLeft:`3px solid ${sl.length>0?obj.accentBorder:"rgba(15,30,46,.06)"}`}}>
          <div className="slot-header"><div className="slot-left"><div><div className="slot-name">{slotDisplay.name}</div>{slotDisplay.hint&&<div style={{fontSize:10,color:obj.accent,fontWeight:600,marginTop:1,opacity:.7}}>{slotDisplay.hint}</div>}<div className="slot-time">{sl.length>0?<><span style={{color:obj.accent,fontWeight:600}}>{Math.round(sk)} kcal</span></>:<span style={{color:"rgba(15,30,46,.25)",fontSize:11}}>Appuie sur + pour commencer</span>}</div></div></div><button aria-label="Ajouter un aliment" className="slot-add" data-tour={slotIdx===0?"slot-add":undefined} onClick={()=>setAddSlot(slot.id)}>+</button></div>
          {sl.length>0&&<div style={{marginTop:6}}>{sl.map(l=>{const isQl=typeof l.eqId==='string'&&l.eqId.startsWith('ql_');return <div className="log-item" role="button" tabIndex={0} key={l.id} onClick={()=>setConfirmDel(l)} style={{cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}><span style={{width:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{isQl?<span style={{fontSize:14}}>🍽</span>:<EqIcon eqId={l.eqId} size={17}/>}</span><span className="log-name">{isQl?(l.qlLabel||getLogLabel(l.eqId,l.itemId)):getLogLabel(l.eqId,l.itemId)}</span>{isQl?<span style={{display:"inline-block",fontSize:9,fontWeight:700,background:"rgba(232,134,58,.08)",color:"#E8863A",padding:"2px 7px",borderRadius:99,marginLeft:6,border:"1px solid rgba(232,134,58,.15)"}}>Repas ext.</span>:l.isOutOfPlan&&<span className="chip-hp">HP</span>}</div><div style={{textAlign:"right",flexShrink:0,paddingLeft:8,display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:12,fontWeight:700,color:"#1A1A1A"}}>{l.kcal}</span><span style={{fontSize:10,color:l.qtyPortion===1?obj.accentLine:"#E8863A",fontWeight:600,minWidth:38}}>{l.qtyPortion===1?"1 port.":l.qtyPortion+" port."}</span></div></div>})}</div>}
          {sl.length===0&&<div style={{height:4}}/>}
        </div>
      })}
    </div>:<div key="week-view" className="view-switch"><WeekView logs={logs} weekConsumed={weekConsumed} weekNutrients={weekNutrients}/></div>}
    {addSlot&&<AddModal slotId={addSlot} onClose={()=>setAddSlot(null)} onLog={handleLog} everLoggedHp={hasHp} weekConsumed={weekConsumed} todayLogs={logs} quickLog={quickLog}/>}
    {confirmDel&&<div className="overlay" onClick={()=>setConfirmDel(null)}><div style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px",animation:"slideUp .25s ease-out"}} onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A"}}>Supprimer cet ajout ?</div>
        <div style={{fontSize:13,color:"#6B7280",marginTop:6}}>{getLogLabel(confirmDel.eqId,confirmDel.itemId)} · {confirmDel.kcal} kcal</div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"12px 0",borderRadius:14,border:"1px solid rgba(15,30,46,.10)",background:"#F5F4F1",fontSize:14,fontWeight:700,color:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
        <button onClick={()=>{haptic(20);onDeleteLog?.(confirmDel.id,confirmDel.eqId,confirmDel.qtyPortion,confirmDel.kcal,confirmDel.p,confirmDel.l,confirmDel.g);setConfirmDel(null);if(snackTimer.current)clearTimeout(snackTimer.current);setSnack("✓ Supprimé");snackTimer.current=setTimeout(()=>setSnack(null),2000)}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",background:"#FF3B30",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Supprimer</button>
      </div>
    </div></div>}
    {snack&&<div className="snackbar" onClick={()=>setSnack(null)}>{snack}</div>}
  </div>
}

function WeekView({logs,weekConsumed,weekNutrients}){
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
    if(obj.progressDir==="neutral"&&kcalPct>1.1)return {title:"Attention aux calories",msg:"Tu dépasses ta cible hebdo. L'objectif est de rester stable."};
    if(obj.progressDir==="neutral"&&kcalPct<expectedPct/100*0.7)return {title:"Calories en retard",msg:"Tu es en dessous de ta cible — la régularité est la clé."};
    if(obj.progressDir==="up"&&kcalPct<expectedPct/100*0.7)return {title:"Calories en retard",msg:"Tu es en dessous de ta cible — n'oublie pas tes collations."};
    // Everything on track — positive message
    return {title:"Bonne dynamique",msg:"Tes équivalences et tes calories sont dans la cible. Continue comme ça !"}
  },[planEqs,WEEK_CONSUMED,PLAN_TARGETS,wk,WEEK_TARGETS,obj]);

  return <>
    <div className="alert-card alert-soft"><span style={{display:"flex",flexShrink:0,marginTop:2}}><IcBulb size={20} color={obj.accent}/></span><div style={{flex:1}}><div className="alert-title">{weekAlert.title}</div><div className="alert-msg">{weekAlert.msg}</div></div></div>
    <div className="card">
      <div className="flex-between"><span className="card-title">Bilan semaine</span><span style={{fontSize:12,fontWeight:700,color:"#6B7280"}}>{(()=>{const d=new Date().getDay();const r=d===0?0:7-d;return r===0?"Dernier jour":`${r} jour${r>1?"s":""} restant${r>1?"s":""}`})()}</span></div>
      <div className="flex-between mt8"><span style={{fontSize:22,fontWeight:700,color:"#1A1A1A"}}>{wk.kcal.toLocaleString()}</span><span style={{fontSize:13,color:"#6B7280"}}>/ {WEEK_TARGETS.kcal.toLocaleString()} kcal</span></div>
      <PBar value={wk.kcal} max={WEEK_TARGETS.kcal}/>
      <div className="macros"><MPill letter="P" value={wk.p} target={WEEK_TARGETS.p}/><MPill letter="L" value={wk.l} target={WEEK_TARGETS.l}/><MPill letter="G" value={wk.g} target={WEEK_TARGETS.g}/></div>
    </div>
    {hpKcal>0&&<div className="card" style={{borderColor:"rgba(232,134,58,.4)"}}>
      <div className="flex-between"><span style={{fontSize:13,fontWeight:700,color:"#E8863A",display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:4,background:"#E8863A",flexShrink:0}}/>Hors plan</span><span style={{fontSize:13,fontWeight:700,color:"#E8863A"}}>{hpKcal} kcal</span></div>
      <div style={{fontSize:11,color:"#6B7280",marginTop:4}}>{hpLogs.length} ajout{hpLogs.length>1?"s":""} · {WEEK_TARGETS.kcal>0?Math.round(hpKcal/WEEK_TARGETS.kcal*100):0}% de la cible</div>
    </div>}
    <input className="search" placeholder="Rechercher une équivalence…" value={search} onChange={e=>setSearch(e.target.value)}/>
    {filtered.map(eq=>{
      const c=WEEK_CONSUMED[eq.eqId]||0,t=PLAN_TARGETS[eq.eqId]||0,pct=t>0?c/t*100:0;
      const done=pct>=100,over=pct>130,late=pct<60&&eq.eqImportance==="key";
      const col=done?(over?"#E8863A":"#34C759"):obj.accent;
      return <div className="eq-card" key={eq.eqId}>
        <span style={{width:36,display:"flex",alignItems:"center",justifyContent:"center"}}><EqIcon eqId={eq.eqId} size={22}/></span>
        <div className="eq-body"><div className="eq-name">{eq.label}</div><div className="eq-progress">{c}/{t} sem.{done&&!over&&" — complété"}{over&&" — au-dessus"}{late&&" — en retard"}</div><div className="eq-bar"><div className="eq-bar-fill" style={{width:`${Math.min(pct,100)}%`,background:col}}/></div></div>
        {done&&<span style={{display:"flex"}}><IcCheck size={16} color="#34C759"/></span>}
      </div>
    })}
  </>
}

/* ═══ ADVICE BODY PARSER ═══ */
function parseAdviceBody(body){
  if(!body) return [];
  const HEADERS=["Pourquoi c'est fondamental","Pourquoi c'est important","L'objectif","Le point","Le plan d'action","La perspective"];
  const headerLower=HEADERS.map(h=>h.toLowerCase());
  // Split all lines, then group into sections by detecting header lines
  const allLines=body.split('\n').map(l=>l.trim()).filter(Boolean);
  const sections=[];
  let current=null;
  allLines.forEach(line=>{
    const matchIdx=headerLower.findIndex(h=>line.toLowerCase()===h);
    if(matchIdx>=0){
      current={header:HEADERS[matchIdx],lines:[]};
      sections.push(current);
    } else if(current){
      const colonIdx=line.indexOf(' : ');
      if(colonIdx>0&&colonIdx<40){
        current.lines.push({type:'kv',key:line.slice(0,colonIdx),value:line.slice(colonIdx+3)});
      } else {
        current.lines.push({type:'text',value:line});
      }
    } else {
      // Intro paragraph (before any header)
      if(!sections.length||sections[sections.length-1].header!==null){
        sections.push({header:null,lines:[]});
      }
      sections[sections.length-1].lines.push({type:'text',value:line});
    }
  });
  return sections;
}
function Portal({children}){return createPortal(children,document.body)}

function SwipeModal({onClose,children,style={}}){
  const modalRef=useRef(null);
  const startY=useRef(0);
  const currentY=useRef(0);
  const dragging=useRef(false);
  const locked=useRef(false); // true = normal scroll wins, skip drag

  const onTouchStart=useCallback(e=>{
    const t=e.touches[0];
    startY.current=t.clientY;
    currentY.current=0;
    dragging.current=false;
    locked.current=false;
  },[]);

  const onTouchMove=useCallback(e=>{
    if(locked.current)return; // scroll mode — don't interfere
    const dy=e.touches[0].clientY-startY.current;
    // First significant move: decide drag vs scroll
    if(!dragging.current){
      if(dy<0){locked.current=true;return;} // swiping up → normal scroll
      const modal=modalRef.current;
      if(modal&&modal.scrollTop>2){locked.current=true;return;} // content scrolled → normal scroll
      if(dy>6)dragging.current=true; // swiping down at scroll top → start drag
      else return;
    }
    currentY.current=dy;
    if(modalRef.current)modalRef.current.style.transform=`translateY(${dy}px)`;
    e.preventDefault();
  },[]);

  const onTouchEnd=useCallback(()=>{
    if(!dragging.current){locked.current=false;return;}
    dragging.current=false;
    locked.current=false;
    if(currentY.current>70){onClose();}
    else if(modalRef.current){modalRef.current.style.transform='';modalRef.current.style.transition='transform .2s ease-out';setTimeout(()=>{if(modalRef.current)modalRef.current.style.transition='';},200);}
  },[onClose]);

  return <div className="overlay" onClick={onClose}>
    <div ref={modalRef} role="dialog" className="modal" onClick={e=>e.stopPropagation()} style={style}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{paddingBottom:8}}>
        <div className="modal-handle"/>
      </div>
      <button onClick={onClose} aria-label="Fermer" style={{position:"absolute",top:12,right:14,width:30,height:30,borderRadius:99,background:"rgba(15,30,46,.06)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14,color:"#9CA3AF",zIndex:1}}>✕</button>
      {children}
    </div>
  </div>;
}
const SECTION_ICONS={
  "pourquoi c'est fondamental":"💡","pourquoi c'est important":"💡",
  "l'objectif":"🎯","le point":"📌",
  "le plan d'action":"✅","la perspective":"🔭"
};

/* ═══ ADVICE DETAIL MODAL ═══ */
function AdviceDetail({adv,onClose,status}){const obj=useObjective();
  const [openSec,setOpenSec]=useState(new Set());
  const bodySections=useMemo(()=>parseAdviceBody(adv.body),[adv.body]);
  const namedSections=bodySections.filter(s=>s.header);
  const introSection=bodySections.find(s=>!s.header);
  const toggleSec=(i)=>setOpenSec(s=>{const n=new Set(s);n.has(i)?n.delete(i):n.add(i);return n});
  return <SwipeModal onClose={onClose} style={{maxHeight:"85%",display:"flex",flexDirection:"column"}}>
    <div style={{overflowY:"auto",flex:1,paddingBottom:8}}>
      <div style={{fontSize:22,fontWeight:700,color:"var(--text)",fontFamily:"'Cormorant Garamond',serif",marginBottom:6,lineHeight:1.3}}>{adv.title}</div>
      <div className="advice-badges" style={{marginBottom:16}}><span className={`badge ${adv.axis==="priority"?"badge-pri":"badge-sec"}`}>{adv.axis==="priority"?"Prioritaire":"Secondaire"}</span><span className="badge badge-st">{status||adv.module}</span></div>

      <div style={{fontSize:14,color:"#374151",lineHeight:1.7,marginBottom:16}}>{adv.shortBody}</div>

      <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>🎯</span> Objectif</div>
      <div style={{fontSize:14,color:"#374151",lineHeight:1.7,marginBottom:14}}>{adv.summaryObjective}</div>
      <div style={{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>✅</span> Plan d'action</div>
      {adv.summaryBullets.map((b,i)=><div key={i} style={{fontSize:14,color:"#374151",lineHeight:1.7,paddingLeft:14,marginBottom:4,position:"relative"}}><span style={{position:"absolute",left:0,color:obj.accent,fontWeight:700}}>•</span>{b}</div>)}
      {adv.summaryTip&&<div style={{marginTop:12,padding:"12px 14px",background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,borderRadius:14,fontSize:13,lineHeight:1.6,color:"#374151",display:"flex",gap:10,alignItems:"flex-start"}}><span style={{flexShrink:0,marginTop:2}}><IcBulb size={16} color={obj.accent}/></span><span>{adv.summaryTip}</span></div>}

      {introSection&&introSection.lines.length>0&&<div style={{marginTop:14,fontSize:14,color:"#374151",lineHeight:1.7,fontStyle:"italic"}}>{introSection.lines.map((l,i)=><span key={i}>{l.value} </span>)}</div>}

      {namedSections.length>0&&<div style={{marginTop:16,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{fontSize:12,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".5px",marginBottom:2}}>Aller plus loin</div>
        {namedSections.map((sec,si)=>{
          const icon=SECTION_ICONS[sec.header.toLowerCase()]||"📋";
          const isOpen=openSec.has(si);
          return <div key={si} style={{borderRadius:14,border:`1px solid ${isOpen?obj.accentBorder:"rgba(15,30,46,.08)"}`,background:isOpen?`linear-gradient(135deg,rgba(14,30,46,.02),${obj.accentSoft})`:"#fff",overflow:"hidden",transition:"all .2s"}}>
            <button onClick={()=>toggleSec(si)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"12px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
              <span style={{fontSize:15,flexShrink:0}}>{icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:700,color:isOpen?obj.accent:"var(--text)"}}>{sec.header}</span>
              <span style={{fontSize:12,color:isOpen?obj.accent:"#9CA3AF",transform:isOpen?"rotate(180deg)":"rotate(0)",transition:"transform .2s",display:"inline-block"}}>▾</span>
            </button>
            {isOpen&&<div style={{padding:"0 14px 14px",animation:"fadeUp .2s ease-out"}}>
              {sec.lines.map((line,li)=>
                line.type==='kv'
                  ?<div key={li} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:obj.accent,flexShrink:0,marginTop:8}}/>
                    <div style={{flex:1,fontSize:13,color:"#374151",lineHeight:1.7}}>
                      <span style={{fontWeight:700,color:"var(--text)"}}>{line.key}</span>
                      <span> — {line.value}</span>
                    </div>
                  </div>
                  :<div key={li} style={{fontSize:13,color:"#4B5563",lineHeight:1.7,marginBottom:4}}>{line.value}</div>
              )}
            </div>}
          </div>
        })}
      </div>}
    </div>
    <button className="btn-primary" style={{marginTop:10,flexShrink:0}} onClick={onClose}>Fermer</button>
  </SwipeModal>
}

/* ═══ TAB: CONSEILS ═══ */
function AdviceTab({onCreateBilan,isWarmup,weekConsumed,weekNutrients,daysLogged,onCheckMilestones}){
  const d=useData();
  const obj=useObjective();
  const ADVICES=d?.ADVICES||DEFAULT_ADVICES;
  const BILANS=d?.BILANS||[];
  const MICRO_TIPS=d?.MICRO_TIPS||DEFAULT_MICRO_TIPS;

  const [view,setView]=useState("focus");
  const [selAdv,setSelAdv]=useState(null);const [readSet,setReadSet]=useState(new Set(["adv_02","adv_05"]));
  const [evalOpen,setEvalOpen]=useState(false);const [evalScores,setEvalScores]=useState({});const [biblioQ,setBiblioQ]=useState("");
  const [evalWellbeing,setEvalWellbeing]=useState({energy:3,hunger:3,sleep:3,stress:3});
  const allPri=ADVICES.filter(a=>a.axis==="priority").sort((a,b)=>b.priorityScore-a.priorityScore);
  const allSec=ADVICES.filter(a=>a.axis==="secondary").sort((a,b)=>b.priorityScore-a.priorityScore);

  // Advice mastery status from bilan history
  const advStatuses=useMemo(()=>computeAdviceStatuses(BILANS),[BILANS]);

  // Focus: skip mastered/recheck → next in line slides in
  const isFocusable=(a)=>{const s=advStatuses[a.id];return !s||s.status==='active'};
  const pri=allPri.filter(isFocusable).slice(0,4);
  const sec=allSec.filter(isFocusable).slice(0,3);

  const getStatus=(a)=>{
    const ds=getAdviceDisplayStatus(a.id,advStatuses);
    if(ds==='Nouveau'&&readSet.has(a.id)) return 'Lu';
    return ds;
  };
  const byStatus={"Acquis":[],"En progrès":[],"Nouveau":[],"Lu":[]};
  ADVICES.forEach(a=>{const s=getStatus(a);if(byStatus[s])byStatus[s].push(a)});

  // Eval: active = current focus, recheck = any mastered advice due for re-check
  const evalRecheck=useMemo(()=>ADVICES.filter(a=>advStatuses[a.id]?.status==='recheck'),[ADVICES,advStatuses]);
  const evalSplit=useMemo(()=>({active:[...pri,...sec],recheck:evalRecheck}),[pri,sec,evalRecheck]);

  function AdvItem({a}){
    const isRead=readSet.has(a.id);
    return(
    <div className="advice-item" role="button" tabIndex={0} onClick={()=>{setSelAdv(a);setReadSet(s=>new Set([...s,a.id]))}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div className="advice-title">{a.title}</div>
          <div style={{fontSize:13,color:"#6B7280",lineHeight:1.5,marginTop:5}}>{a.shortBody}</div>
        </div>
        <button onClick={e=>{e.stopPropagation();setReadSet(s=>{const n=new Set(s);if(n.has(a.id))n.delete(a.id);else n.add(a.id);return n})}} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,background:isRead?"rgba(52,199,89,.08)":obj.accentSoft,border:`1px solid ${isRead?"rgba(52,199,89,.25)":obj.accentBorder}`,borderRadius:99,padding:"4px 10px",cursor:"pointer",transition:"all .2s"}}>
          {isRead&&<IcCheck size={10} color="#34C759"/>}
          <span style={{fontSize:10,fontWeight:700,color:isRead?"#34C759":obj.accent}}>{isRead?"Lu":"Non lu"}</span>
        </button>
      </div>
      <div className="advice-badges" style={{marginTop:8}}>
        <span className={`badge ${a.axis==="priority"?"badge-pri":"badge-sec"}`}>{a.axis==="priority"?"Prioritaire":"Secondaire"}</span>
        <span className="badge badge-st">{getStatus(a)}</span>
      </div>
    </div>
  )}

  return <div className="page">
    <div className="page-title">Conseils</div><div className="page-meta">{isWarmup?"Prise en main":(()=>{const ps=d?._planStartDate?new Date(d._planStartDate):null;if(!ps)return"";const dow=ps.getDay();let start=ps;if(dow>=3||dow===0){start=new Date(ps);start.setDate(start.getDate()+(dow===0?1:8-dow));start.setHours(0,0,0,0)}const w=Math.floor(Math.max(0,(new Date()-start)/86400000)/7)+1;return `Semaine ${w}`})()}</div>
    <Seg options={[{id:"focus",label:"Focus"},{id:"biblio",label:"Bibliothèque"}]} value={view} onChange={setView}/>
    {MICRO_TIPS.length>0&&(()=>{const dayOfYear=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/(1000*60*60*24));const tip=MICRO_TIPS[dayOfYear%MICRO_TIPS.length];return <div className="tip-banner"><span style={{display:"flex"}}><IcBulb size={18} color={obj.accent}/></span><div className="tip-text">{tip.textFr}</div></div>})()}
    {view==="focus"?<>
      <div className="section-label">Axes prioritaires</div>{pri.map(a=><AdvItem key={a.id} a={a}/>)}
      <div className="section-label">Axes secondaires</div>{sec.map(a=><AdvItem key={a.id} a={a}/>)}
      {isWarmup?<div className="card" style={{textAlign:"center",marginTop:16,opacity:.5}}><div style={{fontSize:14,fontWeight:700,color:"#6B7280"}}>Évaluation disponible après ta première semaine</div></div>
      :<div className="card" role="button" tabIndex={0} style={{textAlign:"center",marginTop:16,cursor:"pointer"}} onClick={()=>setEvalOpen(true)}><div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Évaluer ma semaine →</div><div style={{fontSize:12,color:"#6B7280",marginTop:4}}>Disponible dimanche</div></div>}
    </>:<>
      <input className="search" placeholder="Rechercher un conseil…" value={biblioQ} onChange={e=>setBiblioQ(e.target.value)}/>
      {Object.entries(byStatus).map(([st,advs])=>{const filtered=biblioQ?advs.filter(a=>(a.title+a.shortBody).toLowerCase().includes(biblioQ.toLowerCase())):advs;return filtered.length>0&&<div key={st}><div className="section-label">{st}</div>{filtered.map(a=><AdvItem key={a.id} a={a}/>)}</div>})}
    </>}
    {selAdv&&<AdviceDetail adv={selAdv} onClose={()=>setSelAdv(null)} status={getStatus(selAdv)}/>}
    {evalOpen&&<div className="overlay" onClick={()=>setEvalOpen(false)}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/><div className="modal-title">Évaluation {(()=>{const ps=d?._planStartDate?new Date(d._planStartDate):null;if(!ps)return"";const dow=ps.getDay();let start=ps;if(dow>=3||dow===0){start=new Date(ps);start.setDate(start.getDate()+(dow===0?1:8-dow));start.setHours(0,0,0,0)}const w=Math.floor(Math.max(0,(new Date()-start)/86400000)/7)+1;return `semaine ${w}`})()}</div><div className="modal-sub">Comment s'est passée ta semaine ?</div>
      {/* Active advices — full evaluation */}
      {evalSplit.active.map(a=><div key={a.id} style={{marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>{a.title}</div>
        <div style={{display:"flex",gap:6}}>{[{v:2,l:"Solide",c:"#34C759"},{v:1,l:"En progrès",c:obj.accent},{v:0,l:"Pas encore",c:"#E5342D"}].map(o=>{const sel=evalScores[a.id]===o.v;return <button key={o.v} onClick={()=>setEvalScores(s=>({...s,[a.id]:o.v}))} style={{flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,background:sel?`${o.c}10`:"#F5F4F1",border:`1px solid ${sel?`${o.c}40`:"rgba(15,30,46,.10)"}`,color:sel?o.c:"#6B7280",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{width:6,height:6,borderRadius:3,background:o.c,flexShrink:0}}/>{o.l}</button>})}</div>
      </div>)}

      {/* Re-check advices — mastered, periodic verification */}
      {evalSplit.recheck.length>0&&<>
        <div style={{marginTop:8,marginBottom:10,paddingTop:10,borderTop:"1px solid rgba(15,30,46,.08)"}}>
          <div style={{fontSize:11,fontWeight:700,color:obj.accent,textTransform:"uppercase",letterSpacing:".04em",marginBottom:8}}>Re-check — toujours acquis ?</div>
        </div>
        {evalSplit.recheck.map(a=><div key={a.id} style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:6,display:"flex",alignItems:"center",gap:8}}>{a.title}<span style={{fontSize:9,fontWeight:700,color:obj.accent,background:obj.accentSoft,padding:"2px 8px",borderRadius:99,border:`1px solid ${obj.accentBorder}`}}>Acquis</span></div>
          <div style={{display:"flex",gap:6}}>{[{v:2,l:"Toujours solide",c:"#34C759"},{v:0,l:"À retravailler",c:"#E5342D"}].map(o=>{const sel=evalScores[a.id]===o.v;return <button key={o.v} onClick={()=>setEvalScores(s=>({...s,[a.id]:o.v}))} style={{flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,background:sel?`${o.c}10`:"#F5F4F1",border:`1px solid ${sel?`${o.c}40`:"rgba(15,30,46,.10)"}`,color:sel?o.c:"#6B7280",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span style={{width:6,height:6,borderRadius:3,background:o.c,flexShrink:0}}/>{o.l}</button>})}</div>
        </div>)}
      </>}
      {/* Wellbeing sliders */}
      <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid rgba(15,30,46,.08)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",marginBottom:10}}>Comment tu te sens ?</div>
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
        if(onCreateBilan){
          const now=new Date();const day=now.getDay();const diffToMon=day===0?-6:1-day;
          const mon=new Date(now);mon.setDate(now.getDate()+diffToMon-7);mon.setHours(0,0,0,0);
          const sun=new Date(mon);sun.setDate(mon.getDate()+6);
          // Compute data-driven score via bilanEngine
          const BILANS=d?.BILANS||[];
          const bilanResult=computeBilan({
            weekNutrients:weekNutrients||{kcal:0,p:0,l:0,g:0},
            weekConsumed:weekConsumed||{},
            planTargets:d?.PLAN_TARGETS||{},
            weekTargets:d?.WEEK_TARGETS||{kcal:0,p:0,l:0,g:0},
            daysLogged:daysLogged||0,
            objective:d?.CLIENT?.objectiveCode||"PW",
            wellbeing:evalWellbeing,
            prevBilan:BILANS[0]||null,
            firstName:d?.CLIENT?.firstName||"",
            measurements:d?.MEASUREMENTS||[],
            planCreatedAt:d?._planCreatedAt||null,
            clientHeight:d?.CLIENT?.heightCm||null,
          });
          onCreateBilan({
            weekStart:mon.toISOString().slice(0,10),
            weekEnd:sun.toISOString().slice(0,10),
            adherenceScore:bilanResult.score,
            energyLevel:evalWellbeing.energy,
            hungerLevel:evalWellbeing.hunger,
            sleepQuality:evalWellbeing.sleep,
            stressLevel:evalWellbeing.stress,
            notes:JSON.stringify({evalScores,bilanData:bilanResult}),
          });
          // Check milestones after bilan creation
          if(onCheckMilestones){
            const BILANS_ARR=d?.BILANS||[];
            onCheckMilestones({
              bilanCount:BILANS_ARR.length+1,
              lastBilanScore:bilanResult.score,
              bilans:[{score:bilanResult.score,notes:JSON.stringify({bilanData:bilanResult})},...BILANS_ARR],
            });
          }
        }
        setEvalOpen(false);setEvalScores({});setEvalWellbeing({energy:3,hunger:3,sleep:3,stress:3});
      }}>Enregistrer mon bilan</button>
    </div></div>}
  </div>
}

/* ═══ TAB: HISTORIQUE ═══ */
function BilanDetail({bilan,allBilans,onBack}){
  const d=useData();
  const obj=useObjective();
  const label=getScoreLabel(obj,bilan.score);
  const col=bilan.score>=85?"#34C759":bilan.score>=70?obj.accent:bilan.score>=55?"#6B7280":"#E8863A";
  const bilanIdx=(allBilans||[]).findIndex(b=>b.week===bilan.week);
  const prevBilan=bilanIdx>=0&&bilanIdx<(allBilans||[]).length-1?(allBilans||[])[bilanIdx+1]:null;
  const delta=prevBilan?bilan.score-prevBilan.score:null;

  // Try to parse bilanData and evalScores from notes
  let bd=null;let evalScores=null;
  try{const parsed=JSON.parse(bilan.notes||"{}");bd=parsed.bilanData||null;evalScores=parsed.evalScores||null}catch{}

  const BarScore=({label:lbl,score:sc,color:c})=><div style={{marginBottom:10}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <span style={{fontSize:12,fontWeight:600,color:"#1A1A1A"}}>{lbl}</span>
      <span style={{fontSize:12,fontWeight:700,color:c||"#6B7280"}}>{sc}/100</span>
    </div>
    <div style={{height:6,borderRadius:3,background:"rgba(15,30,46,.06)",overflow:"hidden"}}>
      <div style={{height:"100%",borderRadius:3,background:c||obj.accent,width:`${Math.min(100,sc)}%`,transition:"width .5s ease"}}/>
    </div>
  </div>;

  const scoreColor=(s)=>s>=80?"#34C759":s>=60?obj.accent:s>=40?"#E8863A":"#E5342D";

  return <div className="page">
    <button aria-label="Retour" className="hdr-back" onClick={onBack} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Rapport {bilan.week}</div>
    <div className="page-meta">{bilan.dates}</div>

    {/* Score circle */}
    <div style={{display:"flex",justifyContent:"center",margin:"20px 0",position:"relative"}}>
      <div style={{width:84,height:84,borderRadius:99,background:`${col}15`,border:`3px solid ${col}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontWeight:700,fontSize:28,color:"var(--navy)",lineHeight:1}}>{bilan.score}</div>
        <div style={{fontSize:9,fontWeight:600,color:col,marginTop:2}}>/100</div>
      </div>
      {delta!=null&&delta!==0&&<div style={{position:"absolute",right:"calc(50% - 64px)",top:0,fontSize:11,fontWeight:700,color:delta>0?"#34C759":"#E8863A",background:delta>0?"rgba(52,199,89,.08)":"rgba(232,134,58,.08)",padding:"2px 8px",borderRadius:99}}>{delta>0?"+":""}{delta} pts</div>}
    </div>
    <div style={{textAlign:"center",fontSize:15,fontWeight:700,color:col,marginBottom:2}}>{label}</div>
    <div style={{textAlign:"center",fontSize:11,color:"#9CA3AF",marginBottom:16}}>Score basé sur tes logs réels</div>

    {/* Disclaimers */}
    {bd&&bd.disclaimers&&bd.disclaimers.length>0&&<div style={{margin:"0 0 12px",padding:"10px 14px",borderRadius:12,background:"rgba(198,160,91,.08)",border:"1px solid rgba(198,160,91,.15)"}}>
      {bd.disclaimers.map((disc,i)=><div key={i} style={{fontSize:12,color:"#6B7280",lineHeight:1.6,fontStyle:"italic"}}>{disc}</div>)}
    </div>}

    {/* Breakdown bars (if data-driven) */}
    {bd&&bd.breakdown&&<div className="card" style={{marginBottom:12}}>
      <div className="card-title" style={{marginBottom:12}}>Détail du score</div>
      <BarScore label="Calories" score={bd.breakdown.kcal.score} color={scoreColor(bd.breakdown.kcal.score)}/>
      <BarScore label="Protéines" score={bd.breakdown.protein.score} color={scoreColor(bd.breakdown.protein.score)}/>
      <BarScore label="Équivalences" score={bd.breakdown.eq.score} color={scoreColor(bd.breakdown.eq.score)}/>
      <BarScore label="Régularité" score={bd.breakdown.regularity.score} color={scoreColor(bd.breakdown.regularity.score)}/>
    </div>}

    {/* Advice evaluation results */}
    {evalScores&&Object.keys(evalScores).length>0&&(()=>{
      const ADVICES=d?.ADVICES||[];
      const scoreLabels={2:{l:"Solide",c:"#34C759"},1:{l:"En progrès",c:obj.accent},0:{l:"Pas encore",c:"#E5342D"}};
      const entries=Object.entries(evalScores).map(([id,v])=>{
        const adv=ADVICES.find(a=>a.id===id);
        return {id,title:adv?.title||id,score:v,...(scoreLabels[v]||scoreLabels[1])};
      }).sort((a,b)=>b.score-a.score);
      const solideCount=entries.filter(e=>e.score===2).length;
      return <div className="card" style={{marginBottom:12}}>
        <div className="card-title">Évaluation conseils</div>
        <div style={{fontSize:11,color:"#9CA3AF",marginTop:2,marginBottom:10}}>{solideCount}/{entries.length} conseils tenus</div>
        {entries.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid rgba(15,30,46,.05)"}}>
          <span style={{fontSize:12,color:"#1A1A1A",fontWeight:500,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.title}</span>
          <span style={{fontSize:10,fontWeight:700,color:e.c,background:`${e.c}10`,padding:"2px 10px",borderRadius:99,flexShrink:0,marginLeft:8}}>{e.l}</span>
        </div>)}
      </div>
    })()}

    {/* Feedback */}
    <div className="card" style={{marginBottom:12}}>
      <div className="card-title">Résumé</div>
      <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.7,marginTop:8}}>
        {bd?.feedback||getBilanSummary(obj,bilan.score)}
      </div>
    </div>

    {/* Insights */}
    {bd&&bd.insights&&bd.insights.length>0&&<div className="card" style={{marginBottom:12}}>
      <div className="card-title">Observations</div>
      <div style={{marginTop:8}}>
        {bd.insights.map((ins,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8,padding:"8px 10px",borderRadius:10,background:ins.type==="strength"?"rgba(52,199,89,.06)":ins.type==="weak"?"rgba(232,134,58,.06)":"rgba(15,30,46,.03)"}}>
          <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{ins.icon}</span>
          <div style={{fontSize:12,color:ins.type==="strength"?"#1A6B35":ins.type==="weak"?"#9A4C1A":"#374151",lineHeight:1.6,fontWeight:500}}>{ins.text}</div>
        </div>)}
      </div>
    </div>}

    {/* Tips */}
    {bd&&bd.tips&&bd.tips.length>0&&<div className="card" style={{marginBottom:12}}>
      <div className="card-title">Actions pour cette semaine</div>
      <div style={{marginTop:8}}>
        {bd.tips.map((tip,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:700,color:obj.accent,marginTop:2,flexShrink:0}}>{i+1}.</span>
          <div style={{fontSize:13,color:"#1A1A1A",lineHeight:1.6}}>{tip}</div>
        </div>)}
      </div>
    </div>}

    {/* Wellbeing (if available) */}
    {bd&&bd.wellbeing&&<div className="card">
      <div className="card-title">Bien-être</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
        {[{k:"energy",l:"Énergie",e:["😴","😑","😊","💪","⚡"]},{k:"hunger",l:"Faim",e:["😫","😕","😌","😊","🎯"]},{k:"sleep",l:"Sommeil",e:["😵","😴","😐","😊","😴"]},{k:"stress",l:"Stress",e:["🔴","🟠","🟡","🟢","💚"]}].map(s=>{
          const v=bd.wellbeing[s.k]||3;
          return <div key={s.k} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,background:"rgba(15,30,46,.03)"}}>
            <span style={{fontSize:16}}>{s.e[v-1]}</span>
            <div><div style={{fontSize:11,fontWeight:600,color:"#6B7280"}}>{s.l}</div><div style={{fontSize:11,color:"#9CA3AF"}}>{v}/5</div></div>
          </div>
        })}
      </div>
    </div>}
  </div>
}

function HistoryTab({logs,onDeleteLog}){
  const d=useData();
  const obj=useObjective();
  const BILANS=d?.BILANS||DEFAULT_BILANS;
  const SLOTS=d?.SLOTS||DEFAULT_SLOTS;
  const {getLogLabel}=useHelpers();
  const [viewBilan,setViewBilan]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [snack,setSnack]=useState(null);
  const snackTimer=useRef(null);

  if(viewBilan) return <BilanDetail bilan={viewBilan} allBilans={BILANS} onBack={()=>setViewBilan(null)}/>;

  const latest=BILANS[0];
  const latestCol=latest?(latest.score>=85?"#34C759":latest.score>=70?obj.accent:latest.score>=55?"#6B7280":"#E8863A"):"#6B7280";

  return <div className="page">
    <div className="page-title">Historique</div><div className="page-meta">Bilans & ajouts récents</div>
    {latest?<div className="card mt12">
      <div className="flex-between"><span className="card-title">Bilan {latest.week} ({latest.dates})</span><div style={{width:48,height:48,borderRadius:99,background:`${latestCol}18`,border:`2px solid ${latestCol}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:latestCol}}>{latest.score}</div></div>
      <div style={{fontSize:13,color:"#1A1A1A",marginTop:8,lineHeight:1.5}}><strong>{latest.label}</strong> <span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:latestCol,verticalAlign:"middle",marginLeft:2}}/></div>
      <div className="card-link" role="button" tabIndex={0} onClick={()=>setViewBilan(latest)} style={{cursor:"pointer"}}>Voir le rapport complet →</div>
    </div>:<div style={{textAlign:"center",padding:"28px 24px",background:obj.accentSoft,border:`1px dashed ${obj.accentBorder}`,borderRadius:20,marginTop:12}}>
      <div style={{fontSize:26,marginBottom:10}}>📊</div>
      <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A",marginBottom:6}}>Pas encore de bilan</div>
      <div style={{fontSize:13,color:"#6B7280",lineHeight:1.6}}>Ton premier bilan sera disponible dimanche, après ta première semaine complète. Continue à logger tes repas !</div>
    </div>}
    <div className="section-label">Historique des bilans</div>
    {BILANS.length>0?<div className="card">{BILANS.map((b,i)=>{
      const col=b.score>=85?"#34C759":b.score>=70?obj.accent:b.score>=55?"#6B7280":"#E8863A";
      const lbl=getScoreLabel(obj,b.score);
      return <div className="bilan-row" role="button" tabIndex={0} key={i} style={{...(i===BILANS.length-1?{borderBottom:"none"}:{}),cursor:"pointer"}} onClick={()=>setViewBilan(b)}>
        <div className="bilan-score" style={{background:`${col}18`,color:col}}>{b.score}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>{b.week} · {b.dates}</div><div style={{fontSize:12,fontWeight:700,color:col}}>{lbl}</div></div>
        <span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span>
      </div>
    })}</div>:<div style={{textAlign:"center",padding:"20px",fontSize:13,color:"#6B7280",border:"1px dashed rgba(15,30,46,.10)",borderRadius:16}}>Tes bilans hebdomadaires apparaîtront ici au fil des semaines.</div>}
    <div className="section-label">Ajouts récents</div>
    {logs.length>0?<div className="card" style={{padding:0,overflow:"hidden"}}>{logs.slice().reverse().slice(0,8).map((l,i,arr)=><div key={l.id} role="button" tabIndex={0} onClick={()=>setConfirmDel(l)} style={{padding:"10px 14px",borderBottom:i<arr.length-1?"1px solid rgba(15,30,46,.06)":"none",cursor:"pointer",transition:"background .15s"}}>
      <div className="flex-between"><span style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:700,color:"#1A1A1A"}}><EqIcon eqId={l.eqId} size={15}/>{getLogLabel(l.eqId,l.itemId)}{l.isOutOfPlan&&<span className="chip-hp">HP</span>}</span><span style={{fontSize:12,fontWeight:700,color:"#6B7280"}}>{l.kcal} kcal</span></div>
      <div style={{fontSize:11,color:"#6B7280",marginTop:2,paddingLeft:23}}>{SLOTS.find(s=>s.id===l.slotId)?.label} · P{l.p} L{l.l} G{l.g}</div>
    </div>)}</div>:<div style={{textAlign:"center",padding:"24px 20px",border:"1px dashed rgba(15,30,46,.10)",borderRadius:16}}><div className="empty-icon" style={{fontSize:24,marginBottom:6}}>🍽</div><div style={{fontSize:13,color:"#6B7280"}}>Tes ajouts du jour apparaîtront ici. Commence par logger ton premier repas !</div></div>}
    {confirmDel&&<div className="overlay" onClick={()=>setConfirmDel(null)}><div style={{position:"absolute",bottom:0,left:0,right:0,background:"#fff",borderRadius:"24px 24px 0 0",padding:"20px 20px 32px",animation:"slideUp .25s ease-out"}} onClick={e=>e.stopPropagation()}>
      <div className="modal-handle"/>
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:700,color:"#1A1A1A"}}>Supprimer cet ajout ?</div>
        <div style={{fontSize:13,color:"#6B7280",marginTop:6}}>{getLogLabel(confirmDel.eqId,confirmDel.itemId)} · {confirmDel.kcal} kcal</div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"12px 0",borderRadius:14,border:"1px solid rgba(15,30,46,.10)",background:"#F5F4F1",fontSize:14,fontWeight:700,color:"#6B7280",cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
        <button onClick={()=>{haptic(20);onDeleteLog?.(confirmDel.id,confirmDel.eqId,confirmDel.qtyPortion,confirmDel.kcal,confirmDel.p,confirmDel.l,confirmDel.g);setConfirmDel(null);if(snackTimer.current)clearTimeout(snackTimer.current);setSnack("✓ Supprimé");snackTimer.current=setTimeout(()=>setSnack(null),2000)}} style={{flex:1,padding:"12px 0",borderRadius:14,border:"none",background:"#FF3B30",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Supprimer</button>
      </div>
    </div></div>}
    {snack&&<div className="snackbar" onClick={()=>setSnack(null)}>{snack}</div>}
  </div>
}

/* ═══ TAB: PROFIL ═══ */
function ProfileTab({ signOut, onAddMeasurement, onDeleteMeasurement, milestones, milestoneDefs, dietMessages, dietUnread, onDietMarkRead, onCheckMilestones }){
  const d=useData();
  const obj=useObjective();
  const CLIENT=d?.CLIENT||DEFAULT_CLIENT;
  const MEASUREMENTS=d?.MEASUREMENTS||DEFAULT_MEASUREMENTS;
  const BILANS=d?.BILANS||DEFAULT_BILANS;
  const PROFILE_TEXT=d?.PROFILE_TEXT||"";

  const [subScreen,setSubScreen]=useState(null);
  const [metric,setMetric]=useState("weight");
  const [showMeasureForm,setShowMeasureForm]=useState(false);
  const [mForm,setMForm]=useState({weight:"",waist:"",bf:"",hip:"",muscle:""});
  const [mSaving,setMSaving]=useState(false);
  const [selRecipe,setSelRecipe]=useState(null);
  const [expandedCapsule,setExpandedCapsule]=useState(null);
  const [eqSearch,setEqSearch]=useState("");
  const [eqCategory,setEqCategory]=useState(null);
  const [eqDetail,setEqDetail]=useState(null);
  const notifKeys=["notif_rappel_matin","notif_rappel_soir","notif_bilan_dimanche"];
  const [notifs,setNotifs]=useState(()=>notifKeys.map(k=>{try{return localStorage.getItem(k)!=="false"}catch{return true}}));
  const m=MEASUREMENTS||[];
  const hasMeasures=m.length>0;
  const latest=hasMeasures?m[0]:null;
  const first=hasMeasures?m[m.length-1]:null;

  if(subScreen==="messages"){
    return <DietInbox messages={dietMessages} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder} onMarkRead={onDietMarkRead} onBack={()=>setSubScreen(null)}/>
  }

  if(subScreen==="measures"){
    const weekScoreData=BILANS.slice().reverse().map(b=>({week:b.week,score:b.score,label:b.label}));

    // Empty state
    if(!hasMeasures) return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Suivi & Graphiques</div>
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:40,marginBottom:16}}>📏</div>
        <div style={{fontSize:16,fontWeight:700,color:"#1A1A1A",marginBottom:8}}>Aucune mesure enregistrée</div>
        <div style={{fontSize:13,color:"#6B7280",lineHeight:1.6,marginBottom:24}}>Ajoute ta première mesure pour suivre ton évolution. Le poids suffit pour commencer — tu pourras compléter avec le tour de taille et la masse grasse quand tu voudras.</div>
        <button className="btn-primary" onClick={()=>setShowMeasureForm(true)}>+ Ajouter ma première mesure</button>
      </div>
      {/* Weekly score trend even without measures */}
      {weekScoreData.length>0&&<div className="card" style={{padding:16,marginTop:8}}>
        <div className="flex-between" style={{marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Score nutrition</span>
          <span style={{fontSize:12,color:"#6B7280"}}>Dernières semaines</span>
        </div>
        <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>Basé sur ton adhérence au plan : portions respectées, régularité des repas.</div>
        <div style={{width:"100%",height:140}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekScoreData} margin={{top:10,right:5,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false}/>
              <XAxis dataKey="week" tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={70} stroke={obj.accentLine} strokeDasharray="4 4" label={{value:getScoreLabel(obj,70),position:"right",fontSize:9,fill:obj.accent}}/>
              <Tooltip cursor={false} contentStyle={{background:"#121E2D",border:"none",borderRadius:12,fontSize:12,color:"#fff",fontWeight:600}} labelStyle={{color:obj.accent}}/>
              <Bar dataKey="score" radius={[6,6,0,0]} fill={obj.accent} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
      {showMeasureForm&&<div className="overlay" onClick={()=>setShowMeasureForm(false)}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"70%"}}>
        <div className="modal-handle"/>
        <div className="modal-title">Première mesure</div>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:16}}>Remplis uniquement ce que tu as mesuré.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {key:"weight",label:"Poids (kg)",step:"0.1",ph:"75",required:true},
            {key:"waist",label:"Tour de taille (cm)",step:"0.5",ph:"85"},
            {key:"bf",label:"% Masse grasse",step:"0.1",ph:"20"},
            {key:"hip",label:"Tour de hanches (cm)",step:"0.5",ph:"95"},
            {key:"muscle",label:"Masse musc. (kg)",step:"0.1",ph:"35"},
          ].map(f=><div key={f.key} style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#374151",minWidth:110,flexShrink:0}}>{f.label}{f.required&&<span style={{color:obj.accent}}> *</span>}</span>
            <input type="number" inputMode="decimal" step={f.step} placeholder={f.ph} value={mForm[f.key]} onChange={e=>setMForm(p=>({...p,[f.key]:e.target.value}))} style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",minWidth:0}}/>
          </div>)}
        </div>
        <button className="btn-primary" disabled={!mForm.weight||Number(mForm.weight)<=0||mSaving} style={{marginTop:16,opacity:(!mForm.weight||Number(mForm.weight)<=0||mSaving)?0.5:1}} onClick={async()=>{
          const w=Number(mForm.weight);if(!w||w<=0||isNaN(w))return;
          setMSaving(true);
          try{if(onAddMeasurement)await onAddMeasurement({weightKg:w,waistCm:mForm.waist?Number(mForm.waist):null,bodyFatPct:mForm.bf?Number(mForm.bf):null,hipCm:mForm.hip?Number(mForm.hip):null,muscleMassKg:mForm.muscle?Number(mForm.muscle):null})}catch{}
          if(onCheckMilestones)onCheckMilestones({measureCount:1});
          setMSaving(false);setShowMeasureForm(false);setMForm({weight:"",waist:"",bf:"",hip:"",muscle:""});
        }}>{mSaving?"Enregistrement…":"Enregistrer"}</button>
      </div></div>}
    </div>;

    // Has measures — full view
    const chartData=m.slice().reverse().map(e=>({
      date:e.date.slice(5),weight:e.weightKg,waist:e.waistCm,bf:e.bodyFatPct,
      hip:e.hipCm,muscle:e.muscleMassKg,
      bmi:(e.weightKg&&CLIENT.heightCm>0)?Math.round(e.weightKg/((CLIENT.heightCm/100)**2)*10)/10:null,
      ratio:(e.waistCm&&CLIENT.heightCm>0)?Math.round(e.waistCm/CLIENT.heightCm*100)/100:null
    }));
    const metrics={weight:{label:"Poids (kg)",key:"weight",color:obj.accent,unit:"kg",domain:['dataMin-2','dataMax+1']},waist:{label:"Tour de taille (cm)",key:"waist",color:"#E8863A",unit:"cm",domain:['dataMin-2','dataMax+2']},bf:{label:"% Masse grasse",key:"bf",color:"#3B82F6",unit:"%",domain:['dataMin-1','dataMax+1']},hip:{label:"Tour de hanches (cm)",key:"hip",color:"#F472B6",unit:"cm",domain:['dataMin-2','dataMax+2']},muscle:{label:"Masse musculaire (kg)",key:"muscle",color:"#10B981",unit:"kg",domain:['dataMin-2','dataMax+1']},bmi:{label:"IMC",key:"bmi",color:"#34C759",unit:"",domain:['dataMin-1','dataMax+1']},ratio:{label:"Ratio taille/TT",key:"ratio",color:"#8B5CF6",unit:"",domain:[0.4,0.6]}};
    const mc=metrics[metric];
    const cfirst=chartData[0];const clast=chartData[chartData.length-1];
    const delta=(clast?.[mc.key]!=null&&cfirst?.[mc.key]!=null)?Math.round((clast[mc.key]-cfirst[mc.key])*10)/10:null;

    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Suivi & Graphiques</div>
      <div className="page-meta">Évolution depuis le début</div>

      {/* KPI summary row */}
      {latest&&first&&(()=>{
        const wDelta=latest.weightKg&&first.weightKg?latest.weightKg-first.weightKg:null;const wDir=wDelta!=null?(obj.kpiDir==='up'?(wDelta>=0?obj.kpiColor:"#E8863A"):(wDelta<=0?"#34C759":"#E8863A")):"#6B7280";const wArrow=wDelta!=null?(wDelta>=0?"↑":"↓"):"";
        const tDelta=latest.waistCm!=null&&first.waistCm!=null?latest.waistCm-first.waistCm:null;const tDir=tDelta!=null?(tDelta<=0?"#34C759":"#E8863A"):"#6B7280";const tArrow=tDelta!=null?(tDelta>=0?"↑":"↓"):"";
        const bDelta=latest.bodyFatPct!=null&&first.bodyFatPct!=null?latest.bodyFatPct-first.bodyFatPct:null;const bDir=bDelta!=null?(bDelta<=0?"#34C759":"#E8863A"):"#6B7280";const bArrow=bDelta!=null?(bDelta>=0?"↑":"↓"):"";
        return <div className="kpi-row" style={{marginTop:12,marginBottom:16}}>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>Poids</div>
            <div style={{fontSize:20,fontWeight:700,color:"#1A1A1A",marginTop:4}}>{latest.weightKg||"—"}</div>
            <div style={{fontSize:11,fontWeight:700,color:wDir}}>{wDelta!=null?`${wArrow} ${Math.abs(wDelta).toFixed(1)} kg`:"—"}</div>
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>Tour taille</div>
            <div style={{fontSize:20,fontWeight:700,color:"#1A1A1A",marginTop:4}}>{latest.waistCm!=null?latest.waistCm:"—"}</div>
            <div style={{fontSize:11,fontWeight:700,color:tDir}}>{tDelta!=null?`${tArrow} ${Math.abs(tDelta).toFixed(1)} cm`:"—"}</div>
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:14,padding:12,textAlign:"center",border:`1px solid ${obj.accentBorder}`,boxShadow:"0 4px 24px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase"}}>% MG</div>
            <div style={{fontSize:20,fontWeight:700,color:"#1A1A1A",marginTop:4}}>{latest.bodyFatPct!=null?latest.bodyFatPct:"—"}</div>
            <div style={{fontSize:11,fontWeight:700,color:bDir}}>{bDelta!=null?`${bArrow} ${Math.abs(bDelta).toFixed(1)}%`:"—"}</div>
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
          <span style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>{mc.label}</span>
          {delta!=null&&<span style={{fontSize:13,fontWeight:700,color:metric==="weight"?(obj.kpiDir==='up'?(delta>=0?obj.kpiColor:"#E8863A"):(delta<=0?"#34C759":"#E8863A")):(delta<=0?"#34C759":"#E8863A")}}>{delta>0?"+":""}{delta} {mc.unit}</span>}
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
      {weekScoreData.length>0&&<div className="card" style={{padding:16}}>
        <div className="flex-between" style={{marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>Score nutrition</span>
          <span style={{fontSize:12,color:"#6B7280"}}>Dernières semaines</span>
        </div>
        <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>Basé sur ton adhérence au plan : portions respectées, régularité des repas.</div>
        <div style={{width:"100%",height:140}}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekScoreData} margin={{top:10,right:5,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,30,46,.06)" vertical={false}/>
              <XAxis dataKey="week" tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10,fill:"#6B7280"}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={70} stroke={obj.accentLine} strokeDasharray="4 4" label={{value:getScoreLabel(obj,70),position:"right",fontSize:9,fill:obj.accent}}/>
              <Tooltip cursor={false} contentStyle={{background:"#121E2D",border:"none",borderRadius:12,fontSize:12,color:"#fff",fontWeight:600}} labelStyle={{color:obj.accent}}/>
              <Bar dataKey="score" radius={[6,6,0,0]} fill={obj.accent} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}

      {/* History table */}
      <div className="section-label">Historique des mesures</div>
      <div className="card" style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:10,fontWeight:700,color:"#6B7280",textTransform:"uppercase",borderBottom:"1px solid rgba(15,30,46,.10)"}}>
          <span style={{width:70}}>Date</span><span style={{width:46,textAlign:"right"}}>Poids</span><span style={{width:42,textAlign:"right"}}>TT</span><span style={{width:38,textAlign:"right"}}>%MG</span><span style={{width:36,textAlign:"right"}}>IMC</span><span style={{width:28}}/>
        </div>
        {m.map((e,i)=>{
          const bmi=(e.weightKg&&CLIENT.heightCm>0)?Math.round(e.weightKg/((CLIENT.heightCm/100)**2)*10)/10:null;
          return <div key={e.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<m.length-1?"1px solid rgba(15,30,46,.06)":"none",fontSize:12,color:"#1A1A1A"}}>
            <span style={{width:70,fontWeight:600}}>{e.date.slice(5)}</span>
            <span style={{width:46,textAlign:"right"}}>{e.weightKg||"—"}</span>
            <span style={{width:42,textAlign:"right"}}>{e.waistCm||"—"}</span>
            <span style={{width:38,textAlign:"right"}}>{e.bodyFatPct||"—"}</span>
            <span style={{width:36,textAlign:"right",color:"#6B7280"}}>{bmi||"—"}</span>
            <span style={{width:28,textAlign:"right"}}>{e.id&&onDeleteMeasurement?<button onClick={()=>{if(confirm("Supprimer cette mesure ?"))onDeleteMeasurement(e.id)}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#D1D5DB",padding:0,lineHeight:1}} title="Supprimer">×</button>:null}</span>
          </div>
        })}
      </div>

      {/* Add measurement CTA */}
      <button className="btn-primary" style={{marginTop:12}} onClick={()=>setShowMeasureForm(true)}>+ Ajouter une mesure</button>
      <div style={{fontSize:11,color:"rgba(15,30,46,.50)",textAlign:"center",fontStyle:"italic",marginTop:12}}>Mesures indicatives. Parle à ton diététicien pour une interprétation personnalisée.</div>

      {/* Measurement form modal */}
      {showMeasureForm&&<div className="overlay" onClick={()=>setShowMeasureForm(false)}><div role="dialog" className="modal" onClick={e=>e.stopPropagation()} style={{maxHeight:"70%"}}>
        <div className="modal-handle"/>
        <div className="modal-title">Nouvelle mesure</div>
        <div style={{fontSize:12,color:"#6B7280",marginBottom:16}}>Remplis uniquement ce que tu as mesuré.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {key:"weight",label:"Poids (kg)",step:"0.1",ph:latest?.weightKg||"75",required:true},
            {key:"waist",label:"Tour de taille (cm)",step:"0.5",ph:latest?.waistCm||"85"},
            {key:"bf",label:"% Masse grasse",step:"0.1",ph:latest?.bodyFatPct||"20"},
            {key:"hip",label:"Tour de hanches (cm)",step:"0.5",ph:"95"},
            {key:"muscle",label:"Masse musculaire (kg)",step:"0.1",ph:"35"},
          ].map(f=><div key={f.key} style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#374151",minWidth:110,flexShrink:0}}>{f.label}{f.required&&<span style={{color:obj.accent}}> *</span>}</span>
            <input type="number" inputMode="decimal" step={f.step} placeholder={String(f.ph)} value={mForm[f.key]} onChange={e=>setMForm(p=>({...p,[f.key]:e.target.value}))} style={{flex:1,padding:"9px 12px",borderRadius:10,border:"1px solid #E5E7EB",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",minWidth:0}}/>
          </div>)}
        </div>
        <button className="btn-primary" disabled={!mForm.weight||Number(mForm.weight)<=0||mSaving} style={{marginTop:16,opacity:(!mForm.weight||Number(mForm.weight)<=0||mSaving)?0.5:1}} onClick={async()=>{
          const w=Number(mForm.weight);if(!w||w<=0||isNaN(w))return;
          setMSaving(true);
          try{if(onAddMeasurement)await onAddMeasurement({weightKg:w,waistCm:mForm.waist?Number(mForm.waist):null,bodyFatPct:mForm.bf?Number(mForm.bf):null,hipCm:mForm.hip?Number(mForm.hip):null,muscleMassKg:mForm.muscle?Number(mForm.muscle):null})}catch{}
          if(onCheckMilestones)onCheckMilestones({measureCount:(m?.length||0)+1});
          setMSaving(false);setShowMeasureForm(false);setMForm({weight:"",waist:"",bf:"",hip:"",muscle:""});
        }}>{mSaving?"Enregistrement…":"Enregistrer"}</button>
      </div></div>}
    </div>
  }

  if(subScreen==="why") return <div className="page screen-slide">
    <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
    <div className="page-title">Pourquoi ce plan est le tien</div>
    {PROFILE_TEXT?<div style={{fontSize:14,color:"#1A1A1A",lineHeight:1.7,marginTop:12,whiteSpace:"pre-line"}}>{PROFILE_TEXT}</div>
    :<div style={{textAlign:"center",padding:"40px 20px",color:"#9CA3AF"}}><div style={{fontSize:13}}>Ce texte sera bientôt rédigé par ton diététicien.</div></div>}
  </div>;

  if(subScreen==="progression"){
    const phases=d?.PROGRESSION||[];
    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Ma roadmap</div>
      <div className="page-meta">Ton parcours phase par phase</div>
      {phases.map((p,i)=><div key={i} className="card" style={{padding:16,marginBottom:10,borderLeft:`3px solid ${i===0?obj.accent:"rgba(15,30,46,.10)"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A"}}>{p.phaseLabel}</div>
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
    const catLabels={meal:"Repas",breakfast:"Petit-d\u00e9jeuner",snack:"Collation"};
    const catIcons={meal:"\uD83C\uDF73",breakfast:"\u2615",snack:"\uD83C\uDF4E"};
    const mealTypeLabels={hot:"Chaud",cold:"Froid",any:"Polyvalent"};
    const mealTypeIcons={hot:"\uD83D\uDD25",cold:"\u2744\uFE0F",any:"\u21C4"};
    const diffLabels={easy:"Facile",moderate:"Moyen",hard:"Avanc\u00e9"};
    const diffIcons={easy:"\u2605",moderate:"\u2605\u2605",hard:"\u2605\u2605\u2605"};
    const grouped={meal:[],breakfast:[],snack:[]};
    recipes.forEach(r=>{const cat=r.category||"meal";if(!grouped[cat])grouped[cat]=[];grouped[cat].push(r)});

    /* ═══════════════════════════════════════════
       RECIPE DETAIL VIEW
       ═══════════════════════════════════════════ */
    if(selRecipe){
      const macros=computeRecipeMacros(selRecipe.eqSummary,d?.CATALOGUE,d?.FULL_CATALOGUE);
      const totalMin=(selRecipe.prepTime||0)+(selRecipe.cookTime||0);
      const hasDietChips=selRecipe.isVegetarian||selRecipe.isGlutenFree||selRecipe.isLactoseFree;
      return <div className="page screen-slide">
        {/* ── Back button ── */}
        <button aria-label="Retour" className="hdr-back" onClick={()=>setSelRecipe(null)} style={{marginBottom:12,padding:0,display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={obj.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          <span>Retour</span>
        </button>

        {/* ── Hero header ── */}
        <div style={{marginBottom:20,animation:"fadeIn .4s ease-out"}}>
          <div style={{fontSize:28,fontWeight:700,color:"var(--text)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.2,letterSpacing:"-0.02em"}}>{selRecipe.title}</div>
          {selRecipe.description&&<div style={{fontSize:13,color:"var(--text-muted)",lineHeight:1.6,marginTop:8}}>{selRecipe.description}</div>}
        </div>

        {/* ── Meta bar ── */}
        <div style={{display:"flex",alignItems:"center",padding:"14px 0",background:"transparent",borderTop:`1px solid ${obj.accentBorder}`,borderBottom:`1px solid ${obj.accentBorder}`,marginBottom:16,animation:"fadeIn .45s ease-out"}}>
          {totalMin>0&&<div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}><span style={{fontSize:12,opacity:.5,marginRight:2}}>{"\u23F1"}</span> {totalMin}<span style={{fontSize:11,fontWeight:400,color:"var(--text-muted)"}}> min</span></div>
            <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)",marginTop:3}}>Temps</div>
          </div>}
          {totalMin>0&&selRecipe.difficulty&&<div style={{width:1,height:28,background:obj.accentBorder}}/>}
          {selRecipe.difficulty&&<div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1}}>{diffLabels[selRecipe.difficulty]||selRecipe.difficulty}</div>
            <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)",marginTop:3}}>Niveau</div>
          </div>}
          {selRecipe.difficulty&&selRecipe.mealType&&<div style={{width:1,height:28,background:obj.accentBorder}}/>}
          {selRecipe.mealType&&<div style={{textAlign:"center",flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1}}><span style={{fontSize:11,marginRight:3}}>{mealTypeIcons[selRecipe.mealType]||""}</span>{mealTypeLabels[selRecipe.mealType]||selRecipe.mealType}</div>
            <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)",marginTop:3}}>Type</div>
          </div>}
        </div>

        {/* ── Diet chips ── */}
        {hasDietChips&&<div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap",animation:"fadeIn .5s ease-out"}}>
          {selRecipe.isVegetarian&&<span style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:99,background:"rgba(52,199,89,.08)",border:"1px solid rgba(52,199,89,.18)",color:"#22863a",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13}}>{"\uD83C\uDF31"}</span> V\u00e9g\u00e9tarien</span>}
          {selRecipe.isGlutenFree&&<span style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:99,background:"rgba(234,179,8,.07)",border:"1px solid rgba(234,179,8,.18)",color:"#A16207",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13}}>{"\uD83C\uDF3E"}</span> Sans gluten</span>}
          {selRecipe.isLactoseFree&&<span style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:99,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.18)",color:"#4F46E5",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13}}>{"\uD83E\uDD5B"}</span> Sans lactose</span>}
        </div>}

        {/* ── Equivalences summary strip ── */}
        {selRecipe.eqSummary?.length>0&&<div style={{padding:"12px 16px",borderRadius:14,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,marginBottom:20,display:"flex",alignItems:"center",gap:8,animation:"fadeIn .55s ease-out"}}>
          <IcTarget size={14} color={obj.accent}/>
          <div style={{fontSize:12,fontWeight:700,color:obj.accent,letterSpacing:".02em",lineHeight:1.4}}>{selRecipe.eqSummary.filter((eq,i,arr)=>arr.findIndex(e=>e.eqId===eq.eqId)===i).map((eq,i)=>{const cat=d?.CATALOGUE?.find(c=>c.eqId===eq.eqId)||d?.FULL_CATALOGUE?.find(c=>c.eqId===eq.eqId);return (i>0?" + ":"")+(cat?.label||eq.eqId).toLowerCase()}).join("")}</div>
        </div>}

        {/* ── MACROS ── */}
        {macros&&<div style={{marginBottom:20,animation:"fadeIn .6s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Macros par portion</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[{v:macros.kcal,l:"kcal",unit:""},{v:macros.p,l:"Prot.",unit:"g"},{v:macros.l,l:"Lip.",unit:"g"},{v:macros.g,l:"Gluc.",unit:"g"}].map((m,i)=>
              <div key={i} style={{textAlign:"center",padding:"14px 4px 12px",background:i===0?`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.05))`:"#fff",border:`1px solid ${i===0?obj.accentBorder:"var(--hairline)"}`,borderRadius:16,position:"relative",overflow:"hidden"}}>
                {i===0&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${obj.accent},transparent)`}}/>}
                <div style={{fontSize:20,fontWeight:700,color:i===0?obj.accent:"var(--text)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>{m.v}<span style={{fontSize:11,fontWeight:500}}>{m.unit}</span></div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:i===0?obj.accent:"var(--text-muted)",marginTop:5,opacity:i===0?0.7:1}}>{m.l}</div>
              </div>
            )}
          </div>
        </div>}

        {/* ── INGREDIENTS ── */}
        {selRecipe.ingredients?.length>0&&<div style={{marginBottom:20,animation:"fadeIn .65s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Ingr\u00e9dients</div>
            <div style={{flex:1,height:1,background:"var(--hairline)"}}/>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-faint)"}}>{selRecipe.ingredients.length} items</div>
          </div>
          <div style={{background:"#fff",borderRadius:18,border:`1px solid ${obj.accentBorder}`,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.04)"}}>
            {selRecipe.ingredients.map((ing,i)=>{
              const disp=computeIngredientDisplay(ing,d?.CATALOGUE,d?.FULL_CATALOGUE);
              const isLast=i===selRecipe.ingredients.length-1;
              if(disp.isFree){
                return <div key={i} style={{display:"flex",alignItems:"center",padding:"10px 16px",borderBottom:isLast?"none":"1px solid rgba(15,30,46,.05)",background:"rgba(15,30,46,.015)"}}>
                  <span style={{minWidth:52}}/>
                  <span style={{fontSize:13,color:"var(--text-muted)",fontStyle:"italic",flex:1}}>{disp.label}</span>
                  <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"rgba(15,30,46,.04)",color:"var(--text-faint)",flexShrink:0}}>libre</span>
                </div>
              }
              const isDynamic=!!ing.eqId;
              return <div key={i} style={{display:"flex",alignItems:"baseline",padding:"10px 16px",borderBottom:isLast?"none":"1px solid rgba(15,30,46,.05)",gap:10}}>
                <span style={{minWidth:52,textAlign:"right",fontSize:13,fontWeight:isDynamic?700:500,color:disp.grams?(isDynamic?obj.accent:"var(--text)"):"transparent",flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{disp.grams||"\u00A0"}</span>
                <span style={{fontSize:13,color:"var(--text)",flex:1,lineHeight:1.5}}>
                  {disp.label}{disp.prepNote&&<span style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic"}}>{" "}({disp.prepNote})</span>}
                </span>
                {disp.usualValue&&<span style={{fontSize:10,color:"#9CA3AF",fontStyle:"italic",flexShrink:0,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{disp.usualValue}</span>}
              </div>
            })}
          </div>
        </div>}

        {/* ── PREPARATION ── */}
        {selRecipe.steps?.length>0&&<div style={{marginBottom:20,animation:"fadeIn .7s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em"}}>Pr\u00e9paration</div>
            <div style={{flex:1,height:1,background:"var(--hairline)"}}/>
            <div style={{fontSize:10,fontWeight:600,color:"var(--text-faint)"}}>{selRecipe.steps.length} \u00e9tape{selRecipe.steps.length>1?"s":""}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {selRecipe.steps.map((step,i)=>{
              const text=typeof step==="string"?step:(step?.text||String(step||""));
              const isLast=i===selRecipe.steps.length-1;
              return <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",position:"relative"}}>
                {/* Vertical connector line */}
                {!isLast&&<div style={{position:"absolute",left:13,top:30,bottom:-2,width:1,background:obj.accentBorder}}/>}
                {/* Numbered circle */}
                <div style={{width:26,height:26,borderRadius:13,background:obj.accent,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",marginTop:2,zIndex:1,boxShadow:`0 2px 8px ${obj.accentSoft}`}}>{i+1}</div>
                {/* Step text */}
                <div style={{fontSize:13,color:"var(--text)",lineHeight:1.65,flex:1,paddingBottom:isLast?0:18}}>{text}</div>
              </div>
            })}
          </div>
        </div>}

        {/* ── TIP ── */}
        {selRecipe.tip&&<div style={{marginBottom:12,padding:"14px 16px",borderRadius:16,borderLeft:`4px solid ${obj.accent}`,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.03))`,animation:"fadeIn .75s ease-out"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:18,lineHeight:1,flexShrink:0,marginTop:-1}}>{"\uD83D\uDCA1"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:obj.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:".04em"}}>Astuce</div>
              <div style={{fontSize:13,lineHeight:1.6,color:"#374151"}}>{selRecipe.tip}</div>
            </div>
          </div>
        </div>}
      </div>
    }

    /* ═══════════════════════════════════════════
       RECIPE LIST VIEW
       ═══════════════════════════════════════════ */
    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0,display:"flex",alignItems:"center",gap:4}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={obj.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        <span>Retour</span>
      </button>

      {/* ── Page header ── */}
      <div style={{marginBottom:16,animation:"fadeIn .3s ease-out"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <div className="page-title">Recettes</div>
          <span style={{fontSize:12,fontWeight:700,color:obj.accent,background:obj.accentSoft,padding:"3px 10px",borderRadius:99}}>{recipes.length}</span>
        </div>
        <div style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>Des id\u00e9es adapt\u00e9es \u00e0 ton plan</div>
      </div>

      {/* ── Empty state ── */}
      {recipes.length===0&&<div style={{textAlign:"center",padding:"48px 24px",animation:"fadeIn .4s ease-out"}}>
        <div style={{width:64,height:64,borderRadius:32,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.05))`,border:`1px solid ${obj.accentBorder}`,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
          <span style={{fontSize:28}}>{"\uD83C\uDF73"}</span>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:"var(--text)",fontFamily:"'Cormorant Garamond',serif"}}>Aucune recette disponible</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginTop:8,lineHeight:1.6,maxWidth:260,margin:"8px auto 0"}}>Les recettes adapt\u00e9es \u00e0 ton profil et ton objectif appara\u00eetront ici.</div>
        <button onClick={()=>window.open("https://www.elevianutrition.com/espace-client","_blank")} style={{marginTop:16,padding:"10px 20px",borderRadius:12,border:`1px solid ${obj.accentBorder}`,background:obj.accentSoft,color:obj.accent,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Voir mes recettes sur l'espace client</button>
      </div>}

      {/* ── Category groups ── */}
      {["meal","breakfast","snack"].map(cat=>{
        const items=grouped[cat];
        if(!items||items.length===0)return null;
        return <div key={cat} style={{marginBottom:20}}>
          {/* Category header with count badge */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,paddingBottom:6,borderBottom:`1px solid var(--hairline)`}}>
            <span style={{fontSize:14}}>{catIcons[cat]||""}</span>
            <span style={{fontSize:13,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".05em",flex:1}}>{catLabels[cat]||cat}</span>
            <span style={{fontSize:10,fontWeight:700,color:obj.accent,background:obj.accentSoft,padding:"2px 8px",borderRadius:99}}>{items.length}</span>
          </div>

          {/* Recipe cards */}
          {items.map((r,ri)=>{
            const mac=computeRecipeMacros(r.eqSummary,d?.CATALOGUE,d?.FULL_CATALOGUE);
            const totalMin=(r.prepTime||0)+(r.cookTime||0);
            const hasDiet=r.isVegetarian||r.isGlutenFree||r.isLactoseFree;
            return <div key={r.id||ri} role="button" tabIndex={0} onClick={()=>setSelRecipe(r)}
              style={{
                background:"#fff",
                borderRadius:18,
                padding:"14px 16px",
                marginBottom:10,
                cursor:"pointer",
                display:"flex",
                alignItems:"center",
                gap:14,
                border:`1px solid ${obj.accentBorder}`,
                borderLeft:`4px solid ${obj.accent}`,
                boxShadow:"0 2px 12px rgba(0,0,0,.03)",
                transition:"box-shadow .2s, transform .15s",
                animation:`cardIn .35s ease-out both`,
                animationDelay:`${ri*.05}s`,
              }}>
              {/* Left initial icon */}
              <div style={{width:42,height:42,borderRadius:12,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.05))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:17,fontWeight:700,color:obj.accent,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic"}}>{r.title.charAt(0)}</span>
              </div>

              {/* Content */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--text)",lineHeight:1.3,marginBottom:5}}>{r.title}</div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  {totalMin>0&&<span style={{fontSize:10,fontWeight:600,color:"var(--text-muted)",display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:10,opacity:.7}}>{"\u23F1"}</span> {totalMin} min</span>}
                  {mac&&<span style={{fontSize:11,fontWeight:700,color:obj.accent}}>{mac.kcal} kcal</span>}
                  {r.mealType&&<span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:99,background:"rgba(15,30,46,.04)",color:"var(--text-muted)"}}>{mealTypeIcons[r.mealType]||""} {mealTypeLabels[r.mealType]||r.mealType}</span>}
                </div>
                {hasDiet&&<div style={{display:"flex",gap:4,marginTop:5}}>
                  {r.isVegetarian&&<span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"rgba(52,199,89,.07)",color:"#22863a",display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:9}}>{"\uD83C\uDF31"}</span> V\u00e9g\u00e9</span>}
                  {r.isGlutenFree&&<span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"rgba(234,179,8,.07)",color:"#A16207",display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:9}}>{"\uD83C\uDF3E"}</span> S/Gluten</span>}
                  {r.isLactoseFree&&<span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"rgba(99,102,241,.07)",color:"#4F46E5",display:"flex",alignItems:"center",gap:2}}><span style={{fontSize:9}}>{"\uD83E\uDD5B"}</span> S/Lactose</span>}
                </div>}
              </div>

              {/* Chevron */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={obj.accent} strokeWidth="2" strokeLinecap="round" style={{flexShrink:0,opacity:.5}}><path d="M9 18l6-6-6-6"/></svg>
            </div>
          })}
        </div>
      })}
    </div>
  }

  if(subScreen==="guides"){
    const guides=d?.VIDEO_GUIDES||[];
    const guideFallback=[{title:"Comment fonctionne ton plan",duration:"2 min",description:"Comprendre les équivalences."},{title:"Logger un repas en 15 sec",duration:"1 min 30",description:"Ajouter rapidement."},{title:"Comprendre la vue Semaine",duration:"2 min 30",description:"Lire tes barres et alertes."},{title:"Les conseils et le bilan",duration:"2 min",description:"Évaluer et lire ton score."},{title:"Manger hors plan",duration:"2 min",description:"Gérer restau et extras."},{title:"Suivi mesures",duration:"1 min 30",description:"Peser, mesurer, comprendre."}];
    const guideList=guides.length>0?guides:guideFallback;
    const capsules=d?.CAPSULES||[];
    const capsFallback=[
      {id:"sit_restaurant",title:"Manger au restaurant",body:"Au resto, privilégie les plats simples : grillades, poisson, légumes. Demande les sauces à part."},
      {id:"sit_social",title:"Sorties sociales & apéros",body:"Mange normalement dans la journée. À l'apéro : crudités, olives, noix. Limite l'alcool à 1-2 verres."},
      {id:"sit_weekend",title:"Gérer les weekends",body:"Garde un petit-déj structuré et prépare tes collations. Planifie au moins un repas cadré par jour."},
      {id:"sit_stress",title:"Quand tu as envie de craquer",body:"Attends 10 minutes — souvent ça passe. Si ça persiste, choisis un aliment de ton plan."},
    ];
    const capsList=capsules.length>0?capsules:capsFallback;
    const icons=["🍽️","🥂","📅","✈️","👨‍👩‍👧","🎉","💼","💪","🏋️","😌"];
    const letters=["É","L","E","V","I","A"];
    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Guides & ressources</div>

      <div className="section-label">Guides vidéo</div>
      {guideList.map((v,i)=><div key={v.id||i} className="menu-item" role="button" tabIndex={0} onClick={()=>{if(v.url)window.open(v.url,'_blank')}}><span style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><IcMonoE size={13} color={obj.accent} letter={letters[i%6]}/></span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{v.title}</div><div style={{fontSize:11,color:"#6B7280"}}>{v.duration}{v.description?` · ${v.description}`:""}</div></div><span style={{fontSize:14,color:v.url?obj.accent:"#C8CDD3",fontWeight:300}}>{v.url?"▶":"›"}</span></div>)}

      <div className="section-label" style={{marginTop:8}}>Guides de situation</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:12}}>Conseils pratiques adaptés à ton profil.</div>
      {capsList.map((c,i)=>{
        const isOpen=expandedCapsule===c.id;
        const columns=c.body?.columns||[];
        const isStructured=columns.length>0;
        return <div key={c.id||i} className="card" role="button" tabIndex={0} style={{marginBottom:10,padding:0,overflow:"hidden",cursor:"pointer"}} onClick={()=>setExpandedCapsule(isOpen?null:c.id)}>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px"}}>
            <span style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{c.icon||icons[i%icons.length]}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{c.title}</div>
              {c.subtitle&&<div style={{fontSize:11,color:"#6B7280",marginTop:1}}>{c.subtitle}</div>}
            </div>
            <span style={{fontSize:16,color:"#C8CDD3",fontWeight:300,transition:"transform .2s",transform:isOpen?"rotate(90deg)":"none",flexShrink:0}}>›</span>
          </div>
          {isOpen&&<div style={{borderTop:`1px solid ${obj.accentBorder}`}}>
            {isStructured?<div style={{display:"flex",flexDirection:"column",gap:0}}>
              {columns.map((col,ci)=><div key={ci} style={{padding:"14px 16px",...(ci<columns.length-1?{borderBottom:`1px solid ${obj.accentBorder}`}:{}),background:ci%2===0?obj.accentSoft:"rgba(255,255,255,.5)"}}>
                <div style={{fontSize:10.5,fontWeight:700,color:obj.accent,textTransform:"uppercase",letterSpacing:".6px",marginBottom:10}}>{col.title}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {(col.items||[]).map((item,ii)=><div key={ii} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                    <span style={{width:18,height:18,borderRadius:9,background:obj.accentSoft,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:obj.accent,marginTop:1}}>{ii+1}</span>
                    <span style={{fontSize:13,lineHeight:1.5,color:"#374151"}}>{item}</span>
                  </div>)}
                </div>
              </div>)}
            </div>:<div style={{padding:"14px 16px",fontSize:13,lineHeight:1.6,color:"#374151",background:obj.accentSoft}}>{typeof c.body==='string'?c.body:(()=>{try{return JSON.stringify(c.body)}catch{return""}})()}</div>}
          </div>}
        </div>
      })}
    </div>
  }

  if(subScreen==="settings"){
    const notifLabels=["Rappel petit-déjeuner","Rappel dîner","Rappel bilan hebdomadaire"];
    const notifDescs=["Chaque matin à 8h","Chaque soir à 19h","Chaque dimanche à 10h"];
    const toggleNotif=(i)=>{const next=[...notifs];next[i]=!next[i];setNotifs(next);try{localStorage.setItem(notifKeys[i],next[i]?"true":"false")}catch{}};

    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>setSubScreen(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Paramètres</div>

      <div className="section-label">Rappels</div>
      {notifLabels.map((n,i)=><div key={i} className="menu-item">
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{n}</div>
          <div style={{fontSize:11,color:"#9CA3AF",marginTop:2}}>{notifDescs[i]}</div>
        </div>
        <div role="switch" aria-checked={notifs[i]} tabIndex={0} onClick={()=>toggleNotif(i)} style={{width:46,height:26,borderRadius:13,background:notifs[i]?"#34C759":"#E5E7EB",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
          <div style={{width:22,height:22,borderRadius:11,background:"#fff",position:"absolute",top:2,left:notifs[i]?22:2,boxShadow:"0 1px 3px rgba(0,0,0,.2)",transition:"left .2s"}}/>
        </div>
      </div>)}

      <div className="section-label">Support</div>
      <a href="https://www.elevianutrition.com/contact" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
        <div className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Contacter mon diététicien</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
      </a>
      <a href="https://www.elevianutrition.com/contact" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
        <div className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Signaler un problème</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
      </a>

      <div className="section-label">Informations légales</div>
      <a href="https://www.elevianutrition.com/mentions-legales" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
        <div className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Mentions légales</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
      </a>
      <a href="https://www.elevianutrition.com/confidentialite" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
        <div className="menu-item"><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Politique de confidentialité</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
      </a>

      <div className="section-label">À propos</div>
      <div style={{padding:"8px 14px",fontSize:12,color:"#9CA3AF",lineHeight:1.6}}>
        <div>Élevia Nutrition · v2.3.0</div>
        <div style={{marginTop:2}}>Conçu par Audric Didderen, diététicien diplômé</div>
      </div>

      {signOut&&<button onClick={signOut} style={{width:"100%",padding:14,borderRadius:14,background:"rgba(255,59,48,.06)",border:"1px solid rgba(255,59,48,.15)",color:"#FF3B30",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:24}}>Se déconnecter</button>}
    </div>;
  }

  if(subScreen==="equivalences"){
    const catalogue=d?.CATALOGUE||DEFAULT_CATALOGUE;
    const fullCat=d?.FULL_CATALOGUE||DEFAULT_CATALOGUE;
    const planEqs=catalogue.map(eq=>{
      if(eq.items&&eq.items.length>0)return eq;
      const fullEq=fullCat.find(fc=>fc.eqId===eq.eqId);
      if(fullEq&&fullEq.items&&fullEq.items.length>0)return{...eq,items:fullEq.items};
      return eq;
    });
    const SLOT_QTY=d?.SLOT_QTY||{};
    const PROFILE_RULES=d?.PROFILE_RULES||{};
    const PLAN_TARGETS_EQ=d?.PLAN_TARGETS||{};
    const eqInPlan=(eqId)=>eqId in PLAN_TARGETS_EQ;
    const slotLabel=(sid)=>({PDJ:'Petit-déjeuner',REPAS_FROID_PAIN:'Repas froid',REPAS_FROID_BOWL:'Repas froid bowl',REPAS_CHAUD:'Repas chaud',COLLATION:'Collation',PRE_WO:'Avant entraînement',POST_WO:'Après entraînement',EN_CAS_MAT:'En-cas matin'})[sid]||sid;
    const EqImg=({eqId,size=18,fallback})=>{const f=eqIconFile(eqId);return f?<img src={`/icons/${f}.svg`} alt="" width={size} height={size} style={{opacity:.7,flexShrink:0}}/>:<span style={{fontSize:size,lineHeight:1,flexShrink:0}}>{fallback||"•"}</span>};
    const typeGroups={vvpo:{label:"Protéines (VVPO)",icon:"Viandes_maigres"},carbs:{label:"Féculents & céréales",icon:"pain"},veg:{label:"Légumes",icon:"legumes_cuits"},fruits:{label:"Fruits",icon:"fruits"},dairy:{label:"Produits laitiers",icon:"Laitages_classique"},fat:{label:"Matières grasses",icon:"oleagineux"},extras:{label:"Extras & plaisir",icon:"chocolat"},drinks:{label:"Boissons",icon:"alcool_leger"},alcohol:{label:"Boissons",icon:"alcool_leger"}};
    const q=eqSearch.toLowerCase().trim();
    const filtered=q?planEqs.filter(eq=>eq.label.toLowerCase().includes(q)||eq.items?.some(it=>it.foodLabel.toLowerCase().includes(q))):planEqs;
    const grouped={};
    filtered.forEach(eq=>{const t=eq.type||"extras";if(!grouped[t])grouped[t]=[];grouped[t].push(eq)});

    /* --- Render helpers --- */
    const renderEqCompact=(eq)=>{
      const inPlan=eqInPlan(eq.eqId);
      const sqEntries=inPlan?Object.entries(SLOT_QTY[eq.eqId]||{}):[];
      const isR=eq.eqMode==="R";
      const isVeg=eq.type==="veg";
      const fGrams=(inPlan&&!isR&&eq.qtyPlanGrams>0)?`${isVeg?"≥ ":""}${eq.qtyPlanGrams}g`:null;
      return <div key={eq.eqId} role="button" tabIndex={0} onClick={()=>setEqDetail(eq.eqId)} className="card" style={{padding:0,overflow:"hidden",border:"1px solid rgba(15,30,46,.07)",boxShadow:"0 1px 4px rgba(0,0,0,.03)",cursor:"pointer",transition:"box-shadow .15s"}}>
        <div style={{padding:"14px 14px",display:"flex",alignItems:"center",gap:10}}>
          <EqImg eqId={eq.eqId} size={18} fallback={eq.icon}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1A1A1A",lineHeight:1.3,display:"flex",alignItems:"center",gap:6}}>{eq.label}{!inPlan&&<span style={{fontSize:9,fontWeight:600,color:"#9CA3AF",background:"rgba(15,30,46,.05)",padding:"1px 6px",borderRadius:99}}>Hors plan</span>}</div>
            {sqEntries.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",marginTop:5}}>
              {sqEntries.map(([sid])=><span key={sid} style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:99,background:"rgba(15,30,46,.04)",color:"#9CA3AF",lineHeight:"13px"}}>{slotLabel(sid)}{!isR&&fGrams&&<span style={{marginLeft:3}}>· {fGrams}</span>}</span>)}
            </div>}
          </div>
          {inPlan&&eq.nutrientsPerPortion&&eq.nutrientsPerPortion.kcal>0&&<div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:11,fontWeight:700,color:obj.accent}}>{Math.round(eq.nutrientsPerPortion.kcal)} kcal</div>
          </div>}
          <span style={{fontSize:14,color:"#C8CDD3",flexShrink:0}}>›</span>
        </div>
      </div>
    };

    /* ══════ LEVEL 3: Eq detail ══════ */
    if(eqDetail){
      const eq=planEqs.find(e=>e.eqId===eqDetail);
      if(!eq){setEqDetail(null);return null}
      const inPlan=eqInPlan(eq.eqId);
      const isR=eq.eqMode==="R";
      const hasItems=eq.items&&eq.items.length>0;
      const sqEntries=inPlan?Object.entries(SLOT_QTY[eq.eqId]||{}):[];
      const uniqueQtys=[...new Set(sqEntries.map(([,v])=>v.qtyMax))];
      const isMultiQty=uniqueQtys.length>1;
      const singleQty=sqEntries.length>0?sqEntries[0][1].qtyMax:null;
      const isVeg=eq.type==="veg";
      const fGrams=(inPlan&&!isR&&eq.qtyPlanGrams>0)?`${isVeg?"≥ ":""}${eq.qtyPlanGrams}g`:null;
      const hasNote=eq.noteElevia&&eq.noteElevia.length>0;
      return <div className="page screen-slide">
        <button aria-label="Retour" className="hdr-back" onClick={()=>setEqDetail(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
        <div className="card" style={{padding:0,overflow:"hidden",border:"1px solid rgba(15,30,46,.07)",boxShadow:"0 1px 4px rgba(0,0,0,.03)"}}>
          {/* Header */}
          <div style={{padding:"16px 14px 12px",display:"flex",alignItems:"flex-start",gap:10,borderBottom:(hasItems||hasNote)?"1px solid rgba(15,30,46,.06)":"none"}}>
            <EqImg eqId={eq.eqId} size={20} fallback={eq.icon}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1A1A1A",lineHeight:1.3,display:"flex",alignItems:"center",gap:6}}>{eq.label}{!inPlan&&<span style={{fontSize:9,fontWeight:600,color:"#9CA3AF",background:"rgba(15,30,46,.05)",padding:"2px 8px",borderRadius:99}}>Hors plan</span>}</div>
              {sqEntries.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginTop:6}}>
                {sqEntries.map(([sid])=><span key={sid} style={{fontSize:9,fontWeight:600,padding:"3px 10px",borderRadius:99,background:"rgba(15,30,46,.04)",color:"#6B7280",lineHeight:"13px",letterSpacing:".02em"}}>{slotLabel(sid)}{!isR&&fGrams&&<span style={{color:"#9CA3AF",marginLeft:3}}>· {fGrams}</span>}</span>)}
              </div>}
            </div>
            {inPlan&&eq.nutrientsPerPortion&&eq.nutrientsPerPortion.kcal>0&&<div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:12,fontWeight:700,color:obj.accent}}>{Math.round(eq.nutrientsPerPortion.kcal)} kcal</div>
              <div style={{fontSize:10,color:"#9CA3AF",marginTop:1}}>P{Math.round(eq.nutrientsPerPortion.p)} · L{Math.round(eq.nutrientsPerPortion.l)} · G{Math.round(eq.nutrientsPerPortion.g)}</div>
            </div>}
          </div>
          {/* Note Élevia */}
          {hasNote&&<div style={{padding:"8px 14px",background:"linear-gradient(135deg,rgba(198,160,91,.04),rgba(198,160,91,.02))",borderBottom:hasItems?"1px solid rgba(15,30,46,.05)":"none",display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{fontSize:10,color:"#C6A05B",flexShrink:0,marginTop:2,opacity:.8}}>✦</span>
            <span style={{fontSize:11,color:"#7A7062",lineHeight:1.55,fontStyle:"italic"}}>{eq.noteElevia}</span>
          </div>}
          {/* Items */}
          {hasItems&&<div style={{padding:"4px 14px 10px"}}>
            {eq.items.map((item,idx)=>{
              const s=item.stepper;
              const refG=item.qty1x>0?item.qty1x:(eq.qtyPlanGrams||0);
              let rightText=null;
              if(inPlan){
                if(isR){
                  if(isMultiQty&&sqEntries.length>1){
                    rightText=<div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                      {sqEntries.map(([sid,v])=>{const g=v.qtyMax*refG;return <div key={sid} style={{display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:9,color:"#9CA3AF"}}>{slotLabel(sid)}</span>
                        <span style={{fontSize:11,fontWeight:700,color:"#374151",background:"rgba(15,30,46,.04)",padding:"2px 8px",borderRadius:99}}>{fmtItemQty(s,g,PROFILE_RULES,eq.eqId)}</span>
                      </div>})}
                    </div>;
                  } else {
                    const g=(singleQty||1)*refG;
                    rightText=<span style={{fontSize:11,fontWeight:700,color:"#374151",background:"rgba(15,30,46,.04)",padding:"2px 9px",borderRadius:99}}>{fmtItemQty(s,g,PROFILE_RULES,eq.eqId)}</span>;
                  }
                } else {
                  const g=refG||eq.qtyPlanGrams||0;
                  if(g>0){
                    const label=fmtItemQty(s,g,PROFILE_RULES,eq.eqId);
                    rightText=<span style={{fontSize:11,fontWeight:700,color:"#374151",background:"rgba(15,30,46,.04)",padding:"2px 9px",borderRadius:99}}>{isVeg?`≥ ${label}`:label}</span>;
                  }
                }
              }
              const isRecipe=eq.type==='recette'||item.foodLabel?.toLowerCase().includes('recette');
              const hasV=item.variants&&item.variants.length>0&&!isRecipe;
              return <div key={item.itemId} style={{paddingTop:idx===0?4:0}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:(!hasV&&idx<eq.items.length-1)?"1px solid rgba(15,30,46,.04)":"none"}}>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:5,minWidth:0}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#1A1A1A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.foodLabel}</span>
                  </div>
                  {rightText&&<div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>{rightText}</div>}
                </div>
                {hasV&&<div className="variant-scroll" style={{paddingBottom:7,borderBottom:idx<eq.items.length-1?"1px solid rgba(15,30,46,.04)":"none"}}>
                  {item.variants.map((v,vi)=><span key={vi} style={{fontSize:9.5,fontWeight:500,padding:"2px 8px",borderRadius:99,background:"rgba(15,30,46,.03)",border:"1px solid rgba(15,30,46,.05)",color:"#9CA3AF",lineHeight:"14px",whiteSpace:"nowrap",flexShrink:0}}>{v.label}</span>)}
                </div>}
              </div>
            })}
          </div>}
        </div>
      </div>
    }

    /* ══════ LEVEL 2: Category detail ══════ */
    if(eqCategory&&!q){
      const eqs=grouped[eqCategory]||[];
      const grp=typeGroups[eqCategory];
      if(!grp){setEqCategory(null);return null}
      return <div className="page screen-slide">
        <button aria-label="Retour" className="hdr-back" onClick={()=>setEqCategory(null)} style={{marginBottom:12,padding:0}}>← Retour</button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <img src={`/icons/${grp.icon}.svg`} alt="" width={22} height={22} style={{opacity:.65}}/>
          <div className="page-title" style={{margin:0}}>{grp.label}</div>
          <span style={{fontSize:11,color:"#9CA3AF",fontWeight:600,background:"rgba(15,30,46,.04)",padding:"2px 8px",borderRadius:99}}>{eqs.length}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {eqs.map(eq=>renderEqCompact(eq))}
        </div>
        {eqs.length===0&&<div style={{textAlign:"center",padding:32}}><div className="empty-icon" style={{fontSize:28,marginBottom:8}}>📦</div><div style={{color:"#9CA3AF",fontSize:14}}>Aucune équivalence dans cette catégorie.</div></div>}
      </div>
    }

    /* ══════ LEVEL 1: Category list (+ search results) ══════ */
    return <div className="page screen-slide">
      <button aria-label="Retour" className="hdr-back" onClick={()=>{setSubScreen(null);setEqSearch("");setEqCategory(null);setEqDetail(null)}} style={{marginBottom:12,padding:0}}>← Retour</button>
      <div className="page-title">Mes équivalences</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:12}}>Consulte les portions de chaque aliment de ton plan.</div>
      <input type="text" value={eqSearch} onChange={e=>setEqSearch(e.target.value)} placeholder="Rechercher un aliment..." style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1px solid ${obj.accentBorder}`,fontSize:14,fontFamily:"inherit",background:"#fff",marginBottom:16,boxSizing:"border-box",outline:"none"}}/>
      {q?<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(eq=>renderEqCompact(eq))}
        {filtered.length===0&&<div style={{textAlign:"center",padding:32}}><div className="empty-icon" style={{fontSize:28,marginBottom:8}}>🔍</div><div style={{color:"#9CA3AF",fontSize:14}}>Aucun résultat pour "{eqSearch}"</div></div>}
      </div>:<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {Object.entries(typeGroups).map(([type,grp])=>{
          const eqs=grouped[type];
          if(!eqs||eqs.length===0)return null;
          return <div key={type} role="button" tabIndex={0} onClick={()=>setEqCategory(type)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderRadius:14,background:"#fff",border:`1px solid ${obj.accentBorder}`,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.04)",transition:"box-shadow .15s"}}>
            <img src={`/icons/${grp.icon}.svg`} alt="" width={20} height={20} style={{opacity:.65}}/>
            <span style={{flex:1,fontSize:14,fontWeight:700,color:"#1A1A1A"}}>{grp.label}</span>
            <span style={{fontSize:11,color:"#9CA3AF",fontWeight:600,background:"rgba(15,30,46,.04)",padding:"2px 8px",borderRadius:99}}>{eqs.length}</span>
            <span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span>
          </div>
        })}
      </div>}
    </div>
  }

  const menuLetter=(ch)=><span style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${obj.accentSoft},rgba(198,160,91,.06))`,border:`1px solid ${obj.accentBorder}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><IcMonoE size={13} color={obj.accent} letter={ch}/></span>;

  return <div className="page">
    <div className="profile-card">
      <div style={{fontSize:20,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{CLIENT.firstName}{d?._lastName?` ${d._lastName}`:""}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:4}}>Programme : <span style={{color:obj.accent}}>{CLIENT.programme}</span> · Taille : {CLIENT.heightCm} cm</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginTop:2}}>{(()=>{const ps=d?._planStartDate?new Date(d._planStartDate):null;if(!ps)return"";const m=["jan.","fév.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];const w=Math.floor(Math.max(0,(new Date()-ps)/86400000)/7)+1;return `Depuis : ${ps.getDate()} ${m[ps.getMonth()]} ${ps.getFullYear()} · Semaine ${w}`})()}</div>
      {(CLIENT.dietVegetarian||CLIENT.glutenFree||CLIENT.lactoseFree)&&<div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
        {CLIENT.dietVegetarian&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:99,background:"rgba(52,199,89,.15)",border:"1px solid rgba(52,199,89,.3)",color:"#b5f0c5"}}>Végétarien</span>}
        {CLIENT.glutenFree&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:99,background:"rgba(234,179,8,.12)",border:"1px solid rgba(234,179,8,.25)",color:"#fde68a"}}>Sans gluten</span>}
        {CLIENT.lactoseFree&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:99,background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.25)",color:"#c4b5fd"}}>Sans lactose</span>}
      </div>}
      {latest&&first&&<div className="kpi-row">
        {(()=>{
          const wDelta=latest.weightKg-first.weightKg;const wDir=obj.kpiDir==='up'?(wDelta>=0?obj.kpiColor:"#E8863A"):(wDelta<=0?"#34C759":"#E8863A");
          const tDelta=latest.waistCm!=null&&first.waistCm!=null?latest.waistCm-first.waistCm:null;const tDir=tDelta!=null?(tDelta<=0?"#34C759":"#E8863A"):"#6B7280";
          const bDelta=latest.bodyFatPct!=null&&first.bodyFatPct!=null?latest.bodyFatPct-first.bodyFatPct:null;const bDir=bDelta!=null?(bDelta<=0?"#34C759":"#E8863A"):"#6B7280";
          return <>
            <div className="kpi-box"><div className="kpi-label">Poids</div><div className="kpi-val">{latest.weightKg}</div><div className="kpi-delta" style={{color:wDir}}>{wDelta>0?"+":""}{wDelta.toFixed(1)} kg</div></div>
            <div className="kpi-box"><div className="kpi-label">Tour taille</div><div className="kpi-val">{latest.waistCm??"\u2014"}</div><div className="kpi-delta" style={{color:tDir}}>{tDelta!=null?`${tDelta>0?"+":""}${tDelta.toFixed(1)} cm`:"\u2014"}</div></div>
            <div className="kpi-box"><div className="kpi-label">% MG</div><div className="kpi-val">{latest.bodyFatPct??"\u2014"}</div><div className="kpi-delta" style={{color:bDir}}>{bDelta!=null?`${bDelta>0?"+":""}${bDelta.toFixed(1)}%`:"\u2014"}</div></div>
          </>
        })()}
      </div>}
      {!hasMeasures&&<div style={{padding:"16px 0",textAlign:"center"}}><div className="empty-icon" style={{fontSize:22,marginBottom:4}}>📏</div><div style={{fontSize:13,color:"#9CA3AF"}}>Aucune mesure enregistrée</div></div>}
    </div>
    {milestoneDefs&&milestoneDefs.length>0&&<>
      <div className="section-label">Mon parcours</div>
      <div className="card" style={{padding:14}}>
        <ParcoursList milestones={milestones} milestoneDefs={milestoneDefs} accent={obj.accent} accentSoft={obj.accentSoft} accentBorder={obj.accentBorder}/>
      </div>
    </>}
    <div className="section-label">Outils</div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("why")}>{menuLetter("É")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Pourquoi ce plan est le tien</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("measures")}>{menuLetter("L")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Suivi mesures & graphiques</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("equivalences")}>{menuLetter("E")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Mes équivalences</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>window.open("https://www.elevianutrition.com/espace-client","_blank")} style={{background:"linear-gradient(135deg,rgba(198,160,91,.08) 0%,rgba(198,160,91,.02) 100%)",border:`1px solid ${obj.accentBorder}`}}>{menuLetter("V")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Mes recettes personnalisées</span><span style={{fontSize:11,fontWeight:700,color:obj.accent,background:obj.accentSoft,borderRadius:99,padding:"2px 8px"}}>Nouveau</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("messages")}>{menuLetter("I")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Messages de ton diététicien</span>{dietUnread>0&&<span style={{fontSize:10,fontWeight:700,color:"#fff",background:obj.accent,borderRadius:99,padding:"2px 8px",minWidth:18,textAlign:"center"}}>{dietUnread}</span>}<span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div className="section-label">Apprendre</div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("guides")}>{menuLetter("A")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Guides & ressources</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    {(d?.PROGRESSION?.length>0)&&<div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("progression")}>{menuLetter("É")}<span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Ma roadmap</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>}
    <div className="section-label">Réglages</div>
    <div className="menu-item" role="button" tabIndex={0} onClick={()=>setSubScreen("settings")}><span style={{width:28,height:28,borderRadius:8,background:"rgba(15,30,46,.06)",border:"1px solid rgba(15,30,46,.10)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,color:"#6B7280"}}>⚙</span><span style={{fontSize:14,fontWeight:600,color:"#1A1A1A",flex:1}}>Paramètres</span><span style={{fontSize:16,color:"#C8CDD3",fontWeight:300}}>›</span></div>
    <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"rgba(15,30,46,.50)"}}>Élevia v2.3.0 (build 42)</div>
  </div>
}

/* ═══ MAIN APP ═══ */
export default function EleviaApp({ session, signOut, planData, logs: externalLogs, weekConsumed: externalWeekConsumed, weekNutrients: externalWeekNutrients, daysLogged: externalDaysLogged, onAddLog: externalAddLog, onDeleteLog, onAddMeasurement, onDeleteMeasurement, onCreateBilan, streak: externalStreak, onIncrementStreak, milestones, milestoneDefs, newlyUnlocked, onCheckMilestones, onDismissMilestone, dietMessages, dietUnread, onDietMarkRead, onDietMarkAllRead, quickLog }){
  const [tab,setTab]=useState("plan");
  // Use external logs if provided (Supabase), fallback to local state
  const [localLogs,setLocalLogs]=useState(DEFAULT_INITIAL_LOGS);
  const logs=externalLogs||localLogs;
  const addLog=useCallback(l=>{if(externalAddLog)externalAddLog(l);else setLocalLogs(prev=>[...prev,l])},[externalAddLog]);
  const weekConsumed=externalWeekConsumed||DEFAULT_WEEK_CONSUMED;
  const weekNutrients=externalWeekNutrients||{kcal:0,p:0,l:0,g:0};

  // Hide tab bar when any overlay/modal is open (iOS Safari fix)
  useEffect(()=>{
    const root=document.getElementById('root');
    if(!root)return;
    const check=()=>{
      const overlay=root.querySelector('.overlay');
      const tbar=root.querySelector('.tbar');
      if(tbar) tbar.style.display=overlay?'none':'';
    };
    const obs=new MutationObserver(check);
    obs.observe(root,{childList:true,subtree:true});
    check();
    return()=>obs.disconnect();
  },[]);

  // Warmup: plan started Wed-Sun → official week 1 = next Monday
  const appIsWarmup=useMemo(()=>{
    const ps=planData?._planStartDate?new Date(planData._planStartDate):null;
    if(!ps)return false;
    const dow=ps.getDay();
    if(dow>=3||dow===0){
      const next=new Date(ps);
      next.setDate(next.getDate()+(dow===0?1:8-dow));
      next.setHours(0,0,0,0);
      return new Date()<next;
    }
    return false;
  },[planData?._planStartDate]);

  // Milestone context wrapper — builds full context, accepts overrides from call site
  const handleCheckMilestones=useCallback((overrides={})=>{
    if(!onCheckMilestones)return;
    onCheckMilestones({
      totalLogs:1,
      streak:externalStreak?.current||0,
      bilanCount:(planData?.BILANS||[]).length,
      lastBilanScore:(planData?.BILANS||[])[0]?.score??null,
      bilans:planData?.BILANS||[],
      weekDaysLogged:externalDaysLogged||0,
      measureCount:(planData?.MEASUREMENTS||[]).length,
      ...overrides,
    });
  },[onCheckMilestones,externalStreak,planData,externalDaysLogged]);

  const [splash,setSplash]=useState(true);
  const [scrolled,setScrolled]=useState(false);
  const contentRef=useRef(null);
  useEffect(()=>{
    const el=contentRef.current;if(!el)return;
    const h=()=>setScrolled(el.scrollTop>8);
    el.addEventListener('scroll',h,{passive:true});
    return()=>el.removeEventListener('scroll',h);
  },[]);
  const [showOnboarding,setShowOnboarding]=useState(()=>!localStorage.getItem('elevia_onboarding_done'));
  const [showTour,setShowTour]=useState(()=>localStorage.getItem('elevia_onboarding_done')==='1'&&!localStorage.getItem('elevia_tour_done'));
  const tabIcons={plan:IcCalendar,advice:IcBulb,history:IcHistory,profile:IcProfile};
  const tabs=[{id:"plan",label:"Plan"},{id:"advice",label:"Conseils"},{id:"history",label:"Historique"},{id:"profile",label:"Profil"}];

  // Swipe left/right to switch tabs
  const swipeRef=useRef(null);
  const swipeStart=useRef({x:0,y:0});
  const swipeHandlers=useMemo(()=>({
    onTouchStart(e){const t=e.touches[0];swipeStart.current={x:t.clientX,y:t.clientY}},
    onTouchEnd(e){
      const t=e.changedTouches[0];
      const dx=t.clientX-swipeStart.current.x;
      const dy=t.clientY-swipeStart.current.y;
      if(Math.abs(dx)<60||Math.abs(dy)>Math.abs(dx)*0.7)return; // too short or too vertical
      const tabIds=tabs.map(t=>t.id);
      const idx=tabIds.indexOf(tab);
      if(dx>0&&idx>0)setTab(tabIds[idx-1]); // swipe right → previous tab
      if(dx<0&&idx<tabIds.length-1)setTab(tabIds[idx+1]); // swipe left → next tab
    }
  }),[tab,tabs]);

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
      <div style={{position:"absolute",bottom:40,fontSize:10,color:"rgba(255,255,255,.15)",letterSpacing:1}}>v2.3.0</div>
    </div>
  </></DataCtx.Provider>;

  return <DataCtx.Provider value={planData||null}>
    <style>{css}{themeVars}</style>
    <div className="app-shell">
      <div className={`hdr${scrolled?" scrolled":""}`}>
        <svg width="24" height="24" viewBox="0 0 32 32" style={{flexShrink:0}}><rect width="32" height="32" rx="6" fill="#C6A05B"/><text x="16" y="24" textAnchor="middle" fontFamily="Georgia,'Times New Roman',serif" fontWeight="400" fontSize="24" fill="#0E1E2E">E</text><line x1="11.5" y1="5.5" x2="15.5" y2="5.5" stroke="#0E1E2E" strokeWidth="2" strokeLinecap="round"/></svg>
        <span style={{fontSize:19,fontWeight:700,letterSpacing:4,color:"#C6A05B",fontStyle:"italic",fontFamily:"'Playfair Display','Cormorant Garamond','Georgia',serif"}}>ÉLEVIA</span>
        <div style={{width:24}}/>
      </div>
      <div ref={contentRef} className="content" onTouchStart={swipeHandlers.onTouchStart} onTouchEnd={swipeHandlers.onTouchEnd}>
        <div key={tab} className="tab-content">
        {tab==="plan"&&<PlanTab logs={logs} onAddLog={addLog} onDeleteLog={onDeleteLog} weekConsumed={weekConsumed} weekNutrients={weekNutrients} streak={externalStreak} onIncrementStreak={onIncrementStreak} onCheckMilestones={handleCheckMilestones} bilanCount={planData?.BILANS?.length||0} dietMessages={dietMessages} onDietMarkRead={onDietMarkRead} onSwitchTab={setTab} quickLog={quickLog}/>}
        {tab==="advice"&&<AdviceTab onCreateBilan={onCreateBilan} isWarmup={appIsWarmup} weekConsumed={weekConsumed} weekNutrients={weekNutrients} daysLogged={externalDaysLogged} onCheckMilestones={handleCheckMilestones}/>}
        {tab==="history"&&<HistoryTab logs={logs} onDeleteLog={onDeleteLog}/>}
        {tab==="profile"&&<ProfileTab signOut={signOut} onAddMeasurement={onAddMeasurement} onDeleteMeasurement={onDeleteMeasurement} milestones={milestones} milestoneDefs={milestoneDefs} dietMessages={dietMessages} dietUnread={dietUnread} onDietMarkRead={onDietMarkRead} onCheckMilestones={handleCheckMilestones}/>}
        </div>
      </div>
      {/* Bottom mask: hides content scrolling behind tab bar + safe area */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:`calc(90px + env(safe-area-inset-bottom, 16px))`,background:"linear-gradient(to bottom, transparent 0%, #F5F4F1 20%)",pointerEvents:"none",zIndex:40}}/>
      <div className="tbar" data-tour="tab-bar">
        {/* Sliding glow indicator */}
        <div style={{position:"absolute",top:4,left:`${tabs.findIndex(t=>t.id===tab)*(100/tabs.length)}%`,width:`${100/tabs.length}%`,height:"calc(100% - 8px)",borderRadius:16,background:`radial-gradient(ellipse at center,rgba(198,160,91,.1) 0%,transparent 70%)`,transition:"left .3s cubic-bezier(.4,0,.2,1)",pointerEvents:"none",zIndex:0}}/>
        {tabs.map(t=>{const Ic=tabIcons[t.id];const active=tab===t.id;return <button key={t.id} className={`tbar-item ${active?"active":""}`} data-tour={t.id==="advice"?"tab-advice":t.id==="history"?"tab-history":undefined} onClick={()=>setTab(t.id)} style={{zIndex:1}}><span className="tbar-ic" style={{position:"relative",transition:"transform .2s cubic-bezier(.34,1.4,.64,1)",transform:active?"scale(1.1)":"scale(1)"}}><Ic size={20} color={active?obj.accent:"rgba(255,255,255,.65)"}/>{t.id==="profile"&&dietUnread>0&&<span style={{position:"absolute",top:-4,right:-6,width:8,height:8,borderRadius:4,background:"#FF3B30",border:"2px solid #121E2D",animation:"badgePulse 2s ease-in-out infinite"}}/>}</span><span className="tbar-lb" style={{transition:"color .2s ease,transform .2s ease",transform:active?"translateY(0)":"translateY(1px)"}}>{t.label}</span></button>})}
      </div>
    </div>
    {showOnboarding&&<OnboardingOverlay objectiveCode={objCode} accent={obj.accent} onComplete={()=>{localStorage.setItem('elevia_onboarding_done','1');setShowOnboarding(false);if(!localStorage.getItem('elevia_tour_done'))setShowTour(true)}}/>}
    {showTour&&<GuidedTour objectiveCode={objCode} accent={obj.accent} onComplete={()=>{localStorage.setItem('elevia_tour_done','1');setShowTour(false)}}/>}
    {newlyUnlocked&&<MilestonePopup milestone={newlyUnlocked} accent={obj.accent} onDismiss={onDismissMilestone}/>}
    {!showOnboarding&&!showTour&&<PwaInstallPrompt accent={obj.accent}/>}
  </DataCtx.Provider>
}