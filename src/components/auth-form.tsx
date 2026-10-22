"use client";

import Link from "next/link";
import { useActionState } from "react";
import { enterDemo, login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);

  return (
    <div>
      <form action={action} className="space-y-8">
        {mode === "signup" && (
          <label className="block">
            <span className="eyebrow">Your name</span>
            <input name="name" className="field mt-1" placeholder="Camille" defaultValue={state?.fields?.name} required />
          </label>
        )}
        <label className="block">
          <span className="eyebrow">Email</span>
          <input
            name="email"
            type="email"
            className="field mt-1"
            placeholder="you@maison.com"
            defaultValue={state?.fields?.email}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input
            name="password"
            type="password"
            className="field mt-1"
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        </label>

        {state?.error && (
          <p role="alert" className="font-serif text-lg italic text-rouge">
            {state.error}
          </p>
        )}

        <button className="btn btn-gold w-full" disabled={pending}>
          {pending ? "One moment…" : mode === "login" ? "Enter the atelier" : "Open my atelier"}
        </button>
      </form>

      <div className="my-10 flex items-center gap-4">
        <span className="h-px flex-1 bg-white/10" />
        <span className="font-serif text-sm italic text-dust">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={enterDemo}>
        <button className="btn btn-ghost w-full">Tour the demo atelier</button>
      </form>

      <p className="mt-10 text-center text-sm text-mist">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-gold underline-offset-4 hover:underline">
              Open an atelier
            </Link>
          </>
        ) : (
          <>
            Already a member?{" "}
            <Link href="/login" className="text-gold underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
