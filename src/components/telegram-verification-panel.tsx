"use client";

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type LinkPayload = {
  telegramBotUrl: string;
  phoneMasked: string;
};

type StatusPayload = {
  verified: boolean;
  telegramVerified?: boolean;
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
  const { update } = useSession();
  const [botUrl, setBotUrl] = useState(initialTelegramBotUrl ?? "");
  const [phoneMasked, setPhoneMasked] = useState<string | null>(
    initialPhoneMasked ?? null,
  );
  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const phoneTitleId = useId();
  const phoneDescId = useId();

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
        if (data.error === "PHONE_REQUIRED") {
          setPhoneModalOpen(true);
          setError(null);
          return;
        }
        const msg = "Չհաջողվեց ստեղծել Telegram հղումը։";
        setError(msg);
        toastError("Սխալ", msg);
        return;
      }

      setBotUrl(data.telegramBotUrl);
      setPhoneMasked(data.phoneMasked);
      setPhoneModalOpen(false);
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
    if (!phoneModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !phoneSaving) setPhoneModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [phoneModalOpen, phoneSaving]);

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
            telegramVerified?: boolean;
            phoneMasked?: string;
          };
          if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
          if (data.telegramVerified) {
            setIsVerified(true);
            toastSuccess("Հաշիվը հաստատված է", "Կարող եք մուտք գործել։");
          }
          return;
        }

        const res = await fetch("/api/auth/telegram-verification/status");
        if (!res.ok) return;
        const data = (await res.json()) as StatusPayload;
        if (data.phoneMasked) setPhoneMasked(data.phoneMasked);
        // Must use telegramVerified — Google users are already "verified" via email.
        if (data.telegramVerified) {
          setIsVerified(true);
          toastSuccess("Telegram-ը կցված է", "Կարող եք օգտագործել ծանուցումները։");
          try {
            await update({ telegramVerified: true });
          } catch {
            /* ignore */
          }
          router.refresh();
        }
      } catch {
        /* ignore */
      }
    };

    const id = window.setInterval(() => void poll(), 3000);
    return () => window.clearInterval(id);
  }, [isVerified, registerUserId, router, update]);

  async function savePhone(event: React.FormEvent) {
    event.preventDefault();
    setPhoneError(null);
    setPhoneSaving(true);

    try {
      const res = await fetch("/api/account/profile/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneValue }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        phone?: string;
        phoneMasked?: string | null;
      } | null;

      if (!res.ok) {
        const messages: Record<string, string> = {
          INVALID_PHONE: "Մուտքագրեք վավեր հայկական համար (+374 …)։",
          PHONE_TAKEN: "Այս հեռախոսահամարն արդեն օգտագործվում է։",
          INVALID_PAYLOAD: "Ստուգեք հեռախոսահամարը։",
          Default: "Չհաջողվեց պահպանել համարը։",
        };
        const msg = messages[data?.error ?? ""] ?? messages.Default;
        setPhoneError(msg);
        toastError("Հեռախոսահամար", msg);
        return;
      }

      if (data?.phone) {
        await update({ phone: data.phone });
      }
      if (data?.phoneMasked) {
        setPhoneMasked(data.phoneMasked);
      }

      toastSuccess("Հեռախոսահամարը պահպանված է", "Կարող եք շարունակել Telegram-ով։");
      setPhoneModalOpen(false);
      setPhoneValue("");
      await refreshLink();
    } catch {
      const msg = "Ցանցի խնդիր։ Փորձեք նորից։";
      setPhoneError(msg);
      toastError("Ցանց", msg);
    } finally {
      setPhoneSaving(false);
    }
  }

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

      {!isVerified && !phoneMasked && !registerUserId ? (
        <button
          type="button"
          onClick={() => setPhoneModalOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          <Phone className="size-4" />
          Ավելացնել հեռախոսահամար
        </button>
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
            {botUrl
              ? "Սպասում ենք Telegram-ում հաստատմանը..."
              : isLoadingLink
                ? "Հղումը պատրաստվում է..."
                : "Telegram կապելու համար անհրաժեշտ է հեռախոսահամար։"}
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

      {phoneModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={phoneTitleId}
          aria-describedby={phoneDescId}
          onClick={() => {
            if (!phoneSaving) setPhoneModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Փակել"
              disabled={phoneSaving}
              onClick={() => setPhoneModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>

            <div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <Phone className="size-6" />
            </div>

            <h2
              id={phoneTitleId}
              className="mt-5 text-xl font-black tracking-tight text-slate-950"
            >
              Ավելացրեք հեռախոսահամար
            </h2>
            <p
              id={phoneDescId}
              className="mt-3 text-sm font-semibold leading-7 text-slate-600"
            >
              Telegram-ը կցելու համար խնդրում ենք ավելացնել ձեր հեռախոսահամարը։
              Դրանից հետո կկարողանաք շարունակել հաստատումը։
            </p>

            <form className="mt-6 space-y-4" onSubmit={(e) => void savePhone(e)}>
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Հեռախոսահամար
                </span>
                <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Phone className="size-5 text-slate-400" />
                  <PhoneInput
                    value={phoneValue}
                    onValueChange={setPhoneValue}
                    required
                  />
                </span>
              </label>

              {phoneError ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                  {phoneError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={phoneSaving || phoneValue.replace(/\D/g, "").length < 8}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phoneSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Պահպանել և շարունակել
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
