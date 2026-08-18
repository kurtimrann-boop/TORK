"use client";

import { formatCurrencyTR } from "../utils/turkish";

export default function TransportVarianceCard({
  estimatedCost = 30813,
  actualCost = null,
  estimatedProfit = 9187,
  actualProfit = null,
  estimatedMargin = 23.0,
  actualMargin = null,
  dataCompleteness = "EMPTY",
  bidAmount = 40000,
}) {
  const hasActuals = actualCost !== null && Number.isFinite(actualCost);

  const costDiff = hasActuals ? Math.round((actualCost - estimatedCost) * 100) / 100 : null;
  const costDiffPercent = hasActuals && estimatedCost > 0 ? Math.round((costDiff / estimatedCost) * 1000) / 10 : null;

  const profitDiff = hasActuals && actualProfit !== null ? Math.round((actualProfit - estimatedProfit) * 100) / 100 : null;
  const marginDiff = hasActuals && actualMargin !== null ? Math.round((actualMargin - estimatedMargin) * 10) / 10 : null;

  // Cost variance: negative is good (savings), positive is bad (overrun)
  const isCostSavings = costDiff !== null && costDiff <= 0;
  const isProfitPositive = profitDiff !== null && profitDiff >= 0;

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.4)] select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00E5A0]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
              Finansal Sapma & Mutabakat Analizi
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#F5F7FA] mt-1 tracking-[-0.03em]">
            Tahmin vs Gerçekleşen Sefer Performansı
          </h3>
        </div>

        {/* Data Completeness Badge */}
        <span
          className={`rounded-full border px-3.5 py-1 text-[11px] font-bold tracking-wider ${
            dataCompleteness === "COMPLETE"
              ? "border-[#00E5A0]/40 bg-[#00E5A0]/10 text-[#00E5A0]"
              : dataCompleteness === "PARTIAL"
              ? "border-[#F5B94C]/40 bg-[#F5B94C]/10 text-[#F5B94C]"
              : "border-white/10 bg-white/[0.04] text-[#8C98A8]"
          }`}
        >
          {dataCompleteness === "COMPLETE"
            ? "✓ VERİ: TAM DOĞRULANDI"
            : dataCompleteness === "PARTIAL"
            ? "⚡ VERİ: KISMİ GİRİLDİ"
            : "○ VERİ: BEKLENİYOR"}
        </span>
      </div>

      {/* 3 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* 1. OPERATING COST */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
              01 · Operasyon Maliyeti
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Tahmini Plan:</span>
                <span className="font-bold text-[#F5F7FA]">{formatCurrencyTR(estimatedCost)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Gerçekleşen:</span>
                <span className="font-black text-[#F5F7FA]">
                  {hasActuals ? formatCurrencyTR(actualCost) : "Henüz Girilmedi"}
                </span>
              </div>
            </div>
          </div>

          {hasActuals && (
            <div
              className={`mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-black ${
                isCostSavings ? "text-[#00E5A0]" : "text-[#FF5C5C]"
              }`}
            >
              <span>{isCostSavings ? "Tasarruf:" : "Maliyet Artışı:"}</span>
              <span>
                {costDiff > 0 ? `+${formatCurrencyTR(costDiff)}` : formatCurrencyTR(costDiff)} ({costDiffPercent > 0 ? `+${costDiffPercent}` : costDiffPercent}%)
              </span>
            </div>
          )}
        </div>

        {/* 2. GROSS PROFIT */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
              02 · Sefer Net Kârı
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Tahmini Kâr:</span>
                <span className="font-bold text-[#F5F7FA]">{formatCurrencyTR(estimatedProfit)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Gerçekleşen Kâr:</span>
                <span className="font-black text-[#00E5A0]">
                  {actualProfit !== null ? formatCurrencyTR(actualProfit) : formatCurrencyTR(estimatedProfit)}
                </span>
              </div>
            </div>
          </div>

          {actualProfit !== null && (
            <div
              className={`mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-black ${
                isProfitPositive ? "text-[#00E5A0]" : "text-[#F5B94C]"
              }`}
            >
              <span>Kâr Sapması:</span>
              <span>
                {profitDiff > 0 ? `+${formatCurrencyTR(profitDiff)}` : formatCurrencyTR(profitDiff)}
              </span>
            </div>
          )}
        </div>

        {/* 3. MARGIN */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#101923] p-5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8] mb-3">
              03 · Kârlılık Marjı
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Tahmini Marj:</span>
                <span className="font-bold text-[#F5F7FA]">%{estimatedMargin.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#8C98A8]">Gerçekleşen Marj:</span>
                <span className="font-black text-[#00E5A0]">
                  {actualMargin !== null ? `%${actualMargin.toFixed(1)}` : `~%${estimatedMargin.toFixed(1)}`}
                </span>
              </div>
            </div>
          </div>

          {actualMargin !== null && (
            <div
              className={`mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-black ${
                marginDiff >= 0 ? "text-[#00E5A0]" : "text-[#F5B94C]"
              }`}
            >
              <span>Marj Değişimi:</span>
              <span>
                {marginDiff > 0 ? `+${marginDiff.toFixed(1)}` : marginDiff.toFixed(1)} puan
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
