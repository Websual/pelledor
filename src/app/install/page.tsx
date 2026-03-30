import { redirect } from "next/navigation";
import { InstallForm } from "./install-form";

export default function InstallPage() {
  if (process.env.SAAS_INSTALLED === "true") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-neutral-50 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white font-bold text-lg">
              P
            </div>
            <span className="text-2xl font-bold tracking-tight text-neutral-900">Pelledor</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500 font-medium tracking-widest uppercase">Installation</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-8 shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">
            Configuration initiale
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Renseignez votre base PostgreSQL et créez votre compte administrateur.
            Les clés de chiffrement seront générées automatiquement.
          </p>
          <InstallForm />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Pelledor — Open Source CMS métier ·{" "}
          <a href="https://github.com/Websual/pelledor" className="underline hover:text-neutral-600" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </div>
    </main>
  );
}
