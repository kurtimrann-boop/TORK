"use client";

const STEPS = [
  { id: "assigned", label: "Atandı", desc: "Taşıma eşleşti" },
  { id: "pickup_pending", label: "Yükleme", desc: "Araca yükleniyor" },
  { id: "in_transit", label: "Yolda", desc: "Sevkiyat sürüyor" },
  { id: "delivered", label: "Teslim Edildi", desc: "POD bekleniyor" },
  { id: "settled", label: "Mutabakat", desc: "Tamamlandı" },
];

export default function TransportStatusStepper({ currentStatus = "assigned", onStatusChange = null, isCarrier = false }) {
  const isDisputed = currentStatus === "disputed";
  const isCancelled = currentStatus === "cancelled";

  const getStepIndex = (status) => {
    switch (status) {
      case "assigned":
        return 0;
      case "pickup_pending":
        return 1;
      case "in_transit":
        return 2;
      case "delivered":
        return 3;
      case "settled":
      case "paid":
      case "approved":
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getStepIndex(currentStatus);

  if (isDisputed || isCancelled) {
    return (
      <div className={`rounded-2xl border p-4 ${isDisputed ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-current/20 text-sm font-black">
            {isDisputed ? "⚠️" : "✕"}
          </span>
          <div>
            <div className="text-xs font-black uppercase tracking-wider">
              {isDisputed ? "Uyuşmazlık Bildirildi" : "Taşıma İptal Edildi"}
            </div>
            <div className="text-[11px] text-slate-300">
              {isDisputed ? "Taşıma ve mutabakat süreci incelemeye alındı." : "Bu sefer iptal edilmiştir."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Stepper */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-2 relative">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isUpcoming = idx > activeIndex;

          return (
            <div key={step.id} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`absolute top-4 -left-1/2 w-full h-[2px] -z-0 transition-colors ${
                    idx <= activeIndex ? "bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white/10"
                  }`}
                />
              )}

              {/* Circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                  isCurrent
                    ? "border-2 border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110"
                    : isCompleted
                      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border border-white/10 bg-[#0F1723] text-slate-500"
                }`}
              >
                {isCompleted ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>

              {/* Labels */}
              <div className="mt-2.5">
                <div
                  className={`text-xs font-black tracking-tight ${
                    isCurrent ? "text-emerald-400" : isCompleted ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-slate-500 hidden md:block">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (Vertical Compact) */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sefer Aşaması</span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-400">
            {STEPS[activeIndex]?.label} ({activeIndex + 1}/{STEPS.length})
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
