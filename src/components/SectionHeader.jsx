export default function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#667085]">
          {eyebrow}
        </div>
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[#F5F7FA]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-[#9AA7B5]">{description}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
