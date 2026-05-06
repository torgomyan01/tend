"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

type VerificationDecisionButtonsProps = {
  requestId: string;
};

export function VerificationDecisionButtons({
  requestId,
}: VerificationDecisionButtonsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitDecision(action: "APPROVE" | "REJECT") {
    setIsPending(action);
    setError(null);

    try {
      const response = await fetch(`/api/admin/verifications/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: note.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const raw = payload?.error ?? "REQUEST_FAILED";
        setError(raw);
        toastError(
          "Վերիֆիկացիա",
          "Չհաջողվեց պահպանել։ Փորձեք կրկին։",
        );
        return;
      }

      toastSuccess(
        action === "APPROVE" ? "Հաստատվեց" : "Մերժվեց",
        action === "APPROVE"
          ? "Վերիֆիկացիան հաստատված է։"
          : "Վերիֆիկացիան մերժված է։",
      );
      router.refresh();
    } catch {
      setError("NETWORK_ERROR");
      toastError("Ցանց", "Ցանցի խնդիր։ Փորձեք կրկին։");
    } finally {
      setIsPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        rows={2}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Մեկնաբանություն (ոչ պարտադիր)"
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900"
      />
      {error ? (
        <p className="text-xs font-bold text-rose-600">
          Չհաջողվեց պահպանել։ Փորձեք կրկին։
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submitDecision("APPROVE")}
          disabled={isPending !== null}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          <Check className="size-4" />
          {isPending === "APPROVE" ? "Հաստատվում է…" : "Հաստատել"}
        </button>
        <button
          type="button"
          onClick={() => submitDecision("REJECT")}
          disabled={isPending !== null}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
        >
          <X className="size-4" />
          {isPending === "REJECT" ? "Մերժվում է…" : "Մերժել"}
        </button>
      </div>
    </div>
  );
}
