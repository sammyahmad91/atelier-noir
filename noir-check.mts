import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "./src/db/schema.ts";
import { compose } from "./src/lib/noir/compose.ts";
import { mockModel } from "./src/lib/noir/mock.ts";
import { encodeCards, splitStream } from "./src/lib/noir/protocol.ts";
import type { NoirMessage } from "./src/lib/noir/types.ts";

const db = drizzle(createClient({ url: "file:local.db" }), { schema });
const [user] = await db.select().from(schema.users).where(eq(schema.users.email, "demo@ateliernoir.app"));
const fragrances = await db.select().from(schema.fragrances).where(eq(schema.fragrances.userId, user.id));
const wears = await db.select().from(schema.wears).where(eq(schema.wears.userId, user.id));
const ctx = { userName: user.name, fragrances, wears, now: new Date() };
console.log(`${user.name}: ${fragrances.length} bottles, ${wears.length} wears\n`);

const conversations: string[][] = [
  ["Hello"],
  ["What should I wear tonight for a date?", "what about something fresher?", "layer it with something"],
  ["Which bottles am I neglecting?"],
  ["What layers well with Santal 33?"],
  ["I need something fresh for a hot office day"],
  ["Which scent gets me the most compliments?"],
  ["What's running low?"],
  ["Tell me about BR540", "how much is left of it?"],
  ["something with vanilla"],
  ["anything smoky for a cold evening?"],
  ["What should I buy next?"],
  ["Layer Tuscan Leather with Acqua di Gio"],
  ["Is Aventus good for a wedding tonight?"],
  ["what's my signature?"],
  ["do you have anything with oud?"],
  ["purple monkey dishwasher"],
];

for (const turns of conversations) {
  const history: NoirMessage[] = [];
  for (const t of turns) {
    history.push({ role: "user", content: t });
    const r = compose(history, ctx);
    console.log(`> ${t}\n[${r.intent}] ${r.text}\n  cards: ${r.cards.map((c) => (c.kind === "bottle" ? `${c.bottle.name} (${c.note})` : `${c.a.name} + ${c.b.name} = ${c.score} ${c.verdict}`)).join(" | ")}\n`);
    history.push({ role: "assistant", content: r.text });
  }
}

// Streaming path + protocol round trip
let raw = "";
const t0 = Date.now();
let chunks = 0;
for await (const ev of mockModel.respond([{ role: "user", content: "What's running low?" }], ctx)) {
  raw += ev.type === "text" ? ev.value : encodeCards(ev.cards);
  chunks++;
}
const parsed = splitStream(raw);
console.log(`stream: ${chunks} chunks in ${Date.now() - t0}ms; cards parsed: ${parsed.cards.length}; marker stripped: ${!parsed.text.includes("[[")}`);
console.log(`partial marker hidden: ${JSON.stringify(splitStream("Hello there.\n[[noir:{\"ca").text)}`);
