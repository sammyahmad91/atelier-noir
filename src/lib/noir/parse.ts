import type { Fragrance } from "@/db/schema";
import type { Accord } from "@/lib/engine";
import type { Occasion, Season, Weather } from "@/lib/vocab";
import type { NoirIntent, NoirMessage } from "./types";

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ─── Bottle names ─────────────────────────────────────────────────────────

const NAME_STOPWORDS = new Set(["of", "a", "the", "de", "di", "du", "la", "le", "les", "d", "l", "eau", "and", "et", "no", "by"]);

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

function similar(word: string, token: string) {
  if (word === token) return true;
  if (token.length < 5 || word.length < 5) return false;
  return levenshtein(word, token) <= (token.length >= 8 ? 2 : 1) || token.startsWith(word);
}

/** "Baccarat Rouge 540" also answers to "br540"; "Terre d'Hermès" to "tdh"; "Portrait of a Lady" to "poal". */
function aliases(name: string) {
  const words = name.split(" ");
  const alpha = words.filter((w) => !/^\d+$/.test(w));
  const digits = words.filter((w) => /^\d+$/.test(w));
  const out = new Set<string>();
  if (words.length >= 3) out.add(words.map((w) => w[0]).join(""));
  if (words.length >= 4) out.add(words.slice(0, 3).map((w) => w[0]).join(""));
  if (digits.length && alpha.length) out.add(alpha.map((w) => w[0]).join("") + digits.join(""));
  return [...out].filter((a) => a.length >= 3);
}

type Mention = { f: Fragrance; at: number; score: number };

/**
 * Bottles named in `text`, in the order they appear. `strict` only accepts the full name,
 * which is how NOIR itself always writes them.
 */
export function findBottles(text: string, fragrances: Fragrance[], strict = false): Fragrance[] {
  const msg = normalize(text);
  if (!msg) return [];
  const words = msg.split(" ");
  const padded = ` ${msg} `;
  const hits: Mention[] = [];

  for (const f of fragrances) {
    const name = normalize(f.name);
    const full = padded.indexOf(` ${name} `);
    if (full >= 0) {
      hits.push({ f, at: padded.slice(0, full).split(" ").length - 1, score: 10 });
      continue;
    }
    if (strict) continue;
    const alias = aliases(name).map((a) => words.indexOf(a)).find((i) => i >= 0);
    if (alias !== undefined) {
      hits.push({ f, at: alias, score: 8 });
      continue;
    }
    const tokens = name.split(" ").filter((t) => !NAME_STOPWORDS.has(t) && (t.length >= 3 || /^\d{2,}$/.test(t)));
    let matched = 0;
    let first = Infinity;
    for (const t of tokens) {
      const i = words.findIndex((w) => similar(w, t));
      if (i >= 0) {
        matched++;
        first = Math.min(first, i);
      }
    }
    if (matched) hits.push({ f, at: first, score: (matched / tokens.length) * 5 + matched });
  }

  return hits
    .sort((a, b) => a.at - b.at || b.score - a.score)
    .filter((h, i, all) => all.findIndex((o) => o.f.id === h.f.id) === i)
    .map((h) => h.f);
}

/** The bottles NOIR named in its most recent answer that named any; the first is the one it recommended. */
export function lastBottles(history: NoirMessage[], fragrances: Fragrance[]): Fragrance[] {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "assistant") continue;
    const found = findBottles(history[i].content, fragrances, true);
    if (found.length) return found;
  }
  return [];
}

// ─── The evening being described ─────────────────────────────────────────

export type Mood = "fresh" | "warm" | "soft" | "bold";
export type Ask = { occasion?: Occasion; weather?: Weather; season?: Season; time?: "day" | "night"; mood?: Mood };

const OCCASION_WORDS: [Occasion, RegExp][] = [
  ["date", /\b(date|dates|romantic|romance|anniversary|valentine\w*|seduc\w*|lover|first kiss)\b/],
  ["ceremony", /\b(wedding|ceremony|gala|opera|funeral|black tie|formal|christening|graduation|awards?)\b/],
  ["office", /\b(office|work|working|meeting|meetings|interview|pitch|presentation|conference|client|clients|desk|boardroom)\b/],
  ["evening", /\b(evening out|party|parties|bar|club|clubbing|night out|drinks|cocktails?|concert|theatre|theater|dinner|restaurant|jazz|evening)\b/],
  ["everyday", /\b(everyday|every day|casual|errands|weekend|brunch|gym|daily|lazy|at home|coffee|walk)\b/],
];

