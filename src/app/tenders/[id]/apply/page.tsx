import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  TenderApplyForm,
  type ApplyPeerMessage,
} from "@/components/tender-apply-form";
import type { AccountTypeValue } from "@/lib/account-type";
import { authOptions } from "@/lib/auth";
import { computeBidFee } from "@/lib/bid-fee";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

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
  if (!tender) return { title: "Մասնակցություն | Tend.am" };
  return { title: `Մասնակցել՝ ${tender.title} | Tend.am` };
}

export default async function TenderApplyPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const applyPath = ROUTES.tenderApply(id);

  if (!session?.user?.id) {
    redirect(`${ROUTES.login}?callbackUrl=${encodeURIComponent(applyPath)}`);
  }

  const viewerId = session.user.id;

  const tender = await prisma.tender.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
      category: true,
      isBlindBidding: true,
      budgetMin: true,
      budgetMax: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (!tender) notFound();

  if (tender.clientId === viewerId) {
    redirect(ROUTES.tenderDetail(tender.id));
  }

  if (tender.status !== "ACTIVE") {
    redirect(ROUTES.tenderDetail(tender.id));
  }

  const now = new Date();
  if (
    (tender.endsAt && tender.endsAt <= now) ||
    (tender.startsAt && tender.startsAt > now)
  ) {
    redirect(ROUTES.tenderDetail(tender.id));
  }

  const existingBid = await prisma.bid.findUnique({
    where: {
      tenderId_providerId: { tenderId: tender.id, providerId: viewerId },
    },
    select: { id: true },
  });

  if (existingBid) {
    redirect(ROUTES.tenderDetail(tender.id));
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [freeUsedThisMonth, peerRows, peerTotalCount] = await Promise.all([
    prisma.bid.count({
      where: {
        providerId: viewerId,
        bidFeeAmount: 0,
        createdAt: { gte: monthStart },
      },
    }),
    tender.isBlindBidding
      ? Promise.resolve([])
      : prisma.bid.findMany({
          where: {
            tenderId: tender.id,
            status: { notIn: ["REJECTED", "WITHDRAWN"] },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            coverLetter: true,
            provider: {
              select: { name: true, image: true, accountType: true },
            },
          },
        }),
    prisma.bid.count({
      where: {
        tenderId: tender.id,
        status: { notIn: ["REJECTED", "WITHDRAWN"] },
      },
    }),
  ]);

  const freeRemaining = Math.max(2 - freeUsedThisMonth, 0);
  const computedFee = computeBidFee({
    budgetMin:
      tender.budgetMin !== null ? Number(tender.budgetMin) : null,
    budgetMax:
      tender.budgetMax !== null ? Number(tender.budgetMax) : null,
    category: tender.category,
    endsAt: tender.endsAt,
  });
  const fee = freeRemaining > 0 ? 0 : computedFee;

  const peerMessages: ApplyPeerMessage[] = peerRows.map((row) => ({
    id: row.id,
    coverLetter: row.coverLetter,
    provider: {
      name: row.provider.name,
      image: row.provider.image,
      accountType: row.provider.accountType as AccountTypeValue,
    },
  }));

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />
      <main className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href={ROUTES.tenderDetail(tender.id)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Վերադառնալ մրցույթ
          </Link>

          <div className="mb-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
              Մասնակցություն
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {tender.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
              {tender.isBlindBidding
                ? "Փակ մրցույթ է՝ մյուսների առաջարկները չեն երևում։ Գրեք ձեր գինը, ժամկետը և նամակը, կցեք ֆայլեր և հաստատեք։"
                : "Կարդացեք մյուս մասնակիցների հաղորդագրությունները, գրեք ձերը, կցեք ֆայլեր և հաստատեք։"}
            </p>
          </div>

          <TenderApplyForm
            tender={{
              id: tender.id,
              title: tender.title,
              isBlindBidding: tender.isBlindBidding,
              budgetMin:
                tender.budgetMin !== null ? Number(tender.budgetMin) : null,
              budgetMax:
                tender.budgetMax !== null ? Number(tender.budgetMax) : null,
            }}
            fee={fee}
            freeRemaining={freeRemaining}
            peerMessages={peerMessages}
            peerTotalCount={peerTotalCount}
          />
        </div>
      </main>
    </div>
  );
}
