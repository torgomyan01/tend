import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  count?: number;
};

export function PublicProfileSectionHeader({ icon: Icon, title, count }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
          <Icon className="size-4" aria-hidden />
        </span>
        <h2 className="text-sm font-black tracking-tight text-slate-900 sm:text-base">
          {title}
        </h2>
      </div>
      {count !== undefined ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black tabular-nums text-slate-500 ring-1 ring-slate-200">
          {count}
        </span>
      ) : null}
    </div>
  );
}
