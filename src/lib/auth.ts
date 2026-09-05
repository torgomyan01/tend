import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { isAccountVerified } from "@/lib/account-verification";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  phone: z.string().trim().min(8).max(32),
  password: z.string().min(1),
});

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
const googleEnabled = Boolean(googleClientId && googleClientSecret);

export const isGoogleAuthEnabled = googleEnabled;

async function hydrateTokenFromDb(
  userId: string,
  token: Record<string, unknown>,
) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      name: true,
      phone: true,
      image: true,
      isBlocked: true,
      telegramVerifiedAt: true,
      emailVerified: true,
    },
  });

  if (!dbUser) {
    return token;
  }

  if (dbUser.isBlocked) {
    throw new Error("ACCOUNT_BLOCKED");
  }

  token.role = dbUser.role;
  token.email = dbUser.email;
  token.name = dbUser.name ?? undefined;
  token.picture = dbUser.image ?? undefined;
  token.phone = dbUser.phone ?? undefined;
  token.telegramVerified = Boolean(dbUser.telegramVerifiedAt);
  token.accountVerified = isAccountVerified(dbUser);
  return token;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const phone = parsed.data.phone;
        const { password } = parsed.data;
        const user = await prisma.user.findFirst({
          where: { phone },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            image: true,
            passwordHash: true,
            isVerified: true,
            isBlocked: true,
            role: true,
            telegramVerifiedAt: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        if (!verifyPassword(password, user.passwordHash)) {
          return null;
        }

        if (user.isBlocked) {
          throw new Error("ACCOUNT_BLOCKED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          phone: user.phone ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          telegramVerified: Boolean(user.telegramVerifiedAt),
          accountVerified: isAccountVerified(user),
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Same email as an existing phone/password account → link Google
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.id) {
        return true;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, isBlocked: true, emailVerified: true },
      });

      // New OAuth user may not be written yet — allow; createUser event follows.
      if (dbUser?.isBlocked) {
        return false;
      }

      if (account?.provider === "google") {
        const emailVerified =
          (profile as { email_verified?: boolean } | undefined)
            ?.email_verified !== false;

        if (dbUser && emailVerified && !dbUser.emailVerified) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { emailVerified: new Date() },
          });
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      if (user?.id) {
        token.sub = user.id;
        await hydrateTokenFromDb(user.id, token as Record<string, unknown>);

        // First Google login: mark email verified after adapter created the row
        if (account?.provider === "google" && user.id) {
          await prisma.user.updateMany({
            where: { id: user.id, emailVerified: null },
            data: { emailVerified: new Date() },
          });
          token.accountVerified = true;
        }
      }

      if (trigger === "update" && session) {
        const patch = session as {
          name?: string | null;
          email?: string;
          phone?: string | null;
          image?: string | null;
          removeAvatar?: boolean;
          telegramVerified?: boolean;
          accountVerified?: boolean;
        };
        if ("name" in patch) token.name = patch.name ?? undefined;
        if (patch.email !== undefined) token.email = patch.email;
        if ("phone" in patch) token.phone = patch.phone ?? undefined;
        if (patch.removeAvatar) {
          token.picture = undefined;
        } else if (patch.image !== undefined && patch.image !== null) {
          token.picture = patch.image;
        }
        if (typeof patch.telegramVerified === "boolean") {
          token.telegramVerified = patch.telegramVerified;
        }
        if (typeof patch.accountVerified === "boolean") {
          token.accountVerified = patch.accountVerified;
        }
      }

      // Re-read DB until Telegram is linked (Google users are already accountVerified).
      if (
        token.sub &&
        (!token.role || !token.accountVerified || !token.telegramVerified)
      ) {
        await hydrateTokenFromDb(token.sub, token as Record<string, unknown>);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (session.user && token.role) {
        session.user.role = token.role;
      }

      if (session.user) {
        session.user.email =
          (token.email as string | undefined) ?? session.user.email;
        session.user.name = token.name as string | null | undefined;
        session.user.image = token.picture as string | null | undefined;
        session.user.phone = token.phone as string | null | undefined;
        session.user.telegramVerified = Boolean(token.telegramVerified);
        session.user.accountVerified = Boolean(token.accountVerified);
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Google (and other OAuth) sign-ups get emailTrusted verification by default
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
