import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";
import { breadcrumbList, collectionPage } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { plainTextSnippet } from "@/lib/seo/truncate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function buildServiceTendersHref(categoryTitle: string, serviceTitle: string) {
  const sp = new URLSearchParams();
  sp.set("category", categoryTitle);
  sp.set("service", serviceTitle);
  return `${ROUTES.tenders}?${sp.toString()}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.serviceCategory.findUnique({
    where: { id },
    select: { title: true, description: true, isActive: true },
  });
  if (!category || !category.isActive) {
    return buildPageMetadata({
      title: "Ոլորտը չի գտնվել",
      path: ROUTES.categories,
      robots: { index: false, follow: true },
    });
  }
  return buildPageMetadata({
    title: category.title,
    description: plainTextSnippet(
      category.description ||
        `${category.title}՝ մրցույթներ և ծառայություններ Tend.am հարթակում։`,
    ),
    path: ROUTES.categoryDetail(id),
  });
}

export default async function CategoryDetailPage({ params }: Props) {
  const { id } = await params;

  const category = await prisma.serviceCategory.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      isActive: true,
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true },
      },
    },
  });

  if (!category || !category.isActive) {
    notFound();
  }

  const path = ROUTES.categoryDetail(category.id);
  const description =
    category.description?.trim() ||
    `${category.title}՝ մրցույթներ և ծառայություններ Tend.am հարթակում։`;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <JsonLd
        data={[
          collectionPage({
            name: category.title,
            description: plainTextSnippet(description, 300),
            path,
          }),
          breadcrumbList([
            { name: "Գլխավոր", path: ROUTES.home },
            { name: "Ոլորտներ", path: ROUTES.categories },
            { name: category.title, path },
          ]),
        ]}
      />
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
        <Link
          href={ROUTES.categories}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Բոլոր ոլորտները
        </Link>

        <section className="mt-4 overflow-hidden rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {category.title}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
            {category.description}
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Ծառայություններ
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {category.services.map((service) => (
              <Link
                key={service.id}
                href={buildServiceTendersHref(category.title, service.title)}
                className="group flex items-center justify-between gap-3 rounded-4xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-950">
                    {service.title}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    Տեսնել այս ծառայության մրցույթները
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-amber-700" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
