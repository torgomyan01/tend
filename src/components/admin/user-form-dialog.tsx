"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: "Այս email-ով օգտատեր արդեն կա։",
  PHONE_TAKEN: "Այս հեռախոսահամարով օգտատեր արդեն կա։",
  CANNOT_CHANGE_OWN_ROLE: "Չեք կարող փոխել ձեր սեփական դերը։",
  CANNOT_BLOCK_SELF: "Չեք կարող արգելափակել ինքներդ ձեզ։",
  INVALID_PAYLOAD: "Տվյալները թերի կամ սխալ են։",
  NOT_FOUND: "Օգտատերը չի գտնվել։",
  FORBIDDEN: "Թույլտվություն չկա։",
  REQUEST_FAILED: "Հարցումը չհաջողվեց։",
};

export type UserFormUser = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  walletBalance: number;
  isVerified: boolean;
  isBlocked: boolean;
};

type UserFormDialogProps = {
  open: boolean;
  onClose: () => void;
  user?: UserFormUser | null;
};

export function UserFormDialog({ open, onClose, user }: UserFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "MODERATOR" | "ADMIN">("USER");
  const [walletBalance, setWalletBalance] = useState("0");
  const [isVerified, setIsVerified] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setPassword("");

    if (user) {
      setName(user.name ?? "");
      setEmail(user.email);
      setPhone(user.phone ?? "");
      setRole(user.role);
      setWalletBalance(String(user.walletBalance ?? 0));
      setIsVerified(user.isVerified);
      setIsBlocked(user.isBlocked);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("USER");
      setWalletBalance("0");
      setIsVerified(false);
      setIsBlocked(false);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const trimmedWalletBalance = Number(walletBalance);
    if (Number.isNaN(trimmedWalletBalance) || trimmedWalletBalance < 0) {
      setError("Դրամապանակի մնացորդը պետք է լինի 0 կամ ավելի։");
      setIsSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      walletBalance: trimmedWalletBalance,
      isVerified,
      isBlocked,
    };

    if (password.trim()) {
      payload.password = password;
    }

    const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
    const method = isEdit ? "PATCH" : "POST";

    if (!isEdit && !password.trim()) {
      setError("Գաղտնաբառը պարտադիր է նոր օգտատեր ստեղծելիս։");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error
          ? (ERROR_MESSAGES[data.error] ?? data.error)
          : ERROR_MESSAGES.REQUEST_FAILED;
        setError(message);
        setIsSubmitting(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Ցանցի սխալ։ Փորձեք կրկին։");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Փակել"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              {isEdit ? "Խմբագրում" : "Նոր օգտատեր"}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit
                ? `${user?.name || user?.email}`
                : "Ստեղծել նոր օգտատեր"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isEdit
                ? "Թարմացրեք տվյալները կամ դերը։ Գաղտնաբառի դաշտը թողեք դատարկ, եթե չեք ուզում փոխել։"
                : "Օգտատերը կստեղծվի առանց Telegram վերիֆիկացիայի անհրաժեշտության։"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Փակել"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Անուն
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Օր.՝ Արամ Հակոբյան"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Email *
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="aram@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Հեռախոսահամար *
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+374 XX XXX XXX"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Գաղտնաբառ {isEdit ? "(ոչ պարտադիր)" : "*"}
              </span>
              <input
                type="password"
                required={!isEdit}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  isEdit ? "Թողեք դատարկ՝ չփոխելու համար" : "Նվազ. 6 նիշ"
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Դեր
              </span>
              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as "USER" | "MODERATOR" | "ADMIN")
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="USER">Օգտատեր</option>
                <option value="MODERATOR">Մոդերատոր</option>
                <option value="ADMIN">Գերադմին</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Դրամապանակ (֏)
              </span>
              <input
                type="number"
                min={0}
                step="100"
                value={walletBalance}
                onChange={(event) => setWalletBalance(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
              />
            </label>
          </div>

          <div className="grid gap-2 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(event) => setIsVerified(event.target.checked)}
                className="size-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900"
              />
              Վերիֆիկացված հաշիվ
            </label>
            <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={isBlocked}
                onChange={(event) => setIsBlocked(event.target.checked)}
                className="size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              Արգելափակել մուտքը
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Չեղարկել
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Պահպանել" : "Ստեղծել"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
