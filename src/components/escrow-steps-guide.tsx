"use client";

import { ShieldCheck } from "lucide-react";
import {
  DEFAULT_ESCROW_FEE_PERCENT,
} from "@/lib/escrow";
import {
  ESCROW_CLIENT_STEPS,
  ESCROW_PROVIDER_STEPS,
  type EscrowStep,
} from "@/lib/escrow-steps";

type Props = {
  role: "client" | "provider";
  /** Compact list for modals */
  compact?: boolean;
  className?: string;
  feePercent?: number;
};

export function EscrowStepsGuide({
  role,
  compact = false,
  className = "",
  feePercent = DEFAULT_ESCROW_FEE_PERCENT,
}: Props) {
  const steps: EscrowStep[] =
    role === "client" ? ESCROW_CLIENT_STEPS : ESCROW_PROVIDER_STEPS;
  const title =
    role === "client"
      ? "Պատվիրատուի քայլերը"
      : "Կատարողի քայլերը";
  const feeNote =
    role === "client"
      ? `Միջնորդավճար՝ ${feePercent}% (հանվում է կատարողից բարեհաջող ավարտից հետո)։ Դուք վճարում եք առաջարկի ամբողջ գումարը։`
      : `Միջնորդավճար՝ ${feePercent}%՝ հանվում է ձեր ստացվող գումարից բարեհաջող ավարտից հետո։`;

  return (
    <section
      className={`rounded-2xl bg-emerald-50/80 p-4 ring-1 ring-emerald-200 ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
            Պաշտպանված գործարք
          </p>
          <h3
            className={`font-black text-emerald-950 ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            {title}
          </h3>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-emerald-900/80">
            {feeNote}
          </p>
        </div>
      </div>
      <ol
        className={`mt-3 space-y-2 ${
          compact ? "text-[11px]" : "text-xs"
        } font-semibold text-emerald-950`}
      >
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-2">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-200 text-[10px] font-black text-emerald-900">
              {i + 1}
            </span>
            <span>
              <span className="font-black">{step.title}</span>
              {" — "}
              <span className="font-semibold text-emerald-900/85">
                {step.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
