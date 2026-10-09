/**
 * Dexatel SMS client (https://developers.dexatel.com).
 *
 * Env:
 *   DEXATEL_API_KEY   — API key from Dexatel dashboard (X-Dexatel-Key)
 *   DEXATEL_SENDER    — approved sender name / number (data.from)
 *   DEXATEL_API_BASE  — optional, default https://api.dexatel.com
 */

const DEFAULT_API_BASE = "https://api.dexatel.com";

export function isDexatelConfigured(): boolean {
  return Boolean(
    process.env.DEXATEL_API_KEY?.trim() && process.env.DEXATEL_SENDER?.trim(),
  );
}

/** Dexatel expects digits with country code, no + or spaces: 37477123456 */
export function toDexatelMsisdn(e164OrLocal: string): string | null {
  const digits = e164OrLocal.replace(/\D/g, "");
  if (digits.startsWith("374") && digits.length === 11) return digits;
  if (digits.length === 8) return `374${digits}`;
  if (digits.startsWith("0") && digits.length === 9) return `374${digits.slice(1)}`;
  return null;
}

export async function trySendDexatelSms(params: {
  to: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.DEXATEL_API_KEY?.trim();
  const sender = process.env.DEXATEL_SENDER?.trim();
  const base = (
    process.env.DEXATEL_API_BASE?.trim() || DEFAULT_API_BASE
  ).replace(/\/+$/, "");

  if (!apiKey || !sender) {
    console.warn("[dexatel] DEXATEL_API_KEY or DEXATEL_SENDER not configured");
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const msisdn = toDexatelMsisdn(params.to);
  if (!msisdn) {
    return { ok: false, error: "INVALID_PHONE" };
  }

  const text = params.text.slice(0, 1000);

  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Dexatel-Key": apiKey,
      },
      body: JSON.stringify({
        data: {
          channel: "SMS",
          from: sender,
          to: [msisdn],
          text,
          // Keep leading 0 handling off — we already send E.164 digits.
          number_formatting: false,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[dexatel] send failed", res.status, body.slice(0, 500));
      return { ok: false, error: "SEND_FAILED" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[dexatel] request error", err);
    return { ok: false, error: "NETWORK" };
  }
}
