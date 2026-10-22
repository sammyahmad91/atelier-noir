import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, ensureDb } from "@/db";
import { fragrances, users, wears } from "@/db/schema";
import { SESSION_COOKIE, decrypt } from "./session";

export const getSessionUser = cache(async () => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  await ensureDb();
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return user ?? null;
});

export const requireUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/api/signout");
  return user;
});

export const getWardrobe = cache(async () => {
  const user = await requireUser();
  return db
    .select()
    .from(fragrances)
    .where(eq(fragrances.userId, user.id))
    .orderBy(desc(fragrances.createdAt));
});

export const getWears = cache(async () => {
  const user = await requireUser();
  return db.select().from(wears).where(eq(wears.userId, user.id)).orderBy(desc(wears.wornAt));
});

export const getFragrance = cache(async (id: string) => {
  const user = await requireUser();
  const [f] = await db
    .select()
    .from(fragrances)
    .where(and(eq(fragrances.id, id), eq(fragrances.userId, user.id)))
    .limit(1);
  return f ?? null;
});
