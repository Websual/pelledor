"use client";

import { Printer } from "lucide-react";

export function PrintFlyerButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-6 py-3 bg-anthracite text-white rounded-2xl hover:bg-anthracite/90 font-medium transition-colors"
    >
      <Printer className="h-4 w-4" />
      Imprimer le dépliant (A5)
    </button>
  );
}
