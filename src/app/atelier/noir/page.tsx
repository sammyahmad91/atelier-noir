import { NoirConcierge } from "@/components/noir-concierge";
import { getWardrobe, getWears, requireUser } from "@/lib/dal";

export const metadata = { title: "Noir AI — Atelier Noir" };

export default async function NoirPage({ searchParams }: PageProps<"/atelier/noir">) {
  const [user, wardrobe, wears, sp] = await Promise.all([requireUser(), getWardrobe(), getWears(), searchParams]);
  const question = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim().slice(0, 600) : undefined;

  const worn = new Map<string, number>();
  for (const w of wears) worn.set(w.fragranceId, (worn.get(w.fragranceId) ?? 0) + 1);
  const favourite = [...wardrobe].sort((a, b) => (worn.get(b.id) ?? 0) - (worn.get(a.id) ?? 0))[0];

  const suggestions = [
    "What should I wear tonight for a date?",
    "Which bottles am I neglecting?",
    favourite ? `What layers well with ${favourite.name}?` : "What layers well together?",
    "I need something fresh for a hot office day",
    "Which scent gets me the most compliments?",
    "What's running low?",
  ];

  return (
    <NoirConcierge
      storageKey={`noir:${user.id}`}
      bottles={wardrobe.length}
      wears={wears.length}
      suggestions={suggestions}
      initialQuestion={question}
    />
  );
}
