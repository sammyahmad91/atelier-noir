import type { Fragrance } from "@/db/schema";
import {
  accordProfile,
  accordsForNote,
  currentSeason,
  currentTime,
  daysSince,
  dominantAccords,
  lastWornMap,
  layer,
  rankForTonight,
  scoreForTonight,
  warmth,
  type Accord,
  type Context,
  type Layering,
  type TonightPick,
} from "@/lib/engine";
import { greeting } from "@/lib/format";
import { FAMILIES, OCCASIONS, OCCASION_LABEL, SEASONS, type Family, type Occasion, type Season } from "@/lib/vocab";
import {
  detectIntent,
  findBottles,
  findNoteQuery,
  isFollowUp,
  lastBottles,
  normalize,
  parseAsk,
  refersBack,
  wantsAnother,
  type Ask,
  type Mood,
} from "./parse";
import type { BottleRef, NoirCard, NoirContext, NoirIntent, NoirMessage, NoirReply } from "./types";

// ─── Phrasing helpers ─────────────────────────────────────────────────────

const ref = (f: Fragrance): BottleRef => ({ id: f.id, name: f.name, house: f.house, family: f.family, remaining: f.remainingPct });
const bottleCard = (f: Fragrance, note?: string): NoirCard => ({ kind: "bottle", bottle: ref(f), note });
const layerCard = (a: Fragrance, b: Fragrance, l: Layering): NoirCard => ({ kind: "layer", a: ref(a), b: ref(b), score: l.score, verdict: l.verdict });

/** Bottle names are always written in full and wrapped in asterisks, which the UI renders as gilded italics. */
const em = (f: Fragrance) => `*${f.name}*`;
const NUMBERS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const num = (n: number) => NUMBERS[n] ?? String(n);
const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function restPhrase(d: number | null) {
  if (d === null) return "never worn";
  if (d === 0) return "worn today";
  if (d === 1) return "worn yesterday";
  return `${d} days at rest`;
}

// ─── Scene: everything one answer needs ──────────────────────────────────

type Scene = NoirContext & {
  text: string;
  history: NoirMessage[];
  prior: NoirMessage[];
  mentions: Fragrance[];
  remembered: Fragrance[];
  seed: number;
  vary: <T>(options: T[]) => T;
};

function contextFor(ask: Ask, now: Date): Context {
  const time = ask.time ?? currentTime(now);
  const season = ask.season ?? currentSeason(now);
  return {
    season,
    time,
    occasion: ask.occasion ?? (time === "night" ? "evening" : "everyday"),
    weather: ask.weather ?? (season === "summer" ? "hot" : season === "winter" ? "cold" : "mild"),
  };
}

/** Each user turn either refines the evening already being discussed or starts a new one. */
function resolveAsk(history: NoirMessage[]): Ask {
  let running: Ask = {};
  for (const m of history) {
    if (m.role !== "user") continue;
    const ask = parseAsk(m.content);
    running = isFollowUp(m.content) ? { ...running, ...ask } : ask;
  }
  return running;
}

/** Warmth (−1 airy … +1 dense) as a 0–100 reading. */
const warmthScale = (f: Fragrance) => Math.round((warmth(accordProfile(f)) + 1) * 50);

const ACCORD_ADJECTIVE: Record<Accord, string> = {
  Citrus: "citrus",
  Aquatic: "aquatic",
  Green: "green",
  Aromatic: "aromatic",
  Fruity: "fruity",
  Floral: "floral",
  Musk: "musky",
  Woody: "woody",
  Spicy: "spicy",
  Leather: "leathery",
  Amber: "ambery",
  Gourmand: "gourmand",
};

function moodScore(p: TonightPick, mood?: Mood) {
  if (!mood) return p.score;
  const w = warmth(accordProfile(p.fragrance));
  const i = p.fragrance.intensity;
  if (mood === "fresh") return p.score - w * 60;
  if (mood === "warm") return p.score + w * 60;
  if (mood === "soft") return p.score - (i - 2) * 7;
  return p.score + (i - 3) * 7;
}

