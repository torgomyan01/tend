import { NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram-verification";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: {
      id?: number | string;
    };
  };
};

export async function POST(request: Request) {
  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;

  if (update) {
    await processTelegramUpdate(update);
  }

  return NextResponse.json({ ok: true });
}
