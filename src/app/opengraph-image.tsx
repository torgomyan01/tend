import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tend.am — մրցույթների հարթակ Հայաստանում";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #78350f 100%)",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#fbbf24",
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Tend.am
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#fff7ed",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            Մրցույթներ Հայաստանում
          </div>
          <div
            style={{
              color: "#fde68a",
              fontSize: 28,
              fontWeight: 600,
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            Հայտարարեք մրցույթ, ստացեք առաջարկներ, ընտրեք լավագույն մասնագետին։
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#cbd5e1",
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          tend.am
        </div>
      </div>
    ),
    { ...size },
  );
}
