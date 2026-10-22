"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { enterDemo } from "@/app/actions/auth";

const PROMPTS = ["What should I wear tonight for a date?", "Which bottles am I neglecting?", "What's running low?"];

const noirHref = (q?: string) => (q ? `/atelier/noir?q=${encodeURIComponent(q)}` : "/atelier/noir");

function PendingAware({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-60`}>
      {children}
    </button>
  );
}

/** Visitors without a session enter the demo atelier first; the action only redirects within /atelier. */
function Go({ demo, q, className, children }: { demo: boolean; q?: string; className: string; children: React.ReactNode }) {
  if (!demo) {
    return (
      <Link href={noirHref(q)} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <form action={enterDemo}>
      <input type="hidden" name="next" value={noirHref(q)} />
      <PendingAware className={className}>{children}</PendingAware>
    </form>
  );
}

export function NoirLauncher({ demo = false }: { demo?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (path.startsWith("/atelier/noir")) return null;

  return (
    <div ref={rootRef} className="fixed right-4 bottom-4 z-40 flex flex-col items-end md:right-8 md:bottom-8">
      {open && (
        <div
          id="noir-teaser"
          role="dialog"
          aria-label="Ask NOIR AI"
          className="reveal mb-3 w-[min(22rem,calc(100vw-2rem))] bg-smoke/95 p-6 shadow-[inset_0_0_0_1px_var(--line-strong),0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          style={{ animationDuration: "0.6s" } as React.CSSProperties}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow flex items-center gap-3 text-[0.58rem] text-gold">
              <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
              Noir AI · Concierge privé
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="link-quiet -mt-1 text-[0.58rem] tracking-[0.28em] uppercase"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          <p className="mt-4 font-serif text-xl leading-snug text-parchment/90 italic">
            {demo ? "Ask in your own words — I'll answer from a collector's shelf and journal." : "Ask in your own words — I'll answer from your shelf and journal."}
          </p>
          <ul className="mt-5 space-y-2">
            {PROMPTS.map((q) => (
              <li key={q}>
                <Go
                  demo={demo}
                  q={q}
                  className="block w-full px-3.5 py-2 text-left font-serif text-[0.98rem] text-mist italic shadow-[inset_0_0_0_1px_var(--line)] transition-all duration-300 hover:text-parchment hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.55)]"
                >
                  {q}
                </Go>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Go demo={demo} className="btn btn-gold w-full !py-3">
              Open NOIR AI
            </Go>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="noir-teaser"
        aria-label="Ask NOIR AI"
        className="reveal group relative flex h-11 items-center gap-3 bg-ink/85 px-3.5 shadow-[inset_0_0_0_1px_rgba(201,164,106,0.35),0_18px_50px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(201,164,106,0.7),0_18px_50px_-18px_rgba(201,164,106,0.35)] sm:h-12 sm:px-5"
        style={{ "--d": "900ms" } as React.CSSProperties}
      >
        <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
          <span className="glow absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.35),transparent_65%)]" />
          <span
            className={`relative block h-2.5 w-2.5 rotate-45 bg-gold shadow-[0_0_14px_rgba(201,164,106,0.8)] transition-transform duration-700 ${open ? "rotate-[225deg]" : "group-hover:rotate-[225deg]"}`}
          />
        </span>
        <span className="eyebrow hidden text-[0.6rem] text-parchment sm:inline">Ask NOIR AI</span>
      </button>
    </div>
  );
}
