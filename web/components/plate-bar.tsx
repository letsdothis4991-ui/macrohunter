import type { Macros } from "@/lib/nutrition";

/** Share of calories from each macro: protein and carbs at 4 kcal per gram, fat at 9. */
export function calorieSplit(m: Macros) {
  const p = m.protein * 4;
  const c = m.carbs * 4;
  const f = m.fat * 9;
  const total = p + c + f || 1;
  return { protein: p / total, carbs: c / total, fat: f / total };
}

function splitLabel(m: Macros) {
  const s = calorieSplit(m);
  return `Calories from protein ${Math.round(s.protein * 100)}%, carbs ${Math.round(s.carbs * 100)}%, fat ${Math.round(s.fat * 100)}%`;
}

/**
 * A ring showing where a dish's calories come from. The big one sits in the nutrition
 * panel with calories in the middle; the small one sits beside each dish name.
 */
export function MacroRing({ macros, size = 132, stroke = 12, children }: { macros: Macros; size?: number; stroke?: number; children?: React.ReactNode }) {
  const s = calorieSplit(macros);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = size > 60 ? 3 : 1.5;
  let offset = 0;
  const arcs = (["protein", "carbs", "fat"] as const).map((k) => {
    const len = Math.max(0, s[k] * c - gap);
    const arc = { k, len, offset };
    offset += s[k] * c;
    return arc;
  });
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={splitLabel(macros)} title={splitLabel(macros)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {arcs.map((a) => (
          <circle
            key={a.k}
            className={`ring-arc arc-${a.k}`}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${a.len} ${c}`}
            strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ ["--len" as string]: a.len }}
          />
        ))}
      </svg>
      {children && <div className="ring-centre">{children}</div>}
    </div>
  );
}

/** The small ring next to a dish name. Kept under the old name so callers stay the same. */
export function PlateBar({ macros }: { macros: Macros; thin?: boolean }) {
  return <MacroRing macros={macros} size={30} stroke={5} />;
}
