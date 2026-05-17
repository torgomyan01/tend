import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getResendFromAddress(): string | null {
  const from = process.env.RESEND_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

export async function trySendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const resend = getResend();
  const from = getResendFromAddress();

  if (!resend || !from) {
    console.warn("[email] RESEND_API_KEY or RESEND_FROM not configured");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: `Tend.am <${from}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}
