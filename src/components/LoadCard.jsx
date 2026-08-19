import StatusBadge from "./StatusBadge";
import { formatRelativeTimeTR } from "../utils/turkish";

export default function LoadCard({
  load,
  bidCount = 0,
  onViewDetails,
  onBid,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-[#0B111A] p-4 sm:px-5 sm:py-4 transition-all duration-200 hover:border-[#F5A400]/30 hover:bg-[#101923] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] select-none">
      {/* Desktop Linear/Vercel Compact Data Row (lg:grid) */}
      <div className="hidden lg:grid grid-cols-12 items-center gap-4 text-xs">
        {/* Route (4 cols) */}
        <div className="col-span-4 flex items-center gap-2 min-w-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A400] shrink-0" />
          <span className="font-bold text-[#F5F7FA] truncate">{load.origin}</span>
          <svg className="h-3.5 w-3.5 text-[#8C98A8] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="font-bold text-[#F5F7FA] truncate">{load.destination}</span>
        </div>

        {/* Cargo & Tonnage (2 cols) */}
        <div className="col-span-2 text-[#8C98A8]">
          <span className="font-bold text-[#F5F7FA]">{load.tonnage} Ton</span>
          {load.cargo_type && <span className="ml-1 text-[11px] truncate">· {load.cargo_type}</span>}
        </div>

        {/* Vehicle (2 cols) */}
        <div className="col-span-2 text-[#8C98A8] truncate">
          {load.vehicle_type || "TIR"}
        </div>

        {/* Date & Bids (2 cols) */}
        <div className="col-span-2 flex items-center gap-2">
          <span className="text-[11px] text-[#8C98A8] truncate">{formatRelativeTimeTR(load.created_at)}</span>
          {bidCount > 0 && (
            <span className="rounded-md bg-[#F5A400]/10 border border-[#F5A400]/20 px-2 py-0.5 text-[10px] font-black text-[#F5A400]">
              {bidCount} teklif
            </span>
          )}
        </div>

        {/* Status & Actions (2 cols) */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          <StatusBadge status={load.status} />

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="rounded-lg bg-[#F5A400]/10 border border-[#F5A400]/20 px-2.5 py-1 text-[11px] font-bold text-[#F5A400] hover:bg-[#F5A400]/20 transition"
            >
              İncele
            </button>
          )}

          {onBid && (
            <button
              onClick={onBid}
              className="rounded-lg bg-[#F5A400] px-3 py-1 text-[11px] font-black text-[#060B11] shadow hover:bg-[#D98200] transition"
            >
              Teklif Ver
            </button>
          )}

          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-[#8C98A8] hover:text-[#F5F7FA] transition"
            >
              Düzenle
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg border border-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition"
            >
              Sil
            </button>
          )}
        </div>
      </div>

      {/* Mobile Stacked Compact Row (< lg) */}
      <div className="lg:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <StatusBadge status={load.status} />
          <span className="text-[11px] text-[#8C98A8]">{formatRelativeTimeTR(load.created_at)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FA]">
          <span className="truncate">{load.origin}</span>
          <svg className="h-3.5 w-3.5 text-[#F5A400] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="truncate">{load.destination}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8C98A8]">
          <span className="rounded bg-white/[0.04] px-2 py-0.5 font-bold text-[#F5F7FA]">{load.tonnage} Ton</span>
          <span>{load.vehicle_type}</span>
          {bidCount > 0 && (
            <span className="rounded bg-[#F5A400]/10 px-2 py-0.5 text-[10px] font-black text-[#F5A400]">
              {bidCount} Teklif
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 rounded-xl bg-[#F5A400]/10 border border-[#F5A400]/20 py-2 text-xs font-black text-[#F5A400]"
            >
              Detayları Gör
            </button>
          )}

          {onBid && (
            <button
              onClick={onBid}
              className="flex-1 rounded-xl bg-[#F5A400] py-2 text-xs font-black text-[#060B11]"
            >
              Teklif Ver
            </button>
          )}

          {canEdit && onEdit && (
            <button
              onClick={onEdit}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#8C98A8]"
            >
              Düzenle
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400"
            >
              Sil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}