export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="w-full select-none">
      {/* Desktop Horizontal Step Bar */}
      <div className="hidden sm:grid grid-cols-5 gap-2.5">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const stepNum = `0${index + 1}`;

          return (
            <div
              key={step.id}
              className={`relative overflow-hidden flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${
                isCurrent
                  ? "border-[#00E5A0]/40 bg-[#00E5A0]/[0.08] shadow-[0_0_24px_rgba(0,229,160,0.12)]"
                  : isCompleted
                  ? "border-[#00E5A0]/25 bg-[#00E5A0]/[0.04] text-[#F5F7FA]"
                  : "border-white/[0.08] bg-white/[0.02] text-[#8C98A8]"
              }`}
            >
              {/* Bottom Emerald Indicator Line for Active Step */}
              {isCurrent && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#00E5A0] shadow-[0_0_8px_rgba(0,229,160,0.8)]" />
              )}

              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                  isCurrent
                    ? "bg-[#00E5A0] text-[#060B11]"
                    : isCompleted
                    ? "bg-[#00E5A0]/20 text-[#00E5A0]"
                    : "bg-white/[0.06] text-[#8C98A8]"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-xs font-bold uppercase tracking-wider ${
                    isCurrent
                      ? "text-[#00E5A0]"
                      : isCompleted
                      ? "text-[#F5F7FA]"
                      : "text-[#8C98A8]"
                  }`}
                >
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Compact Stepper */}
      <div className="sm:hidden flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#101923] p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00E5A0] text-xs font-black text-[#060B11]">
            0{currentStep + 1}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
              ADIM {currentStep + 1} / {steps.length}
            </div>
            <div className="text-xs font-bold text-[#F5F7FA]">
              {steps[currentStep]?.label}
            </div>
          </div>
        </div>

        {/* Mini progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? "w-5 bg-[#00E5A0]"
                  : idx < currentStep
                  ? "w-1.5 bg-[#00E5A0]/50"
                  : "w-1.5 bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
