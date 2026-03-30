# Guide interne — types de prompts pour agents (CMS)

Ce document fixe des **modèles de consigne** pour éditer le contenu sans casser le contrat technique (`PageDocumentV1`, API blog, SEO). À utiliser avec l’API (OpenAPI) ou le serveur MCP `mcp-server/`.

## Principes

1. **Brouillon d’abord** : utiliser `publish: false` (ou ne pas publier) tant que la mise en page n’est pas validée.
2. **Une seule source de vérité pour la page** : envoyer `document` (objet `version: 1`, `rows: [...]`) plutôt qu’un mélange ambigu avec `blocks` sauf import historique.
3. **Hiérarchie titres** : un seul H1 pertinent par page (hero ou bloc titre niveau `h1`) ; le reste en `h2`–`h4`.
4. **SEO** : renseigner `metaTitle`, `metaDescription` et éventuellement `targetKeyword` pour alimenter le panneau de suggestions ; pas de promesse de classement dans le texte utilisateur final.

---

## Type P1 — Nouvelle page vitrine (builder)

**Objectif** : créer une page `contact` (ou autre slug) avec sections simples.

**Prompt modèle** :

> Crée la page builder avec le slug `{slug}`. Structure : une section avec un titre H1 « {titre} », un bloc texte avec le HTML fourni ci-dessous, un bloc CTA vers `{lien}`. N’active pas la publication ; enregistre en brouillon. Respecte `PageDocumentV1` (grille 12, somme des `span` ≤ 12 par ligne).

**Appel API** : `POST /api/modules/page-builder/pages` avec `document`, `publish: false`, champs SEO si disponibles.

---

## Type P2 — Mise à jour ciblée d’une page existante

**Objectif** : modifier le contenu sans réécrire tout le document.

**Prompt modèle** :

> Récupère la page `{slug}` via `GET /api/modules/page-builder/pages` (liste) ou export `cms-bundle`. Applique uniquement les changements demandés : {liste}. Renvoie le document complet mis à jour via `POST` (merge côté serveur : toujours envoyer le document entier cohérent).

**Note** : l’API remplace le JSON `blocks` en entier ; l’agent doit fusionner en mémoire puis poster.

---

## Type P3 — Publication / dé-publication

**Objectif** : basculer `publishedAt`.

**Prompt modèle** :

> Pour la page `{slug}`, appelle `POST .../pages` avec le même `document` (ou récupéré avant), `publish: true` pour mettre en ligne, ou stratégie équivalente selon les champs disponibles.

---

## Type T1 — Thème (admin / agent autorisé)

**Objectif** : ajuster les tokens globaux.

**Prompt modèle** :

> Ne modifie le thème que si l’utilisateur est administrateur ou si l’instance autorise l’agent (`SAAS_OS_AGENT_ALLOW_THEME`). Utilise `POST /api/modules/page-builder/cms-bundle` avec un objet `theme` partiel compatible `ThemeTokens` ; fusionne de manière conservative (une ou deux familles de tokens à la fois).

---

## Type B1 — Article de blog

**Objectif** : brouillon ou publication avec corps HTML ou `bodyDocument`.

**Prompt modèle** :

> Crée un article : titre `{titre}`, extrait `{extrait}`, corps en HTML `{html}`. Slug `{slug}` ou dérivé du titre. `publish: false` jusqu’à validation. Renseigne meta title/description alignés sur le contenu réel.

**API** : `POST /api/modules/cms/blog/posts`.

---

## Type B2 — Mise à jour d’article

> Charge l’article id `{uuid}`, applique les champs suivants : {...}, `PATCH` avec uniquement les clés modifiées.

---

## Type S1 — Bundle (migration / sauvegarde)

**Objectif** : exporter ou réimporter plusieurs pages.

> `GET cms-bundle` pour audit ; préparer un tableau `pages` avec `pageSlug`, `document`, `publish` ; `POST cms-bundle` sans toucher à `theme` sauf demande explicite et permissions.

---

## Erreurs à éviter

- Colonnes d’une ligne dont la somme des `span` dépasse 12.
- Plusieurs H1 sans intention SEO claire.
- Canonical absolu erroné (doit inclure le bon domaine et le préfixe `/saas-os` si applicable).
- Publier (`publish: true`) sans relecture lorsque l’utilisateur a demandé un brouillon.

Pour le détail des champs : `docs/openapi/saas-os-cms-agent.openapi.yaml`.
