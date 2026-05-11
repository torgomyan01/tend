import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  normalizeTitleDescription,
  parseDraftWizardStep,
  parseStringIdArray,
  tenderNumericFieldsSchema,
} from "@/lib/tender-form-fields";
import { resolveLocationCityLabel } from "@/lib/locations-data";
import { prisma } from "@/lib/prisma";
import { parseServicesPayload } from "@/lib/tender-form-services";
import {
  ALLOWED_IMAGE_TYPES,
  documentExtension,
  isAllowedDocument,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  MIN_IMAGES_PUBLISH,
  saveTenderDocument,
  saveTenderImage,
} from "@/lib/tender-form-upload";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id: tenderId } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      telegramVerifiedAt: true,
      isBlocked: true,
      accountType: true,
      companyName: true,
      legalForm: true,
      taxId: true,
      legalAddress: true,
      directorName: true,
    },
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

  if (
    user.accountType === "LEGAL_ENTITY" &&
    (!user.companyName?.trim() ||
      !user.legalForm ||
      !user.taxId?.trim() ||
      !user.legalAddress?.trim() ||
      !user.directorName?.trim())
  ) {
    return NextResponse.json(
      { error: "COMPANY_PROFILE_REQUIRED" },
      { status: 400 },
    );
  }

  const existing = await prisma.tender.findFirst({
    where: { id: tenderId, clientId: user.id, status: "DRAFT" },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND_OR_NOT_EDITABLE" }, { status: 404 });
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

  const parsed = tenderNumericFieldsSchema.safeParse({
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
  const data = parsed.data;

  const normalized = normalizeTitleDescription(
    String(formData.get("title") ?? ""),
    String(formData.get("description") ?? ""),
    data.publish,
  );
  if (!normalized.ok) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const draftWizardStep = parseDraftWizardStep(formData.get("draftWizardStep"));

  let locationId: number | null = null;
  let resolvedCity: string | null = null;

  if (data.publish) {
    const locationIdParsed = z.coerce.number().int().positive().safeParse(
      formData.get("locationId"),
    );
    if (!locationIdParsed.success) {
      return NextResponse.json({ error: "LOCATION_REQUIRED" }, { status: 400 });
    }
    resolvedCity = await resolveLocationCityLabel(locationIdParsed.data);
    if (!resolvedCity) {
      return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });
    }
    locationId = locationIdParsed.data;
  } else {
    const locRaw = formData.get("locationId");
    if (locRaw !== null && locRaw !== undefined && String(locRaw).trim() !== "") {
      const locationIdParsed = z.coerce.number().int().positive().safeParse(locRaw);
      if (locationIdParsed.success) {
        resolvedCity = await resolveLocationCityLabel(locationIdParsed.data);
        if (!resolvedCity) {
          return NextResponse.json({ error: "INVALID_LOCATION" }, { status: 400 });
        }
        locationId = locationIdParsed.data;
      }
    }
  }

  const keepImageIds = parseStringIdArray(formData.get("keepImageIds"));
  const keepDocumentIds = parseStringIdArray(formData.get("keepDocumentIds"));
  if (keepImageIds === null || keepDocumentIds === null) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  const [existingImages, existingDocs] = await Promise.all([
    prisma.tenderImage.findMany({
      where: { tenderId },
      select: { id: true },
    }),
    prisma.tenderDocument.findMany({
      where: { tenderId },
      select: { id: true },
    }),
  ]);

  const imageSet = new Set(existingImages.map((row) => row.id));
  for (const id of keepImageIds) {
    if (!imageSet.has(id)) {
      return NextResponse.json({ error: "INVALID_IMAGE_REFERENCE" }, { status: 400 });
    }
  }

  const docSet = new Set(existingDocs.map((row) => row.id));
  for (const id of keepDocumentIds) {
    if (!docSet.has(id)) {
      return NextResponse.json({ error: "INVALID_DOCUMENT_REFERENCE" }, { status: 400 });
    }
  }

  const imageEntries = formData.getAll("images");
  const imageFiles = imageEntries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: "TOO_MANY_IMAGES" }, { status: 400 });
  }

  if (keepImageIds.length + imageFiles.length > MAX_IMAGES) {
    return NextResponse.json({ error: "TOO_MANY_IMAGES" }, { status: 400 });
  }

  if (
    data.publish &&
    keepImageIds.length + imageFiles.length < MIN_IMAGES_PUBLISH
  ) {
    return NextResponse.json({ error: "TOO_FEW_IMAGES" }, { status: 400 });
  }

  for (const file of imageFiles) {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
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

  if (keepDocumentIds.length + documentFiles.length > MAX_DOCUMENTS) {
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
    await prisma.$transaction(async (tx) => {
      await tx.tenderImage.deleteMany({
        where: { tenderId, id: { notIn: keepImageIds } },
      });
      await tx.tenderDocument.deleteMany({
        where: { tenderId, id: { notIn: keepDocumentIds } },
      });

      for (let i = 0; i < keepImageIds.length; i += 1) {
        await tx.tenderImage.update({
          where: { id: keepImageIds[i] },
          data: { sortOrder: i },
        });
      }

      const newImageUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await saveTenderImage(file, tenderId);
        newImageUrls.push(url);
      }
      const baseSort = keepImageIds.length;
      for (let i = 0; i < newImageUrls.length; i += 1) {
        await tx.tenderImage.create({
          data: {
            tenderId,
            url: newImageUrls[i],
            sortOrder: baseSort + i,
          },
        });
      }

      for (let i = 0; i < keepDocumentIds.length; i += 1) {
        await tx.tenderDocument.update({
          where: { id: keepDocumentIds[i] },
          data: { sortOrder: i },
        });
      }

      const savedDocs: Array<{
        url: string;
        originalFileName: string;
        mimeType: string | null;
      }> = [];
      for (const file of documentFiles) {
        savedDocs.push(await saveTenderDocument(file, tenderId));
      }
      const docBase = keepDocumentIds.length;
      for (let i = 0; i < savedDocs.length; i += 1) {
        const doc = savedDocs[i];
        await tx.tenderDocument.create({
          data: {
            tenderId,
            url: doc.url,
            originalFileName: doc.originalFileName,
            mimeType: doc.mimeType,
            sortOrder: docBase + i,
          },
        });
      }

      await tx.tenderSelectedService.deleteMany({ where: { tenderId } });
      await tx.tenderSelectedService.createMany({
        data: services.map((entry, index) => ({
          tenderId,
          category: entry.category,
          service: entry.service,
          sortOrder: index,
        })),
      });

      await tx.tender.update({
        where: { id: tenderId },
        data: {
          title: normalized.title,
          description: normalized.description,
          category: primary.category,
          service: primary.service,
          city: resolvedCity,
          locationId,
          address: data.address || null,
          budgetMin: data.budgetMin ? data.budgetMin : null,
          budgetMax: data.budgetMax ? data.budgetMax : null,
          isBlindBidding: data.isBlindBidding,
          status: data.publish ? "REVIEW" : "DRAFT",
          startsAt: null,
          endsAt: data.publish ? endsAt : null,
          draftWizardStep: data.publish ? null : draftWizardStep,
          draftDurationDays: data.publish ? null : data.durationDays,
        },
      });
    });

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      select: {
        id: true,
        status: true,
        title: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, url: true },
        },
        documents: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, url: true, originalFileName: true },
        },
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
    console.error("Failed to update tender draft", error);
    return NextResponse.json({ error: "TENDER_UPDATE_FAILED" }, { status: 500 });
  }
}
