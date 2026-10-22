import { logout } from "@/app/actions/auth";
import { AtelierNav } from "@/components/atelier-nav";
import { Wordmark } from "@/components/wordmark";
import { requireUser } from "@/lib/dal";

export default async function AtelierLayout({ children }: LayoutProps<"/atelier">) {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b hairline bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-10 gap-y-3 px-6 py-5 md:px-10">
          <Wordmark href="/atelier" />
          <div className="order-3 w-full md:order-none md:w-auto">
            <AtelierNav />
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden font-serif text-base italic text-mist sm:inline">{user.name}</span>
            <form action={logout}>
              <button className="text-[0.62rem] tracking-[0.28em] uppercase text-dust transition-colors hover:text-gold">
                Leave
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl flex-1 px-6 pb-28 md:px-10">{children}</div>
    </div>
  );
}
