export default function SettingCard({
  title,
  description,
  children,
  isDanger = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isDanger
          ? "border-red-500/20 bg-red-500/5"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4
            className={`text-sm font-bold ${
              isDanger ? "text-red-400" : "text-[#F5F7FA]"
            }`}
          >
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-xs text-[#9AA7B5]">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
