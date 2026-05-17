import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { buildTenderAdminStatusData } from "@/lib/admin-tender-status";
import {
  notifyTenderPublisherAdminMessage,
  notifyTenderPublisherDeleted,
  notifyTenderPublisherStatusChange,
} from "@/lib/tender-publisher-notify";
import { notifyInterestedUsersNewPublishedTender } from "@/lib/tender-sector-subscribers-notify";
import { trySendTelegramMessage } from "@/lib/telegram";
import {
  refundTenderBidsAsCredit,
  type BidFeeRefundReason,
  type RefundedBidInfo,
} from "@/lib/bid-fee-refund";
import {
  notifyProviderBidFeeRefunded,
  REFUND_REASON_LABELS,
} from "@/lib/bid-fee-refund-notify";
import type { Prisma, TenderStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const TENDER_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "REVIEW",
  "AWARDED",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly TenderStatus[];

const approveSchema = z.object({
  action: z.literal("APPROVE"),
  note: z.string().trim().max(800).optional().nullable(),
});

const rejectSchema = z.object({
  action: z.literal("REJECT"),
  note: z.string().trim().max(800).optional().nullable(),
});

const setStatusSchema = z.object({
  action: z.literal("SET_STATUS"),
  status: z.enum(TENDER_STATUSES),
  note: z.string().trim().max(800).optional().nullable(),
});

const updateSchema = z
  .object({
    action: z.literal("UPDATE"),
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().trim().min(1).max(80000).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    service: z.string().trim().min(1).max(120).optional(),
    city: z.union([z.string().trim().max(120), z.literal("")]).optional(),
    budgetMin: z.union([z.number().nonnegative(), z.null()]).optional(),
    budgetMax: z.union([z.number().nonnegative(), z.null()]).optional(),
    status: z.enum(TENDER_STATUSES).optional(),
  })
  .superRefine((data, ctx) => {
    const fields = [
      data.title,
      data.description,
      data.category,
      data.service,
      data.city,
      data.budgetMin,
      data.budgetMax,
      data.status,
    ];
    const count = fields.filter((v) => v !== undefined).length;
    if (count === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EMPTY_UPDATE",
      });
    }
  });

const sendTelegramSchema = z.object({
  action: z.literal("SEND_TELEGRAM"),
  message: z.string().trim().min(1).max(3500),
});

const blockClientSchema = z.object({
  action: z.literal("SET_CLIENT_BLOCKED"),
  blocked: z.boolean(),
});

const patchSchema = z.discriminatedUnion("action", [
  approveSchema,
  rejectSchema,
  setStatusSchema,
  updateSchema,
  sendTelegramSchema,
  blockClientSchema,
]);

