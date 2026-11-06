import { ImageResponse } from "next/og";

export const alt = "Contractor Payroll: pay contractors abroad with a locked FX rate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, color: "#F4F2F2", background: "linear-gradient(135deg, #300402 30%, #7a1030)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F63080", display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: "#F6DCD5", display: "flex" }}>Nuvion sandbox example</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2, display: "flex" }}>Contractor Payroll</div>
          <div style={{ fontSize: 42, color: "#F6DCD5", display: "flex" }}>Quote, pay and track contractors abroad</div>
        </div>
        <div style={{ fontSize: 26, color: "#F6DCD5", opacity: 0.8, display: "flex" }}>Sandbox only. No real money moves. Bring your own key.</div>
      </div>
    ),
    size,
  );
}
