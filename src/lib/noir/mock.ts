import { compose } from "./compose";
import type { NoirModel } from "./types";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });
}

/** Splits text roughly the way a tokenizer would: whole short words, long words in pieces. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const word of text.match(/\S+\s*/g) ?? []) {
    if (word.trim().length <= 7) {
      out.push(word);
      continue;
    }
    for (let i = 0; i < word.length; i += 4) out.push(word.slice(i, i + 4));
  }
  return out;
}

function pause(token: string) {
  const t = token.trimEnd();
  if (/[.!?:”]$/.test(t)) return 140 + Math.random() * 120;
  if (/[,;—]$/.test(t)) return 60 + Math.random() * 50;
  return 16 + Math.random() * 30;
}

export const mockModel: NoirModel = {
  name: "noir-mock-1",
  async *respond(history, context, signal) {
    const reply = compose(history, context);
    await sleep(450 + Math.random() * 450, signal);
    for (const token of tokenize(reply.text)) {
      if (signal?.aborted) return;
      yield { type: "text", value: token };
      await sleep(pause(token), signal);
    }
    if (reply.cards.length && !signal?.aborted) yield { type: "cards", cards: reply.cards };
  },
};
