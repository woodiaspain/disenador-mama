"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const BRANDS = [
  "ZARA MAN",
  "ZARA WOMAN",
  "ZARA HOME",
  "MASSIMO DUTTI",
  "PULL&BEAR",
  "Custom",
] as const;

const EXAMPLE_CHIPS = [
  "Pantalón vaquero wide leg con rotos en rodillas",
  "Cargo denim negro con bolsillos laterales",
  "Straight fit índigo con crease y dobladillo asimétrico",
  "Vaquero slim azul oscuro sin lavado",
];

const MAX_SIZE_MB = 10;
const RESIZE_MAX_PX = 1200;

// ─── helpers ────────────────────────────────────────────────────────────────

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
    img.onerror = () => resolve(base64); // fallback — return as-is
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

// ─── component ──────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSubmit: (input: string, brand: string, referenceImage: string | null) => void;
  isLoading: boolean;
  initialValue?: string;
  initialBrand?: string;
}

export function ChatInput({
  onSubmit,
  isLoading,
  initialValue = "",
  initialBrand = "ZARA MAN",
}: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const [brand, setBrand] = useState(initialBrand);
  const [customBrand, setCustomBrand] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [pasteToast, setPasteToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveBrand = brand === "Custom" ? customBrand.trim() || "Custom" : brand;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !imageLoading) {
      onSubmit(value.trim(), effectiveBrand, image);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    setImageError(null);

    const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/svg+xml", "application/pdf"];
    const name = file.name.toLowerCase();
    const isAccepted = ACCEPTED.includes(file.type) ||
      [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".svg", ".pdf"].some(ext => name.endsWith(ext));

    if (!isAccepted) {
      setImageError("Formato no soportado. Usa JPG, PNG, SVG, PDF o HEIC.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError("Imagen demasiado grande, intenta con otra.");
      return;
    }

    setImageLoading(true);
    try {
      const base64 = await processFile(file);
      setImage(base64);
    } catch {
      setImageError("Error al procesar el archivo, prueba JPG o PNG.");
    } finally {
      setImageLoading(false);
    }
  }, []);

  // Paste support
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      setImageLoading(true);
      setImageError(null);
      try {
        const base64 = await processFile(file);
        setImage(base64);
        setPasteToast(true);
        setTimeout(() => setPasteToast(false), 2000);
      } catch {
        setImageError("Error al pegar la imagen.");
      } finally {
        setImageLoading(false);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      {/* BRAND SELECTOR */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/30">Cliente</p>
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBrand(b)}
              className={`px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase transition-colors duration-150 border ${
                brand === b
                  ? "bg-[#F5F0E8] text-[#0A0A0A] border-[#F5F0E8]"
                  : "text-[#F5F0E8]/45 border-[#F5F0E8]/15 hover:border-[#F5F0E8]/35 hover:text-[#F5F0E8]/70"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        {brand === "Custom" && (
          <input
            type="text"
            value={customBrand}
            onChange={(e) => setCustomBrand(e.target.value)}
            placeholder="Nombre del cliente..."
            className="w-full sm:w-64 bg-transparent border border-[#F5F0E8]/20 text-[#F5F0E8] placeholder:text-[#F5F0E8]/25 px-3 py-2 text-sm outline-none focus:border-[#F5F0E8]/45 transition-colors"
          />
        )}
      </div>

      {/* TEXTAREA */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe tu diseño... ej. Pantalón vaquero wide leg con rotos en rodillas y cargo pocket lateral"
        disabled={isLoading}
        rows={4}
        className="w-full min-h-[120px] bg-transparent border border-[#F5F0E8]/20 text-[#F5F0E8] placeholder:text-[#F5F0E8]/25 p-4 resize-none outline-none focus:border-[#F5F0E8]/45 text-sm leading-relaxed font-light tracking-wide transition-colors duration-200"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
      />

      {/* EXAMPLE CHIPS */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setValue(chip)}
            disabled={isLoading}
            className="text-[10px] text-[#F5F0E8]/35 border border-[#F5F0E8]/12 px-2.5 py-1.5 hover:border-[#F5F0E8]/30 hover:text-[#F5F0E8]/60 transition-colors duration-150 text-left disabled:opacity-30"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* IMAGE UPLOAD */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/30">
            Imagen para la ficha técnica (opcional)
          </p>
          <p className="text-[10px] text-[#F5F0E8]/20 mt-0.5">
            Sube una foto o sketch de referencia — aparecerá en la ficha generada
          </p>
        </div>

        {/* Paste toast */}
        {pasteToast && (
          <p className="text-[10px] text-[#F5F0E8]/50 tracking-widest">Imagen pegada ✓</p>
        )}

        {/* Thumbnail */}
        {image && !imageLoading ? (
          <div className="flex items-start gap-3">
            <div className="relative shrink-0" style={{ maxHeight: 120 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Imagen de referencia"
                className="border border-[#F5F0E8]/15 object-contain"
                style={{ maxHeight: 120, maxWidth: "100%" }}
              />
              <button
                type="button"
                onClick={() => { setImage(null); setImageError(null); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#0A0A0A] border border-[#F5F0E8]/25 text-[#F5F0E8]/60 text-[9px] hover:text-[#F5F0E8] flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-[#F5F0E8]/30 hover:text-[#F5F0E8]/55 transition-colors self-end pb-0.5"
            >
              Cambiar
            </button>
          </div>
        ) : (
          /* Drop zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !imageLoading && fileInputRef.current?.click()}
            className={`w-full min-h-[80px] border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 px-4 py-4 gap-2 ${
              isDragging
                ? "border-[#F5F0E8]/40 bg-[#F5F0E8]/5"
                : "border-[#F5F0E8]/15 hover:border-[#F5F0E8]/30"
            } ${imageLoading ? "opacity-50 cursor-wait" : ""}`}
          >
            {imageLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border border-[#F5F0E8]/30 border-t-[#F5F0E8]/70 rounded-full animate-spin" />
                <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest">Procesando...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#F5F0E8]/50 border border-[#F5F0E8]/20 px-3 py-1.5 hover:border-[#F5F0E8]/40 transition-colors">
                    Subir boceto
                  </span>
                  <span className="text-[10px] text-[#F5F0E8]/25">o arrastra aquí</span>
                </div>
                <p className="text-[9px] text-[#F5F0E8]/20 tracking-widest">
                  JPG · PNG · SVG · PDF · HEIC
                </p>
                <p className="text-[9px] text-[#F5F0E8]/15 hidden sm:block">
                  También puedes pegar con Cmd+V
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.svg,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {imageError && (
          <p className="text-red-400/60 text-[10px]">{imageError}</p>
        )}
      </div>

      {/* SUBMIT ROW */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <span className="text-[#F5F0E8]/20 text-[10px] tracking-widest hidden sm:block">
          ⌘↵ para enviar
        </span>
        <button
          type="submit"
          disabled={!value.trim() || isLoading || imageLoading}
          className="w-full sm:w-auto px-8 py-3 bg-[#F5F0E8] text-[#0A0A0A] text-[10px] tracking-[0.2em] uppercase font-medium disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white transition-colors duration-150"
        >
          Generar Ficha
        </button>
      </div>
    </form>
  );
}
