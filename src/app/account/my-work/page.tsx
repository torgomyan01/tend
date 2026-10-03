import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  MessageSquare,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { formatAmd } from "@/lib/format";
import {
  getProviderWorkProgress,
  MY_WORK_ACTIVE_STATUSES,
  waitingOnLabel,
} from "@/lib/my-work";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Իմ աշխատանքները | Tend.am",
};

function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email;
}

export default async function AccountMyWorkPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.accountMyWork)}`,
    );
  }

  const userId = session.user.id;

  const rows = await prisma.tenderEscrow.findMany({
    where: {
      providerId: userId,
      status: { in: MY_WORK_ACTIVE_STATUSES },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      status: true,
      contractAmount: true,
      providerReceives: true,
      platformFeePercent: true,
      paymentCode: true,
      updatedAt: true,
      fundedAt: true,
      disputedAt: true,
      releaseRequestedAt: true,
      tender: {
        select: {
          id: true,
          title: true,
          city: true,
          category: true,
          service: true,
        },
      },
      contract: {
        select: {
          id: true,
          status: true,
          conversation: { select: { id: true } },
        },
      },
      client: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const items = rows.map((row) => {
    const progress = getProviderWorkProgress({
      escrowStatus: row.status,
      contractStatus: row.contract.status,
    });
    return { row, progress };
  });

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.account}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="size-4" />
          Իմ հաշիվ
        </Link>

        <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
              <BriefcaseBusiness className="size-3.5" />
              Կատարող
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Իմ աշխատանքները
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold text-slate-600">
              Այստեղ երևում են այն գործերը, որոնք վերցրել եք և դեռ ընթացքում են՝
              էտապով, կարգավիճակով և հաջորդ քայլով։
            </p>
          </div>
          <p className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-slate-200">
            {items.length} ընթացիկ
          </p>
        </header>

        {items.length === 0 ? (
          <section className="mt-8 rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
            <BriefcaseBusiness className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-black text-slate-900">
              Ընթացիկ աշխատանքներ չկան
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Երբ պատվիրատուն ձեզ ընտրի և սկսվի պաշտպանված գործարքը, այն կհայտնվի
              այստեղ։
            </p>
            <Link
              href={ROUTES.tenders}
              className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white"
            >
              Դիտել մրցույթները
            </Link>
          </section>
        ) : (
          <ul className="mt-8 space-y-4">
            {items.map(({ row, progress }) => {
              const pct = Math.round(
                ((progress.stageIndex + 1) / progress.stages.length) * 100,
              );
              return (
                <li
                  key={row.id}
                  className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={ROUTES.tenderDetail(row.tender.id)}
                          className="text-lg font-black tracking-tight text-slate-950 hover:underline"
                        >
                          {row.tender.title}
                        </Link>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {row.tender.category} · {row.tender.service}
                          {row.tender.city ? ` · ${row.tender.city}` : ""}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          Պատվիրատու՝{" "}
                          <Link
                            href={ROUTES.userProfile(row.client.id)}
                            className="font-black text-amber-900 hover:underline"
                          >
                            {displayName(row.client)}
                          </Link>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-slate-950">
                          {formatAmd(Number(row.contractAmount))}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          Դուք կստանաք{" "}
                          {formatAmd(Number(row.providerReceives))} (
                          {Number(row.platformFeePercent)}% միջնորդավճար)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
                        {progress.statusLabel}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${
                          progress.waitingOn === "you"
                            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                            : progress.waitingOn === "admin"
                              ? "bg-indigo-50 text-indigo-900 ring-indigo-200"
                              : "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {waitingOnLabel(progress.waitingOn)}
                      </span>
                    </div>

                    <ol className="mt-5 grid gap-2 sm:grid-cols-4">
                      {progress.stages.map((stage, index) => {
                        const done = index < progress.stageIndex;
                        const current = index === progress.stageIndex;
                        return (
                          <li
                            key={stage.key}
                            className={`rounded-2xl px-3 py-2.5 ring-1 ${
                              current
                                ? "bg-slate-950 text-white ring-slate-950"
                                : done
                                  ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
                                  : "bg-slate-50 text-slate-500 ring-slate-200"
                            }`}
                          >
                            <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                              Էտապ {index + 1}
                            </p>
                            <p className="mt-0.5 text-sm font-black">
                              {stage.title}
                            </p>
                          </li>
                        );
                      })}
                    </ol>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Ընթացք</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#f7f4ee] px-4 py-3 ring-1 ring-amber-100">
                      <p className="text-[10px] font-black uppercase tracking-wide text-amber-800">
                        Ինչ պետք է արվի հիմա
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                        {progress.nextAction}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link
                        href={ROUTES.contract(row.contract.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white"
                      >
                        <FileText className="size-3.5" />
                        Պայմանագիր
                      </Link>
                      {row.contract.conversation?.id ? (
                        <Link
                          href={ROUTES.messageThread(
                            row.contract.conversation.id,
                          )}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200"
                        >
                          <MessageSquare className="size-3.5" />
                          Զրույց
                        </Link>
                      ) : null}
                      <Link
                        href={ROUTES.tenderDetail(row.tender.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-800 ring-1 ring-slate-200"
                      >
                        Մրցույթ
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
