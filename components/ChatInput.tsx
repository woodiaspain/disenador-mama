"use client";

import { useState, useRef, useCallback } from "react";

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

const MAX_SIZE_MB = 5;
const RESIZE_MAX_PX = 800;

/** Resize image to max RESIZE_MAX_PX on the longest side, returns base64 data URL */
async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > RESIZE_MAX_PX || height > RESIZE_MAX_PX) {
        if (width >= height) {
          height = Math.round((height * RESIZE_MAX_PX) / width);
          width = RESIZE_MAX_PX;
        } else {
          width = Math.round((width * RESIZE_MAX_PX) / height);
          height = RESIZE_MAX_PX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

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
  const [image, setImage] = useState<string | null>(null); // base64 data URL
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveBrand = brand === "Custom" ? customBrand.trim() || "Custom" : brand;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading && !imageLoading) {
      onSubmit(value.trim(), effectiveBrand, image);
    }
  };

  const processFile = useCallback(async (file: File) => {
    setImageError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Solo JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImageError(`Máx. ${MAX_SIZE_MB}MB.`);
      return;
    }
    setImageLoading(true);
    try {
      const base64 = await resizeImage(file);
      setImage(base64);
    } catch {
      setImageError("No se pudo procesar la imagen.");
    } finally {
      setImageLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      {/* BRAND SELECTOR */}
      <div className="flex flex-col gap-2">
        <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/30">
          Cliente
        </p>
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

        {/* Thumbnail */}
        {image ? (
          <div className="flex items-start gap-3">
            <div className="relative w-20 h-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Imagen de referencia"
                className="w-full h-full object-cover border border-[#F5F0E8]/15"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
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
              Cambiar imagen
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !imageLoading && fileInputRef.current?.click()}
            className={`w-full min-h-[56px] border border-dashed flex items-center justify-center cursor-pointer transition-colors duration-150 px-4 py-3 ${
              isDragging
                ? "border-[#F5F0E8]/40 bg-[#F5F0E8]/5"
                : "border-[#F5F0E8]/15 hover:border-[#F5F0E8]/30"
            } ${imageLoading ? "opacity-50 cursor-wait" : ""}`}
          >
            {imageLoading ? (
              <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest">
                Procesando...
              </span>
            ) : (
              <span className="text-[10px] text-[#F5F0E8]/30 tracking-widest text-center">
                + Subir imagen · JPG PNG WEBP · máx 5MB
              </span>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
