"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  initialToken: string;
};

export function ResetPasswordForm({ initialToken }: Props) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      const msg =
        "Հղումը թերի է։ Խնդրում ենք նորից բացել Telegram-ից ստացված հղումը։";
      setError(msg);
      toastError("Սխալ հղում", msg);
      return;
    }
    if (password.length < 8) {
      const msg = "Գաղտնաբառը պետք է լինի առնվազն 8 նիշ։";
      setError(msg);
      toastError("Սխալ գաղտնաբառ", msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = "Գաղտնաբառերը չեն համընկնում։";
      setError(msg);
      toastError("Սխալ գաղտնաբառ", msg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password, confirmPassword }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        const msg =
          data?.error === "INVALID_TOKEN"
            ? "Հղումը անվավեր է կամ ժամկետանց։ Խնդրում ենք նորից ուղարկել վերականգնման հարցումը։"
            : "Չհաջողվեց փոխել գաղտնաբառը։";
        setError(msg);
        toastError("Գաղտնաբառը չփոխվեց", msg);
        return;
      }

      setOk(true);
      toastSuccess(
        "Գաղտնաբառը թարմացվեց",
        "Հիմա կարող եք մուտք գործել նոր գաղտնաբառով։",
      );
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։ Փորձեք մի փոքր ուշ։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (ok) {
    return (
      <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
        <p className="text-sm font-black text-emerald-900">
          Գաղտնաբառը հաջողությամբ թարմացվեց։
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-800/80">
          Հիմա կարող եք մուտք գործել նոր գաղտնաբառով։
        </p>
        <Link
          href={ROUTES.login}
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
        >
          Մուտք գործել
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void submit(e)}>
      <label className="block">
        <span className="text-sm font-black text-slate-700">Վերականգնման token</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <LockKeyhole className="size-5 text-slate-400" />
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="token…"
            disabled
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-black text-slate-700">Նոր գաղտնաբառ</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <LockKeyhole className="size-5 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Առնվազն 8 նիշ"
            minLength={8}
            required
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-black text-slate-700">Կրկնել գաղտնաբառը</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <LockKeyhole className="size-5 text-slate-400" />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Կրկնել գաղտնաբառը"
            minLength={8}
            required
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
          />
        </span>
      </label>

      {error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-5 animate-spin" /> : null}
        Թարմացնել գաղտնաբառը
      </button>
    </form>
  );
}

