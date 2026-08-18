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

  const carrierName = bid.profiles?.company_name || "Taşıyıcı";
  const vehicleInfo = bid.loads?.vehicle_type || "TIR";
  const cargoInfo = bid.loads?.tonnage ? `${bid.loads.tonnage} Ton` : "Komple Yük";
  const deliveryInfo = bid.loads?.duration_minutes
    ? `${Math.round(bid.loads.duration_minutes / 60)} sa teslim`
    : "24 sa içinde";

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 select-none p-4 sm:px-5 sm:py-3.5 ${
        isSelected
          ? "border-[#00E5A0]/40 bg-[#00E5A0]/[0.05]"
          : "border-white/[0.06] bg-[#0B111A] hover:border-[#00E5A0]/30 hover:bg-[#101923] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      }`}
    >
      {/* =========================================================================
          DESKTOP PROCUREMENT DATA ROW (lg:grid)
          Columns: ROTA | YÜK | TAŞIYICI | ARAÇ | TESLİM | FİYAT & ₺/KM | DURUM | AKSİYON
         ========================================================================= */}
      <div className="hidden lg:grid grid-cols-12 items-center gap-3 text-xs">
        {/* 1. Route & Select (3 cols) */}
        <div className="col-span-3 flex items-center gap-2 min-w-0">
          {onSelect && !isCarrierView && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(bid.id)}
              className="h-3.5 w-3.5 accent-[#00E5A0] rounded shrink-0 mr-1"
            />
          )}
          <span className="h-1.5 w-1.5 rounded-full bg-[#00E5A0] shrink-0" />
          <div className="min-w-0 truncate">
            <span className="font-bold text-[#F5F7FA]">{bid.loads?.origin || "—"}</span>
            <span className="text-[#00E5A0] mx-1">→</span>
            <span className="font-bold text-[#F5F7FA]">{bid.loads?.destination || "—"}</span>
          </div>
        </div>

        {/* 2. Yük Bilgisi (1 col) */}
        <div className="col-span-1 text-[#8C98A8] truncate font-medium">
          {cargoInfo}
        </div>

        {/* 3. Taşıyıcı (2 cols) */}
        <div className="col-span-2 min-w-0">
          <div className="font-bold text-[#F5F7FA] truncate">
            {isCarrierView ? "Sizin Teklifiniz" : carrierName}
          </div>
          <div className="text-[10px] text-[#8C98A8] truncate">
            {formatRelativeTimeTR(bid.created_at)}
          </div>
        </div>

        {/* 4. Araç & Teslim (1 col) */}
        <div className="col-span-1 text-[#8C98A8] truncate">
          <div className="font-medium text-[#F5F7FA]">{vehicleInfo}</div>
          <div className="text-[10px] text-[#8C98A8]">{deliveryInfo}</div>
        </div>

        {/* 5. Fiyat & ₺/km & Best Bid Pill (2 cols) */}
        <div className="col-span-2 flex flex-col items-start justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-base xl:text-lg font-black text-[#F5F7FA] tracking-tight">
              {formatCurrencyTR(bid.amount)}
            </span>
            {isBestBid && !isCarrierView && (
              <span className="inline-flex items-center rounded-md border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#00E5A0]">
                EN DÜŞÜK
              </span>
            )}
          </div>
          {pricePerKm && (
            <div className="text-[11px] font-mono text-[#8C98A8]">
              {formatPricePerKm(pricePerKm)}
            </div>
          )}
        </div>

        {/* 6. Durum (1 col) */}
        <div className="col-span-1 flex items-center">
          <StatusBadge status={bid.status} />
        </div>

        {/* 7. Aksiyonlar (2 cols) */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          {isPending && !isCarrierView && (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-xl bg-[#00E5A0] px-3.5 py-2 text-xs font-black text-[#060B11] shadow-[0_0_14px_rgba(0,229,160,0.25)] hover:bg-[#00d896] active:scale-[0.98] transition"
              >
                Teklifi Kabul Et
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-xs font-bold text-[#8C98A8] hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 transition"
              >
                Reddet
              </button>
            </>
          )}

          {isCarrierView && onViewLoad && bid.load_id && (
            <button
              type="button"
              onClick={() => onViewLoad(bid.load_id)}
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-xs font-bold text-[#8C98A8] hover:text-[#F5F7FA] hover:border-white/20 transition"
            >
              İlanı Gör
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MOBILE STACKED PROCUREMENT CARD (< lg)
          Fiyat en üstte, CTA en altta
         ========================================================================= */}
      <div className="lg:hidden flex flex-col gap-3">
        {/* Top: Fiyat, Best Badge & Status */}
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-[#F5F7FA] tracking-tight">
                {formatCurrencyTR(bid.amount)}
              </span>
              {isBestBid && !isCarrierView && (
                <span className="inline-flex items-center rounded-md border border-[#00E5A0]/25 bg-[#00E5A0]/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#00E5A0]">
                  EN DÜŞÜK
                </span>
              )}
            </div>
            {pricePerKm && (
              <div className="text-xs font-mono text-[#8C98A8] mt-0.5">
                {formatPricePerKm(pricePerKm)}
              </div>
            )}
          </div>
          <StatusBadge status={bid.status} />
        </div>

        {/* Middle: Rota & Taşıyıcı Detayları */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-bold text-[#F5F7FA]">
            <span>{bid.loads?.origin || "—"}</span>
            <span className="text-[#00E5A0]">→</span>
            <span>{bid.loads?.destination || "—"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8C98A8]">
            <span className="font-semibold text-[#F5F7FA]">
              {isCarrierView ? "Sizin Teklifiniz" : carrierName}
            </span>
            <span>·</span>
            <span>{vehicleInfo}</span>
            <span>·</span>
            <span>{cargoInfo}</span>
            <span>·</span>
            <span>{formatRelativeTimeTR(bid.created_at)}</span>
          </div>
        </div>

        {/* Bottom: Action CTAs (44px+ touch target) */}
        {isPending && !isCarrierView && (
          <div className="pt-2 border-t border-white/[0.05] flex gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 h-11 rounded-xl bg-[#00E5A0] text-xs font-black text-[#060B11] shadow-[0_0_14px_rgba(0,229,160,0.2)] hover:bg-[#00d896] active:scale-[0.98] transition flex items-center justify-center"
            >
              Teklifi Kabul Et
            </button>
            <button
              type="button"
              onClick={onReject}
              className="h-11 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-bold text-[#8C98A8] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition flex items-center justify-center"
            >
              Reddet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}