"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-xl shadow-slate-950/10",
            title: "text-sm font-black",
            description: "text-sm font-semibold text-slate-600",
            actionButton:
              "rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white",
            cancelButton:
              "rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800",
          },
        }}
      />
    </SessionProvider>
  );
}
