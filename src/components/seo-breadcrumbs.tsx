import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

function truncateLabel(name: string, max = 48): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function SeoBreadcrumbs({ items, className = "" }: Props) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Նավարկում"
      className={`text-sm font-semibold text-slate-500 ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = truncateLabel(item.name);
          return (
            <li key={`${item.path}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-slate-300">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span className="text-slate-700" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="transition hover:text-slate-950"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
