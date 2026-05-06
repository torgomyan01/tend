"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  UserFormDialog,
  type UserFormUser,
} from "@/components/admin/user-form-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

const DELETE_ERROR_MESSAGES: Record<string, string> = {
  CANNOT_DELETE_SELF: "Չեք կարող ջնջել ինքներդ ձեզ։",
  NOT_FOUND: "Օգտատերը չի գտնվել։",
  FORBIDDEN: "Թույլտվություն չկա։",
};

type UserRowActionsProps = {
  user: UserFormUser;
  isSelf: boolean;
};

export function UserRowActions({ user, isSelf }: UserRowActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error
          ? (DELETE_ERROR_MESSAGES[data.error] ?? "Չհաջողվեց ջնջել։")
          : "Չհաջողվեց ջնջել։";
        setError(message);
        toastError("Ջնջում", message);
        setIsDeleting(false);
        return;
      }

      setIsConfirmingDelete(false);
      toastSuccess("Ջնջվեց", "Օգտատերը և կապակցված տվյալները հեռացվել են։");
      router.refresh();
    } catch {
      const msg = "Ցանցի սխալ։ Փորձեք կրկին։";
      setError(msg);
      toastError("Ցանց", msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="grid size-9 place-items-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
          aria-label="Խմբագրել"
          title="Խմբագրել"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSelf}
          className="grid size-9 place-items-center rounded-2xl bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Ջնջել"
          title={isSelf ? "Չեք կարող ջնջել ինքներդ ձեզ" : "Ջնջել"}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <UserFormDialog
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={user}
      />

      {isConfirmingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Փակել"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) {
                setIsConfirmingDelete(false);
                setError(null);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-4xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
              Հաստատել ջնջումը
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              Ջնջե՞լ {user.name || user.email}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Օգտատիրոջ բոլոր մրցույթները, առաջարկները, գործարքները և
              կարծիքները ևս կջնջվեն։ Գործողությունը հնարավոր չէ հետ բերել։
            </p>

            {error ? (
              <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setError(null);
                }}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
              >
                Չեղարկել
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                Ջնջել
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
