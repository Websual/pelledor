import { PractitionerSeoForm } from "./practitioner-seo-form";

export default function CmsSeoSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-light text-gray-900">Référencement — site vitrine</h1>
      <p className="mt-2 text-sm text-gray-600">
        URL publique de référence et robots.txt pour votre établissement. Les métadonnées détaillées se règlent par
        page (builder), article ou projet.
      </p>
      <div className="mt-8">
        <PractitionerSeoForm />
      </div>
    </main>
  );
}
