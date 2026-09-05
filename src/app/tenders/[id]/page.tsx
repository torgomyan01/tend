import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  FileDown,
  MapPin,
  Pencil,
  Phone,
  Send,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TenderApplicantTeasers } from "@/components/tender-applicant-teasers";
import { TenderAwardLifecyclePanel } from "@/components/tender-award-lifecycle-panel";
import { TenderComplaintModal } from "@/components/tender-complaint-modal";
import { TenderDetailImageGallery } from "@/components/tender-detail-image-gallery";
import { TenderOwnerApplicantsModal } from "@/components/tender-owner-applicants-modal";
import { TenderEndsCountdown } from "@/components/tender-ends-countdown";
import { TenderLiveStats } from "@/components/tender-live-stats";
import { TenderLikeButton } from "@/components/tender-like-button";
import { SiteHeader } from "@/components/site-header";
import type { AccountTypeValue } from "@/lib/account-type";
import { authOptions } from "@/lib/auth";
import { computeBidFee } from "@/lib/bid-fee";
import { tenderApplyMockCookieName } from "@/lib/tender-apply-mock-cookie";
import { formatAmd, formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { TENDER_STATUS_BADGE, TENDER_STATUS_LABEL } from "@/lib/tender-status";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tender = await prisma.tender.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!tender) {
    return { title: "Մրցույթ չի գտնվել | Tend.am" };
  }
  return { title: `${tender.title} | Tend.am` };
}

