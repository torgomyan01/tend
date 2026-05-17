"use client";

import {
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  registerUserId?: string;
  email?: string;
  successHref?: string;
};

export function EmailVerificationPanel({
  registerUserId,
  email,
  successHref = ROUTES.login,
}: Props) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sent, setSent] = useState(Boolean(registerUserId));

  const poll = useCallback(async () => {
    try {
      const url = registerUserId
        ? `/api/auth/register/status?userId=${encodeURIComponent(registerUserId)}`
        : "/api/auth/telegram-verification/status";

      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        verified?: boolean;
        emailVerified?: boolean;
      };

      if (data.verified || data.emailVerified) {
        setIsVerified(true);
        toastSuccess("Էլ․ փոստը հաստատված է", "Կարող եք մուտք գործել։");
        router.refresh();
      }
    } catch {
      /* ignore */
    }
  }, [registerUserId, router]);

  useEffect(() => {
    if (isVerified) return;
    const id = window.setInterval(() => void poll(), 4000);
    return () => window.clearInterval(id);
  }, [isVerified, poll]);

  async function resend() {
    setIsResending(true);
    try {
      const res = await fetch("/api/auth/email-verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerUserId ? { userId: registerUserId } : {}),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toastError("Չուղարկվեց", "Փորձեք մի փոքր ուշ։");
        return;
      }
      setSent(true);
      toastSuccess("Ուղարկված է", "Ստուգեք էլ․ փոստի արկղը։");
    } catch {
      toastError("Ցանց", "Փորձեք նորից։");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="rounded-4xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6">
      <div className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
        {isVerified ? (
          <CheckCircle2 className="size-7" />
        ) : (
          <Mail className="size-7" />
        )}
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
        {isVerified ? "Էլ․ փոստը հաստատված է" : "Ստուգեք էլ․ փոստը"}
      </h2>

      <p className="mt-3 leading-7 text-slate-600">
        {isVerified
          ? "Ձեր հաշիվը ակտիվացված է։ Կարող եք մուտք գործել և օգտագործել հարթակը։"
          : sent
            ? `Ուղարկել ենք հաստատման հղում ${email ? `«${email}»` : "ձեր էլ․ փոստին"}։ Բացեք նամակը և սեղմեք «Հաստատել հաշիվը»։`
            : "Սեղմեք ներքևի կոճակը՝ հաստատման նամակ ստանալու համար։"}
      </p>

      {isVerified ? (
        <Link
          href={successHref}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
        >
          Մուտք գործել
        </Link>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => void resend()}
            disabled={isResending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800 disabled:opacity-60"
          >
            {isResending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <RefreshCw className="size-5" />
            )}
            {sent ? "Կրկին ուղարկել նամակը" : "Ուղարկել հաստատման նամակը"}
          </button>
          <p className="text-center text-sm font-semibold text-slate-500">
            Սպասում ենք հաստատմանը…
          </p>
        </div>
      )}
    </div>
  );
}
