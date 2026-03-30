"use client";

import type { ThemeTokens } from "@/core/theme/types";

const FONT_PRESETS = [
  { label: "Systeme", sans: "ui-sans-serif, system-ui, sans-serif", heading: "ui-sans-serif, system-ui, sans-serif" },
  { label: "DM Sans + Fraunces", sans: '"DM Sans", ui-sans-serif, sans-serif', heading: '"Fraunces", ui-serif, serif' },
  { label: "Source Sans + Source Serif", sans: '"Source Sans 3", ui-sans-serif, sans-serif', heading: '"Source Serif 4", ui-serif, serif' },
  { label: "Inter", sans: '"Inter", ui-sans-serif, sans-serif', heading: '"Inter", ui-sans-serif, sans-serif' },
];

export function AppearanceFormFields({
  t,
  setT,
  onChange,
}: {
  t: ThemeTokens;
  setT: React.Dispatch<React.SetStateAction<ThemeTokens>>;
  onChange: () => void;
}) {
  function patch<K extends keyof ThemeTokens>(key: K, val: ThemeTokens[K]) {
    setT((prev) => ({ ...prev, [key]: val }));
    onChange();
  }

  return (
    <>
      <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--color-border, #e5e5e5)" }}>
        <h3 className="text-sm font-semibold">Palette</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["primary", "Primaire"],
              ["primaryForeground", "Texte sur primaire"],
              ["background", "Fond page"],
              ["foreground", "Texte principal"],
              ["muted", "Texte secondaire"],
              ["border", "Bordures"],
              ["success", "Succes"],
              ["error", "Erreur"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <span className="w-36 shrink-0 text-neutral-600">{label}</span>
              <input
                type="color"
                value={t.colors[key].startsWith("#") ? t.colors[key] : "#000000"}
                onChange={(e) =>
                  patch("colors", { ...t.colors, [key]: e.target.value })
                }
                className="h-9 w-14 cursor-pointer rounded border p-0"
              />
              <input
                type="text"
                value={t.colors[key]}
                onChange={(e) =>
                  patch("colors", { ...t.colors, [key]: e.target.value })
                }
                className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--color-border, #e5e5e5)" }}>
        <h3 className="text-sm font-semibold">Typographie</h3>
        <label className="mt-3 block text-sm">
          Presets
          <select
            className="mt-1 w-full rounded border px-2 py-2"
            onChange={(e) => {
              const i = Number(e.target.value);
              const p = FONT_PRESETS[i];
              if (p) patch("fonts", { sans: p.sans, heading: p.heading });
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Choisir…
            </option>
            {FONT_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          Police UI
          <input
            className="mt-1 w-full rounded border px-2 py-2 font-mono text-xs"
            value={t.fonts.sans}
            onChange={(e) => patch("fonts", { ...t.fonts, sans: e.target.value })}
          />
        </label>
        <label className="mt-3 block text-sm">
          Titres
          <input
            className="mt-1 w-full rounded border px-2 py-2 font-mono text-xs"
            value={t.fonts.heading}
            onChange={(e) =>
              patch("fonts", { ...t.fonts, heading: e.target.value })
            }
          />
        </label>
      </section>

      <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--color-border, #e5e5e5)" }}>
        <h3 className="text-sm font-semibold">Espacement</h3>
        <label className="mt-3 block text-sm">
          Base (rem)
          <input
            type="number"
            step={0.05}
            min={0.1}
            max={1}
            className="mt-1 w-full rounded border px-2 py-2"
            value={t.spacing.baseRem}
            onChange={(e) =>
              patch("spacing", {
                ...t.spacing,
                baseRem: Number(e.target.value) || 0.25,
              })
            }
          />
        </label>
        <label className="mt-3 block text-sm">
          Echelle
          <input
            type="number"
            step={0.05}
            min={1}
            max={2}
            className="mt-1 w-full rounded border px-2 py-2"
            value={t.spacing.scale}
            onChange={(e) =>
              patch("spacing", {
                ...t.spacing,
                scale: Number(e.target.value) || 1.25,
              })
            }
          />
        </label>
      </section>

      <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--color-border, #e5e5e5)" }}>
        <h3 className="text-sm font-semibold">Rayons</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(["sm", "md", "lg"] as const).map((k) => (
            <label key={k} className="block text-sm">
              {k.toUpperCase()}
              <input
                className="mt-1 w-full rounded border px-2 py-2 font-mono text-xs"
                value={t.radius[k]}
                onChange={(e) =>
                  patch("radius", { ...t.radius, [k]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4" style={{ borderColor: "var(--color-border, #e5e5e5)" }}>
        <h3 className="text-sm font-semibold">Interactif</h3>
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          Focus ring
          <input
            type="color"
            value={
              /^#[0-9A-Fa-f]{6}$/.test(t.interactive.focusRing)
                ? t.interactive.focusRing
                : "#3b82f6"
            }
            onChange={(e) =>
              patch("interactive", {
                ...t.interactive,
                focusRing: e.target.value,
              })
            }
            className="h-9 w-14 cursor-pointer rounded border p-0"
          />
          <input
            className="min-w-[8rem] flex-1 rounded border px-2 py-1 font-mono text-xs"
            value={t.interactive.focusRing}
            onChange={(e) =>
              patch("interactive", {
                ...t.interactive,
                focusRing: e.target.value,
              })
            }
          />
        </label>
        <label className="mt-3 block text-sm">
          Epaisseur
          <input
            className="mt-1 w-full rounded border px-2 py-2"
            value={t.interactive.focusRingWidth}
            onChange={(e) =>
              patch("interactive", {
                ...t.interactive,
                focusRingWidth: e.target.value,
              })
            }
          />
        </label>
        <label className="mt-3 block text-sm">
          Opacite hover
          <input
            type="number"
            step={0.02}
            min={0.5}
            max={1}
            className="mt-1 w-full rounded border px-2 py-2"
            value={t.interactive.hoverOpacity}
            onChange={(e) =>
              patch("interactive", {
                ...t.interactive,
                hoverOpacity: Number(e.target.value) || 0.92,
              })
            }
          />
        </label>
        <label className="mt-3 block text-sm">
          Opacite disabled
          <input
            type="number"
            step={0.05}
            min={0.2}
            max={1}
            className="mt-1 w-full rounded border px-2 py-2"
            value={t.interactive.disabledOpacity}
            onChange={(e) =>
              patch("interactive", {
                ...t.interactive,
                disabledOpacity: Number(e.target.value) || 0.5,
              })
            }
          />
        </label>
      </section>
    </>
  );
}
