export default function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 transition-all ${
        enabled
          ? "border-[#F5A400] bg-[#F5A400]/15"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white/80 transition-transform ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
