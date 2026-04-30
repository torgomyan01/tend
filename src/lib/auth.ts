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
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (user?.role) {
        token.role = user.role;
      } else if (token.sub && !token.role) {
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
          role: user.role,
        };
      },
    }),
  ],
};
