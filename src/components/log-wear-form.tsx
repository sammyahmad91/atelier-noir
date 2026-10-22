"use client";

import { useActionState, useState } from "react";
import { logWear, type WearState } from "@/app/actions/wardrobe";
import { OCCASIONS, OCCASION_LABEL, WEATHERS, WEATHER_LABEL } from "@/lib/vocab";

export function LogWearForm({
  fragranceId,
  today,
  defaultOccasion = "everyday",
  defaultWeather = "mild",
  highlight = false,
}: {
  fragranceId: string;
  today: string;
  defaultOccasion?: string;
  defaultWeather?: string;
  highlight?: boolean;
}) {
  const [state, action, pending] = useActionState<WearState, FormData>(logWear, undefined);
  const [rating, setRating] = useState(4);
  const [compliments, setCompliments] = useState(0);
  const [spray, setSpray] = useState(3);

  return (
    <form
      action={action}
      key={state?.ok}
      className={`panel relative space-y-8 p-8 md:p-10 ${highlight ? "shadow-[inset_0_0_0_1px_rgba(201,164,106,0.55)]" : ""}`}
    >
      <input type="hidden" name="fragranceId" value={fragranceId} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="compliments" value={compliments} />
      <input type="hidden" name="spray" value={spray} />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-3 text-[0.58rem]">Occasion</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <label key={o}>
                <input type="radio" name="occasion" value={o} defaultChecked={o === defaultOccasion} className="sr-only" />
                <span className="chip">{OCCASION_LABEL[o]}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3 text-[0.58rem]">Weather</p>
          <div className="flex flex-wrap gap-2">
            {WEATHERS.map((w) => (
              <label key={w}>
                <input type="radio" name="weather" value={w} defaultChecked={w === defaultWeather} className="sr-only" />
                <span className="chip">{WEATHER_LABEL[w]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <label className="block">
          <span className="eyebrow text-[0.58rem]">Worn on</span>
          <input type="date" name="wornOn" defaultValue={today} max={today} className="field mt-1 [color-scheme:dark]" />
        </label>
        <div>
          <p className="eyebrow text-[0.58rem]">How it wore</p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} of 5`}
                className={`font-serif text-2xl leading-none transition-colors ${n <= rating ? "text-gold" : "text-white/15 hover:text-white/35"}`}
              >
                ✦
              </button>
            ))}
          </div>
        </div>
        <Stepper label="Compliments" value={compliments} onChange={setCompliments} max={20} />
        <Stepper label="Sprays" value={spray} onChange={setSpray} max={5} />
      </div>

      <label className="block">
        <span className="eyebrow text-[0.58rem]">A line for the journal</span>
        <input name="note" maxLength={280} className="field mt-1 font-serif !text-lg italic" placeholder="Who noticed, where you went, how it changed by midnight…" />
      </label>

      <div className="flex flex-wrap items-center gap-6">
        <button className="btn btn-gold" disabled={pending}>
          {pending ? "Recording…" : "Record this wear"}
        </button>
        {state?.error && <p className="font-serif text-lg italic text-rouge">{state.error}</p>}
        {state?.ok && !state.error && <p className="reveal font-serif text-lg italic text-gold">Recorded in the journal.</p>}
      </div>
    </form>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div>
      <p className="eyebrow text-[0.58rem]">{label}</p>
      <div className="mt-3 flex items-center gap-4">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="chip !px-3 !py-1" aria-label={`Fewer ${label}`}>
          −
        </button>
        <span className="display w-6 text-center text-3xl tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="chip !px-3 !py-1" aria-label={`More ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
