import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { settleVposDeposit } from "@/lib/vpos/settle-deposit";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderNumber: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  try {
    const result = await settleVposDeposit({
      userId: session.user.id,
      orderNumber: parsed.data.orderNumber,
    });

    if (result.status === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (result.status === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "VPOS_KEYS_MISSING") {
      return NextResponse.json({ error: "VPOS_NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("[POST /api/account/wallet/confirm]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
