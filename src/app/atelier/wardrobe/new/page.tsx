import { createFragrance } from "@/app/actions/wardrobe";
import { FragranceForm } from "@/components/fragrance-form";

export const metadata = { title: "Add a bottle — Atelier Noir" };

export default function NewFragrancePage() {
  return (
    <div className="pt-16">
      <p className="eyebrow reveal">A new arrival</p>
      <h1 className="display reveal mt-5 mb-16 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
        Add a <span className="italic text-gold">bottle</span>
      </h1>
      <FragranceForm action={createFragrance} cancelHref="/atelier/wardrobe" />
    </div>
  );
}
