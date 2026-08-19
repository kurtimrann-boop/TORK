import React from "react";
import { getRoleTR } from "../utils/turkish";

export default function Sidebar({ tabs, activeTab, userDashboard, onTabChange }) {
  const isCarrier = userDashboard?.role === "carrier";
  const isAdmin = userDashboard?.role === "admin";

  // Group tabs into structured sections according to Sprint 14 architecture
  const getNavGroups = () => {
    if (isCarrier) {
      return [
        {
          label: "GENEL",
          tabIds: ["overview"],
        },
        {
          label: "YÜK BORSASI",
          tabIds: ["board", "my-bids"],
        },
        {
          label: "OPERASYON",
          tabIds: ["transports"],
        },
        {
          label: "FİNANS",
          tabIds: ["wallet"],
        },
        {
          label: "HESAP",
          tabIds: ["profile"],
        },
      ];
    }

    if (isAdmin) {
      return [
        {
          label: "YÖNETİM",
          tabIds: ["control-tower", "overview"],
        },
        {
          label: "OPERASYON",
          tabIds: ["loads", "transports"],
        },
        {
          label: "FİNANS",
          tabIds: ["wallet"],
        },
        {
          label: "HESAP",
          tabIds: ["profile"],
        },
      ];
    }

    // Shipper default
    return [
      {
        label: "GENEL",
        tabIds: ["overview"],
      },
      {
        label: "OPERASYON",
        tabIds: ["loads", "create", "bids"],
      },
      {
        label: "FİNANS",
        tabIds: ["wallet"],
      },
      {
        label: "HESAP",
        tabIds: ["profile"],
      },
    ];
  };

  const navGroups = getNavGroups();

  // Create lookup map for tabs
  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const renderedTabIds = new Set();

  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-[#374151] bg-[#111827] px-4 py-5 lg:flex lg:flex-col justify-between select-none">
      {/* Brand & Workspace Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-1">
          <img
            src="/tork-logo.png"
            alt="TORK"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-[-0.04em] text-[#F3F4F6]">
                TORK
              </span>
              <span className="rounded bg-[#F5A400]/15 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#F5A400] border border-[#F5A400]/30">
                PRO
              </span>
            </div>
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#A0AEC0]">
              {isCarrier ? "SEFER MERKEZİ" : "OPERASYON MERKEZİ"}
            </div>
          </div>
        </div>

        <div className="my-4 h-px bg-[#374151]" />

        {/* Grouped Navigation */}
        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-210px)] pr-1">
          {navGroups.map((group, groupIdx) => {
            const groupTabs = group.tabIds
              .map((id) => tabMap.get(id))
              .filter((tab) => tab && !renderedTabIds.has(tab.id));

            if (groupTabs.length === 0) return null;

            // Mark rendered to prevent duplicates
            groupTabs.forEach((tab) => renderedTabIds.add(tab.id));

            return (
              <div key={groupIdx} className="space-y-1">
                <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.10em] text-[#A0AEC0]/70">
                  {group.label}
                </div>
                <nav className="space-y-0.5">
                  {groupTabs.map((tab) => {
                    const active = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${
                          active
                            ? "bg-[#F5A400] text-[#111827] font-bold shadow-md shadow-[#F5A400]/20"
                            : "text-[#A0AEC0] font-medium hover:bg-[#1F2937] hover:text-[#F3F4F6]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center shrink-0 transition-colors ${
                            active ? "text-[#111827]" : "text-[#A0AEC0] group-hover:text-[#F5A400]"
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
            );
          })}

          {/* Any remaining unassigned tabs */}
          {tabs.filter((t) => !renderedTabIds.has(t.id)).length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.10em] text-[#A0AEC0]/70">
                DİĞER
              </div>
              <nav className="space-y-0.5">
                {tabs
                  .filter((t) => !renderedTabIds.has(t.id))
                  .map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${
                          active
                            ? "bg-[#F5A400] text-[#111827] font-bold shadow-md shadow-[#F5A400]/20"
                            : "text-[#A0AEC0] font-medium hover:bg-[#1F2937] hover:text-[#F3F4F6]"
                        }`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center shrink-0">
                          {tab.icon}
                        </span>
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* User Info Footprint in Sidebar (Navigation only, NO Logout button here) */}
      <div className="pt-4 border-t border-[#374151]">
        <button
          type="button"
          onClick={() => onTabChange("profile")}
          className="flex w-full items-center gap-3 rounded-lg bg-[#1F2937] p-2.5 border border-[#374151] hover:border-[#F5A400]/40 transition text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#283548] border border-[#4B5563] text-xs font-black text-[#F5A400]">
            {(userDashboard?.company_name || userDashboard?.full_name || "T")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[#F3F4F6]">
              {userDashboard?.company_name || userDashboard?.full_name || "Tork Kullanıcısı"}
            </div>
            <div className="text-[12px] text-[#A0AEC0] flex items-center gap-1">
              <span>{getRoleTR(userDashboard?.role)}</span>
              {userDashboard?.phone_verified && userDashboard?.identity_verified && (
                <span className="text-[#22C55E] text-[10px]">✓</span>
              )}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
}