const PLACEMENT: Record<Occasion, string> = {
  everyday: "on the neck and wrists",
  office: "on the chest, beneath the shirt, so it reads only at arm's length",
  evening: "at the neck and one on the inner wrist",
  date: "at the base of the throat, where someone leaning in will find it",
  ceremony: "at the pulse points, and one on the lapel to carry through the evening",
};

function sprayCount(f: Fragrance, c: Context) {
  let n = f.intensity >= 5 ? 1 : f.intensity === 4 ? 2 : f.intensity === 3 ? 3 : 4;
  if (c.occasion === "office" || c.weather === "hot") n = Math.max(1, n - 1);
  if (c.occasion === "ceremony" || c.weather === "cold") n += f.intensity >= 5 ? 0 : 1;
  return Math.min(n, 5);
}

function ritual(f: Fragrance, c: Context) {
  const n = sprayCount(f, c);
  const heat = c.weather === "hot" && f.intensity >= 4 ? " Heat will amplify it — resist a second pass." : "";
  return `${cap(num(n))} spray${n > 1 ? "s" : ""} ${PLACEMENT[c.occasion]}.${heat}`;
}

function setting(c: Context) {
  const when = c.time === "night" ? "tonight" : "today";
  const weather = { hot: " in the heat", cold: " with cold air outside", rain: " in the rain", mild: "" }[c.weather];
  if (c.occasion === "everyday") return `${c.time === "night" ? "a quiet evening" : "an ordinary day"}${weather}`;
  const occasion = { office: "the office", evening: "an evening out", date: "a date", ceremony: "a ceremony" }[c.occasion];
  return `${occasion} ${when}${weather}`;
}

function why(p: TonightPick, n = 3) {
  const plus = p.reasons.filter((r) => r.tone === "plus").slice(0, n);
  return plus.length ? `${cap(plus.map((r) => lower(r.text)).join("; "))}.` : "";
}

// ─── Intents ──────────────────────────────────────────────────────────────

function tonight(s: Scene): NoirReply {
  const ask = resolveAsk(s.history);
  const c = contextFor(ask, s.now);
  const ranked = rankForTonight(s.fragrances, c, s.wears, s.now.getTime());
  const followUp = s.prior.length > 0 && isFollowUp(s.text);
  const exclude = followUp && wantsAnother(s.text) ? s.remembered[0]?.id : undefined;
  const pool = ranked
    .filter((p) => p.fragrance.id !== exclude)
    .map((p) => ({ p, k: moodScore(p, ask.mood) }))
    .sort((x, y) => y.k - x.k)
    .map((x) => x.p);
  const where = setting(c);

  const named = s.mentions[0];
  if (named) {
    const mine = scoreForTonight(named, c, s.wears, s.now.getTime());
    const rank = ranked.findIndex((p) => p.fragrance.id === named.id) + 1;
    const best = ranked[0];
    if (rank === 1) {
      return {
        intent: "tonight",
        text: `${em(named)} is exactly where I'd land for ${where} — first on your shelf at ${mine.match}% accord. ${why(mine)} ${ritual(named, c)}`,
        cards: [bottleCard(named, `${mine.match}% accord`)],
      };
    }
    const plus = mine.reasons.filter((r) => r.tone === "plus").map((r) => lower(r.text));
    const minus = mine.reasons.filter((r) => r.tone === "minus").map((r) => lower(r.text));
    return {
      intent: "tonight",
      text: [
        `${em(named)} reads ${mine.match}% for ${where} — ${ordinal(rank)} of ${s.fragrances.length} on your shelf.`,
        plus.length ? `In its favour: ${plus.slice(0, 2).join("; ")}.` : "",
        minus.length ? `Against it: ${minus.slice(0, 2).join("; ")}.` : "",
        `If you want the surest choice, ${em(best.fragrance)} leads at ${best.match}%.`,
      ]
        .filter(Boolean)
        .join(" "),
      cards: [bottleCard(named, `${mine.match}% accord`), bottleCard(best.fragrance, `${best.match}% accord`)],
    };
  }

  const [best, alt] = pool;
  const moodLead = { fresh: "Something fresher", warm: "Something warmer", soft: "Something quieter", bold: "Something bolder" };
  const head =
    followUp && ask.mood
      ? `${moodLead[ask.mood]}, then: ${em(best.fragrance)}, at ${best.match}% accord for ${where}.`
      : s.vary([
          `For ${where}, I'd reach for ${em(best.fragrance)} — a ${best.match}% accord.`,
          `My choice for ${where} is ${em(best.fragrance)}, at ${best.match}% accord.`,
          `${cap(where)} calls for ${em(best.fragrance)}: ${best.match}% accord with the moment.`,
        ]);
  const caution = best.reasons.find((r) => r.tone === "minus");
  const previous = exclude ? s.fragrances.find((f) => f.id === exclude) : undefined;
  const contrast =
    previous && (ask.mood === "fresh" || ask.mood === "warm")
      ? `It sits at ${warmthScale(best.fragrance)} on my warmth scale, against ${warmthScale(previous)} for ${em(previous)}.`
      : "";
  const parts = [head, contrast, why(best), caution ? `One caution — ${lower(caution.text)}.` : "", ritual(best.fragrance, c)];
  if (alt) {
    const unlike = { fresh: "runs a shade warmer", warm: "runs a shade cooler", soft: "projects further", bold: "sits closer to the skin" };
    parts.push(
      ask.mood && alt.match > best.match
        ? `${em(alt.fragrance)} scores higher on paper, at ${alt.match}%, but ${unlike[ask.mood]}.`
        : s.vary([
            `Should you want an alternative, ${em(alt.fragrance)} follows at ${alt.match}%.`,
            `${em(alt.fragrance)} is a worthy second, at ${alt.match}%.`,
          ]),
    );
  }
  const cards = [bottleCard(best.fragrance, `${best.match}% accord`)];
  if (alt) cards.push(bottleCard(alt.fragrance, `${alt.match}% accord`));
  return { intent: "tonight", text: parts.filter(Boolean).join(" "), cards };
}

