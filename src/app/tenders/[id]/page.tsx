import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  FileDown,
  MapPin,
  Phone,
  Star,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TenderApplicantTeasers } from "@/components/tender-applicant-teasers";
import { TenderAwardLifecyclePanel } from "@/components/tender-award-lifecycle-panel";
import { TenderApplyButton } from "@/components/tender-apply-button";
import { TenderComplaintModal } from "@/components/tender-complaint-modal";
import { TenderOwnerApplicantsModal } from "@/components/tender-owner-applicants-modal";
import { AccountTypeBadge } from "@/components/account-type-badge";
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
          isVerified: true,
          telegramVerifiedAt: true,
          createdAt: true,
          accountType: true,
          companyName: true,
          _count: {
            select: {
              tenders: true,
              reviewsReceived: {
                where: { moderationStatus: "APPROVED" },
              },
            },
          },
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
    reviewAgg,
    reviewCount,
    existingBid,
    tenderReviewsRaw,
  ] = await Promise.all([
    prisma.review.aggregate({
      where: {
        revieweeId: tender.clientId,
        moderationStatus: "APPROVED",
      },
      _avg: { rating: true },
    }),
    prisma.review.count({
      where: {
        revieweeId: tender.clientId,
        moderationStatus: "APPROVED",
      },
    }),
    viewerEligibleForPatronContact && providerId
      ? prisma.bid.findUnique({
          where: {
            tenderId_providerId: {
              tenderId: tender.id,
              providerId,
            },
          },
          select: { id: true, ownerContactSharedAt: true },
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

  const avgRating = reviewAgg._avg.rating;
  const avgRatingNum =
    avgRating !== null && avgRating !== undefined
      ? Number(avgRating)
      : null;

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
  const clientInitial = (
    clientDisplayName.replace(/\s+/g, " ").charAt(0) || "?"
  ).toUpperCase();

  const memberSinceYear = new Date(client.createdAt).getFullYear();

  const showContactCta =
    tender.status === "ACTIVE" && !isOwner;

  const tenderEndsAtMs = tender.endsAt?.getTime() ?? null;
  const initialCountdownRemainingMs =
    tenderEndsAtMs !== null && !Number.isNaN(tenderEndsAtMs)
      ? tenderEndsAtMs - Date.now()
      : null;

  const bidFee = computeBidFee({
    budgetMin:
      tender.budgetMin !== null && tender.budgetMin !== undefined
        ? Number(tender.budgetMin)
        : null,
    budgetMax:
      tender.budgetMax !== null && tender.budgetMax !== undefined
        ? Number(tender.budgetMax)
        : null,
  });
  const isAuthenticated = Boolean(session?.user?.id);
  const viewerId = session?.user?.id ?? null;
  const loginHref = `${ROUTES.login}?callbackUrl=${encodeURIComponent(
    ROUTES.tenderDetail(tender.id),
  )}`;

  const initialLiked = viewerId
    ? (await prisma.tenderLike.count({
        where: { userId: viewerId, tenderId: tender.id },
      })) > 0
    : false;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href={isOwner ? ROUTES.myTenders : ROUTES.tenders}
            className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            {isOwner ? "Իմ մրցույթներ" : "Բոլոր մրցույթները"}
          </Link>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
            <article className="min-w-0 overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="border-b border-slate-100 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${TENDER_STATUS_BADGE[tender.status]}`}
                    >
                      {TENDER_STATUS_LABEL[tender.status]}
                    </span>
                    <AccountTypeBadge
                      accountType={client.accountType as AccountTypeValue}
                      size="md"
                    />
                    {isOwner ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">
                        Ձեր հայտարարություն
                      </span>
                    ) : null}
                    {tender.isBlindBidding ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        Փակ առաջարկներ
                      </span>
                    ) : null}
                  </div>

                  <div className="shrink-0">
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
                <div className="mt-5 max-w-xl">
                  <TenderEndsCountdown
                    endsAtIso={tender.endsAt?.toISOString() ?? null}
                    initialRemainingMs={initialCountdownRemainingMs}
                  />
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
                <div className="grid gap-2 border-b border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
                  {tender.images.map((img) => (
                    <div
                      key={img.id}
                      className="overflow-hidden rounded-2xl ring-1 ring-slate-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.alt ?? ""}
                        className="aspect-4/3 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
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

                {showContactCta ? (
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
                  clientDisplayName={clientDisplayName}
                  winnerDisplayName={winnerDisplayName}
                  viewerId={providerId ?? null}
                  reviews={tenderReviews}
                />

                {tender.status === "ACTIVE" ? (
                  <div className="border-t border-slate-100 pt-8">
                    <TenderApplicantTeasers
                      bids={applicantPreviewBids}
                      totalBidCount={visibleApplicantCount}
                    />
                  </div>
                ) : null}
              </div>
            </article>

            <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Պատվիրատու
                </h2>
                <div className="mt-5 flex flex-col items-center text-center">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-amber-200/80">
                    {client.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={client.image}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-3xl font-black text-slate-600">
                        {clientInitial}
                      </span>
                    )}
                  </div>
                  <Link
                    href={ROUTES.userProfile(client.id)}
                    className="mt-4 text-lg font-black leading-tight text-slate-900 hover:underline"
                  >
                    {clientDisplayName}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {client.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                        <BadgeCheck className="size-3.5" />
                        Հաստատված
                      </span>
                    ) : null}
                    {client.telegramVerifiedAt ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-sky-900 ring-1 ring-sky-200">
                        Telegram
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 w-full rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    {avgRatingNum !== null &&
                    !Number.isNaN(avgRatingNum) &&
                    reviewCount > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Star className="size-5 fill-current" />
                          <span className="text-2xl font-black tabular-nums text-slate-900">
                            {avgRatingNum.toFixed(1)}
                          </span>
                          <span className="text-sm font-bold text-slate-500">
                            / 5
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">
                          {reviewCount} գնահատական
                        </p>
                      </div>
                    ) : (
                      <p className="text-center text-xs font-semibold text-slate-500">
                        Դեռ գնահատականներ չկան
                      </p>
                    )}
                  </div>

                  <dl className="mt-5 w-full space-y-3 text-left text-sm">
                    <div className="flex justify-between gap-3 border-b border-slate-100 pb-3">
                      <dt className="font-semibold text-slate-500">
                        Հրապարակված մրցույթներ
                      </dt>
                      <dd className="font-black tabular-nums text-slate-900">
                        {client._count.tenders}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-slate-500">
                        Հարթակում՝ սկսած
                      </dt>
                      <dd className="text-right font-bold text-slate-900">
                        {memberSinceYear}
                      </dd>
                    </div>
                  </dl>

                  {viewerEligibleForPatronContact &&
                  hasExistingBid &&
                  contactSharedWithMe &&
                  patronPhoneForViewer ? (
                    <div className="mt-6 w-full rounded-2xl bg-emerald-50 px-4 py-3 text-left ring-1 ring-emerald-200">
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
                      <p className="mt-2 text-[11px] font-semibold leading-snug text-emerald-900/90">
                        Telegram ծանուցումը ուղարկվում է առաջին բացման պահին։
                      </p>
                    </div>
                  ) : null}

                  {showContactCta ? (
                    <div className="mt-6 w-full">
                      <TenderApplyButton
                        tender={{
                          id: tender.id,
                          title: tender.title,
                          isBlindBidding: tender.isBlindBidding,
                          budgetMin:
                            tender.budgetMin !== null
                              ? Number(tender.budgetMin)
                              : null,
                          budgetMax:
                            tender.budgetMax !== null
                              ? Number(tender.budgetMax)
                              : null,
                        }}
                        fee={bidFee}
                        isAuthenticated={isAuthenticated}
                        loginHref={loginHref}
                        cannotApplyAgain={cannotApplyAgain}
                        viewerId={providerId ?? null}
                      />
                      <p className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                        Մուտքի վճարը դրամապանակից · {tender._count.bids}{" "}
                        մասնակից արդեն դիմել է
                      </p>
                    </div>
                  ) : isOwner ? (
                    <div className="mt-6 w-full space-y-3">
                      <p className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs font-semibold text-slate-600">
                        Սա ձեր հրապարակած մրցույթն է։
                      </p>
                      <TenderOwnerApplicantsModal
                        tenderId={tender.id}
                        tenderTitle={tender.title}
                        totalBids={tender._count.bids}
                        tenderStatus={tender.status}
                        awardedBidId={tender.awardedBidId}
                      />
                    </div>
                  ) : isWinner ? (
                    <div className="mt-6 space-y-3">
                      <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-center text-xs font-bold text-indigo-950 ring-1 ring-indigo-200">
                        Դուք ընտրվել եք որպես այս մրցույթի կատարող։
                      </p>
                      {tender.status === "AWARDED" || tender.status === "COMPLETED" ? (
                        <p className="text-center text-[11px] font-semibold text-slate-500">
                          Մանրամասները տեսնեք վերևի բաժնում։
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      Ակտիվ մրցույթներում կարող եք դիմել պատվիրատուին։
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
