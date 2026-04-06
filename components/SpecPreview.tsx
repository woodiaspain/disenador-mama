"use client";

import { useState } from "react";
import type { GarmentSpecs } from "@/lib/spec-types";

interface SpecPreviewProps {
  specs: GarmentSpecs;
  brand: string;
  referenceImage: string | null;
}

const MEASUREMENT_LABELS: Record<string, string> = {
  waist_half: "Waist Half",
  hip_half: "Hip Half",
  front_rise: "Front Rise",
  back_rise: "Back Rise",
  thigh_half: "Thigh Half",
  knee_half: "Knee Half",
  leg_opening_half: "Leg Opening Half",
  inseam: "Inseam",
  outseam_incl_wb: "Outseam incl. WB",
};

function SpecCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#F5F0E8]/10 p-4">
      <p className="text-[#F5F0E8]/30 text-[10px] tracking-[0.25em] uppercase mb-3">
        {label}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-[#F5F0E8]/65 text-xs flex gap-2 leading-relaxed">
          <span className="text-[#F5F0E8]/25 shrink-0">—</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function SpecPreview({ specs, brand, referenceImage }: SpecPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/generate-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specs,
          brand,
          referenceImageBase64: referenceImage,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al generar PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${specs.style_code}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full mt-6">
      {/* Download button — full width, prominent */}
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full border border-[#F5F0E8]/25 py-4 sm:py-5 text-[#F5F0E8] text-[10px] tracking-[0.25em] uppercase hover:bg-[#F5F0E8]/5 transition-colors duration-150 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4"
      >
        {isDownloading ? (
          <>
            <span className="w-3 h-3 border border-[#F5F0E8]/40 border-t-[#F5F0E8] rounded-full animate-spin" />
            Generando PDF...
          </>
        ) : (
          <>
            Descargar Ficha Técnica
            <span className="text-[#F5F0E8]/35">↓</span>
          </>
        )}
      </button>

      {downloadError && (
        <p className="text-red-400/70 text-xs text-center mb-4">{downloadError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <SpecCard label="Estilo">
            <p className="text-[#F5F0E8] text-base tracking-wider font-light">
              {specs.style_name}
            </p>
            <p className="text-[#F5F0E8]/35 text-[10px] tracking-widest mt-1 font-mono">
              {specs.style_code}
            </p>
            <p className="text-[#F5F0E8]/45 text-xs mt-2 leading-relaxed">
              {specs.fit_description}
            </p>
          </SpecCard>

          <SpecCard label="Información técnica">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cliente", value: brand },
                { label: "Tipo", value: specs.garment_type },
                { label: "Talla muestra", value: specs.sample_size },
                { label: "Color", value: specs.colour },
                { label: "Lavado", value: specs.washing },
                { label: "Fecha", value: specs.date },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[#F5F0E8]/25 text-[9px] tracking-widest uppercase mb-0.5">
                    {label}
                  </p>
                  <p className="text-[#F5F0E8]/70 text-xs">{value}</p>
                </div>
              ))}
            </div>
          </SpecCard>

          <SpecCard label="Detalles clave">
            <BulletList items={specs.key_details} />
          </SpecCard>

          {specs.special_construction.length > 0 && (
            <SpecCard label="Construcción especial">
              <BulletList items={specs.special_construction} />
            </SpecCard>
          )}

          <SpecCard label="Medidas — Talla 42 (cm)">
            <table className="w-full">
              <tbody>
                {Object.entries(specs.measurements).map(([key, val], i, arr) => (
                  <tr
                    key={key}
                    className={i < arr.length - 1 ? "border-b border-[#F5F0E8]/8" : ""}
                  >
                    <td className="py-1.5 text-[#F5F0E8]/35 text-[10px] tracking-wider uppercase">
                      {MEASUREMENT_LABELS[key] ?? key}
                    </td>
                    <td className="py-1.5 text-right text-[#F5F0E8]/75 text-xs font-mono">
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SpecCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Reference image / drawing area */}
          <SpecCard label="Imagen de referencia">
            {referenceImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={referenceImage}
                alt="Imagen de referencia"
                className="w-full object-contain border border-[#F5F0E8]/8"
                style={{ maxHeight: 320 }}
              />
            ) : (
              <div className="flex items-center justify-center h-40 border border-dashed border-[#F5F0E8]/10">
                <p className="text-[#F5F0E8]/20 text-[10px] tracking-widest uppercase text-center">
                  Sin imagen de referencia
                </p>
              </div>
            )}
          </SpecCard>

          <SpecCard label="Instrucciones de lavado">
            <BulletList items={specs.washing_instructions} />
          </SpecCard>

          <SpecCard label="Notas de patronaje">
            <p className="text-[#F5F0E8]/65 text-xs leading-relaxed">
              {specs.fit_notes}
            </p>
          </SpecCard>

          <SpecCard label="Acabados">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-[#F5F0E8]/25 text-[9px] tracking-widest uppercase mb-1">
                  Hilo de pespunte
                </p>
                <p className="text-[#F5F0E8]/70 text-xs">{specs.topstitch_thread}</p>
              </div>
              <div>
                <p className="text-[#F5F0E8]/25 text-[9px] tracking-widest uppercase mb-1">
                  Acabado remaches
                </p>
                <p className="text-[#F5F0E8]/70 text-xs">{specs.rivet_finish}</p>
              </div>
            </div>
          </SpecCard>
        </div>
      </div>
    </div>
  );
}
