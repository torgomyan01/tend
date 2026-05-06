"use client";

import { Loader2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

export function TelegramForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const msg = "Ստուգեք էլ․ փոստը և փորձեք նորից։";
        setError(msg);
        toastError("Չհաջողվեց ուղարկել", msg);
        return;
      }
      setOk(true);
      toastSuccess(
        "Հարցումը ուղարկված է",
        "Եթե հաշիվ կա ու Telegram-ը կապված է, հղումը կգա Telegram-ով։",
      );
    } catch {
      const msg = "Ցանցի խնդիր։ Փորձեք մի փոքր ուշ։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => void submit(e)}>
      <label className="block">
        <span className="text-sm font-black text-slate-700">Էլ․ փոստ</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Mail className="size-5 text-slate-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
          />
        </span>
      </label>

      {ok ? (
        <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
          Եթե այս էլ․ փոստով հաշիվ կա և այն Telegram-ով վերիֆիկացված է, կստանաք
          վերականգնման հղումը Telegram-ում։
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        Ուղարկել Telegram-ին
      </button>

      <p className="text-center text-sm font-semibold text-slate-600">
        Հիշեցի՞ք գաղտնաբառը։{" "}
        <Link href={ROUTES.login} className="font-black text-amber-700">
          Մուտք գործել
        </Link>
      </p>
    </form>
  );
}

