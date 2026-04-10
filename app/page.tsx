"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { LoadingState } from "@/components/LoadingState";
import { LookReferences } from "@/components/LookReferences";
import { SketchUpload } from "@/components/SketchUpload";
import { DetailsList } from "@/components/DetailsList";
import { MeasurementsTable } from "@/components/MeasurementsTable";
import { TrimCard } from "@/components/TrimCard";
import {
  DEFAULT_PROJECT,
  type DesignProject,
  type TrendReport,
  type RecommendedStyle,
  type Trim,
} from "@/lib/design-project";
import type { GarmentMeasurements } from "@/lib/spec-types";

// ─── processFile helpers (for Step 6 fabric upload) ──────────────────────────

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeToMax(base64: string, maxPx = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      if (img.width <= maxPx) { resolve(base64); return; }
      const ratio = maxPx / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxPx;
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

async function processFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;
  let base64: string;
  if (name.endsWith(".heic") || name.endsWith(".heif") || type === "image/heic" || type === "image/heif") {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    base64 = await readAsBase64(blob);
  } else if (name.endsWith(".svg") || type === "image/svg+xml") {
    const url = URL.createObjectURL(file);
    base64 = await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const w = img.width || 800; const h = img.height || 800;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png", 0.9));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG")); };
      img.src = url;
    });
  } else if (name.endsWith(".pdf") || type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    base64 = canvas.toDataURL("image/jpeg", 0.85);
  } else {
    base64 = await readAsBase64(file);
  }
  return resizeToMax(base64);
}

// ─── EditableList — shared by Steps 5 & 6 ────────────────────────────────────

function EditableList({
  label,
  items,
  onChange,
  placeholder = "Detalle...",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const newItemRef = useRef<HTMLInputElement>(null);
  const prevLen = useRef(items.length);
  useEffect(() => {
    if (items.length > prevLen.current) newItemRef.current?.focus();
    prevLen.current = items.length;
  }, [items.length]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">{label}</p>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              ref={i === items.length - 1 ? newItemRef : undefined}
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className="flex-1 bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2 text-[11px] font-light tracking-wide outline-none focus:border-[#F5F0E8]/38 transition-colors min-w-0"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="w-6 h-6 flex-shrink-0 border border-[#F5F0E8]/15 text-[#F5F0E8]/35 text-[10px] hover:text-[#F5F0E8]/65 hover:border-[#F5F0E8]/30 transition-colors flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="self-start text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/30 hover:text-[#F5F0E8]/55 border border-[#F5F0E8]/12 hover:border-[#F5F0E8]/25 px-3 py-1.5 transition-colors"
      >
        + Añadir
      </button>
    </div>
  );
}

// ─── FabricUploadZone — Step 6 fabric swatch ─────────────────────────────────

function FabricUploadZone({
  image,
  onImage,
}: {
  image: string | null;
  onImage: (b64: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) { setError("Archivo demasiado grande (máx. 10 MB)."); return; }
    setLoading(true);
    try { onImage(await processFile(file)); }
    catch { setError("Error al procesar. Prueba JPG o PNG."); }
    finally { setLoading(false); }
  }, [onImage]);

  if (image && !loading) {
    return (
      <div className="relative inline-block group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Muestra tejido" className="w-full max-h-48 object-contain border border-[#F5F0E8]/12 bg-[#111111]" />
        <button
          type="button"
          onClick={() => { onImage(null); setError(null); }}
          className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#0A0A0A]/80 border border-[#F5F0E8]/20 text-[#F5F0E8]/55 text-[9px] hover:text-[#F5F0E8] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
        >×</button>
      </div>
    );
  }

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        onClick={() => !loading && fileRef.current?.click()}
        className={`w-full min-h-[80px] border border-dashed flex flex-col items-center justify-center cursor-pointer gap-2 px-4 py-4 transition-colors ${
          dragging ? "border-[#F5F0E8]/38 bg-[#F5F0E8]/4" : "border-[#F5F0E8]/14 hover:border-[#F5F0E8]/28"
        } ${loading ? "opacity-50 cursor-wait" : ""}`}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-[#F5F0E8]/30 border-t-[#F5F0E8]/70 rounded-full animate-spin" />
            <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest">Procesando...</span>
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[#F5F0E8]/40 border border-[#F5F0E8]/15 px-3 py-1.5">Subir muestra</span>
            <span className="text-[9px] text-[#F5F0E8]/18 tracking-widest">JPG · PNG · SVG · PDF · HEIC</span>
          </>
        )}
      </div>
      {error && <p className="text-red-400/55 text-[10px]">{error}</p>}
      <input ref={fileRef} type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.svg,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }}
      />
    </>
  );
}

