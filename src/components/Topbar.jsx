export default function Topbar({ title, subtitle, userDashboard }) {
  const displayTitle = title || "Operasyon Merkezi";

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-5 md:flex-row md:items-center md:justify-between select-none">
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
        <button
          type="button"
          aria-label="Bildirimler"
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
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#00E5A0]" />
        </button>

        {/* Compact Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00E5A0]/30 bg-[#00E5A0]/10 text-xs font-black text-[#00E5A0] shadow-[0_0_10px_rgba(0,229,160,0.15)]">
          {(userDashboard?.company_name || userDashboard?.full_name || "T")
            .slice(0, 1)
            .toUpperCase()}
        </div>
      </div>
    </header>
  );
}