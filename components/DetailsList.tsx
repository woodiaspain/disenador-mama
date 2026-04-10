"use client";

import { useState, useEffect, useRef } from "react";
import type { DesignProject } from "@/lib/design-project";

const WASHING_CHIPS = [
  "RAW RINSE: NO WHISKERS",
  "NO HEAVY SANDING",
  "CLEAN DARK SURFACE",
  "ENZYME WASH",
  "STONE WASH",
  "BLEACH WASH",
];

interface DetailsListProps {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DetailsList({ project, onUpdate, onBack, onNext }: DetailsListProps) {
  // Seed frontDetails from Step 1 keyDetails the first time (if frontDetails is empty)
  const seedDetails = (): string[] => {
    if (project.frontDetails.length > 0) return project.frontDetails;
    const keyDetails = project.trendReport?.recommendedStyles[project.selectedStyleIndex ?? 0]?.keyDetails ?? [];
    return keyDetails.length > 0 ? [...keyDetails] : [""];
  };

  const [details, setDetails] = useState<string[]>(seedDetails);
  const [topstitchThread, setTopstitchThread] = useState(project.topstitchThread);
  const [washingDescription, setWashingDescription] = useState(
    project.washingDescription || "AS PER PHOTO REFERENCE"
  );
  const [washingInstructions, setWashingInstructions] = useState<string[]>(project.washingInstructions);

  // Ref for the newly added detail input — auto-focus when a row is added
  const newDetailRef = useRef<HTMLInputElement>(null);
  const prevLengthRef = useRef(details.length);

  useEffect(() => {
    if (details.length > prevLengthRef.current) {
      newDetailRef.current?.focus();
    }
    prevLengthRef.current = details.length;
  }, [details.length]);

  // Sync all fields to parent on every change
  useEffect(() => {
    onUpdate({
      frontDetails: details,
      topstitchThread,
      washingDescription,
      washingInstructions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, topstitchThread, washingDescription, washingInstructions]);

  // ─── Detail list handlers ──────────────────────────────────────────────────
  const updateDetail = (i: number, value: string) => {
    setDetails((prev) => prev.map((d, idx) => (idx === i ? value : d)));
  };

  const removeDetail = (i: number) => {
    setDetails((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addDetail = () => {
    setDetails((prev) => [...prev, ""]);
  };

  // ─── Washing chip toggle ───────────────────────────────────────────────────
  const toggleChip = (chip: string) => {
    setWashingInstructions((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const hasSketch = !!project.sketchFront;

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      {/* ── Left: sketch preview ───────────────────────────────────────────── */}
      <div className="sm:w-2/5 flex-shrink-0">
        {hasSketch ? (
          <div className="sticky top-6">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-2">Boceto delantero</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.sketchFront!}
              alt="Boceto delantero"
              className="w-full object-contain border border-[#F5F0E8]/10 bg-[#111111]"
              style={{ maxHeight: 520 }}
            />
          </div>
        ) : (
          <div className="w-full aspect-[3/4] border border-dashed border-[#F5F0E8]/10 flex items-center justify-center">
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/18">Sin boceto</p>
          </div>
        )}
      </div>

      {/* ── Right: form ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">

        {/* Detalles clave */}
        <div className="flex flex-col gap-3">
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">Detalles clave</p>
          <div className="flex flex-col gap-2">
            {details.map((detail, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  ref={i === details.length - 1 ? newDetailRef : undefined}
                  type="text"
                  value={detail}
                  onChange={(e) => updateDetail(i, e.target.value)}
                  placeholder={`Detalle ${i + 1}...`}
                  className="flex-1 bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2 text-[11px] font-light tracking-wide outline-none focus:border-[#F5F0E8]/38 transition-colors min-w-0"
                />
                <button
                  type="button"
                  onClick={() => removeDetail(i)}
                  className="w-6 h-6 flex-shrink-0 border border-[#F5F0E8]/15 text-[#F5F0E8]/35 text-[10px] hover:text-[#F5F0E8]/65 hover:border-[#F5F0E8]/30 transition-colors flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addDetail}
            className="self-start text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/30 hover:text-[#F5F0E8]/55 border border-[#F5F0E8]/12 hover:border-[#F5F0E8]/25 px-3 py-1.5 transition-colors"
          >
            + Añadir detalle
          </button>
        </div>

        {/* Hilo de pespunte */}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Hilo de pespunte — Pantone Textil
          </label>
          <input
            type="text"
            value={topstitchThread}
            onChange={(e) => setTopstitchThread(e.target.value)}
            placeholder="ej. Pantone 15-1116 TCX – Warm Sand"
            className="w-full bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2.5 text-[11px] font-light tracking-wide outline-none focus:border-[#F5F0E8]/38 transition-colors"
          />
          <p className="text-[9px] text-[#F5F0E8]/18">Introduce el código Pantone exacto</p>
        </div>

        {/* Descripción de lavado */}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Descripción de lavado
          </label>
          <textarea
            value={washingDescription}
            onChange={(e) => setWashingDescription(e.target.value)}
            rows={3}
            className="w-full bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2.5 text-[11px] font-light tracking-wide leading-relaxed resize-none outline-none focus:border-[#F5F0E8]/38 transition-colors"
          />
        </div>

        {/* Instrucciones de lavado — toggle chips */}
        <div className="flex flex-col gap-3">
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Instrucciones de lavado
          </p>
          <div className="flex flex-wrap gap-2">
            {WASHING_CHIPS.map((chip) => {
              const active = washingInstructions.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`px-3 py-1.5 text-[9px] tracking-[0.12em] uppercase font-light border transition-all ${
                    active
                      ? "border-[#F5F0E8]/55 text-[#F5F0E8] bg-[#F5F0E8]/7"
                      : "border-[#F5F0E8]/14 text-[#F5F0E8]/35 hover:border-[#F5F0E8]/28 hover:text-[#F5F0E8]/55"
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#F5F0E8]/8">
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light border border-[#F5F0E8]/18 text-[#F5F0E8]/40 hover:border-[#F5F0E8]/35 hover:text-[#F5F0E8]/65 transition-all"
          >
            ← Volver
          </button>
          <button
            onClick={onNext}
            className="px-8 py-2.5 text-[10px] tracking-[0.3em] uppercase font-light border border-[#F5F0E8]/40 text-[#F5F0E8] hover:bg-[#F5F0E8]/6 hover:border-[#F5F0E8]/65 transition-all"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
