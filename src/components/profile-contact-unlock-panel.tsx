"use client";

import { CheckCircle, Loader2, Lock, Mail, Phone, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { formatAmd } from "@/lib/format";
import { PROFILE_CONTACT_UNLOCK_FEE_AMD } from "@/lib/profile-contact-unlock";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export type ProfileContactData = {
  phone: string | null;
  email: string;
  companyPhone: string | null;
  isLegalEntity: boolean;
};

type Props = {
  profileUserId: string;
  loginHref: string;
  initialUnlocked: boolean;
  initialAuthenticated: boolean;
  isOwnProfile: boolean;
  contact: ProfileContactData | null;
  initialBalance: number | null;
  variant?: "default" | "sidebar";
};

export function ProfileContactUnlockPanel({
  profileUserId,
  loginHref,
  initialUnlocked,
  initialAuthenticated,
  isOwnProfile,
  contact,
  initialBalance,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [pending, setPending] = useState(false);
  const [balance, setBalance] = useState(initialBalance);

  const canShowContacts = isOwnProfile || unlocked;
  const isSidebar = variant === "sidebar";

  const shellClass = isSidebar
    ? "rounded-4xl shadow-[0_8px_32px_-8px_rgba(15,23,42,0.15)] ring-1 ring-slate-200/80"
    : "mt-6 rounded-4xl shadow-sm ring-1 ring-slate-200";

  async function handleUnlock() {
    setPending(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(profileUserId)}/unlock-contact`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        balance?: number;
      } | null;

      if (!res.ok) {
        if (data?.error === "INSUFFICIENT_BALANCE") {
          const msg = `Դրամապանակում բավարար միջոց չկա։ Պետք է ${formatAmd(PROFILE_CONTACT_UNLOCK_FEE_AMD)}։`;
          toastError("Անբավարար միջոց", msg);
          return;
        }
        if (data?.error === "UNAUTHENTICATED") {
          toastError("Մուտք", "Կոնտակտները տեսնելու համար մուտք գործեք։");
          return;
        }
        toastError("Չհաջողվեց", "Փորձեք կրկին մի փոքր ուշ։");
        return;
      }

      setUnlocked(true);
      if (typeof data?.balance === "number") {
        setBalance(data.balance);
      }
      toastSuccess(
        "Կոնտակտները բացված են",
        "Կարող եք կապվել մասնագետի հետ։",
      );
      router.refresh();
    } catch {
      toastError("Ցանցի խնդիր", "Չհաջողվեց կատարել վճարումը։");
    } finally {
      setPending(false);
    }
  }

  if (canShowContacts && contact) {
    return (
      <section className={`${shellClass} overflow-hidden bg-white`}>
        <div className="border-b border-emerald-100 bg-linear-to-br from-emerald-50 to-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="size-4" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                Կոնտակտներ բացված են
              </p>
              <p className="text-[11px] font-semibold text-emerald-700/70">
                Կարող եք կապվել անմիջապես
              </p>
            </div>
          </div>
        </div>
        <ul className="space-y-2 p-4 sm:p-5">
          {contact.phone ? (
            <ContactRow
              icon={Phone}
              label="Հեռախոս"
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              value={contact.phone}
            />
          ) : null}
          {contact.isLegalEntity && contact.companyPhone ? (
            <ContactRow
              icon={Phone}
              label="Ընկերության հեռախոս"
              href={`tel:${contact.companyPhone.replace(/\s/g, "")}`}
              value={contact.companyPhone}
            />
          ) : null}
          <ContactRow
            icon={Mail}
            label="Էլ․ փոստ"
            href={`mailto:${contact.email}`}
            value={contact.email}
            breakAll
          />
        </ul>
      </section>
    );
  }

  if (!initialAuthenticated) {
    return (
      <LockedShell isSidebar={isSidebar} shellClass={shellClass}>
        <p className="text-sm font-semibold leading-relaxed text-slate-300">
          Մուտք գործեք և վճարեք {formatAmd(PROFILE_CONTACT_UNLOCK_FEE_AMD)}՝
          ամբողջական անունը, հեռախոսահամարն ու էլ․ փոստը տեսնելու համար։
        </p>
        <Link
          href={loginHref}
          className="mt-5 flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-slate-100"
        >
          Մուտք գործել
        </Link>
      </LockedShell>
    );
  }

  return (
    <LockedShell isSidebar={isSidebar} shellClass={shellClass}>
      <p className="text-sm font-semibold leading-relaxed text-slate-300">
        Տեսնել ամբողջական անունը, հեռախոսահամարը և էլ․ փոստը՝ մեկ անգամյա{" "}
        <span className="font-black text-amber-300">
          {formatAmd(PROFILE_CONTACT_UNLOCK_FEE_AMD)}
        </span>{" "}
        վճարով։
      </p>
      {balance !== null ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-white/10">
          <Wallet className="size-3.5" />
          Դրամապանակ՝ {formatAmd(balance)}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => void handleUnlock()}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Lock className="size-4" />
        )}
        Բացել կոնտակտները
      </button>
      <p className="mt-3 text-center text-[11px] font-semibold leading-relaxed text-slate-500">
        Մի անգամ վճարելուց հետո անունը և կոնտակտները մնում են բացված։
      </p>
      <Link
        href={ROUTES.account}
        className="mt-3 block text-center text-xs font-black text-amber-300/90 hover:text-amber-200 hover:underline"
      >
        Լիցքավորել դրամապանակը →
      </Link>
    </LockedShell>
  );
}

function LockedShell({
  children,
  isSidebar,
  shellClass,
}: {
  children: ReactNode;
  isSidebar: boolean;
  shellClass: string;
}) {
  return (
    <section
      className={`${shellClass} relative overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white sm:p-6`}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-amber-400/15 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Lock className="size-5 text-amber-300" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              {isSidebar ? "Կապ հաստատել" : "Կոնտակտներ"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
              Մասնագետի տվյալները
            </p>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  value,
  breakAll,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-200/80 transition hover:bg-amber-50/60 hover:ring-amber-200/60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-slate-200/80">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p
            className={`text-sm font-black text-slate-900 ${breakAll ? "break-all" : ""}`}
          >
            {value}
          </p>
        </div>
      </a>
    </li>
  );
}
