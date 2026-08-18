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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  // Close on outside click
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

    if (drawerOpen || avatarMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen, avatarMenuOpen]);

  const activeSignals = signals.filter(
    (s) => s.severity === "CRITICAL" || s.severity === "HIGH" || s.severity === "MEDIUM" || s.level === "WARNING"
  );
  const displayCount = unreadCount || activeSignals.length;

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return { dot: "bg-[#FF5C5C]", text: "text-[#FF5C5C]", border: "border-[#FF5C5C]/30", bg: "bg-[#FF5C5C]/10" };
      case "HIGH":
        return { dot: "bg-[#F5B94C]", text: "text-[#F5B94C]", border: "border-[#F5B94C]/30", bg: "bg-[#F5B94C]/10" };
      case "MEDIUM":
        return { dot: "bg-[#F5B94C]", text: "text-[#F5B94C]", border: "border-[#F5B94C]/20", bg: "bg-[#F5B94C]/5" };
      case "LOW":
        return { dot: "bg-[#00E5A0]", text: "text-[#00E5A0]", border: "border-[#00E5A0]/20", bg: "bg-[#00E5A0]/5" };
      default:
        return { dot: "bg-[#8C98A8]", text: "text-[#8C98A8]", border: "border-[#8C98A8]/20", bg: "bg-[#8C98A8]/5" };
    }
  };

  return (
    <header className="relative mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-center md:justify-between select-none">
      <div>
        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8C98A8]">
          <span>TORK</span>
          <span className="text-white/20">/</span>
          <span className="text-[#00E5A0]">{displayTitle}</span>
        </div>

        {/* Crisp H1 */}
        <h1 className="mt-1 text-2xl sm:text-3xl lg:text-[32px] font-black tracking-[-0.04em] text-[#F5F7FA]">
          {displayTitle}
        </h1>

        {/* Subtitle / System State */}
        <p className="mt-0.5 text-xs sm:text-sm text-[#8C98A8]">
          {subtitle || `${userDashboard?.company_name || "Tork Filosu"} · Aktif Lojistik Ağı`}
        </p>
      </div>

      {/* Right Controls: Live Status + Notifications + Avatar */}
      <div className="flex items-center gap-3 self-start md:self-auto">
        {/* Live Network Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00E5A0]/25 bg-[#00E5A0]/[0.08] px-3 py-1.5 text-[11px] font-bold text-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00E5A0] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00E5A0]" />
          </span>
          <span>CANLI KONTROL</span>
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
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-[#101923] text-[#8C98A8] transition hover:border-white/20 hover:text-[#F5F7FA]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {displayCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F5B94C] px-1 text-[9px] font-mono font-black text-[#060B11]">
                {displayCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#00E5A0]" />
            )}
          </button>

          {/* Interactive Notification Drawer / Popover */}
          {drawerOpen && (
            <div
              className="absolute right-0 top-11 z-50 w-[340px] sm:w-[380px] rounded-2xl border border-white/[0.08] bg-[#0B111A] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F7FA]">
                    OPERASYON SİNYALLERİ
                  </span>
                  {displayCount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#F5B94C]/10 border border-[#F5B94C]/30 text-[#F5B94C]">
                      {displayCount} Aktif
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-xs text-[#8C98A8] hover:text-[#F5F7FA] font-mono"
                >
                  ✕ Kapat
                </button>
              </div>

              {/* Signals List */}
              <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {signals.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8C98A8]">
                    Şu anda bekleyen aktif operasyon sinyali bulunmuyor.
                  </div>
                ) : (
                  signals.map((sig, idx) => {
                    const sev = getSeverityBadge(sig.severity);
                    return (
                      <div
                        key={sig.id || idx}
                        className="rounded-xl border border-white/[0.04] bg-[#101923] p-3 transition hover:border-white/[0.1] space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                            <span className={`text-[9px] font-mono font-bold uppercase ${sev.text}`}>
                              {sig.category} · {sig.eyebrow}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-[#8C98A8]/60">Anlık</span>
                        </div>

                        <div className="text-xs font-bold text-[#F5F7FA] leading-tight">
                          {sig.headline}
                        </div>

                        {sig.relatedLoad && (
                          <div className="text-[11px] font-mono text-[#00E5A0]">
                            {sig.relatedLoad.origin} → {sig.relatedLoad.destination}
                          </div>
                        )}

                        <div className="text-[11px] text-[#8C98A8] leading-relaxed">
                          {sig.detail}
                        </div>

                        {onNavigate && sig.actionTarget && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate(sig.actionTarget);
                              setDrawerOpen(false);
                            }}
                            className="mt-1 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-[#F5F7FA] hover:text-[#00E5A0] transition flex items-center justify-center gap-1.5"
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

        {/* Interactive Avatar Button & Dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => {
              setAvatarMenuOpen(!avatarMenuOpen);
              setDrawerOpen(false);
            }}
            aria-label="Profil ve Hesap Menüsü"
            aria-expanded={avatarMenuOpen}
            aria-haspopup="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/10 text-xs font-black text-[#00E5A0] shadow-[0_0_10px_rgba(0,229,160,0.15)] transition hover:border-[#00E5A0] hover:scale-105 active:scale-95"
          >
            {(userDashboard?.company_name || userDashboard?.full_name || "T")
              .slice(0, 1)
              .toUpperCase()}
          </button>

          {/* Profile Dropdown Menu */}
          {avatarMenuOpen && (
            <div
              className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-white/[0.08] bg-[#0B111A] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-fadeIn"
            >
              {/* User Header */}
              <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                <div className="text-xs font-bold text-[#F5F7FA] truncate">
                  {userDashboard?.company_name || userDashboard?.full_name || "Tork Kullanıcısı"}
                </div>
                <div className="text-[10px] font-mono text-[#8C98A8] mt-0.5">
                  {getRoleTR(userDashboard?.role)}
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#8C98A8] hover:text-[#F5F7FA] hover:bg-white/[0.04] transition text-left"
                    >
                      <svg className="w-3.5 h-3.5 text-[#00E5A0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profilim</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("settings");
                        setAvatarMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#8C98A8] hover:text-[#F5F7FA] hover:bg-white/[0.04] transition text-left"
                    >
                      <svg className="w-3.5 h-3.5 text-[#8C98A8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Ayarlar</span>
                    </button>
                  </>
                )}

                {onLogout && (
                  <div className="pt-1 border-t border-white/[0.06] mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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