import { auth } from "@/auth";
import { getThemeTokensResolved } from "@/core/theme/db";
import { redirect } from "next/navigation";
import { AppearanceWorkspace } from "./appearance-workspace";

export default async function AppearancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let tokens;
  try {
    tokens = await getThemeTokensResolved();
  } catch {
    tokens = null;
  }

  if (!tokens) {
    return (
      <div className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-medium">Migration requise</p>
        <p className="mt-2 text-neutral-700">
          Executez sur votre base PostgreSQL le fichier{" "}
          <code className="rounded bg-white px-1">drizzle/0001_step3_theme_modules.sql</code>
          , ou <code className="rounded bg-white px-1">pnpm db:push</code> avec{" "}
          <code className="rounded bg-white px-1">DATABASE_URL</code> charge.
        </p>
        <p className="mt-2 text-xs text-neutral-600">
          Nouvelles installations : le wizard /install applique deja toutes les migrations SQL.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-semibold">Apparence</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600">
        Couleurs, polices, espacements, rayons et etats interactifs. Variables injectees
        en runtime dans l admin ; enregistrement en base.
      </p>
      <div className="mt-8">
        <AppearanceWorkspace initial={tokens} />
      </div>
    </div>
  );
}
