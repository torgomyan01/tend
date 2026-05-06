import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tend.am | Private Tender Platform",
  description:
    "Tend.am-ը Հայաստանի private tender հարթակն է պատվիրատուների և մասնագետների համար։",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hy"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <NextTopLoader
          color="#f59e0b"
          height={3}
          showSpinner={false}
          shadow="0 0 12px rgba(245, 158, 11, 0.45)"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
