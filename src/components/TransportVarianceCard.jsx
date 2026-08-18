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
    <div className="rounded-2xl border border-white/10 bg-[#0F1723]/90 p-5 sm:p-6 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/8">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
            Maliyet & Kârlılık Mutabakatı
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-100 mt-0.5">
            Tahmin vs Gerçekleşen Sefer Analizi
          </h3>
        </div>

        {/* Data Completeness Badge */}
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider ${
            dataCompleteness === "COMPLETE"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : dataCompleteness === "PARTIAL"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-slate-500/30 bg-slate-500/10 text-slate-400"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {/* 1. OPERATING COST */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            1. Operasyon Maliyeti
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tahmini Plan:</span>
              <span className="font-bold text-slate-200">{formatCurrencyTR(estimatedCost)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Gerçekleşen:</span>
              <span className="font-black text-slate-100">
                {hasActuals ? formatCurrencyTR(actualCost) : "Girilmedi"}
              </span>
            </div>
          </div>

          {hasActuals && (
            <div
              className={`mt-3 pt-2.5 border-t border-white/6 flex items-center justify-between text-xs font-black ${
                isCostSavings ? "text-emerald-400" : "text-rose-400"
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
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            2. Sefer Brüt Kârı
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tahmini Kâr:</span>
              <span className="font-bold text-slate-200">{formatCurrencyTR(estimatedProfit)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Gerçekleşen:</span>
              <span className="font-black text-emerald-400">
                {actualProfit !== null ? formatCurrencyTR(actualProfit) : "Hesaplanıyor"}
              </span>
            </div>
          </div>

          {actualProfit !== null && (
            <div
              className={`mt-3 pt-2.5 border-t border-white/6 flex items-center justify-between text-xs font-black ${
                isProfitPositive ? "text-emerald-400" : "text-amber-400"
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
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            3. Brüt Kârlılık Marjı
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tahmini Marj:</span>
              <span className="font-bold text-slate-200">%{estimatedMargin.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Gerçekleşen:</span>
              <span className="font-black text-emerald-400">
                {actualMargin !== null ? `%${actualMargin.toFixed(1)}` : "—"}
              </span>
            </div>
          </div>

          {actualMargin !== null && (
            <div
              className={`mt-3 pt-2.5 border-t border-white/6 flex items-center justify-between text-xs font-black ${
                marginDiff >= 0 ? "text-emerald-400" : "text-amber-400"
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
