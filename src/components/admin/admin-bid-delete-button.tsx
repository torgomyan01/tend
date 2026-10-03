"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

type Props = {
  bidId: string;
  size?: "sm" | "md";
};

const ERR = {
  ESCROW_ACTIVE:
    "\u0549\u056b \u056f\u0561\u0580\u0565\u056c\u056b \u057b\u0576\u057b\u0565\u056c\u055d \u0563\u0578\u0582\u0574\u0561\u0580\u0568 \u0561\u0580\u0564\u0565\u0576 escrow \u0577\u0580\u057b\u0561\u0576\u0561\u057c\u0578\u0582\u0569\u0575\u0561\u0576 \u0574\u0565\u057b \u0567\u055d",
  NOT_FOUND: "\u0531\u057c\u0561\u057b\u0561\u0580\u056f\u0568 \u0579\u056b \u0563\u057f\u0576\u057e\u0565\u056c\u055d",
  FORBIDDEN: "\u0539\u0578\u0582\u0575\u056c\u057f\u057e\u0578\u0582\u0569\u0575\u0578\u0582\u0576 \u0579\u056f\u0561\u055d",
} as const;

export function AdminBidDeleteButton({ bidId, size = "sm" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm(
      "\u054b\u0576\u057b\u0565\u055e\u056c \u0561\u0575\u057d \u0561\u057c\u0561\u057b\u0561\u0580\u056f\u0568\u055d \u0533\u0578\u0580\u056e\u0578\u0572\u0578\u0582\u0569\u0575\u0578\u0582\u0576\u0568 \u057e\u0565\u0580\u0561\u0564\u0561\u0580\u0571\u0565\u056c\u056b \u0579\u0567\u055d \u0535\u0569\u0565 \u0574\u0578\u0582\u057f\u0584\u056b \u057e\u0573\u0561\u0580 \u056f\u0561 \u0587 \u0564\u0565\u057c \u0579\u056b \u057e\u0565\u0580\u0561\u0564\u0561\u0580\u0571\u057e\u0565\u056c, \u0561\u0575\u0576 \u056f\u057e\u0565\u0580\u0561\u0564\u0561\u0580\u0571\u057e\u056b \u056f\u0580\u0565\u0564\u056b\u057f\u0578\u057e\u055d",
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bids/${bidId}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        refunded?: boolean;
      } | null;

      if (!res.ok) {
        const msg =
          ERR[data?.error as keyof typeof ERR] ??
          "\u0549\u0570\u0561\u057b\u0578\u0572\u0572\u057e\u0565\u0581 \u057b\u0576\u057b\u0565\u056c \u0561\u057c\u0561\u057b\u0561\u0580\u056f\u0568\u055d";
        toastError("\u054b\u0576\u057b\u0578\u0582\u0574", msg);
        return;
      }

      toastSuccess(
        "\u054b\u0576\u057b\u057e\u0565\u0581",
        data?.refunded
          ? "\u0531\u057c\u0561\u057b\u0561\u0580\u056f\u0568 \u0570\u0565\u057c\u0561\u0581\u057e\u0565\u0581, \u0574\u0578\u0582\u057f\u0584\u056b \u057e\u0573\u0561\u0580\u0568 \u057e\u0565\u0580\u0561\u0564\u0561\u0580\u0571\u057e\u0565\u0581 \u056f\u0580\u0565\u0564\u056b\u057f\u0578\u057e\u055d"
          : "\u0531\u057c\u0561\u057b\u0561\u0580\u056f\u0568 \u0570\u0565\u057c\u0561\u0581\u057e\u0565\u0581\u055d",
      );
      router.refresh();
    } catch {
      toastError(
        "\u0541\u0561\u0576\u0581",
        "\u0541\u0561\u0576\u0581\u056b \u056d\u0576\u0564\u056b\u0580\u055d \u0553\u0578\u0580\u0571\u0565\u0584 \u0576\u0578\u0580\u056b\u0581\u055d",
      );
    } finally {
      setBusy(false);
    }
  }

  const sizing =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onDelete()}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-rose-50 font-black text-rose-800 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50 ${sizing}`}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      {"\u054b\u0576\u057b\u0565\u056c"}
    </button>
  );
}
