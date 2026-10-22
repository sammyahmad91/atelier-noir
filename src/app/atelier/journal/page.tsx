import Link from "next/link";
import { ChipLinks } from "@/components/chip-links";
import { getWardrobe, getWears } from "@/lib/dal";
import { isoDay } from "@/lib/format";
import { OCCASIONS, OCCASION_LABEL, WEATHER_LABEL, tintFor, type Occasion, type Weather } from "@/lib/vocab";

export const metadata = { title: "Journal — Atelier Noir" };

const WEEKS = 10;

export default async function JournalPage({ searchParams }: PageProps<"/atelier/journal">) {
  const [wardrobe, wears, sp] = await Promise.all([getWardrobe(), getWears(), searchParams]);
  const byId = new Map(wardrobe.map((f) => [f.id, f]));
  const occasion = typeof sp.occasion === "string" && (OCCASIONS as readonly string[]).includes(sp.occasion) ? sp.occasion : "all";
  const shown = wears.filter((w) => occasion === "all" || w.occasion === occasion);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekday = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - weekday - (WEEKS - 1) * 7);
  const byDay = new Map<string, (typeof wears)[number]>();
  for (const w of wears) {
    const k = isoDay(w.wornAt);
    if (!byDay.has(k)) byDay.set(k, w);
  }
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const perOccasion = OCCASIONS.map((o) => {
    const ws = wears.filter((w) => w.occasion === o);
    const n = ws.length;
    return { o, n, avg: n ? ws.reduce((s, w) => s + w.compliments, 0) / n : 0 };
  }).filter((x) => x.n);
  const maxAvg = Math.max(0.1, ...perOccasion.map((x) => x.avg));

  const complimentsBy = new Map<string, number>();
  for (const w of wears) complimentsBy.set(w.fragranceId, (complimentsBy.get(w.fragranceId) ?? 0) + w.compliments);
  const [starId, starC] = [...complimentsBy.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const star = starId ? byId.get(starId) : undefined;

  const groups = new Map<string, typeof shown>();
  for (const w of shown) {
    const k = w.wornAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    groups.set(k, [...(groups.get(k) ?? []), w]);
  }

  return (
    <div className="pt-16">
      <p className="eyebrow reveal">{wears.length} wears · {wears.reduce((s, w) => s + w.compliments, 0)} compliments</p>
      <h1 className="display reveal mt-5 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
        The <span className="italic text-gold">Journal</span>
      </h1>

      <section className="mt-16 grid gap-14 lg:grid-cols-[auto_1fr]">
        <div className="panel p-8">
          <p className="eyebrow mb-6">The last {WEEKS} weeks</p>
          <div className="grid grid-flow-col grid-rows-7 gap-2">
            {days.map((d) => {
              const w = byDay.get(isoDay(d));
              const f = w ? byId.get(w.fragranceId) : undefined;
              const future = d > today;
              return (
                <span
                  key={d.toISOString()}
                  title={f ? `${d.toDateString()} — ${f.name}` : d.toDateString()}
                  className={`block h-4 w-4 rotate-45 transition-transform hover:scale-125 ${future ? "opacity-0" : ""}`}
                  style={{
                    background: f ? tintFor(f.family)[1] : "rgba(242,237,228,0.05)",
                    boxShadow: f ? `0 0 12px ${tintFor(f.family)[1]}55` : undefined,
                  }}
                />
              );
            })}
          </div>
          <p className="mt-6 font-serif text-sm italic text-dust">Each diamond is a day, tinted by the family you wore.</p>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-6">Compliments per wear</p>
            <ul className="space-y-4">
              {perOccasion.map(({ o, n, avg }, i) => (
                <li key={o} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-4">
                  <span className="text-xs tracking-[0.18em] text-mist uppercase">{OCCASION_LABEL[o]}</span>
                  <span className="relative h-px bg-white/10">
                    <span
                      className="bar-fill absolute inset-y-[-1px] left-0 bg-gradient-to-r from-gold-deep to-gold"
                      style={{ width: `${(avg / maxAvg) * 100}%`, "--d": `${200 + i * 100}ms` } as React.CSSProperties}
                    />
                  </span>
                  <span className="text-right font-serif text-sm text-mist tabular-nums" title={`${n} wear${n === 1 ? "" : "s"}`}>
                    {avg.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {star && (
            <div className="border-l hairline pl-10">
              <p className="eyebrow">Most admired</p>
              <Link href={`/atelier/wardrobe/${star.id}`} className="display mt-4 block text-5xl transition-colors hover:text-gold">
                {star.name}
              </Link>
              <p className="mt-3 font-serif text-lg italic text-mist">
                {starC} compliments from {wears.filter((w) => w.fragranceId === star.id).length} wears
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b hairline pb-8">
          <h2 className="display text-4xl">
            Every <span className="italic text-gold">entry</span>
          </h2>
          <ChipLinks
            name="occasion"
            options={["all", ...OCCASIONS]}
            labels={{ all: "All", ...OCCASION_LABEL }}
            current={occasion}
            params={{ occasion }}
            basePath="/atelier/journal"
          />
        </div>

        {shown.length === 0 ? (
          <p className="py-16 text-center font-serif text-2xl italic text-mist">No entries yet.</p>
        ) : (
          <div className="space-y-16">
            {[...groups.entries()].map(([month, entries]) => (
              <div key={month} className="grid gap-8 md:grid-cols-[12rem_1fr]">
                <p className="display text-3xl italic text-gold-deep md:sticky md:top-32 md:self-start">{month}</p>
                <ul className="border-t hairline">
                  {entries.map((w) => {
                    const f = byId.get(w.fragranceId);
                    if (!f) return null;
                    return (
                      <li key={w.id} className="grid grid-cols-[3rem_auto_1fr] items-baseline gap-6 border-b hairline py-6">
                        <span className="display text-3xl text-mist tabular-nums">{w.wornAt.getDate()}</span>
                        <span className="mt-2 block h-2.5 w-2.5 rotate-45" style={{ background: tintFor(f.family)[1] }} />
                        <div>
                          <Link href={`/atelier/wardrobe/${f.id}`} className="display text-2xl transition-colors hover:text-gold">
                            {f.name}
                          </Link>
                          <p className="mt-1 text-xs tracking-wide text-mist">
                            {OCCASION_LABEL[w.occasion as Occasion] ?? w.occasion} · {WEATHER_LABEL[w.weather as Weather] ?? w.weather}
                            <span className="ml-3 text-gold">{"✦".repeat(w.rating)}</span>
                            {w.compliments > 0 && <span className="ml-3">{w.compliments} compliment{w.compliments > 1 ? "s" : ""}</span>}
                          </p>
                          {w.note && <p className="mt-2 font-serif text-lg italic text-parchment/75">“{w.note}”</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
