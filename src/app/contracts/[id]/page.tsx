import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ContractSignClient } from "@/components/contract-sign-client";
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
  const contract = await prisma.tenderContract.findUnique({
    where: { id },
    select: { tender: { select: { title: true } } },
  });
  if (!contract) return { title: "Պայմանագիր", robots: { index: false, follow: false } };
  return {
    title: `Պայմանագիր՝ ${contract.tender.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function ContractPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `${ROUTES.login}?callbackUrl=${encodeURIComponent(ROUTES.contract(id))}`,
    );
  }

  const userId = session.user.id;

  const contract = await prisma.tenderContract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      bodyText: true,
      clientAcceptedAt: true,
      providerAcceptedAt: true,
      tenderId: true,
      tender: {
        select: {
          id: true,
          title: true,
          clientId: true,
        },
      },
      bid: {
        select: {
          providerId: true,
          provider: { select: { name: true, email: true } },
        },
      },
      conversation: { select: { id: true } },
    },
  });

  if (!contract) notFound();

  const isOwner = userId === contract.tender.clientId;
  const isProposedProvider = userId === contract.bid.providerId;

  if (!isOwner && !isProposedProvider) {
    notFound();
  }

  const providerName =
    contract.bid.provider.name?.trim() ||
    contract.bid.provider.email ||
    "Կատարող";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />
      <main className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 w-full max-w-3xl">
          <Link
            href={
              contract.conversation
                ? ROUTES.messageThread(contract.conversation.id)
                : ROUTES.tenderDetail(contract.tenderId)
            }
            className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Հետ
          </Link>
        </div>
        <ContractSignClient
          tenderId={contract.tenderId}
          contractId={contract.id}
          status={contract.status}
          bodyText={contract.bodyText}
          clientAcceptedAt={contract.clientAcceptedAt?.toISOString() ?? null}
          providerAcceptedAt={
            contract.providerAcceptedAt?.toISOString() ?? null
          }
          providerName={providerName}
          tenderTitle={contract.tender.title}
          conversationId={contract.conversation?.id ?? null}
          isOwner={isOwner}
          isProposedProvider={isProposedProvider}
        />
      </main>
    </div>
  );
}
