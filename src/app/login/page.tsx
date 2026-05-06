import {
  ArrowLeft,
  CheckCircle2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { ROUTES } from "@/lib/routes";

const benefits = [
  "Կառավարեք ձեր մրցույթները մեկ հաշվից",
  "Ուղարկեք փակ առաջարկներ վստահելի միջավայրում",
  "Հետևեք դրամապանակին, վճարումներին և գնահատականներին",
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-4 text-slate-950 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-8 lg:min-h-[calc(100vh-4rem)] lg:justify-center">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={ROUTES.home}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-lg"
          >
            <ArrowLeft className="size-4" />
            Վերադառնալ
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-800 ring-1 ring-slate-200 lg:hidden">
            <span className="grid size-7 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
              T
            </span>
            Tend.am
          </span>
        </div>

        <section className="grid overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-950/10 ring-1 ring-slate-200 sm:rounded-4xl sm:shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden overflow-hidden bg-slate-950 p-6 text-white sm:p-10 lg:block lg:p-12">
            <div className="absolute -right-20 -top-20 size-72 rounded-full bg-amber-300/20 blur-3xl" />
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
                Մուտք
              </p>
              <h1 className="mt-4 max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
                Շարունակեք այնտեղից, որտեղ կանգ եք առել։
              </h1>
              <p className="mt-5 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
                Մուտք գործեք Tend.am և շարունակեք պատվիրել, առաջարկներ ուղարկել
                կամ հետևել ձեր ընթացիկ մրցույթներին։
              </p>

              <div className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-100 ring-1 ring-white/10"
                  >
                    <CheckCircle2 className="size-5 text-amber-300" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="mb-8">
              <p className="lg:hidden text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                Մուտք
              </p>
              <div className="grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <LogIn className="size-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
                Մուտք գործել
              </h2>
              <p className="mt-2 text-slate-600">
                Դեռ չունե՞ք հաշիվ։{" "}
                <Link
                  href={ROUTES.register}
                  className="font-black text-amber-700"
                >
                  Գրանցվել
                </Link>
              </p>
            </div>

            <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-slate-100" />}>
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
