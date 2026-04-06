"use client";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({
  message = "Interpretando diseño...",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-7 h-7 border border-[#F5F0E8]/40 border-t-[#F5F0E8] rounded-full animate-spin" />
      <span className="text-[#F5F0E8]/40 text-[10px] tracking-[0.3em] uppercase font-light">
        {message}
      </span>
    </div>
  );
}