// ─── Step 5 — BackDetails ─────────────────────────────────────────────────────

const RIVET_OPTIONS = [
  "DARK GUNMETAL MATTE",
  "ANTIQUE BRASS",
  "SILVER",
  "GOLD",
  "BLACK OXIDE",
];

const DEFAULT_BACK_DETAILS = [
  "Back patch pockets",
  "Waistband construction",
  "Belt loops",
  "Back rise seam",
];

const DEFAULT_SPECIAL_CONSTRUCTION = [
  "Bartacks at stress points",
  "Double topstitch on pocket edges",
];

function BackDetails({
  project,
  onUpdate,
  onBack,
  onNext,
}: {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [backDetails, setBackDetails] = useState<string[]>(
    project.backDetails.length > 0 ? project.backDetails : [...DEFAULT_BACK_DETAILS]
  );
  const [specialConstruction, setSpecialConstruction] = useState<string[]>(
    project.specialConstruction.length > 0 ? project.specialConstruction : [...DEFAULT_SPECIAL_CONSTRUCTION]
  );
  const [rivetFinish, setRivetFinish] = useState(project.rivetFinish || "DARK GUNMETAL MATTE");

  useEffect(() => {
    onUpdate({ backDetails, specialConstruction, rivetFinish });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backDetails, specialConstruction, rivetFinish]);

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      {/* Left: back sketch */}
      <div className="sm:w-2/5 flex-shrink-0">
        {project.sketchBack ? (
          <div className="sticky top-6">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-2">Boceto espalda</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.sketchBack}
              alt="Boceto espalda"
              className="w-full object-contain border border-[#F5F0E8]/10 bg-[#111111]"
              style={{ maxHeight: 520 }}
            />
          </div>
        ) : (
          <div className="w-full aspect-[3/4] border border-dashed border-[#F5F0E8]/10 flex items-center justify-center">
            <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/18">Sin boceto de espalda</p>
          </div>
        )}
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <EditableList
          label="Detalles espalda"
          items={backDetails}
          onChange={setBackDetails}
          placeholder="Detalle de espalda..."
        />

        <EditableList
          label="Construcción especial"
          items={specialConstruction}
          onChange={setSpecialConstruction}
          placeholder="Nota de construcción..."
        />

        {/* Rivet finish */}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Acabado remaches
          </label>
          <select
            value={rivetFinish}
            onChange={(e) => setRivetFinish(e.target.value)}
            className="bg-[#111111] border border-[#F5F0E8]/15 text-[#F5F0E8] text-[11px] font-light px-3 py-2.5 outline-none focus:border-[#F5F0E8]/38 transition-colors cursor-pointer"
          >
            {RIVET_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-[#111111]">{opt}</option>
            ))}
          </select>
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

// ─── Step 6 — MeasurementsFabric ─────────────────────────────────────────────

function MeasurementsFabric({
  project,
  onUpdate,
  onBack,
  onNext,
}: {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [measurements, setMeasurements] = useState<GarmentMeasurements>(project.measurements);
  const [fabricDescription, setFabricDescription] = useState(project.fabricDescription);
  const [fabricComposition, setFabricComposition] = useState(project.fabricComposition);
  const [fabricWeight, setFabricWeight] = useState(project.fabricWeight);
  const [fabricImage, setFabricImage] = useState<string | null>(project.fabricImage);

  useEffect(() => {
    onUpdate({ measurements, fabricDescription, fabricComposition, fabricWeight, fabricImage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurements, fabricDescription, fabricComposition, fabricWeight, fabricImage]);

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      {/* Left: measurements */}
      <div className="sm:w-1/2 flex-shrink-0 flex flex-col gap-3">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
          Medidas — Talla 42
        </p>
        <MeasurementsTable
          measurements={measurements}
          onChange={setMeasurements}
        />
      </div>

      {/* Right: fabric */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Tejido seleccionado
          </label>
          <input
            type="text"
            value={fabricDescription}
            onChange={(e) => setFabricDescription(e.target.value)}
            placeholder="ej. 100% Organic Cotton Denim, 12oz"
            className="w-full bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2.5 text-[11px] font-light tracking-wide outline-none focus:border-[#F5F0E8]/38 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Composición
          </label>
          <input
            type="text"
            value={fabricComposition}
            onChange={(e) => setFabricComposition(e.target.value)}
            placeholder="ej. 100% Cotton"
            className="w-full bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2.5 text-[11px] font-light tracking-wide outline-none focus:border-[#F5F0E8]/38 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Peso
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              value={fabricWeight}
              onChange={(e) => setFabricWeight(e.target.value)}
              placeholder="12"
              className="w-24 bg-transparent border border-[#F5F0E8]/15 text-[#F5F0E8] placeholder:text-[#F5F0E8]/18 px-3 py-2.5 text-[11px] font-light outline-none focus:border-[#F5F0E8]/38 transition-colors tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[10px] tracking-[0.15em] uppercase text-[#F5F0E8]/35">oz</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Muestra de tejido
          </label>
          <FabricUploadZone image={fabricImage} onImage={setFabricImage} />
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

// ─── Step 7 — Trims & PDF generation ─────────────────────────────────────────

function Step7Trims({
  project,
  onUpdate,
  onBack,
  onGenerate,
  generating,
  generateError,
  downloadSuccess,
  onNewSheet,
}: {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
  downloadSuccess: boolean;
  onNewSheet: () => void;
}) {
  const updateTrim = (index: number, updated: Trim) => {
    const next = [...project.trims];
    next[index] = updated;
    onUpdate({ trims: next });
  };

  const addTrim = () => {
    onUpdate({
      trims: [
        ...project.trims,
        { name: "Nuevo trim", description: "", finish: "", included: true },
      ],
    });
  };

  const canGenerate = !!project.sketchFront;

  return (
    <div className="flex flex-col gap-8">
      {/* Trim grid */}
      <div className="flex flex-col gap-3">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
          Trims — edita y activa/desactiva según necesites
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {project.trims.map((trim, i) => (
            <TrimCard key={i} trim={trim} onChange={(updated) => updateTrim(i, updated)} />
          ))}
        </div>
        <button
          type="button"
          onClick={addTrim}
          className="self-start text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/30 hover:text-[#F5F0E8]/55 border border-[#F5F0E8]/12 hover:border-[#F5F0E8]/25 px-3 py-1.5 transition-colors"
        >
          + Añadir trim
        </button>
      </div>

      {/* Error */}
      {generateError && (
        <div className="border-l-2 border-red-900/40 pl-4 py-1">
          <p className="text-[9px] tracking-[0.25em] uppercase text-red-500/50 mb-1">Error</p>
          <p className="text-[#F5F0E8]/45 text-sm font-light">{generateError}</p>
        </div>
      )}

      {/* Download success */}
      {downloadSuccess && (
        <div className="border-l-2 border-[#6EBF8B]/40 pl-4 py-1">
          <p className="text-[9px] tracking-[0.25em] uppercase text-[#6EBF8B]/70 mb-1">PDF generado</p>
          <p className="text-[#F5F0E8]/50 text-sm font-light">
            Las fichas se han descargado correctamente.
          </p>
        </div>
      )}

      {/* Nav row */}
      <div className="flex items-center justify-between pt-4 border-t border-[#F5F0E8]/8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-6 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light border border-[#F5F0E8]/18 text-[#F5F0E8]/40 hover:border-[#F5F0E8]/35 hover:text-[#F5F0E8]/65 transition-all"
          >
            ← Volver
          </button>
          {downloadSuccess && (
            <button
              onClick={onNewSheet}
              className="px-6 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light border border-[#F5F0E8]/25 text-[#F5F0E8]/50 hover:border-[#F5F0E8]/45 hover:text-[#F5F0E8]/80 transition-all"
            >
              Nueva Ficha
            </button>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className={`px-10 py-3 text-[10px] tracking-[0.3em] uppercase font-light border transition-all ${
            canGenerate && !generating
              ? "border-[#F5F0E8]/50 text-[#F5F0E8] hover:bg-[#F5F0E8]/8 hover:border-[#F5F0E8]/80"
              : "border-[#F5F0E8]/10 text-[#F5F0E8]/20 cursor-not-allowed"
          }`}
        >
          {generating ? (
            <span className="flex items-center gap-3">
              <span className="w-3 h-3 border border-[#F5F0E8]/30 border-t-[#F5F0E8]/70 rounded-full animate-spin" />
              Generando fichas...
            </span>
          ) : (
            "Generar Fichas PDF"
          )}
        </button>
      </div>

      {!canGenerate && (
        <p className="text-[9px] text-[#F5F0E8]/20 tracking-[0.15em]">
          * Sube el boceto delantero en el Paso 3 para activar la generación
        </p>
      )}
    </div>
  );
}

// ─── Palette helper ───────────────────────────────────────────────────────────
const COLOR_APPROX: Record<string, string> = {
  black: "#111111",
  white: "#F5F0E8",
  ecru: "#EDE8D8",
  "ecru white": "#EDE8D8",
  cream: "#EDE5C8",
  ivory: "#F2EDD4",
  beige: "#D9C9A8",
  sand: "#C8B89A",
  camel: "#C19A6B",
  tan: "#C9A87C",
  brown: "#7B5038",
  chocolate: "#5C3018",
  navy: "#1A2A4A",
  "dark navy": "#111E35",
  indigo: "#2B3A6E",
  "washed indigo": "#4A5F8A",
  blue: "#2B4C8A",
  "light blue": "#5B8FC0",
  grey: "#888888",
  "light grey": "#C0BFBB",
  "dark grey": "#444444",
  charcoal: "#2E2E2E",
  olive: "#6B6B35",
  "olive drab": "#5A5A28",
  khaki: "#A09060",
  green: "#3A6040",
  "forest green": "#254B30",
  red: "#8B2020",
  burgundy: "#5C1A1A",
  rust: "#8B4020",
  orange: "#C06020",
  yellow: "#C8A820",
  mustard: "#A88828",
  pink: "#C87878",
  blush: "#D8A898",
  lavender: "#8878A8",
  purple: "#5A3878",
};

function getSwatchColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_APPROX)) {
    if (lower.includes(key)) return val;
  }
  return "#888888";
}

// ─── Selectors ────────────────────────────────────────────────────────────────
const CATEGORIES = ["DENIM", "LIGHTWOVEN", "OUTERWEAR", "PANTS", "KNITWEAR", "SHORTS"];
const SEASONS = ["SS26", "AW26", "SS27", "AW27"];
const MARKETS = ["MAN", "WOMAN", "UNISEX"];

const STORAGE_KEY = "design-project-v1";

// ─── PageShell — must be module-level to avoid remount on every render ────────
function PageShell({
  title,
  currentStep,
  onReset,
  children,
}: {
  title: string;
  currentStep: number;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] flex flex-col">
      <StepIndicator currentStep={currentStep} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F0E8]/20">
              Woodia Spain · Nueva Ficha
            </p>
            <button
              onClick={onReset}
              className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/20 hover:text-[#F5F0E8]/45 transition-colors"
            >
              Reiniciar
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-light tracking-[0.05em]">{title}</h1>
          <div className="w-10 h-px bg-[#F5F0E8]/12 mt-5" />
        </header>
        {children}
      </main>
    </div>
  );
}

// ─── Persisted shape (extends DesignProject with nav/UI meta) ─────────────────
interface PersistedState extends DesignProject {
  _trendReport?: TrendReport;
  _selectedStyleIndex?: number | null;
  _currentStep?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [project, setProject] = useState<DesignProject>(DEFAULT_PROJECT);
  const [trendReport, setTrendReport] = useState<TrendReport | null>(null);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // ─── Restore from localStorage on mount ──────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersistedState;
        if (parsed._trendReport) setTrendReport(parsed._trendReport);
        if (parsed._selectedStyleIndex !== undefined) setSelectedStyleIndex(parsed._selectedStyleIndex);
        if (parsed._currentStep) setCurrentStep(parsed._currentStep);
        setProject((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // ─── Persist to localStorage on every state change ───────────────────────
  useEffect(() => {
    try {
      const toSave: PersistedState = {
        ...project,
        _trendReport: trendReport ?? undefined,
        _selectedStyleIndex: selectedStyleIndex,
        _currentStep: currentStep,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [project, trendReport, selectedStyleIndex, currentStep]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const updateProject = (patch: Partial<DesignProject>) => {
    setProject((prev) => ({ ...prev, ...patch }));
  };

  const handleReset = () => {
    setProject(DEFAULT_PROJECT);
    setTrendReport(null);
    setSelectedStyleIndex(null);
    setCurrentStep(1);
    setError(null);
    setGenerateError(null);
    setDownloadSuccess(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ─── PDF generation ────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    setGenerateError(null);
    setDownloadSuccess(false);
    setGenerating(true);

    try {
      const res = await fetch("/api/generate-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGenerateError(data.error ?? "Error generando el PDF. Inténtalo de nuevo.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `${project.styleCode || project.styleName || "ficha"}.pdf`
        .replace(/\s+/g, "-");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
    } catch {
      setGenerateError("No se pudo conectar al servidor. Verifica tu conexión.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step 1 logic ─────────────────────────────────────────────────────────
  const canAnalyze = project.category !== "" && project.season !== "" && project.market !== "";

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);
    setTrendReport(null);
    setSelectedStyleIndex(null);

    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.category,
          season: project.season,
          market: project.market,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error inesperado. Inténtalo de nuevo.");
        return;
      }

      setTrendReport(data.trendReport);
      updateProject({ trendReport: data.trendReport });
    } catch {
      setError("No se pudo conectar al servidor. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStyle = (index: number, style: RecommendedStyle) => {
    setSelectedStyleIndex(index);
    updateProject({
      selectedStyleIndex: index,
      selectedLook: style.description,
      styleName: style.name,
      measurements: style.measurements,
    });
  };

  // ─── Pill ─────────────────────────────────────────────────────────────────
  function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className={`px-5 py-2.5 text-[10px] tracking-[0.25em] uppercase font-light transition-all border ${
          active
            ? "border-[#F5F0E8]/70 text-[#F5F0E8] bg-[#F5F0E8]/8"
            : "border-[#F5F0E8]/15 text-[#F5F0E8]/35 hover:border-[#F5F0E8]/35 hover:text-[#F5F0E8]/60"
        }`}
      >
        {label}
      </button>
    );
  }

  // ─── Style card ───────────────────────────────────────────────────────────
  function StyleCard({ style, index, selected }: { style: RecommendedStyle; index: number; selected: boolean }) {
    return (
      <button
        onClick={() => handleSelectStyle(index, style)}
        className={`text-left p-5 border transition-all ${
          selected
            ? "border-[#F5F0E8]/55 bg-[#F5F0E8]/5 ring-1 ring-[#F5F0E8]/20"
            : "border-[#F5F0E8]/12 hover:border-[#F5F0E8]/30 hover:bg-[#F5F0E8]/3"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/30 mb-1">{style.fitType}</p>
            <h3 className="text-xs tracking-[0.12em] uppercase font-medium text-[#F5F0E8]">{style.name}</h3>
          </div>
          {selected && (
            <div className="w-4 h-4 rounded-full bg-[#F5F0E8] flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path d="M1 3L3 5L7 1" stroke="#0A0A0A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
        <p className="text-[#F5F0E8]/45 text-[11px] leading-relaxed font-light mb-3">{style.description}</p>
        <ul className="space-y-1">
          {style.keyDetails.map((detail, i) => (
            <li key={i} className="flex items-start gap-2 text-[#F5F0E8]/30 text-[10px] font-light">
              <span className="text-[#F5F0E8]/20 mt-px">—</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </button>
    );
  }

  // ─── Step 7 ───────────────────────────────────────────────────────────────
  if (currentStep === 7) {
    return (
      <PageShell title="Trims y acabados" currentStep={currentStep} onReset={handleReset}>
        <Step7Trims
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(6)}
          onGenerate={handleGeneratePDF}
          generating={generating}
          generateError={generateError}
          downloadSuccess={downloadSuccess}
          onNewSheet={handleReset}
        />
      </PageShell>
    );
  }

  // ─── Step 6 ───────────────────────────────────────────────────────────────
  if (currentStep === 6) {
    return (
      <PageShell title="Medidas y tejido" currentStep={currentStep} onReset={handleReset}>
        <MeasurementsFabric
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(5)}
          onNext={() => setCurrentStep(7)}
        />
      </PageShell>
    );
  }

  // ─── Step 5 ───────────────────────────────────────────────────────────────
  if (currentStep === 5) {
    return (
      <PageShell title="Detalles de la espalda" currentStep={currentStep} onReset={handleReset}>
        <BackDetails
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(4)}
          onNext={() => setCurrentStep(6)}
        />
      </PageShell>
    );
  }

  // ─── Step 4 ───────────────────────────────────────────────────────────────
  if (currentStep === 4) {
    return (
      <PageShell title="Detalles del delantero" currentStep={currentStep} onReset={handleReset}>
        <DetailsList
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(3)}
          onNext={() => setCurrentStep(5)}
        />
      </PageShell>
    );
  }

  // ─── Step 3 ───────────────────────────────────────────────────────────────
  if (currentStep === 3) {
    return (
      <PageShell title="Sube tus bocetos" currentStep={currentStep} onReset={handleReset}>
        <SketchUpload
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      </PageShell>
    );
  }

  // ─── Step 2 ───────────────────────────────────────────────────────────────
  if (currentStep === 2) {
    return (
      <PageShell title="Referencias de looks" currentStep={currentStep} onReset={handleReset}>
        <LookReferences
          project={project}
          onUpdate={updateProject}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      </PageShell>
    );
  }

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] flex flex-col">
      <StepIndicator currentStep={1} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F0E8]/20">
              Woodia Spain · Nueva Ficha
            </p>
            {(trendReport || project.category) && (
              <button
                onClick={handleReset}
                className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/20 hover:text-[#F5F0E8]/45 transition-colors"
              >
                Reiniciar
              </button>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-light tracking-[0.05em]">
            ¿Qué categoría quieres diseñar?
          </h1>
          <div className="w-10 h-px bg-[#F5F0E8]/12 mt-5" />
        </header>

        {/* Selectors */}
        <div className="space-y-8 mb-10">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Pill key={cat} label={cat} active={project.category === cat} onClick={() => updateProject({ category: cat })} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Temporada</p>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Pill key={s} label={s} active={project.season === s} onClick={() => updateProject({ season: s })} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Mercado</p>
            <div className="flex flex-wrap gap-2">
              {MARKETS.map((m) => (
                <Pill key={m} label={m} active={project.market === m} onClick={() => updateProject({ market: m })} />
              ))}
            </div>
          </div>
        </div>

        {/* Analyze button */}
        <div className="mb-12">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || loading}
            className={`px-8 py-3 text-[10px] tracking-[0.3em] uppercase font-light transition-all border ${
              canAnalyze && !loading
                ? "border-[#F5F0E8]/40 text-[#F5F0E8] hover:bg-[#F5F0E8]/6 hover:border-[#F5F0E8]/65"
                : "border-[#F5F0E8]/10 text-[#F5F0E8]/20 cursor-not-allowed"
            }`}
          >
            {loading ? "Analizando..." : "Analizar Tendencias"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingState message="Analizando tendencias..." />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="border-l-2 border-red-900/40 pl-5 py-1 mb-10">
            <p className="text-[9px] tracking-[0.25em] uppercase text-red-500/50 mb-1">Error</p>
            <p className="text-[#F5F0E8]/45 text-sm font-light">{error}</p>
          </div>
        )}

        {/* Trend report results */}
        {trendReport && !loading && (
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[#F5F0E8]/8" />
              <span className="text-[9px] tracking-[0.35em] uppercase text-[#F5F0E8]/20">
                {project.category} · {project.season} · {project.market}
              </span>
              <div className="flex-1 h-px bg-[#F5F0E8]/8" />
            </div>

            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Panorama General</p>
              <p className="text-[#F5F0E8]/60 text-sm leading-relaxed font-light max-w-2xl">{trendReport.summary}</p>
            </div>

            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Tendencias Clave</p>
              <div className="flex flex-wrap gap-2">
                {trendReport.keyTrends.map((trend, i) => (
                  <span key={i} className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase font-light border border-[#F5F0E8]/12 text-[#F5F0E8]/45">
                    {trend}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Paleta de Color</p>
              <div className="flex flex-wrap gap-4">
                {trendReport.colorPalette.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border border-[#F5F0E8]/10 flex-shrink-0"
                      style={{ backgroundColor: getSwatchColor(color) }}
                    />
                    <span className="text-[10px] tracking-[0.1em] text-[#F5F0E8]/40 font-light">{color}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-3">Tejidos Recomendados</p>
              <div className="flex flex-wrap gap-2">
                {trendReport.fabricSuggestions.map((fabric, i) => (
                  <span key={i} className="px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-light text-[#F5F0E8]/35 border border-[#F5F0E8]/10">
                    {fabric}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-4">
                Estilos Recomendados — Selecciona uno para continuar
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trendReport.recommendedStyles.map((style, i) => (
                  <StyleCard key={i} style={style} index={i} selected={selectedStyleIndex === i} />
                ))}
              </div>
            </div>

            {/* Next button — only when a style is selected */}
            {selectedStyleIndex !== null && (
              <div className="flex items-center justify-between pt-4 border-t border-[#F5F0E8]/8">
                <div>
                  <p className="text-[9px] tracking-[0.25em] uppercase text-[#F5F0E8]/30 mb-0.5">Estilo seleccionado</p>
                  <p className="text-xs tracking-[0.1em] uppercase text-[#F5F0E8]/65 font-light">
                    {trendReport.recommendedStyles[selectedStyleIndex]?.name}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-8 py-3 text-[10px] tracking-[0.3em] uppercase font-light border border-[#F5F0E8]/40 text-[#F5F0E8] hover:bg-[#F5F0E8]/6 hover:border-[#F5F0E8]/65 transition-all"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
