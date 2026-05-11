import { z } from "zod";

/** Common FormData fields excluding title, description, location, files. */
export const tenderNumericFieldsSchema = z
  .object({
    address: z.string().trim().max(255).optional().nullable(),
    budgetMin: z.string().optional().nullable(),
    budgetMax: z.string().optional().nullable(),
    durationDays: z.coerce.number().int().min(1).max(90),
    isBlindBidding: z.coerce.boolean(),
    publish: z.coerce.boolean(),
  })
  .superRefine((data, ctx) => {
    const min = data.budgetMin ? Number(data.budgetMin) : null;
    const max = data.budgetMax ? Number(data.budgetMax) : null;
    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMin"],
        message: "Invalid min budget",
      });
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMax"],
        message: "Invalid max budget",
      });
    }
    if (min !== null && max !== null && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMax"],
        message: "Min cannot exceed max",
      });
    }
  });

export type TenderNumericFields = z.infer<typeof tenderNumericFieldsSchema>;

export function parseDraftWizardStep(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const s = z.coerce.number().int().min(1).max(10).safeParse(raw);
  return s.success ? s.data : null;
}

export function normalizeTitleDescription(
  titleRaw: string,
  descriptionRaw: string,
  publish: boolean,
): { ok: true; title: string; description: string } | { ok: false } {
  const titleTrim = titleRaw.trim();
  const descTrim = descriptionRaw.trim();
  if (publish) {
    if (titleTrim.length < 10 || titleTrim.length > 200) {
      return { ok: false };
    }
    if (descTrim.length < 200 || descTrim.length > 5000) {
      return { ok: false };
    }
    return { ok: true, title: titleTrim, description: descTrim };
  }
  const title = titleTrim.length >= 1 ? titleTrim.slice(0, 200) : "Սևագիր";
  const description =
    descTrim.length >= 1 ? descTrim.slice(0, 5000) : ".";
  return { ok: true, title, description };
}

export function parseStringIdArray(raw: unknown): string[] | null {
  if (typeof raw !== "string") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const ids = parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
    if (ids.length !== parsed.length) {
      return null;
    }
    return ids;
  } catch {
    return null;
  }
}
