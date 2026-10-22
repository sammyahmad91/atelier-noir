"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db, ensureDb } from "@/db";
import { users } from "@/db/schema";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/db/seed";
import { atelierPath } from "@/lib/safe-redirect";
import { createSession, deleteSession } from "@/lib/session";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

const SignUp = z.object({
  name: z.string().trim().min(2, { error: "Tell us your name." }),
  email: z.email({ error: "That email doesn't look right." }).trim().toLowerCase(),
  password: z.string().min(8, { error: "Use at least 8 characters." }),
});

const SignIn = z.object({
  email: z.email({ error: "That email doesn't look right." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Enter your password." }),
});

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = SignUp.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, fields: { name: raw.name, email: raw.email } };
  }
  await ensureDb();
  const { name, email, password } = parsed.data;
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken) return { error: "An atelier already exists for this email.", fields: { name, email } };

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date(),
  });
  await createSession(id);
  redirect("/atelier");
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = SignIn.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: raw.email } };

  await ensureDb();
  const { email, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Those credentials don't open this door.", fields: { email } };
  }
  await createSession(user.id);
  redirect("/atelier");
}

export async function enterDemo(formData?: FormData) {
  await ensureDb();
  const [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (!user || !(await bcrypt.compare(DEMO_PASSWORD, user.passwordHash))) redirect("/login");
  await createSession(user.id);
  redirect(atelierPath(formData?.get("next")));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
