"use client";

import { useState, useEffect, useRef } from "react";

type RebuildStatus = {
  status: "idle" | "running" | "success" | "error";
  startedAt?: string;
  finishedAt?: string;
  log?: string;
  error?: string;
};

export function RebuildButton() {
  const [rebuildStatus, setRebuildStatus] = useState<RebuildStatus>({ status: "idle" });
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStatus() {
    try {
      const r = await fetch("/api/admin/rebuild");
      if (r.ok) setRebuildStatus(await r.json());
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (rebuildStatus.status === "running") {
      pollRef.current = setInterval(fetchStatus, 3000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [rebuildStatus.status]);

  async function triggerRebuild() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/rebuild", { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        alert(data.error || "Erreur au lancement du rebuild");
      } else {
        setRebuildStatus({ status: "running", startedAt: data.startedAt });
      }
    } finally {
      setLoading(false);
    }
  }

  const isRunning = rebuildStatus.status === "running";
  const isSuccess = rebuildStatus.status === "success";
  const isError = rebuildStatus.status === "error";

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6 mt-6">
      <h2 className="text-lg font-semibold text-blue-950">Reconstruire l&apos;application</h2>
      <p className="mt-1 text-sm text-blue-900/80">
        Lance <code className="rounded bg-white px-1 font-mono text-xs">npm run saas:build &amp;&amp; npm run build</code> en arrière-plan.
        Nécessaire après tout changement de blueprint ou de modules.
      </p>
      <button
        type="button"
        disabled={loading || isRunning}
        onClick={triggerRebuild}
        className="mt-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isRunning ? "⏳ Rebuild en cours…" : loading ? "Lancement…" : "🔨 Reconstruire maintenant"}
      </button>

      {isRunning && (
        <p className="mt-3 text-sm text-blue-700 animate-pulse">
          Build en cours depuis {rebuildStatus.startedAt ? new Date(rebuildStatus.startedAt).toLocaleTimeString("fr-FR") : "…"} — mise à jour auto toutes les 3 secondes.
        </p>
      )}

      {isSuccess && (
        <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">✅ Rebuild terminé avec succès</p>
          <p className="text-xs text-neutral-500 mt-1">
            Terminé à {rebuildStatus.finishedAt ? new Date(rebuildStatus.finishedAt).toLocaleTimeString("fr-FR") : "—"}
          </p>
          {rebuildStatus.log && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-neutral-600">Voir les logs</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-neutral-100 p-2 text-xs font-mono whitespace-pre-wrap">{rebuildStatus.log.slice(-1500)}</pre>
            </details>
          )}
        </div>
      )}

      {isError && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">❌ Rebuild échoué</p>
          {rebuildStatus.error && <p className="text-xs mt-1">{rebuildStatus.error}</p>}
          {rebuildStatus.log && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Voir les logs</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-red-100 p-2 text-xs font-mono whitespace-pre-wrap">{rebuildStatus.log.slice(-1500)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
