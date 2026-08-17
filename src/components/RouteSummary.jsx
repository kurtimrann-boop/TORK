export default function RouteSummary({
  originLabel,
  destinationLabel,
  distanceText = "Henüz hesaplanmadı",
  durationText = "Henüz hesaplanmadı",
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="tork-eyebrow mb-2">Nereden</div>
        <div className="text-sm font-bold text-[#F5F7FA]">
          {originLabel}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="tork-eyebrow mb-2">Nereye</div>
        <div className="text-sm font-bold text-[#F5F7FA]">
          {destinationLabel}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="tork-eyebrow mb-2">Mesafe</div>
        <div className="text-sm font-bold text-[#9AA7B5]">
          {distanceText}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="tork-eyebrow mb-2">Tahmini Süre</div>
        <div className="text-sm font-bold text-[#9AA7B5]">
          {durationText}
        </div>
      </div>
    </div>
  );
}