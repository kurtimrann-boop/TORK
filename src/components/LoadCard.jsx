import StatusBadge from "./StatusBadge";
import { formatRelativeTimeTR } from "../utils/turkish";

export default function LoadCard({
  load,
  bidCount = 0,
  onViewDetails,
  onBid,
}) {
  return (
    <div className="group rounded-2xl border border-white/8 bg-[#0F1723] p-6 transition-all duration-200 hover:border-[#00E5A0]/20 hover:shadow-[0_8px_32px_rgba(0,229,160,0.1)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center justify-between lg:mb-1">
            <StatusBadge status={load.status} />
            <span className="text-[10px] font-bold text-[#9AA7B5]">
              {formatRelativeTimeTR(load.created_at)}
            </span>
          </div>

          <div className="my-3 flex items-center gap-2">
            <span className="text-sm font-bold text-[#F5F7FA]">{load.origin}</span>
            <svg
              className="h-4 w-4 text-[#00E5A0]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-sm font-bold text-[#F5F7FA]">{load.destination}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5">
              <span className="text-[10px] font-bold text-[#9AA7B5]">TONAJ</span>
              <span className="text-xs font-black text-[#F5F7FA]">{load.tonnage} T</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5">
              <span className="text-[10px] font-bold text-[#9AA7B5]">ARAÇ</span>
              <span className="text-xs font-black text-[#F5F7FA]">{load.vehicle_type}</span>
            </div>

            {bidCount > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5A0]/10 px-3 py-1.5">
                <span className="text-[10px] font-bold text-[#00E5A0]">TEKLİF</span>
                <span className="text-xs font-black text-[#00E5A0]">{bidCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 lg:flex-col">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/8 px-4 py-2.5 text-xs font-black text-[#00E5A0] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/12 lg:flex-none lg:w-32"
            >
              Detayları Gör
            </button>
          )}

          {onBid && (
            <button
              onClick={onBid}
              className="flex-1 rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-2.5 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15 lg:flex-none lg:w-32"
            >
              Teklif Ver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}