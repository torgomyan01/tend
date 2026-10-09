"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AccountMenuPanel,
  initialsFromLabel,
} from "@/components/account-menu-panel";

type Props = {
  label: string;
  isAdmin: boolean;
};

export function MobileProfileDropdown({ label, isAdmin }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Իմ հաշիվ"
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-[0.98]"
      >
        <span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-amber-200 to-amber-400 text-[11px] font-black text-slate-950">
          {initialsFromLabel(label)}
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Փակել մենյուն"
            className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px]"
            onClick={close}
          />
          <div
            id={menuId}
            role="menu"
            className="fixed inset-x-3 top-[4.25rem] z-50 max-h-[min(32rem,calc(100dvh-5.5rem))] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white shadow-[0_24px_60px_-16px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/90 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(18.5rem,calc(100vw-2rem))] sm:max-h-[min(28rem,70dvh)]"
            style={{ animation: "tend-dropdown-in 160ms ease-out" }}
          >
            <AccountMenuPanel
              label={label}
              isAdmin={isAdmin}
              onNavigate={close}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
