"use client";

import {
  Award,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

export type CredentialKind = "DIPLOMA" | "LICENSE" | "CERTIFICATE" | "OTHER";

export type AccountCredential = {
  id: string;
  kind: CredentialKind;
  title: string;
  issuer: string | null;
  description: string | null;
  fileUrl: string;
  originalFileName: string;
  mimeType: string | null;
  sortOrder: number;
  createdAt: string;
};

type Props = {
  initialCredentials: AccountCredential[];
};

const KIND_LABEL: Record<CredentialKind, string> = {
  DIPLOMA: "Դիպլոմ",
  LICENSE: "Լիցենզիա",
  CERTIFICATE: "Հավաստագիր",
  OTHER: "Այլ",
};

const KIND_ICON: Record<CredentialKind, typeof Award> = {
  DIPLOMA: Award,
  LICENSE: ShieldCheck,
  CERTIFICATE: Sparkles,
  OTHER: FileText,
};

const ALLOWED_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp";

export function AccountCredentialsManager({ initialCredentials }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<AccountCredential[]>(initialCredentials);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialCredentials);
  }, [initialCredentials]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/account/profile/credentials/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = "Չհաջողվեց ջնջել։ Փորձեք կրկին։";
        setError(msg);
        toastError("Ջնջումը չհաջողվեց", msg);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPendingDeleteId(null);
      toastSuccess("Ջնջվեց", "Փաստաթուղթը հեռացվել է պրոֆիլից։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          Ավելացրեք դիպլոմ, լիցենզիա կամ հավաստագիր (PDF, JPG/PNG/WebP, DOC/DOCX, մինչև
          10 ՄԲ)։ Փաստաթղթերը ձեր պրոֆիլում օգնում են բարձրացնել վստահությունը։
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
          Ավելացնել փաստաթուղթ
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
            Դեռ փաստաթուղթ չեք ավելացրել։
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Կցեք ձեր որակավորման ապացույցները, որպեսզի պատվիրատուները ավելի շուտ վստահեն։
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li
                key={item.id}
                className="group relative flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-800">
                      {KIND_LABEL[item.kind]}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-black text-slate-900">
                      {item.title}
                    </p>
                    {item.issuer ? (
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {item.issuer}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(item.id)}
                    aria-label="Ջնջել"
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {item.description ? (
                  <p className="line-clamp-3 text-xs font-semibold leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-slate-400">
                    {item.originalFileName}
                  </span>
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white transition hover:bg-slate-800"
                  >
                    Բացել
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen ? (
        <CredentialUploadModal
          onClose={() => setModalOpen(false)}
          onCreated={(created) => {
            setItems((prev) =>
              [...prev, created].sort(
                (a, b) => a.sortOrder - b.sortOrder,
              ),
            );
            setModalOpen(false);
            router.refresh();
          }}
        />
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
              Ջնջե՞լ փաստաթուղթը
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Փաստաթուղթը կհեռացվի ձեր պրոֆիլից։ Գործողությունը հնարավոր չէ հետ բերել։
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

function CredentialUploadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (item: AccountCredential) => void;
}) {
  const [kind, setKind] = useState<CredentialKind>("CERTIFICATE");
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      const msg = "Կցեք ֆայլ։";
      setError(msg);
      toastError("Անփոխարինելի", msg);
      return;
    }
    if (title.trim().length < 2) {
      const msg = "Անվանումը առնվազն 2 նիշ։";
      setError(msg);
      toastError("Սխալ անվանում", msg);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("title", title.trim());
      if (issuer.trim()) fd.set("issuer", issuer.trim());
      if (description.trim()) fd.set("description", description.trim());
      fd.set("file", file);

      const res = await fetch("/api/account/profile/credentials", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        credential?: AccountCredential;
      } | null;

      if (!res.ok || !data?.credential) {
        if (data?.error === "INVALID_FILE_TYPE") {
          const msg = "Թույլատրված են PDF, JPG, PNG, WebP, DOC, DOCX։";
          setError(msg);
          toastError("Ֆայլի տեսակ", msg);
        } else if (data?.error === "FILE_TOO_LARGE") {
          const msg = "Ֆայլի չափը մեծ է 10 ՄԲ-ից։";
          setError(msg);
          toastError("Ֆայլը մեծ է", msg);
        } else if (data?.error === "INVALID_TITLE") {
          const msg = "Անվանումը սխալ է։";
          setError(msg);
          toastError("Անվանում", msg);
        } else if (data?.error === "LIMIT_REACHED") {
          const msg = "Հասել եք առավելագույն քանակին։";
          setError(msg);
          toastError("Սահմանափակում", msg);
        } else {
          const msg = "Չհաջողվեց վերբեռնել։";
          setError(msg);
          toastError("Վերբեռնում", msg);
        }
        return;
      }
      toastSuccess("Պահպանվեց", "Փաստաթուղթն ավելացվեց պրոֆիլում։");
      onCreated(data.credential);
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
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
          <h3 className="text-lg font-black text-slate-900">
            Ավելացնել փաստաթուղթ
          </h3>
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
          className="max-h-[min(80vh,40rem)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(KIND_LABEL) as CredentialKind[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-2xl px-3 py-2 text-xs font-black transition ${
                  kind === value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {KIND_LABEL[value]}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Անվանում
            </span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Օր.՝ Ճարտարապետի դիպլոմ"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Ով է տվել (պարտադիր չէ)
            </span>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value.slice(0, 200))}
              placeholder="Հաստատության անունը"
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
              rows={3}
              className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Ֆայլ (PDF, նկար, DOC/DOCX, մինչև 10 ՄԲ)
            </span>
            <input
              type="file"
              required
              accept={ALLOWED_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
            />
            {file ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {file.name} ・ {(file.size / 1024 / 1024).toFixed(2)} ՄԲ
              </p>
            ) : null}
          </label>

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
              Վերբեռնել
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
