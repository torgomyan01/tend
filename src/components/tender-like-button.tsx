"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { readApiError, toastError } from "@/lib/toast";

export function TenderLikeButton({
  tenderId,
  initialLiked,
  isAuthenticated,
  loginHref,
  size = "md",
}: {
  tenderId: string;
  initialLiked: boolean;
  isAuthenticated: boolean;
  loginHref: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [pending, startTransition] = useTransition();

  const pad = size === "sm" ? "p-2" : "p-2.5";
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!isAuthenticated) {
          window.location.href = loginHref;
          return;
        }
        startTransition(async () => {
          const next = !liked;
          setLiked(next);
          try {
            const res = await fetch(`/api/tenders/${tenderId}/like`, {
              method: next ? "POST" : "DELETE",
            });
            if (!res.ok) {
              setLiked(!next);
              void readApiError(res).then((detail) =>
                toastError(
                  "Հավանումը չպահպանվեց",
                  detail ?? `HTTP ${res.status}`,
                ),
              );
              return;
            }
            router.refresh();
          } catch {
            setLiked(!next);
            toastError("Ցանցի խնդիր", "Չհաջողվեց թարմացնել հավանումը։");
          }
        });
      }}
      aria-pressed={liked}
      aria-label={liked ? "Հանել հավանումից" : "Հավանել մրցույթը"}
      className={`inline-flex items-center justify-center rounded-full ring-1 transition ${
        liked
          ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
      } ${pad} ${pending ? "opacity-60" : ""}`}
    >
      <Heart className={`${iconSize} ${liked ? "fill-current" : ""}`} />
    </button>
  );
}

