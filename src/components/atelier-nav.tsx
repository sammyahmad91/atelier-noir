"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/atelier", label: "Salon" },
  { href: "/atelier/wardrobe", label: "Wardrobe" },
  { href: "/atelier/journal", label: "Journal" },
  { href: "/atelier/layering", label: "Layering" },
];

export function AtelierNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-6 overflow-x-auto text-[0.66rem] tracking-[0.3em] uppercase md:gap-10">
      {LINKS.map((l) => {
        const active = l.href === "/atelier" ? path === l.href : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative py-2 transition-colors duration-300 ${active ? "text-parchment" : "text-mist hover:text-parchment"}`}
          >
            {l.label}
            <span
              className={`absolute inset-x-0 -bottom-px h-px origin-left bg-gold transition-transform duration-500 ${active ? "scale-x-100" : "scale-x-0"}`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
