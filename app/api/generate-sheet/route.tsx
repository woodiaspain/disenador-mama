import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { DesignProjectDocument } from "@/lib/pdf-multipage";
import { SpecSheetDocument } from "@/lib/pdf-template";
import type { GarmentSpecs } from "@/lib/spec-types";
import type { DesignProject } from "@/lib/design-project";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── New wizard path: full DesignProject ───────────────────────────────────
    if (body.project) {
      const project = body.project as DesignProject;

      const buffer = await renderToBuffer(
        <DesignProjectDocument project={project} />
      );

      const filename = `${project.styleCode || project.styleName || "ficha"}.pdf`
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── Legacy path: GarmentSpecs (keeps SpecPreview working) ─────────────────
    if (body.specs) {
      const {
        specs,
        brand,
        referenceImageBase64,
      }: {
        specs: GarmentSpecs;
        brand?: string;
        referenceImageBase64?: string | null;
      } = body;

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
    }

    return new Response(JSON.stringify({ error: "Se requiere project o specs" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(JSON.stringify({ error: "Error generando PDF" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
