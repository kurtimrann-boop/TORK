export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            {/* Step Circle */}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-xs transition-all ${
                isCurrent
                  ? "border-2 border-[#00E5A0] bg-[#00E5A0]/10 text-[#00E5A0]"
                  : isCompleted
                    ? "border-2 border-[#00E5A0]/30 bg-[#00E5A0]/5 text-[#00E5A0]"
                    : "border-2 border-white/10 bg-white/[0.02] text-[#667085]"
              }`}
            >
              {isCompleted ? "✓" : index + 1}
            </div>

            {/* Step Label */}
            <div
              className={`hidden text-xs font-bold transition-colors sm:block ${
                isCurrent || isCompleted
                  ? "text-[#F5F7FA]"
                  : "text-[#667085]"
              }`}
            >
              {step.label}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`hidden flex-1 border-t-2 transition-colors lg:block ${
                  isCompleted
                    ? "border-[#00E5A0]/30"
                    : "border-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