function readingOf(l: Layering) {
  const plus = l.reasons.filter((r) => r.tone === "plus").map((r) => r.text);
  const minus = l.reasons.filter((r) => r.tone === "minus").map((r) => lower(r.text));
  const out: string[] = [];
  if (plus.length) out.push(`${plus.slice(0, 2).join(". ")}.`);
  if (minus.length) out.push(`The risk: ${minus[0]}.`);
  return out.join(" ");
}

function ritualOf(l: Layering) {
  return `The ritual: ${num(l.baseSprays)} spray${l.baseSprays > 1 ? "s" : ""} of ${em(l.base)} first, the warmer foundation, then ${num(l.topSprays)} of ${em(l.top)} once it settles.`;
}

function layering(s: Scene): NoirReply {
  if (s.fragrances.length < 2) {
    return { intent: "layering", text: "Layering needs two bottles, and your shelf holds only one. Add a second and I'll compose the pair.", cards: [] };
  }
  let a: Fragrance | undefined;
  let b: Fragrance | undefined;
  const [m0, m1] = s.mentions;
  if (m0 && m1) [a, b] = [m0, m1];
  else if (m0 && refersBack(s.text) && s.remembered[0] && s.remembered[0].id !== m0.id) [a, b] = [s.remembered[0], m0];
  else a = m0 ?? s.remembered[0];

  const partnersFor = (x: Fragrance) =>
    s.fragrances
      .filter((f) => f.id !== x.id)
      .map((f) => ({ f, l: layer(x, f) }))
      .sort((p, q) => q.l.score - p.l.score);

  if (a && b) {
    const l = layer(a, b);
    const parts = [
      `${em(a)} with ${em(b)}: ${l.verdict}, ${l.score} out of 100.`,
      readingOf(l),
      l.verdict === "Discordant" ? "I'd keep them for separate evenings." : ritualOf(l),
    ];
    const cards = [layerCard(a, b, l)];
    if (l.verdict === "Discordant" || l.verdict === "Daring") {
      const better = partnersFor(a)[0];
      if (better && better.f.id !== b.id) {
        parts.push(`For a surer partner to ${em(a)}, try ${em(better.f)} — ${better.l.verdict}, ${better.l.score}.`);
        cards.push(layerCard(a, better.f, better.l));
      }
    }
    return { intent: "layering", text: parts.filter(Boolean).join(" "), cards };
  }

  if (a) {
    const base = a;
    const skip = wantsAnother(s.text) && s.remembered[0]?.id === base.id ? s.remembered[1]?.id : undefined;
    const [best, alt] = partnersFor(base).filter((p) => p.f.id !== skip);
    const head = s.vary([
      `For ${em(base)}, the finest partner on your shelf is ${em(best.f)} — ${best.l.verdict}, ${best.l.score} out of 100.`,
      `${em(base)} finds its best match in ${em(best.f)}: ${best.l.verdict}, ${best.l.score} out of 100.`,
    ]);
    const parts = [head, readingOf(best.l), ritualOf(best.l)];
    const cards = [layerCard(base, best.f, best.l)];
    if (alt) {
      parts.push(`Runner-up: ${em(alt.f)}, ${lower(alt.l.verdict)} at ${alt.l.score}.`);
      cards.push(layerCard(base, alt.f, alt.l));
    }
    return { intent: "layering", text: parts.join(" "), cards };
  }

  let top: { x: Fragrance; y: Fragrance; l: Layering } | null = null;
  for (let i = 0; i < s.fragrances.length; i++) {
    for (let j = i + 1; j < s.fragrances.length; j++) {
      const l = layer(s.fragrances[i], s.fragrances[j]);
      if (!top || l.score > top.l.score) top = { x: s.fragrances[i], y: s.fragrances[j], l };
    }
  }
  const { x, y, l } = top!;
  return {
    intent: "layering",
    text: [
      `The ${l.verdict === "Sublime" ? "most sublime" : "strongest"} pairing on your shelf is ${em(x)} with ${em(y)} — ${l.verdict}, ${l.score} out of 100.`,
      readingOf(l),
      ritualOf(l),
      "Name a bottle and I'll find its partner.",
    ].join(" "),
    cards: [layerCard(x, y, l)],
  };
}

