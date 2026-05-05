"use client";

import { Building2, Loader2, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ACCOUNT_TYPE_LABEL,
  type AccountTypeValue,
  LEGAL_FORM_LABEL,
  type LegalFormValue,
} from "@/lib/account-type";

export type AccountCompanyInitial = {
  accountType: AccountTypeValue;
  companyName: string | null;
  legalForm: LegalFormValue | null;
  taxId: string | null;
  legalAddress: string | null;
  directorName: string | null;
  companyPhone: string | null;
};

type Props = {
  initial: AccountCompanyInitial;
};

export function AccountCompanySettings({ initial }: Props) {
  const router = useRouter();
  const snapshot = JSON.stringify(initial);

  const [accountType, setAccountType] = useState<AccountTypeValue>(
    initial.accountType,
  );
  const [pendingType, setPendingType] = useState<AccountTypeValue | null>(null);

  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [legalForm, setLegalForm] = useState<LegalFormValue | "">(
    initial.legalForm ?? "",
  );
  const [taxId, setTaxId] = useState(initial.taxId ?? "");
  const [legalAddress, setLegalAddress] = useState(
    initial.legalAddress ?? "",
  );
  const [directorName, setDirectorName] = useState(initial.directorName ?? "");
  const [companyPhone, setCompanyPhone] = useState(initial.companyPhone ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  useEffect(() => {
    const p = JSON.parse(snapshot) as AccountCompanyInitial;
    setAccountType(p.accountType);
    setCompanyName(p.companyName ?? "");
    setLegalForm(p.legalForm ?? "");
    setTaxId(p.taxId ?? "");
    setLegalAddress(p.legalAddress ?? "");
    setDirectorName(p.directorName ?? "");
    setCompanyPhone(p.companyPhone ?? "");
  }, [snapshot]);

  function handleTypeClick(next: AccountTypeValue) {
    if (next === accountType) return;
    setPendingType(next);
  }

  function confirmTypeChange() {
    if (!pendingType) return;
    setAccountType(pendingType);
    setPendingType(null);
    setError(null);
    setOkMessage(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMessage(null);

    if (accountType === "LEGAL_ENTITY") {
      if (companyName.trim().length < 2) {
        setError("Ընկերության անվանումը պարտադիր է։");
        return;
      }
      if (!legalForm) {
        setError("Ընտրեք իրավաբանական ձևը։");
        return;
      }
      if (taxId.trim().length === 0) {
        setError("ՀՎՀՀ-ն պարտադիր է։");
        return;
      }
      if (legalAddress.trim().length === 0) {
        setError("Իրավաբանական հասցեն պարտադիր է։");
        return;
      }
      if (directorName.trim().length === 0) {
        setError("Տնօրենի անունը պարտադիր է։");
        return;
      }
    }

    setSaving(true);
    try {
      // Մյուս դաշտերը (name, email, phone) ուղարկում ենք առկա արժեքներով՝ չփոխելու համար։
      // Ստանալու համար օգտատիրոջ վերջին name/email/phone-ը՝ վերցնենք cookie session-ից չենք կարող, դրա համար ուղարկում ենք միայն այն ինչ ճանաչում ենք։
      // PATCH-ի schema-ն պահանջում է name/email/phone, դրա համար ուղարկում ենք server-ին նաև dummy fetch-ով՝ չէ, պարզ լուծում՝ առանձին endpoint չենք բացում, օգտագործում ենք /api/account/company endpoint-ը։
      const res = await fetch("/api/account/profile/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          companyName: companyName.trim() || null,
          legalForm: legalForm || null,
          taxId: taxId.trim() || null,
          legalAddress: legalAddress.trim() || null,
          directorName: directorName.trim() || null,
          companyPhone: companyPhone.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        if (data?.error === "INVALID_PAYLOAD") {
          setError("Ստուգեք դաշտերը — հնարավոր է լրացված չէ պարտադիրը։");
        } else {
          setError("Չհաջողվեց պահպանել։");
        }
        return;
      }
      setOkMessage(
        accountType === "LEGAL_ENTITY"
          ? "Ընկերության տվյալները պահպանվեցին։"
          : "Տիպը փոխվել է։ Ընկերության տվյալները մաքրվեցին։",
      );
      router.refresh();
    } catch {
      setError("Ցանցի խնդիր։");
    } finally {
      setSaving(false);
    }
  }

  const isLegal = accountType === "LEGAL_ENTITY";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleTypeClick("INDIVIDUAL")}
          className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-left ring-1 transition ${
            accountType === "INDIVIDUAL"
              ? "bg-slate-950 text-white ring-slate-950 shadow-md"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-2xl ${
              accountType === "INDIVIDUAL"
                ? "bg-white/15 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <UserIcon className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-black">Ֆիզիկական անձ</span>
            <span
              className={`block text-[11px] font-semibold ${
                accountType === "INDIVIDUAL" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Անձնական հաշիվ
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeClick("LEGAL_ENTITY")}
          className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-left ring-1 transition ${
            accountType === "LEGAL_ENTITY"
              ? "bg-slate-950 text-white ring-slate-950 shadow-md"
              : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-2xl ${
              accountType === "LEGAL_ENTITY"
                ? "bg-white/15 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <Building2 className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-black">Իրավաբանական անձ</span>
            <span
              className={`block text-[11px] font-semibold ${
                accountType === "LEGAL_ENTITY" ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Ընկերության հաշիվ
            </span>
          </span>
        </button>
      </div>

      <form className="space-y-4" onSubmit={(e) => void save(e)}>
        {isLegal ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  Ընկերության անվանումը *
                </span>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value.slice(0, 200))}
                  placeholder="ABC ՍՊԸ"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  Իրավաբանական ձև *
                </span>
                <select
                  value={legalForm}
                  onChange={(e) =>
                    setLegalForm(e.target.value as LegalFormValue | "")
                  }
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">Ընտրել…</option>
                  {(Object.keys(LEGAL_FORM_LABEL) as LegalFormValue[]).map(
                    (value) => (
                      <option key={value} value={value}>
                        {LEGAL_FORM_LABEL[value]}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  ՀՎՀՀ *
                </span>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.slice(0, 20))}
                  placeholder="00000000"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                  Տնօրեն *
                </span>
                <input
                  type="text"
                  required
                  value={directorName}
                  onChange={(e) =>
                    setDirectorName(e.target.value.slice(0, 200))
                  }
                  placeholder="Անուն Ազգանուն"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Իրավաբանական հասցե *
              </span>
              <input
                type="text"
                required
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value.slice(0, 500))}
                placeholder="ք. Երևան, փող., տուն"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                Ընկերության հեռախոս (պարտադիր չէ)
              </span>
              <input
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value.slice(0, 32))}
                placeholder="+374 ..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </label>
          </>
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
            Դուք գրանցված եք որպես <strong>{ACCOUNT_TYPE_LABEL.INDIVIDUAL}</strong>։
            Անցեք «Իրավաբանական անձ» tab-ին՝ ընկերության տվյալները լրացնելու համար։
          </p>
        )}

        {error ? (
          <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}
        {okMessage ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            {okMessage}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Պահպանել
          </button>
        </div>
      </form>

      {pendingType ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Փակել"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setPendingType(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
              Հաստատում
            </p>
            <h3 className="mt-2 text-lg font-black text-slate-900">
              {pendingType === "LEGAL_ENTITY"
                ? "Անցնե՞լ իրավաբանական անձի հաշվին"
                : "Անցնե՞լ ֆիզիկական անձի հաշվին"}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {pendingType === "LEGAL_ENTITY"
                ? "Կպահանջվի լրացնել ընկերության տվյալները՝ մինչ պահպանելը։"
                : "Ընկերության տվյալները կդատարկվեն բազայից։ Այս գործողությունը հնարավոր չէ ուղղակիորեն հետ բերել։"}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingType(null)}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Չեղարկել
              </button>
              <button
                type="button"
                onClick={confirmTypeChange}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Շարունակել
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
