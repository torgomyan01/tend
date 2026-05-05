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
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    });

const bodySchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPE_VALUES),
    companyName: optionalText(200),
    legalForm: z.enum(LEGAL_FORM_VALUES).nullable().optional(),
    taxId: optionalText(20),
    legalAddress: optionalText(500),
    directorName: optionalText(200),
    companyPhone: optionalText(32),
  })
  .superRefine((data, ctx) => {
    if (data.accountType !== "LEGAL_ENTITY") return;
    if (!data.companyName)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyName"],
        message: "Required",
      });
    if (!data.legalForm)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalForm"],
        message: "Required",
      });
    if (!data.taxId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxId"],
        message: "Required",
      });
    if (!data.legalAddress)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legalAddress"],
        message: "Required",
      });
    if (!data.directorName)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["directorName"],
        message: "Required",
      });
  });

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBlocked: true },
  });
  if (!me || me.isBlocked) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const data = parsed.data;
  const isLegal = data.accountType === "LEGAL_ENTITY";

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      accountType: data.accountType,
      companyName: isLegal ? data.companyName : null,
      legalForm: isLegal ? (data.legalForm ?? null) : null,
      taxId: isLegal ? data.taxId : null,
      legalAddress: isLegal ? data.legalAddress : null,
      directorName: isLegal ? data.directorName : null,
      companyPhone: isLegal ? data.companyPhone : null,
    },
    select: {
      accountType: true,
      companyName: true,
      legalForm: true,
      taxId: true,
      legalAddress: true,
      directorName: true,
      companyPhone: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}
