const BASE = "http://atelier.internal";

/** Only same-origin paths inside the atelier are honoured; anything else lands on the Salon. */
export function atelierPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/atelier") || value.startsWith("//")) return "/atelier";
  try {
    const url = new URL(value, BASE);
    if (url.origin !== BASE || !/^\/atelier(\/|$)/.test(url.pathname)) return "/atelier";
    return url.pathname + url.search;
  } catch {
    return "/atelier";
  }
}
