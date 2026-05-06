"use client";

import { Loader2, MessageCircle, Pencil, Trash2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TenderStatus } from "@/generated/prisma/client";
import { ModerationDecisionButtons } from "@/components/admin/moderation-decision-buttons";
import {
  AdminTenderEditDialog,
  type AdminTenderEditDefaults,
} from "@/components/admin/admin-tender-edit-dialog";
import { TENDER_STATUS_LABEL } from "@/lib/tender-status";
import { toastError, toastSuccess } from "@/lib/toast";

const QUICK_STATUSES: TenderStatus[] = [
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "AWARDED",
  "COMPLETED",
  "CANCELLED",
];

type Props = {
  tenderId: string;
  status: TenderStatus;
  clientTelegramChatId: string | null;
  clientIsBlocked: boolean;
  editDefaults: AdminTenderEditDefaults;
};

export function AdminTenderActions({
  tenderId,
  status,
  clientTelegramChatId,
  clientIsBlocked,
  editDefaults,
}: Props) {
  const router = useRouter();
  const [draftStatus, setDraftStatus] = useState(status);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<
    "status" | "delete" | "block" | "telegram" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftStatus(status);
  }, [status]);

  const patchJson = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/tenders/${tenderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  };

  const applyStatus = async () => {
    if (draftStatus === status) {
      return;
    }
    setBusy("status");
    setError(null);
    try {
      const res = await patchJson({
        action: "SET_STATUS",
        status: draftStatus,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg =
          data?.error === "SAME_STATUS"
            ? "Կարգավիճակը նույնն է։"
            : "Չհաջողվեց փոխել կարգավիճակը։";
        setError(msg);
        toastError("Կարգավիճակ", msg);
        return;
      }
      toastSuccess("Թարմացվեց", "Մրցույթի կարգավիճակը փոխվել է։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setBusy(null);
    }
  };

  const removeTender = async () => {
    const ok = window.confirm(
      "Ջնջե՞լ այս մրցույթը։ Գործողությունը վերադարձելի չէ։",
    );
    if (!ok) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenders/${tenderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const msg = "Չհաջողվեց ջնջել։";
        setError(msg);
        toastError("Ջնջում", msg);
        return;
      }
      toastSuccess("Ջնջվեց", "Մրցույթը հեռացվել է։");
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setBusy(null);
    }
  };

  const toggleBlockClient = async () => {
    const next = !clientIsBlocked;
    const ok = window.confirm(
      next
        ? "Արգելափակե՞լ մրցույթի հայտարարիչին (ամբողջ հաշիվը)։"
        : "Ապարգելափակե՞լ հայտարարիչին։",
    );
    if (!ok) {
      return;
    }
    setBusy("block");
    setError(null);
    try {
      const res = await patchJson({
        action: "SET_CLIENT_BLOCKED",
        blocked: next,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const msg =
          data?.error === "CANNOT_BLOCK_SELF"
            ? "Չեք կարող արգելափակել ինքներդ ձեզ։"
            : "Չհաջողվեց։";
        setError(msg);
        toastError("Գործողություն", msg);
        return;
      }
      toastSuccess(
        next ? "Արգելափակված" : "Ապարգելափակված",
        next
          ? "Հայտարարիչն արգելափակվել է։"
          : "Հայտարարիչն ապարգելափակվել է։",
      );
      router.refresh();
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setBusy(null);
    }
  };

  const sendTelegram = async () => {
    const message = window.prompt("Հաղորդագրություն Telegram-ով հայտարարիչին՝");
    if (message === null) {
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      const msg = "Հաղորդագրությունը դատարկ է։";
      setError(msg);
      toastError("Հաղորդագրություն", msg);
      return;
    }
    setBusy("telegram");
    setError(null);
    try {
      const res = await patchJson({
        action: "SEND_TELEGRAM",
        message: trimmed,
      });
      const data = (await res.json().catch(() => null)) as {
        delivered?: boolean;
      } | null;
      if (!res.ok) {
        const msg = "Չհաջողվեց ուղարկել։";
        setError(msg);
        toastError("Telegram", msg);
        return;
      }
      if (!clientTelegramChatId) {
        toastError(
          "Telegram",
          "Հայտարարիչը Telegram չի կապել։",
        );
      } else if (data?.delivered === false) {
        toastError(
          "Telegram",
          "Bot token-ը բացակայում է կամ ուղարկումը ձախողվեց։",
        );
      } else {
        toastSuccess("Ուղարկվեց", "Հաղորդագրությունը Telegram-ով ուղարկվել է։");
      }
    } catch {
      const msg = "Ցանցի խնդիր։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setBusy(null);
    }
  };

  const tinyBtn =
    "inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-black transition disabled:opacity-50 ring-1";

  return (
    <>
      <div className="flex min-w-0 max-w-xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
          <span
            className={`rounded-full px-2 py-0.5 ring-1 ${
              clientTelegramChatId
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-slate-100 text-slate-500 ring-slate-200"
            }`}
          >
            Telegram {clientTelegramChatId ? "✓" : "—"}
          </span>
          {clientIsBlocked ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800 ring-1 ring-rose-200">
              Հաշիվ արգելափակված
            </span>
          ) : null}
        </div>

        {status === "REVIEW" ? (
          <ModerationDecisionButtons
            endpoint={`/api/admin/tenders/${tenderId}`}
            approveLabel="Հաստատել"
            rejectLabel="Մերժել"
            size="sm"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value as TenderStatus)}
            className="rounded-2xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/25"
          >
            {QUICK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TENDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy !== null || draftStatus === status}
            onClick={() => void applyStatus()}
            className={`${tinyBtn} bg-slate-900 text-white ring-slate-900 hover:bg-slate-800`}
          >
            {busy === "status" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : null}
            Կարգավիճակ
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setEditOpen(true)}
            className={`${tinyBtn} bg-white text-slate-700 ring-slate-200 hover:bg-slate-50`}
          >
            <Pencil className="size-3.5" />
            Խմբագրել
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void sendTelegram()}
            className={`${tinyBtn} bg-sky-50 text-sky-900 ring-sky-200 hover:bg-sky-100`}
          >
            {busy === "telegram" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MessageCircle className="size-3.5" />
            )}
            Telegram
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void toggleBlockClient()}
            className={`${tinyBtn} ${
              clientIsBlocked
                ? "bg-amber-50 text-amber-900 ring-amber-200"
                : "bg-rose-50 text-rose-800 ring-rose-200"
            }`}
          >
            {busy === "block" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserX className="size-3.5" />
            )}
            {clientIsBlocked ? "Ապարգելափակել" : "Արգելափակել"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void removeTender()}
            className={`${tinyBtn} bg-white text-rose-700 ring-rose-200 hover:bg-rose-50`}
          >
            {busy === "delete" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Ջնջել
          </button>
        </div>

        {error ? (
          <p className="text-[11px] font-bold text-rose-600">{error}</p>
        ) : null}
      </div>

      <AdminTenderEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tenderId={tenderId}
        defaults={editDefaults}
      />
    </>
  );
}
