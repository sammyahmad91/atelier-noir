import { Flacon } from "./flacon";
import { Wordmark } from "./wordmark";

export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r hairline lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Wordmark />
        <div className="relative flex flex-1 items-center justify-center">
          <div className="glow absolute h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(201,164,106,0.25),transparent_65%)]" />
          <div className="float relative">
            <Flacon name="Portrait of a Lady" family="Floral" remaining={88} size={200} />
          </div>
        </div>
        <blockquote className="max-w-sm">
          <p className="font-serif text-2xl italic leading-snug text-parchment/85">
            “Smell is a potent wizard that transports you across thousands of miles and all the years you have lived.”
          </p>
          <p className="eyebrow mt-4">Helen Keller</p>
        </blockquote>
      </aside>

      <section className="flex flex-col justify-center px-6 py-16 md:px-16 lg:px-24">
        <div className="mb-14 lg:hidden">
          <Wordmark />
        </div>
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow reveal">{eyebrow}</p>
          <h1 className="display reveal mt-5 text-6xl" style={{ "--d": "120ms" } as React.CSSProperties}>
            {title}
          </h1>
          <div className="reveal mt-12" style={{ "--d": "260ms" } as React.CSSProperties}>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
