"use client";

import { useState } from "react";
import { saveThemeJsonAction } from "@/app/admin/theme-actions";
import type { ThemeTokens } from "@/core/theme/types";
import { AppearanceFormFields } from "./form-fields";
import { ThemePreview } from "./theme-preview";

export function AppearanceWorkspace({ initial }: { initial: ThemeTokens }) {
  const [t, setT] = useState<ThemeTokens>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await saveThemeJsonAction(t);
    setPending(false);
    setSaved(true);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-8">
        <AppearanceFormFields t={t} setT={setT} onChange={() => setSaved(false)} />
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-primary, #171717)" }}
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-700">
              Enregistre. Rechargez pour charger les polices Google dans tout l admin.
            </span>
          )}
        </div>
      </form>
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Apercu live
        </h2>
        <ThemePreview initial={t} />
      </div>
    </div>
  );
}
