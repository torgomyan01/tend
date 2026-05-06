import {
  Award,
  BadgeCheck,
  CalendarClock,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountTypeBadge } from "@/components/account-type-badge";
import { SiteHeader } from "@/components/site-header";
import {
  type AccountTypeValue,
  isLegalEntity,
} from "@/lib/account-type";
import { initialsFromMasked, maskApplicantDisplayName } from "@/lib/bid-teaser";
import { formatDateTime } from "@/lib/format";
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
      _count: {
        select: {
          tenders: true,
          bids: true,
          reviewsReceived: { where: { moderationStatus: "APPROVED" } },
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

  // Հանրային անունը — ընկերության դեպքում companyName, ֆիզիկական անձի դեպքում՝ MASK
  const publicHeading = isLegal && user.companyName?.trim()
    ? user.companyName.trim()
    : maskApplicantDisplayName(user.name);
  const subheading = isLegal && user.companyName?.trim()
    ? maskApplicantDisplayName(user.name)
    : null;

  const initials = initialsFromMasked(maskApplicantDisplayName(user.name));

  const ratingAgg = await prisma.review.aggregate({
    where: { revieweeId: user.id, moderationStatus: "APPROVED" },
    _avg: { rating: true },
  });
  const avgRating = ratingAgg._avg.rating
    ? Number(ratingAgg._avg.rating)
    : null;

  const memberSince = user.createdAt;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-4 sm:px-6 sm:pb-20 sm:pt-6 lg:px-8">
        <Link
          href={ROUTES.tenders}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
        >
          ← Բոլոր մրցույթները
        </Link>

        <section className="mt-4 overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:rounded-4xl sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-slate-200 sm:size-28">
              {user.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.image}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-3xl font-black text-slate-500">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <AccountTypeBadge accountType={accountType} size="md" />
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
                    <BadgeCheck className="size-3.5" />
                    Հաստատված
                  </span>
                ) : null}
                {user.telegramVerifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-800 ring-1 ring-sky-200">
                    <ShieldCheck className="size-3.5" />
                    Telegram
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {publicHeading}
              </h1>
              {subheading ? (
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Կոնտակտային անձ՝ {subheading}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5 shrink-0 text-slate-400" />
                  Միացել է՝ {formatDateTime(memberSince)}
                </span>
                {avgRating !== null ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <Star className="size-3.5 fill-amber-400" />
                    {avgRating.toFixed(1)} ({user._count.reviewsReceived})
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5 text-center">
            <Stat label="Մրցույթներ" value={user._count.tenders} />
            <Stat label="Առաջարկներ" value={user._count.bids} />
            <Stat label="Կարծիքներ" value={user._count.reviewsReceived} />
          </div>
        </section>

        {user.bio?.trim() ? (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:rounded-4xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Իմ մասին
            </p>
            <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">
              {user.bio.trim()}
            </p>
          </section>
        ) : null}

        {user.credentials.length > 0 ? (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:rounded-4xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Փաստաթղթեր և հավաստագրեր
              </p>
              <span className="text-xs font-bold text-slate-400">
                {user.credentials.length}
              </span>
            </div>

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {user.credentials.map((credential) => {
                const Icon = KIND_ICON[credential.kind] ?? FileText;
                return (
                  <li
                    key={credential.id}
                    className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-amber-700 ring-1 ring-slate-200">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          {KIND_LABEL[credential.kind] ?? "Փաստաթուղթ"}
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-slate-900">
                          {credential.title}
                        </p>
                        {credential.issuer ? (
                          <p className="text-xs font-bold text-slate-500">
                            {credential.issuer}
                          </p>
                        ) : null}
                        {credential.description ? (
                          <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
                            {credential.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              Ֆայլերը տեսանելի են միայն հաստատված համագործակցության ժամանակ։
            </p>
          </section>
        ) : null}

        {user.portfolioItems.length > 0 ? (
          <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:rounded-4xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Պորտֆոլիո
              </p>
              <span className="text-xs font-bold text-slate-400">
                {user.portfolioItems.length}
              </span>
            </div>

            <ul className="mt-4 grid gap-5 sm:grid-cols-2">
              {user.portfolioItems.map((item) => (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-slate-200"
                >
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {item.images.slice(0, 4).map((img) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className="aspect-square w-full rounded-2xl object-cover"
                      />
                    ))}
                    {item.images.length === 0 ? (
                      <div className="col-span-2 flex aspect-video items-center justify-center rounded-2xl bg-white text-slate-400">
                        <ImageIcon className="size-8" />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1 px-4 pb-4">
                    <p className="text-base font-black text-slate-900">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="line-clamp-3 text-xs font-semibold leading-6 text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | bigint }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
      <p className="text-lg font-black tabular-nums text-slate-900">
        {Number(value)}
      </p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
