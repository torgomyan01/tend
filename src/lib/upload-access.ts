import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Public marketing / profile assets — no auth required. */
const PUBLIC_ROOTS = new Set(["avatars", "tenders", "portfolio", "tender-documents"]);

type AccessResult = { ok: true } | { ok: false; status: 401 | 403 | 404 };

function publicUrlFromParts(parts: string[]) {
  return `/uploads/${parts.join("/")}`;
}

/**
 * Authorize reading a file under /uploads/{root}/...
 * Private roots require a logged-in participant (or staff).
 */
export async function authorizeUploadRead(
  parts: string[],
): Promise<AccessResult> {
  const root = parts[0];
  if (!root) return { ok: false, status: 404 };

  if (PUBLIC_ROOTS.has(root)) {
    return { ok: true };
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, status: 401 };
  }

  const role = session.user.role;
  const isStaff = role === "ADMIN" || role === "MODERATOR";
  const url = publicUrlFromParts(parts);

  if (root === "calls") {
    const callId = parts[1];
    if (!callId) return { ok: false, status: 404 };
    if (isStaff) return { ok: true };
    const call = await prisma.callSession.findUnique({
      where: { id: callId },
      select: { callerId: true, calleeId: true },
    });
    if (!call) return { ok: false, status: 404 };
    if (call.callerId === userId || call.calleeId === userId) {
      return { ok: true };
    }
    return { ok: false, status: 403 };
  }

  if (root === "messages") {
    const conversationId = parts[1];
    if (!conversationId) return { ok: false, status: 404 };
    if (isStaff) return { ok: true };
    const conversation = await prisma.tenderConversation.findUnique({
      where: { id: conversationId },
      select: { clientId: true, providerId: true },
    });
    if (!conversation) return { ok: false, status: 404 };
    if (
      conversation.clientId === userId ||
      conversation.providerId === userId
    ) {
      return { ok: true };
    }
    return { ok: false, status: 403 };
  }

  if (root === "support") {
    if (isStaff) return { ok: true };
    const attachment = await prisma.supportAttachment.findFirst({
      where: { url },
      select: {
        message: {
          select: { conversation: { select: { userId: true } } },
        },
      },
    });
    if (!attachment) return { ok: false, status: 404 };
    if (attachment.message.conversation.userId === userId) {
      return { ok: true };
    }
    return { ok: false, status: 403 };
  }

  if (root === "bids") {
    const bidId = parts[1];
    if (!bidId) return { ok: false, status: 404 };
    if (isStaff) return { ok: true };
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      select: {
        providerId: true,
        tender: { select: { clientId: true } },
      },
    });
    if (!bid) return { ok: false, status: 404 };
    if (bid.providerId === userId || bid.tender.clientId === userId) {
      return { ok: true };
    }
    return { ok: false, status: 403 };
  }

  if (root === "credentials") {
    if (isStaff) return { ok: true };
    const row = await prisma.userCredential.findFirst({
      where: { fileUrl: url },
      select: { userId: true },
    });
    if (!row) return { ok: false, status: 404 };
    if (row.userId === userId) return { ok: true };
    return { ok: false, status: 403 };
  }

  if (root === "verifications") {
    if (isStaff) return { ok: true };
    const row = await prisma.verificationRequest.findFirst({
      where: {
        OR: [{ documentUrl: url }, { selfieUrl: url }],
      },
      select: { userId: true },
    });
    if (!row) return { ok: false, status: 404 };
    if (row.userId === userId) return { ok: true };
    return { ok: false, status: 403 };
  }

  // Unknown root: require login, deny by default for safety.
  return { ok: false, status: 403 };
}
