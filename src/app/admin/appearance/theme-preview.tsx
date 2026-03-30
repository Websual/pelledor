"use client";

import type { ThemeTokens } from "@/core/theme/types";
import { tokensToCssVariables } from "@/core/theme/types";
import { useMemo } from "react";

export function ThemePreview({ initial }: { initial: ThemeTokens }) {
  const css = useMemo(
    () => `:root { ${tokensToCssVariables(initial)} }`,
    [initial]
  );
  return (
    <div
      className="rounded-lg border p-6 shadow-sm"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-background)",
        color: "var(--color-foreground)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <h4
        className="text-lg font-semibold"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Apercu theme
      </h4>
      <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
        Boutons, champs et carte utilisent les variables du formulaire.
      </p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        style={{ gap: "calc(var(--space-base) * 4)" }}
      >
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium transition-opacity"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
            borderRadius: "var(--radius-md)",
            opacity: "var(--hover-opacity)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = String(initial.interactive.hoverOpacity);
          }}
        >
          Primaire
        </button>
        <button
          type="button"
          className="border px-4 py-2 text-sm"
          style={{
            borderColor: "var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Secondaire
        </button>
        <button
          type="button"
          disabled
          className="px-4 py-2 text-sm opacity-50"
          style={{
            opacity: initial.interactive.disabledOpacity,
            borderRadius: "var(--radius-sm)",
          }}
        >
          Desactive
        </button>
      </div>
      <input
        type="text"
        placeholder="Champ texte"
        className="mt-4 w-full border px-3 py-2 text-sm outline-none"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: `0 0 0 var(--focus-ring-width) transparent`,
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = `0 0 0 var(--focus-ring-width) var(--focus-ring)`;
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = "0 0 0 var(--focus-ring-width) transparent";
        }}
      />
      <div
        className="mt-4 border p-4 text-sm"
        style={{
          borderColor: "var(--color-border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        Carte : bordure et rayon <strong>lg</strong>.
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--color-success)" }}>
        Succes
      </p>
      <p className="text-xs" style={{ color: "var(--color-error)" }}>
        Message erreur
      </p>
    </div>
  );
}
