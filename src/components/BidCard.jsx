"use client";

import StatusBadge from "./StatusBadge";
import { formatRelativeTimeTR, formatCurrencyTR } from "../utils/turkish";

function formatPricePerKm(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺/km`;
}

export default function BidCard({
  bid,
  isCarrierView = false,
  onAccept,
  onReject,
  onViewLoad,
  isBestBid = false,
  isBestPricePerKm = false,
  isSelected = false,
  onSelect,
  pricePerKm,
}) {
  const isPending = bid.status === "pending";
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";

  return (
    <div
      className={`rounded-2xl border bg-[#0F1723] p-5 sm:p-6 transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "border-[#00E5A0]/30 bg-[#00E5A0]/5"
          : "border-white/8 hover:border-white/14"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {onSelect && !isCarrierView && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(bid.id)}
                className="h-4 w-4 accent-[#00E5A0] rounded"
              />
            )}
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9AA7B5]">
              {isCarrierView ? "Verdiğiniz Teklif" : "Taşıyıcı Teklifi"}
            </span>

            {isBestBid && !isCarrierView && (
              <span className="rounded-full border border-[#00E5A0]/20 bg-[#00E5A0]/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#00E5A0]">
                EN DÜŞÜK TOPLAM
              </span>
            )}
            {isBestPricePerKm && !isCarrierView && pricePerKm !== null && (
              <span className="rounded-full border border-[#06B6D4]/20 bg-[#06B6D4]/10 px-2 py-0.5 text-[9px] font-black tracking-wider text-[#06B6D4]">
                EN DÜŞÜK FİYAT/KM
              </span>
            )}

            {isCarrierView && isAccepted && (
              <span className="rounded-full border border-[#00E5A0]/30 bg-[#00E5A0]/15 px-2.5 py-0.5 text-[9px] font-black tracking-wider text-[#00E5A0]">
                SEVKİYAT ATANDI
              </span>
            )}
          </div>

          <div className="mb-2 flex items-baseline justify-between lg:mb-0">
            <div className="text-2xl sm:text-3xl font-black tracking-[-0.04em] text-[#00E5A0]">
              {formatCurrencyTR(bid.amount)}
            </div>
            <div className="text-[11px] font-bold text-[#9AA7B5]">
              {formatRelativeTimeTR(bid.created_at)}
            </div>
          </div>

          {pricePerKm !== null && pricePerKm !== undefined && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#06B6D4]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#06B6D4]" />
              <span>Birim Navlun: {formatPricePerKm(pricePerKm)}</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm font-black text-[#F5F7FA]">
              {bid.loads?.origin || "—"}
            </span>
            <svg
              className="h-3.5 w-3.5 text-[#9AA7B5] shrink-0"
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
            <span className="text-sm font-black text-[#F5F7FA]">
              {bid.loads?.destination || "—"}
            </span>
          </div>

          {bid.loads?.tonnage && (
            <div className="mt-1 text-xs text-[#9AA7B5]">
              {bid.loads.tonnage} Ton {bid.loads.vehicle_type ? `· ${bid.loads.vehicle_type}` : ""}
            </div>
          )}

          {!isCarrierView && (
            <div className="mt-2 text-xs font-medium text-[#9AA7B5]">
              {bid.profiles?.company_name || "Doğrulanmış Taşıyıcı"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <StatusBadge status={bid.status} />

          {/* Shipper Actions (Accept / Reject) */}
          {isPending && !isCarrierView && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="rounded-xl border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-4 py-2 text-xs font-black text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.2)] transition duration-150 hover:border-[#00E5A0]/40 hover:bg-[#00E5A0]/15 active:scale-95"
              >
                Kabul Et
              </button>

              <button
                type="button"
                onClick={onReject}
                className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-2 text-xs font-black text-red-400 transition duration-150 hover:border-red-500/25 hover:bg-red-500/8 active:scale-95"
              >
                Reddet
              </button>
            </div>
          )}

          {/* Carrier Actions & Status Notes */}
          {isCarrierView && (
            <div className="flex flex-col items-start lg:items-end gap-2">
              {isPending && (
                <span className="text-[11px] font-bold text-amber-400">
                  Karar bekleniyor
                </span>
              )}
              {isAccepted && (
                <span className="text-[11px] font-black text-[#00E5A0]">
                  Teklifiniz kabul edildi
                </span>
              )}
              {isRejected && (
                <span className="text-[11px] font-bold text-slate-400">
                  Teklif reddedildi
                </span>
              )}

              {onViewLoad && bid.load_id && (
                <button
                  type="button"
                  onClick={() => onViewLoad(bid.load_id)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 transition duration-150 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
                >
                  İlanı İncele →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}