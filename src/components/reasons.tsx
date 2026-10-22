import type { Reason } from "@/lib/engine";

export function Reasons({ reasons, limit }: { reasons: Reason[]; limit?: number }) {
  const sorted = [...reasons].sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "plus" ? -1 : 1));
  return (
    <ul className="space-y-1.5">
      {sorted.slice(0, limit).map((r) => (
        <li key={r.text} className="flex items-baseline gap-3 text-sm">
          <span className={r.tone === "plus" ? "text-gold" : "text-rouge"}>{r.tone === "plus" ? "+" : "−"}</span>
          <span className={r.tone === "plus" ? "text-parchment/85" : "text-mist"}>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}
