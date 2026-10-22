import Link from "next/link";

export function ChipLinks<T extends string>({
  name,
  options,
  labels,
  current,
  params,
  basePath,
}: {
  name: string;
  options: readonly T[];
  labels?: Partial<Record<T, string>>;
  current: T;
  params: Record<string, string>;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const q = new URLSearchParams({ ...params, [name]: o });
        return (
          <Link key={o} href={`${basePath}?${q}`} scroll={false} className="chip" data-on={o === current}>
            {labels?.[o] ?? o}
          </Link>
        );
      })}
    </div>
  );
}
