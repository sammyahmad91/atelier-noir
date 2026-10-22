import Link from "next/link";
import { AccordBars } from "@/components/accord-bars";
import { Flacon } from "@/components/flacon";
import { Reasons } from "@/components/reasons";
import { getWardrobe } from "@/lib/dal";
import { accordProfile, layer } from "@/lib/engine";

export const metadata = { title: "Layering Studio — Atelier Noir" };

export default async function LayeringPage({ searchParams }: PageProps<"/atelier/layering">) {
  const [wardrobe, sp] = await Promise.all([getWardrobe(), searchParams]);
  const a = wardrobe.find((f) => f.id === sp.a);
  const b = wardrobe.find((f) => f.id === sp.b && f.id !== a?.id);
  const result = a && b ? layer(a, b) : null;

  const suggestions = a
    ? wardrobe
        .filter((f) => f.id !== a.id)
        .map((f) => ({ f, l: layer(a, f) }))
        .sort((x, y) => y.l.score - x.l.score)
    : [];

  return (
    <div className="pt-16">
      <p className="eyebrow reveal">Two scents, one signature</p>
      <h1 className="display reveal mt-5 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
        The Layering <span className="italic text-gold">Studio</span>
      </h1>

      {wardrobe.length < 2 ? (
        <p className="mt-16 font-serif text-2xl italic text-mist">
          You need at least two bottles to compose a layer.{" "}
          <Link href="/atelier/wardrobe/new" className="text-gold underline-offset-4 hover:underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <>
          <form action="/atelier/layering" className="mt-14 grid items-end gap-8 border-y hairline py-10 md:grid-cols-[1fr_auto_1fr_auto]">
            <label className="block">
              <span className="eyebrow">First scent</span>
              <select name="a" defaultValue={a?.id ?? ""} className="field mt-2 font-serif !text-2xl" required>
                <option value="" disabled>
                  Choose…
                </option>
                {wardrobe.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.house}
                  </option>
                ))}
              </select>
            </label>
            <span className="display hidden pb-2 text-4xl italic text-gold md:block">&amp;</span>
            <label className="block">
              <span className="eyebrow">Second scent</span>
              <select name="b" defaultValue={b?.id ?? ""} className="field mt-2 font-serif !text-2xl">
                <option value="">Let the atelier suggest…</option>
                {wardrobe.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.house}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-gold">Compose</button>
          </form>

          {result && a && b ? (
            <section key={`${a.id}-${b.id}`} className="mt-20">
              <div className="grid items-center gap-16 lg:grid-cols-[1fr_auto_1fr]">
                <div className="reveal flex flex-col items-center text-center">
                  <Flacon name={a.name} family={a.family} remaining={a.remainingPct} size={140} />
                  <p className="eyebrow mt-6">{a.house}</p>
                  <p className="display mt-2 text-3xl">{a.name}</p>
                  <div className="mt-8 w-full max-w-xs text-left">
                    <AccordBars profile={accordProfile(a)} limit={4} />
                  </div>
                </div>

                <div className="reveal text-center" style={{ "--d": "200ms" } as React.CSSProperties}>
                  <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(242,237,228,0.08)" strokeWidth="0.6" />
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="url(#score)"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 289} 289`}
                      />
                      <defs>
                        <linearGradient id="score">
                          <stop offset="0" stopColor="#8c7350" />
                          <stop offset="1" stopColor="#e6c890" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div>
                      <p className="display text-7xl tabular-nums">{result.score}</p>
                      <p className="eyebrow mt-1 text-[0.56rem]">harmony</p>
                    </div>
                  </div>
                  <p className="display mt-6 text-5xl italic text-gold">{result.verdict}</p>
                </div>

                <div className="reveal flex flex-col items-center text-center" style={{ "--d": "120ms" } as React.CSSProperties}>
                  <Flacon name={b.name} family={b.family} remaining={b.remainingPct} size={140} />
                  <p className="eyebrow mt-6">{b.house}</p>
                  <p className="display mt-2 text-3xl">{b.name}</p>
                  <div className="mt-8 w-full max-w-xs text-left">
                    <AccordBars profile={accordProfile(b)} limit={4} />
                  </div>
                </div>
              </div>

              <div className="mt-24 grid gap-16 lg:grid-cols-2">
                <div>
                  <p className="eyebrow mb-6">The reading</p>
                  <Reasons reasons={result.reasons} />
                  {result.sharedNotes.length > 0 && (
                    <p className="mt-8 font-serif text-lg italic text-mist">
                      Shared notes: <span className="text-parchment">{result.sharedNotes.join(", ")}</span>
                    </p>
                  )}
                </div>
                <div className="panel p-10">
                  <p className="eyebrow mb-8 text-gold">The ritual</p>
                  <ol className="space-y-6">
                    {[
                      <>
                        <span className="text-gold">{result.baseSprays}</span> spray{result.baseSprays > 1 ? "s" : ""} of{" "}
                        <em>{result.base.name}</em> on the pulse points — the warmer, denser foundation.
                      </>,
                      <>Let it settle for a minute; the top notes should soften before the next layer.</>,
                      <>
                        <span className="text-gold">{result.topSprays}</span> spray{result.topSprays > 1 ? "s" : ""} of{" "}
                        <em>{result.top.name}</em> over it, and one on fabric to hold the lift.
                      </>,
                    ].map((step, i) => (
                      <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4">
                        <span className="display text-3xl italic text-gold-deep">{["I", "II", "III"][i]}</span>
                        <p className="font-serif text-xl leading-snug text-parchment/90">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          ) : a ? (
            <section className="mt-16">
              <h2 className="display mb-10 text-4xl">
                Partners for <span className="italic text-gold">{a.name}</span>
              </h2>
              <ul className="border-t hairline">
                {suggestions.map(({ f, l }, i) => (
                  <li key={f.id} className="reveal" style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
                    <Link href={`/atelier/layering?a=${a.id}&b=${f.id}`} className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-6 border-b hairline py-5">
                      <Flacon name={f.name} family={f.family} remaining={f.remainingPct} size={34} />
                      <div>
                        <p className="display text-2xl transition-colors group-hover:text-gold">{f.name}</p>
                        <p className="mt-1 text-xs text-mist">{l.reasons.find((r) => r.tone === "plus")?.text ?? f.house}</p>
                      </div>
                      <span className="font-serif text-lg italic text-mist">{l.verdict}</span>
                      <span className="display w-12 text-right text-3xl text-gold tabular-nums">{l.score}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-16 max-w-xl font-serif text-2xl italic leading-snug text-mist">
              Choose a first scent. Leave the second empty and the atelier will rank every bottle on your shelf as its
              partner.
            </p>
          )}
        </>
      )}
    </div>
  );
}
