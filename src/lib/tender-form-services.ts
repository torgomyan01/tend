import { z } from "zod";
import { MAX_SERVICES } from "@/lib/tender-form-upload";

export const servicePairSchema = z.object({
  category: z.string().trim().min(1).max(120),
  service: z.string().trim().min(1).max(200),
});

export type TenderServicePayload = z.infer<typeof servicePairSchema>;

export function parseServicesPayload(raw: unknown):
  | { ok: true; services: TenderServicePayload[] }
  | { ok: false; reason: "invalid" | "duplicate" } {
  if (typeof raw !== "string") {
    return { ok: false, reason: "invalid" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const arrayParsed = z
    .array(servicePairSchema)
    .min(1)
    .max(MAX_SERVICES)
    .safeParse(parsed);
  if (!arrayParsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const services = arrayParsed.data;
  const keys = new Set<string>();
  for (const item of services) {
    const key = `${item.category}::${item.service}`;
    if (keys.has(key)) {
      return { ok: false, reason: "duplicate" };
    }
    keys.add(key);
  }

  return { ok: true, services };
}
