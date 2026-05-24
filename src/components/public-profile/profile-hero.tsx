import {
  BadgeCheck,
  CalendarClock,
  Gavel,
  MessageSquareQuote,
  Send,
  ShieldCheck,
  Star,
} from "lucide-react";
import { AccountTypeBadge } from "@/components/account-type-badge";
import type { AccountTypeValue } from "@/lib/account-type";
import { formatDateTime } from "@/lib/format";

type Props = {
  accountType: AccountTypeValue;
  publicHeading: string;
  subheading: string | null;
  initials: string;
  image: string | null;
  isVerified: boolean;
  telegramVerifiedAt: Date | null;
  memberSince: Date;
  avgRating: number | null;
  reviewCount: number;
  tenderCount: number;
  bidCount: number;
};

export function PublicProfileHero({
  accountType,
  publicHeading,
  subheading,
  initials,
  image,
  isVerified,
  telegramVerifiedAt,
  memberSince,
  avgRating,
  reviewCount,
  tenderCount,
  bidCount,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-4xl bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80">
      <div
        className="relative h-28 overflow-hidden sm:h-36"
        aria-hidden
      >
        <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800" />
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 size-48 rounded-full bg-amber-500/10 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative px-5 pb-6 pt-0 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
          <div className="-mt-14 shrink-0 sm:-mt-16">
            <div className="relative">
              <div className="size-28 overflow-hidden rounded-3xl bg-slate-100 shadow-xl ring-4 ring-white sm:size-32">
                {image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={image}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-linear-to-br from-amber-100 to-amber-50 text-3xl font-black text-amber-800">
                    {initials}
                  </span>
                )}
              </div>
              {isVerified ? (
                <span
                  className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white"
                  title="Հաստատված"
                >
                  <BadgeCheck className="size-4" />
                </span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1 ">
            <div className="flex flex-wrap items-center gap-2 transform translate-y-2">
              <AccountTypeBadge accountType={accountType} size="md" />
              {telegramVerifiedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-sky-800 ring-1 ring-sky-200">
                  <ShieldCheck className="size-3" />
                  Telegram
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem] lg:leading-tight">
              {publicHeading}
            </h1>
            {subheading ? (
              <p className="mt-1.5 text-sm font-semibold text-slate-500">
                <span className="text-slate-400">Կոնտակտային անձ՝</span>{" "}
                {subheading}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-slate-400" />
                Միացել է {formatDateTime(memberSince)}
              </span>
              {avgRating !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-black text-amber-900 ring-1 ring-amber-200/80">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)}
                  <span className="font-semibold text-amber-700/80">
                    ({reviewCount} կարծիք)
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <ProfileStat
            icon={Gavel}
            label="Մրցույթներ"
            value={tenderCount}
          />
          <ProfileStat icon={Send} label="Առաջարկներ" value={bidCount} />
          <ProfileStat
            icon={MessageSquareQuote}
            label="Կարծիքներ"
            value={reviewCount}
          />
        </div>
      </div>
    </section>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gavel;
  label: string;
  value: number | bigint;
}) {
  return (
    <div className="group rounded-2xl bg-slate-50/80 px-3 py-3.5 text-center ring-1 ring-slate-200/80 transition hover:bg-amber-50/50 hover:ring-amber-200/60 sm:px-4">
      <Icon className="mx-auto size-4 text-amber-700/80" aria-hidden />
      <p className="mt-1.5 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
        {Number(value)}
      </p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
