import type { Fragrance, Wear } from "@/db/schema";
import { OCCASION_LABEL, SEASONS, type Occasion, type Season, type Weather } from "./vocab";

export const ACCORDS = [
  "Citrus",
  "Aquatic",
  "Green",
  "Aromatic",
  "Fruity",
  "Floral",
  "Musk",
  "Woody",
  "Spicy",
  "Leather",
  "Amber",
  "Gourmand",
] as const;
export type Accord = (typeof ACCORDS)[number];
export type Profile = Record<Accord, number>;

const NOTE_LEXICON: [Accord, string[]][] = [
  ["Citrus", ["bergamot", "lemon", "mandarin", "orange", "grapefruit", "neroli", "lime", "yuzu", "citron", "petitgrain"]],
  ["Aquatic", ["sea", "marine", "aquozone", "mineral", "salt", "ozonic", "water", "calone"]],
  ["Green", ["galbanum", "mint", "basil", "green", "fig leaf", "tea", "grass", "ivy", "angelica"]],
  ["Aromatic", ["lavender", "rosemary", "sage", "thyme", "cypress", "mastic", "juniper", "artemisia"]],
  ["Fruity", ["pineapple", "apple", "raspberry", "blackcurrant", "peach", "pear", "plum", "fig", "cherry", "dried fruit"]],
  ["Floral", ["rose", "jasmine", "iris", "violet", "blossom", "tuberose", "pelargonium", "geranium", "ylang", "magnolia", "lily", "peony", "orris"]],
  ["Musk", ["musk", "ambrette", "cashmeran"]],
  ["Woody", ["sandalwood", "cedar", "vetiver", "oud", "birch", "patchouli", "wood", "papyrus", "oakmoss", "guaiac", "cypriol", "flint"]],
  ["Spicy", ["saffron", "cardamom", "cinnamon", "clove", "pepper", "spice", "nutmeg", "ginger", "pink pepper"]],
  ["Leather", ["leather", "suede", "tobacco", "birch tar", "castoreum"]],
  ["Amber", ["amber", "ambergris", "benzoin", "labdanum", "resin", "olibanum", "incense", "myrrh", "frankincense"]],
  ["Gourmand", ["vanilla", "tonka", "cacao", "chocolate", "almond", "caramel", "honey", "praline", "coffee", "rum"]],
];

const FAMILY_ACCORD: Record<string, Accord> = {
  Citrus: "Citrus",
  Aromatic: "Aromatic",
  Floral: "Floral",
  Chypre: "Woody",
  Woody: "Woody",
  Amber: "Amber",
  Gourmand: "Gourmand",
  Leather: "Leather",
  Aquatic: "Aquatic",
  Green: "Green",
};

/** -1 is a cold, airy accord; +1 is a dense, radiant one. */
const WARMTH: Profile = {
  Citrus: -1,
  Aquatic: -1,
  Green: -0.8,
  Aromatic: -0.4,
  Fruity: -0.2,
  Floral: 0,
  Musk: 0.1,
  Woody: 0.4,
  Spicy: 0.6,
  Leather: 0.8,
  Amber: 1,
  Gourmand: 1,
};

function emptyProfile(): Profile {
  return Object.fromEntries(ACCORDS.map((a) => [a, 0])) as Profile;
}

export function accordsForNote(note: string): Accord[] {
  const n = note.toLowerCase();
  return NOTE_LEXICON.filter(([, words]) => words.some((w) => n.includes(w))).map(([a]) => a);
}

type Pyramid = Pick<Fragrance, "topNotes" | "heartNotes" | "baseNotes" | "family">;

/** Base notes weigh most because they dominate the hours a fragrance is actually worn. */
export function accordProfile(f: Pyramid): Profile {
  const p = emptyProfile();
  const tiers: [string[], number][] = [
    [f.topNotes, 1],
    [f.heartNotes, 1.5],
    [f.baseNotes, 2],
  ];
  for (const [notes, weight] of tiers) {
    for (const note of notes) {
      const hits = accordsForNote(note);
      for (const a of hits) p[a] += weight / hits.length;
    }
  }
  const familyAccord = FAMILY_ACCORD[f.family];
  if (familyAccord) p[familyAccord] += 3;

  const total = ACCORDS.reduce((s, a) => s + p[a], 0) || 1;
  for (const a of ACCORDS) p[a] /= total;
  return p;
}

export function dominantAccords(p: Profile, n = 3): Accord[] {
  return [...ACCORDS].sort((a, b) => p[b] - p[a]).slice(0, n).filter((a) => p[a] > 0);
}

