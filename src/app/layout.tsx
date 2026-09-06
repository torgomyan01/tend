import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { GoogleAnalytics } from "@/components/google-analytics";
import { JsonLd } from "@/components/json-ld";
import { Providers } from "@/components/providers";
import { siteGraph } from "@/lib/seo/json-ld";
import { rootDefaultMetadata } from "@/lib/seo/metadata";
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

export const metadata: Metadata = rootDefaultMetadata();

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
      <head>
        <GoogleAnalytics />
        <JsonLd data={siteGraph()} />
      </head>
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
