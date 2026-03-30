import { redirect } from "next/navigation";
import { InstallForm } from "./install-form";

export default function InstallPage() {
  if (process.env.SAAS_INSTALLED === "true") {
    redirect("/");
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Installation Pelledor
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Premiere configuration : base PostgreSQL et compte administrateur.
        Des cles seront generees (style wp-config) pour le chiffrement et les
        sessions.
      </p>
      <InstallForm />
    </main>
  );
}
