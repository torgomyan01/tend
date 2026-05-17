import { absoluteAppUrl } from "@/lib/absolute-app-url";
import { notifyUserById } from "@/lib/notifications/notify-user";
import { NOTIFICATION_KINDS } from "@/lib/notifications/in-app";
import { ROUTES } from "@/lib/routes";
import { escapeTelegramHtml } from "@/lib/telegram";

export async function notifyTenderComplaintReporterDecision(params: {
  userId: string;
  tenderTitle: string;
  tenderId: string;
  decision: "REVIEWED" | "DISMISSED";
  note?: string | null;
}) {
  const title = escapeTelegramHtml(params.tenderTitle);

  let text =
    params.decision === "REVIEWED"
      ? `<b>Tend.am</b>\nՁեր բողոքը մոդերատորի կողմից նշված է որպես <b>դիտարկված</b>։\n\n<b>${title}</b>`
      : `<b>Tend.am</b>\nՁեր բողոքը մերժվել է մոդերատորի կողմից։\n\n<b>${title}</b>`;

  if (params.note?.trim()) {
    text += `\n\n<i>Մոդերատորի նշում՝</i> ${escapeTelegramHtml(params.note.trim())}`;
  }

  const tenderPath = ROUTES.tenderDetail(params.tenderId);
  const url = absoluteAppUrl(tenderPath);
  if (url) {
    text += `\n\n<a href="${escapeTelegramHtml(url)}">Բացել մրցույթը</a>`;
  }

  const approved = params.decision === "REVIEWED";
  const subject = approved
    ? `Բողոքը դիտարկված է՝ ${params.tenderTitle}`
    : `Բողոքը մերժված է՝ ${params.tenderTitle}`;

  await notifyUserById(params.userId, {
    telegramText: text,
    emailSubject: subject,
    emailTitle: "Բողոքի վերաբերյալ որոշում",
    ctaLabel: "Բացել մրցույթը",
    ctaUrl: url || undefined,
    inApp: {
      category: approved ? "APPROVED" : "REJECTED",
      kind: NOTIFICATION_KINDS.COMPLAINT_DECISION,
      title: approved ? "Բողոքը դիտարկված է" : "Բողոքը մերժված է",
      body: [
        `«${params.tenderTitle}»`,
        params.note?.trim() ? `Նշում՝ ${params.note.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      href: tenderPath,
      tenderId: params.tenderId,
    },
  });
}
