export default function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between select-none">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C98A8]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-black tracking-[-0.03em] text-[#F5F7FA]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs sm:text-sm text-[#8C98A8]">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
