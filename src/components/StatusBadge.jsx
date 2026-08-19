import React from "react";
import { getStatusTR } from "../utils/turkish";

export default function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const palette = {
    open: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]",
    pending: "border-[#F5A400]/30 bg-[#F5A400]/10 text-[#F5A400]",
    accepted: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
    in_transit: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]",
    assigned: "border-[#F5A400]/40 bg-[#F5A400]/15 text-[#F5A400]",
    delivered: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
    completed: "border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]",
    rejected: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]",
    cancelled: "border-[#374151] bg-[#111827] text-[#A0AEC0]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
        palette[normalized] || "border-[#374151] bg-[#111827] text-[#A0AEC0]"
      }`}
    >
      {getStatusTR(status)}
    </span>
  );
}