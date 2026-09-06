import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NOINDEX_NOFOLLOW } from "@/lib/seo/site";

export const metadata: Metadata = {
  robots: NOINDEX_NOFOLLOW,
  title: "Հաղորդագրություններ",
};

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return children;
}
