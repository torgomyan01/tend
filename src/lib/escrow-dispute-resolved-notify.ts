import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { formatAmd } from "@/lib/format";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyEscrowDisputeResolved(params: {
  clientId: string;
  providerId: string;
  tenderId: string;
  tenderTitle: string;
  contractId: string;
  outcome: "RELEASED" | "REFUNDED";
  amount: number;
  resolutionNote?: string | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);
  const hrefPath = ROUTES.contract(params.contractId);
  const url = absoluteAppUrl(hrefPath);
  const amountLabel = formatAmd(params.amount);
  const outcomeLabelHy =
    params.outcome === "RELEASED"
      ? "Գումարը փոխանցվում է կատարողին"
      : "Գումարը վերադարձվում է պատվիրատուին";

  const lines = [
    "<b>Tend.am</b>",
    "<b>" + "Վեճը լուծված է" + "</b>",
    "",
    `<b>${title}</b>`,
    "",
    `${escapeTelegramHtml(outcomeLabelHy)} (${escapeTelegramHtml(amountLabel)}).`,
  ];
  if (params.resolutionNote?.trim()) {
    lines.push(
      "",
      "<b>" + "Ադմինի որոշում" + "</b>",
      escapeTelegramHtml(params.resolutionNote.trim()),
    );
  }
  if (url) {
    lines.push(
      "",
      `<a href="${escapeTelegramHtml(url)}">` + "Բացել պայմանագիրը" + `</a>`,
    );
  }
  const text = lines.join("\n");

  const inAppBody = params.resolutionNote?.trim()
    ? `«${params.tenderTitle}» · ${outcomeLabelHy}. ${params.resolutionNote.trim()}`
    : `«${params.tenderTitle}» · ${outcomeLabelHy}.`;

  const payload = {
    telegramText: text,
    emailSubject: "Վեճը լուծված է" + `՝ ${params.tenderTitle}`,
    emailTitle: "Վեճը լուծված է",
    ctaLabel: "Բացել պայմանագիրը",
    ctaUrl: url || undefined,
    inApp: {
      category: "APPROVED" as const,
      kind: NOTIFICATION_KINDS.ESCROW_DISPUTE_RESOLVED,
      title: "Վեճը լուծված է",
      body: inAppBody,
      href: hrefPath,
      tenderId: params.tenderId,
    },
  };

  await Promise.allSettled([
    notifyUserById(params.clientId, payload),
    notifyUserById(params.providerId, payload),
  ]);
}
