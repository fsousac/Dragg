import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function GradientOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "50%",
        height: "50%",
        background:
          "radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.18), transparent 60%)",
      }}
    />
  );
}

function Wordmark() {
  return (
    <span
      style={{
        fontSize: 72,
        fontWeight: 700,
        color: "#ffffff",
        letterSpacing: "-2px",
        lineHeight: 1,
      }}
    >
      Dragg
    </span>
  );
}

function Tagline() {
  return (
    <span
      style={{
        fontSize: 28,
        color: "rgba(255, 255, 255, 0.6)",
        marginTop: 24,
        lineHeight: 1.3,
      }}
    >
      Personal Finance Dashboard · Open Source · Free
    </span>
  );
}

function PillBadge() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        right: 80,
        border: "1px solid rgba(255, 255, 255, 0.25)",
        borderRadius: 9999,
        padding: "8px 20px",
        fontSize: 18,
        color: "rgba(255, 255, 255, 0.6)",
      }}
    >
      dragg-finance.vercel.app
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0B0D0E",
          padding: "80px",
          position: "relative",
        }}
      >
        <GradientOverlay />
        <Wordmark />
        <Tagline />
        <PillBadge />
      </div>
    ),
    { ...size },
  );
}