const WEATHER_WORDS: [Weather, RegExp][] = [
  ["hot", /\b(hot|heat|heatwave|humid|humidity|sweltering|scorching|sunny|warm day|warm weather|tropical|beach)\b/],
  ["cold", /\b(cold|freezing|chilly|chill|snow\w*|frost\w*|icy|bitter)\b/],
  ["rain", /\b(rain|rainy|raining|drizzle|storm\w*|wet|downpour)\b/],
  ["mild", /\b(mild|temperate|breezy|overcast|grey|gray)\b/],
];

const SEASON_WORDS: [Season, RegExp][] = [
  ["spring", /\bspring\b/],
  ["summer", /\bsummer\b/],
  ["autumn", /\b(autumn|fall)\b/],
  ["winter", /\bwinter\b/],
];

const MOOD_WORDS: [Mood, RegExp][] = [
  ["fresh", /\b(fresh|fresher|freshest|light|lighter|airy|airier|clean|cleaner|crisp|crisper|cooler|bright|brighter|zesty)\b/],
  ["warm", /\b(warm|warmer|cosy|cozy|cosier|cozier|rich|richer|heavier|deeper|darker|sweeter|sensual|ambery)\b/],
  ["soft", /\b(subtle|subtler|softer|soft|quiet|quieter|discreet|understated|gentle|skin scent|close to the skin|low key)\b/],
  ["bold", /\b(bold|bolder|louder|loud|projection|beast|statement|stronger|powerful|noticed)\b/],
];

export function parseAsk(text: string): Ask {
  const t = normalize(text);
  const ask: Ask = {};
  ask.occasion = OCCASION_WORDS.find(([, re]) => re.test(t))?.[0];
  ask.weather = WEATHER_WORDS.find(([, re]) => re.test(t))?.[0];
  ask.season = SEASON_WORDS.find(([, re]) => re.test(t))?.[0];
  if (/\b(tonight|night|after dark|late|midnight|nightcap)\b/.test(t) || /\b(dinner|evening|party|club|bar|drinks|opera|gala)\b/.test(t)) {
    ask.time = "night";
  } else if (/\b(today|morning|afternoon|daytime|day|lunch|noon|brunch|office|work)\b/.test(t)) {
    ask.time = "day";
  }
  const moodText = t.replace(/\bwarm (day|weather)\b/g, "");
  ask.mood = MOOD_WORDS.find(([, re]) => re.test(moodText))?.[0];
  for (const k of Object.keys(ask) as (keyof Ask)[]) if (ask[k] === undefined) delete ask[k];
  return ask;
}

const FOLLOW_UP = /^(and|but|what about|how about|ok|okay|hmm|maybe|then|so)\b|\b(instead|else|another|other|alternative|rather|than that|one more|next one)\b/;

export function isFollowUp(text: string) {
  const t = normalize(text);
  return FOLLOW_UP.test(t) || (t.split(" ").length <= 6 && !!parseAsk(t).mood);
}

export function wantsAnother(text: string) {
  return /\b(else|another|other|alternative|instead|different|next one|besides)\b/.test(normalize(text)) || !!parseAsk(text).mood;
}

// ─── Notes and accords ────────────────────────────────────────────────────

const ACCORD_WORDS: [Accord, RegExp][] = [
  ["Citrus", /\b(citrus|citrusy|citrussy|zesty)\b/],
  ["Aquatic", /\b(aquatic|marine|oceanic|salty|ozonic)\b/],
  ["Green", /\b(green|grassy|leafy)\b/],
  ["Aromatic", /\b(aromatic|herbal|herby)\b/],
  ["Fruity", /\b(fruity|fruit)\b/],
  ["Floral", /\b(floral|flowery|flowers|florals)\b/],
  ["Musk", /\b(musky|musks)\b/],
  ["Woody", /\b(woody|woods|woodsy)\b/],
  ["Spicy", /\b(spicy|spiced)\b/],
  ["Leather", /\b(leathery|smoky|smokey)\b/],
  ["Amber", /\b(ambery|resinous|resins)\b/],
  ["Gourmand", /\b(gourmand|sweet|edible|dessert)\b/],
];

const COMMON_NOTES = [
  "vanilla", "rose", "oud", "iris", "musk", "sandalwood", "vetiver", "tobacco", "leather", "amber", "incense",
  "jasmine", "bergamot", "lavender", "tonka", "patchouli", "saffron", "cedar", "neroli", "fig", "pepper",
  "cardamom", "coffee", "honey", "tea", "tuberose", "violet", "oakmoss", "lemon", "cacao", "chocolate", "cinnamon",
];

