# Consignes SaaS OS

Chaque consigne est un fichier `NNN-titre.md`.
Cursor exécute une consigne à la fois, archive dans `consignes/archive/` quand terminée.

## Ordre d'exécution MVP

| # | Fichier | Statut |
|---|---------|--------|
| 038 | blueprint.json pour tous les secteurs | 🔲 À faire |
| 039 | Blueprint boutique : vitrine template + registry | 🔲 À faire |
| 040 | Build prod propre + vérifications | 🔲 À faire |
| 041 | Wizard /install : test complet + polish UX | 🔲 À faire |

## Règles

- **Une consigne à la fois** — ne pas anticiper la suivante
- **Scope strict** — faire uniquement ce qui est écrit, rien de plus
- **Ne pas toucher à** : `import/`, `scripts/import-legacy.mjs`, la logique Holia
- Après chaque consigne : mettre à jour ce README (Statut → ✅ Terminé) et déplacer le fichier dans `archive/`
