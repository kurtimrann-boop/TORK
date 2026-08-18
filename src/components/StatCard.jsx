export default function StatCard({
  label,
  value,
  detail,
  trend,
  accent = "neutral",
}) {
  const accentText = {
    emerald: "text-[#00E5A0]",
    cyan: "text-[#00E5A0]",
    amber: "text-[#F5B94C]",
    neutral: "text-[#F5F7FA]",
  }[accent] || "text-[#F5F7FA]";

  const indicatorDot = {
    emerald: "bg-[#00E5A0]",
    cyan: "bg-[#00E5A0]",
    amber: "bg-[#F5B94C]",
    neutral: "bg-white/40",
  }[accent] || "bg-white/40";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101923] p-5 transition-all duration-200 hover:border-white/[0.14] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
          {label}
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${indicatorDot}`} />
      </div>

      <div className={`text-2xl sm:text-3xl font-black tracking-[-0.04em] ${accentText}`}>
        {value}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[#8C98A8]">
        <span className="truncate">{detail}</span>
        {trend && (
          <span className="text-[10px] font-bold text-[#00E5A0] bg-[#00E5A0]/10 px-1.5 py-0.5 rounded-md">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
