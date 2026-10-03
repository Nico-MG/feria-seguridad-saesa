"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white"
    >
      🖨️ Imprimir QR
    </button>
  );
}