function neglected(s: Scene): NoirReply {
  const last = lastWornMap(s.wears);
  const now = s.now.getTime();
  const rows = s.fragrances
    .map((f) => ({ f, d: daysSince(last.get(f.id), now) }))
    .sort((x, y) => (y.d ?? 9999) - (x.d ?? 9999));
  const dusty = rows.filter((r) => r.d === null || r.d >= 21);

  if (!dusty.length) {
    const { f, d } = rows[0];
    return {
      intent: "neglected",
      text: `Nothing is truly neglected — every bottle has touched skin in the last three weeks. ${em(f)} has rested longest, at ${d} days; it may be its turn.`,
      cards: [bottleCard(f, restPhrase(d))],
    };
  }

  const named = dusty.slice(0, 3).map(({ f, d }) => `${em(f)} (${d === null ? "never worn" : `${d} days`})`);
  const c = contextFor({}, s.now);
  const fit = rankForTonight(
    dusty.map((r) => r.f),
    c,
    s.wears,
    now,
  )[0];
  const parts = [
    dusty.length === 1
      ? `One bottle is gathering dust: ${named[0]}.`
      : `${cap(num(dusty.length))} bottles have waited three weeks or more: ${list(named)}${dusty.length > 3 ? `, and ${plural(dusty.length - 3, "other")}` : ""}.`,
    `Of these, ${em(fit.fragrance)} suits ${c.time === "night" ? "tonight" : "today"} best — ${fit.match}% accord. ${why(fit, 2)}`,
    "A bottle unworn is a story unfinished.",
  ];
  return {
    intent: "neglected",
    text: parts.join(" "),
    cards: dusty.slice(0, 3).map(({ f, d }) => bottleCard(f, d === null ? "Never worn" : `${d} days at rest`)),
  };
}

