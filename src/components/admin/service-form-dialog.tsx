"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  TITLE_TAKEN: "Այս անունով ծառայություն արդեն կա այս ոլորտում։",
  INVALID_PAYLOAD: "Տվյալները թերի կամ սխալ են։",
  NOT_FOUND: "Ծառայությունը չի գտնվել։",
  CATEGORY_NOT_FOUND: "Ոլորտը չի գտնվել։",
  FORBIDDEN: "Թույլտվություն չկա։",
};

export type ServiceFormService = {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
};

export type ServiceFormCategoryOption = {
  id: string;
  title: string;
};

type ServiceFormDialogProps = {
  open: boolean;
  onClose: () => void;
  service?: ServiceFormService | null;
  defaultCategoryId: string;
  categories: ServiceFormCategoryOption[];
};

export function ServiceFormDialog({
  open,
  onClose,
  service,
  defaultCategoryId,
  categories,
}: ServiceFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(service);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (service) {
      setTitle(service.title);
      setCategoryId(service.categoryId);
      setSortOrder(String(service.sortOrder));
      setIsActive(service.isActive);
    } else {
      setTitle("");
      setCategoryId(defaultCategoryId);
      setSortOrder("0");
      setIsActive(true);
    }
  }, [open, service, defaultCategoryId]);

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
      setError("Հերթականությունը պետք է լինի 0 կամ ավելի։");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      title: title.trim(),
      categoryId,
      sortOrder: sortOrderNumber,
      isActive,
    };

    const url = isEdit
      ? `/api/admin/services/${service!.id}`
      : "/api/admin/services";
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
        setIsSubmitting(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Ցանցի սխալ։ Փորձեք կրկին։");
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
              {isEdit ? "Խմբագրում" : "Նոր ծառայություն"}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit ? service?.title : "Ավելացնել ծառայություն"}
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
              Ծառայության անունը
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Օր.՝ Ընդհանուր վերանորոգում"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Ոլորտ
            </span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
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
