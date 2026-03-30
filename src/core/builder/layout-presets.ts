/**
 * Préréglages de colonnes (grille 12, type WPBakery).
 * La somme des spans doit être ≤ 12.
 */

export type ColumnPreset = {
  id: string;
  label: string;
  /** Parts sur 12 pour chaque colonne */
  spans: number[];
};

export const COLUMN_PRESETS: ColumnPreset[] = [
  { id: "12", label: "Pleine largeur", spans: [12] },
  { id: "6-6", label: "1/2 + 1/2", spans: [6, 6] },
  { id: "4-4-4", label: "3 × 1/3", spans: [4, 4, 4] },
  { id: "3-3-3-3", label: "4 × 1/4", spans: [3, 3, 3, 3] },
  { id: "8-4", label: "2/3 + 1/3", spans: [8, 4] },
  { id: "4-8", label: "1/3 + 2/3", spans: [4, 8] },
  { id: "9-3", label: "3/4 + 1/4", spans: [9, 3] },
  { id: "3-9", label: "1/4 + 3/4", spans: [3, 9] },
  { id: "3-6-3", label: "1/4 + 1/2 + 1/4", spans: [3, 6, 3] },
  { id: "2-2-2-2-2-2", label: "6 × 1/6", spans: [2, 2, 2, 2, 2, 2] },
];

export function validateSpans(spans: number[]): string | null {
  if (!spans.length) return "Au moins une colonne";
  if (spans.some((s) => !Number.isInteger(s) || s < 1 || s > 12)) {
    return "Chaque colonne doit être entre 1 et 12";
  }
  const sum = spans.reduce((a, b) => a + b, 0);
  if (sum > 12) return `Somme des colonnes (${sum}) dépasse 12`;
  return null;
}
