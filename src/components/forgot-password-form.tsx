"use client";

import { Loader2, Phone, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import type { PasswordResetChannel } from "@/lib/password-reset-types";
import { ROUTES } from "@/lib/routes";
import { toastError, toastSuccess } from "@/lib/toast";

const CHANNEL_HINT: Record<PasswordResetChannel, string> = {
  TELEGRAM: "Եթե հաշիվը գտնվել է, վերականգնման հղումը կգա Telegram։",
  EMAIL: "Եթե հաշիվը գտնվել է, վերականգնման հղումը կգա էլ․ փոստին։",
  SMS: "Եթե հաշիվը գտնվել է, վերականգնման հղումը կգա SMS-ով։",
};

export function ForgotPasswordForm() {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [channel, setChannel] = useState<PasswordResetChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    setChannel(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        channel?: PasswordResetChannel;
        cooldown?: boolean;
        error?: string;
      } | null;

      if (!res.ok) {
        const msg =
          data?.error === "INVALID_PHONE"
            ? "Մուտքագրեք վավեր հայկական հեռախոսահամար։"
            : "Ստուգեք համարը և փորձեք նորից։";
        setError(msg);
        toastError("Չհաջողվեց ուղարկել", msg);
        return;
      }

      setOk(true);
      if (data?.channel) setChannel(data.channel);
      toastSuccess(
        data?.cooldown ? "Խնդրում ենք սպասել" : "Հարցումը ընդունված է",
        data?.channel
          ? CHANNEL_HINT[data.channel]
          : "Եթե այս համարով հաշիվ կա, վերականգնման հղումը կուղարկվի։",
      );
    } catch {
      const msg = "Ցանցի խնդիր՝ Փորձեք մի փոքր ուշ։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => void submit(e)}>
      <label className="block">
        <span className="text-sm font-black text-slate-700">Հեռախոսահամար</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Phone className="size-5 shrink-0 text-slate-400" />
          <PhoneInput value={phone} onValueChange={setPhone} required />
        </span>
        <span className="mt-2 block text-xs font-semibold text-slate-500">
          Գրեք գրանցման ժամանակ նշած համարը։ Կուղարկենք Telegram, էլ․ փոստ կամ SMS։
        </span>
      </label>

      {ok ? (
        <div className="rounded-3xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
          {channel
            ? CHANNEL_HINT[channel]
            : "Եթե այս համարով հաշիվ կա, վերականգնման հղումը կուղարկվի հասանելի ալիքով։"}
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
        {busy ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Send className="size-5" />
        )}
        Ուղարկել վերականգնման հղումը
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
