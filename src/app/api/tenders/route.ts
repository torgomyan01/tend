import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { resolveLocationCityLabel } from "@/lib/locations-data";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 6;
const MIN_IMAGES = 1;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENTS = 5;
const MAX_SERVICES = 5;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
]);

const servicePairSchema = z.object({
  category: z.string().trim().min(1).max(120),
  service: z.string().trim().min(1).max(200),
});

const tenderFieldsSchema = z
  .object({
    title: z.string().trim().min(10).max(200),
    description: z.string().trim().min(200).max(5000),
    address: z.string().trim().max(255).optional().nullable(),
    budgetMin: z.string().optional().nullable(),
    budgetMax: z.string().optional().nullable(),
    durationDays: z.coerce.number().int().min(1).max(90),
    isBlindBidding: z.coerce.boolean(),
    publish: z.coerce.boolean(),
  })
  .superRefine((data, ctx) => {
    const min = data.budgetMin ? Number(data.budgetMin) : null;
    const max = data.budgetMax ? Number(data.budgetMax) : null;
    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMin"],
        message: "Invalid min budget",
      });
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMax"],
        message: "Invalid max budget",
      });
    }
    if (min !== null && max !== null && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMax"],
        message: "Min cannot exceed max",
      });
    }
  });

function parseServicesPayload(raw: unknown):
  | { ok: true; services: z.infer<typeof servicePairSchema>[] }
  | { ok: false; reason: "invalid" | "duplicate" } {
  if (typeof raw !== "string") {
    return { ok: false, reason: "invalid" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const arrayParsed = z.array(servicePairSchema).min(1).max(MAX_SERVICES).safeParse(parsed);
  if (!arrayParsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const services = arrayParsed.data;
  const keys = new Set<string>();
  for (const item of services) {
    const key = `${item.category}::${item.service}`;
    if (keys.has(key)) {
      return { ok: false, reason: "duplicate" };
    }
    keys.add(key);
  }

  return { ok: true, services };
}

function sanitizeImageExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function documentExtension(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
    return ext.slice(1);
  }
  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return mimeMap[file.type] ?? null;
}

function isAllowedDocument(file: File): boolean {
  if (file.type && ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    return true;
  }
  const ext = path.extname(file.name).toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.has(ext);
}

async function saveTenderImage(file: File, tenderId: string) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("INVALID_IMAGE");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("INVALID_IMAGE");
  }

  const extension = sanitizeImageExtension(file.type);
  const fileName = `${tenderId}-${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "tenders");
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, buffer);

  return `/uploads/tenders/${fileName}`;
}

async function saveTenderDocument(file: File, tenderId: string) {
  if (!isAllowedDocument(file)) {
    throw new Error("INVALID_DOCUMENT");
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("INVALID_DOCUMENT");
  }

  const ext = documentExtension(file);
  if (!ext) {
    throw new Error("INVALID_DOCUMENT");
  }

  const safeBase = path.basename(file.name).replace(/[^\w.\u0580-\u0587\u0561-\u0587\s()-]/gi, "_");
  const truncatedName = safeBase.slice(0, 120);
  const fileName = `${tenderId}-doc-${randomUUID()}.${ext}`;
  const directory = path.join(process.cwd(), "public", "uploads", "tender-documents");
  const filePath = path.join(directory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/tender-documents/${fileName}`,
    originalFileName: truncatedName || `document.${ext}`,
    mimeType: file.type || null,
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, telegramVerifiedAt: true, isBlocked: true },
  });

  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (user.isBlocked) {
    return NextResponse.json({ error: "BLOCKED" }, { status: 403 });
  }

  if (!user.telegramVerifiedAt) {
    return NextResponse.json({ error: "TELEGRAM_REQUIRED" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const servicesPayload = parseServicesPayload(formData.get("services"));
  if (!servicesPayload.ok) {
    const status =
      servicesPayload.reason === "duplicate" ? "DUPLICATE_SERVICE" : "INVALID_SERVICES";
    return NextResponse.json({ error: status }, { status: 400 });
  }

  const services = servicesPayload.services;

  const parsed = tenderFieldsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    address: formData.get("address"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
    durationDays: formData.get("durationDays"),
    isBlindBidding: formData.get("isBlindBidding"),
    publish: formData.get("publish"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const locationIdParsed = z.coerce.number().int().positive().safeParse(
    formData.get("locationId"),
  );
  if (!locationIdParsed.success) {
    return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
  }

  const resolvedCity = await resolveLocationCityLabel(locationIdParsed.data);
  if (!resolvedCity) {
    return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });
  }

  const data = parsed.data;
  const imageEntries = formData.getAll("images");
  const imageFiles = imageEntries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: "TOO_MANY_IMAGES" }, { status: 400 });
  }

  if (imageFiles.length < MIN_IMAGES) {
    return NextResponse.json({ error: "TOO_FEW_IMAGES" }, { status: 400 });
  }

  for (const file of imageFiles) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
  }

  const documentEntries = formData.getAll("documents");
  const documentFiles = documentEntries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (documentFiles.length > MAX_DOCUMENTS) {
    return NextResponse.json({ error: "TOO_MANY_DOCUMENTS" }, { status: 400 });
  }

  for (const file of documentFiles) {
    if (!isAllowedDocument(file)) {
      return NextResponse.json({ error: "INVALID_DOCUMENT" }, { status: 400 });
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json({ error: "INVALID_DOCUMENT" }, { status: 400 });
    }
    if (!documentExtension(file)) {
      return NextResponse.json({ error: "INVALID_DOCUMENT" }, { status: 400 });
    }
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

  const primary = services[0];

  try {
    const tenderId = randomUUID();

    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      const url = await saveTenderImage(file, tenderId);
      imageUrls.push(url);
    }

    const savedDocs: Array<{
      url: string;
      originalFileName: string;
      mimeType: string | null;
    }> = [];
    for (const file of documentFiles) {
      savedDocs.push(await saveTenderDocument(file, tenderId));
    }

    const tender = await prisma.tender.create({
      data: {
        id: tenderId,
        clientId: user.id,
        title: data.title,
        description: data.description,
        category: primary.category,
        service: primary.service,
        city: resolvedCity,
        locationId: locationIdParsed.data,
        address: data.address || null,
        budgetMin: data.budgetMin ? data.budgetMin : null,
        budgetMax: data.budgetMax ? data.budgetMax : null,
        status: data.publish ? "ACTIVE" : "DRAFT",
        isBlindBidding: data.isBlindBidding,
        startsAt: data.publish ? now : null,
        endsAt: data.publish ? endsAt : null,
        selectedServices: {
          create: services.map((entry, index) => ({
            category: entry.category,
            service: entry.service,
            sortOrder: index,
          })),
        },
        images: {
          create: imageUrls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
        documents:
          savedDocs.length > 0
            ? {
                create: savedDocs.map((doc, index) => ({
                  url: doc.url,
                  originalFileName: doc.originalFileName,
                  mimeType: doc.mimeType,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        status: true,
        title: true,
      },
    });

    return NextResponse.json({ tender });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE") {
      return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_DOCUMENT") {
      return NextResponse.json({ error: "INVALID_DOCUMENT" }, { status: 400 });
    }

    console.error("Failed to create tender", error);
    return NextResponse.json({ error: "TENDER_CREATE_FAILED" }, { status: 500 });
  }
}
