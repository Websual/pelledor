"use client";

import { useState } from "react";
import { toggleModuleAction } from "@/app/admin/theme-actions";

type Row = {
  slug: string;
  name: string;
  description: string;
  requiredByBuild: boolean;
  dependsOn: string[];
  enabled: boolean;
};

export function ModuleToggleRow({ module: m }: { module: Row }) {
  const [enabled, setEnabled] = useState(m.enabled);
  const [rebuild, setRebuild] = useState(false);
  const [pending, setPending] = useState(false);

  async function onChange(next: boolean) {
    if (m.requiredByBuild) return;
    setPending(true);
    const r = await toggleModuleAction(m.slug, next);
    setPending(false);
    if (r.ok) {
      setEnabled(next);
      if ("rebuild" in r && r.rebuild) setRebuild(true);
    }
  }

  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-4 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{m.name}</div>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          {m.description}
        </p>
        {m.dependsOn.length > 0 && (
          <p className="mt-1 text-xs text-neutral-500">
            Depend de : {m.dependsOn.join(", ")}
          </p>
        )}
        {rebuild && (
          <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-success)" }}>
            Prefere enregistre : lancez un rebuild pour appliquer.
          </p>
        )}
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          disabled={m.requiredByBuild || pending}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm">
          {m.requiredByBuild ? "Toujours actif" : enabled ? "Actif (au rebuild)" : "Inactif"}
        </span>
      </label>
    </li>
  );
}
