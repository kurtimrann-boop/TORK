export default function Card({ children, className = "", hover = true }) {
  return (
    <div
      className={[
        "relative rounded-2xl border border-white/8 bg-[#0F1723] shadow-[0_14px_50px_rgba(0,0,0,0.20)]",
        hover ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F5A400]/15 hover:shadow-[0_18px_60px_rgba(0,0,0,0.26)]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
