"use client";

import {
  Loader2,
  Mail,
  Phone,
  Trophy,
  UserCircle2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AccountTypeBadge } from "@/components/account-type-badge";
import type { AccountTypeValue } from "@/lib/account-type";
import { formatAmd, formatDateTime } from "@/lib/format";
import { BID_STATUS_BADGE, BID_STATUS_LABEL } from "@/lib/tender-status";
import type { BidStatus, TenderStatus } from "@/generated/prisma/client";
import { toastError, toastSuccess } from "@/lib/toast";

type ApplicantBid = {
  id: string;
  status: BidStatus;
  price: number;
  timelineDays: number | null;
  coverLetter: string;
  bidFeeAmount: number;
  ownerContactSharedAt: string | null;
  createdAt: string;
  provider: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    telegramVerifiedAt: string | null;
    isVerified: boolean;
    accountType: AccountTypeValue;
    companyName: string | null;
  };
};

type Props = {
  tenderId: string;
  tenderTitle: string;
  totalBids: number;
  tenderStatus: TenderStatus;
  awardedBidId: string | null;
};

export function TenderOwnerApplicantsModal({
  tenderId,
  tenderTitle,
  totalBids,
  tenderStatus,
  awardedBidId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bids, setBids] = useState<ApplicantBid[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardConfirmForId, setAwardConfirmForId] = useState<string | null>(
    null,
  );
  const [awardingId, setAwardingId] = useState<string | null>(null);

  const canSelectPerformer =
    tenderStatus === "ACTIVE" && awardedBidId === null;

  const loadBids = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/applicants`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const msg = "Չհաջողվեց բեռնել դիմողներին։";
        setFetchError(msg);
        toastError("Բեռնումը չհաջողվեց", msg);
        setBids([]);
        return;
      }
      const data = (await res.json()) as { bids: ApplicantBid[] };
      setBids(data.bids ?? []);
    } catch {
      const msg = "Ցանցի խնդիր։";
      setFetchError(msg);
      toastError("Ցանցի խնդիր", msg);
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  const handleOpen = () => {
    setOpen(true);
    setShareError(null);
    setAwardError(null);
    setAwardConfirmForId(null);
    void loadBids();
  };

  const awardBid = async (bidId: string) => {
    setAwardingId(bidId);
    setAwardError(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        if (data?.error === "ALREADY_AWARDED") {
          const msg = "Կատարողն արդեն ընտրված է։ Թարմացրեք էջը։";
          setAwardError(msg);
          toastError("Արդեն ընտրված է", msg);
        } else if (data?.error === "TENDER_NOT_ACTIVE") {
          const msg = "Մրցույթը այլևս ակտիվ չէ։";
          setAwardError(msg);
          toastError("Չի կարող ընտրել", msg);
        } else {
          const msg = "Չհաջողվեց ընտրել կատարողը։";
          setAwardError(msg);
          toastError("Սխալ", msg);
        }
        return;
      }

      setAwardConfirmForId(null);
      toastSuccess("Կատարողը ընտրված է", "Նոր կարգավիճակով մրցույթը թարմացվեց։");
      await loadBids();
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setAwardError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setAwardingId(null);
    }
  };

  const shareContact = async (bidId: string) => {
    setSharingId(bidId);
    setShareError(null);
    try {
      const res = await fetch(
        `/api/tenders/${tenderId}/bids/${bidId}/share-contact`,
        { method: "PATCH" },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        if (data?.error === "OWNER_PHONE_MISSING") {
          const msg =
            "Ձեր պրոֆիլում հեռախոսահամար չկա։ Ավելացրեք այն «Իմ հաշիվ» էջում։";
          setShareError(msg);
          toastError("Հեռախոս չկա", msg);
        } else {
          const msg = "Չհաջողվեց բացել կապը։";
          setShareError(msg);
          toastError("Սխալ", msg);
        }
        return;
      }

      toastSuccess(
        "Կապը բացված է",
        "Դիմողը կկարողանա տեսնել ձեր համարը համապատասխան փուլում։",
      );
      await loadBids();
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setShareError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setSharingId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
      >
        <Users className="size-4 shrink-0" />
        Դիմողներ
        {totalBids > 0 ? (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums">
            {totalBids}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="owner-applicants-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Ձեր մրցույթը
                </p>
                <h2
                  id="owner-applicants-title"
                  className="mt-0.5 truncate text-lg font-black text-slate-900"
                  title={tenderTitle}
                >
                  Դիմողներ — {tenderTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-black text-slate-500 hover:bg-slate-100"
              >
                Փակել
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {awardError ? (
                <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 ring-1 ring-rose-200">
                  {awardError}
                </p>
              ) : null}
              {shareError ? (
                <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-900 ring-1 ring-rose-200">
                  {shareError}
                </p>
              ) : null}

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="size-10 animate-spin text-amber-600" />
                </div>
              ) : fetchError ? (
                <p className="py-8 text-center text-sm font-bold text-rose-700">
                  {fetchError}
                </p>
              ) : bids.length === 0 ? (
                <p className="py-10 text-center text-sm font-semibold text-slate-500">
                  Դեռ առաջարկներ չկան։
                </p>
              ) : (
                <ul className="space-y-4">
                  {bids.map((bid) => {
                    const p = bid.provider;
                    const initial = (
                      p.name?.trim()?.charAt(0) ||
                      p.email.charAt(0) ||
                      "?"
                    ).toUpperCase();
                    const shared = Boolean(bid.ownerContactSharedAt);
                    const canShare =
                      bid.status !== "REJECTED" && bid.status !== "WITHDRAWN";
                    const isWinningBid =
                      awardedBidId !== null && bid.id === awardedBidId;

                    return (
                      <li
                        key={bid.id}
                        className={`rounded-3xl p-4 ring-1 ring-slate-200 ${
                          isWinningBid
                            ? "bg-indigo-50/90 ring-indigo-200"
                            : "bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                            {p.image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={p.image}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="flex size-full items-center justify-center text-lg font-black text-slate-600">
                                {initial}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isWinningBid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                  <Trophy className="size-3" />
                                  Կատարող
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${BID_STATUS_BADGE[bid.status]}`}
                              >
                                {BID_STATUS_LABEL[bid.status]}
                              </span>
                              <AccountTypeBadge accountType={p.accountType} />
                              <span className="text-xs font-semibold text-slate-500">
                                {formatDateTime(bid.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1 text-base font-black text-slate-900 text-start">
                              {p.accountType === "LEGAL_ENTITY" &&
                              p.companyName?.trim()
                                ? p.companyName.trim()
                                : p.name?.trim() || "Անուն չկա"}
                            </p>
                            {p.accountType === "LEGAL_ENTITY" &&
                            p.companyName?.trim() &&
                            p.name?.trim() ? (
                              <p className="text-xs font-semibold text-slate-500">
                                Կոնտակտ՝ {p.name.trim()}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-col gap-1 text-xs font-semibold">
                              <a
                                href={`mailto:${p.email}`}
                                className="inline-flex items-center gap-1.5 text-sky-700 hover:underline"
                              >
                                <Mail className="size-3.5 shrink-0" />
                                {p.email}
                              </a>
                              {p.phone ? (
                                <a
                                  href={`tel:${p.phone.replace(/\s/g, "")}`}
                                  className="inline-flex items-center gap-1.5 text-emerald-800 hover:underline"
                                >
                                  <Phone className="size-3.5 shrink-0" />
                                  {p.phone}
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-slate-400">
                                  <Phone className="size-3.5" />
                                  Հեռախոս չկա
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-800">
                              <span>{formatAmd(bid.price)}</span>
                              {bid.timelineDays != null ? (
                                <span className="text-slate-600">
                                  {bid.timelineDays} օր
                                </span>
                              ) : null}
                              <span className="text-slate-500">
                                Մուտքի վճար {formatAmd(bid.bidFeeAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Ուղեկից նամակ
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-relaxed text-slate-700">
                            {bid.coverLetter}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {bid.status === "SHORTLISTED" &&
                          canSelectPerformer &&
                          !isWinningBid ? (
                            awardConfirmForId === bid.id ? (
                              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                                <p className="w-full text-xs font-bold text-slate-700 sm:flex-1">
                                  Հաստատե՞լ ընտրությունը՝ այս դիմողը կդառնա վերջնական
                                  կատարող, Telegram ծանուցում կուղարկվի նրան։
                                </p>
                                <div className="flex shrink-0 gap-2">
                                  <button
                                    type="button"
                                    disabled={awardingId !== null}
                                    onClick={() => void awardBid(bid.id)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-600 disabled:opacity-50"
                                  >
                                    {awardingId === bid.id ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Trophy className="size-4" />
                                    )}
                                    Հաստատել
                                  </button>
                                  <button
                                    type="button"
                                    disabled={awardingId !== null}
                                    onClick={() => setAwardConfirmForId(null)}
                                    className="rounded-2xl bg-slate-200 px-4 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-300 disabled:opacity-50"
                                  >
                                    Չեղարկել
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={awardingId !== null}
                                onClick={() => setAwardConfirmForId(bid.id)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-500 disabled:opacity-50"
                              >
                                <Trophy className="size-4" />
                                Ընտրել որպես կատարող
                              </button>
                            )
                          ) : null}
                          {canShare ? (
                            shared ? (
                              <span className="rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-900 ring-1 ring-emerald-200">
                                Ձեր համարը բացված է այս դիմողի համար · Telegram
                                ծանուցում ուղարկված է
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={sharingId !== null}
                                onClick={() => void shareContact(bid.id)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-amber-500 disabled:opacity-50"
                              >
                                {sharingId === bid.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Phone className="size-4" />
                                )}
                                Բացել իմ համարը դիմողի համար
                              </button>
                            )
                          ) : (
                            <span className="text-xs font-semibold text-slate-500">
                              Կապ բացելը հասանելի չէ այս կարգավիճակով։
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                            <UserCircle2 className="size-3.5" />
                            ID՝ {p.id.slice(0, 10)}…
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
