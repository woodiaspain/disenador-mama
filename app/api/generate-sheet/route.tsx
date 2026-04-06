import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SpecSheetDocument } from "@/lib/pdf-template";
import type { GarmentSpecs } from "@/lib/spec-types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const {
      specs,
      brand,
      referenceImageBase64,
    }: {
      specs: GarmentSpecs;
      brand?: string;
      referenceImageBase64?: string | null;
    } = await request.json();

    if (!specs) {
      return new Response(JSON.stringify({ error: "Specs requeridas" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buffer = await renderToBuffer(
      <SpecSheetDocument
        specs={specs}
        brand={brand}
        referenceImageBase64={referenceImageBase64 ?? undefined}
      />
    );

    const filename = `${specs.style_code}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(JSON.stringify({ error: "Error generando PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
