import { GarmentMeasurements } from "./spec-types";

// ─── Trend analysis (Step 1) ─────────────────────────────────────────────────

export interface RecommendedStyle {
  name: string;
  description: string;
  fitType: string;
  keyDetails: string[];
  measurements: GarmentMeasurements;
}

export interface TrendReport {
  summary: string;
  keyTrends: string[];
  recommendedStyles: RecommendedStyle[];
  colorPalette: string[];
  fabricSuggestions: string[];
}

// ─── Trims (Step 7) ──────────────────────────────────────────────────────────

export interface Trim {
  name: string;
  description: string;
  finish: string;
  pantone?: string;
  included: boolean;
}

// ─── Full wizard state ───────────────────────────────────────────────────────

export interface DesignProject {
  // Step 1 — Búsqueda de Tendencias
  category: string; // 'DENIM' | 'LIGHTWOVEN' | 'OUTERWEAR' | 'PANTS' | 'KNITWEAR' | 'SHORTS' | custom
  season: string; // 'SS26' | 'AW26' | 'SS27' | 'AW27'
  market: string; // 'MAN' | 'WOMAN' | 'UNISEX'
  trendReport: TrendReport | null;
  selectedStyleIndex: number | null;

  // Step 2 — Referencias de Looks
  selectedLook: string; // description of chosen look from trend report
  lookImages: string[]; // base64 data URIs — user uploads look reference images

  // Step 3 — Bocetos
  sketchFront: string | null; // base64 — uploaded from Corel (SVG/PDF/PNG)
  sketchBack: string | null; // base64 — uploaded from Corel (optional)

  // Step 4 — Detalles Delantero
  frontDetails: string[]; // key construction details
  washingDescription: string; // e.g. "AS PER PHOTO REFERENCE"
  topstitchThread: string; // Pantone textile code + name
  washingInstructions: string[]; // toggle-selected + custom instructions

  // Step 5 — Detalles Espalda
  backDetails: string[]; // back construction details
  specialConstruction: string[]; // special construction or finishing notes
  rivetFinish: string; // e.g. "DARK GUNMETAL MATTE"

  // Step 6 — Medidas y Tejido
  measurements: GarmentMeasurements;
  fabricDescription: string; // e.g. "100% Organic Cotton Denim, 12oz"
  fabricComposition: string; // e.g. "100% Cotton"
  fabricWeight: string; // e.g. "12"
  fabricImage: string | null; // base64 fabric swatch photo

  // Step 7 — Trims
  trims: Trim[];

  // Meta
  styleCode: string;
  styleName: string;
  brand: string;
  date: string;
  contact: string;
}

// ─── Default measurements for size 42 (straight fit baseline) ────────────────

const DEFAULT_MEASUREMENTS: GarmentMeasurements = {
  waist_half: 38,
  hip_half: 47,
  front_rise: 28,
  back_rise: 34,
  thigh_half: 33,
  knee_half: 25,
  leg_opening_half: 22,
  inseam: 83,
  outseam_incl_wb: 106,
};

// ─── Default trims for DENIM ─────────────────────────────────────────────────

const DEFAULT_DENIM_TRIMS: Trim[] = [
  { name: "Rivets", description: "4mm rivet", finish: "Dark Gunmetal Matte", included: true },
  { name: "Main Button", description: "20mm shank button", finish: "Dark Gunmetal Matte", included: true },
  { name: "Fly Button", description: "17mm shank button", finish: "Dark Gunmetal Matte", included: true },
  { name: "Care Label", description: "Woven care label", finish: "—", included: true },
  { name: "Brand Label", description: "Main woven label", finish: "—", included: true },
  { name: "Leather Patch", description: "Back waistband patch", finish: "Natural tan leather", included: true },
  { name: "Hang Tag", description: "Swing tag with string", finish: "—", included: true },
];

// ─── Default state ────────────────────────────────────────────────────────────

export const DEFAULT_PROJECT: DesignProject = {
  // Step 1
  category: "",
  season: "SS26",
  market: "MAN",
  trendReport: null,
  selectedStyleIndex: null,

  // Step 2
  selectedLook: "",
  lookImages: [],

  // Step 3
  sketchFront: null,
  sketchBack: null,

  // Step 4
  frontDetails: [],
  washingDescription: "AS PER PHOTO REFERENCE",
  topstitchThread: "",
  washingInstructions: [],

  // Step 5
  backDetails: [],
  specialConstruction: [],
  rivetFinish: "DARK GUNMETAL MATTE",

  // Step 6
  measurements: DEFAULT_MEASUREMENTS,
  fabricDescription: "",
  fabricComposition: "",
  fabricWeight: "",
  fabricImage: null,

  // Step 7
  trims: DEFAULT_DENIM_TRIMS,

  // Meta
  styleCode: "",
  styleName: "",
  brand: "WOODIA SPAIN",
  date: new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  contact: "",
};
