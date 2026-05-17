"use client";

import { ArrowLeft, ArrowRight, Bell, Mail, Send } from "lucide-react";
import { useState } from "react";
import type {
  NotificationChannelValue,
  VerificationChannelValue,
} from "@/lib/verification-channels";

type Props = {
  defaultEmail: string;
  onBack: () => void;
  onContinue: (prefs: {
    verificationChannel: VerificationChannelValue;
    notificationChannel: NotificationChannelValue;
  }) => void;
  isSubmitting: boolean;
};

export function RegisterOnboardingPreferences({
  defaultEmail,
  onBack,
  onContinue,
  isSubmitting,
}: Props) {
  const [verificationChannel, setVerificationChannel] =
    useState<VerificationChannelValue>("TELEGRAM");
  const [notificationChannel, setNotificationChannel] =
    useState<NotificationChannelValue>("TELEGRAM");

  function pickVerification(channel: VerificationChannelValue) {
    setVerificationChannel(channel);
    setNotificationChannel(channel);
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          Վերիֆիկացիա
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Ինչպե՞ս հաստատել հաշիվը
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Telegram-ը արագ է, բայց եթե չունեք հավելվածը՝ ընտրեք էլ․ փոստ ({defaultEmail})։
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChannelCard
            active={verificationChannel === "TELEGRAM"}
            onClick={() => pickVerification("TELEGRAM")}
            icon={Send}
            title="Telegram"
            description="Start bot-ում, հաստատեք հեռախոսահամարը"
          />
          <ChannelCard
            active={verificationChannel === "EMAIL"}
            onClick={() => pickVerification("EMAIL")}
            icon={Mail}
            title="Էլ․ փոստ"
            description="Հաստատման հղում նամակով"
          />
        </div>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
          Ծանուցումներ
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          Որտեղ ստանալ ծանուցումներ
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Նոր մրցույթների և առաջարկների մասին։ Սկզբում՝ այնտեղ, որտեղ վերիֆիկացվել եք։
          Ավելի ուշ կարող եք փոխել կարգավորումներից։
        </p>
        <div className="mt-4 grid gap-3">
          <NotifyOption
            active={notificationChannel === "TELEGRAM"}
            onClick={() => setNotificationChannel("TELEGRAM")}
            label="Telegram"
          />
          <NotifyOption
            active={notificationChannel === "EMAIL"}
            onClick={() => setNotificationChannel("EMAIL")}
            label="Էլ․ փոստ"
          />
          <NotifyOption
            active={notificationChannel === "BOTH"}
            onClick={() => setNotificationChannel("BOTH")}
            label="Երկուսն էլ (Telegram + Email)"
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200"
        >
          <ArrowLeft className="size-4" />
          Հետ
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() =>
            onContinue({ verificationChannel, notificationChannel })
          }
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white disabled:opacity-60"
        >
          Գրանցվել և շարունակել
          <ArrowRight className="size-5" />
        </button>
      </div>
    </div>
  );
}

function ChannelCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Send;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-3xl p-5 text-left ring-1 transition ${
        active
          ? "bg-slate-950 text-white ring-slate-950 shadow-xl"
          : "bg-white text-slate-800 ring-slate-200 hover:ring-amber-300"
      }`}
    >
      <span
        className={`grid size-11 place-items-center rounded-2xl ${
          active ? "bg-white/15 text-white" : "bg-amber-100 text-amber-800"
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-base font-black">{title}</span>
      <span
        className={`text-xs font-semibold leading-relaxed ${
          active ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {description}
      </span>
    </button>
  );
}

function NotifyOption({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition ${
        active
          ? "bg-amber-50 ring-amber-300"
          : "bg-white ring-slate-200 hover:ring-amber-200"
      }`}
    >
      <Bell className={`size-4 ${active ? "text-amber-700" : "text-slate-400"}`} />
      <span className="text-sm font-black text-slate-900">{label}</span>
    </button>
  );
}
