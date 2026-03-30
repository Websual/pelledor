import { auth } from "@/auth";
import { MODULE_CATALOG } from "@/core/modules/catalog";
import { getModuleTogglesMap } from "@/core/theme/db";
import { redirect } from "next/navigation";
import { ModuleToggleRow } from "./module-toggle-row";

export default async function AdminModulesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const toggles: Record<string, boolean> = await getModuleTogglesMap().catch(
    () => ({})
  );

  const rows = MODULE_CATALOG.map((m) => ({
    ...m,
    enabled: m.requiredByBuild ? true : (toggles[m.slug] ?? false),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
        Modules
      </h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--color-muted)" }}>
        Activer ou desactiver des briques pour le prochain build. Les changements
        ne sont appliques qu apres <code className="rounded bg-neutral-100 px-1">pnpm build</code>{" "}
        (ou votre pipeline) et regeneration du projet par le CLI Pelledor.
      </p>
      <ul className="mt-8 divide-y rounded-lg border bg-white" style={{ borderColor: "var(--color-border)" }}>
        {rows.map((m) => (
          <ModuleToggleRow key={m.slug} module={m} />
        ))}
      </ul>
    </div>
  );
}
