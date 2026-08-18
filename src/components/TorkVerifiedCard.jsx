"use client";

import React, { useState } from "react";

/**
 * TORK VERIFIED — Bağımsız Hesap Denetim Kartı
 * 
 * Hürmüz hesaplama çıktısının bağımsız matematiksel denetimini ve
 * 12 kontrol adımının sonucunu şeffafça gösterir.
 */
export default function TorkVerifiedCard({ auditResult = null, compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!auditResult) {
    return null;
  }

  const {
    verified = false,
    status = "PASS",
    score = 100,
    checks = [],
    warnings = [],
    errors = [],
    summary = "Hesaplama denetlendi.",
  } = auditResult;

  const isPass = status === "PASS";
  const isWarning = status === "WARNING";
  const isFail = status === "FAIL";

  const statusConfig = isPass
    ? {
        label: "HESAP TUTARLI",
        textColor: "text-[#00E5A0]",
        bgColor: "bg-[#00E5A0]/10",
        borderColor: "border-[#00E5A0]/30",
        badgeIcon: "✓",
      }
    : isWarning
    ? {
        label: "DENETİMDE UYARI",
        textColor: "text-[#F5B94C]",
        bgColor: "bg-[#F5B94C]/10",
        borderColor: "border-[#F5B94C]/30",
        badgeIcon: "⚠",
      }
    : isFail
    ? {
        label: "HESAP HATASI",
        textColor: "text-[#FF5C5C]",
        bgColor: "bg-[#FF5C5C]/10",
        borderColor: "border-[#FF5C5C]/30",
        badgeIcon: "✕",
      }
    : {
        label: "EKSİK VERİ",
        textColor: "text-[#8C98A8]",
        bgColor: "bg-[#8C98A8]/10",
        borderColor: "border-[#8C98A8]/30",
        badgeIcon: "○",
      };

  // Kompakt Mod (Smart Bidding & Transport Listesi İçin)
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-mono ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        <span className={`font-bold ${statusConfig.textColor}`}>{statusConfig.badgeIcon}</span>
        <span className="text-[#F5F7FA] font-medium">TORK VERIFIED:</span>
        <span className={statusConfig.textColor}>{statusConfig.label}</span>
        <span className="text-[#8C98A8] text-[10px]">({score}/100)</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0B111A] border border-[#101923] rounded-xl p-4 sm:p-5 shadow-lg transition-all duration-200 hover:border-[#8C98A8]/30">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider text-[#F5F7FA] uppercase">
                TORK VERIFIED
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-[#8C98A8]">
                BAĞIMSIZ DENETÇİ
              </span>
            </div>
            <p className="text-[11px] text-[#8C98A8]">Hürmüz matematiksel maliyet denetimi</p>
          </div>
        </div>

        {/* Status & Score Pill */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-full border text-xs font-mono font-medium flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.textColor}`}>
            <span>{statusConfig.badgeIcon}</span>
            <span>{statusConfig.label}</span>
          </div>
          <div className="px-2.5 py-1 rounded-full border border-[#101923] bg-[#060B11] text-xs font-mono text-[#F5F7FA]">
            Skor: <span className={score === 100 ? "text-[#00E5A0] font-bold" : "text-[#F5B94C] font-bold"}>{score}</span>/100
          </div>
        </div>
      </div>

      {/* Summary Note */}
      <div className="text-xs text-[#8C98A8] mb-3.5 bg-[#060B11]/60 p-2.5 rounded-lg border border-[#101923] leading-relaxed">
        {summary}
      </div>

      {/* Primary Checks Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {[
          { label: "Yakıt", id: "CHECK_06_FUEL_COST" },
          { label: "Sürücü", id: "CHECK_01_DIRECT_COST_SUM" },
          { label: "Bakım", id: "CHECK_01_DIRECT_COST_SUM" },
          { label: "Amortisman", id: "CHECK_01_DIRECT_COST_SUM" },
          { label: "Genel Gider", id: "CHECK_02_TOTAL_OPERATING_COST" },
          { label: "Marj / Fiyat", id: "CHECK_03_RECOMMENDED_PRICE" },
        ].map((item, idx) => {
          const matchingCheck = checks.find((c) => c.id === item.id);
          const itemPass = matchingCheck ? matchingCheck.status === "PASS" : true;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-[11px] font-mono ${
                itemPass ? "bg-[#00E5A0]/5 border-[#00E5A0]/20 text-[#00E5A0]" : "bg-[#FF5C5C]/5 border-[#FF5C5C]/20 text-[#FF5C5C]"
              }`}
            >
              <span>{item.label}</span>
              <span className="font-bold">{itemPass ? "✓" : "✕"}</span>
            </div>
          );
        })}
      </div>

      {/* Warnings & Errors List (If Any) */}
      {(warnings.length > 0 || errors.length > 0) && (
        <div className="mb-3 space-y-1.5">
          {errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-[#FF5C5C]/10 border border-[#FF5C5C]/30 text-xs text-[#FF5C5C]">
              <span className="font-bold">✕</span>
              <span>{err}</span>
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded bg-[#F5B94C]/10 border border-[#F5B94C]/30 text-xs text-[#F5B94C]">
              <span className="font-bold">⚠</span>
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Accordion Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-mono text-[#8C98A8] hover:text-[#F5F7FA] bg-[#101923]/50 hover:bg-[#101923] rounded-lg transition-colors border border-transparent hover:border-[#8C98A8]/20"
      >
        <span>{expanded ? "Denetim Ayrıntılarını Gizle" : `12 Nokta Denetim Ayrıntılarını İncele (${checks.length} Kontrol)`}</span>
        <svg
          className={`w-3.5 h-3.5 transform transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded 12 Checks List */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#101923] space-y-2">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-[#060B11] border border-[#101923] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 font-bold text-xs ${
                    check.status === "PASS"
                      ? "text-[#00E5A0]"
                      : check.status === "WARNING"
                      ? "text-[#F5B94C]"
                      : "text-[#FF5C5C]"
                  }`}
                >
                  {check.status === "PASS" ? "✓" : check.status === "WARNING" ? "⚠" : "✕"}
                </span>
                <div>
                  <div className="font-medium text-[#F5F7FA] font-mono">{check.name}</div>
                  <div className="text-[11px] text-[#8C98A8]">{check.detail}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px] text-right pl-6 sm:pl-0">
                {check.expected !== undefined && check.received !== undefined && (
                  <div>
                    <span className="text-[#8C98A8]">Beklenen: </span>
                    <span className="text-[#F5F7FA]">
                      {typeof check.expected === "number" ? `₺${check.expected.toLocaleString("tr-TR")}` : check.expected}
                    </span>
                  </div>
                )}
                {check.delta !== undefined && check.delta > 0 && (
                  <span className="text-[#F5B94C] text-[10px]">Δ ₺{Number(check.delta.toFixed(2))}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
