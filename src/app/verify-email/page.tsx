import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyEmailByToken } from "@/lib/email/verify-email";
import { ROUTES } from "@/lib/routes";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Էլ․ փոստի հաստատում",
  robots: NOINDEX_NOFOLLOW,
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return (
      <VerifyResult
        success={false}
        message="Հղումը թերի է։ Խնդրում ենք նորից բացել նամակից ստացված հղումը։"
      />
    );
  }

  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return (
      <VerifyResult
        success={false}
        message="Հղումը անվավեր է կամ ժամկետանց է։ Գրանցման էջից կարող եք նորից ուղարկել հաստատման նամակը։"
      />
    );
  }

  redirect(`${ROUTES.login}?verified=email`);
}

function VerifyResult({
  success,
  message,
}: {
  success: boolean;
  message: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ee] px-4 py-12">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
        <div
          className={`mx-auto grid size-16 place-items-center rounded-2xl ${
            success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {success ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <XCircle className="size-8" />
          )}
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-950">
          {success ? "Էլ․ փոստը հաստատված է" : "Չհաջողվեց հաստատել"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
        <Link
          href={ROUTES.login}
          className="mt-8 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
        >
          Մուտք գործել
        </Link>
      </div>
    </main>
  );
}
