"use client";

import { toast } from "sonner";

export function toastSuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

export function toastError(title: string, description?: string) {
  toast.error(title, description ? { description } : undefined);
}

export async function readApiError(res: Response): Promise<string | null> {
  try {
    const data = (await res.json()) as { error?: string; message?: string } | null;
    return data?.message || data?.error || null;
  } catch {
    return null;
  }
}

