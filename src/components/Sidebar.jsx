import { getRoleTR } from "../utils/turkish";

export default function Sidebar({ tabs, activeTab, userDashboard, onTabChange, onLogout }) {
  return (
    <aside className="hidden w-[270px] shrink-0 border-r border-white/8 bg-[#0B111A]/95 px-6 py-6 lg:flex lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00E5A0]/25 bg-[#00E5A0]/8 text-base font-black text-[#00E5A0] shadow-[0_0_0_1px_rgba(0,229,160,0.08)]">
          T
        </div>

        <div>
          <div className="text-[15px] font-black tracking-[-0.04em] text-[#F5F7FA]">
            Tork<span className="text-[#00E5A0]">.</span>
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#667085]">
            Navlun Operasyonları
          </div>
        </div>
      </div>

      <div className="my-7 h-px bg-white/6" />

      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#667085]">
        Çalışma Alanı
      </div>

      <nav className="space-y-1.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                active
                  ? "border border-[#00E5A0]/20 bg-[#00E5A0]/8 text-[#F5F7FA] shadow-[0_0_0_1px_rgba(0,229,160,0.08)]"
                  : "text-[#9AA7B5] hover:bg-white/[0.03] hover:text-[#F5F7FA]"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${
                  active
                    ? "bg-[#00E5A0] text-[#07110D] font-black"
                    : "bg-white/[0.035] text-[#667085]"
                }`}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-white/8 bg-[#111827] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#667085]">
            Hesap
          </div>
          <div className="mt-2 truncate text-sm font-bold text-[#F5F7FA]">
            {userDashboard?.company_name || "Tork kullanıcısı"}
          </div>
          <div className="mt-1 text-xs text-[#667085]">
            {getRoleTR(userDashboard?.role)}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-black text-red-400 transition duration-200 hover:border-red-400/30 hover:bg-red-500/8"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}