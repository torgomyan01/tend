import { ArrowLeft, BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountVerificationForm } from "@/components/account-verification-form";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

export default async function AccountVerificationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      telegramChatId: true,
      telegramVerifiedAt: true,
    },
  });

  if (!user) {
    redirect(ROUTES.login);
  }

  const latestVerificationRequest = await prisma.verificationRequest.findFirst({
    where: { userId: user.id },
    orderBy: { submittedAt: "desc" },
    select: {
      status: true,
      submittedAt: true,
      moderationNote: true,
      selfieUrl: true,
      documentUrl: true,
    },
  });
  const verificationStatusLabel =
    latestVerificationRequest?.status === "APPROVED"
      ? "Հաստատված է"
      : latestVerificationRequest?.status === "REJECTED"
        ? "Մերժված է"
        : latestVerificationRequest?.status === "PENDING"
          ? "Սպասման մեջ է"
          : "Վերիֆիկացիա անհրաժեշտ է";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Link
            href={ROUTES.account}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
          >
            <ArrowLeft className="size-4" />
            Վերադառնալ հաշվի էջ
          </Link>

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-xl font-black">Վերիֆիկացիայի կարգավիճակ</h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <ShieldCheck className="size-5 text-amber-700" />
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Telegram կապակցում
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {user.telegramChatId
                        ? `Կապված է (Chat ID: ${user.telegramChatId})`
                        : "Չի կապակցված"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <BadgeCheck className="size-5 text-amber-700" />
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Հաշվի վերիֆիկացիա
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {verificationStatusLabel}
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-4xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-xl font-black">Հաշվի վերիֆիկացիա</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Կցեք մեկ սելֆի և մեկ փաստաթղթի նկար, մենք կանցկացնենք մոդերացիա
                և կհաստատենք հաշիվը։
              </p>
              <div className="mt-4">
                <AccountVerificationForm
                  currentRequest={latestVerificationRequest}
                />
              </div>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
