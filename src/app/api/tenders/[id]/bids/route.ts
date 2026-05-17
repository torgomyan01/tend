import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeBidFee } from "@/lib/bid-fee";
import { isAccountVerified } from "@/lib/account-verification";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  price: z.number().positive().finite().max(1e14),
  timelineDays: z.number().int().min(1).max(3650),
  coverLetter: z.string().trim().min(30).max(20000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const providerId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tender = await tx.tender.findFirst({
        where: { id: tenderId },
        select: {
          id: true,
          title: true,
          status: true,
          clientId: true,
          category: true,
          startsAt: true,
          endsAt: true,
          budgetMin: true,
          budgetMax: true,
        },
      });

      if (!tender) {
        throw Object.assign(new Error("TENDER_NOT_FOUND"), {
          code: "TENDER_NOT_FOUND" as const,
        });
      }

      if (tender.status !== "ACTIVE") {
        throw Object.assign(new Error("TENDER_CLOSED"), {
          code: "TENDER_CLOSED" as const,
        });
      }

      const now = new Date();
      if (tender.endsAt && tender.endsAt <= now) {
        throw Object.assign(new Error("TENDER_CLOSED"), {
          code: "TENDER_CLOSED" as const,
        });
      }
      if (tender.startsAt && tender.startsAt > now) {
        throw Object.assign(new Error("TENDER_CLOSED"), {
          code: "TENDER_CLOSED" as const,
        });
      }

      if (tender.clientId === providerId) {
        throw Object.assign(new Error("FORBIDDEN_OWNER"), {
          code: "FORBIDDEN_OWNER" as const,
        });
      }

      const provider = await tx.user.findUnique({
        where: { id: providerId },
        select: {
          walletBalance: true,
          isBlocked: true,
          telegramVerifiedAt: true,
          emailVerified: true,
          name: true,
          email: true,
          phone: true,
          accountType: true,
          companyName: true,
          legalForm: true,
          taxId: true,
          legalAddress: true,
          directorName: true,
        },
      });

      if (!provider) {
        throw Object.assign(new Error("NOT_FOUND"), {
          code: "NOT_FOUND" as const,
        });
      }

      if (provider.isBlocked) {
        throw Object.assign(new Error("USER_BLOCKED"), {
          code: "USER_BLOCKED" as const,
        });
      }

      if (!isAccountVerified(provider)) {
        throw Object.assign(new Error("VERIFICATION_REQUIRED"), {
          code: "VERIFICATION_REQUIRED" as const,
        });
      }

      if (
        provider.accountType === "LEGAL_ENTITY" &&
        (!provider.companyName?.trim() ||
          !provider.legalForm ||
          !provider.taxId?.trim() ||
          !provider.legalAddress?.trim() ||
          !provider.directorName?.trim())
      ) {
        throw Object.assign(new Error("COMPANY_PROFILE_REQUIRED"), {
          code: "COMPANY_PROFILE_REQUIRED" as const,
        });
      }

      const existing = await tx.bid.findUnique({
        where: {
          tenderId_providerId: {
            tenderId,
            providerId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        throw Object.assign(new Error("DUPLICATE_BID"), {
          code: "DUPLICATE_BID" as const,
        });
      }

      const fee = computeBidFee({
        budgetMin:
          tender.budgetMin !== null ? Number(tender.budgetMin) : null,
        budgetMax:
          tender.budgetMax !== null ? Number(tender.budgetMax) : null,
        category: tender.category,
        endsAt: tender.endsAt,
      });

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const freeUsedThisMonth = await tx.bid.count({
        where: {
          providerId,
          bidFeeAmount: 0,
          createdAt: { gte: monthStart },
        },
      });
      const freeRemaining = Math.max(2 - freeUsedThisMonth, 0);
      const feeToCharge = freeRemaining > 0 ? 0 : fee;

      if (feeToCharge > 0) {
        const balance = Number(provider.walletBalance);
        if (!Number.isFinite(balance) || balance < feeToCharge) {
          throw Object.assign(new Error("INSUFFICIENT_BALANCE"), {
            code: "INSUFFICIENT_BALANCE" as const,
          });
        }
      }

      const minB =
        tender.budgetMin !== null ? Number(tender.budgetMin) : null;
      const maxB =
        tender.budgetMax !== null ? Number(tender.budgetMax) : null;
      const price = parsed.data.price;

      if (minB !== null && price < minB) {
        throw Object.assign(new Error("PRICE_OUT_OF_RANGE"), {
          code: "PRICE_OUT_OF_RANGE" as const,
        });
      }
      if (maxB !== null && price > maxB) {
        throw Object.assign(new Error("PRICE_OUT_OF_RANGE"), {
          code: "PRICE_OUT_OF_RANGE" as const,
        });
      }

      if (feeToCharge > 0) {
        await tx.user.update({
          where: { id: providerId },
          data: {
            walletBalance: {
              decrement: feeToCharge,
            },
          },
        });
      }

      const bid = await tx.bid.create({
        data: {
          tenderId,
          providerId,
          price,
          timelineDays: parsed.data.timelineDays,
          coverLetter: parsed.data.coverLetter,
          bidFeeAmount: feeToCharge,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (feeToCharge > 0) {
        await tx.transaction.create({
          data: {
            userId: providerId,
            bidId: bid.id,
            type: "BID_FEE",
            status: "SUCCEEDED",
            amount: feeToCharge,
            currency: "AMD",
            description: `Մուտքի վճար՝ մրցույթ «${tender.title.slice(0, 120)}»`,
          },
        });
      }

      return {
        tender,
        provider,
        bidId: bid.id,
        fee: feeToCharge,
      };
    });

    return NextResponse.json({
      ok: true,
      bidId: result.bidId,
      feeCharged: result.fee,
    });
  } catch (error: unknown) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "INSUFFICIENT_BALANCE" },
        { status: 402 },
      );
    }
    if (code === "DUPLICATE_BID") {
      return NextResponse.json({ error: "DUPLICATE_BID" }, { status: 409 });
    }
    if (code === "TENDER_CLOSED") {
      return NextResponse.json({ error: "TENDER_CLOSED" }, { status: 409 });
    }
    if (code === "FORBIDDEN_OWNER") {
      return NextResponse.json({ error: "FORBIDDEN_OWNER" }, { status: 403 });
    }
    if (code === "USER_BLOCKED") {
      return NextResponse.json({ error: "USER_BLOCKED" }, { status: 403 });
    }
    if (code === "VERIFICATION_REQUIRED") {
      return NextResponse.json(
        { error: "VERIFICATION_REQUIRED" },
        { status: 403 },
      );
    }
    if (code === "COMPANY_PROFILE_REQUIRED") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_REQUIRED" },
        { status: 400 },
      );
    }
    if (code === "PRICE_OUT_OF_RANGE") {
      return NextResponse.json(
        { error: "PRICE_OUT_OF_RANGE" },
        { status: 400 },
      );
    }
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (code === "TENDER_NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "DUPLICATE_BID" }, { status: 409 });
    }

    console.error("[POST /api/tenders/[id]/bids]", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