export type NoteQuery = { kind: "note"; word: string } | { kind: "accord"; accord: Accord };

export function findNoteQuery(text: string, fragrances: Fragrance[]): NoteQuery | null {
  const t = normalize(text);
  const padded = ` ${t} `;
  const vocabulary = new Set(COMMON_NOTES);
  for (const f of fragrances) {
    for (const n of [...f.topNotes, ...f.heartNotes, ...f.baseNotes]) {
      const clean = normalize(n).replace(/\s+notes?$/, "");
      if (clean.length >= 3 && !ACCORD_WORDS.some(([, re]) => re.test(clean))) vocabulary.add(clean);
    }
  }
  const notes = [...vocabulary].sort((a, b) => b.length - a.length);
  const word = notes.find((n) => padded.includes(` ${n} `) || padded.includes(` ${n}s `));
  if (word) return { kind: "note", word };
  const accord = ACCORD_WORDS.find(([, re]) => re.test(t))?.[0];
  return accord ? { kind: "accord", accord } : null;
}

// ─── Intent ───────────────────────────────────────────────────────────────

const RE = {
  greeting: /^(hi|hello|hey|hiya|bonjour|bonsoir|salut|greetings|good (morning|afternoon|evening|day))\b/,
  help: /\b(help|what can you do|who are you|what are you|how does this work|how do you work|what do you know)\b/,
  layering: /\b(layer|layers|layering|layered|pair|pairs|pairing|pairings|combine|combination|combo|mix|mixing|blend|goes with|go with|goes well|go well|on top of|stack|stacking|partner)\b/,
  describe: /\b(tell me about|tell me more|more about|describe|what is it like|what s it like|how does it smell|thoughts on|what do you think of|story|pyramid|notes in|how much (is )?left|about)\b/,
  low: /\b(running low|run out|running out|low(?! key)|almost (gone|empty|finished)|nearly (gone|empty|finished)|reorder|re order|restock|refill|last drops|empty)\b/,
  neglected: /\b(neglect\w*|forgot\w*|ignor\w*|dust\w*|haven t worn|havent worn|not worn|never worn|unworn|untouched|longest|shelf queens?|abandon\w*|overlook\w*|rotation|sitting)\b/,
  compliments: /\b(compliment\w*|admired|admire|praise\w*|crowd pleaser|people love|best received|signature|most worn|wear most|worn most|favou?rites?|most loved|reactions?)\b/,
  gaps: /\b(buy|buying|purchase|shop|shopping|gaps?|missing|lacking|next bottle|add next|should i add|wishlist|blind buy|new bottle|collection need|what s next)\b/,
  tonight: /\b(wear|wearing|tonight|today|recommend|suggest|pick|choose|should i|what to|outfit|occasion|going to|heading|need something|something for|scent for|fragrance for|perfume for)\b/,
  pronoun: /\b(it|this|that|this one|that one|the same|them|the first|your pick)\b/,
};

export function refersBack(text: string) {
  return RE.pronoun.test(normalize(text));
}

export function detectIntent(text: string, ctx: { mentions: Fragrance[]; remembered: Fragrance[]; fragrances: Fragrance[] }): NoirIntent | null {
  const t = normalize(text);
  if (!t) return "fallback";
  const words = t.split(" ").length;
  const hasBottle = ctx.mentions.length > 0 || (RE.pronoun.test(t) && ctx.remembered.length > 0);

  if (RE.layering.test(t)) return "layering";
  if (RE.greeting.test(t) && words <= 5) return "greeting";
  if (RE.help.test(t)) return "greeting";
  if (RE.describe.test(t) && hasBottle && !RE.tonight.test(t)) return "describe";
  if (RE.low.test(t)) return ctx.mentions.length ? "describe" : "low";
  if (RE.neglected.test(t)) return "neglected";
  if (RE.compliments.test(t)) return "compliments";
  if (RE.gaps.test(t)) return "gaps";
  if (findNoteQuery(t, ctx.fragrances) && !findBottles(t, ctx.fragrances, true).length) return "note";
  const ask = parseAsk(t);
  if (RE.tonight.test(t) || ask.occasion || ask.weather || ask.season || ask.time || ask.mood) return "tonight";
  if (ctx.mentions.length) return "describe";
  return null;
}
