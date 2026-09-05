import { NextResponse } from "next/server";
import { processTelegramUpdate, type TelegramUpdate } from "@/lib/telegram-verification";

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;

  if (update) {
    await processTelegramUpdate(update);
  }

  return NextResponse.json({ ok: true });
}
