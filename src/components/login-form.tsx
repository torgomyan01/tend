"use client";

import { Loader2, LockKeyhole, Phone } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneInput } from "@/components/phone-input";
import { ROUTES } from "@/lib/routes";

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      phone,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      if (result?.error === "TELEGRAM_NOT_VERIFIED") {
        setError(
          "Ձեր հաշիվը դեռ Telegram-ով վերիֆիկացված չէ։ Խնդրում ենք ավարտել վերիֆիկացիան գրանցման էջից։",
        );
        return;
      }

      setError("Սխալ հեռախոսահամար կամ գաղտնաբառ։");
      return;
    }

    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-black text-slate-700">Հեռախոսահամար</span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <Phone className="size-5 text-slate-400" />
          <PhoneInput value={phone} onValueChange={setPhone} required />
        </span>
      </label>

      <label className="block">
        <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm font-black text-slate-700">Գաղտնաբառ</span>
          <Link
            href={ROUTES.forgotPassword}
            className="text-sm font-black text-amber-700 transition hover:text-amber-800"
          >
            Մոռացե՞լ եք գաղտնաբառը
          </Link>
        </span>
        <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <LockKeyhole className="size-5 text-slate-400" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ձեր գաղտնաբառը"
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
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : null}
        Մուտք գործել
      </button>
    </form>
  );
}
