# Atelier Noir — a private fragrance wardrobe

A small full-stack product for people who collect perfume the way others collect art. You keep every bottle on a
virtual shelf, read its olfactive pyramid, journal every wear — and the atelier tells you **what to wear tonight**
and **what to layer it with**.

> The original take-home brief is preserved in [`BRIEF.md`](./BRIEF.md).

## Why this

Fragrance collectors hit the same problems: thirty bottles and nothing to wear, beautiful scents that never leave the
shelf, and no memory of which one earned the compliments. Atelier Noir answers those questions with real logic, not
a static catalogue.

## Try it

Click **“Tour a collector's shelf”** on the landing page to enter a seeded demo atelier (nine iconic bottles, two
months of wear history). Or create your own account.

Demo credentials: `demo@ateliernoir.app` / `noir-demo-2026`

## What works

- **Authentication** — email + password sign-up / sign-in (bcrypt hashes, signed HTTP-only JWT session cookie),
  route protection in `src/proxy.ts`, and authorization re-checked in the data access layer and every server action.
- **The Wardrobe** — add, edit and remove bottles with name, house, concentration, family, note pyramid, seasons,
  hour, projection, size and fill level. Live SVG bottle preview and accord profile while you type. Filter by family /
  season, sort by newest / most worn / neglected / fullest, and search by name, house or note.
- **Bottle pages** — an animated top / heart / base pyramid, an accord profile, stats, its best layering partners,
  and its full wear history (with delete).
- **Wear journal** — log occasion, weather, date, rating, compliments and sprays. Each wear lowers the bottle level
  in proportion to bottle size. The journal page shows a 10-week calendar tinted by family, compliments per wear by
  occasion, and your most admired bottle.
- **Tonight's pick** (`rankForTonight` in `src/lib/engine.ts`) — scores every bottle for the chosen occasion,
  weather, season and hour, explaining each recommendation with + / − reasons.
- **Layering Studio** (`layer` in `src/lib/engine.ts`) — scores two bottles for harmony, names the verdict
  (Sublime / Harmonious / Daring / Discordant), explains the bridge and clashes, and prescribes the ritual: which to
  apply first and how many sprays of each. Leave the second scent empty to rank every partner.
- **Atelier insights** — neglected bottles, thin seasons, bottles running low, your current signature.

### The engine, briefly

Every note is mapped to one of 12 accords through a small lexicon. Base notes weigh 2×, heart notes 1.5× and top
notes 1×, because the base is what you live with for hours. The family adds a bias, and the result is normalised
into an accord profile. From that profile:

- **Warmth** (−1 airy … +1 dense) is matched against the weather.
- **Tonight's score** combines season fit, hour fit, weather fit, the projection window for the occasion, sensual
  accords on date nights, rest days since last worn, past compliments at the same occasion, and how much is left in
  the bottle.
- **Layering** uses shared notes, complementary and clashing accord pairs (weighted, with diminishing returns),
  cosine similarity with a sweet spot (too similar is penalised), and the intensity gap. The warmer scent becomes the
  base.

## What's incomplete

- No photo upload. Bottles are drawn as generated SVG flacons, one of four silhouettes tinted by family.
- No shared catalogue or autocomplete for known perfumes; notes are entered by hand.
- No password reset or OAuth.
- No automated tests yet. The engine is pure functions in `src/lib/engine.ts`, so it's the natural first target.
- Weather is chosen manually rather than fetched from a weather API.

## Running locally

Requires Node 20.9+.

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are needed locally. The SQLite database (`local.db`) is created and seeded with the demo
atelier on first request.

## Deploying

The app runs anywhere Next.js runs. For Vercel:

1. Create a libSQL database on [Turso](https://turso.tech) (free tier is fine).
2. Set `DATABASE_URL`, `DATABASE_AUTH_TOKEN` and `SESSION_SECRET` (see `.env.example`).
3. Deploy. Tables and the demo account are created on first request.

## Stack

Next.js 16 (App Router, server actions, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM ·
libSQL / SQLite · jose · bcryptjs · zod. Typefaces: Cormorant Garamond and Manrope.

## Layout

```
src/
  app/                 routes — landing, login, signup, /atelier/* (salon, wardrobe, journal, layering)
  app/actions/         server actions — auth, wardrobe, wears
  components/          Flacon (SVG bottle), Pyramid, AccordBars, forms
  db/                  Drizzle schema, client with self-creating schema, demo seed
  lib/engine.ts        accord profiles, tonight's pick, layering, insights
  lib/dal.ts           session-checked data access
```
