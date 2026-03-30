# Positionnement produit

## En une phrase

**SaaS OS** : socle fixe (**core**), **modules** branchables, **thème** headless, **install** sur base vierge, pour monter une app métier sans repartir de zéro à chaque fois.

## Ce que le produit n’est pas

- Ce n’est **pas** un outil de migration « tout absorber depuis une appli existante » : chaque instance vise une **nouvelle installation** (données créées dans le CMS ou via blueprints).

## Référence de développement

Du code ou des dumps optionnels peuvent exister **en local** pour accélérer la conception des modules ; rien n’est obligatoire au déploiement client.

## Priorités alignées livre blanc

1. **Core** : auth, middleware, hooks, install, secrets.  
2. **CLI** : fusion `module.json`, injection routes/schémas au build.  
3. **Thème + admin** : activer modules, design tokens.  
4. **MVP** : modules de démo (ex. Notes, Stripe) comme preuve d’architecture.  
5. **Blueprints** : packs métier — voir `VISION_PRODUIT.md`.

Les modules « annuaire / RDV / événements » sont des **briques de démo** pour valider l’architecture ; le produit vendable reste **l’OS + blueprints**.
