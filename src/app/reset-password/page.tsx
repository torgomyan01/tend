import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-4 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:gap-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={ROUTES.login}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
          >
            <ArrowLeft className="size-4" />
            Վերադառնալ
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-slate-200">
            <span className="grid size-7 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
              T
            </span>
            Tend.am
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white p-5 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200 sm:rounded-4xl sm:p-8 sm:shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Գաղտնաբառի վերականգնում
          </p>
          <div className="mt-3 flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <LockKeyhole className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Սահմանեք նոր գաղտնաբառ
              </h1>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                Այս էջը բացվում է Telegram-ից ուղարկված վերականգնման հղումով։
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ResetPasswordForm initialToken={token} />
          </div>
        </section>
      </div>
    </main>
  );
}

