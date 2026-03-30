# Feuille de route — CMS complet, builder, SEO, agent-first

Document de synthèse (vision produit + enrichissements techniques + prochaines étapes). Complète `docs/THEME.md`, `docs/CURSOR_BLUEPRINTS.md`, `docs/CEO_ROADMAP.md`.

---

## 1. Vision produit (rappel + objectif)

**Objectif** : un CMS complet où les **blueprints** et **templates HTML** ne sont qu’un **raccourci onboarding** pour les profils peu techniques ; la **liberté réelle** vient du **thème global** (fond : typo, couleurs, espacements, variantes de navigation) + du **page builder** (forme : sections, grilles, blocs).

**Référence UX** : thèmes WordPress « coquille » — peu de pages imposées, mais des **réglages profonds** + un constructeur de mise en page pour des milliers de rendus possibles.

**Référence forme (captures type WPBakery / Uncode)** :

- **Ligne (row)** d’abord, puis **découpage en colonnes** sur une base **12** (préréglages 1/2+1/2, 1/3+2/3, etc. + mode personnalisé tant que Σ colonnes ≤ 12).
- **Trois niveaux de réglages** : **ligne** (conteneur, hauteur, padding…), **colonne** (largeur, alignement, espacement interne…), **bloc** (contenu + styles propres au module).
- Panneau d’**ajout d’élément** avec **catégories + recherche** pour scaler une bibliothèque de blocs.
- Contrat technique aligné : `PageDocumentV1` (`src/core/builder/page-document.ts`) + schéma JSON `docs/schemas/page-blocks-payload.schema.json`.

**Lot métier** : modules (RDV, facturation, boutique, etc.) restent branchés ; le builder habille et structure les **pages publiques** sans sacrifier la logique métier derrière.

**Publication sans terminal** : le contenu vit en base et est édité depuis **l’admin** (ex. `/admin/builder`) ; pas de rebuild obligatoire pour **poster des blocs**. Les opérations **infra** (changement de blueprint lourd, `saas:build`, etc.) restent des étapes exceptionnelles : les exposer via **l’admin** avec **suivi du processus** (Cf. `GET/POST /api/admin/rebuild` + fichier `.rebuild-status.json` — à regrouper dans un écran « Opérations / Déploiement » lisible pour un utilisateur lambda).

---

## 2. Enrichissements proposés (par rapport au discours initial)

### 2.1 « Fond » — design system & thème

- **Design tokens versionnés** : au-delà des variables CSS actuelles (`THEME.md`), viser un **schéma JSON unique** (couleurs sémantiques, échelle typo, rayons, espacements, densité) **exportable** et **modifiable par API** pour les agents.
- **Presets de navigation** : une dizaine de layouts (horizontal sticky, drawer, mega-menu léger, etc.) — implémentés comme **variantes de composant** + tokens, pas comme 10 codebases.
- **Modes** : clair / sombre / système ; **contraste** accessible (WCAG AA minimum sur le thème par défaut).
- **Polices** : self-host ou Google ; stratégie **subset** + `font-display` pour perf.

### 2.2 « Forme » — builder type Elementor

- **Hiérarchie** : Page → Sections → **Lignes** (optionnel si grid natif suffit) → **Colonnes** (12-col ou flex) → **Blocs**.
- **Deux niveaux de blocs** :
  - **Blocs atomiques** : titre, paragraphe, image, galerie, bouton, liste, séparateur, vidéo embed, carte, témoignage (item), accordeon item, etc.
  - **Blocs section (presets)** : « Hero », « Grille services », « FAQ », « Manifesto », « Preuve sociale » — en réalité des **compositions** de blocs atomiques + réglages groupés (équivalent de « patterns » WordPress / Gutenberg).
- **Contraintes** : chaque bloc expose un **schéma** (champs, validation, a11y requise pour images alt, hiérarchie titres).
- **Responsive** : visibilité / largeur colonne / ordre par breakpoint (au minimum `sm` / `md` / `lg`).

### 2.3 Contenus & types

- **Pages** : déjà dans la logique builder ; ajouter statuts **brouillon / publié**, **slug** unique, **template** optionnel.
- **Blog** : collection « posts » (titre, extrait, corps riche ou blocs, auteur, catégories/tags, image à la une), archives, pagination, RSS optionnel.
- **Portfolio** : type de contenu « projet » (galerie, client, rôle, lien externe, filtres par catégorie) — peut partager le moteur de « blocs » avec les pages.

### 2.4 SEO

- Par page / post : **meta title**, **meta description**, **slug**, **canonical**, **noindex** si besoin.
- **Open Graph** / Twitter cards (image, titre, description).
- **Sitemap.xml** dynamique, **robots.txt** configurable.
- **JSON-LD** pour Organisation / Article / Product (si boutique) selon contexte.
- **Analyse sémantique** : plutôt qu’un « score magique », viser : longueur fichier / H1 unique / présence mot-clé secondaire / lisibilité — avec des **recommandations** explicites (éviter les black-box type SEO spam). Prévoir un champ **mot-clé cible** pour l’agent et l’humain.

### 2.5 Agent-first & MCP

**Ce n’est pas « MCP ou rien »** — plusieurs couches complémentaires :

| Approche | Rôle |
|----------|------|
| **API REST interne** (OpenAPI) | Idéale pour intégrations génériques, scripts, produits tiers. |
| **Contrat JSON stable** (pages, blocs, thème) | Permet à un LLM de lire/écrire sans connaître le détail React. |
| **Webhooks / jobs** | Publication différée, indexation, purge cache. |
| **MCP (Model Context Protocol)** | Optionnel mais **très adapté** : un serveur MCP expose des **outils** (`list_pages`, `get_theme`, `set_block`, `publish_page`) avec **schémas** ; Cursor / Claude Desktop peuvent manipuler le site de façon sûre et guidée. |

