"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { Fragrance } from "@/db/schema";
import type { FormState } from "@/app/actions/wardrobe";
import { accordProfile } from "@/lib/engine";
import { CONCENTRATIONS, FAMILIES, SEASONS, TIMES, tintFor } from "@/lib/vocab";
import { AccordBars } from "./accord-bars";
import { Flacon } from "./flacon";

const split = (s: string) =>
  s
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

export function FragranceForm({
  action,
  initial,
  cancelHref,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  initial?: Fragrance;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [name, setName] = useState(initial?.name ?? "");
  const [family, setFamily] = useState(initial?.family ?? "Woody");
  const [remaining, setRemaining] = useState(initial?.remainingPct ?? 100);
  const [intensity, setIntensity] = useState(initial?.intensity ?? 3);
  const [top, setTop] = useState(initial?.topNotes.join(", ") ?? "");
  const [heart, setHeart] = useState(initial?.heartNotes.join(", ") ?? "");
  const [base, setBase] = useState(initial?.baseNotes.join(", ") ?? "");

  const profile = useMemo(
    () => accordProfile({ family, topNotes: split(top), heartNotes: split(heart), baseNotes: split(base) }),
    [family, top, heart, base],
  );

  return (
    <form action={formAction} className="grid gap-16 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-14">
        <fieldset className="grid gap-8 md:grid-cols-2">
          <legend className="eyebrow mb-6 text-gold">I · Identity</legend>
          <label className="block md:col-span-2">
            <span className="eyebrow">Name</span>
            <input
              name="name"
              className="field mt-1 font-serif !text-3xl"
              placeholder="Santal 33"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="eyebrow">House</span>
            <input name="house" className="field mt-1" placeholder="Le Labo" defaultValue={initial?.house} required />
          </label>
          <label className="block">
            <span className="eyebrow">Year</span>
            <input name="year" type="number" className="field mt-1" placeholder="2011" defaultValue={initial?.year ?? ""} />
          </label>
          <label className="block">
            <span className="eyebrow">Concentration</span>
            <select name="concentration" className="field mt-1" defaultValue={initial?.concentration ?? "EDP"}>
              {CONCENTRATIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <span className="eyebrow">Olfactive family</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {FAMILIES.map((f) => (
                <label key={f}>
                  <input type="radio" name="family" value={f} checked={family === f} onChange={() => setFamily(f)} className="peer sr-only" />
                  <span className="chip gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: tintFor(f)[1] }} />
                    {f}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-8">
          <legend className="eyebrow mb-6 text-gold">II · The pyramid</legend>
          <p className="-mt-4 font-serif text-base italic text-dust">Separate notes with commas.</p>
          {[
            ["topNotes", "Top", "Bergamot, Pink Pepper", top, setTop],
            ["heartNotes", "Heart", "Iris, Rose", heart, setHeart],
            ["baseNotes", "Base", "Sandalwood, Vanilla, Musk", base, setBase],
          ].map(([field, label, ph, value, set]) => (
            <label key={field as string} className="grid items-baseline gap-2 md:grid-cols-[6rem_1fr]">
              <span className="eyebrow">{label as string}</span>
              <input
                name={field as string}
                className="field font-serif !text-xl italic"
                placeholder={ph as string}
                value={value as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
              />
            </label>
          ))}
        </fieldset>

        <fieldset className="grid gap-10 md:grid-cols-2">
          <legend className="eyebrow mb-6 text-gold">III · Character</legend>
          <div>
            <span className="eyebrow">Seasons</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <label key={s}>
                  <input type="checkbox" name="seasons" value={s} defaultChecked={initial?.seasons.includes(s) ?? s !== "summer"} className="sr-only" />
                  <span className="chip">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow">Hour</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <label key={t}>
                  <input type="radio" name="timeOfDay" value={t} defaultChecked={(initial?.timeOfDay ?? "both") === t} className="sr-only" />
                  <span className="chip">{t === "both" ? "day & night" : t}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow">Projection</span>
            <input type="hidden" name="intensity" value={intensity} />
            <div className="mt-5 flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIntensity(n)}
                  aria-label={`Projection ${n}`}
                  className={`h-3 w-3 rotate-45 transition-all duration-300 ${n <= intensity ? "bg-gold" : "bg-white/10 hover:bg-white/25"}`}
                />
              ))}
              <span className="ml-3 font-serif text-base italic text-mist">
                {["", "a whisper", "skin scent", "moderate", "assertive", "room-filling"][intensity]}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="eyebrow">Bottle ml</span>
              <input name="sizeMl" type="number" min={1} className="field mt-1" defaultValue={initial?.sizeMl ?? 100} required />
            </label>
            <label className="block">
              <span className="eyebrow">Remaining · {remaining}%</span>
              <input
                name="remainingPct"
                type="range"
                min={0}
                max={100}
                value={remaining}
                onChange={(e) => setRemaining(Number(e.target.value))}
                className="mt-5 w-full accent-[#c9a46a]"
              />
            </label>
          </div>
          <label className="block md:col-span-2">
            <span className="eyebrow">Its story</span>
            <textarea
              name="story"
              rows={3}
              className="field mt-1 resize-none font-serif !text-lg italic"
              placeholder="Where you found it, who it reminds you of…"
              defaultValue={initial?.story}
            />
          </label>
        </fieldset>

        {state?.error && (
          <p role="alert" className="font-serif text-xl italic text-rouge">
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap gap-4 border-t hairline pt-10">
          <button className="btn btn-gold" disabled={pending}>
            {pending ? "Placing on the shelf…" : initial ? "Save changes" : "Place on the shelf"}
          </button>
          <Link href={cancelHref} className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="panel flex flex-col items-center p-10">
          <p className="eyebrow mb-8">Preview</p>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.18),transparent_65%)]" />
            <Flacon name={name || "Nouveau"} family={family} remaining={remaining} size={140} />
          </div>
          <p className="display mt-6 text-center text-3xl">{name || <span className="italic text-dust">Untitled</span>}</p>
          <p className="mt-2 font-serif italic text-mist">{family}</p>
          <div className="mt-10 w-full">
            <p className="eyebrow mb-5 text-[0.58rem]">Accord profile</p>
            <AccordBars key={`${family}|${top}|${heart}|${base}`} profile={profile} />
          </div>
        </div>
      </aside>
    </form>
  );
}
