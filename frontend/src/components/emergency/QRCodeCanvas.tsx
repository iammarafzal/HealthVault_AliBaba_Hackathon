"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeCanvasProps {
  healthId: string;
  token?: string;
  size?: number;
  className?: string;
}

/**
 * Renders a dynamic QR code pointing to the token-gated public emergency profile URL.
 * Uses qrcode.react to generate a crisp, high-contrast scannable SVG element.
 */
export default function QRCodeCanvas({
  healthId,
  token,
  size = 120,
  className = "rounded",
}: QRCodeCanvasProps) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const emergencyUrl = token
    ? `${origin}/emergency/${healthId}?token=${token}`
    : `${origin}/emergency/${healthId}`;

  return (
    <QRCodeSVG
      value={emergencyUrl}
      size={size}
      level="M"
      includeMargin={false}
      className={className}
    />
  );
}