**Principes pour les agents** :

- Opérations **idempotentes** où possible (clé stable par bloc).
- **Brouillon vs publier** obligatoire.
- **Journal d’audit** (qui / quoi / quand) pour rollback mental et confiance.
- URLs de **preview** signées pour valider avant mise en ligne.

---

## 3. Risques / garde-fous

- **Scope** : livrer une **v1 builder** étroite mais excellente (grille + 8–12 blocs) avant d’exploser la bibliothèque.
- **Perf** : éviter les arbres de composants illimités côté client ; SSR, lazy, limites de profondeur.
- **Sécurité** : sanitizer le HTML riche ; CSP déjà posée ; uploads contrôlés.
- **Multi-tenant** (si un jour) : isoler schéma DB ou tenant_id partout — à anticiper dans le modèle `page_blocks` / contenus.

---

## 4. Feuille de route — prochaines étapes (priorisées)

Les phases sont **séquentielles** à l’intérieur d’un même trimestre ; certaines tâches peuvent être parallèles (SEO baseline vs blocs).

### Phase A — Socle données & contrat (2–4 semaines)

- [x] Modèle canonique **v1** : `PageDocumentV1` (lignes → colonnes grille 12 → blocs) + compat **liste plate** normalisée à l’enregistrement (`normalizeBlocksToDocument`).
- [x] **JSON Schema** documenté : `docs/schemas/page-blocks-payload.schema.json` (validation serveur stricte : option Phase B).
- [x] **Theme tokens** : champ optionnel `layout` (`navVariant`, `containerMaxWidth`, `sectionGap`) + variables CSS quand présent (`src/core/theme/types.ts`).
- [x] Endpoint **export / import** : `GET/POST /api/modules/page-builder/cms-bundle` (thème + pages export ; import pages pour le praticien ; fusion thème si `role === admin`).
- [ ] **Revision** / historique — optionnel après stabilisation du schéma.

### Phase B — Builder UX minimal viable (4–8 semaines)

- [x] Grille : **sections** (lignes), **colonnes sur 12** (préréglages + personnalisé), **duplication / suppression / réordonnancement** des sections ; réordonnancement des blocs **dans une colonne**.
- [x] Bibliothèque : blocs **heading**, **texte**, **image**, **galerie**, **cta**, **services**, **faq** (accordéon natif), **témoignages**, **séparateur**, **embed**, **hero**, **contact-info**, + widgets modules — avec **modal recherche + onglets**.
- [x] **5 patterns** prêts à insérer (`src/core/builder/patterns.ts`) : hero+séparateur, section services, FAQ, bandeau CTA, témoignages.
- [x] **Preview responsive** (desktop / tablette / mobile) dans l’admin ; **rendu public SSR** : `/saas-os/site/[establishment]/[pageSlug]` pour pages **publiées**.

### Phase C — Types de contenu (3–6 semaines, partiellement en parallèle)

- [x] Module **Blog** (par praticien) : catégories, articles **HTML** + option **document builder JSON** ; liste filtrable par catégorie + page article — routes publiques `/site/[e]/blog` et API `/api/modules/cms/blog/*`.
- [x] **Portfolio** : fiches **projet** (résumé, HTML, document JSON, galerie, client, lien externe), liste + détail — `/site/[e]/portfolio`.
- [x] **Navigation dynamique** : table `site_nav_items` (pages builder, externe, blog, portfolio, catégorie blog) — rendu dans le layout `/site/[establishment]`, édition `/admin/cms/navigation`.

### Phase D — SEO produit (2–4 semaines)

- [x] Champs meta + OG par page/post ; sitemap ; robots.
- [x] JSON-LD minimal (Organization + Article).
- [x] Panneau « **suggestions** » (H1, longueur, mot-clé cible) — sans promesse de ranking.

### Phase E — Agent & MCP (4–8 semaines, peut démarrer après Phase A)

- [x] **OpenAPI** des routes critiques (pages, thème, blog).
- [x] **Serveur MCP** (Node) dans le repo ou package à part : tools avec auth (token instance).
- [x] Guide « **prompt types** » pour éditer du contenu proprement (interne).

### Phase F — Blueprints & templates (continu)

- [ ] Rester sur la lógique actuelle : blueprints = **starter packs** ; pas besoin de dizaines de métiers si le builder couvre 80 % des mises en page.
- [ ] Nouveaux blueprints **sur demande** marché ou partenariats.

---

## 5. Indicateur de succès (court terme)

- Un utilisateur **sans template métier lourd** peut sortir un site **unique** (thème + 3 pages builder) en < 1 h.
- Un **agent** peut créer une page brouillon + définir le thème via **JSON** ou **MCP** sans casser le layout.
- **Lighthouse** : SEO > 90 sur page vitrine type ; pas de régression a11y critique sur blocs livrés.

---

## 6. Prochaine décision à trancher (équipe)

1. **Moteur de blocs** : rester sur structure actuelle (`page_blocks` JSON) + durcissement, ou migrer vers un format type **Portable Text** / **Slate** — impact éditorial.
2. **Blog** : contenu **full builder** vs **rich text** + bloc « builder zone » (hybride souvent pragmatique).
3. **MCP** : hébergement du serveur MCP (même instance Next vs microservice) et modèle d’**auth** (token par site).

---

*Dernière mise à jour : 2026-03-30 — Phases D et E : SEO + OpenAPI (`docs/openapi/saas-os-cms-agent.openapi.yaml`), auth Bearer agent (`SAAS_OS_AGENT_*`), serveur MCP `mcp-server/`, guide `docs/AGENT_PROMPT_TYPES.md`.*
