"use client";

import { Layers, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  InterestSelector,
  type InterestSelection,
} from "@/components/interest-selector";
import type { ServiceCategoryWithServices } from "@/lib/services-data";
import { toastError, toastSuccess } from "@/lib/toast";

type OnboardingResponse = {
  needsOnboarding?: boolean;
  categories?: ServiceCategoryWithServices[];
};

/**
 * Google-ով նոր գրանցված օգտատերերի համար՝ ոլորտ/ծառայություն ընտրության մոդալ։
 */
export function GoogleInterestsOnboarding() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ServiceCategoryWithServices[]>(
    [],
  );
  const [interests, setInterests] = useState<InterestSelection[]>([]);
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);

  const checkOnboarding = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/interests/onboarding", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as OnboardingResponse;
      if (data.needsOnboarding && Array.isArray(data.categories)) {
        setCategories(data.categories);
        setInterests([]);
        setOpen(true);
      } else {
        setOpen(false);
      }
      setCheckedUserId(userId);
    } catch {
      /* ignore network */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setOpen(false);
      setCheckedUserId(null);
      return;
    }
    if (checkedUserId === session.user.id) return;
    void checkOnboarding(session.user.id);
  }, [status, session?.user?.id, checkedUserId, checkOnboarding]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleSave() {
    if (interests.length === 0) {
      toastError(
        "Ընտրեք ոլորտներ",
        "Խնդրում ենք ընտրել առնվազն մեկ ոլորտ կամ ծառայություն։",
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (data?.error === "INVALID_INTERESTS") {
          toastError(
            "Չի կարող պահպանել",
            "Ընտրությունը չի համապատասխանում ցանկին։ Թարմացրեք էջը։",
          );
        } else {
          toastError("Սխալ", "Չհաջողվեց պահպանել։ Փորձեք նորից։");
        }
        return;
      }
      toastSuccess(
        "Պահպանվեց",
        "Ձեր ոլորտները գրանցվեցին։ Կտեղեկացնենք համապատասխան մրցույթների մասին։",
      );
      setOpen(false);
    } catch {
      toastError("Ցանցի խնդիր", "Փորձեք նորից։");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    if (loading && status === "authenticated") {
      return null;
    }
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-interests-onboarding-title"
    >
      <div className="flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#f7f4ee] shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl">
        <header className="shrink-0 border-b border-slate-200/80 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <Layers className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                Google գրանցում
              </p>
              <h2
                id="google-interests-onboarding-title"
                className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
              >
                Ընտրեք ոլորտներն ու ծառայությունները
              </h2>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-600">
                Սա օգնում է ստանալ թիրախային մրցույթների ծանուցումներ։ Առնվազն մեկ
                ծառայություն պարտադիր է։
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {categories.length === 0 ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900 ring-1 ring-rose-200">
              Ոլորտների ցանկը դեռ հասանելի չէ։ Փորձեք ավելի ուշ։
            </p>
          ) : (
            <InterestSelector
              selected={interests}
              onChange={setInterests}
              categories={categories}
            />
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-200/80 bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
              {interests.length === 0
                ? "Դեռ ընտրված չէ"
                : `${interests.length} ծառայություն ընտրված է`}
            </p>
            <button
              type="button"
              disabled={saving || interests.length === 0 || categories.length === 0}
              onClick={() => void handleSave()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Պահպանում…
                </>
              ) : (
                "Պահպանել և շարունակել"
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
