import Link from "next/link";
import { ChipLinks } from "@/components/chip-links";
import { Flacon } from "@/components/flacon";
import { Reasons } from "@/components/reasons";
import { getSessionUser, getWardrobe, getWears } from "@/lib/dal";
import { currentSeason, currentTime, rankForTonight, wardrobeInsights, type Context } from "@/lib/engine";
import { greeting, longDate, relativeDay } from "@/lib/format";
import { OCCASIONS, OCCASION_LABEL, SEASONS, WEATHERS, WEATHER_LABEL, type Occasion, type Season, type Weather } from "@/lib/vocab";

function pick<T extends string>(value: string | string[] | undefined, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

export default async function SalonPage({ searchParams }: PageProps<"/atelier">) {
  const [user, wardrobe, wears, sp] = await Promise.all([getSessionUser(), getWardrobe(), getWears(), searchParams]);
  const now = new Date();
  const season0 = currentSeason(now);
  const time = pick(sp.time, ["day", "night"] as const, currentTime(now));

  const ctx: Context = {
    season: pick<Season>(sp.season, SEASONS, season0),
    occasion: pick<Occasion>(sp.occasion, OCCASIONS, time === "night" ? "evening" : "everyday"),
    weather: pick<Weather>(sp.weather, WEATHERS, season0 === "summer" ? "hot" : season0 === "winter" ? "cold" : "mild"),
    time,
  };
  const params = { occasion: ctx.occasion, weather: ctx.weather, season: ctx.season, time: ctx.time };

  const ranked = rankForTonight(wardrobe, ctx, wears);
  const [first, ...rest] = ranked;
  const insights = wardrobeInsights(wardrobe, wears);
  const byId = new Map(wardrobe.map((f) => [f.id, f]));
  const monthAgo = now.getTime() - 30 * 86_400_000;
  const monthWears = wears.filter((w) => w.wornAt.getTime() > monthAgo);
  const compliments = monthWears.reduce((s, w) => s + w.compliments, 0);
  const ml = Math.round(wardrobe.reduce((s, f) => s + (f.sizeMl * f.remainingPct) / 100, 0));

  return (
    <div className="pt-16">
      <section className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
        <div>
          <p className="eyebrow reveal">{longDate(now)} · {season0}</p>
          <h1 className="display reveal mt-5 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
            {greeting(now)}, <span className="italic text-gold">{user?.name}</span>.
          </h1>
        </div>
        <dl className="reveal grid grid-cols-4 gap-8 md:gap-12" style={{ "--d": "240ms" } as React.CSSProperties}>
          {[
            ["Bottles", wardrobe.length],
            ["Wears · 30d", monthWears.length],
            ["Compliments", compliments],
            ["ml in glass", ml],
          ].map(([k, v]) => (
            <div key={k}>
              <dd className="display text-4xl tabular-nums">{v}</dd>
              <dt className="eyebrow mt-2 text-[0.58rem]">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="rule-gold my-14" />

      {!first ? (
        <section className="py-20 text-center">
          <p className="display text-5xl italic">An empty shelf, waiting.</p>
          <p className="mx-auto mt-6 max-w-md text-mist">
            Add your first bottle and the atelier will begin choosing for you — by season, weather, occasion and rest.
          </p>
          <Link href="/atelier/wardrobe/new" className="btn btn-gold mt-10">
            Add a bottle
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-14 lg:grid-cols-[22rem_1fr]">
            <div className="space-y-8">
              <div>
                <p className="eyebrow">Tonight&apos;s pick</p>
                <h2 className="display mt-4 text-4xl">
                  Tell the atelier <span className="italic text-gold">about tonight</span>
                </h2>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="eyebrow mb-3 text-[0.58rem]">Occasion</p>
                  <ChipLinks name="occasion" options={OCCASIONS} labels={OCCASION_LABEL} current={ctx.occasion} params={params} basePath="/atelier" />
                </div>
                <div>
                  <p className="eyebrow mb-3 text-[0.58rem]">Weather</p>
                  <ChipLinks name="weather" options={WEATHERS} labels={WEATHER_LABEL} current={ctx.weather} params={params} basePath="/atelier" />
                </div>
                <div>
                  <p className="eyebrow mb-3 text-[0.58rem]">Season</p>
                  <ChipLinks name="season" options={SEASONS} current={ctx.season} params={params} basePath="/atelier" />
                </div>
                <div>
                  <p className="eyebrow mb-3 text-[0.58rem]">Hour</p>
                  <ChipLinks name="time" options={["day", "night"] as const} current={ctx.time} params={params} basePath="/atelier" />
                </div>
              </div>
              <Link
                href="/atelier/noir"
                className="group flex items-center gap-4 border-t hairline pt-7 transition-colors duration-500"
              >
                <span className="block h-2 w-2 shrink-0 rotate-45 bg-gold shadow-[0_0_14px_rgba(201,164,106,0.7)] transition-transform duration-700 group-hover:rotate-[225deg]" />
                <span className="min-w-0 flex-1">
                  <span className="eyebrow block text-[0.58rem] text-gold">Or ask NOIR AI</span>
                  <span className="mt-2 block font-serif text-lg italic text-mist transition-colors group-hover:text-parchment">
                    “Something warm for a rainy date?”
                  </span>
                </span>
                <span className="text-gold transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div key={`${ctx.occasion}-${ctx.weather}-${ctx.season}-${ctx.time}`}>
              <article className="panel relative grid items-center gap-10 overflow-hidden p-8 md:grid-cols-[auto_1fr] md:p-12">
                <div className="glow pointer-events-none absolute -left-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.18),transparent_65%)]" />
                <Link href={`/atelier/wardrobe/${first.fragrance.id}`} className="reveal relative mx-auto block">
                  <Flacon name={first.fragrance.name} family={first.fragrance.family} remaining={first.fragrance.remainingPct} size={150} />
                </Link>
                <div className="relative">
                  <div className="reveal flex items-baseline justify-between gap-6" style={{ "--d": "100ms" } as React.CSSProperties}>
                    <p className="eyebrow">{first.fragrance.house}</p>
                    <p className="font-serif text-lg italic text-gold">{first.match}% accord</p>
                  </div>
                  <h3 className="display reveal mt-3 text-5xl md:text-6xl" style={{ "--d": "180ms" } as React.CSSProperties}>
                    {first.fragrance.name}
                  </h3>
                  <p className="reveal mt-3 font-serif text-lg italic text-mist" style={{ "--d": "240ms" } as React.CSSProperties}>
                    {first.fragrance.family} · {first.fragrance.concentration}
                  </p>
                  <div className="reveal mt-8" style={{ "--d": "320ms" } as React.CSSProperties}>
                    <Reasons reasons={first.reasons} limit={5} />
                  </div>
                  <div className="reveal mt-10 flex flex-wrap gap-3" style={{ "--d": "420ms" } as React.CSSProperties}>
                    <Link
                      href={`/atelier/wardrobe/${first.fragrance.id}?log=1&occasion=${ctx.occasion}&weather=${ctx.weather}#log`}
                      className="btn btn-gold"
                    >
                      {ctx.time === "night" ? "Wear it tonight" : "Wear it today"}
                    </Link>
                    <Link href={`/atelier/layering?a=${first.fragrance.id}`} className="btn btn-ghost">
                      Find a layer
                    </Link>
                  </div>
                </div>
              </article>

              {rest.length > 0 && (
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {rest.slice(0, 2).map((p, i) => (
                    <Link
                      key={p.fragrance.id}
                      href={`/atelier/wardrobe/${p.fragrance.id}`}
                      className="panel reveal group flex items-center gap-6 p-6 transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.4)]"
                      style={{ "--d": `${500 + i * 120}ms` } as React.CSSProperties}
                    >
                      <Flacon name={p.fragrance.name} family={p.fragrance.family} remaining={p.fragrance.remainingPct} size={56} />
                      <div className="min-w-0 flex-1">
                        <p className="eyebrow text-[0.56rem]">Or perhaps</p>
                        <p className="display mt-1 truncate text-2xl transition-colors group-hover:text-gold">{p.fragrance.name}</p>
                        <p className="mt-1 text-xs text-mist">{p.reasons.find((r) => r.tone === "plus")?.text ?? p.fragrance.house}</p>
                      </div>
                      <span className="font-serif text-lg italic text-gold">{p.match}%</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-24 grid gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-8 flex items-baseline justify-between">
                <h2 className="display text-4xl">
                  Notes from <span className="italic text-gold">the atelier</span>
                </h2>
              </div>
              {insights.length ? (
                <ul className="border-t hairline">
                  {insights.map((ins) => (
                    <li key={ins.title} className="border-b hairline py-6">
                      <p className="eyebrow text-gold">{ins.title}</p>
                      <p className="mt-3 font-serif text-xl leading-snug text-parchment/90">
                        {ins.body}
                        {ins.href && (
                          <Link href={ins.href} className="ml-3 text-sm not-italic text-gold underline-offset-4 hover:underline">
                            View →
                          </Link>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-serif text-xl italic text-mist">A well-balanced shelf. Nothing to report.</p>
              )}
            </div>

            <div>
              <div className="mb-8 flex items-baseline justify-between">
                <h2 className="display text-4xl">
                  Recently <span className="italic text-gold">worn</span>
                </h2>
                <Link href="/atelier/journal" className="link-quiet text-[0.62rem] tracking-[0.28em] uppercase">
                  Full journal
                </Link>
              </div>
              {wears.length ? (
                <ul className="border-t hairline">
                  {wears.slice(0, 5).map((w) => {
                    const f = byId.get(w.fragranceId);
                    if (!f) return null;
                    return (
                      <li key={w.id} className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b hairline py-5">
                        <div className="min-w-0">
                          <Link href={`/atelier/wardrobe/${f.id}`} className="display text-2xl transition-colors hover:text-gold">
                            {f.name}
                          </Link>
                          <p className="mt-1 text-xs tracking-wide text-mist">
                            {OCCASION_LABEL[w.occasion as Occasion] ?? w.occasion} · {WEATHER_LABEL[w.weather as Weather] ?? w.weather}
                            {w.compliments > 0 && <span className="text-gold"> · {w.compliments} compliment{w.compliments > 1 ? "s" : ""}</span>}
                          </p>
                        </div>
                        <span className="font-serif text-sm italic text-dust">{relativeDay(w.wornAt)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="font-serif text-xl italic text-mist">No wears logged yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
