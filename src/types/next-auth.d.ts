import { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      /** Հեռախոս՝ մուտքի համար (նույն ֆորմատով, ինչ գրանցմանը)։ */
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    phone?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    phone?: string | null;
  }
}
