"use client";

const STEPS = [
  { n: 1, label: "Tendencias" },
  { n: 2, label: "Looks" },
  { n: 3, label: "Bocetos" },
  { n: 4, label: "Delantero" },
  { n: 5, label: "Espalda" },
  { n: 6, label: "Medidas" },
  { n: 7, label: "Trims" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav className="w-full">
      {/* Mobile: compact label */}
      <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-[#F5F0E8]/8">
        <span className="text-[9px] tracking-[0.35em] uppercase text-[#F5F0E8]/30">
          Paso {currentStep} de 7
        </span>
        <span className="text-[9px] tracking-[0.25em] uppercase text-[#F5F0E8]/55 font-medium">
          {STEPS[currentStep - 1]?.label}
        </span>
      </div>

      {/* Desktop: full step row */}
      <div className="hidden sm:flex items-center gap-0 border-b border-[#F5F0E8]/8">
        {STEPS.map((step, i) => {
          const isActive = step.n === currentStep;
          const isDone = step.n < currentStep;
          const isLast = i === STEPS.length - 1;

          return (
            <div
              key={step.n}
              className={`flex items-center gap-2 px-5 py-3 ${!isLast ? "border-r border-[#F5F0E8]/8" : ""}`}
            >
              {/* Circle */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive
                    ? "bg-[#F5F0E8]"
                    : isDone
                    ? "bg-[#F5F0E8]/25"
                    : "border border-[#F5F0E8]/20 bg-transparent"
                }`}
              >
                {isDone && (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path
                      d="M1 3L3 5L7 1"
                      stroke="#0A0A0A"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isActive && (
                  <span className="text-[#0A0A0A] text-[7px] font-bold leading-none">
                    {step.n}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[9px] tracking-[0.2em] uppercase font-light transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-[#F5F0E8]"
                    : isDone
                    ? "text-[#F5F0E8]/35"
                    : "text-[#F5F0E8]/18"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
