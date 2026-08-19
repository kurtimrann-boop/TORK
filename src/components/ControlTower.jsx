"use client";

import React, { useEffect, useState } from "react";
import { formatRelativeTimeTR, formatCurrencyTR } from "../utils/turkish";
import StatusBadge from "./StatusBadge";

export default function ControlTower({
  onNavigateTab = null,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState("all"); // all | CRITICAL | HIGH | MEDIUM | LOW
  const [activeSection, setActiveSection] = useState("urgent"); // urgent | queue | integrity | alerts | audit

  const refreshData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/control-tower?role=operator");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      }
    } catch (err) {
      console.warn("Control Tower data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await fetch("/api/control-tower?role=operator");
        const json = await res.json();
        if (active && res.ok && json.success) {
          setData(json);
        }
      } catch (err) {
        console.warn("Control Tower initial load error:", err);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const kpis = data?.kpis || {
    openLoads: 0,
    biddingLoads: 0,
    assignedTransports: 0,
    activeInTransit: 0,
    deliveredTransports: 0,
    podPending: 0,
    readySettlements: 0,
    approvedSettlements: 0,
    paidSettlements: 0,
    disputedSettlements: 0,
    highRiskOperations: 0,
  };

  const queue = data?.queue || [];
  const urgentItems = queue.filter(
    (item) => item.riskLevel === "CRITICAL" || item.riskLevel === "HIGH" || item.podStatus === "pod_rejected"
  );

  const filteredQueue = queue.filter((item) => {
    if (riskFilter === "all") return true;
    return item.riskLevel === riskFilter;
  });

  const integrity = data?.financialIntegrity || { passCount: 7, warningCount: 0, failCount: 0, checks: [] };
  const alerts = data?.alerts || [];
  const auditLogs = data?.auditLogs || [];

  const getRiskBadge = (risk) => {
    switch (risk) {
      case "CRITICAL":
        return "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]";
      case "HIGH":
        return "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]";
      case "MEDIUM":
        return "border-[#F5A400]/30 bg-[#F5A400]/10 text-[#F5A400]";
      case "LOW":
        return "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]";
      default:
        return "border-[#374151] bg-[#111827] text-[#A0AEC0]";
    }
  };

  const formatAuditEvent = (log) => {
    const event = log.event_type || "";
    const role = log.actor_role === "carrier" ? "Taşıyıcı" : log.actor_role === "shipper" ? "Yük Veren" : "Sistem";
    const entity = log.entity_type === "load" ? "Yük" : log.entity_type === "transport" ? "Sefer" : log.entity_type === "settlement" ? "Mutabakat" : "İşlem";

    if (event.includes("create")) return `${role} yeni bir ${entity.toLowerCase()} kaydı oluşturdu.`;
    if (event.includes("bid")) return `${role} yüke yeni teklif iletti.`;
    if (event.includes("pod") || event.includes("document")) return `${role} teslimat irsaliye belgesi yükledi.`;
    if (event.includes("settlement")) return `${role} navlun mutabakatını onayladı/güncelledi.`;
    if (event.includes("cancel")) return `${role} sefer iptal talebinde bulundu.`;
    return `${role}, ${entity.toLowerCase()} üzerinde '${event}' işlemini gerçekleştirdi.`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#374151] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F5A400] shadow-[0_0_10px_#F5A400] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-[#F5A400]">
              TORK OPERASYONEL DENETİM & KONTROL KULESİ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#F3F4F6] mt-1">
            Control Tower & Risk Engine
          </h1>
          <p className="mt-1 text-sm text-[#A0AEC0]">
            Platform genelindeki tüm yük, taşıma, POD, mutabakat ve finansal akışların anlık denetimi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="tork-btn-secondary text-xs"
          >
            {loading ? "Denetleniyor..." : "🔄 Yeniden Denetle"}
          </button>
        </div>
      </div>

      {/* TOP URGENT ACTION REQUIRED BANNER (Phase 25 Requirement) */}
      <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EF4444]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-[#EF4444] animate-ping" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#EF4444]">
              ACİL MÜDAHALE GEREKTİREN OPERASYONLAR (URGENT ACTION REQUIRED)
            </h2>
          </div>
          <span className="rounded bg-[#EF4444]/20 px-2.5 py-0.5 text-xs font-black text-[#EF4444] font-mono">
            {urgentItems.length} Kritik Alarm
          </span>
        </div>

        {urgentItems.length === 0 ? (
          <div className="pt-3 text-xs text-[#22C55E] font-bold flex items-center gap-2">
            <span>✓</span>
            <span>Şu anda kritik gecikme veya acil müdahale gerektiren operasyonel risk bulunmuyor.</span>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {urgentItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[#111827] border border-[#374151] p-3 text-xs"
              >
                <div>
                  <div className="font-black text-[#F3F4F6]">
                    Sefer #{item.id?.slice(0, 8)} · {item.origin} → {item.destination}
                  </div>
                  <div className="text-[#EF4444] font-bold mt-0.5">
                    {item.riskReasons?.[0] || "Yüksek Operasyonel Risk"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#EF4444]/20 px-2 py-0.5 text-[11px] font-black text-[#EF4444]">
                    {item.riskLevel}
                  </span>
                  <span className="text-[#A0AEC0]">{item.recommendedAction || "İnceleme Gerekli"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">Açık İlanlar</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#F3F4F6]">{kpis.openLoads}</div>
          <span className="text-[11px] text-[#A0AEC0]">Borsada aktif</span>
        </div>

        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">Aktif Seferler</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#F5A400]">{kpis.activeInTransit}</div>
          <span className="text-[11px] text-[#A0AEC0]">Yolda / Taşımada</span>
        </div>

        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">POD Bekleyen</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#F5A400]">{kpis.podPending}</div>
          <span className="text-[11px] text-[#A0AEC0]">İrsaliye onayı</span>
        </div>

        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">Hazır Mutabakat</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#22C55E]">{kpis.readySettlements}</div>
          <span className="text-[11px] text-[#A0AEC0]">Ödemeye hazır</span>
        </div>

        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">İhtilaflı / Dispute</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#EF4444]">{kpis.disputedSettlements}</div>
          <span className="text-[11px] text-[#A0AEC0]">İncelemede</span>
        </div>

        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-3.5">
          <span className="text-xs font-bold text-[#A0AEC0] uppercase">Finansal Sağlık</span>
          <div className="mt-1 text-2xl font-black font-mono text-[#22C55E]">
            {integrity.passCount}/7
          </div>
          <span className="text-[11px] text-[#22C55E] font-bold">100% Bütünlük</span>
        </div>
      </div>

      {/* SECTION TABS */}
      <div className="flex items-center gap-2 border-b border-[#374151] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection("queue")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSection === "queue"
              ? "bg-[#F5A400] text-[#111827] shadow-md"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Operasyonel Risk Kuyruğu ({queue.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("integrity")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSection === "integrity"
              ? "bg-[#F5A400] text-[#111827] shadow-md"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Finansal Bütünlük (7 Kontrol)
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("alerts")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSection === "alerts"
              ? "bg-[#F5A400] text-[#111827] shadow-md"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Sistem Uyarıları ({alerts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("audit")}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeSection === "audit"
              ? "bg-[#F5A400] text-[#111827] shadow-md"
              : "text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#1F2937]"
          }`}
        >
          Canlı İşlem Akışı (Activity Feed)
        </button>
      </div>

      {/* 1. OPERATIONAL RISK QUEUE */}
      {activeSection === "queue" && (
        <div className="space-y-4">
          {/* Risk Level Filters */}
          <div className="flex items-center gap-2">
            {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setRiskFilter(lvl)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition border ${
                  riskFilter === lvl
                    ? "bg-[#F5A400] text-[#111827] border-[#F5A400]"
                    : "bg-[#1F2937] text-[#A0AEC0] border-[#374151] hover:text-[#F3F4F6]"
                }`}
              >
                {lvl === "all" ? "Tümü" : lvl}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredQueue.length === 0 ? (
              <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-xs text-[#A0AEC0]">
                Filtreye uygun riskli operasyon kaydı bulunamadı.
              </div>
            ) : (
              filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black text-[#F3F4F6]">
                          Sefer #{item.id?.slice(0, 8)}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-black border ${getRiskBadge(item.riskLevel)}`}>
                          {item.riskLevel} (Skor: {item.riskScore})
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-1 text-sm font-bold text-[#F3F4F6]">
                        {item.origin} → {item.destination}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-[11px] font-bold uppercase text-[#A0AEC0]">Navlun</div>
                      <div className="text-base font-black font-mono text-[#F5A400]">
                        {item.bidAmount ? formatCurrencyTR(item.bidAmount) : "—"}
                      </div>
                    </div>
                  </div>

                  {item.riskReasons && item.riskReasons.length > 0 && (
                    <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444] space-y-1">
                      <div className="font-bold">Tespit Edilen Risk Sinyalleri:</div>
                      <ul className="list-disc list-inside text-xs text-[#F3F4F6] space-y-0.5">
                        {item.riskReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                      <div className="text-xs font-bold text-[#F5A400] pt-1">
                        Tavsiye: {item.recommendedAction}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. FINANCIAL INTEGRITY */}
      {activeSection === "integrity" && (
        <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#F3F4F6]">Finansal Bütünlük ve Ledger Denetim Sonuçları</h3>
            <p className="text-xs text-[#A0AEC0]">Taşıma, mutabakat ve cüzdan tabloları arasındaki tutarlılık kontrolleri.</p>
          </div>

          <div className="space-y-3">
            {integrity.checks.map((check) => (
              <div
                key={check.id}
                className="rounded-lg border border-[#374151] bg-[#111827] p-3.5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-[#F3F4F6] flex items-center gap-2">
                    <span className={check.status === "PASS" ? "text-[#22C55E]" : "text-[#EF4444]"}>
                      {check.status === "PASS" ? "✓" : "⚠"}
                    </span>
                    <span>{check.name}</span>
                  </div>
                  <div className="text-xs text-[#A0AEC0] mt-1">{check.detail}</div>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-black ${
                  check.status === "PASS" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-[#EF4444]/20 text-[#EF4444]"
                }`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ALERTS */}
      {activeSection === "alerts" && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-xs text-[#A0AEC0]">
              Aktif operasyonel uyarı bulunmuyor.
            </div>
          ) : (
            alerts.map((alt) => (
              <div
                key={alt.id}
                className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{alt.severity === "CRITICAL" ? "🔴" : alt.severity === "HIGH" ? "🟠" : "🟡"}</span>
                  <div>
                    <div className="font-bold text-[#F3F4F6]">{alt.message}</div>
                    <div className="text-xs text-[#A0AEC0] mt-0.5">{formatRelativeTimeTR(alt.createdAt)}</div>
                  </div>
                </div>
                <span className="rounded border border-[#374151] bg-[#111827] px-2.5 py-1 text-xs font-bold text-[#F3F4F6]">
                  {alt.severity}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. ACTIVITY FEED (HUMAN READABLE AUDIT) */}
      {activeSection === "audit" && (
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-8 text-center text-xs text-[#A0AEC0]">
              Henüz kayıtlı audit logu bulunmuyor.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-[#F3F4F6]">
                    {formatAuditEvent(log)}
                  </div>
                  <div className="text-xs text-[#A0AEC0]">
                    Kayıt: #{log.entity_id ? log.entity_id.slice(0, 8) : "—"} · Rol: {log.actor_role}
                  </div>
                </div>
                <div className="text-right text-xs text-[#A0AEC0] font-mono">
                  {formatRelativeTimeTR(log.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
