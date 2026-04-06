"use client";

import { useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { SpecPreview } from "@/components/SpecPreview";
import { LoadingState } from "@/components/LoadingState";
import type { GarmentSpecs } from "@/lib/spec-types";

type AppState =
  | { stage: "idle" }
  | { stage: "loading"; message: string }
  | {
      stage: "specs";
      specs: GarmentSpecs;
      brand: string;
      referenceImage: string | null;
    }
  | { stage: "clarification"; question: string; prevInput: string; prevBrand: string }
  | { stage: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ stage: "idle" });

  const handleSubmit = async (
    input: string,
    brand: string,
    referenceImage: string | null
  ) => {
    setState({ stage: "loading", message: "Interpretando diseño..." });

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          brand,
          referenceImages: referenceImage ? [referenceImage] : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          stage: "error",
          message: data.error ?? "Error inesperado. Intenta de nuevo.",
        });
        return;
      }

      if (data.needs_clarification) {
        setState({
          stage: "clarification",
          question: data.question,
          prevInput: input,
          prevBrand: brand,
        });
        return;
      }

      setState({
        stage: "specs",
        specs: data.specs,
        brand,
        referenceImage,
      });
    } catch {
      setState({
        stage: "error",
        message: "No se pudo conectar al servidor. Verifica tu conexión.",
      });
    }
  };

  const handleReset = () => setState({ stage: "idle" });

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <header className="mb-10 sm:mb-16">
          <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F0E8]/25 mb-3">
            Woodia Spain
          </p>
          <h1 className="text-xl sm:text-2xl font-light tracking-[0.06em] text-[#F5F0E8]">
            Generador de Fichas Técnicas
          </h1>
          <div className="w-10 h-px bg-[#F5F0E8]/15 mt-5" />
        </header>

        {/* IDLE */}
        {state.stage === "idle" && (
          <div className="flex flex-col gap-8">
            <p className="text-[#F5F0E8]/35 text-sm font-light max-w-md leading-relaxed">
              Selecciona el cliente, describe el diseño en español o inglés y
              generamos la ficha técnica completa.
            </p>
            <ChatInput onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}

        {/* LOADING */}
        {state.stage === "loading" && (
          <div className="flex justify-center py-24">
            <LoadingState message={state.message} />
          </div>
        )}

        {/* SPECS */}
        {state.stage === "specs" && (
          <div>
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F0E8]/25 mb-1">
                  {state.brand} · Ficha generada
                </p>
                <h2 className="text-base sm:text-lg font-light tracking-wider text-[#F5F0E8]">
                  {state.specs.style_name}
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="shrink-0 text-[9px] tracking-[0.2em] uppercase text-[#F5F0E8]/25 hover:text-[#F5F0E8]/55 transition-colors mt-1"
              >
                ← Nueva ficha
              </button>
            </div>
            <SpecPreview
              specs={state.specs}
              brand={state.brand}
              referenceImage={state.referenceImage}
            />
          </div>
        )}

        {/* CLARIFICATION */}
        {state.stage === "clarification" && (
          <div className="flex flex-col gap-8">
            <div className="w-full max-w-2xl border-l-2 border-[#F5F0E8]/20 pl-5 py-1">
              <p className="text-[9px] tracking-[0.25em] uppercase text-[#F5F0E8]/30 mb-2">
                Necesito más información
              </p>
              <p className="text-[#F5F0E8]/65 text-sm leading-relaxed">
                {state.question}
              </p>
            </div>
            <ChatInput
              onSubmit={handleSubmit}
              isLoading={false}
              initialValue={state.prevInput}
              initialBrand={state.prevBrand}
            />
          </div>
        )}

        {/* ERROR */}
        {state.stage === "error" && (
          <div className="flex flex-col gap-8">
            <div className="w-full max-w-2xl border-l-2 border-red-900/50 pl-5 py-1">
              <p className="text-[9px] tracking-[0.25em] uppercase text-red-500/50 mb-2">
                Error
              </p>
              <p className="text-[#F5F0E8]/45 text-sm leading-relaxed">
                {state.message}
              </p>
            </div>
            <ChatInput onSubmit={handleSubmit} isLoading={false} />
          </div>
        )}
      </div>
    </main>
  );
}
