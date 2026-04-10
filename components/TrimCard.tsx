"use client";

import type { Trim } from "@/lib/design-project";

interface TrimCardProps {
  trim: Trim;
  onChange: (updated: Trim) => void;
}

export function TrimCard({ trim, onChange }: TrimCardProps) {
  const update = (patch: Partial<Trim>) => onChange({ ...trim, ...patch });

  return (
    <div
      className={`border p-4 flex flex-col gap-3 transition-colors ${
        trim.included
          ? "border-[#F5F0E8]/20"
          : "border-[#F5F0E8]/7 opacity-50"
      }`}
    >
      {/* Name + toggle */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-[#F5F0E8]/80">
          {trim.name}
        </p>
        <button
          type="button"
          onClick={() => update({ included: !trim.included })}
          className={`flex-shrink-0 px-2.5 py-1 text-[8px] tracking-[0.2em] uppercase border transition-all ${
            trim.included
              ? "border-[#6EBF8B]/50 text-[#6EBF8B] bg-[#6EBF8B]/8"
              : "border-[#F5F0E8]/15 text-[#F5F0E8]/30 hover:border-[#F5F0E8]/25"
          }`}
        >
          {trim.included ? "Incluido ✓" : "Excluido"}
        </button>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25">
          Descripción
        </label>
        <input
          type="text"
          value={trim.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Descripción del trim..."
          className="w-full bg-transparent border border-[#F5F0E8]/12 text-[#F5F0E8] placeholder:text-[#F5F0E8]/15 px-2.5 py-1.5 text-[10px] font-light outline-none focus:border-[#F5F0E8]/30 transition-colors"
        />
      </div>

      {/* Finish */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25">
          Acabado
        </label>
        <input
          type="text"
          value={trim.finish}
          onChange={(e) => update({ finish: e.target.value })}
          placeholder="ej. Dark Gunmetal Matte"
          className="w-full bg-transparent border border-[#F5F0E8]/12 text-[#F5F0E8] placeholder:text-[#F5F0E8]/15 px-2.5 py-1.5 text-[10px] font-light outline-none focus:border-[#F5F0E8]/30 transition-colors"
        />
      </div>

      {/* Pantone */}
      <div className="flex flex-col gap-1">
        <label className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25">
          Pantone (opcional)
        </label>
        <input
          type="text"
          value={trim.pantone ?? ""}
          onChange={(e) => update({ pantone: e.target.value || undefined })}
          placeholder="ej. Pantone 19-4007 TCX"
          className="w-full bg-transparent border border-[#F5F0E8]/12 text-[#F5F0E8] placeholder:text-[#F5F0E8]/15 px-2.5 py-1.5 text-[10px] font-light outline-none focus:border-[#F5F0E8]/30 transition-colors"
        />
      </div>
    </div>
  );
}
