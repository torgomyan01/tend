"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { UserFormDialog } from "@/components/admin/user-form-dialog";

export function UserCreateButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5"
      >
        <Plus className="size-4" />
        Նոր օգտատեր
      </button>

      <UserFormDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        user={null}
      />
    </>
  );
}