export default async function TenderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      documents: { orderBy: { sortOrder: "asc" } },
      selectedServices: { orderBy: { sortOrder: "asc" } },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          accountType: true,
          companyName: true,
        },
      },
      locality: { select: { name: true } },
      _count: { select: { bids: true } },
      awardedBid: {
        select: {
          id: true,
          price: true,
          providerId: true,
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!tender) {
    notFound();
  }

  const isOwner = session?.user?.id === tender.clientId;
  const canEditTender =
    isOwner &&
    (tender.status === "DRAFT" ||
      tender.status === "REVIEW" ||
      (tender.status === "ACTIVE" && tender._count.bids === 0));
  const providerId = session?.user?.id;
  const awardedProviderId = tender.awardedBid?.providerId ?? null;
  const isWinner = Boolean(
    providerId && awardedProviderId !== null && awardedProviderId === providerId,
  );

  const canViewTender =
    tender.status === "ACTIVE" ||
    isOwner ||
    ((tender.status === "AWARDED" || tender.status === "COMPLETED") &&
      isWinner);

  if (!canViewTender) {
    notFound();
  }

  const viewerEligibleForPatronContact = Boolean(
    providerId &&
      !isOwner &&
      (tender.status === "ACTIVE" ||
        ((tender.status === "AWARDED" || tender.status === "COMPLETED") &&
          isWinner)),
  );

  const [
    existingBid,
    tenderReviewsRaw,
  ] = await Promise.all([
    providerId
      ? prisma.bid.findUnique({
          where: {
            tenderId_providerId: {
              tenderId: tender.id,
              providerId,
            },
          },
          select: {
            id: true,
            ownerContactSharedAt: true,
            bidFeeAmount: true,
            bidFeeRefundedAt: true,
            bidFeeRefundedAmount: true,
            bidFeeRefundReason: true,
          },
        })
      : Promise.resolve(null),
    tender.status === "COMPLETED"
      ? prisma.review.findMany({
          where: { tenderId: tender.id },
          select: {
            reviewerId: true,
            revieweeId: true,
            rating: true,
            comment: true,
            createdAt: true,
            moderationStatus: true,
          },
        })
      : Promise.resolve([]),
  ]);

  let applicantPreviewBids: {
    id: string;
    coverLetter: string;
    provider: {
      name: string | null;
      image: string | null;
      accountType: AccountTypeValue;
    };
  }[] = [];
  let visibleApplicantCount = 0;

  if (tender.status === "ACTIVE") {
    const [previewRows, previewCount] = await Promise.all([
      prisma.bid.findMany({
        where: {
          tenderId: tender.id,
          status: { notIn: ["REJECTED", "WITHDRAWN"] },
        },
        orderBy: { createdAt: "desc" },
        take: 9,
        select: {
          id: true,
          coverLetter: true,
          provider: {
            select: { name: true, image: true, accountType: true },
          },
        },
      }),
      prisma.bid.count({
        where: {
          tenderId: tender.id,
          status: { notIn: ["REJECTED", "WITHDRAWN"] },
        },
      }),
    ]);
    applicantPreviewBids = previewRows.map((row) => ({
      ...row,
      provider: {
        ...row.provider,
        accountType: row.provider.accountType as AccountTypeValue,
      },
    }));
    visibleApplicantCount = previewCount;
  }

  const tenderReviews = tenderReviewsRaw.map((r) => ({
    reviewerId: r.reviewerId,
    revieweeId: r.revieweeId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    moderationStatus: r.moderationStatus,
  }));

  const hasExistingBid = Boolean(existingBid);
  const contactSharedWithMe = Boolean(existingBid?.ownerContactSharedAt);
  const bidFeeRefundInfo =
    existingBid?.bidFeeRefundedAt && existingBid.bidFeeRefundedAmount
      ? {
          amount: Number(existingBid.bidFeeRefundedAmount),
          reason: existingBid.bidFeeRefundReason ?? "TENDER_CANCELLED",
        }
      : null;

  const patronPhoneForViewer =
    viewerEligibleForPatronContact &&
    contactSharedWithMe
      ? (
          await prisma.user.findUnique({
            where: { id: tender.clientId },
            select: { phone: true },
          })
        )?.phone?.trim() ?? null
      : null;

  const cookieStore = await cookies();
  const mockApplyCookieValue =
    providerId && !isOwner && tender.status === "ACTIVE"
      ? cookieStore.get(
          tenderApplyMockCookieName(tender.id, providerId),
        )?.value
      : undefined;
  const hasMockApplyCookie = mockApplyCookieValue === "1";
  const cannotApplyAgain = hasExistingBid || hasMockApplyCookie;

  const placeLabel =
    tender.locality?.name?.trim() ||
    tender.city?.trim() ||
    null;

  const budgetText =
    tender.budgetMin || tender.budgetMax
      ? `${formatAmd(Number(tender.budgetMin ?? 0))} – ${formatAmd(
          Number(tender.budgetMax ?? tender.budgetMin ?? 0),
        )}`
      : "Նշված չէ";

  const servicesToShow =
    tender.selectedServices.length > 0
      ? tender.selectedServices
      : [
          {
            id: `${tender.id}-fallback-service`,
            category: tender.category,
            service: tender.service,
          },
        ];

  const client = tender.client;
  const clientDisplayName =
    client.accountType === "LEGAL_ENTITY" && client.companyName?.trim()
      ? client.companyName.trim()
      : client.name?.trim() || "Պատվիրատու";
  const winnerDisplayName =
    tender.awardedBid?.provider.name?.trim() ||
    tender.awardedBid?.provider.email ||
    "Կատարող";

  /** Identity stays private until the patron shares contact with this bidder. */
  const revealPatronIdentity = isOwner || contactSharedWithMe;

  const showParticipateCta =
    tender.status === "ACTIVE" && !isOwner;

  const tenderEndsAtMs = tender.endsAt?.getTime() ?? null;
  const initialCountdownRemainingMs =
    tenderEndsAtMs !== null && !Number.isNaN(tenderEndsAtMs)
      ? tenderEndsAtMs - Date.now()
      : null;

  const computedBidFee = computeBidFee({
    budgetMin:
      tender.budgetMin !== null && tender.budgetMin !== undefined
        ? Number(tender.budgetMin)
        : null,
    budgetMax:
      tender.budgetMax !== null && tender.budgetMax !== undefined
        ? Number(tender.budgetMax)
        : null,
    category: tender.category,
    endsAt: tender.endsAt,
  });
  const isAuthenticated = Boolean(session?.user?.id);
  const viewerId = session?.user?.id ?? null;
  const loginHref = `${ROUTES.login}?callbackUrl=${encodeURIComponent(
    showParticipateCta && !cannotApplyAgain
      ? ROUTES.tenderApply(tender.id)
      : ROUTES.tenderDetail(tender.id),
  )}`;

  const initialLiked = viewerId
    ? (await prisma.tenderLike.count({
        where: { userId: viewerId, tenderId: tender.id },
      })) > 0
    : false;

  const freeBidsRemaining = viewerId
    ? (() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return prisma.bid
          .count({
            where: {
              providerId: viewerId,
              bidFeeAmount: 0,
              createdAt: { gte: monthStart },
            },
          })
          .then((used) => Math.max(2 - used, 0));
      })()
    : Promise.resolve(0);
  const resolvedFreeRemaining = await freeBidsRemaining;
  const bidFee = resolvedFreeRemaining > 0 ? 0 : computedBidFee;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              href={isOwner ? ROUTES.myTenders : ROUTES.tenders}
              className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft className="size-4" />
              {isOwner ? "Իմ մրցույթներ" : "Բոլոր մրցույթները"}
            </Link>
            <TenderEndsCountdown
              endsAtIso={tender.endsAt?.toISOString() ?? null}
              initialRemainingMs={initialCountdownRemainingMs}
            />
          </div>

            <article className="min-w-0 overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${TENDER_STATUS_BADGE[tender.status]}`}
                    >
                      {TENDER_STATUS_LABEL[tender.status]}
                    </span>
                    {isOwner ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">
                        Ձեր հայտարարություն
                      </span>
                    ) : null}
                    {canEditTender ? (
                      <Link
                        href={ROUTES.editTender(tender.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-slate-800 transition hover:bg-slate-800"
                      >
                        <Pencil className="size-3.5 shrink-0" aria-hidden />
                        Խմբագրել
                      </Link>
                    ) : null}
                    {tender.isBlindBidding ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        Փակ առաջարկներ
                      </span>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {showParticipateCta ? (
                      cannotApplyAgain ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-900 ring-1 ring-emerald-200">
                          <Check className="size-4" />
                          Արդեն դիմել եք
                        </div>
                      ) : (
                        <Link
                          href={
                            isAuthenticated
                              ? ROUTES.tenderApply(tender.id)
                              : loginHref
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-700"
                        >
                          <Send className="size-4" />
                          Մասնակցել
                          <span className="hidden text-amber-100 sm:inline">
                            ·{" "}
                            {resolvedFreeRemaining > 0
                              ? "անվճար"
                              : formatAmd(bidFee)}
                          </span>
                        </Link>
                      )
                    ) : null}
                    {isOwner ? (
                      <TenderOwnerApplicantsModal
                        tenderId={tender.id}
                        tenderTitle={tender.title}
                        totalBids={tender._count.bids}
                        tenderStatus={tender.status}
                        awardedBidId={tender.awardedBidId}
                      />
                    ) : null}
                    <TenderLikeButton
                      tenderId={tender.id}
                      initialLiked={initialLiked}
                      isAuthenticated={isAuthenticated}
                      loginHref={loginHref}
                    />
                  </div>
                </div>
                <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                  {tender.title}
                </h1>

                {viewerEligibleForPatronContact &&
                hasExistingBid &&
                contactSharedWithMe &&
                patronPhoneForViewer ? (
                  <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-left ring-1 ring-emerald-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-900">
                      Պատվիրատուն բացել է իր համարը ձեր համար
                    </p>
                    <a
                      href={`tel:${patronPhoneForViewer.replace(/\s/g, "")}`}
                      className="mt-2 inline-flex items-center gap-2 text-base font-black text-emerald-950 hover:underline"
                    >
                      <Phone className="size-5 shrink-0 text-emerald-700" />
                      {patronPhoneForViewer}
                    </a>
                  </div>
                ) : null}

                {bidFeeRefundInfo ? (
                  <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-left ring-1 ring-amber-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-900">
                      Մուտքի վճարը վերադարձված է կրեդիտով
                    </p>
                    <p className="mt-1 text-base font-black text-amber-950">
                      {formatAmd(bidFeeRefundInfo.amount)}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {servicesToShow.map((row) => (
                    <span
                      key={row.id}
                      className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                    >
                      {row.category} · {row.service}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <TenderLiveStats
                    tenderId={tender.id}
                    initialBidCount={Number(tender._count.bids)}
                    isActive={tender.status === "ACTIVE"}
                    endsAtIso={tender.endsAt?.toISOString() ?? null}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                  {placeLabel ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 shrink-0 text-amber-700" />
                      {placeLabel}
                      {tender.address ? `, ${tender.address}` : null}
                    </span>
                  ) : tender.address ? (
                    <span>{tender.address}</span>
                  ) : null}
                  {tender.startsAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-4 shrink-0 text-slate-400" />
                      Մեկնարկ՝ {formatDateTime(tender.startsAt)}
                    </span>
                  ) : null}
                  {tender.endsAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-4 shrink-0 text-slate-400" />
                      Վերջնաժամկետ՝ {formatDateTime(tender.endsAt)}
                    </span>
                  ) : null}
                </div>

                {tender.awardedBid ? (
                  <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl bg-linear-to-br from-indigo-50 to-white px-5 py-4 ring-2 ring-indigo-200/80">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-indigo-100 ring-2 ring-white shadow-sm">
                      {tender.awardedBid.provider.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tender.awardedBid.provider.image}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-xl font-black text-indigo-800">
                          {(
                            winnerDisplayName.replace(/\s+/g, " ").charAt(0) ||
                            "?"
                          ).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">
                        <Trophy className="size-3.5 text-indigo-600" />
                        Վերջնական կատարող ընտրված է
                      </p>
                      <Link
                        href={ROUTES.userProfile(tender.awardedBid.provider.id)}
                        className="mt-1 inline-block text-lg font-black leading-tight text-slate-900 hover:underline"
                      >
                        {winnerDisplayName}
                      </Link>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        Առաջարկված գին՝{" "}
                        {formatAmd(Number(tender.awardedBid.price))}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {tender.images.length > 0 ? (
                <TenderDetailImageGallery
                  images={tender.images.map((img) => ({
                    id: img.id,
                    url: img.url,
                    alt: img.alt,
                  }))}
                />
              ) : null}

              <div className="space-y-6 p-6 sm:p-8">
                <section>
                  <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Նկարագրություն
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                    {tender.description}
                  </p>
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Բյուջեի միջակայք
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {budgetText}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Ստացված առաջարկներ
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      {tender._count.bids}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:col-span-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Հրապարակում
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      Ստեղծվել է {formatDateTime(tender.createdAt)}
                      {tender.updatedAt.getTime() !== tender.createdAt.getTime()
                        ? ` · Թարմացվել է ${formatDateTime(tender.updatedAt)}`
                        : null}
                    </p>
                  </div>
                </div>

                {!isOwner &&
                tender.status === "ACTIVE" &&
                tender.isBlindBidding ? (
                  <p className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200">
                    Այս մրցույթում առաջարկների գները և տեքստերը փակ են մինչև
                    վերջնաժամկետը կամ պատվիրատուի քայլերը՝ ըստ հարթակի կանոնների։
                  </p>
                ) : null}

                {tender.documents.length > 0 ? (
                  <section>
                    <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Փաստաթղթեր
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {tender.documents.map((doc) => (
                        <li key={doc.id}>
                          <a
                            href={doc.url}
                            download={doc.originalFileName}
                            className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-200 transition hover:bg-white"
                          >
                            <FileDown className="size-4 shrink-0 text-amber-700" />
                            <span className="min-w-0 truncate">
                              {doc.originalFileName}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {showParticipateCta ? (
                  <TenderComplaintModal
                    tenderId={tender.id}
                    tenderTitle={tender.title}
                    isAuthenticated={isAuthenticated}
                    loginHref={loginHref}
                  />
                ) : null}

                <TenderAwardLifecyclePanel
                  tenderId={tender.id}
                  status={tender.status}
                  isOwner={isOwner}
                  isWinner={isWinner}
                  clientId={tender.clientId}
                  winnerProviderId={awardedProviderId}
                  clientDisplayName={
                    revealPatronIdentity ? clientDisplayName : "Պատվիրատու"
                  }
                  revealPatronIdentity={revealPatronIdentity}
                  winnerDisplayName={winnerDisplayName}
                  viewerId={providerId ?? null}
                  reviews={tenderReviews}
                />

                {tender.status === "ACTIVE" ? (
                  <div className="border-t border-slate-100 pt-8">
                    <TenderApplicantTeasers
                      bids={applicantPreviewBids}
                      totalBidCount={visibleApplicantCount}
                      isBlindBidding={tender.isBlindBidding}
                    />
                  </div>
                ) : null}
              </div>
            </article>
        </div>
      </main>
    </div>
  );
}
