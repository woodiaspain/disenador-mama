"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DesignProject } from "@/lib/design-project";

const MAX_IMAGES = 5;
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

// ─── Component ────────────────────────────────────────────────────────────────

interface LookReferencesProps {
  project: DesignProject;
  onUpdate: (patch: Partial<DesignProject>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function LookReferences({ project, onUpdate, onBack, onNext }: LookReferencesProps) {
  const [description, setDescription] = useState(project.selectedLook);
  const [images, setImages] = useState<string[]>(project.lookImages);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const [pasteToast, setPasteToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync up to parent on every change
  useEffect(() => {
    onUpdate({ selectedLook: description, lookImages: images });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, images]);

  const atLimit = images.length >= MAX_IMAGES;

  const addImage = useCallback(async (file: File) => {
    setUploadError(null);

    if (images.length >= MAX_IMAGES) {
      setUploadError(`Máximo ${MAX_IMAGES} imágenes permitidas.`);
      return;
    }

    const ACCEPTED_TYPES = [
      "image/jpeg", "image/png", "image/webp",
      "image/heic", "image/heif", "image/svg+xml", "application/pdf",
    ];
    const name = file.name.toLowerCase();
    const isAccepted =
      ACCEPTED_TYPES.includes(file.type) ||
      [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".svg", ".pdf"].some((ext) =>
        name.endsWith(ext)
      );

    if (!isAccepted) {
      setUploadError("Formato no soportado. Usa JPG, PNG, WebP, SVG, PDF o HEIC.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError("Archivo demasiado grande (máx. 10 MB).");
      return;
    }

    setLoadingCount((n) => n + 1);
    try {
      const base64 = await processFile(file);
      setImages((prev) => [...prev, base64].slice(0, MAX_IMAGES));
    } catch {
      setUploadError("Error al procesar el archivo. Prueba JPG o PNG.");
    } finally {
      setLoadingCount((n) => n - 1);
    }
  }, [images.length]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  // Paste support
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      await addImage(file);
      setPasteToast(true);
      setTimeout(() => setPasteToast(false), 2000);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      const toAdd = files.slice(0, MAX_IMAGES - images.length);
      toAdd.forEach((f) => addImage(f));
    },
    [addImage, images.length]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const toAdd = files.slice(0, MAX_IMAGES - images.length);
    toAdd.forEach((f) => addImage(f));
    e.target.value = "";
  };

  const isLoading = loadingCount > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Selected style header */}
      <div className="border-l-2 border-[#F5F0E8]/15 pl-4 py-0.5">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-1">
          Estilo seleccionado
        </p>
        <p className="text-sm tracking-[0.08em] uppercase font-light text-[#F5F0E8]/70">
          {project.styleName || "—"}
        </p>
      </div>

      {/* Look description textarea */}
      <div className="flex flex-col gap-2">
        <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
          Describe el look que quieres
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe el look de referencia..."
          className="w-full bg-transparent border border-[#F5F0E8]/18 text-[#F5F0E8] placeholder:text-[#F5F0E8]/20 p-4 resize-none outline-none focus:border-[#F5F0E8]/40 text-sm leading-relaxed font-light tracking-wide transition-colors"
        />
      </div>

      {/* Image upload section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25">
            Imágenes de referencia
          </label>
          <span className="text-[9px] text-[#F5F0E8]/20">
            {images.length} / {MAX_IMAGES}
          </span>
        </div>

        {/* Paste toast */}
        {pasteToast && (
          <p className="text-[10px] text-[#F5F0E8]/45 tracking-widest">Imagen pegada ✓</p>
        )}

        {/* Thumbnail grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Referencia ${i + 1}`}
                  className="w-full h-full object-cover border border-[#F5F0E8]/12"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#0A0A0A] border border-[#F5F0E8]/25 text-[#F5F0E8]/60 text-[9px] hover:text-[#F5F0E8] flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone — hide when at limit */}
        {!atLimit && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`w-full min-h-[90px] border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors px-4 py-5 gap-2 ${
              isDragging
                ? "border-[#F5F0E8]/40 bg-[#F5F0E8]/5"
                : "border-[#F5F0E8]/14 hover:border-[#F5F0E8]/28"
            } ${isLoading ? "opacity-50 cursor-wait" : ""}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-[#F5F0E8]/30 border-t-[#F5F0E8]/70 rounded-full animate-spin" />
                <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest">Procesando...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#F5F0E8]/45 border border-[#F5F0E8]/18 px-3 py-1.5 hover:border-[#F5F0E8]/38 transition-colors">
                    Subir fotos
                  </span>
                  <span className="text-[10px] text-[#F5F0E8]/22">o arrastra aquí</span>
                </div>
                <p className="text-[9px] text-[#F5F0E8]/18 tracking-widest">
                  JPG · PNG · WebP · SVG · PDF · HEIC
                </p>
                <p className="text-[9px] text-[#F5F0E8]/13 hidden sm:block">
                  También puedes pegar con Cmd+V
                </p>
              </>
            )}
          </div>
        )}

        {atLimit && (
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/25">
            Límite de {MAX_IMAGES} imágenes alcanzado
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.svg,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadError && (
          <p className="text-red-400/55 text-[10px]">{uploadError}</p>
        )}

        <p className="text-[9px] text-[#F5F0E8]/18 leading-relaxed">
          Estas imágenes se incluirán en la página de referencias del PDF.
        </p>
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
  );
}
