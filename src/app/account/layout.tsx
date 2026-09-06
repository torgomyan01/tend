import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/site";

export const metadata: Metadata = {
  robots: NOINDEX_NOFOLLOW,
  title: "Հաշիվ",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
