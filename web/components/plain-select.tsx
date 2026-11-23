"use client";
/** A select that looks like text with a small caret and is only as wide as its current label. */
export function PlainSelect({
  value,
  label,
  onChange,
  children,
  ariaLabel,
  className,
  style,
}: {
  value: string;
  label: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`plain-select ${className ?? ""}`} style={style}>
      <span aria-hidden>{label}</span>
      <span className="caret" aria-hidden />
      <select value={value} aria-label={ariaLabel} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </span>
  );
}
