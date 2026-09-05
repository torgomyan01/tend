import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeBidFee } from "@/lib/bid-fee";
import {
  BID_MAX_DOCUMENTS,
  BID_MAX_DOCUMENT_BYTES,
  BID_MAX_IMAGES,
  BID_MAX_IMAGE_BYTES,
  saveBidDocument,
  saveBidImage,
} from "@/lib/bid-attachment-upload";
import { isAccountVerified } from "@/lib/account-verification";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_IMAGE_TYPES,
  isAllowedDocument,
} from "@/lib/tender-form-upload";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  price: z.number().positive().finite().max(1e14),
  timelineDays: z.number().int().min(1).max(3650),
  coverLetter: z.string().trim().min(30).max(20000),
});

type BidPayload = z.infer<typeof bodySchema>;

async function parseBidRequest(request: Request): Promise<
  | { ok: true; data: BidPayload; images: File[]; documents: File[] }
  | { ok: false; error: string }
> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return { ok: false, error: "INVALID_PAYLOAD" };
    }

    const priceRaw = String(formData.get("price") ?? "").trim();
    const daysRaw = String(formData.get("timelineDays") ?? "").trim();
    const coverLetter = String(formData.get("coverLetter") ?? "");
    const price = Number(priceRaw);
    const timelineDays = Number(daysRaw);

    const parsed = bodySchema.safeParse({
      price,
      timelineDays,
      coverLetter,
    });
    if (!parsed.success) {
      return { ok: false, error: "INVALID_PAYLOAD" };
    }

    const images = formData
      .getAll("images")
      .filter((v): v is File => v instanceof File && v.size > 0);
    const documents = formData
      .getAll("documents")
      .filter((v): v is File => v instanceof File && v.size > 0);

    if (images.length > BID_MAX_IMAGES || documents.length > BID_MAX_DOCUMENTS) {
      return { ok: false, error: "INVALID_PAYLOAD" };
    }

    return { ok: true, data: parsed.data, images, documents };
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_PAYLOAD" };
  }
  return { ok: true, data: parsed.data, images: [], documents: [] };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: tenderId } = await context.params;
  const parsedReq = await parseBidRequest(request);
  if (!parsedReq.ok) {
    return NextResponse.json({ error: parsedReq.error }, { status: 400 });
  }

  const { data: bidFields, images, documents } = parsedReq;
  const providerId = session.user.id;

  for (const file of images) {
    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
      ) ||
      file.size > BID_MAX_IMAGE_BYTES
    ) {
      return NextResponse.json({ error: "INVALID_ATTACHMENT" }, { status: 400 });
    }
  }
  for (const file of documents) {
    if (!isAllowedDocument(file) || file.size > BID_MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: "INVALID_ATTACHMENT" }, { status: 400 });
    }
  }

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

      const price = bidFields.price;

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
          timelineDays: bidFields.timelineDays,
          coverLetter: bidFields.coverLetter,
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

    // Files outside the DB transaction (filesystem I/O)
    const attachmentRows: Array<{
      bidId: string;
      kind: string;
      url: string;
      originalFileName: string;
      mimeType: string | null;
      sizeBytes: number;
      sortOrder: number;
    }> = [];

    try {
      let sort = 0;
      for (const file of images) {
        const saved = await saveBidImage(file, result.bidId);
        attachmentRows.push({
          bidId: result.bidId,
          kind: "IMAGE",
          url: saved.url,
          originalFileName: saved.originalFileName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          sortOrder: sort++,
        });
      }
      for (const file of documents) {
        const saved = await saveBidDocument(file, result.bidId);
        attachmentRows.push({
          bidId: result.bidId,
          kind: "DOCUMENT",
          url: saved.url,
          originalFileName: saved.originalFileName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          sortOrder: sort++,
        });
      }

      if (attachmentRows.length > 0) {
        await prisma.bidAttachment.createMany({ data: attachmentRows });
      }
    } catch (fileError) {
      console.error("[POST /api/tenders/[id]/bids] attachments", fileError);
    }

    return NextResponse.json({
      ok: true,
      bidId: result.bidId,
      feeCharged: result.fee,
      attachmentCount: attachmentRows.length,
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