function compliments(s: Scene): NoirReply {
  const stats = s.fragrances
    .map((f) => {
      const mine = s.wears.filter((w) => w.fragranceId === f.id);
      const total = mine.reduce((n, w) => n + w.compliments, 0);
      const byOccasion = OCCASIONS.map((o) => {
        const ws = mine.filter((w) => w.occasion === o);
        return { o, avg: ws.length ? ws.reduce((n, w) => n + w.compliments, 0) / ws.length : 0 };
      }).sort((x, y) => y.avg - x.avg)[0];
      return { f, wears: mine.length, total, avg: mine.length ? total / mine.length : 0, best: byOccasion };
    })
    .filter((x) => x.wears > 0);

  const asksMostWorn = /\b(most worn|wear most|worn most|signature)\b/.test(normalize(s.text));
  if (asksMostWorn && stats.length) {
    const top = [...stats].sort((x, y) => y.wears - x.wears || y.total - x.total)[0];
    return {
      intent: "compliments",
      text: `Your signature, by the journal, is ${em(top.f)}: ${plural(top.wears, "wear")} of ${s.wears.length}, earning ${plural(top.total, "compliment")}. It is ${top.f.remainingPct}% full, so the habit is sustainable.`,
      cards: [bottleCard(top.f, `${plural(top.wears, "wear")}`)],
    };
  }

  const all = s.wears.reduce((n, w) => n + w.compliments, 0);
  if (!all) {
    return {
      intent: "compliments",
      text: "No compliments are logged yet. Note them in the journal after each wear, and I'll tell you which bottle turns heads — and on which occasions.",
      cards: [],
    };
  }
  const [top, next] = [...stats].sort((x, y) => y.total - x.total || y.avg - x.avg);
  const parts = [
    `${em(top.f)} is your most admired: ${plural(top.total, "compliment")} across ${plural(top.wears, "wear")}, ${top.avg.toFixed(1)} each time.`,
  ];
  if (top.best.avg > 0) parts.push(`It shines brightest at ${OCCASION_LABEL[top.best.o].toLowerCase()}, where it averages ${top.best.avg.toFixed(1)}.`);
  if (next && next.total > 0) {
    parts.push(
      next.avg > top.avg
        ? `${em(next.f)} follows with ${next.total} from ${plural(next.wears, "wear")} — the highest rate on your shelf, at ${next.avg.toFixed(1)}.`
        : `${em(next.f)} follows with ${next.total} from ${plural(next.wears, "wear")}.`,
    );
  }
  parts.push(`In all, ${plural(s.wears.length, "logged wear")} have earned you ${all}.`);
  const cards = [bottleCard(top.f, plural(top.total, "compliment"))];
  if (next && next.total > 0) cards.push(bottleCard(next.f, plural(next.total, "compliment")));
  return { intent: "compliments", text: parts.join(" "), cards };
}

/** Millilitres and sprays left (~0.1 ml per spray, ~3 per wear), how long they last at the logged pace, and whether it's in season. */
function levelOf(f: Fragrance, s: Scene) {
  const ml = Math.round((f.sizeMl * f.remainingPct) / 100);
  const sprays = Math.round(ml * 10);
  const wearsLeft = Math.floor(sprays / 3);
  const now = s.now.getTime();
  const recent = s.wears.filter((w) => w.fragranceId === f.id && now - w.wornAt.getTime() < 60 * 86_400_000).length;
  const months = recent ? Math.max(1, Math.round(wearsLeft / (recent / 2))) : 0;
  const pace = !recent
    ? "You've not reached for it lately, so it will keep."
    : months <= 18
      ? `At your pace of ${plural(recent, "wear")} in two months, that is about ${plural(months, "month")}.`
      : `At your pace of ${plural(recent, "wear")} in two months, it will outlast ${Math.round(months / 12)} years of evenings.`;
  const season = currentSeason(s.now);
  const i = SEASONS.indexOf(season);
  const next = [1, 2, 3].map((k) => SEASONS[(i + k) % 4]).find((x) => f.seasons.includes(x));
  const timing = f.seasons.includes(season)
    ? f.remainingPct < 25
      ? "It is in season now: ration it, or reorder."
      : "It is in season now, so wear it freely."
    : `It rests out of season until ${next ?? "its moment comes"}, so the last drops can wait.`;
  return `about ${ml} ml, or ${sprays} sprays. ${pace} ${timing}`;
}

