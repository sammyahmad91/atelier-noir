import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteFragrance, deleteWear } from "@/app/actions/wardrobe";
import { AccordBars } from "@/components/accord-bars";
import { ConfirmButton } from "@/components/confirm-button";
import { Flacon } from "@/components/flacon";
import { LogWearForm } from "@/components/log-wear-form";
import { Pyramid } from "@/components/pyramid";
import { getFragrance, getWardrobe, getWears } from "@/lib/dal";
import { accordProfile, layer } from "@/lib/engine";
import { isoDay, relativeDay, shortDate } from "@/lib/format";
import { OCCASIONS, OCCASION_LABEL, WEATHERS, WEATHER_LABEL, type Occasion, type Weather } from "@/lib/vocab";

export async function generateMetadata({ params }: PageProps<"/atelier/wardrobe/[id]">) {
  const fragrance = await getFragrance((await params).id);
  return { title: fragrance ? `${fragrance.name} — Atelier Noir` : "Atelier Noir" };
}

export default async function FragrancePage({ params, searchParams }: PageProps<"/atelier/wardrobe/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [fragrance, wardrobe, allWears] = await Promise.all([getFragrance(id), getWardrobe(), getWears()]);
  if (!fragrance) notFound();

  const wears = allWears.filter((w) => w.fragranceId === id);
  const compliments = wears.reduce((s, w) => s + w.compliments, 0);
  const avgRating = wears.length ? wears.reduce((s, w) => s + w.rating, 0) / wears.length : 0;
  const profile = accordProfile(fragrance);
  const partners = wardrobe
    .filter((f) => f.id !== id)
    .map((f) => ({ f, l: layer(fragrance, f) }))
    .sort((a, b) => b.l.score - a.l.score)
    .slice(0, 3);

  const occasion = typeof sp.occasion === "string" && (OCCASIONS as readonly string[]).includes(sp.occasion) ? sp.occasion : undefined;
  const weather = typeof sp.weather === "string" && (WEATHERS as readonly string[]).includes(sp.weather) ? sp.weather : undefined;
  const intent = sp.log === "1";

  return (
    <div className="pt-12">
      <Link href="/atelier/wardrobe" className="link-quiet text-[0.62rem] tracking-[0.28em] uppercase">
        ← The wardrobe
      </Link>

      <section className="mt-10 grid items-center gap-16 lg:grid-cols-[1fr_1.3fr]">
        <div className="relative flex justify-center py-10">
          <div className="glow absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.22),transparent_65%)]" />
          <div className="float reveal relative">
            <Flacon name={fragrance.name} family={fragrance.family} remaining={fragrance.remainingPct} size={210} />
          </div>
        </div>

        <div>
          <p className="eyebrow reveal">{fragrance.house}</p>
          <h1 className="display reveal mt-5 text-6xl md:text-8xl" style={{ "--d": "120ms" } as React.CSSProperties}>
            {fragrance.name}
          </h1>
          <p className="reveal mt-5 font-serif text-xl italic text-mist" style={{ "--d": "200ms" } as React.CSSProperties}>
            {fragrance.family} · {fragrance.concentration}
            {fragrance.year ? ` · ${fragrance.year}` : ""} · {fragrance.seasons.join(", ")} ·{" "}
            {fragrance.timeOfDay === "both" ? "day & night" : fragrance.timeOfDay}
          </p>
          {fragrance.story && (
            <p className="reveal mt-8 max-w-xl border-l border-gold/40 pl-6 font-serif text-2xl leading-snug text-parchment/85 italic" style={{ "--d": "280ms" } as React.CSSProperties}>
              {fragrance.story}
            </p>
          )}

          <dl className="reveal mt-12 grid grid-cols-3 gap-8 border-y hairline py-8 sm:grid-cols-5" style={{ "--d": "360ms" } as React.CSSProperties}>
            {[
              ["Wears", wears.length],
              ["Compliments", compliments],
              ["Rating", avgRating ? avgRating.toFixed(1) : "—"],
              ["Last worn", wears[0] ? relativeDay(wears[0].wornAt) : "never"],
              ["In glass", `${Math.round((fragrance.sizeMl * fragrance.remainingPct) / 100)} ml`],
            ].map(([k, v]) => (
              <div key={k}>
                <dd className="display text-3xl">{v}</dd>
                <dt className="eyebrow mt-2 text-[0.56rem]">{k}</dt>
              </div>
            ))}
          </dl>

          <div className="reveal mt-10 flex flex-wrap gap-3" style={{ "--d": "440ms" } as React.CSSProperties}>
            <a href="#log" className="btn btn-gold">
              Log a wear
            </a>
            <Link href={`/atelier/layering?a=${id}`} className="btn btn-ghost">
              Layer with…
            </Link>
            <Link href={`/atelier/wardrobe/${id}/edit`} className="btn btn-ghost">
              Edit
            </Link>
            <ConfirmButton action={deleteFragrance.bind(null, id)} label="Remove" confirmLabel="Remove for good?" />
          </div>
        </div>
      </section>

      <section className="mt-28 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">Olfactive pyramid</p>
          <h2 className="display mt-4 mb-10 text-5xl">
            How it <span className="italic text-gold">unfolds</span>
          </h2>
          <Pyramid fragrance={fragrance} />
        </div>
        <div>
          <p className="eyebrow">Accord profile</p>
          <h2 className="display mt-4 mb-10 text-5xl">
            What it&apos;s <span className="italic text-gold">made of</span>
          </h2>
          <AccordBars profile={profile} limit={6} />

          {partners.length > 0 && (
            <div className="mt-14">
              <p className="eyebrow mb-6">Pairs beautifully with</p>
              <ul className="border-t hairline">
                {partners.map(({ f, l }) => (
                  <li key={f.id}>
                    <Link
                      href={`/atelier/layering?a=${id}&b=${f.id}`}
                      className="group flex items-center gap-5 border-b hairline py-4"
                    >
                      <Flacon name={f.name} family={f.family} remaining={f.remainingPct} size={30} />
                      <span className="display flex-1 text-2xl transition-colors group-hover:text-gold">{f.name}</span>
                      <span className="font-serif text-base italic text-mist">{l.verdict}</span>
                      <span className="w-10 text-right font-serif text-lg text-gold tabular-nums">{l.score}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section id="log" className="mt-28 scroll-mt-28">
        <p className="eyebrow">The journal</p>
        <h2 className="display mt-4 mb-10 text-5xl">
          Record a <span className="italic text-gold">wear</span>
        </h2>
        <LogWearForm fragranceId={id} today={isoDay()} defaultOccasion={occasion} defaultWeather={weather} highlight={intent} />
      </section>

      <section className="mt-20">
        <h3 className="display mb-8 text-3xl">
          Every time it was <span className="italic text-gold">worn</span>
        </h3>
        {wears.length ? (
          <ul className="border-t hairline">
            {wears.map((w) => (
              <li key={w.id} className="group grid grid-cols-[5rem_1fr_auto] items-baseline gap-6 border-b hairline py-5">
                <span className="font-serif text-lg italic text-mist">{shortDate(w.wornAt)}</span>
                <div>
                  <p className="text-sm tracking-wide text-parchment/85">
                    {OCCASION_LABEL[w.occasion as Occasion] ?? w.occasion} · {WEATHER_LABEL[w.weather as Weather] ?? w.weather}
                    <span className="ml-3 text-gold">{"✦".repeat(w.rating)}</span>
                    {w.compliments > 0 && <span className="ml-3 text-mist">{w.compliments} compliment{w.compliments > 1 ? "s" : ""}</span>}
                  </p>
                  {w.note && <p className="mt-1 font-serif text-lg italic text-mist">“{w.note}”</p>}
                </div>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">
                  <ConfirmButton
                    action={deleteWear.bind(null, w.id)}
                    label="Erase"
                    confirmLabel="Erase?"
                    className="text-[0.6rem] tracking-[0.24em] uppercase text-dust hover:text-rouge"
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-serif text-xl italic text-mist">Not yet worn. Tonight, perhaps.</p>
        )}
      </section>
    </div>
  );
}
