import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import type { TrendReport } from "@/lib/design-project";

const SYSTEM_PROMPT = `You are a senior fashion trend analyst at a major European fashion house.
Analyze current and upcoming trends for the specified garment category, season, and target market.

Return ONLY a valid JSON object matching this exact schema — no markdown, no explanation:
{
  "summary": "2-3 sentence overview of the key direction for this category and season",
  "keyTrends": ["array of 5-7 specific trend directions, concise, professional"],
  "recommendedStyles": [
    {
      "name": "STYLE NAME IN ALL CAPS",
      "description": "One clear sentence describing the style",
      "fitType": "slim | straight | wide | cargo | oversized | relaxed | tailored",
      "keyDetails": ["3-5 specific construction or design details"],
      "measurements": {
        "waist_half": <number, cm, size 42>,
        "hip_half": <number, cm>,
        "front_rise": <number, cm>,
        "back_rise": <number, cm>,
        "thigh_half": <number, cm>,
        "knee_half": <number, cm>,
        "leg_opening_half": <number, cm>,
        "inseam": <number, cm>,
        "outseam_incl_wb": <number, cm>
      }
    }
  ],
  "colorPalette": ["5 color names trending for this category and season, specific (e.g. 'Ecru White', 'Washed Indigo', 'Olive Drab')"],
  "fabricSuggestions": ["3-4 fabric recommendations with weight/composition where relevant"]
}

Rules:
- Generate exactly 4 recommendedStyles
- Base measurements on European size 42 for the described fit
- Fit measurement guidelines:
  * slim: thigh ~30, leg opening ~18-19
  * straight: thigh ~33-34, leg opening ~22-23
  * wide: thigh ~37-40, leg opening ~24-27
  * cargo/oversized: thigh ~40-42, leg opening ~27-30
  * standard inseam: 82-88cm
- All measurements must be realistic and proportional
- Content must reflect genuine fashion industry knowledge for the specified season
- Be specific and professional — avoid generic descriptions`;

export async function POST(req: NextRequest) {
  console.log("[trends] POST hit");
  console.log("[trends] OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);

  if (process.env.USE_GEMINI === "true") {
    console.log("[trends] USE_GEMINI=true — falling back to OpenAI");
  }

  let body: { category?: string; season?: string; market?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { category, season, market } = body;
  console.log("[trends] params:", { category, season, market });

  if (!category || !season || !market) {
    return NextResponse.json(
      { error: "Missing required fields: category, season, market" },
      { status: 400 }
    );
  }

  try {
    console.log("[trends] calling OpenAI gpt-4.1...");
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze trends for: Category: ${category} | Season: ${season} | Market: ${market}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content;
    console.log("[trends] OpenAI responded, content length:", raw?.length ?? 0);

    if (!raw) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const trendReport: TrendReport = JSON.parse(raw);
    console.log("[trends] parsed OK, styles:", trendReport.recommendedStyles?.length);

    return NextResponse.json({ trendReport });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status;
    console.error("[trends] Error:", message);
    if (status) console.error("[trends] HTTP status from OpenAI:", status);
    return NextResponse.json(
      { error: `Error OpenAI: ${message}` },
      { status: 500 }
    );
  }
}
