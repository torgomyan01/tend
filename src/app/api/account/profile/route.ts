import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import {
  ACCOUNT_TYPE_VALUES,
  LEGAL_FORM_VALUES,
} from "@/lib/account-type";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined || value === null) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });

const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Անունը առնվազն 2 նիշ պետք է լինի").max(120),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(8).max(32),
    bio: optionalText(2000),
    accountType: z.enum(ACCOUNT_TYPE_VALUES).optional(),
    companyName: optionalText(200),
    legalForm: z
      .enum(LEGAL_FORM_VALUES)
      .nullable()
      .optional()
      .transform((value) => (value === null ? null : value)),
    taxId: optionalText(20),
    legalAddress: optionalText(500),
    directorName: optionalText(200),
    companyPhone: optionalText(32),
  })
  .superRefine((data, ctx) => {
    if (data.accountType !== "LEGAL_ENTITY") return;
    const required: Array<["companyName" | "legalForm" | "taxId" | "legalAddress" | "directorName", string]> = [
      ["companyName", "Ընկերության անվանումը պարտադիր է"],
      ["legalForm", "Իրավաբանական ձևը պարտադիր է"],
      ["taxId", "ՀՎՀՀ-ն պարտադիր է"],
      ["legalAddress", "Իրավաբանական հասցեն պարտադիր է"],
      ["directorName", "Տնօրենի անունը պարտադիր է"],
    ];
    for (const [field, message] of required) {
      const value = data[field];
      if (value === undefined || value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message,
        });
      }
    }
  });

async function ensureAccountUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isBlocked: true },
  });
  if (!user || user.isBlocked) {
    return null;
  }
  return user;
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const ok = await ensureAccountUser(session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();
  const phone = parsed.data.phone.trim();

  const conflict = await prisma.user.findFirst({
    where: {
      NOT: { id: session.user.id },
      OR: [{ email: normalizedEmail }, { phone }],
    },
    select: { id: true },
  });

  if (conflict) {
    return NextResponse.json({ error: "EMAIL_OR_PHONE_TAKEN" }, { status: 409 });
  }

  const data = parsed.data;
  const updateData: {
    name: string;
    email: string;
    phone: string;
    bio?: string | null;
    accountType?: "INDIVIDUAL" | "LEGAL_ENTITY";
    companyName?: string | null;
    legalForm?: "SP" | "LLC" | "CJSC" | "JSC" | "NGO" | "OTHER" | null;
    taxId?: string | null;
    legalAddress?: string | null;
    directorName?: string | null;
    companyPhone?: string | null;
  } = {
    name: data.name.trim(),
    email: normalizedEmail,
    phone,
  };
  if (data.bio !== undefined) {
    updateData.bio = data.bio;
  }

  if (data.accountType !== undefined) {
    updateData.accountType = data.accountType;
    if (data.accountType === "INDIVIDUAL") {
      // Անցնելով ֆիզիկական անձի՝ դատարկում ենք ընկերության դաշտերը։
      updateData.companyName = null;
      updateData.legalForm = null;
      updateData.taxId = null;
      updateData.legalAddress = null;
      updateData.directorName = null;
      updateData.companyPhone = null;
    } else {
      updateData.companyName = data.companyName ?? null;
      updateData.legalForm = data.legalForm ?? null;
      updateData.taxId = data.taxId ?? null;
      updateData.legalAddress = data.legalAddress ?? null;
      updateData.directorName = data.directorName ?? null;
      updateData.companyPhone = data.companyPhone ?? null;
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      name: true,
      email: true,
      phone: true,
      image: true,
      bio: true,
      accountType: true,
      companyName: true,
      legalForm: true,
      taxId: true,
      legalAddress: true,
      directorName: true,
      companyPhone: true,
    },
  });

  return NextResponse.json({
    ok: true,
    user: updated,
  });
}
