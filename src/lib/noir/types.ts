import type { Fragrance, Wear } from "@/db/schema";

export type NoirRole = "user" | "assistant";
export type NoirMessage = { role: NoirRole; content: string };

/** Everything a provider may read: the signed-in collector's own shelf and journal. */
export type NoirContext = {
  userName: string;
  fragrances: Fragrance[];
  wears: Wear[];
  now: Date;
};

export type BottleRef = { id: string; name: string; house: string; family: string; remaining: number };

export type NoirCard =
  | { kind: "bottle"; bottle: BottleRef; note?: string }
  | { kind: "layer"; a: BottleRef; b: BottleRef; score: number; verdict: string };

export type NoirIntent =
  | "greeting"
  | "tonight"
  | "layering"
  | "neglected"
  | "compliments"
  | "low"
  | "describe"
  | "note"
  | "gaps"
  | "fallback";

export type NoirReply = { intent: NoirIntent; text: string; cards: NoirCard[] };

export type NoirEvent = { type: "text"; value: string } | { type: "cards"; cards: NoirCard[] };

/** A provider streams text, then optionally the cards it wants rendered beneath the answer. */
export interface NoirModel {
  readonly name: string;
  respond(history: NoirMessage[], context: NoirContext, signal?: AbortSignal): AsyncIterable<NoirEvent>;
}
