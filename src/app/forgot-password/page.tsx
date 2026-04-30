import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

const recoverySteps = [
  "Մուտքագրեք գրանցված էլ․ փոստը",
  "Ստացեք վերականգնման հղումը",
  "Սահմանեք նոր անվտանգ գաղտնաբառ",
];

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-5 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8">
        <Link
          href={ROUTES.register}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
        >
          <ArrowLeft className="size-4" />
          Վերադառնալ գրանցման էջ
        </Link>

        <section className="grid overflow-hidden rounded-4xl bg-white shadow-2xl shadow-slate-950/10 ring-1 ring-slate-200 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-slate-950 p-6 text-white sm:p-10 lg:p-12">
            <div className="absolute -left-20 -top-20 size-72 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-white text-xl font-black text-slate-950">
                  T
                </span>
                <span className="text-2xl font-black tracking-tight">
                  Tend.am
                </span>
              </div>

              <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-amber-300 sm:mt-10">
                Գաղտնաբառի վերականգնում
              </p>
              <h1 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                Վերականգնեք մուտքը ձեր հաշվին անվտանգ ձևով։
              </h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
                Մենք կուղարկենք հղում, որով կարող եք ստեղծել նոր գաղտնաբառ և
                շարունակել օգտագործել Tend.am-ը։
              </p>

              <div className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
                {recoverySteps.map((step) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-100 ring-1 ring-white/10"
                  >
                    <ShieldCheck className="size-5 text-amber-300" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="mb-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <KeyRound className="size-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                Մոռացե՞լ եք գաղտնաբառը
              </h2>
              <p className="mt-2 leading-7 text-slate-600">
                Մուտքագրեք ձեր էլ․ փոստը, և մենք կուղարկենք վերականգնման
                հրահանգները։
              </p>
            </div>

            <form className="space-y-6">
              <label className="block">
                <span className="text-sm font-black text-slate-700">
                  Էլ․ փոստ
                </span>
                <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Mail className="size-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-slate-950 px-6 py-4 text-base font-black text-white shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1 hover:bg-slate-800"
              >
                Ուղարկել վերականգնման հղումը
              </button>

              <p className="text-center text-sm font-semibold text-slate-600">
                Հիշեցի՞ք գաղտնաբառը։{" "}
                <Link href={ROUTES.login} className="font-black text-amber-700">
                  Մուտք գործել
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
