"use client";

import React, { useState, useRef, useEffect } from "react";
import { getRoleTR } from "../utils/turkish";

export default function Topbar({
  title,
  subtitle,
  userDashboard,
  signals = [],
  unreadCount = 0,
  onNavigate = null,
  onLogout = null,
}) {
  const displayTitle = title || "Operasyon Merkezi";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isUserMenuOpen, setAvatarMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDrawerOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setAvatarMenuOpen(false);
      }
    }

    if (drawerOpen || isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, isUserMenuOpen]);

  const activeSignals = signals.filter(
    (s) => s.severity === "CRITICAL" || s.severity === "HIGH" || s.severity === "MEDIUM" || s.level === "WARNING"
  );
  const displayCount = unreadCount || activeSignals.length;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return { dot: "bg-[#EF4444]", text: "text-[#EF4444]", border: "border-[#EF4444]/30", bg: "bg-[#EF4444]/10" };
      case "HIGH":
      case "MEDIUM":
        return { dot: "bg-[#F5A400]", text: "text-[#F5A400]", border: "border-[#F5A400]/30", bg: "bg-[#F5A400]/10" };
      case "LOW":
        return { dot: "bg-[#22C55E]", text: "text-[#22C55E]", border: "border-[#22C55E]/30", bg: "bg-[#22C55E]/10" };
      default:
        return { dot: "bg-[#A0AEC0]", text: "text-[#A0AEC0]", border: "border-[#374151]", bg: "bg-[#1F2937]" };
    }
  };

  const isCarrier = userDashboard?.role === "carrier";
  const roleDisplay = getRoleTR(userDashboard?.role);

  return (
    <header className="relative mb-6 flex flex-col gap-4 border-b border-[#374151] pb-5 md:flex-row md:items-center md:justify-between select-none">
      <div>
        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#A0AEC0]">
          <span>TORK</span>
          <span className="text-[#6B7280]">/</span>
          <span className="text-[#F5A400]">{displayTitle}</span>
        </div>

        {/* Crisp H1 */}
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-[-0.03em] text-[#F3F4F6]">
          {displayTitle}
        </h1>

        {/* Subtitle / System State */}
        <p className="mt-0.5 text-sm text-[#A0AEC0]">
          {subtitle || `${userDashboard?.company_name || userDashboard?.full_name || "Tork Lojistik Ağı"} · ${isCarrier ? "Sefer Merkezi" : "Operasyon Merkezi"}`}
        </p>
      </div>

      {/* Right Controls: Live Status + Notifications + User Menu */}
      <div className="flex items-center gap-3 self-start md:self-auto">
        {/* Live Network Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#F5A400]/30 bg-[#F5A400]/10 px-3 py-1.5 text-xs font-bold text-[#F5A400]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5A400] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F5A400]" />
          </span>
          <span>CANLI SİSTEM</span>
        </div>

        {/* Notifications Icon Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(!drawerOpen);
              setAvatarMenuOpen(false);
            }}
            aria-label="Operasyon Sinyalleri Bildirimleri"
            aria-expanded={drawerOpen}
            aria-haspopup="true"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#374151] bg-[#1F2937] text-[#A0AEC0] transition hover:border-[#F5A400]/40 hover:text-[#F3F4F6]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {displayCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5A400] px-1 text-[11px] font-mono font-black text-[#111827]">
                {displayCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#22C55E]" />
            )}
          </button>

          {/* Interactive Notification Popover */}
          {drawerOpen && (
            <div className="absolute right-0 top-12 z-50 w-[340px] sm:w-[380px] rounded-xl border border-[#374151] bg-[#1F2937] p-4 shadow-2xl backdrop-blur-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#374151] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F3F4F6]">
                    OPERASYON SİNYALLERİ
                  </span>
                  {displayCount > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#F5A400]/10 border border-[#F5A400]/30 text-[#F5A400]">
                      {displayCount} Aktif
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-xs text-[#A0AEC0] hover:text-[#F3F4F6]"
                >
                  ✕ Kapat
                </button>
              </div>

              {/* Signals List */}
              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                {signals.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#A0AEC0]">
                    Şu anda bekleyen aktif operasyon sinyali bulunmuyor.
                  </div>
                ) : (
                  signals.map((sig, idx) => {
                    const sev = getSeverityBadge(sig.severity);
                    return (
                      <div
                        key={sig.id || idx}
                        className="rounded-lg border border-[#374151] bg-[#111827] p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                            <span className={`text-[11px] font-mono font-bold uppercase ${sev.text}`}>
                              {sig.category} · {sig.eyebrow}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#6B7280]">Anlık</span>
                        </div>

                        <div className="text-xs font-bold text-[#F3F4F6] leading-tight">
                          {sig.headline}
                        </div>

                        {sig.relatedLoad && (
                          <div className="text-xs font-mono text-[#F5A400]">
                            {sig.relatedLoad.origin} → {sig.relatedLoad.destination}
                          </div>
                        )}

                        <div className="text-xs text-[#A0AEC0] leading-relaxed">
                          {sig.detail}
                        </div>

                        {onNavigate && sig.actionTarget && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(sig.actionTarget);
                              setDrawerOpen(false);
                            }}
                            className="mt-1 w-full py-1.5 rounded bg-[#1F2937] hover:bg-[#283548] border border-[#374151] text-xs font-bold text-[#F3F4F6] hover:text-[#F5A400] transition flex items-center justify-center gap-1.5"
                          >
                            <span>{sig.actionLabel || "DETAYI GÖR"}</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top Right User Profile Menu (Phase 7 Requirement) */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => {
              setAvatarMenuOpen(!isUserMenuOpen);
              setDrawerOpen(false);
            }}
            aria-label="Profil ve Hesap Menüsü"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            className="flex items-center gap-2.5 rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-1.5 text-xs text-[#F3F4F6] transition hover:border-[#F5A400]/50 hover:bg-[#283548]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F5A400] text-xs font-black text-[#111827]">
              {(userDashboard?.company_name || userDashboard?.full_name || "T")
                .slice(0, 1)
                .toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-[#F3F4F6] max-w-[120px] truncate">
                {userDashboard?.company_name || userDashboard?.full_name || "Tork Kullanıcısı"}
              </div>
              <div className="text-[11px] text-[#A0AEC0]">
                {roleDisplay}
              </div>
            </div>
            <svg
              className={`h-4 w-4 text-[#A0AEC0] transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-[#374151] bg-[#1F2937] p-2 shadow-2xl backdrop-blur-2xl animate-fadeIn">
              {/* User Header */}
              <div className="px-3 py-2.5 border-b border-[#374151] mb-1">
                <div className="text-xs font-bold text-[#F3F4F6] truncate">
                  {userDashboard?.company_name || userDashboard?.full_name || "Tork Kullanıcısı"}
                </div>
                <div className="text-[11px] text-[#A0AEC0] mt-0.5">
                  {userDashboard?.email || "Hesap Aktif"}
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#F5A400]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#F5A400] border border-[#F5A400]/30">
                  {roleDisplay}
                </div>
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5">
                {onNavigate && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("profile");
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#283548] transition text-left"
                    >
                      <svg className="w-4 h-4 text-[#F5A400]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profilim</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("profile");
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#A0AEC0] hover:text-[#F3F4F6] hover:bg-[#283548] transition text-left"
                    >
                      <svg className="w-4 h-4 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Hesap Ayarları</span>
                    </button>
                  </>
                )}

                {/* Logout Button in Dropdown */}
                {onLogout && (
                  <div className="pt-1 border-t border-[#374151] mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/10 transition text-left"
                    >
                      <svg className="w-4 h-4 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}