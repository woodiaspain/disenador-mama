CLAUDE.md — Fashion Design Assistant
Zara-style spec sheet generator from natural language

Project Overview
AI-powered fashion design tool. User describes a garment in natural language (Spanish or English),
the app interprets it via OpenAI GPT-4.1, extracts structured technical specs, and generates
a downloadable PDF spec sheet in Zara Man format.
Target user: Non-technical. Describes garments conversationally in Spanish.
Output: Professional PDF ficha técnica identical in format to Zara internal spec sheets.

Stack
LayerTechFrameworkNext.js 15 App Router + TypeScriptStylingTailwind CSSLLMOpenAI GPT-4.1 (gpt-4.1)PDF generation@react-pdf/rendererOpenAI SDKopenai npm package

Project Structure
/app
  page.tsx                  → Main UI (chat input + spec preview + download)
  /api
    /interpret/route.ts     → POST: NL input → OpenAI → structured JSON specs
    /generate-sheet/route.ts → POST: specs JSON → PDF blob response

/components
  ChatInput.tsx             → Textarea + submit button
  SpecPreview.tsx           → Renders extracted specs as readable cards
  LoadingState.tsx          → Spinner with fashion-themed copy

/lib
  openai.ts                 → OpenAI client singleton
  pdf-template.tsx          → React-PDF spec sheet layout (Zara format)
  spec-types.ts             → TypeScript types for GarmentSpecs

/public
  (no static assets needed initially)

Environment Variables
bashOPENAI_API_KEY=sk-...
Never expose API key client-side. All OpenAI calls go through API routes.

OpenAI Integration
Client setup (/lib/openai.ts)
typescriptimport OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
API call pattern (/api/interpret/route.ts)
typescriptconst response = await openai.chat.completions.create({
  model: "gpt-4.1",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userInput }
  ],
  response_format: { type: "json_object" }, // Always use this — guarantees valid JSON
});

const specs: GarmentSpecs = JSON.parse(response.choices[0].message.content!);
Model string
Always use "gpt-4.1" — do not use gpt-4o, gpt-4-turbo or other variants unless explicitly told.

System Prompt (for /api/interpret)
You are a professional fashion technical designer at a major fashion house.
When the user describes a garment in natural language (in Spanish or English),
extract and structure the information as a JSON object.

Return ONLY valid JSON matching this exact schema:

{
  "style_name": "Creative all-caps style name (e.g. STRUCTURED STRAIGHT FIT)",
  "style_code": "Auto-generate like ZM26-XXX-YYY where XXX is 3-digit number and YYY is 3-letter fit code",
  "garment_type": "e.g. DENIM PANT",
  "fit_description": "One sentence describing the fit",
  "date": "Today's date in DD/MM/YYYY format",
  "sample_size": "42",
  "washing": "AS PER TECHNICAL SHEET or specific instruction",
  "colour": "Inferred colour name in English",
  "dyeing": "AS PER TECHNICAL SHEET or specific instruction",
  "deadline": "ASAP",
  "contact": "",
  "key_details": ["Array of max 5 specific construction or design details from the description"],
  "measurements": {
    "waist_half": number,
    "hip_half": number,
    "front_rise": number,
    "back_rise": number,
    "thigh_half": number,
    "knee_half": number,
    "leg_opening_half": number,
    "inseam": number,
    "outseam_incl_wb": number
  },
  "topstitch_thread": "Pantone code + name appropriate for the garment (e.g. Pantone 15-1116 TCX – Warm Sand)",
  "rivet_finish": "DARK GUNMETAL MATTE",
  "washing_instructions": [
    "RAW RINSE: NO WHISKERS",
    "NO HEAVY SANDING",
    "CLEAN DARK SURFACE"
  ],
  "special_construction": ["Array of special construction or finishing notes"],
  "fit_notes": "Important note for the pattern maker about what NOT to do / must preserve",
  "needs_clarification": false,
  "clarification_question": ""
}

Measurement guidelines for European size 42:
- Slim fit: thigh ~30, leg opening ~18-19
- Straight fit: thigh ~33-34, leg opening ~22-23
- Wide leg: thigh ~37-40, leg opening ~24-27
- Cargo/oversized: thigh ~40-42, leg opening ~27-30
- Standard inseam: 82-88cm depending on rise style
- Adjust all measurements proportionally to match described silhouette.

If the description is too vague to generate specs, set needs_clarification to true
and provide a specific clarification_question in Spanish.

Always respond ONLY with the JSON object. No markdown, no explanation, no preamble.

TypeScript Types (/lib/spec-types.ts)
typescriptexport interface GarmentMeasurements {
  waist_half: number;
  hip_half: number;
  front_rise: number;
  back_rise: number;
  thigh_half: number;
  knee_half: number;
  leg_opening_half: number;
  inseam: number;
  outseam_incl_wb: number;
}

