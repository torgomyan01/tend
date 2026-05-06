"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  InterestSelector,
  type InterestSelection,
} from "@/components/interest-selector";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  categories: ServiceCategoryWithServices[];
  initialInterests: InterestSelection[];
};

export function AccountSettingsInterests({
  categories,
  initialInterests,
}: Props) {
  const router = useRouter();
  const [interests, setInterests] =
    useState<InterestSelection[]>(initialInterests);
  const [saving, setSaving] = useState(false);

  const initialSnapshot = JSON.stringify(initialInterests);

  useEffect(() => {
    setInterests(JSON.parse(initialSnapshot) as InterestSelection[]);
  }, [initialSnapshot]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function removeInterest(category: string, service: string) {
    setInterests((prev) =>
      prev.filter(
        (i) => !(i.category === category && i.service === service),
      ),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        if (data?.error === "INVALID_INTERESTS") {
          const msg =
            "Ընտրությունը չի համապատասխանում հարթակի ակտուալ ցանկին։ Թարմացրեք էջը։";
          setError(msg);
          toastError("Չի կարող պահպանել", msg);
        } else {
          const msg = "Չհաջողվեց պահպանել։ Փորձեք նորից։";
          setError(msg);
          toastError("Սխալ", msg);
        }
        return;
      }
      setSaved(true);
      toastSuccess("Պահպանվեց", "Ձեր ոլորտային նախընտրությունները թարմացվեցին։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {interests.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Ձեր ընտրած ոլորտները ({interests.length})
            </p>
            <button
              type="button"
              onClick={() => setInterests([])}
              className="text-xs font-black text-slate-500 underline-offset-2 transition hover:text-rose-700 hover:underline"
            >
              Մաքրել բոլորը
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {interests.map((item) => (
              <li
                key={`${item.category}::${item.service}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">
                    {item.service}
                  </p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {item.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeInterest(item.category, item.service)}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-800"
                  aria-label="Հեռացնել"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-500">
          Դեռ ոչ մի ուղղություն չեք ընտրել։ Ստորև բացեք մոդալը և ավելացրեք
          նախընտրելի ոլորտներ։
        </p>
      )}

      <InterestSelector
        selected={interests}
        onChange={setInterests}
        categories={categories}
        compact
      />

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          {interests.length === 0
            ? "Առանց ընտրության չեք ստանա նոր մրցույթների Telegram ծանուցումներ ձեր ոլորտներում։"
            : `${interests.length} ուղղություն — հրապարակված մրցույթների մասին կարող եք ստանալ Telegram ծանուցում։`}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Պահպանել
        </button>
      </div>

      {error ? (
        <p className="text-sm font-bold text-rose-700">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-bold text-emerald-700">Պահպանվեց։</p>
      ) : null}
    </div>
  );
}
