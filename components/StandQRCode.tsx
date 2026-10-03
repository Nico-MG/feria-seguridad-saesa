"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type StandQRCodeProps = {
  slug: string;
};

export default function StandQRCode({
  slug,
}: StandQRCodeProps) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(
      `${window.location.origin}/stands/${slug}`
    );
  }, [slug]);

  if (!url) {
    return (
      <div className="flex h-[252px] items-center justify-center">
        <p className="text-sm text-slate-400">
          Generando código QR...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <QRCodeSVG
          value={url}
          size={220}
          level="H"
          includeMargin
        />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Escanea este código para visitar el stand
      </p>

      <p className="mt-2 max-w-xs break-all text-center text-xs text-slate-500">
        {url}
      </p>
    </div>
  );
}