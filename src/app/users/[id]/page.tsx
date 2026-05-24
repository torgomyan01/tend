import {
  ArrowLeft,
  Award,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Quote,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ProfileContactUnlockPanel,
  type ProfileContactData,
} from "@/components/profile-contact-unlock-panel";
import { PublicProfileHero } from "@/components/public-profile/profile-hero";
import { PublicProfileSectionHeader } from "@/components/public-profile/section-header";
import {
  PublicProfileReviews,
  type PublicProfileReview,
} from "@/components/public-profile-reviews";
import { SiteHeader } from "@/components/site-header";
import {
  type AccountTypeValue,
  isLegalEntity,
} from "@/lib/account-type";
import { authOptions } from "@/lib/auth";
import {
  initialsFromMasked,
  initialsFromName,
  maskApplicantDisplayName,
} from "@/lib/bid-teaser";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

const KIND_LABEL: Record<string, string> = {
  DIPLOMA: "Դիպլոմ",
  LICENSE: "Լիցենզիա",
  CERTIFICATE: "Հավաստագիր",
  OTHER: "Այլ",
};

const KIND_ICON: Record<string, typeof Award> = {
  DIPLOMA: Award,
  LICENSE: ShieldCheck,
  CERTIFICATE: Sparkles,
  OTHER: FileText,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, accountType: true, companyName: true },
  });
  if (!user) return { title: "Մասնագետի էջ | Tend.am" };

  const display =
    isLegalEntity(user.accountType as AccountTypeValue) && user.companyName?.trim()
      ? user.companyName.trim()
      : maskApplicantDisplayName(user.name);
  return { title: `${display} | Tend.am` };
}

