import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSupportConsole } from "@/components/admin/admin-support-console";

export const dynamic = "force-dynamic";

function SupportConsoleFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-500">Բեռնվում է…</p>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Աջակցություն"
        title="Օգտատերերի զրույցներ"
        description="Մեկ զրույց յուրաքանչյուր օգտատիրոջ համար։ Պատասխանեք հնարավորինս արագ — նոր հաղորդագրությունների դեպքում Telegram ծանուցում կստանաք։"
      />
      <Suspense fallback={<SupportConsoleFallback />}>
        <AdminSupportConsole />
      </Suspense>
    </>
  );
}
