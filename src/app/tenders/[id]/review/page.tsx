import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { TenderDedicatedReviewForm } from "@/components/tender-dedicated-review-form";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
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
  if (!tender) {
    return { title: "Գնահատում | Tend.am" };
  }
  return { title: `Գնահատում · ${tender.title} | Tend.am` };
}

export default async function TenderReviewPage({ params }: Props) {
  const { id: tenderId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.tenderReview(tenderId))}`,
    );
  }

  const viewerId = session.user.id;

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
      awardedBidId: true,
      awardedBid: {
        select: {
          id: true,
          providerId: true,
          provider: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!tender) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="font-bold text-slate-700">Մրցույթը չի գտնվել։</p>
          <Link
            href={ROUTES.tenders}
            className="mt-4 inline-block text-sm font-black text-amber-800 underline"
          >
            Բոլոր մրցույթները
          </Link>
        </main>
      </div>
    );
  }

  const strictAwardOk =
    tender.awardedBidId !== null &&
    tender.awardedBid !== null &&
    tender.awardedBid.id === tender.awardedBidId;

  const isCompletedPair =
    tender.status === "COMPLETED" && strictAwardOk;

  const isPatron = viewerId === tender.clientId;
  const isWinner =
    tender.awardedBid !== null && viewerId === tender.awardedBid.providerId;

  const eligibleParticipant = isPatron || isWinner;

  let counterpartName = "";
  let counterpartImage: string | null = null;
  let revieweeId = "";

  if (isCompletedPair && eligibleParticipant && tender.awardedBid) {
    if (isPatron) {
      const p = tender.awardedBid.provider;
      counterpartName = p.name?.trim() || p.email;
      counterpartImage = p.image;
      revieweeId = tender.awardedBid.providerId;
    } else {
      const c = tender.client;
      counterpartName = c.name?.trim() || c.email;
      counterpartImage = c.image;
      revieweeId = tender.clientId;
    }
  }

  const existingReview =
    isCompletedPair && eligibleParticipant && revieweeId
      ? await prisma.review.findUnique({
          where: {
            tenderId_reviewerId_revieweeId: {
              tenderId,
              reviewerId: viewerId,
              revieweeId,
            },
          },
          select: {
            rating: true,
            comment: true,
            createdAt: true,
            moderationStatus: true,
          },
        })
      : null;

  const serializedReview = existingReview
    ? {
        rating: existingReview.rating,
        comment: existingReview.comment,
        createdAt: existingReview.createdAt.toISOString(),
        moderationStatus: existingReview.moderationStatus,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <Link
            href={ROUTES.tenderDetail(tenderId)}
            className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Մրցույթին վերադառնալ
          </Link>

          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Գնահատում
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {tender.title}
          </p>

          <div className="mt-8">
            {!isCompletedPair ? (
              <div className="rounded-3xl bg-amber-50 px-6 py-6 ring-1 ring-amber-200">
                <p className="text-sm font-bold text-amber-950">
                  {tender.status !== "COMPLETED"
                    ? "Գնահատման էջը հասանելի է միայն ամբողջությամբ ավարտված մրցույթների համար, երբ պատվիրատուն փակել է աշխատանքը։"
                    : "Այս մրցույթում ընտրված կատարողը համակարգում չի համապատասխանում վերջնական ընտրությանը։ Գնահատումը անհնար է։"}
                </p>
              </div>
            ) : !eligibleParticipant ? (
              <div className="rounded-3xl bg-rose-50 px-6 py-6 ring-1 ring-rose-200">
                <p className="text-sm font-bold text-rose-950">
                  Այս էջում գնահատել կարող են միայն պատվիրատուն և ընտրված կատարողը —
                  այս մրցույթով իրար հետ կապված օգտատերերը։ Եթե դուք այլ առաջարկով եք
                  մասնակցել, այս մրցույթում գնահատում թողնել չեք կարող։
                </p>
              </div>
            ) : (
              <TenderDedicatedReviewForm
                tenderId={tenderId}
                tenderTitle={tender.title}
                counterpartName={counterpartName}
                counterpartImage={counterpartImage}
                existingReview={serializedReview}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
