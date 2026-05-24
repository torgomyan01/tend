const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-MSS61328CW";

function shouldLoadGoogleAnalytics(): boolean {
  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID === "") {
    return false;
  }
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.VERCEL_ENV === "preview"
  ) {
    return true;
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  return appUrl.includes("tend.am") && !appUrl.includes("localhost");
}

const gtagInitScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');
`.trim();

/**
 * Google tag (gtag.js) — root layout <head>-ում, SSR HTML-ում,
 * որ Google Tag Assistant-ը տեսնի view-source-ում։
 */
export function GoogleAnalytics() {
  if (!shouldLoadGoogleAnalytics()) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script dangerouslySetInnerHTML={{ __html: gtagInitScript }} />
    </>
  );
}
