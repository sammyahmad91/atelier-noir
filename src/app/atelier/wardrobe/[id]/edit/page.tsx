import { notFound } from "next/navigation";
import { updateFragrance } from "@/app/actions/wardrobe";
import { FragranceForm } from "@/components/fragrance-form";
import { getFragrance } from "@/lib/dal";

export default async function EditFragrancePage({ params }: PageProps<"/atelier/wardrobe/[id]/edit">) {
  const { id } = await params;
  const fragrance = await getFragrance(id);
  if (!fragrance) notFound();

  return (
    <div className="pt-16">
      <p className="eyebrow reveal">{fragrance.house}</p>
      <h1 className="display reveal mt-5 mb-16 text-6xl md:text-7xl" style={{ "--d": "120ms" } as React.CSSProperties}>
        Edit <span className="italic text-gold">{fragrance.name}</span>
      </h1>
      <FragranceForm action={updateFragrance.bind(null, id)} initial={fragrance} cancelHref={`/atelier/wardrobe/${id}`} />
    </div>
  );
}
