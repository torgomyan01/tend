import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { TelegramVerificationPanel } from "@/components/telegram-verification-panel";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { maskArmenianPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function VerifyTelegramPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramVerifiedAt: true,
      phone: true,
    },
  });

  if (!user) {
    redirect(ROUTES.login);
  }

  const safeCallback = (raw?: string) => {
    if (raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("://")) {
      return raw;
    }
    return ROUTES.home;
  };

  if (user.telegramVerifiedAt) {
    redirect(safeCallback(params.callbackUrl));
  }

  const callbackUrl = safeCallback(params.callbackUrl);

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg pt-6 sm:pt-10">
          <Link
            href={ROUTES.login}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" />
            Ելք
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Հաշվի ակտիվացում
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Ավարտեք Telegram վերիֆիկացիան
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Միացրեք Telegram-ը ծանուցումների համար։ Եթե գրանցվել եք Google-ով և
            դեռ հեռախոսահամար չունեք, նախ կխնդրենք ավելացնել այն, ապա
            կշարունակեք bot-ով հաստատումը։
          </p>

          <div className="mt-8">
            <TelegramVerificationPanel
              successHref={callbackUrl}
              initialPhoneMasked={
                user.phone ? maskArmenianPhone(user.phone) : undefined
              }
              showLoginLink={false}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