export interface GarmentSpecs {
  style_name: string;
  style_code: string;
  garment_type: string;
  fit_description: string;
  date: string;
  sample_size: string;
  washing: string;
  colour: string;
  dyeing: string;
  deadline: string;
  contact: string;
  key_details: string[];
  measurements: GarmentMeasurements;
  topstitch_thread: string;
  rivet_finish: string;
  washing_instructions: string[];
  special_construction: string[];
  fit_notes: string;
  needs_clarification: boolean;
  clarification_question: string;
}

PDF Template Rules
The PDF must replicate the Zara Man internal spec sheet format exactly:
Layout (A4 landscape or portrait — match Zara format)

Header row: Brand name left | "DENIM PANT COLLECTION" right | Date
Info table (3 rows, 3 cols each):

Row 1: STYLE: {code} | SAMPLE SIZE: {size} | DATE: {date}
Row 2: FABRIC: AS PER TECHNICAL SHEET | WASHING: AS PER TECHNICAL SHEET | DEADLINE: ASAP
Row 3: COLOUR: AS PER TECHNICAL SHEET | DYEING: AS PER TECHNICAL SHEET | CONTACT: {contact}


Style title: Large bold all-caps, top right (the style_name)
Left column: key_details + special_construction as bullet notes
Center: Grey placeholder box labeled "TECHNICAL DRAWING — {style_name}"
Right column: Washing instructions block
Measurements table: POM | DESCRIPTION | CM — all 9 measurements
Footer: Topstitch thread Pantone swatch + text | Rivet finish note
Fit notes: Bold "IMPORTANT — FIT NOTES" section at bottom

Typography in PDF

Title font: Heavy/Black weight, all caps (simulate the Zara slab font)
Body: Clean sans-serif
Info labels: ALL CAPS, small size
Measurements: Monospaced or tabular numbers

Colors

Background: White (#FFFFFF)
Text: Black (#000000)
Table borders: Light grey (#CCCCCC)
Pantone swatch: Render as a small colored square matching the Pantone color


UI Design Rules
Aesthetic direction

Dark fashion editorial — not generic SaaS
Background: Near-black (#0A0A0A or #111111)
Accent: Off-white or warm sand — NO bright colors
Typography: Editorial / fashion magazine feel
NO purple gradients, NO rounded bubbly corners, NO Inter font as primary

Key UI states

Empty: Large centered textarea with placeholder in Spanish + example chips
Loading: Minimalist spinner + copy like "Interpretando diseño..." / "Generando ficha..."
Specs ready: Two-column layout — spec cards left, PDF preview right
Error / clarification needed: Show clarification_question from GPT in a clean callout

Example prompt chips (show on load)
"Pantalón vaquero wide leg con rotos en rodillas"
"Cargo denim negro con bolsillos laterales"
"Straight fit índigo con crease y dobladillo asimétrico"
"Vaquero slim azul oscuro sin lavado"

API Routes
POST /api/interpret
typescript// Request body
{ input: string }

// Response (success)
{ specs: GarmentSpecs }

// Response (clarification needed)
{ needs_clarification: true, question: string }

// Response (error)
{ error: string }
POST /api/generate-sheet
typescript// Request body
{ specs: GarmentSpecs }

// Response: PDF blob
// Content-Type: application/pdf
// Content-Disposition: attachment; filename="{style_code}.pdf"

Skills to Apply
Claude Code should consult and apply these skills when working on this project:
/mnt/skills/public/frontend-design/SKILL.md
Apply for all UI work — avoid generic aesthetics, commit to dark fashion editorial direction.
/mnt/skills/public/pdf/SKILL.md
Apply for PDF generation — use @react-pdf/renderer for Next.js compatibility.
If react-pdf has issues with specific layout needs, fall back to reportlab via Python API route.

Key Constraints

Never expose OPENAI_API_KEY client-side — all calls via API routes
Always use response_format: { type: "json_object" } in OpenAI calls
PDF must be downloadable — return as blob, trigger browser download
Input language: Spanish — specs output in English for the PDF
Model: gpt-4.1 — do not substitute
No authentication — single-user tool for mom, keep it simple
No database — stateless, each generation is independent


Development Notes

Use next dev to run locally
PDF generation happens server-side (API route) to avoid browser font issues
Test PDF output with at least 3 different garment descriptions before shipping
The measurements table is the most critical PDF element — get the alignment right
React-PDF uses a subset of CSS — check docs for supported properties


Out of Scope (for now)

User accounts / auth
Saving/history of generated specs
Real technical flat sketch generation (use placeholder box)
Multiple garment types (only denim pants for now)
Size grading / multiple sizes