function low(s: Scene): NoirReply {
  const sorted = [...s.fragrances].sort((a, b) => a.remainingPct - b.remainingPct);
  const lowOnes = sorted.filter((f) => f.remainingPct < 25);
  if (!lowOnes.length) {
    const f = sorted[0];
    return {
      intent: "low",
      text: `Nothing is running low. The emptiest is ${em(f)}, still ${f.remainingPct}% full — roughly ${Math.round((f.sizeMl * f.remainingPct) / 100)} ml, which is a great many evenings.`,
      cards: [bottleCard(f, `${f.remainingPct}% left`)],
    };
  }

  const lines = lowOnes.slice(0, 3).map((f) => `${em(f)} is down to ${f.remainingPct}% — ${levelOf(f, s)}`);
  return {
    intent: "low",
    text: [lowOnes.length > 1 ? `${cap(num(lowOnes.length))} bottles are running low.` : "", ...lines].filter(Boolean).join(" "),
    cards: lowOnes.slice(0, 3).map((f) => bottleCard(f, `${f.remainingPct}% left`)),
  };
}

function describe(s: Scene): NoirReply {
  const f = s.mentions[0] ?? s.remembered[0];
  if (!f) return fallback(s);
  if (/\b(how much|left|remain\w*|level|full)\b/.test(normalize(s.text))) {
    return {
      intent: "describe",
      text: `${em(f)} holds ${f.remainingPct}% of its ${f.sizeMl} ml — ${levelOf(f, s)}`,
      cards: [bottleCard(f, `${f.remainingPct}% left`)],
    };
  }
  const profile = accordProfile(f);
  const dom = dominantAccords(profile, 3).map((a) => a.toLowerCase());
  const mine = s.wears.filter((w) => w.fragranceId === f.id);
  const compl = mine.reduce((n, w) => n + w.compliments, 0);
  const d = daysSince(lastWornMap(mine).get(f.id), s.now.getTime());
  const notes = (xs: string[]) => list(xs.slice(0, 3).map((n) => n.toLowerCase()));
  const hours = f.timeOfDay === "both" ? "day or night" : f.timeOfDay === "night" ? "after dark" : "by daylight";
  const worn = mine.length
    ? `You've worn it ${mine.length === 1 ? "once" : mine.length === 2 ? "twice" : `${mine.length} times`}, last ${d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`}, for ${plural(compl, "compliment")}.`
    : "You haven't worn it yet — it has been waiting.";
  const parts = [
    `${em(f)}, by ${f.house} — ${/^[AEIOU]/.test(f.family) ? "an" : "a"} ${f.family.toLowerCase()} ${f.concentration}${f.year ? ` from ${f.year}` : ""}.`,
    `It opens on ${notes(f.topNotes)}, turns to ${notes(f.heartNotes)} and settles into ${notes(f.baseNotes)}; the accord reads ${list(dom)}.`,
    worn,
    `${f.remainingPct}% of ${f.sizeMl} ml remains. Made for ${list(f.seasons)}, ${hours}.`,
  ];
  if (f.story) parts.push(`In your words: “${f.story.trim()}”`);
  return { intent: "describe", text: parts.join(" "), cards: [bottleCard(f, `${f.remainingPct}% left`)] };
}

function note(s: Scene): NoirReply {
  const q = findNoteQuery(s.text, s.fragrances);
  if (!q) return fallback(s);
  const c = contextFor(resolveAsk(s.history), s.now);
  const rank = (fs: Fragrance[]) => rankForTonight(fs, c, s.wears, s.now.getTime());

  if (q.kind === "accord") {
    const scored = s.fragrances
      .map((f) => ({ f, share: accordProfile(f)[q.accord] }))
      .filter((x) => x.share >= 0.12)
      .sort((x, y) => y.share - x.share);
    if (!scored.length) {
      return { intent: "note", text: `Nothing on your shelf leans ${ACCORD_ADJECTIVE[q.accord]} — a gap worth filling, if the mood interests you.`, cards: [] };
    }
    const best = rank(scored.slice(0, 4).map((x) => x.f))[0];
    const named = scored.slice(0, 3).map((x) => `${em(x.f)} (${Math.round(x.share * 100)}% of its accord)`);
    return {
      intent: "note",
      text: `${scored.length === 1 ? "Your only" : "Your most"} ${ACCORD_ADJECTIVE[q.accord]} ${scored.length === 1 ? "bottle is" : "bottles are"} ${list(named)}. For ${setting(c)}, ${em(best.fragrance)} is the one to wear — ${best.match}% accord. ${why(best, 2)}`,
      cards: scored.slice(0, 3).map((x) => bottleCard(x.f, `${Math.round(x.share * 100)}% ${q.accord.toLowerCase()}`)),
    };
  }

  const word = q.word;
  const tierOf = (f: Fragrance) => {
    const has = (xs: string[]) => xs.some((n) => normalize(n).includes(word));
    return has(f.baseNotes) ? "base" : has(f.heartNotes) ? "heart" : has(f.topNotes) ? "opening" : null;
  };
  const hits = s.fragrances.map((f) => ({ f, tier: tierOf(f) })).filter((x) => x.tier);
  if (!hits.length) {
    const accord = accordsForNote(word)[0];
    const near = accord
      ? s.fragrances.map((f) => ({ f, share: accordProfile(f)[accord] })).sort((x, y) => y.share - x.share)[0]
      : undefined;
    return {
      intent: "note",
      text: near && near.share > 0
        ? `None of your ${plural(s.fragrances.length, "bottle")} lists ${word}. The nearest in spirit is ${em(near.f)}, your most ${ACCORD_ADJECTIVE[accord]} scent at ${Math.round(near.share * 100)}% of its accord.`
        : `None of your ${plural(s.fragrances.length, "bottle")} lists ${word} — a note to look for on your next visit to a perfumer.`,
      cards: near && near.share > 0 ? [bottleCard(near.f, `${Math.round(near.share * 100)}% ${accord.toLowerCase()}`)] : [],
    };
  }
  const best = rank(hits.map((h) => h.f))[0];
  const named = hits.slice(0, 4).map((h) => `${em(h.f)} in the ${h.tier}`);
  return {
    intent: "note",
    text: [
      hits.length === 1 ? `Only one bottle carries ${word}: ${named[0]}.` : `${cap(num(hits.length))} of your bottles carry ${word}: ${list(named)}.`,
      hits.length > 1 ? `For ${setting(c)}, ${em(best.fragrance)} is the better choice — ${best.match}% accord.` : `For ${setting(c)}, it reads ${best.match}% accord.`,
      why(best, 2),
    ]
      .filter(Boolean)
      .join(" "),
    cards: hits.slice(0, 3).map((h) => bottleCard(h.f, `${cap(word)} · ${h.tier}`)),
  };
}

const FAMILY_SEASONS: Record<Family, Season[]> = {
  Citrus: ["spring", "summer"],
  Aquatic: ["summer"],
  Green: ["spring", "summer"],
  Aromatic: ["spring", "summer", "autumn"],
  Floral: ["spring", "summer"],
  Chypre: ["spring", "autumn"],
  Woody: ["autumn", "winter"],
  Amber: ["autumn", "winter"],
  Gourmand: ["winter", "autumn"],
  Leather: ["autumn", "winter"],
};

const EXEMPLARS: Record<Family, [string, string]> = {
  Citrus: ["Hermès Eau d'Orange Verte", "Acqua di Parma Colonia"],
  Aquatic: ["Issey Miyake L'Eau d'Issey", "Orto Parisi Megamare"],
  Green: ["Hermès Un Jardin sur le Nil", "Chanel No. 19"],
  Aromatic: ["Guerlain Jicky", "Penhaligon's Sartorial"],
  Floral: ["Chanel No. 5", "Serge Lutens Fleurs d'Oranger"],
  Chypre: ["Guerlain Mitsouko", "Chanel 31 Rue Cambon"],
  Woody: ["Chanel Sycomore", "Diptyque Tam Dao"],
  Amber: ["Guerlain Shalimar", "Serge Lutens Ambre Sultan"],
  Gourmand: ["Guerlain Spiritueuse Double Vanille", "Kilian Angels' Share"],
  Leather: ["Chanel Cuir de Russie", "Hermès Bel Ami"],
};

function gaps(s: Scene): NoirReply {
  const coverage = SEASONS.map((season) => ({ season, n: s.fragrances.filter((f) => f.seasons.includes(season)).length })).sort(
    (a, b) => a.n - b.n,
  );
  const thin = coverage[0];
  const owned = new Set(s.fragrances.map((f) => f.family));
  const missing = FAMILIES.filter((f) => !owned.has(f));
  const season0 = currentSeason(s.now);
  const occasionFit = OCCASIONS.map((o) => {
    const c = contextFor({ occasion: o, time: o === "office" ? "day" : o === "everyday" ? "day" : "night", season: season0 }, s.now);
    return { o, best: rankForTonight(s.fragrances, c, s.wears, s.now.getTime())[0] };
  }).sort((a, b) => a.best.match - b.best.match)[0];

  const want = missing.find((f) => FAMILY_SEASONS[f].includes(thin.season)) ?? missing[0];
  const parts = [
    thin.n === 0
      ? `Your shelf has nothing made for ${thin.season}.`
      : `Your shelf is thinnest in ${thin.season}: only ${plural(thin.n, "bottle")} ${thin.n === 1 ? "is" : "are"} made for it.`,
    missing.length
      ? `${cap(num(missing.length))} of ten families are absent — ${list(missing.slice(0, 4).map((f) => f.toLowerCase()))}${missing.length > 4 ? " among them" : ""}.`
      : "Every family is represented — a rare, complete wardrobe.",
    `Your weakest occasion is ${OCCASION_LABEL[occasionFit.o].toLowerCase()}: the best you own scores ${occasionFit.best.match}%.`,
  ];
  if (want) {
    const [x, y] = EXEMPLARS[want];
    parts.push(`I'd look for ${/^[AEIOU]/.test(want) ? "an" : "a"} ${want.toLowerCase()} made for ${thin.season} — ${x} or ${y} would close the gap without echoing anything you own.`);
  }
  return { intent: "gaps", text: parts.join(" "), cards: [bottleCard(occasionFit.best.fragrance, `Best for ${OCCASION_LABEL[occasionFit.o].toLowerCase()}`)] };
}

