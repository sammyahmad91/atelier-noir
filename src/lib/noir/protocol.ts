import type { NoirCard } from "./types";

/**
 * The response body is plain streamed text. Cards travel on a final line, `\n[[noir:{json}]]`,
 * which the client strips before display. Model text never contains `[[`.
 */
const OPEN = "\n[[noir:";
const MARKER = /\n?\[\[noir:([\s\S]*?)\]\]\s*$/;

export function encodeCards(cards: NoirCard[]) {
  return `${OPEN}${JSON.stringify({ cards })}]]`;
}

export function splitStream(raw: string): { text: string; cards: NoirCard[] } {
  const done = raw.match(MARKER);
  if (done) {
    let cards: NoirCard[] = [];
    try {
      const parsed = JSON.parse(done[1]) as { cards?: NoirCard[] };
      cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    } catch {
      cards = [];
    }
    return { text: raw.slice(0, done.index).trimEnd(), cards };
  }
  // Mid-stream the marker may have arrived only in part; never show it.
  const partial = raw.indexOf("[[");
  return { text: partial === -1 ? raw.replace(/\[$/, "") : raw.slice(0, partial).trimEnd(), cards: [] };
}
