"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DesignProject } from "@/lib/design-project";

const MAX_SIZE_MB = 10;
const RESIZE_MAX_PX = 1200;

// ─── File processing helpers (mirrors ChatInput.tsx) ─────────────────────────

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeToMax(base64: string, maxPx = RESIZE_MAX_PX): Promise<string> {
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

async function convertHeic(file: File): Promise<string> {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return readAsBase64(blob);
}

async function convertSvg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const w = img.width || 800;
      const h = img.height || 800;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG load failed")); };
    img.src = url;
  });
}

async function convertPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function processFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;
  let base64: string;
  if (name.endsWith(".heic") || name.endsWith(".heif") || type === "image/heic" || type === "image/heif") {
    base64 = await convertHeic(file);
  } else if (name.endsWith(".svg") || type === "image/svg+xml") {
    base64 = await convertSvg(file);
  } else if (name.endsWith(".pdf") || type === "application/pdf") {
    base64 = await convertPdf(file);
  } else {
    base64 = await readAsBase64(file);
  }
  return resizeToMax(base64);
}

function isAcceptedFile(file: File): boolean {
  const ACCEPTED_TYPES = [
    "image/jpeg", "image/png", "image/webp",
    "image/heic", "image/heif", "image/svg+xml", "application/pdf",
  ];
  const name = file.name.toLowerCase();
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".svg", ".pdf"].some((ext) => name.endsWith(ext))
  );
}

// ─── Single upload zone ───────────────────────────────────────────────────────

interface ZoneProps {
  label: string;
  optional?: boolean;
  image: string | null;
  loading: boolean;
  error: string | null;
  dragging: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onFocus: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function UploadZone({
  label, optional, image, loading, error, dragging,
  onFileSelect, onRemove, onDragOver, onDragLeave, onDrop, onFocus,
  fileInputRef,
}: ZoneProps) {
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); onDragOver(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragLeave();
    const file = e.dataTransfer.files[0];
    if (file) onDrop(file);
  };
  const handleClick = () => {
    onFocus();
    if (!loading) fileInputRef.current?.click();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {/* Label */}
      <div className="flex items-baseline gap-2">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/40 font-medium">{label}</p>
        {optional && (
          <span className="text-[9px] tracking-[0.15em] uppercase text-[#F5F0E8]/20">(opcional)</span>
        )}
      </div>

      {/* Preview or drop zone */}
      {image && !loading ? (
        <div className="relative w-full aspect-[3/4] border border-[#F5F0E8]/15 overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={label}
            className="w-full h-full object-contain bg-[#111111]"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 bg-[#0A0A0A]/80 border border-[#F5F0E8]/20 text-[#F5F0E8]/55 text-[10px] hover:text-[#F5F0E8] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            ×
          </button>
          <button
            type="button"
            onClick={handleClick}
            className="absolute bottom-2 right-2 px-2.5 py-1 bg-[#0A0A0A]/80 border border-[#F5F0E8]/18 text-[9px] tracking-[0.15em] uppercase text-[#F5F0E8]/40 hover:text-[#F5F0E8]/70 transition-colors opacity-0 group-hover:opacity-100"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={onDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          onFocus={onFocus}
          className={`w-full aspect-[3/4] border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors gap-3 ${
            dragging
              ? "border-[#F5F0E8]/40 bg-[#F5F0E8]/4"
              : "border-[#F5F0E8]/14 hover:border-[#F5F0E8]/28"
          } ${loading ? "opacity-50 cursor-wait" : ""}`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-[#F5F0E8]/30 border-t-[#F5F0E8]/70 rounded-full animate-spin" />
              <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest">Procesando...</span>
            </div>
          ) : (
            <>
              {/* Upload icon */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[#F5F0E8]/18">
                <path d="M10 13V4M10 4L7 7M10 4L13 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-[#F5F0E8]/40 border border-[#F5F0E8]/15 px-3 py-1.5 hover:border-[#F5F0E8]/30 transition-colors">
                  Subir boceto
                </span>
                <span className="text-[9px] text-[#F5F0E8]/18 tracking-widest mt-1">
                  SVG · PDF · JPG · PNG
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-400/55 text-[10px]">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.svg,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SketchUploadProps {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SketchUpload({ project, onUpdate, onBack, onNext }: SketchUploadProps) {
  const [frontImage, setFrontImage] = useState<string | null>(project.sketchFront);
  const [backImage, setBackImage] = useState<string | null>(project.sketchBack);

  const [frontLoading, setFrontLoading] = useState(false);
  const [backLoading, setBackLoading] = useState(false);
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);
  const [frontDragging, setFrontDragging] = useState(false);
  const [backDragging, setBackDragging] = useState(false);

  // Track which zone paste should target — defaults to front
  const lastFocused = useRef<"front" | "back">("front");

  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  // Sync to parent whenever images change
  useEffect(() => {
    onUpdate({ sketchFront: frontImage, sketchBack: backImage });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontImage, backImage]);

  const handleFile = useCallback(async (file: File, zone: "front" | "back") => {
    const setLoading = zone === "front" ? setFrontLoading : setBackLoading;
    const setError = zone === "front" ? setFrontError : setBackError;
    const setImage = zone === "front" ? setFrontImage : setBackImage;

    setError(null);

    if (!isAcceptedFile(file)) {
      setError("Formato no soportado. Usa SVG, PDF, JPG, PNG o HEIC.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError("Archivo demasiado grande (máx. 10 MB).");
      return;
    }

    setLoading(true);
    try {
      const base64 = await processFile(file);
      setImage(base64);
    } catch {
      setError("Error al procesar el archivo. Prueba JPG o PNG.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Paste → whichever zone was last focused
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      await handleFile(file, lastFocused.current);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFile]);

  const canProceed = frontImage !== null;

  return (
    <div className="flex flex-col gap-8">
      {/* Upload zones */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <UploadZone
          label="Delantero"
          image={frontImage}
          loading={frontLoading}
          error={frontError}
          dragging={frontDragging}
          onFileSelect={(f) => handleFile(f, "front")}
          onRemove={() => { setFrontImage(null); setFrontError(null); }}
          onDragOver={() => setFrontDragging(true)}
          onDragLeave={() => setFrontDragging(false)}
          onDrop={(f) => handleFile(f, "front")}
          onFocus={() => { lastFocused.current = "front"; }}
          fileInputRef={frontFileRef}
        />
        <UploadZone
          label="Espalda"
          optional
          image={backImage}
          loading={backLoading}
          error={backError}
          dragging={backDragging}
          onFileSelect={(f) => handleFile(f, "back")}
          onRemove={() => { setBackImage(null); setBackError(null); }}
          onDragOver={() => setBackDragging(true)}
          onDragLeave={() => setBackDragging(false)}
          onDrop={(f) => handleFile(f, "back")}
          onFocus={() => { lastFocused.current = "back"; }}
          fileInputRef={backFileRef}
        />
      </div>

      {/* Helper text */}
      <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/20">
        Exporta desde Corel como SVG o PDF · También puedes pegar con Cmd+V
      </p>

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
          disabled={!canProceed}
          className={`px-8 py-2.5 text-[10px] tracking-[0.3em] uppercase font-light border transition-all ${
            canProceed
              ? "border-[#F5F0E8]/40 text-[#F5F0E8] hover:bg-[#F5F0E8]/6 hover:border-[#F5F0E8]/65"
              : "border-[#F5F0E8]/10 text-[#F5F0E8]/20 cursor-not-allowed"
          }`}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
