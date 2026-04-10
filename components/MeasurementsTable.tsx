"use client";

import type { GarmentMeasurements } from "@/lib/spec-types";

const ROWS: { key: keyof GarmentMeasurements; pom: number; label: string }[] = [
  { pom: 1, key: "waist_half",        label: "WAIST (1/2)" },
  { pom: 2, key: "hip_half",          label: "HIP (1/2, 20cm below WB)" },
  { pom: 3, key: "front_rise",        label: "FRONT RISE" },
  { pom: 4, key: "back_rise",         label: "BACK RISE" },
  { pom: 5, key: "thigh_half",        label: "THIGH (1/2)" },
  { pom: 6, key: "knee_half",         label: "KNEE (1/2)" },
  { pom: 7, key: "leg_opening_half",  label: "LEG OPENING (1/2)" },
  { pom: 8, key: "inseam",            label: "INSEAM" },
  { pom: 9, key: "outseam_incl_wb",   label: "OUTSEAM (INCL.WB)" },
];

interface MeasurementsTableProps {
  measurements: GarmentMeasurements;
  onChange: (updated: GarmentMeasurements) => void;
}

export function MeasurementsTable({ measurements, onChange }: MeasurementsTableProps) {
  const handleChange = (key: keyof GarmentMeasurements, raw: string) => {
    const value = parseFloat(raw);
    onChange({ ...measurements, [key]: isNaN(value) ? 0 : value });
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_5rem] border-b border-[#F5F0E8]/12 pb-2 mb-1">
        <span className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25">POM</span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25">Description</span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-[#F5F0E8]/25 text-right pr-1">CM</span>
      </div>

      {ROWS.map(({ key, pom, label }, i) => (
        <div
          key={key}
          className={`grid grid-cols-[2rem_1fr_5rem] items-center py-2 ${
            i < ROWS.length - 1 ? "border-b border-[#F5F0E8]/6" : ""
          }`}
        >
          {/* POM number */}
          <span className="text-[9px] text-[#F5F0E8]/25 font-light tabular-nums">{pom}</span>

          {/* Description */}
          <span className="text-[10px] tracking-[0.06em] uppercase text-[#F5F0E8]/55 font-light pr-3">
            {label}
          </span>

          {/* CM input */}
          <input
            type="number"
            step="0.5"
            min="0"
            value={measurements[key] || ""}
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] text-[11px] font-light text-right px-2 py-1 outline-none focus:border-[#F5F0E8]/38 transition-colors tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      ))}
    </div>
  );
}
