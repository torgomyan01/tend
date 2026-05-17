import { NextResponse } from "next/server";
import { verifyEmailByToken } from "@/lib/email/verify-email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "TOKEN_REQUIRED" }, { status: 400 });
  }

  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: result.userId });
}
