import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServiceCategories } from "@/lib/services-data";

export const dynamic = "force-dynamic";

const interestSchema = z.object({
  category: z.string().trim().min(1).max(160),
  service: z.string().trim().min(1).max(200),
});

const bodySchema = z.object({
  interests: z.array(interestSchema).max(200),
});

async function buildAllowedInterestKeys() {
  const categories = await getServiceCategories();
  const allowed = new Set<string>();
  for (const c of categories) {
    for (const s of c.services) {
      allowed.add(`${c.title}::${s.title}`);
    }
  }
  return allowed;
}

/** Փոխարինել օգտատիրոջ բոլոր նախընտրած ոլորտ/ծառայություն զույգերը (Telegram ծանուցումների համար)։ */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const unique = Array.from(
    new Map(
      parsed.data.interests.map((i) => [
        `${i.category}::${i.service}`,
        i,
      ]),
    ).values(),
  );

  const allowed = await buildAllowedInterestKeys();
  const allValid = unique.every((i) =>
    allowed.has(`${i.category}::${i.service}`),
  );

  if (!allValid) {
    return NextResponse.json({ error: "INVALID_INTERESTS" }, { status: 400 });
  }

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.userInterest.deleteMany({ where: { userId } });
    if (unique.length > 0) {
      await tx.userInterest.createMany({
        data: unique.map((i) => ({
          userId,
          category: i.category,
          service: i.service,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
