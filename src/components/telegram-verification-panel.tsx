"use client";

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type LinkPayload = {
  telegramBotUrl: string;
  phoneMasked: string;
};

type StatusPayload = {
  verified: boolean;
  phoneMasked: string | null;
};

type Props = {
  registerUserId?: string;
  initialTelegramBotUrl?: string;
  initialPhoneMasked?: string;
  successHref?: string;
  showLoginLink?: boolean;
};

export function TelegramVerificationPanel({
  registerUserId,
  initialTelegramBotUrl,
  initialPhoneMasked,
  successHref = ROUTES.home,
  showLoginLink = true,
}: Props) {
  const router = useRouter();
  const [botUrl, setBotUrl] = useState(initialTelegramBotUrl ?? "");
  const [phoneMasked, setPhoneMasked] = useState<string | null>(
    initialPhoneMasked ?? null,
  );
  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLink = useCallback(async () => {
    if (registerUserId) {
      return;
    }

    setIsLoadingLink(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/telegram-verification/link", {
        method: "POST",
      });
      const data = (await res.json()) as LinkPayload & { error?: string };

      if (!res.ok) {
        if (data.error === "ALREADY_VERIFIED") {
          setIsVerified(true);
          return;
        }
        const msg = "Չհաջողվեց ստեղծել Telegram հղումը։";
        setError(msg);
        toastError("Սխալ", msg);
        return;
      }

      setBotUrl(data.telegramBotUrl);
      setPhoneMasked(data.phoneMasked);
    } catch {
      const msg = "Ցանցի խնդիր։ Փորձեք նորից։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setIsLoadingLink(false);
    }
  }, [registerUserId]);

  useEffect(() => {
    if (!registerUserId) {
      void refreshLink();
    }
  }, [registerUserId, refreshLink]);

  useEffect(() => {
    if (isVerified) {
      return;
    }

    const poll = async () => {
      try {
        if (registerUserId) {
          const res = await fetch(
            `/api/auth/register/status?userId=${encodeURIComponent(registerUserId)}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            verified: boolean;
            phoneMasked?: string;
          };
          if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
          if (data.verified) {
            setIsVerified(true);
            toastSuccess("Հաշիվը հաստատված է", "Կարող եք մուտք գործել։");
          }
          return;
        }

        const res = await fetch("/api/auth/telegram-verification/status");
        if (!res.ok) return;
        const data = (await res.json()) as StatusPayload;
        if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
        if (data.verified) {
          setIsVerified(true);
          toastSuccess("Հաշիվը հաստատված է", "Կարող եք օգտագործել հարթակը։");
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };

    const id = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(id);
  }, [isVerified, registerUserId, router]);

  return (
    <div className="rounded-4xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6">
      <div className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
        {isVerified ? (
          <CheckCircle2 className="size-7" />
        ) : (
          <Send className="size-7" />
        )}
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
        {isVerified ? "Հաշիվը հաստատված է" : "Telegram-ով հաստատեք հեռախոսահամարը"}
      </h2>

      <p className="mt-3 leading-7 text-slate-600">
        {isVerified
          ? "Ձեր հեռախոսահամարը հաստատված է, Telegram chat ID-ն պահպանված է ծանուցումների համար։"
          : "Բացեք bot-ը, սեղմեք Start, ապա ուղարկեք գրանցման ժամանակ նշած հեռախոսահամարը՝ կոճակով կամ ձեռքով (+374 ...)։"}
      </p>

      {!isVerified && phoneMasked ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-800 ring-1 ring-slate-200">
          <Phone className="size-4 text-amber-700" />
          Սպասվող համար՝ {phoneMasked}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      {isVerified ? (
        <Link
          href={registerUserId ? ROUTES.login : successHref}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
        >
          {registerUserId ? "Մուտք գործել" : "Շարունակել"}
        </Link>
      ) : (
        <div className="mt-6 space-y-3">
          {botUrl ? (
            <a
              href={botUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Բացել @tend_am_bot
              <ExternalLink className="size-5" />
            </a>
          ) : null}

          {!registerUserId ? (
            <button
              type="button"
              onClick={() => void refreshLink()}
              disabled={isLoadingLink}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoadingLink ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Նոր հղում ստանալ
            </button>
          ) : null}

          <p className="text-center text-sm font-semibold text-slate-500">
            Սպասում ենք Telegram-ում հաստատմանը...
          </p>
        </div>
      )}

      {showLoginLink && !isVerified && registerUserId ? (
        <p className="mt-4 text-center text-sm font-semibold text-slate-500">
          Արդեն հաստատե՞լ եք։{" "}
          <Link href={ROUTES.login} className="font-black text-amber-700">
            Մուտք
          </Link>
        </p>
      ) : null}
    </div>
  );
}