import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "PixleLED Studio by Jambh Electricals Interface";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: -2, display: "flex" }}>
          PixleLED <span style={{ color: "#2dd4bf" }}>Studio</span>
        </div>
        <div style={{ fontSize: 28, marginTop: 16, color: "#a1a1aa" }}>by Jambh Electricals</div>
        <div style={{ fontSize: 22, marginTop: 40, color: "#71717a" }}>
          Offline Pixel LED Toran & Matrix Animator
        </div>
      </div>
    ),
    { ...size }
  );
}
