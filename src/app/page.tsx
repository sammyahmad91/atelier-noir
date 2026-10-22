import Link from "next/link";
import { enterDemo } from "@/app/actions/auth";
import { Flacon } from "@/components/flacon";
import { NoirLauncher } from "@/components/noir-launcher";
import { Wordmark } from "@/components/wordmark";
import { getSessionUser } from "@/lib/dal";

const RITUALS = [
  {
    n: "I",
    title: "The Wardrobe",
    body: "Every bottle you own, drawn as it stands on your shelf — its pyramid, its family, its story, and exactly how much remains in the glass.",
  },
  {
    n: "II",
    title: "Tonight",
    body: "Name the occasion and the weather. The atelier weighs season, rest, projection and the compliments each scent has earned you — then chooses.",
  },
  {
    n: "III",
    title: "The Layering Studio",
    body: "Pair two fragrances. We read their accords, find the note that bridges them, and tell you which to wear underneath — and how many sprays.",
  },
  {
    n: "IV",
    title: "Noir AI",
    body: "Or simply ask. A conversational concierge that answers in plain words from your own shelf and journal — tonight's pick, the perfect layer, the bottle you've forgotten.",
  },
];

const HERO_BOTTLES = [
  { name: "Santal 33", family: "Woody", remaining: 62, size: 150, d: 0, cls: "mt-16" },
  { name: "Baccarat Rouge 540", family: "Amber", remaining: 78, size: 190, d: 1200, cls: "" },
  { name: "Neroli Portofino", family: "Citrus", remaining: 40, size: 140, d: 2400, cls: "mt-24" },
];

export default async function Home() {
  const user = await getSessionUser();

  return (
    <main className="relative flex-1 overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-8 md:px-10">
        <Wordmark />
        <nav className="flex items-center gap-8 text-[0.68rem] tracking-[0.28em] uppercase">
          {user ? (
            <Link href="/atelier" className="link-quiet">
              Return to your atelier
            </Link>
          ) : (
            <>
              <Link href="/login" className="link-quiet">
                Sign in
              </Link>
              <Link href="/signup" className="link-quiet hidden sm:inline">
                Request a key
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-16 px-6 pt-32 pb-20 md:px-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="eyebrow reveal" style={{ "--d": "100ms" } as React.CSSProperties}>
            Maison privée · For those who collect scent
          </p>
          <h1
            className="display reveal mt-8 text-[clamp(4.5rem,11vw,9.5rem)]"
            style={{ "--d": "250ms" } as React.CSSProperties}
          >
            Atelier
            <br />
            <span className="italic text-gold">Noir</span>
          </h1>
          <p
            className="reveal mt-10 max-w-md text-[1.05rem] leading-relaxed text-mist"
            style={{ "--d": "450ms" } as React.CSSProperties}
          >
            A private wardrobe for the fragrances you love — their pyramids, their stories, and the nights they were
            made for.
          </p>
          <div className="reveal mt-12 flex flex-wrap items-center gap-4" style={{ "--d": "650ms" } as React.CSSProperties}>
            {user ? (
              <Link href="/atelier" className="btn btn-gold">
                Enter your atelier
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-gold">
                  Open your atelier
                </Link>
                <form action={enterDemo}>
                  <button className="btn btn-ghost">Tour a collector&apos;s shelf</button>
                </form>
              </>
            )}
          </div>
          <p className="reveal mt-6 font-serif text-sm italic text-dust" style={{ "--d": "800ms" } as React.CSSProperties}>
            The tour opens Camille&apos;s atelier — nine bottles, two months of wear.
          </p>
        </div>

        <div className="relative flex h-[34rem] items-center justify-center">
          <div className="glow absolute h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.28),transparent_65%)]" />
          <div className="absolute bottom-16 h-px w-[80%] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="relative flex items-end gap-6 md:gap-10">
            {HERO_BOTTLES.map((b) => (
              <figure key={b.name} className={`float reveal flex flex-col items-center ${b.cls}`} style={{ "--d": `${b.d}ms` } as React.CSSProperties}>
                <Flacon name={b.name} family={b.family} remaining={b.remaining} size={b.size} />
                <figcaption className="mt-4 font-serif text-sm italic text-mist">{b.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-32 md:px-10">
        <div className="mb-16 flex items-end justify-between gap-8">
          <h2 className="display text-5xl md:text-6xl">
            Four <span className="italic text-gold">rituals</span>
          </h2>
          <p className="eyebrow hidden md:block">What the atelier does</p>
        </div>
        <div className="border-t hairline">
          {RITUALS.map((r) => (
            <article
              key={r.n}
              className="group grid gap-6 border-b hairline py-12 transition-colors duration-500 hover:bg-white/[0.015] md:grid-cols-[8rem_1fr_1.3fr] md:items-baseline"
            >
              <span className="display text-6xl italic text-gold-deep transition-colors duration-500 group-hover:text-gold">
                {r.n}
              </span>
              <h3 className="display text-4xl">{r.title}</h3>
              <p className="max-w-lg leading-relaxed text-mist">{r.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-6 pb-36 text-center md:px-10">
        <div className="rule-gold mx-auto mb-14 w-40" />
        <blockquote className="display text-[clamp(2.2rem,5vw,3.75rem)] italic leading-tight text-parchment/90">
          “Perfume is the most intense form of memory.”
        </blockquote>
        <p className="eyebrow mt-8">Jean-Paul Guerlain</p>
      </section>

      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-dust md:flex-row md:px-10">
          <Wordmark />
          <p className="font-serif italic">Composed with patience. Worn with intention.</p>
        </div>
      </footer>
      <NoirLauncher demo={!user} />
    </main>
  );
}
