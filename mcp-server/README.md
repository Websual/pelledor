# Serveur MCP — CMS SaaS OS

Processus **stdio** qui expose des outils pour l’API documentée dans `../docs/openapi/saas-os-cms-agent.openapi.yaml`.

## Prérequis

1. Variables sur l’instance Next (voir `.env.example` à la racine du monorepo) :
   - `PELLEDOR_AGENT_TOKEN` — secret partagé avec ce client
   - `PELLEDOR_AGENT_PRACTITIONER_ID` — UUID du praticien ciblé par l’agent
   - Optionnel : `PELLEDOR_AGENT_ALLOW_THEME=true` pour autoriser la fusion du thème via `POST /cms-bundle`

2. Variables pour **ce** package (lancement du MCP) :
   - `PELLEDOR_MCP_BASE_URL` — URL de base **avec** le préfixe d’appli, ex. `http://localhost:3000/saas-os` ou `https://domaine.tld/saas-os`
   - `PELLEDOR_AGENT_TOKEN` — le même secret que sur le serveur

## Installation

```bash
cd mcp-server
pnpm install
```

## Démarrage

```bash
export PELLEDOR_MCP_BASE_URL="http://localhost:3000/saas-os"
export PELLEDOR_AGENT_TOKEN="votre-secret"
pnpm start
```

## Cursor / Claude Desktop

Ajoutez un serveur MCP dont la commande est `pnpm` avec les arguments `start` dans `mcp-server`, le répertoire de travail pointant sur ce dossier, et les variables d’environnement ci-dessus.

## Outils exposés

| Outil | Rôle |
|--------|------|
| `cms_get_bundle` | Export thème + pages |
| `cms_list_pages` | Liste brute `page_blocks` |
| `cms_upsert_page` | POST page builder |
| `cms_import_pages` | Import multi-pages (`cms-bundle`) |
| `blog_list_posts` | Liste articles |
| `blog_get_post` | Détail par id |
| `blog_create_post` | Création |
| `blog_update_post` | PATCH (corps JSON stringifié) |
| `blog_list_categories` | Catégories |
