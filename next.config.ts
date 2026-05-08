import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Անջատում ենք dev պատուհանները (նշույլի / segment explorer)—նվազեցնում է dev-ում երբեմնի RSC-manifest / webpack glitch-ները։ */
  devIndicators: false,
};

export default nextConfig;
