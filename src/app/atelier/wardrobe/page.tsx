import Link from "next/link";
import { ChipLinks } from "@/components/chip-links";
import { Flacon } from "@/components/flacon";
import { getWardrobe, getWears } from "@/lib/dal";
import { daysSince, lastWornMap } from "@/lib/engine";
import { relativeDay } from "@/lib/format";
import { SEASONS } from "@/lib/vocab";

const SORTS = ["recent", "worn", "neglected", "fullest"] as const;
const SORT_LABEL = { recent: "Newest", worn: "Most worn", neglected: "Neglected", fullest: "Fullest" };

export const metadata = { title: "Wardrobe — Atelier Noir" };

export default async function WardrobePage({ searchParams }: PageProps<"/atelier/wardrobe">) {
  const [wardrobe, wears, sp] = await Promise.all([getWardrobe(), getWears(), searchParams]);
  const families = ["all", ...new Set(wardrobe.map((f) => f.family))].sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)));
  const family = typeof sp.family === "string" && families.includes(sp.family) ? sp.family : "all";
  const season = typeof sp.season === "string" && (SEASONS as readonly string[]).includes(sp.season) ? sp.season : "all";
  const sort = (typeof sp.sort === "string" && (SORTS as readonly string[]).includes(sp.sort) ? sp.sort : "recent") as (typeof SORTS)[number];
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const params = { family, season, sort, ...(q ? { q } : {}) };

  const last = lastWornMap(wears);
  const counts = new Map<string, number>();
  for (const w of wears) counts.set(w.fragranceId, (counts.get(w.fragranceId) ?? 0) + 1);

  const needle = q.toLowerCase();
  const shown = wardrobe
    .filter((f) => family === "all" || f.family === family)
    .filter((f) => season === "all" || f.seasons.includes(season))
    .filter(
      (f) =>
        !needle ||
        [f.name, f.house, ...f.topNotes, ...f.heartNotes, ...f.baseNotes].some((s) => s.toLowerCase().includes(needle)),
    )
    .sort((a, b) => {
      if (sort === "worn") return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      if (sort === "neglected") return (daysSince(last.get(b.id)) ?? 9999) - (daysSince(last.get(a.id)) ?? 9999);
      if (sort === "fullest") return b.remainingPct - a.remainingPct;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return (
    <div className="pt-16">
      <section className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow reveal">{wardrobe.length} bottles · {wears.length} wears recorded</p>
          <h1 className="display reveal mt-5 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
            The <span className="italic text-gold">Wardrobe</span>
          </h1>
        </div>
        <div className="reveal flex flex-wrap items-center gap-4" style={{ "--d": "220ms" } as React.CSSProperties}>
          <form className="relative" action="/atelier/wardrobe">
            {Object.entries(params)
              .filter(([k]) => k !== "q")
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <input name="q" defaultValue={q} placeholder="Search a name, house or note…" className="field w-64 text-sm" />
          </form>
          <Link href="/atelier/wardrobe/new" className="btn btn-gold">
            Add a bottle
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-6 border-y hairline py-8 lg:grid-cols-[1fr_auto_auto] lg:gap-12">
        <div>
          <p className="eyebrow mb-3 text-[0.58rem]">Family</p>
          <ChipLinks name="family" options={families} current={family} params={params} basePath="/atelier/wardrobe" />
        </div>
        <div>
          <p className="eyebrow mb-3 text-[0.58rem]">Season</p>
          <ChipLinks name="season" options={["all", ...SEASONS]} current={season} params={params} basePath="/atelier/wardrobe" />
        </div>
        <div>
          <p className="eyebrow mb-3 text-[0.58rem]">Order</p>
          <ChipLinks name="sort" options={SORTS} labels={SORT_LABEL} current={sort} params={params} basePath="/atelier/wardrobe" />
        </div>
      </section>

      {shown.length === 0 ? (
        <div className="py-28 text-center">
          <p className="display text-4xl italic text-mist">
            {wardrobe.length ? "Nothing on the shelf matches." : "Your shelf is bare."}
          </p>
          {!wardrobe.length && (
            <Link href="/atelier/wardrobe/new" className="btn btn-gold mt-10">
              Add your first bottle
            </Link>
          )}
        </div>
      ) : (
        <section
          key={`${family}-${season}-${sort}-${q}`}
          className="mt-16 grid grid-cols-2 gap-x-6 gap-y-20 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          {shown.map((f, i) => {
            const lw = last.get(f.id);
            const n = counts.get(f.id) ?? 0;
            return (
              <Link
                key={f.id}
                href={`/atelier/wardrobe/${f.id}`}
                className="group reveal relative flex flex-col items-center text-center"
                style={{ "--d": `${Math.min(i, 12) * 60}ms` } as React.CSSProperties}
              >
                <div className="relative flex h-56 items-end justify-center transition-transform duration-700 ease-out group-hover:-translate-y-2">
                  <Flacon name={f.name} family={f.family} remaining={f.remainingPct} size={104} />
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                <p className="eyebrow mt-5 text-[0.56rem]">{f.house}</p>
                <p className="display mt-2 text-2xl leading-tight transition-colors duration-300 group-hover:text-gold">{f.name}</p>
                <p className="mt-2 font-serif text-sm italic text-dust">
                  {lw ? `worn ${relativeDay(lw)}` : "never worn"} · {n} wear{n === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-[0.62rem] tracking-[0.2em] text-mist uppercase">
                  {f.family} · {f.remainingPct}%
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
