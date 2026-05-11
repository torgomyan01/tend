import { AlertTriangle, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  CreateTenderForm,
  type CreateTenderInitialDraft,
} from "@/components/create-tender-form";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocationPickerOptions } from "@/lib/locations-data";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

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

export default async function CreateTenderPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const params = await searchParams;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const [user, categories, locationOptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        telegramVerifiedAt: true,
        isBlocked: true,
        name: true,
      },
    }),
    getServiceCategories(),
    getLocationPickerOptions(),
  ]);

  const draftQueryId =
    typeof params.draft === "string" && params.draft.trim() ? params.draft.trim() : null;

  let initialDraft: CreateTenderInitialDraft | null = null;
  if (draftQueryId) {
    const draft = await prisma.tender.findFirst({
      where: { id: draftQueryId, clientId: session.user.id, status: "DRAFT" },
      include: {
        selectedServices: { orderBy: { sortOrder: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
        documents: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (draft) {
      const locationLabel =
        draft.locationId != null
          ? (locationOptions.find((o) => o.id === draft.locationId)?.label ?? "")
          : "";
      const step = Math.min(Math.max(draft.draftWizardStep ?? 1, 1), 10);
      initialDraft = {
        id: draft.id,
        title: draft.title,
        description: draft.description,
        services: draft.selectedServices.map((row) => ({
          category: row.category,
          service: row.service,
        })),
        budgetMin: decimalToBudgetInput(draft.budgetMin),
        budgetMax: decimalToBudgetInput(draft.budgetMax),
        locationId: draft.locationId,
        locationLabel,
        address: draft.address ?? "",
        durationDays: draft.draftDurationDays ?? 7,
        wizardStep: step,
        isBlindBidding: draft.isBlindBidding,
        images: draft.images.map((im) => ({ id: im.id, url: im.url })),
        documents: draft.documents.map((d) => ({
          id: d.id,
          url: d.url,
          originalFileName: d.originalFileName,
        })),
      };
    }
  }

  if (!user) {
    redirect(ROUTES.login);
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
              Մրցույթ տեղադրելու համար անհրաժեշտ է կապ հաստատել թիմի հետ։
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user.telegramVerifiedAt) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-4xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-6" />
            </span>
            <h1 className="text-2xl font-black">Telegram վերիֆիկացիան անհրաժեշտ է</h1>
            <p className="text-sm font-semibold text-slate-600">
              Մրցույթ տեղադրելու համար նախ ավարտեք Telegram վերիֆիկացիան՝ ձեզ ծանուցելու և
              պաշտպանելու համար։
            </p>
            <Link
              href={ROUTES.account}
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
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-100/70 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-amber-900 shadow-sm sm:px-4 sm:py-2 sm:text-[0.78rem]">
                  <Briefcase className="size-3.5 text-amber-800" aria-hidden />
                  Նոր մրցույթ
                  {initialDraft ? (
                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[0.65rem] tracking-[0.1em] text-amber-100">
                      Սևագիր
                    </span>
                  ) : null}
                </p>
                <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
                  Ստեղծեք մրցույթ քայլ առ քայլ
                </h1>
                <p className="text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  Ընդամենը ինը հստակ քայլ՝ ծառայությունից մինչև նախադիտում։ Ցանկացած փուլից
                  կարող եք հետ գալ, իսկ պատվիրումը ավտոմատ պահպանվում է որպես սևագիր —
                  կարող եք շարունակել հետո։
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ring-1 ring-white/80 sm:min-w-[18rem]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:text-[0.78rem]">
                  Արագ պատկերացում
                </p>
                <ol className="space-y-3 text-sm font-medium leading-snug text-slate-700 sm:text-[0.95rem]">
                  <li className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                      1
                    </span>
                    <span className="pt-1">Լրացնում եք փուլ առ փուլ</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                      2
                    </span>
                    <span className="pt-1">Վերնագիր ու նկարագրություն AI‑ով</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                      3
                    </span>
                    <span className="pt-1">Հրապարակում եք կամ որպես սևագիր խնայում</span>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <CreateTenderForm
            categories={categories}
            locationOptions={locationOptions}
            initialDraft={initialDraft}
          />
        </div>
      </main>
    </div>
  );
}
