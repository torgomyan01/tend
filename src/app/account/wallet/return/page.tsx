import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Legacy / malformed VPOS return:
 * /account/wallet/return?orderNumber=2?orderId=2&responseCode=00
 * → /account/wallet/return/2?orderId=2&responseCode=00
 */
export default async function WalletReturnLegacyPage({ searchParams }: Props) {
  const raw = await searchParams;
  const orderRaw = Array.isArray(raw.orderNumber)
    ? raw.orderNumber[0]
    : raw.orderNumber;

  // VPOS may append "?orderId=..." onto our query, producing "2?orderId=2"
  const orderNumber = (orderRaw ?? "").split("?")[0]?.trim() ?? "";

  if (!/^\d+$/.test(orderNumber)) {
    redirect(ROUTES.account);
  }

  const qs = new URLSearchParams();
  for (const key of ["orderId", "responseCode", "description"] as const) {
    const v = raw[key];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) qs.set(key, s);
  }

  // Also parse params stuck after "?" inside orderNumber value
  if (orderRaw?.includes("?")) {
    const stuck = orderRaw.slice(orderRaw.indexOf("?") + 1);
    const stuckParams = new URLSearchParams(stuck);
    for (const [k, v] of stuckParams.entries()) {
      if (!qs.has(k) && v) qs.set(k, v);
    }
  }

  const dest = ROUTES.accountWalletReturn(orderNumber);
  redirect(qs.size > 0 ? `${dest}?${qs.toString()}` : dest);
}
