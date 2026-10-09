import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidArmenianPhone } from "@/lib/phone";
import { requestPasswordResetByPhone } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().trim().min(8).max(32),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isValidArmenianPhone(parsed.data.phone)) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const result = await requestPasswordResetByPhone(parsed.data.phone);
  return NextResponse.json(result);
}
