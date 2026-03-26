export function BrandWordmark({
  className = "",
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span className={className}>
      <span className={`text-accent transition-colors ${glow ? "drop-shadow-[0_10px_30px_rgba(212,169,76,0.18)]" : ""} group-hover:text-accent-hover`}>
        poneglyph
      </span>
      <span className="ml-[0.04em] text-[#4f7fcb] transition-colors group-hover:text-link-hover">
        .one
      </span>
    </span>
  );
}
