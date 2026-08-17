"use client";

const STAGES = [
  { id: "open", label: "Marketplace", description: "Teklife açık" },
  { id: "assigned", label: "Atama", description: "Taşıma atandı" },
  { id: "loading", label: "Yükleme", description: "Yükleniyor" },
  { id: "in_transit", label: "Yol", description: "Yolda" },
  { id: "delivery", label: "Teslimat", description: "Teslimat bekleniyor" },
  { id: "completed", label: "Teslim", description: "Teslim edildi" },
];

function getStageIndex(currentStage) {
  if (!currentStage) return 0;
  const idx = STAGES.findIndex((s) => s.id === currentStage);
  return idx >= 0 ? idx : 0;
}

export default function ShipmentTimeline({ currentStage = "assigned", events = [] }) {
  const activeIndex = getStageIndex(currentStage);

  return (
    <div className="relative">
      <div className="space-y-0">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx <= activeIndex;
          const isActive = idx === activeIndex;
          const isFuture = idx > activeIndex;

          return (
            <div key={stage.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black ${
                    isCompleted
                      ? "border-[#00E5A0]/30 bg-[#00E5A0]/15 text-[#00E5A0]"
                      : "border-white/10 bg-white/[0.03] text-[#667085]"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < STAGES.length - 1 && (
                  <div
                    className={`h-10 w-px ${
                      isCompleted ? "bg-[#00E5A0]/30" : "bg-white/6"
                    }`}
                  />
                )}
              </div>

              <div className={`pb-8 ${isFuture ? "opacity-40" : ""}`}>
                <div
                  className={`text-xs font-black uppercase tracking-[0.16em] ${
                    isActive ? "text-[#06B6D4]" : isCompleted ? "text-[#00E5A0]" : "text-[#667085]"
                  }`}
                >
                  {stage.label}
                </div>
                <div className="mt-1 text-xs text-[#9AA7B5]">{stage.description}</div>
                {isActive && (
                  <div className="mt-1 text-[10px] font-bold text-[#06B6D4]">DEVAM EDİYOR</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
