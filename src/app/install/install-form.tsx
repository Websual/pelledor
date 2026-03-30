"use client";

import { useState } from "react";
import { runInstall } from "./actions";

export function InstallForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    envSnippet: string;
    wroteEnv: boolean;
    blueprint: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const result = await runInstall(fd);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess({
      envSnippet: result.envSnippet,
      wroteEnv: result.wroteEnv,
      blueprint: String(fd.get("blueprint") ?? "artisan"),
    });
  }

  if (success) {
    return (
      <div className="mt-8 space-y-6">
        {/* Step 1: env */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p className="font-semibold">✅ Installation réussie !</p>
          {success.wroteEnv ? (
            <p className="mt-1">
              Fichier <code className="rounded bg-emerald-100 px-1">.env.local</code>{" "}
              écrit automatiquement.
            </p>
          ) : (
            <p className="mt-1">
              Créez <code className="rounded bg-emerald-100 px-1">.env.local</code> à la
              racine du projet avec le contenu ci-dessous, puis redémarrez le serveur.
            </p>
          )}
        </div>

        {!success.wroteEnv && (
          <>
            <label className="block text-xs font-medium text-neutral-500">
              Contenu .env.local
            </label>
            <textarea
              readOnly
              className="h-48 w-full rounded-md border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs"
              value={success.envSnippet}
            />
            <p className="text-xs text-neutral-500">
              Conservez ENCRYPTION_KEY secrète : elle déchiffre les secrets stockés
              en base (Stripe, SMTP, etc.).
            </p>
          </>
        )}

        {/* Step 2: next steps */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm">
          <p className="font-semibold text-neutral-900">Étapes suivantes</p>
          <ol className="mt-3 space-y-2 text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">1</span>
              <span>
                {success.wroteEnv
                  ? "Le serveur utilise déjà le bon environnement. Accédez à votre admin."
                  : "Créez .env.local, puis redémarrez le serveur (pnpm dev / npm start)."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">2</span>
              <span>Connectez-vous avec votre email admin.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">3</span>
              <span>
                Appliquez le blueprint <strong className="capitalize">{success.blueprint}</strong> dans l&apos;admin blueprint pour activer les modules et les données de démo.{" "}
                <a href="/admin/blueprint" className="font-medium text-neutral-900 underline underline-offset-2">
                  Aller dans l&apos;admin blueprint →
                </a>
              </span>
            </li>
          </ol>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/onboarding"
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-700"
          >
            Configurer mon app →
          </a>
          <a
            href="/login"
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Se connecter →
          </a>
        </div>
        <p className="text-xs text-neutral-400">
          ENCRYPTION_KEY secrète — ne la partagez jamais. Elle déchiffre les secrets en base.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      )}
      <div>
        <label htmlFor="databaseUrl" className="block text-sm font-medium">
          DATABASE_URL (PostgreSQL)
        </label>
        <input
          id="databaseUrl"
          name="databaseUrl"
          type="password"
          autoComplete="off"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="postgresql://user:pass@host:5432/db"
        />
      </div>
      <div>
        <label htmlFor="adminEmail" className="block text-sm font-medium">
          Email administrateur
        </label>
        <input
          id="adminEmail"
          name="adminEmail"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="adminPassword" className="block text-sm font-medium">
          Mot de passe administrateur
        </label>
        <input
          id="adminPassword"
          name="adminPassword"
          type="password"
          minLength={8}
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="blueprint" className="block text-sm font-medium">
          Premier métier / blueprint
        </label>
        <select
          id="blueprint"
          name="blueprint"
          defaultValue="artisan"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="artisan">Artisan — devis, planning, factures</option>
          <option value="restaurant">Restaurant — réservations, tables, paiements</option>
          <option value="gite">Gîte — chambres, réservations, paiements</option>
          <option value="hotel">Hôtel — hébergement, réservations, paiements</option>
          <option value="praticien">Praticien — rendez-vous, facturation, vitrine</option>
          <option value="cabinet">Cabinet — prestations, rendez-vous, facturation</option>
          <option value="immobilier">Immobilier — agence, événements, planning</option>
          <option value="salon">Salon — rendez-vous, prestations, facturation</option>
          <option value="boutique">Boutique — catalogue, panier, commandes</option>
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          L’instance démarre directement avec ce métier comme base. Vous pourrez le changer plus tard dans l’admin blueprint.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Installation…" : "Installer"}
      </button>
    </form>
  );
}
