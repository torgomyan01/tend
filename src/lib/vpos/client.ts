import { createHash } from "node:crypto";
import { getVposConfig } from "@/lib/vpos/config";

export type VposApiResult<T> = {
  ok: boolean;
  status: number;
  body: T | null;
  raw: string;
};

type VposEnvelope<T> = {
  data?: T;
  message?: string;
  status?: boolean;
};

function signature(privateKey: string, publicKey: string) {
  return createHash("md5").update(privateKey + publicKey).digest("hex");
}

async function vposPost<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<VposApiResult<VposEnvelope<T>>> {
  const { publicKey, privateKey, baseUrl } = getVposConfig();
  const url = `${baseUrl}${path.replace(/^\//, "")}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "public-key": publicKey,
      signature: signature(privateKey, publicKey),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await res.text();
  let body: VposEnvelope<T> | null = null;
  try {
    body = JSON.parse(raw) as VposEnvelope<T>;
  } catch {
    body = null;
  }

  return { ok: res.ok, status: res.status, body, raw };
}

export type VposNewOrderData = {
  itfOrderId?: string | number;
  partnerOrderId?: string | number;
  customerID?: string;
  redirectURL?: string;
  needToRedirect?: boolean;
};

export type VposTransactionItem = {
  order?: {
    id?: string | number;
    amount?: number;
    status?: number;
    customerId?: number | string;
    description?: string;
    /** "1" when the order was authorized in two-phase (hold) mode. */
    freezing?: string | number;
  };
  response?: {
    Amount?: number;
    ApprovedAmount?: number;
    DepositedAmount?: number;
    PaymentState?: string;
    ResponseCode?: string;
    OrderStatus?: string;
    Description?: string;
  };
  amount?: number;
};

export async function vposRegisterCustomer(input: {
  customerID: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
}) {
  return vposPost<{ clientID?: string }>("customer/new", {
    customerID: input.customerID,
    firstName: input.firstName,
    ...(input.lastName ? { lastName: input.lastName } : {}),
    phoneNumber: input.phoneNumber,
    ...(input.email ? { email: input.email } : {}),
  });
}

export async function vposCreateOrder(input: {
  customerID: string;
  amount: number;
  orderID: number;
  backURL: string;
  description?: string;
  lang?: string;
}) {
  return vposPost<VposNewOrderData>("order/new", {
    customerID: input.customerID,
    amount: input.amount,
    orderID: input.orderID,
    backURL: input.backURL,
    attachCard: false,
    osType: 3,
    lang: input.lang ?? "hy",
    ...(input.description ? { description: input.description } : {}),
  });
}

export async function vposTransactionsList(input: { orderID: number }) {
  return vposPost<{ list?: VposTransactionItem[] }>("transactions/list", {
    orderID: input.orderID,
  });
}

type ConfirmData = {
  responseCode?: string;
  error?: string;
  response?: { ResponseCode?: string; ResponseMessage?: string };
};

export async function vposConfirmPayment(input: {
  orderID: number;
  customerID: string;
  amount: number;
}) {
  return vposPost<ConfirmData>("order/confirm-payment", {
    orderID: input.orderID,
    customerID: input.customerID,
    amount: input.amount,
  });
}

/**
 * ITF returns `{"message":"OK","status":false}` for a successful capture, and
 * ResponseCode 07 "Payment must be in approved state" when the order was
 * already captured. Both mean the money is (now) debited.
 */
export function isVposCaptureSettled(
  result: VposApiResult<{ data?: ConfirmData; message?: string }>,
): boolean {
  const message = result.body?.message ?? "";
  if (/^ok$/i.test(message.trim())) {
    return true;
  }
  const inner = result.body?.data?.response;
  if (
    inner?.ResponseCode === "07" ||
    /must be in approved state/i.test(inner?.ResponseMessage ?? "")
  ) {
    return true;
  }
  return false;
}

export type VposAuthState = "approved" | "declined" | "pending";

/**
 * `response` in transactions/list is a snapshot taken at authorization time and
 * is never refreshed after capture, so only the authorization outcome can be
 * read from it.
 */
export function vposAuthState(item: VposTransactionItem): VposAuthState {
  const code = item.response?.ResponseCode?.trim() ?? "";
  const state = item.response?.PaymentState?.toLowerCase() ?? "";
  const orderStatus = String(item.response?.OrderStatus ?? "");

  if (code === "00") return "approved";
  if (state === "payment_approved" || state === "payment_deposited") {
    return "approved";
  }
  if (orderStatus === "1" || orderStatus === "2") return "approved";

  if (state === "payment_declined" || state === "payment_void") return "declined";
  if (orderStatus === "6" || orderStatus === "3") return "declined";

  // "0-100" = no payment attempts yet, "0-90000" = started
  if (code === "" || code === "0-100" || code === "0-90000") return "pending";
  if (state === "payment_started" || orderStatus === "0") return "pending";

  return "declined";
}

/** True when funds are held and a Confirmation call is required to debit them. */
export function vposNeedsCapture(item: VposTransactionItem): boolean {
  return String(item.order?.freezing ?? "") === "1";
}
