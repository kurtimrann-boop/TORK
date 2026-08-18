import StatusBadge from "./StatusBadge";
import { formatRelativeTimeTR, formatCurrencyTR } from "../utils/turkish";

export default function BidCard({
  bid,
  isCarrierView = false,
  onAccept,
  onReject,
  isBestBid = false,
  isSelected = false,
  onSelect,
}) {
  const isPending = bid.status === "pending";

  return (
    <div
      className={`rounded-2xl border bg-[#0F1723] p-6 transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "border-[#00E5A0]/30 bg-[#00E5A0]/5"
          : "border-white/8 hover:border-white/12"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            {onSelect && isCarrierView === false && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(bid.id)}
                className="h-4 w-4 accent-[#00E5A0]"
              />
            )}
            <span className="text-sm font-bold text-[#9AA7B5]">
              {isCarrierView ? "Teklifim" : "Taşıyıcı"}
            </span>
            {isBestBid && !isCarrierView && (
              <span className="rounded-full border border-[#00E5A0]/20 bg-[#00E5A0]/10 px-2 py-0.5 text-[10px] font-black text-[#00E5A0]">
                EN DÜŞÜK
              </span>
            )}
          </div>

          <div className="mb-4 flex items-baseline justify-between lg:mb-0">
            <div className="text-4xl font-black tracking-[-0.04em] text-[#00E5A0]">
              {formatCurrencyTR(bid.amount)}
            </div>
            <div className="text-[10px] font-bold text-[#9AA7B5]">
              {formatRelativeTimeTR(bid.created_at)}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-bold text-[#F5F7FA]">
              {bid.loads?.origin || "—"}
            </span>
            <svg
              className="h-4 w-4 text-[#9AA7B5]"
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
            <span className="text-sm font-bold text-[#F5F7FA]">
              {bid.loads?.destination || "—"}
            </span>
          </div>

          {!isCarrierView && (
            <div className="mt-2 text-xs text-[#9AA7B5]">
              {bid.profiles?.company_name || "Taşıyıcı"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <StatusBadge status={bid.status} />

          {isPending && !isCarrierView && (
            <div className="flex gap-2">
              <button
                onClick={onAccept}
                className="rounded-lg border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-3.5 py-2 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition-all hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15"
              >
                Kabul Et
              </button>

              <button
                onClick={onReject}
                className="rounded-lg border border-red-500/15 bg-red-500/5 px-3.5 py-2 text-xs font-black text-red-400 transition-all hover:border-red-500/25 hover:bg-red-500/8"
              >
                Reddet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}