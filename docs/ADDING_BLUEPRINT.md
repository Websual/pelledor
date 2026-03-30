# Ajouter un nouveau Blueprint métier

Ce guide explique comment ajouter un nouveau métier à SaaS OS en ~30 minutes.

## Qu'est-ce qu'un Blueprint ?

Un blueprint = **template vitrine HTML** + **modules activés** + **données seed** + **payload JSON** (personnalisation).

## Étape 1 : Créer le template vitrine

```
content/blueprints/templates/<id>/index.html
```

Utilisez des placeholders `{{CLE}}` pour tous les textes/couleurs personnalisables.

Référence : `content/blueprints/templates/artisan/index.html`

**Placeholders standards à inclure :**
- `{{NOM_ENTREPRISE}}`, `{{SPECIALITE}}`, `{{VILLE}}`, `{{TELEPHONE}}`, `{{EMAIL}}`
- `{{COLOR_ACCENT}}`, `{{COLOR_BG}}`
- `{{LINK_RDV}}` ou `{{LINK_DEVIS}}` selon le métier
- `{{TITRE_HERO}}`, `{{SOUS_TITRE_HERO}}`

## Étape 2 : Créer les defaults de placeholder

Fichier : `src/core/blueprint/defaults-<id>.ts`

```typescript
export const monMetierPlaceholderDefaults: Record<string, string> = {
  NOM_ENTREPRISE: "Exemple Entreprise",
  SPECIALITE: "Mon activité",
  VILLE: "Paris",
  // ... tous les placeholders du template
};
```

Référence : `src/core/blueprint/defaults-artisan.ts`

## Étape 3 : Créer le module saas-modules.json

```
content/blueprints/<id>/saas-modules.json
```

```json
{
  "modules": ["notes", "stripe", "directory", "booking", "billing"]
}
```

Modules disponibles : `notes`, `stripe`, `directory`, `booking`, `billing`, `artisan-quotes`, `lodging`, `restaurant`, `events`, `blog`, `notifications`, `gift-cards`, `chat`, `shop`

## Étape 4 : Créer la fonction apply

Fichier : `src/core/blueprint/apply-<id>.ts`

```typescript
import { getDb } from "@/core/db/server";
import { appSettings, modules as modulesTable } from "@/core/db/schema";

export async function applyMonMetierToggles() {
  const db = getDb();
  const modulesToEnable = ["notes", "stripe", "directory", "booking", "billing"];
  for (const mod of modulesToEnable) {
    await db.insert(appSettings)
      .values({ key: `module.${mod}.enabled`, value: "true" })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: "true", updatedAt: new Date() },
      });
  }
  await db.insert(appSettings)
    .values({ key: "blueprint.active", value: "<id>" })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: "<id>", updatedAt: new Date() },
    });
}

export async function seedMonMetier(userId: string) {
  const db = getDb();
  // Créer le praticien / profil seed
  // ...
  return { message: "Seed OK", practitionerSlug: "mon-metier-demo" };
}
```

Référence : `src/core/blueprint/apply-artisan.ts`

## Étape 5 : Créer les defaults de payload (optionnel)

Si le blueprint a un payload JSON stocké en base :

```
src/core/blueprint/defaults-<id>.ts
```

## Étape 6 : Ajouter dans server.ts

Fichier : `src/core/blueprint/server.ts`

Ajouter les fonctions `get<Id>PayloadJson()` et `setBlueprint<Id>Active()`.

## Étape 7 : Brancher dans l'admin blueprint

Fichier : `src/app/admin/blueprint/page.tsx`

1. Importer `applyMonMetierToggles`, `seedMonMetier`
2. Ajouter une action server `applyMonMetierBusinessBlueprint`
3. Ajouter un composant `Apply<Id>Form` dans `apply-<id>-form.tsx`
4. Ajouter le select option dans le formulaire blueprint
5. Ajouter le form dans la page

Référence : voir `ApplyGiteForm`, `ApplyRestaurantForm`, etc.

## Étape 8 : Brancher dans actions.ts

Fichier : `src/app/admin/blueprint/actions.ts`

Exporter la fonction `apply<Id>BusinessBlueprint()`.

## Étape 9 : Mettre à jour le wizard install

Fichier : `src/app/install/install-form.tsx`

Ajouter l'option dans le select `<select name="blueprint">`.

## Étape 10 : Build et test

```bash
npm run saas:build
npm run build
# Restart serveur
# Aller sur /admin/blueprint → Appliquer le blueprint
```

## Checklist rapide

- [ ] `content/blueprints/templates/<id>/index.html`
- [ ] `content/blueprints/<id>/saas-modules.json`
- [ ] `src/core/blueprint/defaults-<id>.ts`
- [ ] `src/core/blueprint/apply-<id>.ts`
- [ ] Branché dans `src/app/admin/blueprint/page.tsx`
- [ ] Branché dans `src/app/admin/blueprint/actions.ts`
- [ ] Ajouté dans `src/app/install/install-form.tsx`
- [ ] Build OK ✓

## Exemple : Blueprint "Photographe"

Modules : `directory`, `booking`, `billing`, `stripe`, `blog`, `notes`
Placeholders clés : `NOM_STUDIO`, `SPECIALITE` (portrait, mariage, etc.), `LIEN_GALERIE`, `TARIFS`
Seed : profil photographe + 3 prestations (mariage, portrait, corporate)

---

_Ce guide est maintenu dans `/var/www/saas-os/docs/ADDING_BLUEPRINT.md`._
