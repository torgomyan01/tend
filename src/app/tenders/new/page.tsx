import { AlertTriangle, ArrowRight, Briefcase } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CreateTenderForm } from "@/components/create-tender-form";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocationPickerOptions } from "@/lib/locations-data";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

export default async function CreateTenderPage() {
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
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Նոր մրցույթ
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Տեղադրել մրցույթ
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
                  Մի քանի քայլ՝ ընտրեք ծառայությունը, նկարագրեք առաջադրանքը, որոշեք պայմանները
                  և ստացեք մասնագետների առաջարկները։
                </p>
              </div>
              <span className="hidden size-14 shrink-0 place-items-center rounded-3xl bg-slate-950 text-amber-300 sm:grid">
                <Briefcase className="size-6" />
              </span>
            </div>
          </section>

          <CreateTenderForm categories={categories} locationOptions={locationOptions} />
        </div>
      </main>
    </div>
  );
}
