"use client";

import {
  Check,
  FileText,
  ImagePlus,
  Loader2,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAmd } from "@/lib/format";
import { tenderApplyMockCookieName } from "@/lib/tender-apply-mock-cookie";

type Stage = "details" | "processing" | "success";

const MAX_IMAGES = 8;
const MAX_DOCUMENTS = 6;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

type ImagePick = { id: string; file: File; url: string };
type DocPick = { id: string; file: File };

type Props = {
  tender: {
    id: string;
    title: string;
    isBlindBidding: boolean;
    budgetMin: number | null;
    budgetMax: number | null;
  };
  fee: number;
  isAuthenticated: boolean;
  loginHref: string;
  /** From server: DB bid exists or mock cookie set (see tenderApplyMockCookieName) */
  cannotApplyAgain: boolean;
  /** Logged-in user id — needed only to write mock cookie until API persists Bid */
  viewerId: string | null;
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

export function TenderApplyButton({
  tender,
  fee,
  isAuthenticated,
  loginHref,
  cannotApplyAgain,
  viewerId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("details");
  const pendingRouterRefreshRef = useRef(false);

  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  const [images, setImages] = useState<ImagePick[]>([]);
  const [documents, setDocuments] = useState<DocPick[]>([]);
  const imagesRef = useRef<ImagePick[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const titleId = useId();
  const descId = useId();
  const imageInputId = useId();
  const documentInputId = useId();

  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((row) => URL.revokeObjectURL(row.url));
    };
  }, []);

  const clearAttachments = useCallback(() => {
    setImages((prev) => {
      prev.forEach((row) => URL.revokeObjectURL(row.url));
      return [];
    });
    setDocuments([]);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (documentInputRef.current) documentInputRef.current.value = "";
  }, []);

  const addImagesFromList = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    setImages((prev) => {
      const additions: ImagePick[] = [];
      for (let i = 0; i < list.length; i++) {
        if (prev.length + additions.length >= MAX_IMAGES) break;
        const file = list[i];
        if (!file.type.startsWith("image/")) continue;
        if (file.size === 0 || file.size > MAX_IMAGE_BYTES) continue;
        additions.push({
          id: newPickId(),
          file,
          url: URL.createObjectURL(file),
        });
      }
      return [...prev, ...additions];
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const addDocumentsFromList = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    setDocuments((prev) => {
      const additions: DocPick[] = [];
      for (let i = 0; i < list.length; i++) {
        if (prev.length + additions.length >= MAX_DOCUMENTS) break;
        const file = list[i];
        if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) continue;
        if (file.type.startsWith("image/")) continue;
        additions.push({ id: newPickId(), file });
      }
      return [...prev, ...additions];
    });
    if (documentInputRef.current) documentInputRef.current.value = "";
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const row = prev.find((p) => p.id === id);
      if (row) URL.revokeObjectURL(row.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }
    if (cannotApplyAgain) return;
    pendingRouterRefreshRef.current = false;
    setSubmitError(null);
    submitLockRef.current = false;
    clearAttachments();
    setStage("details");
    setPrice("");
    setDays("");
    setCoverLetter("");
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    if (stage === "processing") return;
    clearAttachments();
    setOpen(false);
    if (pendingRouterRefreshRef.current) {
      pendingRouterRefreshRef.current = false;
      router.refresh();
    }
  }, [stage, clearAttachments, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== "processing") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, stage, handleClose]);

  const detailsValid =
    priceDigits(price) > 0 &&
    Number(days) > 0 &&
    coverLetter.trim().length >= 30;

  const submitBid = async () => {
    if (!detailsValid || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitError(null);
    setStage("processing");

    const clearMockCookie = () => {
      if (!viewerId) return;
      try {
        const nm = tenderApplyMockCookieName(tender.id, viewerId);
        document.cookie = `${nm}=; Path=/; Max-Age=0; SameSite=Lax`;
      } catch {
        /* ignore */
      }
    };

    const mapApiError = (code: string | undefined) => {
      switch (code) {
        case "INSUFFICIENT_BALANCE":
          return "Ձեր դրամապանակում բավարար միջոց չկա մուտքի վճարի համար։ Լիցքավորեք վերևի մենյուից՝ դրամապանակի կոճակով։";
        case "DUPLICATE_BID":
          return "Այս մրցույթին արդեն առաջարկ եք ուղարկել։";
        case "TENDER_CLOSED":
          return "Այս մրցույթը այլևս չի ընդունում առաջարկներ։";
        case "FORBIDDEN_OWNER":
          return "Չեք կարող առաջարկ ուղարկել սեփական մրցույթին։";
        case "USER_BLOCKED":
          return "Ձեր հաշիվը արգելափակված է։";
        case "TELEGRAM_REQUIRED":
          return "Առաջարկ ուղարկելու համար անհրաժեշտ է Telegram վերիֆիկացիա։";
        case "PRICE_OUT_OF_RANGE":
          return "Գինը չի համապատասխանում մրցույթի բյուջեին։";
        case "INVALID_PAYLOAD":
          return "Տվյալները սխալ են։ Ստուգեք դաշտերը և նորից փորձեք։";
        case "NOT_FOUND":
          return "Մրցույթը այլևս գոյություն չունի։";
        default:
          return "Առաջարկը չի պահպանվել։ Նորից փորձեք։";
      }
    };

    try {
      const res = await fetch(`/api/tenders/${tender.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: priceDigits(price),
          timelineDays: Number(days),
          coverLetter: coverLetter.trim(),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        clearMockCookie();
        setSubmitError(mapApiError(data?.error));
        setStage("details");
        submitLockRef.current = false;
        return;
      }

      clearMockCookie();
      setStage("success");
      pendingRouterRefreshRef.current = true;
      submitLockRef.current = false;
    } catch {
      clearMockCookie();
      setSubmitError("Ցանցի խնդիր։ Կապակցումը ընդհատվեց։");
      setStage("details");
      submitLockRef.current = false;
    }
  };

  if (cannotApplyAgain) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center ring-1 ring-emerald-100">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Check className="size-5" strokeWidth={3} />
        </div>
        <p className="mt-3 text-sm font-black text-emerald-950">
          Դուք արդեն դիմել եք այս մրցույթին
        </p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-900/85">
          Յուրաքանչյուր մրցույթին թույլատրվում է միայն մեկ առաջարկ ձեր
          հաշվից։ Պատվիրատուի որոշումից հետո կարող եք հետևել կարգավիճակին
          ձեր էջից։
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group relative flex w-full flex-col items-stretch gap-1 overflow-hidden rounded-2xl bg-amber-600 px-4 py-3.5 text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <span className="flex items-center justify-center gap-2 text-sm font-black">
          <Send className="size-4 shrink-0" />
          Դիմել մրցույթին
        </span>
        <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-100/95">
          Մուտքի վճար՝ {formatAmd(fee)}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Դիմել մրցույթին
                </p>
                <h2
                  id={titleId}
                  className="mt-0.5 truncate text-lg font-black text-slate-900"
                  title={tender.title}
                >
                  {tender.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={stage === "processing"}
                className="-m-1 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Փակել"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {stage === "details" ? (
                <div className="space-y-5">
                  {submitError ? (
                    <p className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 ring-1 ring-rose-200">
                      {submitError}
                    </p>
                  ) : null}
                  <p
                    id={descId}
                    className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 ring-1 ring-amber-200"
                  >
                    {tender.isBlindBidding
                      ? "Այս մրցույթում ձեր առաջարկը կտեսնի միայն պատվիրատուն մինչև վերջնաժամկետի ավարտը։"
                      : "Ձեր առաջարկը տեսանելի կլինի մյուս մասնակիցներին։"}
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      Ձեր գինը (֏)
                    </label>
                    <input
                      inputMode="numeric"
                      placeholder="օրինակ՝ 250,000"
                      value={price}
                      onChange={(e) => setPrice(formatPrice(e.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      Կատարման ժամկետ (օր)
                    </label>
                    <input
                      inputMode="numeric"
                      placeholder="օրինակ՝ 14"
                      value={days}
                      onChange={(e) =>
                        setDays(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                        Ուղեկից նամակ
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
                      placeholder="Համառոտ ներկայացրեք ձեր փորձը, մոտեցումը և թե ինչու եք համարում, որ պատվիրատուն պետք է ընտրի ձեզ։"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={5}
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 ring-1 ring-slate-100">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                      Կցված նյութեր պատվիրատուին
                    </p>
                    <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                      Կարող եք կցել աշխատանքի նմուշների նկարներ և PDF / Office փաստաթղթեր։
                      API-ի պատրաստ լինելուց հետո դրանք կվերբեռնվեն և կուղարկվեն պատվիրատուին։
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <input
                          ref={imageInputRef}
                          id={imageInputId}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,.heic"
                          multiple
                          className="sr-only"
                          onChange={(e) =>
                            addImagesFromList(e.target.files)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-black text-slate-800 transition hover:border-amber-400 hover:bg-amber-50/60"
                        >
                          <ImagePlus className="size-4 text-amber-700" />
                          Նկարներ
                        </button>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Մինչև {MAX_IMAGES} ֆայլ, յուրաքանչյուրը մինչև{" "}
                          {formatFileSize(MAX_IMAGE_BYTES)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          ref={documentInputRef}
                          id={documentInputId}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          multiple
                          className="sr-only"
                          onChange={(e) =>
                            addDocumentsFromList(e.target.files)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-black text-slate-800 transition hover:border-amber-400 hover:bg-amber-50/60"
                        >
                          <Paperclip className="size-4 text-amber-700" />
                          Փաստաթղթեր
                        </button>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Մինչև {MAX_DOCUMENTS} ֆայլ, յուրաքանչյուրը մինչև{" "}
                          {formatFileSize(MAX_DOCUMENT_BYTES)}
                        </p>
                      </div>
                    </div>

                    {images.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Նախադիտում ({images.length}/{MAX_IMAGES})
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {images.map((row) => (
                            <li
                              key={row.id}
                              className="relative size-20 overflow-hidden rounded-xl ring-1 ring-slate-200"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={row.url}
                                alt=""
                                className="size-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(row.id)}
                                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-slate-950/80 text-white shadow-sm transition hover:bg-rose-600"
                                aria-label="Հեռացնել նկարը"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {documents.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Ֆայլեր ({documents.length}/{MAX_DOCUMENTS})
                        </p>
                        <ul className="space-y-2">
                          {documents.map((row) => (
                            <li
                              key={row.id}
                              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                            >
                              <FileText className="size-4 shrink-0 text-amber-700" />
                              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                                {row.file.name}
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
                                {formatFileSize(row.file.size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDocument(row.id)}
                                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Հեռացնել ֆայլը"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <FeeSummary
                    fee={fee}
                    price={price}
                    days={days}
                    imageCount={images.length}
                    documentCount={documents.length}
                  />

                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-200">
                    Ուղարկելիս ձեր հարթակային դրամապանակից միանգամից կգանձվի{" "}
                    <span className="font-black text-slate-900">
                      {formatAmd(fee)}
                    </span>{" "}
                    մուտքի վճար։ Լիցքավորեք դրամապանակը վերևի մենյուից, եթե
                    անհրաժեշտ է։ Քարտի տվյալներ չեն պահանջվում։
                  </div>
                </div>
              ) : null}

              {stage === "processing" ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <Loader2 className="size-10 animate-spin text-amber-600" />
                  <p className="text-sm font-black text-slate-900">
                    Պահպանվում է առաջարկը և վճարվում մուտքի վճարը…
                  </p>
                  <p className="max-w-xs text-xs font-semibold text-slate-500">
                    Խնդրում ենք չփակել պատուհանը։
                  </p>
                </div>
              ) : null}

              {stage === "success" ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50">
                    <Check className="size-8" strokeWidth={3} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    Առաջարկը ուղարկված է
                  </h3>
                  <p className="max-w-sm text-sm font-semibold text-slate-600">
                    Պատվիրատուն Telegram-ով կստանա ծանուցում նոր առաջարկի մասին։
                    Մոդերացիայից հետո առաջարկը կհասանելի լինի պատվիրատուին։
                  </p>

                  <div className="mt-2 grid w-full gap-2 text-left">
                    <SummaryRow
                      label="Ձեր գինը"
                      value={
                        priceDigits(price) > 0 ? formatAmd(priceDigits(price)) : "—"
                      }
                    />
                    <SummaryRow
                      label="Ժամկետ"
                      value={days ? `${days} օր` : "—"}
                    />
                    <SummaryRow label="Մուտքի վճար" value={formatAmd(fee)} />
                    {images.length > 0 || documents.length > 0 ? (
                      <SummaryRow
                        label="Կցված նյութեր"
                        value={`${images.length} նկար · ${documents.length} ֆայլ`}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <footer className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              {stage === "details" ? (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-2xl px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    Չեղարկել
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitBid()}
                    disabled={!detailsValid}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
                  >
                    <Send className="size-4" />
                    Ուղարկել առաջարկը · {formatAmd(fee)}
                  </button>
                </>
              ) : null}

              {stage === "success" ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="ml-auto rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Փակել
                </button>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2.5 ring-1 ring-slate-200">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  );
}

function FeeSummary({
  fee,
  price,
  days,
  imageCount,
  documentCount,
}: {
  fee: number;
  price: string;
  days: string;
  imageCount: number;
  documentCount: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-900 p-4 text-white">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/80">
        Ամփոփում
      </p>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Ձեր գինը</span>
          <span className="font-bold">
            {priceDigits(price) > 0 ? formatAmd(priceDigits(price)) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Ժամկետ</span>
          <span className="font-bold">{days ? `${days} օր` : "—"}</span>
        </div>
        {imageCount > 0 || documentCount > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300">Կցված</span>
            <span className="text-right font-bold">
              {imageCount > 0 ? `${imageCount} նկար` : null}
              {imageCount > 0 && documentCount > 0 ? " · " : null}
              {documentCount > 0 ? `${documentCount} ֆայլ` : null}
            </span>
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Դրամապանակից կգանձվի
        </span>
        <span className="text-xl font-black tabular-nums text-amber-200">
          {formatAmd(fee)}
        </span>
      </div>
    </div>
  );
}

