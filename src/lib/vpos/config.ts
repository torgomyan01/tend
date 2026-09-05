/** ITF VPOS live base (trailing slash normalized at use site). */
export const VPOS_LIVE_BASE =
  "https://paymentsystem.itfllc.am/payments/live/";

export function getVposConfig() {
  const publicKey = process.env.VPOS_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VPOS_PRIVATE_KEY?.trim() ?? "";
  const baseUrl = (process.env.VPOS_BASE_URL?.trim() || VPOS_LIVE_BASE).replace(
    /\/?$/,
    "/",
  );

  if (!publicKey || !privateKey) {
    throw new Error("VPOS_KEYS_MISSING");
  }

  return { publicKey, privateKey, baseUrl };
}

/** ITF live rejects amounts below 10 AMD ("Invalid amount"). */
export const VPOS_DEPOSIT_MIN = 10;
export const VPOS_DEPOSIT_MAX = 100_000;
export const VPOS_GATEWAY = "vpos";
