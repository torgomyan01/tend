import { ArrowLeft, Mail, Send } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EmailVerificationPanel } from "@/components/email-verification-panel";
import { TelegramVerificationPanel } from "@/components/telegram-verification-panel";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { isAccountVerified } from "@/lib/account-verification";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<{ callbackUrl?: string; method?: string }>;
};

export default async function AccountVerifyPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect(ROUTES.login);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      emailVerified: true,
      telegramVerifiedAt: true,
      verificationChannel: true,
    },
  });

  if (!user || isAccountVerified(user)) {
    const raw = params.callbackUrl;
    const dest =
      raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("://")
        ? raw
        : ROUTES.home;
    redirect(dest);
  }

  const callbackUrl =
    params.callbackUrl &&
    params.callbackUrl.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : ROUTES.home;

  const showEmail =
    params.method === "email" || user.verificationChannel === "EMAIL";

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-slate-950">
      <SiteHeader />

      <main className="px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg pt-6 sm:pt-10">
          <Link
            href={ROUTES.login}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            <ArrowLeft className="size-4" />
            Ելք
          </Link>

          <h1 className="mt-8 text-3xl font-black tracking-tight">
            Ավարտեք հաշվի վերիֆիկացիան
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Ընտրեք Telegram կամ էլ․ փոստ՝ հաշիվը ակտիվացնելու համար։
          </p>

          {!showEmail ? (
            <div className="mt-6 flex gap-2">
              <Link
                href={`${ROUTES.accountVerify}?method=telegram&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                <Send className="size-4" />
                Telegram
              </Link>
              <Link
                href={`${ROUTES.accountVerify}?method=email&callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200"
              >
                <Mail className="size-4" />
                Email
              </Link>
            </div>
          ) : null}

          <div className="mt-8">
            {showEmail ? (
              <EmailVerificationPanel email={user.email} successHref={callbackUrl} />
            ) : (
              <TelegramVerificationPanel successHref={callbackUrl} showLoginLink={false} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
