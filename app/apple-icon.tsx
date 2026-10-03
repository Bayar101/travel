import { ImageResponse } from "next/og";

// iOS ignores SVG touch icons. Same design as app/icon.svg scaled to 180px; the
// background is full-bleed because iOS applies its own rounded mask.
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
          background: "#09090b",
        }}
      >
        <div style={{ width: 84, height: 84, borderRadius: 42, background: "#ef4444" }} />
      </div>
    ),
    size,
  );
}
