"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeCanvasProps {
  healthId: string;
  size?: number;
}

/**
 * Renders a dynamic QR code pointing to the public emergency profile URL.
 * Uses qrcode.react to generate a scannable SVG element.
 */
export default function QRCodeCanvas({
  healthId,
  size = 120,
}: QRCodeCanvasProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const emergencyUrl = `${baseUrl}/emergency/${healthId}`;

  return (
    <QRCodeSVG
      value={emergencyUrl}
      size={size}
      level="M"
      includeMargin={false}
      className="rounded"
    />
  );
}