async function loadTenderAdmin(id: string) {
  return prisma.tender.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      service: true,
      city: true,
      budgetMin: true,
      budgetMax: true,
      status: true,
      startsAt: true,
      endsAt: true,
      clientId: true,
      client: {
        select: {
          telegramChatId: true,
        },
      },
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    const empty = parsed.error.issues.some((i) => i.message === "EMPTY_UPDATE");
    return NextResponse.json(
      { error: empty ? "EMPTY_UPDATE" : "INVALID_PAYLOAD" },
      { status: 400 },
    );
  }

  const tender = await loadTenderAdmin(id);

  if (!tender) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const publisherUserId = tender.clientId;
  const statusCtx = {
    status: tender.status,
    startsAt: tender.startsAt,
    endsAt: tender.endsAt,
  };

  const payload = parsed.data;

  if (payload.action === "APPROVE" || payload.action === "REJECT") {
    if (tender.status !== "REVIEW") {
      return NextResponse.json({ error: "NOT_IN_REVIEW" }, { status: 409 });
    }

    const prevStatus = tender.status;
    const nextStatus: TenderStatus =
      payload.action === "APPROVE" ? "ACTIVE" : "CANCELLED";

    const data = buildTenderAdminStatusData(statusCtx, nextStatus);

    let refunded: RefundedBidInfo[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.tender.update({
        where: { id: tender.id },
        data,
      });
      if (nextStatus === "CANCELLED") {
        refunded = await refundTenderBidsAsCredit(
          tx,
          tender.id,
          "TENDER_REJECTED",
        );
      }
    });
    await notifyRefundedProviders(refunded, "TENDER_REJECTED");

    await notifyTenderPublisherStatusChange({
      userId: publisherUserId,
      tenderTitle: tender.title,
      tenderId: tender.id,
      previousStatus: prevStatus,
      nextStatus,
      note: payload.note,
    });

    if (nextStatus === "ACTIVE") {
      try {
        await notifyInterestedUsersNewPublishedTender({
          tenderId: tender.id,
          tenderTitle: tender.title,
          publisherUserId: tender.clientId,
        });
      } catch {
        /* ոլորտի բաժանորդների Telegram-ը չպետք է խանգարի մոդերացիայի հաստատմանը */
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "SET_STATUS") {
    if (payload.status === tender.status) {
      return NextResponse.json({ error: "SAME_STATUS" }, { status: 409 });
    }

    const prevStatus = tender.status;
    const data = buildTenderAdminStatusData(statusCtx, payload.status);

    let refunded: RefundedBidInfo[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.tender.update({
        where: { id: tender.id },
        data,
      });
      if (payload.status === "CANCELLED" && prevStatus !== "CANCELLED") {
        refunded = await refundTenderBidsAsCredit(
          tx,
          tender.id,
          "TENDER_CANCELLED",
        );
      }
    });
    await notifyRefundedProviders(refunded, "TENDER_CANCELLED");

    await notifyTenderPublisherStatusChange({
      userId: publisherUserId,
      tenderTitle: tender.title,
      tenderId: tender.id,
      previousStatus: prevStatus,
      nextStatus: payload.status,
      note: payload.note,
    });

    if (payload.status === "ACTIVE" && prevStatus === "REVIEW") {
      try {
        await notifyInterestedUsersNewPublishedTender({
          tenderId: tender.id,
          tenderTitle: tender.title,
          publisherUserId: tender.clientId,
        });
      } catch {
        /* նույնը՝ SET_STATUS REVIEW→ACTIVE */
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "UPDATE") {
    const prevStatus = tender.status;
    const data: Prisma.TenderUpdateInput = {};

    if (payload.title !== undefined) {
      data.title = payload.title;
    }
    if (payload.description !== undefined) {
      data.description = payload.description;
    }
    if (payload.category !== undefined) {
      data.category = payload.category;
    }
    if (payload.service !== undefined) {
      data.service = payload.service;
    }
    if (payload.city !== undefined) {
      data.city = payload.city === "" ? null : payload.city;
    }

    const nextMin =
      payload.budgetMin !== undefined
        ? payload.budgetMin
        : tender.budgetMin !== null
          ? Number(tender.budgetMin)
          : null;
    const nextMax =
      payload.budgetMax !== undefined
        ? payload.budgetMax
        : tender.budgetMax !== null
          ? Number(tender.budgetMax)
          : null;

    if (
      nextMin !== null &&
      nextMax !== null &&
      nextMin > nextMax
    ) {
      return NextResponse.json({ error: "BUDGET_INVALID" }, { status: 400 });
    }

    if (payload.budgetMin !== undefined) {
      data.budgetMin =
        payload.budgetMin === null ? null : payload.budgetMin;
    }
    if (payload.budgetMax !== undefined) {
      data.budgetMax =
        payload.budgetMax === null ? null : payload.budgetMax;
    }

    let statusChanged = false;

    if (payload.status !== undefined && payload.status !== prevStatus) {
      statusChanged = true;
      Object.assign(
        data,
        buildTenderAdminStatusData(statusCtx, payload.status),
      );
    }

    let refunded: RefundedBidInfo[] = [];
    await prisma.$transaction(async (tx) => {
      await tx.tender.update({
        where: { id: tender.id },
        data,
      });
      if (
        statusChanged &&
        payload.status === "CANCELLED" &&
        prevStatus !== "CANCELLED"
      ) {
        refunded = await refundTenderBidsAsCredit(
          tx,
          tender.id,
          "TENDER_CANCELLED",
        );
      }
    });
    if (refunded.length) {
      await notifyRefundedProviders(refunded, "TENDER_CANCELLED");
    }

    if (statusChanged && payload.status !== undefined) {
      await notifyTenderPublisherStatusChange({
        userId: publisherUserId,
        tenderTitle:
          typeof data.title === "string" ? data.title : tender.title,
        tenderId: tender.id,
        previousStatus: prevStatus,
        nextStatus: payload.status,
        note: null,
      });

      if (payload.status === "ACTIVE" && prevStatus === "REVIEW") {
        try {
          await notifyInterestedUsersNewPublishedTender({
            tenderId: tender.id,
            tenderTitle:
              typeof data.title === "string" ? data.title : tender.title,
            publisherUserId: tender.clientId,
          });
        } catch {
          /* UPDATE-ով REVIEW→ACTIVE */
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (payload.action === "SEND_TELEGRAM") {
    const delivered = await notifyTenderPublisherAdminMessage({
      userId: publisherUserId,
      tenderTitle: tender.title,
      body: payload.message,
    });

    return NextResponse.json({ ok: true, delivered });
  }

  if (payload.action === "SET_CLIENT_BLOCKED") {
    if (tender.clientId === session.user.id && payload.blocked) {
      return NextResponse.json({ error: "CANNOT_BLOCK_SELF" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: tender.clientId },
      data: { isBlocked: payload.blocked },
    });

    const clientChatId = tender.client.telegramChatId;
    if (clientChatId) {
      const text = payload.blocked
        ? `<b>Tend.am</b>\nՁեր հաշիվը արգելափակվել է մոդերատորի կողմից։`
        : `<b>Tend.am</b>\nՁեր հաշվի արգելափակումը հանված է։`;
      await trySendTelegramMessage(clientChatId, text);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;

  const tender = await prisma.tender.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      clientId: true,
    },
  });

  if (!tender) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let refunded: RefundedBidInfo[] = [];
  await prisma.$transaction(async (tx) => {
    refunded = await refundTenderBidsAsCredit(
      tx,
      tender.id,
      "TENDER_DELETED",
    );
    await tx.tender.update({
      where: { id: tender.id },
      data: { awardedBidId: null },
    });
    await tx.tender.delete({
      where: { id: tender.id },
    });
  });
  await notifyRefundedProviders(refunded, "TENDER_DELETED");

  await notifyTenderPublisherDeleted({
    userId: tender.clientId,
    tenderTitle: tender.title,
  });

  return NextResponse.json({ ok: true });
}

async function notifyRefundedProviders(
  refunded: RefundedBidInfo[],
  reason: BidFeeRefundReason,
): Promise<void> {
  if (!refunded.length) return;
  const label = REFUND_REASON_LABELS[reason];
  await Promise.all(
    refunded.map((info) =>
      notifyProviderBidFeeRefunded(info, label).catch(() => {
        /* Telegram failures must not block the admin action */
      }),
    ),
  );
}
