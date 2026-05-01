import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  FileDown,
  MapPin,
} from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
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
      client: { select: { id: true, name: true } },
      locality: { select: { name: true } },
      _count: { select: { bids: true } },
    },
  });

  if (!tender) {
    notFound();
  }

  const isOwner = session?.user?.id === tender.clientId;
  if (!isOwner && tender.status !== "ACTIVE") {
    notFound();
  }

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

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href={
              isOwner ? ROUTES.myTenders : ROUTES.tenders
            }
            className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            {isOwner ? "Իմ մրցույթներ" : "Բոլոր մրցույթները"}
          </Link>

          <article className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
                {placeLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-amber-700" />
                    {placeLabel}
                    {tender.address ? `, ${tender.address}` : null}
                  </span>
                ) : tender.address ? (
                  <span>{tender.address}</span>
                ) : null}
                {tender.startsAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-4 text-slate-400" />
                    Մեկնարկ՝ {formatDateTime(tender.startsAt)}
                  </span>
                ) : null}
                {tender.endsAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-4 text-slate-400" />
                    Վերջնաժամկետ՝ {formatDateTime(tender.endsAt)}
                  </span>
                ) : null}
              </div>
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
                      className="aspect-[4/3] w-full object-cover"
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
              </div>

              {!isOwner && tender.status === "ACTIVE" && tender.isBlindBidding ? (
                <p className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200">
                  Այս մրցույթում առաջարկների գները և տեքստերը փակ են մինչև վերջնաժամկետը կամ
                  պատվիրատուի քայլերը՝ ըստ հարթակի կանոնների։
                </p>
              ) : null}

              {isOwner || tender.status === "ACTIVE" ? (
                <p className="text-xs font-semibold text-slate-500">
                  Պատվիրատու՝{" "}
                  <span className="font-bold text-slate-700">
                    {tender.client.name?.trim() || "Անունը թաքնված է"}
                  </span>
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

              {tender.status === "ACTIVE" && !isOwner ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 px-4 py-5 text-center">
                  <BriefcaseBusiness className="mx-auto size-8 text-amber-700" />
                  <p className="mt-2 text-sm font-bold text-amber-950">
                    Առաջարկ ուղարկելու գործառույթը շուտով կավելացվի այս էջից։
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-900/80">
                    Մինչ այդ պահեք մրցույթի մասին նշումները՝ նույն վերջնաժամկետով։
                  </p>
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
