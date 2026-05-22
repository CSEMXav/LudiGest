import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C8102E",
          borderRadius: "22%",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 120,
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          L
        </span>
      </div>
    ),
    { ...size }
  );
}
