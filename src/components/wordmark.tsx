import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <span className="block h-2 w-2 rotate-45 bg-gold transition-transform duration-700 group-hover:rotate-[225deg]" />
      <span className="text-[0.72rem] font-medium tracking-[0.42em] uppercase text-parchment">
        Atelier <span className="text-gold">Noir</span>
      </span>
    </Link>
  );
}
