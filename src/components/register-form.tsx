"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthDivider, GoogleAuthButton } from "@/components/google-auth-button";
import { EmailVerificationPanel } from "@/components/email-verification-panel";
import { RegisterOnboardingPreferences } from "@/components/register-onboarding-preferences";
import { TelegramVerificationPanel } from "@/components/telegram-verification-panel";
import {
  InterestSelector,
  type InterestSelection,
} from "@/components/interest-selector";
import { PhoneInput } from "@/components/phone-input";
import {
  type AccountTypeValue,
} from "@/lib/account-type";
import { ROUTES } from "@/lib/routes";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  NotificationChannelValue,
  VerificationChannelValue,
} from "@/lib/verification-channels";

type RegisterResponse = {
  userId: string;
  verificationChannel: VerificationChannelValue;
  phoneMasked: string;
  telegramBotUrl?: string;
  expiresAt?: string;
  email?: string;
  emailSent?: boolean;
};

type Step =
  | "type"
  | "interests"
  | "info"
  | "preferences"
  | "complete-telegram"
  | "complete-email";

type RegisterFormProps = {
  categories: ServiceCategoryWithServices[];
  googleEnabled?: boolean;
};

export function RegisterForm({
  categories,
  googleEnabled = false,
}: RegisterFormProps) {
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

  const [accountType, setAccountType] =
    useState<AccountTypeValue>("INDIVIDUAL");

  const isLegal = accountType === "LEGAL_ENTITY";

  function handleInfoContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isLegal) {
      toastSuccess(
        "Կարող եք շարունակել",
        "Իրավաբանական տվյալները կլրացնեք հետո՝ անհրաժեշտության պահին։",
      );
    }
    setStep("preferences");
  }

  async function handleRegister(prefs: {
    verificationChannel: VerificationChannelValue;
    notificationChannel: NotificationChannelValue;
  }) {
    setError(null);
    setIsSubmitting(true);

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
          verificationChannel: prefs.verificationChannel,
          notificationChannel: prefs.notificationChannel,
          companyName: undefined,
          legalForm: undefined,
          taxId: undefined,
          legalAddress: undefined,
          directorName: undefined,
          companyPhone: undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const msg =
          data.error === "USER_ALREADY_EXISTS"
            ? "Այս էլ․ փոստով կամ հեռախոսահամարով հաշիվ արդեն գոյություն ունի։"
            : data.error === "EMAIL_OR_PHONE_ALREADY_USED"
              ? "Էլ․ փոստը կամ հեռախոսահամարը արդեն կապված է այլ հաշվի հետ։"
            : data.error === "INVALID_PHONE"
              ? "Օգտագործեք հայկական հեռախոսահամար (+374 77 123 456)։"
              : data.error === "EMAIL_SEND_FAILED"
                ? "Չհաջողվեց ուղարկել հաստատման նամակը։ Փորձեք Telegram վերիֆիկացիա։"
              : "Չհաջողվեց ստեղծել հաշիվը։ Ստուգեք դաշտերը և փորձեք նորից։";
        setError(msg);
        toastError("Գրանցումը չհաջողվեց", msg);
        return;
      }

      const result = data as RegisterResponse;
      setVerification(result);
      if (result.verificationChannel === "EMAIL") {
        setStep("complete-email");
        toastSuccess("Հաշիվը ստեղծվեց", "Ստուգեք էլ․ փոստը հաստատման հղման համար։");
      } else {
        setStep("complete-telegram");
        toastSuccess("Հաշիվը ստեղծվեց", "Հիմա ավարտեք Telegram վերիֆիկացիան։");
      }
    } catch {
      const msg = "Սերվերի հետ կապ հաստատել չհաջողվեց։ Փորձեք մի փոքր ուշ։";
      setError(msg);
      toastError("Ցանցի խնդիր", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "complete-telegram" && verification?.telegramBotUrl) {
    return (
      <TelegramVerificationPanel
        registerUserId={verification.userId}
        initialTelegramBotUrl={verification.telegramBotUrl}
        initialPhoneMasked={verification.phoneMasked}
      />
    );
  }

  if (step === "complete-email" && verification) {
    return (
      <EmailVerificationPanel
        registerUserId={verification.userId}
        email={verification.email ?? email}
      />
    );
  }

  const steps: Array<{ value: Step; label: string }> = [
    { value: "type", label: "Տիպ" },
    { value: "interests", label: "Հետաքրքրություններ" },
    { value: "info", label: "Տվյալներ" },
    { value: "preferences", label: "Վերիֆիկացիա" },
  ];
  const currentStepIndex =
    step === "type"
      ? 0
      : step === "interests"
        ? 1
        : step === "info"
          ? 2
          : 3;

  return (
    <div className="space-y-6">
      {step === "type" && googleEnabled ? (
        <div>
          <GoogleAuthButton
            enabled={googleEnabled}
            label="Գրանցվել Google-ով"
            callbackUrl={ROUTES.home}
          />
          <AuthDivider />
          <p className="mb-2 text-center text-xs font-bold text-slate-500">
            Կամ լրացրեք ձևը հեռախոսահամարով
          </p>
        </div>
      ) : null}

      {/* Mobile: compact progress — no horizontal scroll */}
      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
            Քայլ {currentStepIndex + 1} / {steps.length}
          </p>
          <p className="min-w-0 truncate text-right text-sm font-black text-slate-950">
            {steps[currentStepIndex]?.label}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {steps.map((stepItem, index) => {
            const isActive = step === stepItem.value;
            const isComplete = index < currentStepIndex;
            return (
              <div
                key={stepItem.value}
                className="flex min-w-0 flex-col items-center gap-2"
              >
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    isComplete
                      ? "bg-emerald-500"
                      : isActive
                        ? "bg-slate-950"
                        : "bg-slate-200"
                  }`}
                  aria-hidden
                />
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black transition-colors ${
                    isActive
                      ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-400 ring-1 ring-slate-200"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-4" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: full step labels */}
      <div className="hidden items-center gap-2 md:flex">
        {steps.map((stepItem, index) => {
          const isActive = step === stepItem.value;
          const isComplete = index < currentStepIndex;
          return (
            <div
              key={stepItem.value}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
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
                className={`min-w-0 truncate text-xs font-black uppercase tracking-[0.16em] ${
                  isActive ? "text-slate-950" : "text-slate-400"
                }`}
              >
                {stepItem.label}
              </span>
              {index < steps.length - 1 ? (
                <span className="ml-2 h-px min-w-3 flex-1 bg-slate-200" />
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
        <form className="space-y-6" onSubmit={handleInfoContinue}>
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
            <div className="rounded-3xl bg-amber-50/60 p-4 ring-1 ring-amber-200">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-200/70 text-amber-800">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-amber-900">
                    Իրավաբանական տվյալները հիմա պարտադիր չեն
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-900/80">
                    Կլրացնեք հետո՝ երբ հայտարարեք մրցույթ կամ դիմեք որևէ մրցույթի
                    համար։
                  </p>
                </div>
              </div>
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
              Շարունակել
            </button>
          </div>
        </form>
      ) : null}

      {step === "preferences" ? (
        <div className="space-y-4">
          {error ? (
            <div className="rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          ) : null}
          <RegisterOnboardingPreferences
            defaultEmail={email}
            onBack={() => setStep("info")}
            onContinue={(prefs) => void handleRegister(prefs)}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : null}
    </div>
  );
}
