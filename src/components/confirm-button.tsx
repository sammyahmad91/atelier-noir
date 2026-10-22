"use client";

import { useState, useTransition } from "react";

export function ConfirmButton({
  action,
  label,
  confirmLabel,
  className = "btn btn-ghost",
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        className={`${className} !text-rouge`}
        onClick={() => start(() => action())}
        onBlur={() => !pending && setArmed(false)}
        autoFocus
      >
        {pending ? "…" : confirmLabel}
      </button>
    </span>
  );
}