function hello(s: Scene): NoirReply {
  const sample = s.fragrances[hash(s.userName) % s.fragrances.length];
  return {
    intent: "greeting",
    text: `${greeting(s.now)}, ${s.userName}. I'm NOIR — I've read all ${plural(s.fragrances.length, "bottle")} on your shelf and ${plural(s.wears.length, "night")} in your journal. Ask me in your own words: what to wear for a rainy evening, what layers with ${em(sample)}, which bottle you've neglected, or which one earns the compliments.`,
    cards: [],
  };
}

function fallback(s: Scene): NoirReply {
  const sample = s.fragrances[s.seed % s.fragrances.length];
  return {
    intent: "fallback",
    text: s.vary([
      `I'm not sure I followed — my world is your shelf and your journal. Try asking what to wear for a cold evening out, what pairs with ${em(sample)}, or what's running low.`,
      `Forgive me, that one escapes me. I can choose for tonight, compose a layer, find a note, or tell you about ${em(sample)} — ask me any of those.`,
    ]),
    cards: [],
  };
}

const HANDLERS: Record<NoirIntent, (s: Scene) => NoirReply> = {
  greeting: hello,
  tonight,
  layering,
  neglected,
  compliments,
  low,
  describe,
  note,
  gaps,
  fallback,
};

