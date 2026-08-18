"use client";

import React, { useState } from "react";

/**
 * TORK INTELLIGENCE — Gemini Destekli Operasyon Analiz Kartı
 * 
 * Hürmüz hesaplaması ve Tork Verified denetimi üzerine kurulan
 * yapay zeka yorumlama, açıklama ve risk analiz katmanı.
 */
export default function TorkIntelligenceCard({
  context = {},
  inputParams = {},
  calculatedPricing = null,
  bidParams = null,
  audience = "shipper",
  mode = "audit",
}) {
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          audience,
          context,
          inputParams,
          calculatedPricing,
          bidParams,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analiz servisi yanıt vermedi (${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.ai) {
        setAiResult(data.ai);
      } else {
        throw new Error(data.error || "Analiz üretilemedi.");
      }
    } catch (err) {
      console.error("[TorkIntelligenceCard] Hata:", err.message);
      setError("TORK Intelligence servisine şu anda ulaşılamıyor.");
    } finally {
      setLoading(false);
    }
  };

  const getAssessmentBadge = (assessment) => {
    switch (assessment) {
      case "HEALTHY":
        return {
          label: "SAĞLIKLI OPERASYON",
          textColor: "text-[#00E5A0]",
          bgColor: "bg-[#00E5A0]/10",
          borderColor: "border-[#00E5A0]/30",
        };
      case "CAUTION":
        return {
          label: "DİKKAT GEREKTİREN KALEMLER",
          textColor: "text-[#F5B94C]",
          bgColor: "bg-[#F5B94C]/10",
          borderColor: "border-[#F5B94C]/30",
        };
      case "RISK":
        return {
          label: "YÜKSEK RİSK FAKTÖRÜ",
          textColor: "text-[#FF5C5C]",
          bgColor: "bg-[#FF5C5C]/10",
          borderColor: "border-[#FF5C5C]/30",
        };
      default:
        return {
          label: "ANALİZ TAMAMLANDI",
          textColor: "text-[#00E5A0]",
          bgColor: "bg-[#00E5A0]/10",
          borderColor: "border-[#00E5A0]/30",
        };
    }
  };

  return (
    <div className="w-full bg-[#0B111A] border border-[#101923] rounded-xl p-4 sm:p-5 shadow-lg transition-all duration-200 hover:border-[#8C98A8]/30">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-[#00E5A0]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider text-[#F5F7FA] uppercase">
                TORK INTELLIGENCE
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#00E5A0]/10 text-[#00E5A0] border border-[#00E5A0]/20">
                GEMINI 2.5
              </span>
            </div>
            <p className="text-[11px] text-[#8C98A8]">Operasyonel yorumlama & risk analizi</p>
          </div>
        </div>

        {/* CTA Button / Refresh */}
        <div>
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 bg-[#101923] hover:bg-[#101923]/80 border border-[#8C98A8]/20 text-[#F5F7FA] hover:text-[#00E5A0] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-[#00E5A0]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analiz Ediliyor...</span>
              </>
            ) : aiResult ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Yeniden Analiz Et</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-[#00E5A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Yükü Analiz Et</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-xs text-[#FF5C5C] mb-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnalysis} className="underline font-mono text-[11px]">Tekrar Dene</button>
        </div>
      )}

      {/* Empty State / Trigger Prompt */}
      {!aiResult && !loading && !error && (
        <div className="p-4 rounded-lg bg-[#060B11]/50 border border-[#101923] text-center">
          <p className="text-xs text-[#8C98A8] mb-2 leading-relaxed">
            Hürmüz hesaplamasının maliyet gerekçesini, en büyük gider kalemlerini ve operasyonel risk faktörlerini yapay zeka ile anında değerlendirin.
          </p>
          <button
            onClick={fetchAnalysis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00E5A0]/10 hover:bg-[#00E5A0]/20 border border-[#00E5A0]/30 text-xs font-mono text-[#00E5A0] transition-colors"
          >
            <span>Operasyon Analizini Başlat</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* AI Result View */}
      {aiResult && (
        <div className="space-y-3.5">
          {/* Assessment & Offline Notice */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {(() => {
              const badge = getAssessmentBadge(aiResult.assessment);
              return (
                <div className={`px-2.5 py-1 rounded-full border text-xs font-mono font-medium ${badge.bgColor} ${badge.borderColor} ${badge.textColor}`}>
                  {badge.label}
                </div>
              );
            })()}

            {aiResult.offlineNotice && (
              <span className="text-[10px] text-[#8C98A8] font-mono italic">
                {aiResult.offlineNotice}
              </span>
            )}
          </div>

          {/* 1. Summary Section */}
          <div className="p-3 rounded-lg bg-[#060B11] border border-[#101923]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C98A8] mb-1">
              OPERASYON ÖZETİ
            </div>
            <p className="text-xs text-[#F5F7FA] leading-relaxed">
              {aiResult.summary}
            </p>
          </div>

          {/* 2. Key Findings / Cost Breakdown */}
          {aiResult.findings && aiResult.findings.length > 0 && (
            <div className="p-3 rounded-lg bg-[#060B11] border border-[#101923]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C98A8] mb-2">
                FİYATLANDIRMA GEREKÇESİ & TESPİTLER
              </div>
              <div className="space-y-2">
                {aiResult.findings.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span
                      className={`font-bold mt-0.5 ${
                        item.type === "WARNING"
                          ? "text-[#F5B94C]"
                          : item.type === "OPPORTUNITY"
                          ? "text-[#00E5A0]"
                          : "text-[#8C98A8]"
                      }`}
                    >
                      •
                    </span>
                    <div>
                      <span className="font-medium text-[#F5F7FA] font-mono mr-1.5">{item.title}:</span>
                      <span className="text-[#8C98A8] leading-relaxed">{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Actionable Recommendations */}
          {aiResult.recommendations && aiResult.recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-[#060B11] border border-[#101923]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8C98A8] mb-2">
                ÖNERİLEN AKSİYONLAR
              </div>
              <ul className="space-y-1.5 text-xs text-[#8C98A8]">
                {aiResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#00E5A0] font-bold">→</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta Tag */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8C98A8]/60 pt-1 border-t border-[#101923]">
            <span>Model: {aiResult.provider}</span>
            <span>Güvenilirlik: {aiResult.confidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}
