import { getRoleTR } from "../utils/turkish";

export default function Sidebar({ tabs, activeTab, userDashboard, onTabChange, onLogout }) {
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-white/[0.06] bg-[#0B111A] px-4 py-5 lg:flex lg:flex-col justify-between select-none">
      {/* Brand & Workspace */}
      <div>
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5A0] to-[#00B37E] text-sm font-black text-[#060B11] shadow-[0_0_20px_rgba(0,229,160,0.3)]">
            T
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-[-0.04em] text-[#F5F7FA]">
                TORK
              </span>
              <span className="rounded-md bg-[#00E5A0]/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#00E5A0]">
                B2B
              </span>
            </div>
            <div className="text-[11px] font-medium text-[#8C98A8]">
              Control Tower
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-white/[0.06]" />

        {/* Section Header */}
        <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]/70">
          Operasyon
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  active
                    ? "border-l-2 border-[#00E5A0] bg-[#00E5A0]/[0.08] text-[#F5F7FA] font-semibold pl-2.5"
                    : "text-[#8C98A8] hover:bg-white/[0.04] hover:text-[#F5F7FA]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center text-sm transition-colors ${
                    active ? "text-[#00E5A0]" : "text-[#8C98A8] group-hover:text-[#F5F7FA]"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User & Account Footer */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-[#101923] p-2.5 border border-white/[0.04]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-xs font-bold text-[#F5F7FA]">
            {(userDashboard?.company_name || userDashboard?.full_name || "T")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-[#F5F7FA]">
              {userDashboard?.company_name || "Tork Kullanıcısı"}
            </div>
            <div className="text-[11px] text-[#8C98A8]">
              {getRoleTR(userDashboard?.role)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs font-semibold text-[#8C98A8] transition duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.99]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}