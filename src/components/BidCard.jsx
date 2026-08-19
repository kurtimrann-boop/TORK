"use client";

import React, { useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatRelativeTimeTR, formatCurrencyTR } from "../utils/turkish";
import { calculateOperatingPricing, evaluateCarrierBid } from "../utils/pricingService";

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
  onEditBid,
  onCancelBid,
  isBestBid = false,
  isBestPricePerKm = false,
  isSelected = false,
  onSelect,
  pricePerKm,
}) {
  const isPending = bid.status === "pending";
  const isAccepted = bid.status === "accepted";
  const isRejected = bid.status === "rejected";
  const isCancelled = bid.status === "cancelled";

  // Inline Edit & Cancel Confirmation States
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(String(bid.amount || ""));
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const carrierName = bid.profiles?.company_name || bid.profiles?.full_name || "Taşıyıcı";
  const vehicleInfo = bid.loads?.vehicle_type || "TIR";
  const cargoInfo = bid.loads?.tonnage ? `${bid.loads.tonnage} Ton` : "Komple Yük";
  const deliveryInfo = bid.loads?.duration_minutes
    ? `${Math.round(bid.loads.duration_minutes / 60)} sa teslim`
    : "24 sa içinde";

  // Dynamic Live Smart Bidding Re-calculation for Carrier during Editing
  const liveSmartBidding = useMemo(() => {
    if (!isCarrierView) return null;
    const currentNum = Number(isEditing ? editAmount : bid.amount);
    if (!Number.isFinite(currentNum) || currentNum <= 0) return null;

    const dist = Number(bid.loads?.distance_km) || 730;
    const dur = Number(bid.loads?.duration_minutes) || 525;
    const vType = bid.loads?.vehicle_type || "TIR";

    const pricing = calculateOperatingPricing({
      distanceKm: dist,
      durationMinutes: dur,
      vehicleType: vType,
    });

    if (!pricing) return null;

    const analytics = evaluateCarrierBid(currentNum, pricing);
    const profit = analytics?.estimatedProfit ?? analytics?.profit ?? 0;
    return {
      pricing,
      analytics,
      operatingCost: pricing.totals.totalOperatingCost,
      profit,
      marginPercent: analytics?.marginPercent ?? 0,
      quality: analytics?.quality ?? "HEALTHY",
      label: analytics?.label ?? "Hesaplandı",
    };
  }, [isCarrierView, isEditing, editAmount, bid.amount, bid.loads]);

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    setActionError("");

    const num = Number(editAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setActionError("Lütfen geçerli bir teklif tutarı giriniz.");
      return;
    }

    if (num === Number(bid.amount)) {
      setIsEditing(false);
      return;
    }

    setIsActionLoading(true);
    try {
      if (onEditBid) {
        await onEditBid(bid.id, num);
      }
      setIsEditing(false);
    } catch (err) {
      setActionError(err.message || "Teklif güncellenemedi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsActionLoading(true);
    setActionError("");
    try {
      if (onCancelBid) {
        await onCancelBid(bid.id);
      }
      setShowCancelConfirm(false);
    } catch (err) {
      setActionError(err.message || "Teklif geri çekilemedi.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-150 select-none p-4 sm:px-5 sm:py-3.5 ${
        isSelected
          ? "border-[#F5A400] bg-[#1F2937] shadow-lg shadow-[#F5A400]/10"
          : isEditing
            ? "border-[#F5A400] bg-[#1F2937]"
            : "border-[#374151] bg-[#111827] hover:border-[#4B5563] hover:bg-[#1F2937]"
      }`}
    >
      {/* DESKTOP PROCUREMENT DATA ROW */}
      <div className="hidden lg:flex items-center justify-between gap-3.5 text-xs">
        {/* 1. Route & Select */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onSelect && !isCarrierView && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(bid.id)}
              className="h-4 w-4 accent-[#F5A400] rounded shrink-0 mr-1 cursor-pointer"
            />
          )}
          <span className="h-2 w-2 rounded-full bg-[#F5A400] shrink-0" />
          <div className="min-w-0 truncate">
            <span className="font-bold text-[#F3F4F6]">{bid.loads?.origin || "—"}</span>
            <span className="text-[#F5A400] mx-1.5 font-bold">→</span>
            <span className="font-bold text-[#F3F4F6]">{bid.loads?.destination || "—"}</span>
          </div>
        </div>

        {/* 2. Tonaj / Yük */}
        <div className="w-20 shrink-0 text-[#A0AEC0] font-semibold truncate text-left">
          {cargoInfo}
        </div>

        {/* 3. Teklif Sahibi / Zaman */}
        <div className="w-28 shrink-0 min-w-0">
          <div className="font-bold text-[#F3F4F6] truncate">
            {isCarrierView ? "Sizin Teklifiniz" : carrierName}
          </div>
          <div className="text-[11px] text-[#A0AEC0] truncate">
            {formatRelativeTimeTR(bid.created_at)}
          </div>
        </div>

        {/* 4. Araç & Süre */}
        <div className="w-24 shrink-0">
          <div className="font-bold text-[#F3F4F6] truncate">{vehicleInfo}</div>
          <div className="text-[11px] text-[#A0AEC0] truncate">{deliveryInfo}</div>
        </div>

        {/* 5. Fiyat & ₺/km */}
        <div className="w-28 shrink-0 flex flex-col items-start justify-center">
          <div className="flex items-center gap-1.5">
            <span className="text-base xl:text-lg font-black text-[#F5A400] font-mono tracking-tight whitespace-nowrap">
              {formatCurrencyTR(bid.amount)}
            </span>
            {isBestBid && !isCarrierView && (
              <span className="inline-flex items-center rounded bg-[#F5A400]/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-[#F5A400]">
                EN İYİ
              </span>
            )}
          </div>
          {pricePerKm && (
            <div className="text-[11px] font-mono text-[#A0AEC0] whitespace-nowrap">
              {formatPricePerKm(pricePerKm)}
            </div>
          )}
        </div>

        {/* 6. Durum */}
        <div className="shrink-0 flex items-center justify-center">
          <StatusBadge status={bid.status} />
        </div>

        {/* 7. Aksiyonlar */}
        <div className="shrink-0 flex items-center justify-end gap-1.5 whitespace-nowrap">
          {/* Shipper Actions: Kabul Et / Reddet */}
          {isPending && !isCarrierView && (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="h-8 rounded-lg bg-[#22C55E] px-3.5 text-xs font-bold text-white shadow hover:bg-[#16a34a] transition flex items-center justify-center"
              >
                Kabul Et
              </button>
              <button
                type="button"
                onClick={onReject}
                className="h-8 rounded-lg border border-[#374151] bg-[#111827] px-2.5 text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/10 transition flex items-center justify-center"
              >
                Reddet
              </button>
            </>
          )}

          {/* Carrier Actions */}
          {isCarrierView && isPending && !isEditing && !showCancelConfirm && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditAmount(String(bid.amount || ""));
                  setIsEditing(true);
                  setShowCancelConfirm(false);
                }}
                className="h-8 rounded-lg border border-[#F5A400]/30 bg-[#F5A400]/10 px-2.5 text-xs font-bold text-[#F5A400] hover:bg-[#F5A400]/20 transition flex items-center justify-center"
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(true);
                  setIsEditing(false);
                }}
                className="h-8 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-2.5 text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/20 transition flex items-center justify-center"
              >
                Geri Çek
              </button>
            </>
          )}

          {isCarrierView && onViewLoad && bid.load_id && (
            <button
              type="button"
              onClick={() => onViewLoad(bid.load_id)}
              className="h-8 rounded-lg border border-[#374151] bg-[#1F2937] px-2.5 text-xs font-semibold text-[#A0AEC0] hover:text-[#F3F4F6] transition flex items-center justify-center"
            >
              İlanı Gör
            </button>
          )}
        </div>
      </div>

      {/* MOBILE PROCUREMENT CARD (lg:hidden) */}
      <div className="lg:hidden space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#F3F4F6]">
            <span>{bid.loads?.origin || "—"}</span>
            <span className="text-[#F5A400]">→</span>
            <span>{bid.loads?.destination || "—"}</span>
          </div>
          <StatusBadge status={bid.status} />
        </div>

        <div className="flex items-center justify-between border-t border-[#374151] pt-2">
          <div className="text-[#A0AEC0]">
            <div>{isCarrierView ? "Sizin Teklifiniz" : carrierName}</div>
            <div className="text-[11px]">{formatRelativeTimeTR(bid.created_at)}</div>
          </div>
          <div className="text-right">
            <div className="text-base font-black font-mono text-[#F5A400]">
              {formatCurrencyTR(bid.amount)}
            </div>
            {pricePerKm && (
              <div className="text-[11px] font-mono text-[#A0AEC0]">
                {formatPricePerKm(pricePerKm)}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Buttons */}
        {isPending && !isCarrierView && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#374151]">
            <button
              type="button"
              onClick={onReject}
              className="tork-btn-secondary min-h-[44px] text-xs font-bold text-[#EF4444]"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="min-h-[44px] rounded-lg bg-[#22C55E] text-white font-black text-xs shadow transition"
            >
              Kabul Et
            </button>
          </div>
        )}
      </div>
    </div>
  );
}