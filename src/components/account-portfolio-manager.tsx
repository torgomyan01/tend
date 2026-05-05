"use client";

import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type AccountPortfolioImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type AccountPortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  images: AccountPortfolioImage[];
};

type Props = {
  initialItems: AccountPortfolioItem[];
};

const MAX_IMAGES = 8;

export function AccountPortfolioManager({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<AccountPortfolioItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/account/profile/portfolio/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Չհաջողվեց ջնջել։");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPendingDeleteId(null);
      router.refresh();
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          Ցուցադրեք ձեր լավագույն աշխատանքները՝ նկարներով և կարճ նկարագրությամբ։
          Մինչև {MAX_IMAGES} նկար մեկ աշխատանքին (JPG/PNG/WebP, յուրաքանչյուրը՝ մինչև 5
          ՄԲ)։
        </p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <Plus className="size-4" />
          Ավելացնել աշխատանք
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-3xl bg-slate-50 p-6 text-center ring-1 ring-slate-200">
          <p className="text-sm font-bold text-slate-700">
            Դեռ աշխատանք չեք ավելացրել։
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Ցուցադրեք ձեր նախկին նախագծերը՝ պատվիրատուները կտեսնեն ձեր մակարդակը։
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const cover = item.images[0];
            const more = Math.max(item.images.length - 1, 0);
            return (
              <li
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                  {cover ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover.url}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-slate-400">
                      <ImagePlus className="size-8" />
                    </div>
                  )}
                  {item.images.length > 0 ? (
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
                      {item.images.slice(0, 5).map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setPreviewImage(img.url)}
                          className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt=""
                            className="size-full object-cover"
                          />
                        </button>
                      ))}
                      {more > 5 ? (
                        <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-[10px] font-black text-white ring-2 ring-white shadow">
                          +{item.images.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(item.id)}
                    aria-label="Ջնջել"
                    className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 p-4">
                  <p className="text-base font-black text-slate-900">{item.title}</p>
                  {item.description ? (
                    <p className="line-clamp-3 text-xs font-semibold leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen ? (
        <PortfolioCreateModal
          onClose={() => setModalOpen(false)}
          onCreated={(item) => {
            setItems((prev) =>
              [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder),
            );
            setModalOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {previewImage ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            aria-label="Փակել"
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-3xl"
          />
        </div>
      ) : null}

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Փակել"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => {
              if (!deletingId) setPendingDeleteId(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
              Հաստատել ջնջումը
            </p>
            <h3 className="mt-2 text-lg font-black text-slate-900">
              Ջնջե՞լ աշխատանքը
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Աշխատանքը և բոլոր կցված նկարները կհեռացվեն։
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setPendingDeleteId(null)}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Չեղարկել
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => void handleDelete(pendingDeleteId)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {deletingId ? <Loader2 className="size-4 animate-spin" /> : null}
                Ջնջել
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PortfolioCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (item: AccountPortfolioItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const next = [...files];
    for (const f of Array.from(picked)) {
      if (next.length >= MAX_IMAGES) break;
      next.push(f);
    }
    setFiles(next);
  }

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) {
      setError("Անվանումը առնվազն 2 նիշ։");
      return;
    }
    if (files.length === 0) {
      setError("Կցեք գոնե մեկ նկար։");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      for (const f of files) fd.append("images", f);

      const res = await fetch("/api/account/profile/portfolio", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        item?: AccountPortfolioItem;
      } | null;

      if (!res.ok || !data?.item) {
        if (data?.error === "TOO_FEW_IMAGES") {
          setError("Կցեք գոնե մեկ նկար։");
        } else if (data?.error === "TOO_MANY_IMAGES") {
          setError(`Առավելագույնը ${MAX_IMAGES} նկար։`);
        } else if (data?.error === "INVALID_IMAGE") {
          setError("Թույլատրված են JPG/PNG/WebP՝ մինչև 5 ՄԲ։");
        } else if (data?.error === "INVALID_TITLE") {
          setError("Անվանումը սխալ է։");
        } else if (data?.error === "LIMIT_REACHED") {
          setError("Հասել եք առավելագույն աշխատանքների քանակին։");
        } else {
          setError("Չհաջողվեց պահպանել։");
        }
        return;
      }
      onCreated(data.item);
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Փակել"
        className="absolute inset-0 bg-slate-950/55"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-4xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h3 className="text-lg font-black text-slate-900">Նոր աշխատանք</h3>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Փակել"
            className="grid size-9 place-items-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => void submit(e)}
          className="max-h-[min(82vh,42rem)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
        >
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Անվանում
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Օր.՝ Կենտրոնի բնակարանի վերանորոգում"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Նկարագրություն (պարտադիր չէ)
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {description.length}/2000
              </span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              rows={4}
              placeholder="Կարճ պատմեք աշխատանքի մասին՝ նյութեր, ժամկետ, հատուկ պայմաններ։"
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Նկարներ ({files.length}/{MAX_IMAGES})
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-200">
                <ImagePlus className="size-3.5" />
                Ընտրել
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>
            {files.length > 0 ? (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {files.map((f, i) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <li
                      key={`${f.name}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="size-full object-cover"
                        onLoad={() => URL.revokeObjectURL(url)}
                      />
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        aria-label="Հեռացնել"
                        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-slate-950/85 text-white transition hover:bg-rose-700"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
                Կցեք առնվազն 1 նկար (JPG/PNG/WebP, յուրաքանչյուրը՝ մինչև 5 ՄԲ)։
              </p>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-full px-5 py-3 text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Չեղարկել
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-700 px-6 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Պահպանել
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
