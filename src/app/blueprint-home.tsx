"use client";

/**
 * Affiche le HTML full-page du template blueprint (isolé du layout Next).
 */
export function BlueprintHome({ html }: { html: string }) {
  return (
    <iframe
      title="Site vitrine blueprint"
      srcDoc={html}
      className="h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
