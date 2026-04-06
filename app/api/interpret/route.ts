import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import type { GarmentSpecs } from "@/lib/spec-types";

const SYSTEM_PROMPT = `You are a professional fashion technical designer at a major fashion house.
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

If reference photos are provided, analyze them carefully to extract construction details, fit, color, and any visible design elements. Prioritize visual information from the photos over text description where they conflict.

If the description is too vague to generate specs, set needs_clarification to true
and provide a specific clarification_question in Spanish.

Always respond ONLY with the JSON object. No markdown, no explanation, no preamble.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, brand, referenceImages } = body as {
      input: string;
      brand?: string;
      referenceImages?: string[];
    };

    if (!input || typeof input !== "string" || !input.trim()) {
      return NextResponse.json(
        { error: "Descripción requerida" },
        { status: 400 }
      );
    }

    const brandContext = brand ? ` This spec sheet is for ${brand}.` : "";
    const userText = `${input.trim()}${brandContext}`;

    // Build the user message content — use vision if images provided
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const hasImages = Array.isArray(referenceImages) && referenceImages.length > 0;

    const userContent: ContentPart[] = hasImages
      ? [
          ...(referenceImages as string[]).map((img) => ({
            type: "image_url" as const,
            image_url: { url: img },
          })),
          {
            type: "text" as const,
            text: `Analyze these reference photos and generate specs for: ${userText}`,
          },
        ]
      : [{ type: "text" as const, text: userText }];

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const specs: GarmentSpecs = JSON.parse(
      response.choices[0].message.content!
    );

    if (specs.needs_clarification) {
      return NextResponse.json({
        needs_clarification: true,
        question: specs.clarification_question,
      });
    }

    return NextResponse.json({ specs });
  } catch (error) {
    console.error("Interpret error:", error);
    return NextResponse.json(
      { error: "Error al interpretar el diseño. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