export default async function PublicUserProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      isVerified: true,
      isBlocked: true,
      telegramVerifiedAt: true,
      createdAt: true,
      accountType: true,
      companyName: true,
      legalForm: true,
      phone: true,
      email: true,
      companyPhone: true,
      _count: {
        select: {
          tenders: true,
          bids: true,
          reviewsReceived: {
            where: { moderationStatus: "APPROVED", isPlatformPenalty: false },
          },
        },
      },
      credentials: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          kind: true,
          title: true,
          issuer: true,
          description: true,
          fileUrl: true,
          originalFileName: true,
          mimeType: true,
          createdAt: true,
        },
      },
      portfolioItems: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          images: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, url: true },
          },
        },
      },
    },
  });

  if (!user || user.isBlocked) {
    notFound();
  }

  const accountType = user.accountType as AccountTypeValue;
  const isLegal = isLegalEntity(accountType);

  const isOwnProfile = viewerId === user.id;
  let contactUnlocked = isOwnProfile;
  let viewerBalance: number | null = null;

  if (viewerId && !isOwnProfile) {
    const [unlock, viewer] = await Promise.all([
      prisma.profileContactUnlock.findUnique({
        where: {
          viewerId_profileUserId: {
            viewerId,
            profileUserId: user.id,
          },
        },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: viewerId },
        select: { walletBalance: true, isBlocked: true },
      }),
    ]);
    contactUnlocked = Boolean(unlock);
    if (viewer && !viewer.isBlocked) {
      viewerBalance = Number(viewer.walletBalance);
    }
  }

  const maskedPersonName = maskApplicantDisplayName(user.name);
  const fullPersonName = user.name?.trim() || maskedPersonName;
  const showFullIdentity = contactUnlocked;

  const publicHeading =
    isLegal && user.companyName?.trim()
      ? user.companyName.trim()
      : showFullIdentity
        ? fullPersonName
        : maskedPersonName;
  const subheading =
    isLegal && user.companyName?.trim()
      ? showFullIdentity
        ? fullPersonName
        : maskedPersonName
      : null;

  const initials = showFullIdentity
    ? initialsFromName(user.name)
    : initialsFromMasked(maskedPersonName);

  const [ratingAgg, reviewRows] = await Promise.all([
    prisma.review.aggregate({
      where: {
        revieweeId: user.id,
        moderationStatus: "APPROVED",
        isPlatformPenalty: false,
      },
      _avg: { rating: true },
    }),
    prisma.review.findMany({
      where: {
        revieweeId: user.id,
        moderationStatus: "APPROVED",
        isPlatformPenalty: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        tender: { select: { id: true, title: true } },
        reviewer: { select: { name: true } },
      },
    }),
  ]);

  const avgRating = ratingAgg._avg.rating
    ? Number(ratingAgg._avg.rating)
    : null;

  const publicReviews: PublicProfileReview[] = reviewRows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.createdAt,
    tender: row.tender,
    reviewerName: row.reviewer.name,
  }));

  const contactForPanel: ProfileContactData | null = contactUnlocked
    ? {
        phone: user.phone,
        email: user.email,
        companyPhone: user.companyPhone,
        isLegalEntity: isLegal,
      }
    : null;

  const loginHref = `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.userProfile(user.id))}`;

  const hasBio = Boolean(user.bio?.trim());
  const hasCredentials = user.credentials.length > 0;
  const hasPortfolio = user.portfolioItems.length > 0;
  const hasReviews = publicReviews.length > 0;

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-slate-950">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(251,191,36,0.15), transparent 40%), radial-gradient(circle at 80% 0%, rgba(15,23,42,0.06), transparent 35%)",
        }}
      />

      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-6 lg:px-8">
        <Link
          href={ROUTES.tenders}
          className="group inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm transition hover:bg-white hover:text-slate-950"
        >
          <ArrowLeft className="size-4 transition group-hover:-translate-x-0.5" />
          Բոլոր մրցույթները
        </Link>

        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-6">
            <PublicProfileHero
              accountType={accountType}
              publicHeading={publicHeading}
              subheading={subheading}
              initials={initials}
              image={user.image}
              isVerified={user.isVerified}
              telegramVerifiedAt={user.telegramVerifiedAt}
              memberSince={user.createdAt}
              avgRating={avgRating}
              reviewCount={user._count.reviewsReceived}
              tenderCount={user._count.tenders}
              bidCount={user._count.bids}
            />

            {hasBio ? (
              <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
                <PublicProfileSectionHeader icon={UserRound} title="Իմ մասին" />
                <div className="relative mt-5">
                  <Quote
                    className="absolute -left-1 -top-2 size-8 text-amber-200/80"
                    aria-hidden
                  />
                  <p className="relative whitespace-pre-line pl-6 text-sm font-semibold leading-8 text-slate-700 sm:text-[15px]">
                    {user.bio!.trim()}
                  </p>
                </div>
              </section>
            ) : null}

            {hasCredentials ? (
              <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
                <PublicProfileSectionHeader
                  icon={FileText}
                  title="Փաստաթղթեր և հավաստագրեր"
                  count={user.credentials.length}
                />
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {user.credentials.map((credential) => {
                    const Icon = KIND_ICON[credential.kind] ?? FileText;
                    const isImage = credential.mimeType?.startsWith("image/");
                    return (
                      <li
                        key={credential.id}
                        className="group flex flex-col overflow-hidden rounded-3xl bg-slate-50/80 ring-1 ring-slate-200/80 transition hover:shadow-md hover:ring-amber-200/60"
                      >
                        {isImage && credential.fileUrl ? (
                          <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={credential.fileUrl}
                              alt=""
                              className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 to-transparent" />
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-700 backdrop-blur-sm">
                              <Icon className="size-3 text-amber-700" />
                              {KIND_LABEL[credential.kind] ?? "Փաստաթուղթ"}
                            </span>
                          </div>
                        ) : null}

                        <div className="flex flex-1 flex-col p-4">
                          {!isImage ? (
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                              <Icon className="size-3 text-amber-700" />
                              {KIND_LABEL[credential.kind] ?? "Փաստաթուղթ"}
                            </span>
                          ) : null}
                          <p className="mt-2 text-base font-black text-slate-900">
                            {credential.title}
                          </p>
                          {credential.issuer ? (
                            <p className="mt-0.5 text-xs font-bold text-slate-500">
                              {credential.issuer}
                            </p>
                          ) : null}
                          {credential.description ? (
                            <p className="mt-2 line-clamp-3 text-xs font-semibold leading-6 text-slate-600">
                              {credential.description}
                            </p>
                          ) : null}
                          {credential.fileUrl ? (
                            <a
                              href={credential.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-black text-amber-800 transition hover:text-amber-950 hover:underline"
                            >
                              <ExternalLink className="size-3.5 shrink-0" />
                              {credential.originalFileName || "Դիտել ֆայլը"}
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {hasPortfolio ? (
              <section className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8">
                <PublicProfileSectionHeader
                  icon={FolderOpen}
                  title="Պորտֆոլիո"
                  count={user.portfolioItems.length}
                />
                <ul className="mt-5 grid gap-5 sm:grid-cols-2">
                  {user.portfolioItems.map((item) => (
                    <li
                      key={item.id}
                      className="group overflow-hidden rounded-3xl bg-slate-50/80 ring-1 ring-slate-200/80 transition hover:shadow-lg hover:ring-amber-200/50"
                    >
                      <div className="relative overflow-hidden">
                        {item.images.length > 0 ? (
                          <div className="grid grid-cols-2 gap-0.5">
                            {item.images.slice(0, 4).map((img) => (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                key={img.id}
                                src={img.url}
                                alt=""
                                className="aspect-square w-full object-cover first:col-span-2 first:aspect-[2/1]"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center bg-linear-to-br from-slate-100 to-slate-50 text-slate-300">
                            <ImageIcon className="size-10" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <div className="space-y-1.5 p-4 sm:p-5">
                        <p className="text-base font-black text-slate-900">
                          {item.title}
                        </p>
                        {item.description ? (
                          <p className="line-clamp-2 text-xs font-semibold leading-6 text-slate-600">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasReviews ? (
              <PublicProfileReviews reviews={publicReviews} />
            ) : null}

            {!hasBio && !hasCredentials && !hasPortfolio && !hasReviews ? (
              <section className="rounded-4xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  Այս պրոֆիլում դեռ լրացուցիչ տեղեկություն չկա։
                </p>
              </section>
            ) : null}
          </div>

          <aside className="mt-6 lg:sticky lg:top-24 lg:mt-5 lg:self-start">
            <ProfileContactUnlockPanel
              profileUserId={user.id}
              loginHref={loginHref}
              initialUnlocked={contactUnlocked}
              initialAuthenticated={Boolean(viewerId)}
              isOwnProfile={isOwnProfile}
              contact={contactForPanel}
              initialBalance={viewerBalance}
              variant="sidebar"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
