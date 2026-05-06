"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

const ERROR_MESSAGES: Record<string, string> = {
  TITLE_TAKEN: "Այս անունով ոլորտ արդեն կա։",
  INVALID_PAYLOAD: "Տվյալները թերի կամ սխալ են։",
  NOT_FOUND: "Ոլորտը չի գտնվել։",
  FORBIDDEN: "Թույլտվություն չկա։",
};

export type CategoryFormCategory = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

type CategoryFormDialogProps = {
  open: boolean;
  onClose: () => void;
  category?: CategoryFormCategory | null;
};

export function CategoryFormDialog({
  open,
  onClose,
  category,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(category);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    if (category) {
      setTitle(category.title);
      setDescription(category.description);
      setSortOrder(String(category.sortOrder));
      setIsActive(category.isActive);
    } else {
      setTitle("");
      setDescription("");
      setSortOrder("0");
      setIsActive(true);
    }
  }, [open, category]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const sortOrderNumber = Number(sortOrder);
    if (Number.isNaN(sortOrderNumber) || sortOrderNumber < 0) {
      const msg = "Հերթականությունը պետք է լինի 0 կամ ավելի։";
      setError(msg);
      toastError("Հերթականություն", msg);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      sortOrder: sortOrderNumber,
      isActive,
    };

    const url = isEdit
      ? `/api/admin/categories/${category!.id}`
      : "/api/admin/categories";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error
          ? (ERROR_MESSAGES[data.error] ?? "Չհաջողվեց պահպանել։")
          : "Չհաջողվեց պահպանել։";
        setError(message);
        toastError("Ոլորտ", message);
        setIsSubmitting(false);
        return;
      }

      toastSuccess(
        isEdit ? "Ոլորտը թարմացվեց" : "Ոլորտը ստեղծվեց",
        isEdit ? "Փոփոխությունները պահպանված են։" : "Նոր ոլորտը ավելացվել է։",
      );
      router.refresh();
      onClose();
    } catch {
      const msg = "Ցանցի սխալ։ Փորձեք կրկին։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Փակել"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              {isEdit ? "Խմբագրում" : "Նոր ոլորտ"}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit ? category?.title : "Ստեղծել ոլորտ"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Փակել"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Ոլորտի անունը
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Օր.՝ Շինարարություն և վերանորոգում"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Նկարագրություն
            </span>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Կարճ բացատրություն ոլորտի մասին"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Հերթականություն
              </span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="size-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900"
              />
              <span className="text-sm font-bold text-slate-700">Ակտիվ</span>
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Չեղարկել
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Պահպանել" : "Ստեղծել"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
