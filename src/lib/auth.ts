import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  phone: z.string().trim().min(8).max(32),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
        token.phone = user.phone ?? undefined;
      }

      if (trigger === "update" && session) {
        const patch = session as {
          name?: string | null;
          email?: string;
          phone?: string | null;
          image?: string | null;
          removeAvatar?: boolean;
        };
        if ("name" in patch) token.name = patch.name ?? undefined;
        if (patch.email !== undefined) token.email = patch.email;
        if ("phone" in patch) token.phone = patch.phone ?? undefined;
        if (patch.removeAvatar) {
          token.picture = undefined;
        } else if (patch.image !== undefined && patch.image !== null) {
          token.picture = patch.image;
        }
      }

      if (token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
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
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
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

        if (!user.telegramVerifiedAt) {
          throw new Error("TELEGRAM_NOT_VERIFIED");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          phone: user.phone ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
};
