"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  InterestSelector,
  type InterestSelection,
} from "@/components/interest-selector";
import { PhoneInput } from "@/components/phone-input";
import {
  type AccountTypeValue,
  LEGAL_FORM_LABEL,
  type LegalFormValue,
} from "@/lib/account-type";
import { ROUTES } from "@/lib/routes";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";

type RegisterResponse = {
  userId: string;
  telegramBotUrl: string;
  expiresAt: string;
};

type Step = "type" | "interests" | "info" | "telegram";

type RegisterFormProps = {
  categories: ServiceCategoryWithServices[];
};

export function RegisterForm({ categories }: RegisterFormProps) {
  const [step, setStep] = useState<Step>("type");
  const [interests, setInterests] = useState<InterestSelection[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<RegisterResponse | null>(
    null,
  );
  const [isVerified, setIsVerified] = useState(false);

  const [accountType, setAccountType] =
    useState<AccountTypeValue>("INDIVIDUAL");
  const [companyName, setCompanyName] = useState("");
  const [legalForm, setLegalForm] = useState<LegalFormValue | "">("");
  const [taxId, setTaxId] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const isLegal = accountType === "LEGAL_ENTITY";

  useEffect(() => {
    if (!verification || isVerified) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      const response = await fetch(
        `/api/auth/register/status?userId=${encodeURIComponent(
          verification.userId,
        )}`,
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { verified: boolean };

      if (data.verified) {
        setIsVerified(true);
        toastSuccess("Հաշիվը վերիֆիկացվեց", "Կարող եք մուտք գործել։");
        window.clearInterval(intervalId);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isVerified, verification]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (isLegal) {
      if (companyName.trim().length < 2) {
        setError("Ընկերության անվանումը պարտադիր է։");
        toastError("Սխալ տվյալներ", "Ընկերության անվանումը պարտադիր է։");
        setIsSubmitting(false);
        return;
      }
      if (!legalForm) {
        setError("Ընտրեք իրավաբանական ձևը։");
        toastError("Սխալ տվյալներ", "Ընտրեք իրավաբանական ձևը։");
        setIsSubmitting(false);
        return;
      }
      if (taxId.trim().length === 0) {
        setError("ՀՎՀՀ-ն պարտադիր է։");
        toastError("Սխալ տվյալներ", "ՀՎՀՀ-ն պարտադիր է։");
        setIsSubmitting(false);
        return;
      }
      if (legalAddress.trim().length === 0) {
        setError("Իրավաբանական հասցեն պարտադիր է։");
        toastError("Սխալ տվյալներ", "Իրավաբանական հասցեն պարտադիր է։");
        setIsSubmitting(false);
        return;
      }
      if (directorName.trim().length === 0) {
        setError("Տնօրենի անունը պարտադիր է։");
        toastError("Սխալ տվյալներ", "Տնօրենի անունը պարտադիր է։");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          password,
          acceptedTerms,
          interests,
          accountType,
          companyName: isLegal ? companyName.trim() : undefined,
          legalForm: isLegal ? legalForm : undefined,
          taxId: isLegal ? taxId.trim() : undefined,
          legalAddress: isLegal ? legalAddress.trim() : undefined,
          directorName: isLegal ? directorName.trim() : undefined,
          companyPhone: isLegal && companyPhone.trim() ? companyPhone.trim() : undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const msg =
          data.error === "USER_ALREADY_EXISTS"
            ? "Այս էլ․ փոստով կամ հեռախոսահամարով հաշիվ արդեն գոյություն ունի։"
            : "Չհաջողվեց ստեղծել հաշիվը։ Ստուգեք դաշտերը և փորձեք նորից։";
        setError(msg);
        toastError("Գրանցումը չհաջողվեց", msg);
        return;
      }

      setVerification(data as RegisterResponse);
      setStep("telegram");
      toastSuccess("Հաշիվը ստեղծվեց", "Հիմա ավարտեք Telegram վերիֆիկացիան։");
    } catch {
      const msg = "Սերվերի հետ կապ հաստատել չհաջողվեց։ Փորձեք մի փոքր ուշ։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "telegram" && verification) {
    return (
      <div className="rounded-4xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <div className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          {isVerified ? (
            <CheckCircle2 className="size-7" />
          ) : (
            <Send className="size-7" />
          )}
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
          {isVerified ? "Հաշիվը վերիֆիկացվեց" : "Ավարտեք Telegram վերիֆիկացիան"}
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          {isVerified
            ? "Ձեր Telegram chat ID-ն պահպանվեց։ Հետագայում կօգտագործենք այն նոր գործերի ծանուցումների և գաղտնաբառի վերականգնման համար։"
            : "Սեղմեք կոճակը, բացեք @tend_am_bot-ը և սեղմեք Start։ Վերիֆիկացիայից հետո այս էջը ավտոմատ կթարմացվի։"}
        </p>

        {isVerified ? (
          <Link
            href={ROUTES.login}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
          >
            Մուտք գործել
          </Link>
        ) : (
          <>
            <a
              href={verification.telegramBotUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Բացել @tend_am_bot
              <ExternalLink className="size-5" />
            </a>
            <p className="mt-4 text-center text-sm font-semibold text-slate-500">
              Սպասում ենք Telegram հաստատմանը...
            </p>
          </>
        )}
      </div>
    );
  }

  const steps: Array<{ value: Step; label: string }> = [
    { value: "type", label: "Տիպ" },
    { value: "interests", label: "Հետաքրքրություններ" },
    { value: "info", label: "Տվյալներ" },
  ];
  const currentStepIndex =
    step === "type" ? 0 : step === "interests" ? 1 : 2;

  return (
    <div className="space-y-6">
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
        {steps.map((stepItem, index) => {
          const isActive = step === stepItem.value;
          const isComplete = index < currentStepIndex;
          return (
            <div
              key={stepItem.value}
              className="flex flex-none items-center gap-2 sm:flex-1"
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-xs font-black ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : isComplete
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isComplete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              <span
                className={`hidden text-xs font-black uppercase tracking-[0.16em] sm:inline ${
                  isActive ? "text-slate-950" : "text-slate-400"
                }`}
              >
                {stepItem.label}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-[0.16em] sm:hidden ${
                  isActive ? "text-slate-950" : "text-slate-400"
                }`}
              >
                {stepItem.value === "type"
                  ? "Տիպ"
                  : stepItem.value === "interests"
                    ? "Ոլորտ"
                    : "Տվյալներ"}
              </span>
              {index < steps.length - 1 ? (
                <span className="ml-2 hidden h-px flex-1 bg-slate-200 sm:block" />
              ) : null}
            </div>
          );
        })}
      </div>

      {step === "type" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setAccountType("INDIVIDUAL")}
              className={`flex items-start gap-3 rounded-3xl p-5 text-left ring-1 transition ${
                accountType === "INDIVIDUAL"
                  ? "bg-slate-950 text-white ring-slate-950 shadow-xl"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                  accountType === "INDIVIDUAL"
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <User className="size-5" />
              </span>
              <span>
                <span className="block text-base font-black">Ֆիզիկական անձ</span>
                <span
                  className={`mt-1 block text-xs font-semibold ${
                    accountType === "INDIVIDUAL"
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  Անձնական հաշիվ՝ առանց ընկերության տվյալների։
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("LEGAL_ENTITY")}
              className={`flex items-start gap-3 rounded-3xl p-5 text-left ring-1 transition ${
                accountType === "LEGAL_ENTITY"
                  ? "bg-slate-950 text-white ring-slate-950 shadow-xl"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                  accountType === "LEGAL_ENTITY"
                    ? "bg-white/15 text-white"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <Building2 className="size-5" />
              </span>
              <span>
                <span className="block text-base font-black">Իրավաբանական անձ</span>
                <span
                  className={`mt-1 block text-xs font-semibold ${
                    accountType === "LEGAL_ENTITY"
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  Ընկերության, ՍՊԸ-ի, ԱՁ-ի կամ այլ կազմակերպության հաշիվ։
                </span>
              </span>
            </button>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => setStep("interests")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Շարունակել
              <ArrowRight className="size-5" />
            </button>
          </div>
        </div>
      ) : null}

      {step === "interests" ? (
        <div className="space-y-5">
          <InterestSelector
            selected={interests}
            onChange={setInterests}
            categories={categories}
          />

          <div className="flex flex-col-reverse items-stretch gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
              {interests.length === 0
                ? "Կարող եք բաց թողնել, բայց առաջարկները ավելի թիրախային կլինեն ընտրությունից հետո։"
                : `${interests.length} ծառայություն ընտրված է։`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setStep("type")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
              >
                <ArrowLeft className="size-4" />
                Հետ
              </button>
              <button
                type="button"
                onClick={() => setStep("info")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
              >
                Շարունակել
                <ArrowRight className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "info" ? (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-700">
                Անուն ազգանուն
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <User className="size-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Արամ Սարգսյան"
                  required
                  className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-black text-slate-700">
                Հեռախոսահամար
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Phone className="size-5 text-slate-400" />
                <PhoneInput value={phone} onValueChange={setPhone} required />
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-black text-slate-700">Էլ․ փոստ</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Mail className="size-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
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
                placeholder="Առնվազն 8 նիշ"
                required
                minLength={8}
                className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          {isLegal ? (
            <div className="space-y-4 rounded-3xl bg-amber-50/60 p-4 ring-1 ring-amber-200">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-200/70 text-amber-800">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-amber-900">
                    Ընկերության տվյալներ
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-900/80">
                    Ստորև դաշտերը պարտադիր են իրավաբանական անձի համար։
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                    Ընկերության անվանումը
                  </span>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) =>
                      setCompanyName(e.target.value.slice(0, 200))
                    }
                    placeholder="ABC ՍՊԸ"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                    Իրավաբանական ձև
                  </span>
                  <select
                    required
                    value={legalForm}
                    onChange={(e) =>
                      setLegalForm(e.target.value as LegalFormValue | "")
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
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
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                    ՀՎՀՀ
                  </span>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.slice(0, 20))}
                    placeholder="00000000"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                    Տնօրեն
                  </span>
                  <input
                    type="text"
                    required
                    value={directorName}
                    onChange={(e) =>
                      setDirectorName(e.target.value.slice(0, 200))
                    }
                    placeholder="Անուն Ազգանուն"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                  Իրավաբանական հասցե
                </span>
                <input
                  type="text"
                  required
                  value={legalAddress}
                  onChange={(e) =>
                    setLegalAddress(e.target.value.slice(0, 500))
                  }
                  placeholder="ք. Երևան, փող., տուն"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-700">
                  Ընկերության հեռախոս (պարտադիր չէ)
                </span>
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) =>
                    setCompanyPhone(e.target.value.slice(0, 32))
                  }
                  placeholder="+374 ..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </label>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-3xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
              className="mt-1 size-4 rounded border-slate-300 accent-slate-950"
            />
            <span>
              Համաձայնություն եմ տալիս իմ անձնական տվյալների ստուգմանը և
              ընդունում եմ{" "}
              <Link href={ROUTES.terms} className="font-black text-amber-700">
                օգտագործման պայմանները
              </Link>
              ։
            </span>
          </label>

          {interests.length > 0 ? (
            <div className="rounded-3xl bg-amber-50 p-4 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              Ձեր ընտրությունից կտեղեկացնենք <strong>{interests.length}</strong>{" "}
              ուղղությամբ թարմ մրցույթների մասին։{" "}
              <button
                type="button"
                onClick={() => setStep("interests")}
                className="font-black text-amber-700 underline-offset-2 transition hover:underline"
              >
                Փոխել
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep("interests")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
            >
              <ArrowLeft className="size-4" />
              Հետ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : null}
              Գրանցվել և անցնել վերիֆիկացիա
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
