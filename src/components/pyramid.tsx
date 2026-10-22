import type { Fragrance } from "@/db/schema";

const TIERS = [
  { key: "topNotes", label: "Top", hint: "the first quarter hour", width: "w-[46%]" },
  { key: "heartNotes", label: "Heart", hint: "the next few hours", width: "w-[72%]" },
  { key: "baseNotes", label: "Base", hint: "what lingers on skin", width: "w-full" },
] as const;

export function Pyramid({ fragrance }: { fragrance: Fragrance }) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      {TIERS.map((tier, i) => {
        const notes = fragrance[tier.key];
        return (
          <div
            key={tier.key}
            className={`reveal ${tier.width} panel relative px-6 py-5 text-center`}
            style={{ "--d": `${200 + i * 180}ms` } as React.CSSProperties}
          >
            <div className="eyebrow mb-2 flex items-center justify-center gap-3">
              <span className="text-gold">{tier.label}</span>
              <span className="text-dust normal-case tracking-normal italic font-serif text-sm">{tier.hint}</span>
            </div>
            <p className="font-serif text-xl leading-snug text-parchment md:text-2xl">
              {notes.length ? (
                notes.map((n, j) => (
                  <span key={n}>
                    {j > 0 && <span className="mx-2 text-gold-deep">·</span>}
                    <span className="italic">{n}</span>
                  </span>
                ))
              ) : (
                <span className="text-dust italic">—</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
