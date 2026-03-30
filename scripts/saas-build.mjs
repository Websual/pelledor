#!/usr/bin/env node
/**
 * SaaS OS build : fusion module.json, copie routes/api depuis content/modules/.
 * Livre blanc §4–§5 : graphe deps NPM + audit avant déploiement.
 *
 * Usage :
 *   node scripts/saas-build.mjs
 *   node scripts/saas-build.mjs --audit   → pnpm install + pnpm audit (bloque si critique)
 *
 * Puis : pnpm install (si pas --audit) && pnpm db:push / migrate && pnpm build
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const modulesRoot = join(root, "content", "modules");
const manifestPath = join(root, "saas-modules.json");
const pkgPath = join(root, "package.json");

function log(...a) {
  console.log("[saas:build]", ...a);
}

const runAudit = process.argv.includes("--audit");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const enabled = manifest.modules || [];
if (!Array.isArray(enabled) || enabled.length === 0) {
  log("Aucun module dans saas-modules.json");
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const mergedDeps = { ...pkg.dependencies };
const manifestOut = {
  generatedAt: new Date().toISOString(),
  modules: [],
  conflicts: [],
};

for (const name of enabled) {
  const modJsonPath = join(modulesRoot, name, "module.json");
  if (!existsSync(modJsonPath)) {
    log("SKIP module inconnu:", name);
    continue;
  }
  const mod = JSON.parse(readFileSync(modJsonPath, "utf8"));
  const deps = mod.dependencies || {};
  const modEntry = { name, version: mod.version || "1.0.0", dependencies: { ...deps }, routes: false, api: false };
  for (const [k, v] of Object.entries(deps)) {
    if (mergedDeps[k] && mergedDeps[k] !== v) {
      manifestOut.conflicts.push({ package: k, kept: mergedDeps[k], skipped: v, module: name });
      log("conflit version", k, mergedDeps[k], "vs", v, "-> garde", mergedDeps[k]);
    } else {
      mergedDeps[k] = v;
    }
  }
  if (existsSync(join(modulesRoot, name, "routes"))) modEntry.routes = true;
  if (existsSync(join(modulesRoot, name, "api"))) modEntry.api = true;
  manifestOut.modules.push(modEntry);
}

pkg.dependencies = mergedDeps;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
log("package.json dependencies fusionnes");

const appModules = join(root, "src", "app", "(modules)");
const apiModules = join(root, "src", "app", "api", "modules");
if (existsSync(appModules)) rmSync(appModules, { recursive: true });
if (existsSync(apiModules)) rmSync(apiModules, { recursive: true });
mkdirSync(appModules, { recursive: true });
mkdirSync(apiModules, { recursive: true });

for (const name of enabled) {
  const routesSrc = join(modulesRoot, name, "routes");
  const apiSrc = join(modulesRoot, name, "api");
  const routesDest = join(appModules, name);
  if (existsSync(routesSrc)) {
    cpSync(routesSrc, routesDest, { recursive: true });
    log("copie routes", name, "->", "(modules)/" + name);
  }
  if (existsSync(apiSrc)) {
    const apiDest = join(apiModules, name);
    cpSync(apiSrc, apiDest, { recursive: true });
    log("copie api", name, "-> api/modules/" + name);
  }
}

writeFileSync(join(root, ".saas-build-manifest.json"), JSON.stringify(manifestOut, null, 2) + "\n");
log("manifest .saas-build-manifest.json");

if (runAudit) {
  log("pnpm install + audit (niveau critical)…");
  const install = spawnSync("pnpm", ["install"], { cwd: root, stdio: "inherit", shell: true });
  if (install.status !== 0) {
    log("pnpm install a echoue");
    process.exit(install.status || 1);
  }
  const audit = spawnSync("pnpm", ["audit", "--audit-level", "critical"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (audit.status !== 0) {
    log("Audit : vulnerabilites CRITICAL detectees — corriger les deps ou forcer en connaissance de cause.");
    process.exit(audit.status || 1);
  }
  log("audit OK (aucune critical)");
} else {
  log("Astuce livre blanc : pnpm saas:build:audit pour install + audit avant prod");
}

log("Termine. Executer: pnpm install && pnpm db:push (si nouvelles tables) && pnpm build");
