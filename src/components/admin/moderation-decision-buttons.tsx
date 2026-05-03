"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "APPROVE" | "REJECT";

type Props = {
  endpoint: string;
  approveLabel?: string;
  rejectLabel?: string;
  approveAction?: string;
  rejectAction?: string;
  size?: "sm" | "md";
};

export function ModerationDecisionButtons({
  endpoint,
  approveLabel = "Հաստատել",
  rejectLabel = "Մերժել",
  approveAction = "APPROVE",
  rejectAction = "REJECT",
  size = "md",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (action: Action) => {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "APPROVE" ? approveAction : rejectAction,
        }),
      });
      if (!res.ok) {
        setError("Չհաջողվեց");
        return;
      }
      router.refresh();
    } catch {
      setError("Ցանցի խնդիր");
    } finally {
      setPending(null);
    }
  };

  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => submit("APPROVE")}
          disabled={pending !== null}
          className={`inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 font-black text-white transition hover:bg-emerald-500 disabled:opacity-50 ${padding}`}
        >
          {pending === "APPROVE" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {approveLabel}
        </button>
        <button
          type="button"
          onClick={() => submit("REJECT")}
          disabled={pending !== null}
          className={`inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 font-black text-white transition hover:bg-rose-500 disabled:opacity-50 ${padding}`}
        >
          {pending === "REJECT" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          {rejectLabel}
        </button>
      </div>
      {error ? (
        <p className="text-[10px] font-bold text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
