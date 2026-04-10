import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#1C1410",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Outer gold ring */}
        <div
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "2px solid rgba(201,162,74,0.35)",
            display: "flex",
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "1px solid rgba(201,162,74,0.2)",
            display: "flex",
          }}
        />

        {/* North point */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderBottom: "70px solid #C9A24A",
            display: "flex",
          }}
        />
        {/* South point */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "14px solid transparent",
            borderRight: "14px solid transparent",
            borderTop: "70px solid #C9A24A",
            display: "flex",
          }}
        />
        {/* East point */}
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "14px solid transparent",
            borderBottom: "14px solid transparent",
            borderLeft: "70px solid #C9A24A",
            display: "flex",
          }}
        />
        {/* West point */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 0,
            height: 0,
            borderTop: "14px solid transparent",
            borderBottom: "14px solid transparent",
            borderRight: "70px solid #C9A24A",
            display: "flex",
          }}
        />

        {/* Center circle — gold */}
        <div
          style={{
            position: "absolute",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#C9A24A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Inner dark dot */}
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#1C1410",
              display: "flex",
            }}
          />
        </div>

        {/* NE diagonal point */}
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 28,
            width: 20,
            height: 20,
            background: "#C9A24A",
            opacity: 0.55,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        {/* NW diagonal point */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            width: 20,
            height: 20,
            background: "#C9A24A",
            opacity: 0.55,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        {/* SE diagonal point */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 28,
            width: 20,
            height: 20,
            background: "#C9A24A",
            opacity: 0.55,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        {/* SW diagonal point */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 28,
            width: 20,
            height: 20,
            background: "#C9A24A",
            opacity: 0.55,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
