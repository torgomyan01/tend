import Link from "next/link";
import { getServerSession } from "next-auth";
import { AuthDropdown } from "@/components/auth-dropdown";
import { TelegramConnectBanner } from "@/components/telegram-connect-banner";
import { TelegramNavbarNudge } from "@/components/telegram-navbar-nudge";
import { LanguageDropdown } from "@/components/language-dropdown";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteNav } from "@/components/site-nav";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { MessagesNavLink } from "@/components/messages-unread-badge";
import { WalletDropdown } from "@/components/wallet-dropdown";
import { authOptions } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import Image from "next/image";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user?.id);
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const authLabel =
    session?.user?.name?.trim() ||
    session?.user?.email?.trim() ||
    "Մուտք եղած եք";

  return (
    <>
    <TelegramConnectBanner />
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Link
        href={ROUTES.home}
        className="flex items-center gap-3"
        aria-label="Tend.am"
      >
        {/* <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-xl shadow-slate-950/20">
          T
        </span> */}
        <Image src="/icons/logo.svg" alt="Tend.am" width={100} height={100} className="size-11" />
        <span className="text-xl font-black tracking-tight hidden md:block">Tend.am</span>
      </Link>
      <SiteNav />
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <div className="hidden md:contents">
              <TelegramNavbarNudge />
            </div>
            <NotificationsDropdown
              isLoggedIn={isLoggedIn}
              className="hidden md:block"
            />
            <MessagesNavLink
              isLoggedIn={isLoggedIn}
              className="hidden md:grid"
            />
            <div className="hidden md:contents">
              <WalletDropdown isLoggedIn={isLoggedIn} />
            </div>
          </>
        ) : null}
        {/* <LanguageDropdown /> */}
        {isLoggedIn ? (
          <AuthDropdown isLoggedIn={isLoggedIn} isAdmin={isAdmin} label={authLabel} />
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={ROUTES.login}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
            >
              Մուտք
            </Link>
            <Link
              href={ROUTES.register}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm ring-1 ring-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Գրանցում
            </Link>
          </div>
        )}
        <MobileMenu isLoggedIn={isLoggedIn} isAdmin={isAdmin} />
      </div>
    </header>
    </>
  );
}