/** The mock model's brain: a pure function of the conversation and the collector's own data. */
export function compose(history: NoirMessage[], context: NoirContext): NoirReply {
  const lastIdx = history.findLastIndex((m) => m.role === "user");
  const text = lastIdx >= 0 ? history[lastIdx].content : "";
  const prior = history.slice(0, Math.max(0, lastIdx));
  const { fragrances } = context;

  if (!fragrances.length) {
    return {
      intent: "fallback",
      text: `${greeting(context.now)}, ${context.userName}. Your shelf is still empty — add a first bottle and I'll begin choosing for you, by season, weather, occasion and rest.`,
      cards: [],
    };
  }

  const mentions = findBottles(text, fragrances);
  const remembered = lastBottles(prior, fragrances);
  let intent = detectIntent(text, { mentions, remembered, fragrances });
  if (!intent && prior.length && isFollowUp(text)) {
    const previous = prior.findLast((m) => m.role === "user");
    if (previous) intent = detectIntent(previous.content, { mentions: findBottles(previous.content, fragrances), remembered, fragrances });
  }

  const seed = hash(text) + history.length;
  const scene: Scene = {
    ...context,
    text,
    history,
    prior,
    mentions,
    remembered,
    seed,
    vary: (options) => options[seed % options.length],
  };
  return HANDLERS[intent ?? "fallback"](scene);
}
