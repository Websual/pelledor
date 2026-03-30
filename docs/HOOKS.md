# Hooks (EventBus)

API style WordPress : **actions** (evenements) et **filtres** (transformation de donnees).

Fichier : `src/core/events/hooks.ts` (`Hooks`).

## Actions

```ts
import { Hooks } from "@/core/events/hooks";

Hooks.addAction<{ userId: string; email: string }>(
  "user_created",
  async (payload) => {
    // ex. creer le client Stripe
  },
  10 // priority optionnelle, defaut 10
);

await Hooks.doAction("user_created", { userId, email });
```

Actions enregistrees au bootstrap (`src/core/bootstrap-server.ts`). Les modules ajouteront leurs `addAction` dans leur `register()` importe au build.

Evenements : **`user_created`**, **`appointment_created`**, **`appointment_status_changed`**, **`ticket_purchased`** (webhook Stripe event).

## Filtres

```ts
Hooks.addFilter<{ title: string; url: string }[]>(
  "admin_sidebar_menu",
  async (links) => [...links, { title: "Facturation", url: "/admin/billing" }]
);

const menu = await Hooks.applyFilters("admin_sidebar_menu", []);
```

Filtre utilise dans l admin : **`admin_sidebar_menu`** (layout sidebar).

## Middleware

- Avant `SAAS_INSTALLED` : redirections install uniquement (pas de JWT).
- Apres install : **Edge** verifie `/admin` via `getToken` (pas d import DB/bcrypt dans le bundle middleware).
- Regles supplementaires modules : etendre `src/middleware.ts` ou `src/core/middleware/rules.ts` (documenter pour rebuild).
