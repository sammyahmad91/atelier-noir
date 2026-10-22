"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Flacon } from "@/components/flacon";
import { splitStream } from "@/lib/noir/protocol";
import type { BottleRef, NoirCard } from "@/lib/noir/types";

type Turn = { id: string; role: "user" | "assistant"; content: string; cards?: NoirCard[]; error?: boolean };
type Phase = "idle" | "composing" | "streaming";

// ─── Conversation store: client state mirrored into sessionStorage ───────

const EMPTY: Turn[] = [];

type Store = { get: () => Turn[]; set: (next: Turn[], persist?: boolean) => void; subscribe: (fn: () => void) => () => void };
const stores = new Map<string, Store>();

function restore(key: string): Turn[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    if (!Array.isArray(parsed)) return EMPTY;
    const turns = parsed.filter(
      (t): t is Turn => !!t && typeof t.id === "string" && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && !!t.content,
    );
    return turns.length ? turns : EMPTY;
  } catch {
    return EMPTY;
  }
}

function storeFor(key: string): Store {
  const existing = stores.get(key);
  if (existing) return existing;
  let turns: Turn[] | null = null;
  const listeners = new Set<() => void>();
  const store: Store = {
    get: () => (turns ??= restore(key)),
    set: (next, persist = true) => {
      turns = next;
      if (persist) {
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {}
      }
      listeners.forEach((fn) => fn());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  stores.set(key, store);
  return store;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ─── Pieces ───────────────────────────────────────────────────────────────

/** NOIR wraps bottle names in asterisks; they render as gilded italics. */
function Rich({ text, caret }: { text: string; caret?: boolean }) {
  const paras = text.split(/\n{2,}/);
  return paras.map((para, i) => (
    <p key={i}>
      {para.split("*").map((seg, j) =>
        j % 2 ? (
          <em key={j} className="text-gold">
            {seg}
          </em>
        ) : (
          seg
        ),
      )}
      {caret && i === paras.length - 1 && <span className="caret" aria-hidden />}
    </p>
  ));
}

function Monogram({ size = 96 }: { size?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <span className="glow absolute inset-[-60%] rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.22),transparent_62%)]" />
      <span className="absolute inset-[18%] rotate-45 border border-gold/50" />
      <span className="absolute inset-[30%] rotate-45 border border-gold/20" />
      <span className="relative block h-2.5 w-2.5 rotate-45 bg-gold shadow-[0_0_18px_rgba(201,164,106,0.8)]" />
    </span>
  );
}

function BottleCard({ bottle, note, delay }: { bottle: BottleRef; note?: string; delay: number }) {
  return (
    <Link
      href={`/atelier/wardrobe/${bottle.id}`}
      className="panel reveal group flex items-center gap-4 px-4 py-3 transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.4)]"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <Flacon name={bottle.name} family={bottle.family} remaining={bottle.remaining} size={28} />
      <div className="min-w-0 flex-1">
        <p className="eyebrow truncate text-[0.52rem]">{bottle.house}</p>
        <p className="display mt-1 truncate text-xl transition-colors group-hover:text-gold">{bottle.name}</p>
      </div>
      {note && <span className="shrink-0 font-serif text-sm italic text-gold">{note}</span>}
    </Link>
  );
}

function LayerCard({ a, b, score, verdict, delay }: { a: BottleRef; b: BottleRef; score: number; verdict: string; delay: number }) {
  return (
    <Link
      href={`/atelier/layering?a=${a.id}&b=${b.id}`}
      className="panel reveal group flex items-center gap-4 px-4 py-3 transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.4)]"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <span className="flex shrink-0 items-end">
        <Flacon name={a.name} family={a.family} remaining={a.remaining} size={26} />
        <Flacon name={b.name} family={b.family} remaining={b.remaining} size={26} className="-ml-2" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-[0.52rem]">Layering · {verdict}</p>
        <p className="display mt-1 truncate text-xl transition-colors group-hover:text-gold">
          {a.name} <span className="italic text-gold">&amp;</span> {b.name}
        </p>
      </div>
      <span className="display shrink-0 text-2xl text-gold tabular-nums">{score}</span>
    </Link>
  );
}

function Cards({ cards }: { cards: NoirCard[] }) {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {cards.map((c, i) =>
        c.kind === "bottle" ? (
          <BottleCard key={`${c.bottle.id}-${i}`} bottle={c.bottle} note={c.note} delay={i * 110} />
        ) : (
          <LayerCard key={`${c.a.id}-${c.b.id}-${i}`} a={c.a} b={c.b} score={c.score} verdict={c.verdict} delay={i * 110} />
        ),
      )}
    </div>
  );
}

// ─── Concierge ────────────────────────────────────────────────────────────

export function NoirConcierge({
  storageKey,
  bottles,
  wears,
  suggestions,
}: {
  storageKey: string;
  bottles: number;
  wears: number;
  suggestions: string[];
}) {
  const store = storeFor(storageKey);
  const turns = useSyncExternalStore(store.subscribe, store.get, () => EMPTY);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickRef = useRef(true);
  const busy = phase !== "idle";

  useEffect(() => {
    const onScroll = () => {
      stickRef.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (turns.length && stickRef.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  function patch(id: string, change: Partial<Turn>, persist = false) {
    store.set(
      store.get().map((t) => (t.id === id ? { ...t, ...change } : t)),
      persist,
    );
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const question: Turn = { id: uid(), role: "user", content };
    const answer: Turn = { id: uid(), role: "assistant", content: "" };
    const history = [...store.get(), question];
    stickRef.current = true;
    store.set([...history, answer], false);
    setInput("");
    setPhase("composing");

    const controller = new AbortController();
    abortRef.current = controller;
    let shown = "";
    try {
      const res = await fetch("/api/noir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((t) => !t.error)
            .slice(-20)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (res.status === 401) {
        patch(answer.id, { content: "Your session has ended. Sign in again, and I'll be here.", error: true });
        return;
      }
      if (!res.ok || !res.body) throw new Error(`NOIR responded ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const { text } = splitStream(raw);
        if (text && text !== shown) {
          shown = text;
          setPhase("streaming");
          patch(answer.id, { content: text });
        }
      }
      const { text: final, cards } = splitStream(raw + decoder.decode());
      patch(answer.id, { content: final || "…", cards: cards.length ? cards : undefined });
    } catch {
      if (controller.signal.aborted) {
        if (!shown) store.set(store.get().filter((t) => t.id !== answer.id), false);
      } else {
        patch(answer.id, { content: "The line to the atelier went quiet for a moment. Ask me once more?", error: true });
      }
    } finally {
      abortRef.current = null;
      store.set(store.get(), true);
      setPhase("idle");
    }
  }

  function reset() {
    abortRef.current?.abort();
    store.set(EMPTY);
  }

  const last = turns[turns.length - 1];

  return (
    <div className="-mb-28 flex min-h-[calc(100svh-5.5rem)] flex-col">
      {turns.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="reveal">
            <Monogram />
          </div>
          <p className="eyebrow reveal mt-10" style={{ "--d": "120ms" } as React.CSSProperties}>
            Concierge privé
          </p>
          <h1 className="display reveal mt-5 text-6xl tracking-[0.18em] md:text-7xl" style={{ "--d": "200ms" } as React.CSSProperties}>
            NOIR <span className="italic tracking-normal text-gold">AI</span>
          </h1>
          <p className="reveal mx-auto mt-6 max-w-xl font-serif text-xl italic leading-snug text-mist" style={{ "--d": "300ms" } as React.CSSProperties}>
            Your wardrobe, in conversation — ask in your own words, and I&apos;ll answer from {bottles} bottle{bottles === 1 ? "" : "s"} and{" "}
            {wears} logged wear{wears === 1 ? "" : "s"}.
          </p>
          <div className="reveal mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3" style={{ "--d": "420ms" } as React.CSSProperties}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="px-4 py-2 font-serif text-[1.05rem] italic text-mist shadow-[inset_0_0_0_1px_var(--line)] transition-all duration-300 hover:text-parchment hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.55)]"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-3xl flex-1 pt-14">
          <div className="flex items-center justify-between border-b hairline pb-5">
            <p className="eyebrow flex items-center gap-3">
              <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
              Noir AI · In conversation
            </p>
            <button type="button" onClick={reset} className="link-quiet text-[0.62rem] tracking-[0.28em] uppercase">
              Begin anew
            </button>
          </div>
          <ol className="space-y-12 py-12" aria-busy={busy}>
            {turns.map((t) =>
              t.role === "user" ? (
                <li key={t.id} className="flex justify-end">
                  <div className="max-w-[80%] border-r border-gold/30 pr-5 text-right">
                    <p className="eyebrow text-[0.54rem] text-dust">You</p>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-parchment/75">{t.content}</p>
                  </div>
                </li>
              ) : (
                <li key={t.id} className="grid grid-cols-[1rem_1fr] gap-5">
                  <span
                    className={`mt-[0.3rem] block h-2 w-2 rotate-45 ${t.error ? "bg-rouge" : "bg-gold shadow-[0_0_14px_rgba(201,164,106,0.7)]"}`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className={`eyebrow text-[0.54rem] ${t.error ? "text-rouge" : "text-gold"}`}>Noir</p>
                    {t.content ? (
                      <div className="mt-3 space-y-4 font-serif text-[1.32rem] leading-[1.55] text-parchment/90">
                        <Rich text={t.content} caret={phase === "streaming" && t.id === last?.id} />
                      </div>
                    ) : (
                      <p className="shimmer mt-3 font-serif text-[1.2rem] italic">NOIR is composing…</p>
                    )}
                    {t.cards && t.cards.length > 0 && <Cards cards={t.cards} />}
                    {t.error && t.content.startsWith("Your session") && (
                      <Link href="/login" className="btn btn-ghost mt-6">
                        Sign in
                      </Link>
                    )}
                  </div>
                </li>
              ),
            )}
          </ol>
        </section>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) abortRef.current?.abort();
          else send(input);
        }}
        className="sticky bottom-0 z-10 -mx-6 bg-gradient-to-t from-ink from-60% to-transparent px-6 pt-10 pb-8 md:-mx-10 md:px-10"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-6">
          <label className="flex-1">
            <span className="sr-only">Ask NOIR</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (!busy) send(input);
              }}
              placeholder="Ask about tonight, a layer, a note, a forgotten bottle…"
              className="field font-serif !text-xl"
              maxLength={600}
              autoComplete="off"
              enterKeyHint="send"
            />
          </label>
          {busy ? (
            <button type="submit" className="btn btn-ghost">
              Stop
            </button>
          ) : (
            <button type="submit" className="btn btn-gold disabled:cursor-default" disabled={!input.trim()}>
              Send
            </button>
          )}
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-[0.58rem] tracking-[0.28em] text-dust uppercase">
          Enter to send · Answers drawn from your own shelf and journal
        </p>
      </form>
    </div>
  );
}
