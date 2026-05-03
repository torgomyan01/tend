"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TenderStatus } from "@/generated/prisma/client";
import { TENDER_STATUS_LABEL } from "@/lib/tender-status";

const STATUSES: TenderStatus[] = [
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "AWARDED",
  "COMPLETED",
  "CANCELLED",
];

export type AdminTenderEditDefaults = {
  title: string;
  description: string;
  category: string;
  service: string;
  city: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  status: TenderStatus;
};

type Props = {
  open: boolean;
  onClose: () => void;
  tenderId: string;
  defaults: AdminTenderEditDefaults;
};

export function AdminTenderEditDialog({
  open,
  onClose,
  tenderId,
  defaults,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [service, setService] = useState("");
  const [city, setCity] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [status, setStatus] = useState<TenderStatus>("REVIEW");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setTitle(defaults.title);
    setDescription(defaults.description);
    setCategory(defaults.category);
    setService(defaults.service);
    setCity(defaults.city ?? "");
    setBudgetMin(
      defaults.budgetMin !== null ? String(defaults.budgetMin) : "",
    );
    setBudgetMax(
      defaults.budgetMax !== null ? String(defaults.budgetMax) : "",
    );
    setStatus(defaults.status);
  }, [open, defaults]);

  if (!open) {
    return null;
  }

  const submit = async () => {
    setPending(true);
    setError(null);

    const parseMoney = (raw: string) => {
      const t = raw.trim();
      if (!t) {
        return null;
      }
      const n = Number(t);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error("BUDGET");
      }
      return n;
    };

    try {
      if (!title.trim()) {
        setError("Վերնագիրը դատարկ է։");
        setPending(false);
        return;
      }
      if (!description.trim()) {
        setError("Նկարագրությունը դատարկ է։");
        setPending(false);
        return;
      }
      if (!category.trim() || !service.trim()) {
        setError("Կատեգորիան և ծառայությունը պարտադիր են։");
        setPending(false);
        return;
      }

      const minStr = budgetMin.trim();
      const maxStr = budgetMax.trim();
      const budgetMinVal = minStr === "" ? null : parseMoney(minStr);
      const budgetMaxVal = maxStr === "" ? null : parseMoney(maxStr);
      if (budgetMinVal !== null && budgetMaxVal !== null && budgetMinVal > budgetMaxVal) {
        setError("Բյուջեի դաշտերը սխալ են։");
        setPending(false);
        return;
      }

      const payload: Record<string, unknown> = {
        action: "UPDATE",
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        service: service.trim(),
        city: city.trim(),
        budgetMin: budgetMinVal,
        budgetMax: budgetMaxVal,
      };

      if (status !== defaults.status) {
        payload.status = status;
      }

      const res = await fetch(`/api/admin/tenders/${tenderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (err?.error === "BUDGET_INVALID") {
          setError("Բյուջեի դաշտերը սխալ են։");
        } else {
          setError("Չհաջողվեց պահպանել։");
        }
        return;
      }

      onClose();
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message === "BUDGET") {
        setError("Բյուջեի ձևաչափը սխալ է։");
      } else {
        setError("Ցանցի խնդիր։");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Մոդերացիա
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              Խմբագրել մրցույթը
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Փակել"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-xs font-black text-slate-600">
            Վերնագիր
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
            />
          </label>
          <label className="block text-xs font-black text-slate-600">
            Նկարագրություն
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full resize-y rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-black text-slate-600">
              Կատեգորիա
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
              />
            </label>
            <label className="block text-xs font-black text-slate-600">
              Ծառայություն
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
              />
            </label>
          </div>
          <label className="block text-xs font-black text-slate-600">
            Քաղաք
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-black text-slate-600">
              Բյուջե min (դրամ)
              <input
                inputMode="decimal"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
              />
            </label>
            <label className="block text-xs font-black text-slate-600">
              Բյուջե max (դրամ)
              <input
                inputMode="decimal"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-amber-400/0 transition focus:ring-2 focus:ring-amber-400/30"
              />
            </label>
          </div>
          <label className="block text-xs font-black text-slate-600">
            Կարգավիճակ
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TenderStatus)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none ring-amber-400/0 transition focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TENDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Չեղարկել
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-black text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Պահպանել
          </button>
        </div>
      </div>
    </div>
  );
}
