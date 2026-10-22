"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/db";
import { fragrances, wears } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { CONCENTRATIONS, FAMILIES, OCCASIONS, SEASONS, TIMES, WEATHERS } from "@/lib/vocab";

export type FormState = { error?: string } | undefined;

const noteList = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => n.replace(/\b\w/g, (c) => c.toUpperCase())),
  )
  .pipe(z.array(z.string().max(40)).max(12));

const FragranceInput = z.object({
  name: z.string().trim().min(1, { error: "Every bottle needs a name." }).max(80),
  house: z.string().trim().min(1, { error: "Which house made it?" }).max(80),
  concentration: z.enum(CONCENTRATIONS),
  family: z.enum(FAMILIES),
  year: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(1700).max(2100).nullable(),
  ),
  topNotes: noteList,
  heartNotes: noteList,
  baseNotes: noteList,
  seasons: z.array(z.enum(SEASONS)).min(1, { error: "Pick at least one season." }),
  timeOfDay: z.enum(TIMES),
  intensity: z.coerce.number().int().min(1).max(5),
  sizeMl: z.coerce.number().int().min(1).max(1000),
  remainingPct: z.coerce.number().int().min(0).max(100),
  story: z.string().trim().max(600).default(""),
});

function parseFragrance(formData: FormData) {
  const parsed = FragranceInput.safeParse({
    ...Object.fromEntries(formData),
    seasons: formData.getAll("seasons"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const data = parsed.data;
  if (!data.topNotes.length && !data.heartNotes.length && !data.baseNotes.length) {
    return { error: "Add at least one note to the pyramid." } as const;
  }
  return { data } as const;
}

export async function createFragrance(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = parseFragrance(formData);
  if ("error" in result) return { error: result.error };

  const id = crypto.randomUUID();
  await db.insert(fragrances).values({ ...result.data, id, userId: user.id, createdAt: new Date() });
  revalidatePath("/atelier", "layout");
  redirect(`/atelier/wardrobe/${id}`);
}

export async function updateFragrance(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = parseFragrance(formData);
  if ("error" in result) return { error: result.error };

  const updated = await db
    .update(fragrances)
    .set(result.data)
    .where(and(eq(fragrances.id, id), eq(fragrances.userId, user.id)))
    .returning({ id: fragrances.id });
  if (!updated.length) return { error: "This bottle is no longer in your wardrobe." };
  revalidatePath("/atelier", "layout");
  redirect(`/atelier/wardrobe/${id}`);
}

export async function deleteFragrance(id: string) {
  const user = await requireUser();
  await db.delete(wears).where(and(eq(wears.fragranceId, id), eq(wears.userId, user.id)));
  await db.delete(fragrances).where(and(eq(fragrances.id, id), eq(fragrances.userId, user.id)));
  revalidatePath("/atelier", "layout");
  redirect("/atelier/wardrobe");
}

const WearInput = z.object({
  fragranceId: z.string().min(1),
  occasion: z.enum(OCCASIONS),
  weather: z.enum(WEATHERS),
  compliments: z.coerce.number().int().min(0).max(50),
  rating: z.coerce.number().int().min(1, { error: "Rate the wear." }).max(5),
  note: z.string().trim().max(280).default(""),
  wornOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date." }),
  spray: z.coerce.number().int().min(0).max(5).default(1),
});

export type WearState = { error?: string; ok?: number } | undefined;

export async function logWear(_: WearState, formData: FormData): Promise<WearState> {
  const user = await requireUser();
  const parsed = WearInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { fragranceId, wornOn, spray, ...rest } = parsed.data;

  const [bottle] = await db
    .select()
    .from(fragrances)
    .where(and(eq(fragrances.id, fragranceId), eq(fragrances.userId, user.id)))
    .limit(1);
  if (!bottle) return { error: "That bottle isn't in your wardrobe." };

  const wornAt = new Date(`${wornOn}T20:00:00`);
  if (wornAt.getTime() > Date.now() + 86_400_000) return { error: "You can't log a wear in the future." };

  await db.insert(wears).values({ ...rest, id: crypto.randomUUID(), userId: user.id, fragranceId, wornAt });

  // ~0.1ml per spray: deplete the bottle level proportionally to its size.
  if (spray > 0) {
    const used = Math.max(1, Math.round(((spray * 0.1) / bottle.sizeMl) * 100));
    await db
      .update(fragrances)
      .set({ remainingPct: Math.max(0, bottle.remainingPct - used) })
      .where(eq(fragrances.id, bottle.id));
  }

  revalidatePath("/atelier", "layout");
  return { ok: Date.now() };
}

export async function deleteWear(id: string) {
  const user = await requireUser();
  await db.delete(wears).where(and(eq(wears.id, id), eq(wears.userId, user.id)));
  revalidatePath("/atelier", "layout");
}
