"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ROUTES } from "@/lib/routes";

export function AccountSignOut() {
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut({ callbackUrl: ROUTES.home });
      }}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-xl shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      <LogOut className="size-4" />
      Դուրս գալ
    </button>
  );
}
