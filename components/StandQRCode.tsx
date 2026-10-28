"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

type StandQRCodeProps = {
  slug: string;
};

const subscribeToLocation = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export default function StandQRCode({ slug }: StandQRCodeProps) {
  const origin = useSyncExternalStore(
    subscribeToLocation,
    getOrigin,
    getServerOrigin,
  );
  const url = origin
    ? `${origin}/concurso?stand=${encodeURIComponent(slug)}`
    : "";

  if (!url) {
    return (
      <div className="flex h-[252px] items-center justify-center">
        <p className="text-sm text-slate-400">Generando código QR...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="qr-code-surface rounded-2xl p-4 shadow-sm ring-1 ring-slate-200">
        <QRCodeSVG value={url} size={220} level="H" includeMargin />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Escanea este código para registrar tu visita en el concurso
      </p>

      <p className="mt-2 max-w-xs break-all text-center text-xs text-slate-500">
        {url}
      </p>
    </div>
  );
}
