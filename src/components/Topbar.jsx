export default function Topbar({ title, subtitle, userDashboard }) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#667085]">
          Tork Operasyonları
        </div>

        <h1 className="text-2xl font-black tracking-[-0.04em] text-[#F5F7FA] sm:text-3xl">
          {title}
        </h1>

        <p className="mt-1 text-sm text-[#9AA7B5]">
          {userDashboard?.company_name || "Tork kullanıcısı"} · canlı operasyon merkezi
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#00E5A0]/20 bg-[#00E5A0]/8 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00E5A0]">
          <span className="h-2 w-2 rounded-full bg-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.9)]" />
          Ağ Canlı
        </span>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-[#101722] text-sm font-black text-[#00E5A0]">
          {(userDashboard?.company_name || "T").slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}