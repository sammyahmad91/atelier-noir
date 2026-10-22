import { ACCORDS, type Profile } from "@/lib/engine";

export function AccordBars({ profile, limit = 5 }: { profile: Profile; limit?: number }) {
  const rows = [...ACCORDS]
    .filter((a) => profile[a] > 0)
    .sort((a, b) => profile[b] - profile[a])
    .slice(0, limit);
  const max = profile[rows[0]] || 1;

  return (
    <ul className="space-y-3">
      {rows.map((a, i) => (
        <li key={a} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-4">
          <span className="text-xs tracking-[0.18em] uppercase text-mist">{a}</span>
          <span className="relative h-px bg-white/10">
            <span
              className="bar-fill absolute inset-y-[-1px] left-0 bg-gradient-to-r from-gold-deep to-gold"
              style={{ width: `${(profile[a] / max) * 100}%`, "--d": `${300 + i * 120}ms` } as React.CSSProperties}
            />
          </span>
          <span className="text-right font-serif text-sm text-mist tabular-nums">{Math.round(profile[a] * 100)}</span>
        </li>
      ))}
    </ul>
  );
}
