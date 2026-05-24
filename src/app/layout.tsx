import type { Metadata } from "next";
import { Geist_Mono, Roboto } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { GoogleAnalytics } from "@/components/google-analytics";
import { Providers } from "@/components/providers";
import { resolvePublicAppOrigin } from "@/lib/absolute-app-url";
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

const siteOrigin = resolvePublicAppOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default:
      "Մրցույթ հայտարարել, առաջարկներ ստանալ, մասնագետ ընտրել | Tend.am",
    template: "%s",
  },
  description:
    "Tend.am — մրցույթների (tender) հարթակ Հայաստանում․ պատվիրատուները հայտարարում են մրցույթ, մասնագետները ուղարկում են առաջարկներ, դուք ընտրում եք լավագույնը։ Ստեղծեք մրցույթ, համեմատեք գներ և աշխատեք վստահելի մասնագետների հետ։",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "hy_AM",
    url: siteOrigin,
    siteName: "Tend.am",
    title:
      "Մրցույթ հայտարարել, առաջարկներ ստանալ, մասնագետ ընտրել | Tend.am",
    description:
      "Հայաստանի մրցույթների հարթակ՝ փակ առաջարկներով, ստուգված մասնագետներով և թափանցիկ ընտրությամբ։",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Մրցույթ հայտարարել, առաջարկներ ստանալ, մասնագետ ընտրել | Tend.am",
    description:
      "Հայաստանի մրցույթների հարթակ՝ փակ առաջարկներով, ստուգված մասնագետներով և թափանցիկ ընտրությամբ։",
  },
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
        <GoogleAnalytics />
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
