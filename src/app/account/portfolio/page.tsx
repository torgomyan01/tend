import { Album, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountPortfolioManager } from "@/components/account-portfolio-manager";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Իմ պորտֆոլիոն | Tend.am",
};

export default async function AccountPortfolioPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.accountPortfolio)}`,
    );
  }

  const portfolioRows = await prisma.userPortfolioItem.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      sortOrder: true,
      createdAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, sortOrder: true },
      },
    },
  });

  const initialPortfolio = portfolioRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      sortOrder: img.sortOrder,
    })),
  }));

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
                <Album className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  Իմ պորտֆոլիոն
                </h1>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  Ավելացրեք, դիտեք կամ ջնջեք ձեր ավարտած աշխատանքները՝ նկարներով և
                  կարճ նկարագրությամբ։ Դրանք կերևան ձեր հանրային պրոֆիլում։
                </p>
              </div>
            </div>

            <div className="mt-8">
              <AccountPortfolioManager initialItems={initialPortfolio} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
