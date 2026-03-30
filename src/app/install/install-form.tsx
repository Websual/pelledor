"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { runInstall } from "./actions";

function AutoRedirect({ wroteEnv }: { wroteEnv: boolean }) {
  const [countdown, setCountdown] = useState(wroteEnv ? 12 : 0);
  const [ready, setReady] = useState(!wroteEnv);

  useEffect(() => {
    if (!wroteEnv) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setReady(true);
          // Tenter la redirection vers login
          window.location.href = "/login";
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [wroteEnv]);

  if (wroteEnv && !ready) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500 shrink-0" />
          <span className="font-semibold">Redémarrage du serveur…</span>
        </div>
        <p className="mt-1 ml-6 text-blue-700">
          Les paramètres sont chargés. Redirection vers la connexion dans{" "}
          <strong>{countdown}s</strong>…
        </p>
        <div className="mt-2 ml-6 h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${((12 - countdown) / 12) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href="/admin"
        className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-700"
      >
        Aller à l&apos;admin →
      </a>
      <a
        href="/login"
        className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
      >
        Se connecter →
      </a>
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  minLength,
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete="off"
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-700"
          tabIndex={-1}
          aria-label={show ? "Masquer" : "Afficher"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

const STEPS = [
  "Vérification de la base de données…",
  "Application des migrations SQL…",
  "Création du compte administrateur…",
  "Activation du blueprint…",
  "Génération des clés de sécurité…",
  "Finalisation…",
];

export function InstallForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    envSnippet: string;
    wroteEnv: boolean;
    blueprint: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    setStepIndex(0);

    // Simuler la progression des étapes visuellement pendant l'install
    const interval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 3500);

    const fd = new FormData(e.currentTarget);
    const result = await runInstall(fd);
    clearInterval(interval);
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="font-semibold">Installation réussie !</p>
          </div>
          {success.wroteEnv ? (
            <p className="mt-1 ml-6">
              Fichier <code className="rounded bg-emerald-100 px-1">.env.local</code>{" "}
              écrit automatiquement.
            </p>
          ) : (
            <p className="mt-1 ml-6">
              Créez <code className="rounded bg-emerald-100 px-1">.env.local</code> à la
              racine du projet avec le contenu ci-dessous, puis redémarrez.
            </p>
          )}
        </div>

        {!success.wroteEnv && (
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Contenu .env.local
            </label>
            <textarea
              readOnly
              className="h-48 w-full rounded-md border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs"
              value={success.envSnippet}
            />
          </div>
        )}

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm">
          <p className="font-semibold text-neutral-900">Étapes suivantes</p>
          <ol className="mt-3 space-y-2 text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">1</span>
              <span>
                {success.wroteEnv
                  ? "L'environnement est configuré. Redémarrez le serveur."
                  : "Créez .env.local, puis redémarrez le serveur."}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">2</span>
              <span>Connectez-vous avec votre email admin.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold">3</span>
              <span>
                Activez le blueprint <strong className="capitalize">{success.blueprint}</strong> dans l&apos;admin.{" "}
                <a href="/admin/blueprint" className="font-medium underline underline-offset-2">
                  Admin blueprint →
                </a>
              </span>
            </li>
          </ol>
        </div>

        <AutoRedirect wroteEnv={success.wroteEnv} />
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

      <PasswordField
        id="databaseUrl"
        name="databaseUrl"
        label="DATABASE_URL (PostgreSQL)"
        placeholder="postgresql://user:pass@host:5432/db"
      />

      <div>
        <label htmlFor="adminEmail" className="block text-sm font-medium text-neutral-700">
          Email administrateur
        </label>
        <input
          id="adminEmail"
          name="adminEmail"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      <PasswordField
        id="adminPassword"
        name="adminPassword"
        label="Mot de passe administrateur"
        minLength={8}
      />

      <div>
        <label htmlFor="blueprint" className="block text-sm font-medium text-neutral-700">
          Premier métier / blueprint
        </label>
        <select
          id="blueprint"
          name="blueprint"
          defaultValue="artisan"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
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
          Vous pourrez changer de blueprint plus tard dans l&apos;admin.
        </p>
      </div>

      {/* Feedback progression */}
      {pending && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Loader2 size={16} className="animate-spin text-neutral-500 shrink-0" />
            <span>{STEPS[stepIndex]}</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 transition-all duration-700"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            L&apos;installation peut prendre 30 à 60 secondes…
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Installation en cours…
          </>
        ) : (
          "Installer Pelledor"
        )}
      </button>
    </form>
  );
}
