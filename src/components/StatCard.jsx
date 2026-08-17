export default function StatCard({
  label,
  value,
  detail,
  trend,
  accent = "neutral",
}) {
  const accentClass = {
    emerald: "text-[#00E5A0]",
    cyan: "text-[#06B6D4]",
    amber: "text-[#FBBF24]",
    neutral: "text-[#F5F7FA]",
  }[accent] || "text-[#F5F7FA]";

  const accentBg = {
    emerald: "from-[#00E5A0]/10 to-[#00E5A0]/5",
    cyan: "from-[#06B6D4]/10 to-[#06B6D4]/5",
    amber: "from-[#FBBF24]/10 to-[#FBBF24]/5",
    neutral: "from-white/5 to-white/[0.02]",
  }[accent] || "from-white/5 to-white/[0.02]";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br ${accentBg} p-5 backdrop-blur-sm transition-all duration-200 hover:border-white/12 hover:shadow-lg`}
    >
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
        {label}
      </div>

      <div className={`text-4xl font-black tracking-[-0.04em] ${accentClass}`}>
        {value}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-[#667085]">{detail}</div>
        {trend ? (
          <span className="text-[10px] font-bold text-emerald-400">{trend}</span>
        ) : null}
      </div>
    </div>
  );
}
