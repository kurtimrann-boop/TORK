export default function MetricGroup({ title, metrics }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 backdrop-blur-sm">
      <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA7B5]">
        {title}
      </div>

      <div className="space-y-3">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3"
          >
            <span className="text-xs text-[#9AA7B5]">{metric.label}</span>
            <span className={`text-sm font-black ${metric.color || "text-[#F5F7FA]"}`}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
