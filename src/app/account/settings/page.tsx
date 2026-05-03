import { ArrowLeft, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountProfileSettings } from "@/components/account-profile-settings";
import { AccountSettingsInterests } from "@/components/account-settings-interests";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Կարգավորումներ | Tend.am",
};

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.accountSettings)}`);
  }

  const userId = session.user.id;

  const [profileUser, categories, interestRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phone: true,
        image: true,
      },
    }),
    getServiceCategories(),
    prisma.userInterest.findMany({
      where: { userId },
      orderBy: [{ category: "asc" }, { service: "asc" }],
      select: { category: true, service: true },
    }),
  ]);

  if (!profileUser) {
    redirect(ROUTES.login);
  }

  const initialInterests = interestRows.map((r) => ({
    category: r.category,
    service: r.service,
  }));

  const initialProfile = {
    name: profileUser.name,
    email: profileUser.email,
    phone: profileUser.phone,
    image: profileUser.image,
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Link
            href={ROUTES.account}
            className="inline-flex w-fit items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Իմ հաշիվ
          </Link>

          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <Settings2 className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Կարգավորումներ
                </h1>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  Փոխեք անունը, կապը, պրոֆիլի նկարը և գաղտնաբառը։ Ստորև կարող եք
                  կառավարել նաև նախընտրած ոլորտները՝ նոր մրցույթների Telegram
                  ծանուցումների համար։
                </p>
              </div>
            </div>

            <div className="mt-10">
              <AccountProfileSettings initialProfile={initialProfile} />
            </div>
          </section>

          <section className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Իմ նախընտրելի ոլորտները
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Ավելացրեք կամ հեռացրեք ծառայության ուղղություններն այնպես, ինչպես
              գրանցման ժամանակ։
            </p>

            <div className="mt-6">
              <AccountSettingsInterests
                categories={categories}
                initialInterests={initialInterests}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