export function warmth(p: Profile): number {
  return ACCORDS.reduce((s, a) => s + p[a] * WARMTH[a], 0);
}

// ─── Context ──────────────────────────────────────────────────────────────

export type Context = {
  season: Season;
  occasion: Occasion;
  weather: Weather;
  time: "day" | "night";
};

export function currentSeason(d = new Date()): Season {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

export function currentTime(d = new Date()): "day" | "night" {
  const h = d.getHours();
  return h >= 17 || h < 5 ? "night" : "day";
}

const DAY_MS = 86_400_000;

export function daysSince(date: Date | null | undefined, now = Date.now()): number | null {
  if (!date) return null;
  return Math.floor((now - date.getTime()) / DAY_MS);
}

export function lastWornMap(wears: Wear[]): Map<string, Date> {
  const m = new Map<string, Date>();
  for (const w of wears) {
    const prev = m.get(w.fragranceId);
    if (!prev || w.wornAt > prev) m.set(w.fragranceId, w.wornAt);
  }
  return m;
}

// ─── Tonight's pick ───────────────────────────────────────────────────────

export type Reason = { text: string; tone: "plus" | "minus" };
export type TonightPick = { fragrance: Fragrance; score: number; match: number; reasons: Reason[] };

const WEATHER_TARGET: Record<Weather, number> = { hot: -0.7, mild: 0, rain: 0.25, cold: 0.75 };

const OCCASION_INTENSITY: Record<Occasion, [number, number]> = {
  everyday: [2, 4],
  office: [1, 3],
  evening: [3, 5],
  date: [3, 5],
  ceremony: [3, 5],
};

const SENSUAL: Accord[] = ["Amber", "Gourmand", "Musk", "Leather", "Floral"];

export function scoreForTonight(
  f: Fragrance,
  ctx: Context,
  history: Wear[],
  now = Date.now(),
): TonightPick {
  const reasons: Reason[] = [];
  const plus = (text: string) => reasons.push({ text, tone: "plus" });
  const minus = (text: string) => reasons.push({ text, tone: "minus" });
  const profile = accordProfile(f);
  let score = 0;

  if (f.seasons.includes(ctx.season)) {
    score += 22;
    plus(`Composed for ${ctx.season}`);
  } else {
    score -= 10;
    minus(`Out of season in ${ctx.season}`);
  }

  if (f.timeOfDay === "both" || f.timeOfDay === ctx.time) {
    score += 12;
  } else {
    score -= 8;
    minus(f.timeOfDay === "night" ? "Built for after dark" : "A daylight scent");
  }

  const w = warmth(profile);
  const fit = 1 - Math.min(Math.abs(w - WEATHER_TARGET[ctx.weather]) / 1.75, 1);
  score += Math.round(fit * 20);
  if (fit > 0.7) {
    plus(w > 0.2 ? `Its warmth suits ${ctx.weather} air` : `Its freshness suits ${ctx.weather} air`);
  } else if (fit < 0.35) {
    minus(w > 0.2 ? "Too dense for this weather" : "Too airy for this weather");
  }
  if (ctx.weather === "hot" && f.intensity >= 5) {
    score -= 8;
    minus("Heavy projection blooms too loudly in heat");
  }

  const [lo, hi] = OCCASION_INTENSITY[ctx.occasion];
  if (f.intensity >= lo && f.intensity <= hi) {
    score += 12;
  } else {
    const off = f.intensity < lo ? lo - f.intensity : f.intensity - hi;
    score -= off * 6;
    minus(f.intensity > hi ? `Too much presence for ${OCCASION_LABEL[ctx.occasion].toLowerCase()}` : "Too quiet for the occasion");
  }
  if (ctx.occasion === "date") {
    const sensual = SENSUAL.reduce((s, a) => s + profile[a], 0);
    score += Math.round(sensual * 12);
    if (sensual > 0.45) plus("Skin-close, sensual accords");
  }

  const mine = history.filter((h) => h.fragranceId === f.id);
  const last = mine.reduce<Date | null>((d, h) => (!d || h.wornAt > d ? h.wornAt : d), null);
  const rest = daysSince(last, now);
  if (rest === null) {
    score += 18;
    plus("Never worn — it has been waiting");
  } else if (rest >= 21) {
    score += 16;
    plus(`Rested for ${rest} days`);
  } else if (rest >= 10) {
    score += 10;
    plus(`Rested for ${rest} days`);
  } else if (rest >= 4) {
    score += 4;
  } else if (rest <= 1) {
    score -= 22;
    minus(rest === 0 ? "Already worn today" : "Worn yesterday");
  } else {
    score -= 10;
    minus(`Worn ${rest} days ago`);
  }

  const sameOccasion = mine.filter((h) => h.occasion === ctx.occasion);
  if (sameOccasion.length) {
    const avgCompliments = sameOccasion.reduce((s, h) => s + h.compliments, 0) / sameOccasion.length;
    const avgRating = sameOccasion.reduce((s, h) => s + h.rating, 0) / sameOccasion.length;
    if (avgCompliments >= 1) {
      score += Math.min(Math.round(avgCompliments * 4), 12);
      plus(`Averages ${avgCompliments.toFixed(1)} compliments at ${OCCASION_LABEL[ctx.occasion].toLowerCase()}`);
    }
    if (avgRating >= 4.5) score += 4;
  }

  if (f.remainingPct < 15) {
    if (ctx.occasion === "ceremony") {
      score += 4;
      plus("A worthy occasion for the last drops");
    } else {
      score -= 6;
      minus(`Only ${f.remainingPct}% left — save it`);
    }
  }

  const match = Math.round(Math.max(0, Math.min(99, ((score + 30) / 130) * 100)));
  return { fragrance: f, score, match, reasons };
}

export function rankForTonight(fragrances: Fragrance[], ctx: Context, history: Wear[], now = Date.now()) {
  return fragrances
    .map((f) => scoreForTonight(f, ctx, history, now))
    .sort((a, b) => b.score - a.score);
}

// ─── Layering ─────────────────────────────────────────────────────────────

const COMPLEMENTS: [Accord, Accord, string][] = [
  ["Citrus", "Woody", "citrus lifts the woods"],
  ["Citrus", "Musk", "musk gives citrus a second skin"],
  ["Amber", "Woody", "amber warms the woods from within"],
  ["Gourmand", "Amber", "a resinous, edible glow"],
  ["Floral", "Woody", "flowers bloom over a wooden frame"],
  ["Floral", "Musk", "musk blurs the petals into skin"],
  ["Aromatic", "Gourmand", "the lavender-and-vanilla classic"],
  ["Spicy", "Amber", "spice ignites the amber"],
  ["Leather", "Floral", "the rose-and-leather duet"],
  ["Leather", "Spicy", "spiced leather, very old-world"],
  ["Green", "Floral", "a garden after rain"],
  ["Aquatic", "Citrus", "a sea breeze with zest"],
  ["Fruity", "Woody", "fruit ripened on wood"],
  ["Spicy", "Woody", "a dry, peppered woodiness"],
];

const CLASHES: [Accord, Accord, string][] = [
  ["Aquatic", "Gourmand", "sea salt and sugar fight each other"],
  ["Aquatic", "Leather", "marine freshness muddies the leather"],
  ["Aquatic", "Amber", "ozone thins out the resins"],
  ["Green", "Gourmand", "sharp greens curdle the sweetness"],
  ["Citrus", "Gourmand", "zest turns sour against dessert"],
];

export type Verdict = "Sublime" | "Harmonious" | "Daring" | "Discordant";

export type Layering = {
  score: number;
  verdict: Verdict;
  reasons: Reason[];
  sharedNotes: string[];
  base: Fragrance;
  top: Fragrance;
  baseSprays: number;
  topSprays: number;
  similarity: number;
};

function cosine(a: Profile, b: Profile) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of ACCORDS) {
    dot += a[k] * b[k];
    na += a[k] ** 2;
    nb += b[k] ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function layer(a: Fragrance, b: Fragrance): Layering {
  const pa = accordProfile(a);
  const pb = accordProfile(b);
  const topA = dominantAccords(pa, 3);
  const topB = dominantAccords(pb, 3);
  const reasons: Reason[] = [];
  let score = 42;

  const notes = (f: Fragrance) => new Set([...f.topNotes, ...f.heartNotes, ...f.baseNotes].map((n) => n.toLowerCase()));
  const nb = notes(b);
  const sharedNotes = [...notes(a)].filter((n) => nb.has(n)).map((n) => n.replace(/\b\w/g, (c) => c.toUpperCase()));
  if (sharedNotes.length) {
    score += Math.min(sharedNotes.length * 4, 12);
    reasons.push({ text: `Bridged by ${sharedNotes.slice(0, 3).join(", ")}`, tone: "plus" });
  }

  // Each pairing is weighted by how strongly both scents express it, with diminishing returns.
  const strength = (x: Accord, y: Accord) => Math.max(Math.min(pa[x], pb[y]), Math.min(pa[y], pb[x]));
  const pairs = (x: Accord, y: Accord) =>
    (topA.includes(x) && topB.includes(y)) || (topA.includes(y) && topB.includes(x));
  const complements = COMPLEMENTS.filter(([x, y]) => pairs(x, y)).sort(([x1, y1], [x2, y2]) => strength(x2, y2) - strength(x1, y1));
  complements.forEach(([x, y, text], i) => {
    score += ([10, 6, 3][i] ?? 0) * Math.min(1, 0.5 + strength(x, y) * 2);
    reasons.push({ text: text[0].toUpperCase() + text.slice(1), tone: "plus" });
  });
  for (const [x, y, text] of CLASHES) {
    if (pairs(x, y)) {
      score -= 16;
      reasons.push({ text: text[0].toUpperCase() + text.slice(1), tone: "minus" });
    }
  }

  const similarity = cosine(pa, pb);
  if (similarity > 0.88) {
    score -= 12;
    reasons.push({ text: "Nearly twins — layering adds little", tone: "minus" });
  } else if (similarity > 0.72) {
    score -= 2;
    reasons.push({ text: "Close cousins — the result will feel familiar", tone: "minus" });
  } else if (similarity >= 0.3) {
    score += 8;
    reasons.push({ text: "A shared thread with distinct voices", tone: "plus" });
  } else if (similarity < 0.12) {
    score -= 6;
    reasons.push({ text: "Few common accords to hold them together", tone: "minus" });
  }

  const gap = Math.abs(a.intensity - b.intensity);
  if (gap >= 3) {
    score -= 10;
    reasons.push({ text: "One will bury the other unless dosed lightly", tone: "minus" });
  }

  const [base, top] = warmth(pa) >= warmth(pb) ? [a, b] : [b, a];
  const baseSprays = base.intensity >= 5 ? 1 : 2;
  const topSprays = top.intensity <= 2 ? 3 : 2;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict: Verdict = score >= 78 ? "Sublime" : score >= 60 ? "Harmonious" : score >= 42 ? "Daring" : "Discordant";
  return { score, verdict, reasons, sharedNotes, base, top, baseSprays, topSprays, similarity };
}

// ─── Wardrobe insights ────────────────────────────────────────────────────

export type Insight = { title: string; body: string; href?: string };

export function wardrobeInsights(fragrances: Fragrance[], wears: Wear[], now = Date.now()): Insight[] {
  const out: Insight[] = [];
  if (!fragrances.length) return out;
  const last = lastWornMap(wears);

  const neglected = fragrances
    .map((f) => ({ f, d: daysSince(last.get(f.id), now) }))
    .filter(({ d }) => d === null || d >= 30)
    .sort((x, y) => (y.d ?? 9999) - (x.d ?? 9999));
  if (neglected.length) {
    const { f, d } = neglected[0];
    out.push({
      title: "Forgotten on the shelf",
      body: `${f.name} ${d === null ? "has never been worn" : `hasn't touched skin in ${d} days`}.${neglected.length === 2 ? " One more is gathering dust." : neglected.length > 2 ? ` ${neglected.length - 1} more are gathering dust.` : ""}`,
      href: `/atelier/wardrobe/${f.id}`,
    });
  }

  const coverage = SEASONS.map((s) => ({ s, n: fragrances.filter((f) => f.seasons.includes(s)).length }));
  const thin = coverage.sort((a, b) => a.n - b.n)[0];
  if (thin.n <= 2) {
    out.push({
      title: `A thin ${thin.s} shelf`,
      body: thin.n === 0 ? `Nothing in the collection is made for ${thin.s}.` : `Only ${thin.n} bottle${thin.n > 1 ? "s" : ""} suit${thin.n > 1 ? "" : "s"} ${thin.s}. A gap worth filling.`,
    });
  }

  const low = fragrances.filter((f) => f.remainingPct < 20);
  if (low.length) {
    out.push({
      title: "Running low",
      body: `${low.map((f) => `${f.name} (${f.remainingPct}%)`).join(", ")} — time to decide: reorder, or let it go gracefully.`,
    });
  }

  const recent = wears.filter((w) => now - w.wornAt.getTime() < 30 * DAY_MS);
  if (recent.length) {
    const counts = new Map<string, number>();
    for (const w of recent) counts.set(w.fragranceId, (counts.get(w.fragranceId) ?? 0) + 1);
    const [topId, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const sig = fragrances.find((f) => f.id === topId);
    if (sig && n >= 3) {
      out.push({
        title: "Your current signature",
        body: `${sig.name} — ${n} of your last ${recent.length} wears this month.`,
        href: `/atelier/wardrobe/${sig.id}`,
      });
    }
  }

  return out;
}
