import { AlertTriangle, ArrowRight, Briefcase, Pencil } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import {
  CreateTenderForm,
  type CreateTenderInitialDraft,
} from "@/components/create-tender-form";
import { SiteHeader } from "@/components/site-header";
import { SupportContactLinks } from "@/components/support-contact-links";
import { isAccountVerified } from "@/lib/account-verification";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocationPickerOptions } from "@/lib/locations-data";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Խմբագրել մրցույթ",
  robots: NOINDEX_NOFOLLOW,
};

type Props = {
  params: Promise<{ id: string }>;
};

function decimalToBudgetInput(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const n = Number(String(value as { toString(): string }));
  if (!Number.isFinite(n)) {
    return "";
  }
  return Math.round(n).toLocaleString("hy-AM");
}

function durationDaysForEdit(
  draftDurationDays: number | null,
  endsAt: Date | null,
): number {
  if (
    draftDurationDays != null &&
    draftDurationDays >= 1 &&
    draftDurationDays <= 90
  ) {
    return draftDurationDays;
  }
  if (!endsAt) {
    return 7;
  }
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) {
    return 7;
  }
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.min(90, Math.max(1, d));
}

export default async function EditTenderPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.editTender(id))}`);
  }

  const [user, categories, locationOptions, tender] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        telegramVerifiedAt: true,
        emailVerified: true,
        isBlocked: true,
        name: true,
      },
    }),
    getServiceCategories(),
    getLocationPickerOptions(),
    prisma.tender.findFirst({
      where: { id, clientId: session.user.id },
      include: {
        selectedServices: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        documents: { orderBy: { sortOrder: "asc" } },
        _count: { select: { bids: true } },
      },
    }),
  ]);

  if (!user) {
    redirect(ROUTES.login);
  }

  if (!tender) {
    notFound();
  }

  const rowStatus = tender.status;
  if (
    rowStatus === "AWARDED" ||
    rowStatus === "COMPLETED" ||
    rowStatus === "CANCELLED" ||
    rowStatus === "EXPIRED_UNAWARDED"
  ) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
              <Pencil className="size-6" />
            </span>
            <h1 className="text-2xl font-black">Այս մրցույթը չի կարող խմբարկվել</h1>
            <p className="text-sm font-semibold text-slate-600">
              Ավարտված, չեղարկված, ժամկետանց կամ մրցանակակիր ընտրված մրցույթների
              բովանդակությունը փոխել հնարավոր չէ։
            </p>
            <Link
              href={ROUTES.tenderDetail(id)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Վերադառնալ մրցույթին
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (rowStatus === "ACTIVE" && tender._count.bids > 0) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="text-2xl font-black">Խմբագրումը հասանելի չէ</h1>
            <p className="text-sm font-semibold text-slate-600">
              Այս մրցույթում արդեն կան առաջարկներ, ուստի մրցույթի պայմանները չեն կարող
              փոխվել՝ արդարության համար։
            </p>
            <Link
              href={ROUTES.tenderDetail(id)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Վերադառնալ մրցույթին
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (user.isBlocked) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="text-2xl font-black">Հաշիվը արգելափակված է</h1>
            <p className="text-sm font-semibold text-slate-600">
              Մրցույթ խմբագրելու համար անհրաժեշտ է կապ հաստատել աջակցության թիմի
              հետ։
            </p>
            <SupportContactLinks className="mt-4" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAccountVerified(user)) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="text-2xl font-black">Հաշվի հաստատումը անհրաժեշտ է</h1>
            <p className="text-sm font-semibold text-slate-600">
              Շարունակելու համար հաստատեք հաշիվը Telegram-ով կամ էլ․ փոստով։
            </p>
            <Link
              href={ROUTES.accountVerify}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Անցնել հաշվի էջ
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const locationLabel =
    tender.locationId != null
      ? (locationOptions.find((o) => o.id === tender.locationId)?.label ?? "")
      : "";
  const step = Math.min(Math.max(tender.draftWizardStep ?? 1, 1), 10);
  const durationDays = durationDaysForEdit(tender.draftDurationDays, tender.endsAt);

  const initialDraft: CreateTenderInitialDraft = {
    id: tender.id,
    title: tender.title,
    description: tender.description,
    services: tender.selectedServices.map((row) => ({
      category: row.category,
      service: row.service,
    })),
    budgetMin: decimalToBudgetInput(tender.budgetMin),
    budgetMax: decimalToBudgetInput(tender.budgetMax),
    locationId: tender.locationId,
    locationLabel,
    address: tender.address ?? "",
    durationDays,
    wizardStep: step,
    isBlindBidding: tender.isBlindBidding,
    images: tender.images.map((im) => ({ id: im.id, url: im.url })),
    documents: tender.documents.map((d) => ({
      id: d.id,
      url: d.url,
      originalFileName: d.originalFileName,
    })),
    tenderStatus: rowStatus,
    endsAtIso: tender.endsAt?.toISOString() ?? null,
  };

  const statusLabel =
    rowStatus === "DRAFT"
      ? "Սևագիր"
      : rowStatus === "REVIEW"
        ? "Մոդերացիա"
        : "Ակտիվ";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f0ebe3] text-slate-950">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,rgba(251,191,36,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_20%,rgba(30,41,59,0.06),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(16,185,129,0.08),transparent_45%)]"
        aria-hidden
      />

      <SiteHeader />

      <main className="relative px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pb-24 lg:pt-10">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 sm:gap-8">
          <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-xl sm:rounded-4xl sm:p-8 lg:p-10">
            <div
              className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-amber-300/20 blur-3xl sm:size-96"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-16 size-64 rounded-full bg-emerald-300/15 blur-3xl"
              aria-hidden
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              <div className="max-w-2xl space-y-4">
                <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-300/60 bg-amber-100/70 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-900 shadow-sm sm:px-4 sm:py-2 sm:text-[0.78rem]">
                  <Pencil className="size-3.5 text-amber-800" aria-hidden />
                  Խմբագրել մրցույթը
                  <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[0.65rem] tracking-[0.1em] text-amber-100">
                    {statusLabel}
                  </span>
                </p>
                <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                  {tender.title}
                </h1>
                <p className="text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  Փոխեք նկարագրությունը, նկարները, բյուջեն, վայրը և մնացած դաշտերը։ Ակտիվ
                  մրցույթում առաջարկներ չլինելու դեպքում փոփոխությունները կիրառվում են
                  անմիջապես հարթակում։
                </p>
                <p className="text-sm font-semibold text-slate-500">
                  <Link
                    href={ROUTES.tenderDetail(id)}
                    className="font-black text-amber-900 underline-offset-2 hover:underline"
                  >
                    ← Վերադառնալ մրցույթի էջ
                  </Link>
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-white/80 sm:min-w-[18rem]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[0.78rem]">
                  Հիշեցում
                </p>
                <ul className="space-y-3 text-sm font-medium leading-snug text-slate-700 sm:text-[0.95rem]">
                  <li className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                      <Briefcase className="size-3.5" />
                    </span>
                    <span className="pt-1">
                      Մոդերացիայի փուլում կարող եք հետ վերցնել սևագիր կամ վեր-submit անել
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <CreateTenderForm
            categories={categories}
            locationOptions={locationOptions}
            initialDraft={initialDraft}
            variant="edit"
          />
        </div>
      </main>
    </div>
  );
}
