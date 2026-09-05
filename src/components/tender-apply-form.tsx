"use client";

import {
  FileText,
  ImagePlus,
  Loader2,
  Paperclip,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { formatAmd } from "@/lib/format";
import {
  coverLetterSnippet,
  initialsFromMasked,
  maskApplicantDisplayName,
} from "@/lib/bid-teaser";
import type { AccountTypeValue } from "@/lib/account-type";
import { AccountTypeBadge } from "@/components/account-type-badge";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

const MAX_IMAGES = 8;
const MAX_DOCUMENTS = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

type ImagePick = { id: string; file: File; url: string };
type DocPick = { id: string; file: File };

export type ApplyPeerMessage = {
  id: string;
  coverLetter: string;
  provider: {
    name: string | null;
    image: string | null;
    accountType: AccountTypeValue;
  };
};

type Props = {
  tender: {
    id: string;
    title: string;
    isBlindBidding: boolean;
    budgetMin: number | null;
    budgetMax: number | null;
  };
  fee: number;
  freeRemaining: number;
  peerMessages: ApplyPeerMessage[];
  peerTotalCount: number;
};

function formatPrice(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  return new Intl.NumberFormat("hy-AM").format(Number(digits));
}

function priceDigits(value: string): number {
  return Number(value.replace(/\D/g, ""));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newPickId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function TenderApplyForm({
  tender,
  fee,
  freeRemaining,
  peerMessages,
  peerTotalCount,
}: Props) {
  const router = useRouter();
  const imageInputId = useId();
  const documentInputId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [images, setImages] = useState<ImagePick[]>([]);
  const [documents, setDocuments] = useState<DocPick[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const detailsValid =
    priceDigits(price) > 0 &&
    Number(days) > 0 &&
    coverLetter.trim().length >= 30;

  function addImagesFromList(list: FileList | null) {
    if (!list?.length) return;
    const next: ImagePick[] = [];
    for (const file of Array.from(list)) {
      if (images.length + next.length >= MAX_IMAGES) break;
      if (file.size > MAX_IMAGE_BYTES) {
        toastError("Նկարի չափ", `${file.name}՝ մինչև ${formatFileSize(MAX_IMAGE_BYTES)}`);
        continue;
      }
      next.push({ id: newPickId(), file, url: URL.createObjectURL(file) });
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function addDocumentsFromList(list: FileList | null) {
    if (!list?.length) return;
    const next: DocPick[] = [];
    for (const file of Array.from(list)) {
      if (documents.length + next.length >= MAX_DOCUMENTS) break;
      if (file.size > MAX_DOCUMENT_BYTES) {
        toastError(
          "Ֆայլի չափ",
          `${file.name}՝ մինչև ${formatFileSize(MAX_DOCUMENT_BYTES)}`,
        );
        continue;
      }
      next.push({ id: newPickId(), file });
    }
    if (next.length) setDocuments((prev) => [...prev, ...next]);
    if (documentInputRef.current) documentInputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const row = prev.find((p) => p.id === id);
      if (row) URL.revokeObjectURL(row.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((p) => p.id !== id));
  }

  const mapApiError = (code: string | undefined) => {
    switch (code) {
      case "INSUFFICIENT_BALANCE":
        return "Ձեր դրամապանակում բավարար միջոց չկա մուտքի վճարի համար։";
      case "DUPLICATE_BID":
        return "Այս մրցույթին արդեն առաջարկ եք ուղարկել։";
      case "TENDER_CLOSED":
        return "Այս մրցույթը այլևս չի ընդունում առաջարկներ։";
      case "FORBIDDEN_OWNER":
        return "Չեք կարող առաջարկ ուղարկել սեփական մրցույթին։";
      case "USER_BLOCKED":
        return "Ձեր հաշիվը արգելափակված է։";
      case "VERIFICATION_REQUIRED":
        return "Առաջարկ ուղարկելու համար անհրաժեշտ է հաստատել հաշիվը։";
      case "COMPANY_PROFILE_REQUIRED":
        return "Լրացրեք ընկերության տվյալները Կարգավորումներում։";
      case "PRICE_OUT_OF_RANGE":
        return "Գինը սխալ է։";
      case "INVALID_ATTACHMENT":
        return "Կցված ֆայլերից մեկը անվավեր է։";
      case "INVALID_PAYLOAD":
        return "Տվյալները սխալ են։ Ստուգեք դաշտերը։";
      default:
        return "Առաջարկը չի պահպանվել։ Նորից փորձեք։";
    }
  };

  async function submitBid() {
    if (!detailsValid || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const form = new FormData();
      form.set("price", String(priceDigits(price)));
      form.set("timelineDays", String(Number(days)));
      form.set("coverLetter", coverLetter.trim());
      for (const row of images) form.append("images", row.file);
      for (const row of documents) form.append("documents", row.file);

      const res = await fetch(`/api/tenders/${tender.id}/bids`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        if (data?.error === "COMPANY_PROFILE_REQUIRED") {
          toastError(
            "Պահանջվում է ընկերության տվյալներ",
            mapApiError(data.error),
          );
          router.push(`${ROUTES.accountSettings}#company`);
          return;
        }
        const msg = mapApiError(data?.error);
        setSubmitError(msg);
        toastError("Առաջարկը չուղարկվեց", msg);
        return;
      }

      toastSuccess("Առաջարկը ուղարկված է", "Պատվիրատուն կստանա ծանուցում։");
      router.push(ROUTES.tenderDetail(tender.id));
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։ Կապակցումը ընդհատվեց։";
      setSubmitError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
      <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Մասնակիցների հաղորդագրություններ
        </h2>
        {tender.isBlindBidding ? (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            Փակ առաջարկների մրցույթ է։ Մյուս մասնակիցների նամակները չեն
            ցուցադրվում։ Արդեն դիմել են՝ {peerTotalCount}։
          </p>
        ) : peerTotalCount === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm font-semibold text-slate-500">
            Դեռ հաղորդագրություններ չկան։ Եղեք առաջինը։
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {peerMessages.map((bid) => {
              const masked = maskApplicantDisplayName(bid.provider.name);
              const letter = initialsFromMasked(masked);
              return (
                <li
                  key={bid.id}
                  className="rounded-3xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                      {bid.provider.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bid.provider.image}
                          alt=""
                          className="size-full scale-125 object-cover opacity-90 blur-[5px]"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-sm font-black text-slate-600">
                          {letter}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-900">
                          {masked}
                        </p>
                        <AccountTypeBadge
                          accountType={bid.provider.accountType}
                        />
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">
                        {bid.coverLetter.trim() ||
                          coverLetterSnippet(bid.coverLetter, 40)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            {peerTotalCount > peerMessages.length ? (
              <p className="text-center text-xs font-semibold text-slate-500">
                և ևս {peerTotalCount - peerMessages.length} մասնակից…
              </p>
            ) : null}
          </ul>
        )}
      </section>

      <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          Ձեր առաջարկը
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          {freeRemaining > 0
            ? `Այս ամիս դեռ ունեք ${freeRemaining} անվճար դիմում։`
            : `Մուտքի վճար՝ ${formatAmd(fee)} դրամապանակից։`}
        </p>

        {submitError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 ring-1 ring-rose-200">
            {submitError}
          </p>
        ) : null}

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Ձեր գինը (֏)
            </label>
            <input
              inputMode="numeric"
              placeholder="օրինակ՝ 250,000"
              value={price}
              disabled={submitting}
              onChange={(e) => setPrice(formatPrice(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
            />
            {tender.budgetMin || tender.budgetMax ? (
              <p className="text-[11px] font-semibold text-slate-500">
                Պատվիրատուի կողմնորոշիչ բյուջե՝{" "}
                {formatAmd(Number(tender.budgetMin ?? 0))} –{" "}
                {formatAmd(Number(tender.budgetMax ?? tender.budgetMin ?? 0))}
                ։ Գինը մրցակցային է՝ գրեք ձեր առաջարկը։
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-slate-500">
                Գինը մրցակցային է՝ գրեք ձեր առաջարկած գումարը։
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Կատարման ժամկետ (օր)
            </label>
            <input
              inputMode="numeric"
              placeholder="օրինակ՝ 14"
              value={days}
              disabled={submitting}
              onChange={(e) =>
                setDays(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Հաղորդագրություն
              </label>
              <span
                className={`text-[10px] font-bold ${
                  coverLetter.trim().length >= 30
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {coverLetter.trim().length}/30+
              </span>
            </div>
            <textarea
              placeholder="Ներկայացրեք ձեր փորձը և մոտեցումը…"
              value={coverLetter}
              disabled={submitting}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
              Կցել ֆայլեր
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <input
                  ref={imageInputRef}
                  id={imageInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  disabled={submitting}
                  onChange={(e) => addImagesFromList(e.target.files)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-black text-slate-800 transition hover:border-amber-400 hover:bg-amber-50/60 disabled:opacity-50"
                >
                  <ImagePlus className="size-4 text-amber-700" />
                  Նկարներ
                </button>
              </div>
              <div>
                <input
                  ref={documentInputRef}
                  id={documentInputId}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf"
                  multiple
                  className="sr-only"
                  disabled={submitting}
                  onChange={(e) => addDocumentsFromList(e.target.files)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => documentInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-black text-slate-800 transition hover:border-amber-400 hover:bg-amber-50/60 disabled:opacity-50"
                >
                  <Paperclip className="size-4 text-amber-700" />
                  Փաստաթղթեր
                </button>
              </div>
            </div>

            {images.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {images.map((row) => (
                  <li
                    key={row.id}
                    className="relative size-20 overflow-hidden rounded-xl ring-1 ring-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(row.id)}
                      className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-slate-950/80 text-white"
                      aria-label="Հեռացնել"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                  >
                    <FileText className="size-4 shrink-0 text-amber-700" />
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">
                      {row.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDocument(row.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                      aria-label="Հեռացնել"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!detailsValid || submitting}
            onClick={() => void submitBid()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Հաստատել մասնակցությունը
            {freeRemaining > 0 ? " · անվճար" : ` · ${formatAmd(fee)}`}
          </button>
        </div>
      </section>
    </div>
  );
}
