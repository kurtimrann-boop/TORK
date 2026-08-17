import { getStatusTR } from "../utils/turkish";

export default function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const palette = {
    open: "border-[#00E5A0]/20 bg-[#00E5A0]/8 text-[#00E5A0]",
    pending: "border-[#9AA7B5]/25 bg-[#9AA7B5]/8 text-[#D8E2EC]",
    accepted: "border-[#00E5A0]/20 bg-[#00E5A0]/8 text-[#00E5A0]",
    rejected: "border-red-500/20 bg-red-500/8 text-red-300",
    assigned: "border-cyan-400/20 bg-cyan-400/8 text-cyan-300",
    completed: "border-white/10 bg-white/[0.04] text-[#9AA7B5]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
        palette[normalized] || "border-white/10 bg-white/[0.03] text-[#9AA7B5]"
      }`}
    >
      {getStatusTR(status)}
    </span>
  );
}