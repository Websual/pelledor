# Consigne 041 — Wizard /install : test complet + polish UX

## Contexte

Le wizard `/install` existe mais n'a jamais été testé bout-en-bout sur une DB fraîche.
C'est le point d'entrée #1 du produit — il doit être aussi simple que WordPress.
Un utilisateur qui déploie l'app pour la première fois doit pouvoir tout configurer depuis `/install` sans toucher à un fichier.

## ⛔ NE PAS faire

- Ne pas refaire l'architecture du wizard — améliorer ce qui existe
- Ne pas ajouter d'étapes supplémentaires — le wizard doit rester en 1 écran / 1 formulaire
- Ne pas toucher aux migrations Drizzle existantes

## Étapes

### 1. Tester le wizard sur une DB fraîche

```bash
# Créer une DB de test (si PostgreSQL local disponible)
createdb saas_os_test 2>/dev/null || true
# Lancer sans SAAS_INSTALLED
unset SAAS_INSTALLED
DATABASE_URL=postgresql://localhost/saas_os_test pnpm dev
# Ouvrir http://localhost:3000 → doit rediriger vers /install
```

Vérifier que le wizard :
- [ ] S'affiche correctement sans CSS cassé
- [ ] Valide que `DATABASE_URL` est joignable avant de continuer
- [ ] Crée le compte admin en base
- [ ] Génère `ENCRYPTION_KEY`, `AUTH_SECRET` (32 octets hex aléatoires)
- [ ] Écrit `.env.local` **ou** affiche les variables à copier si le fichier n'est pas inscriptible
- [ ] Affiche un message clair "Redémarrez le serveur pour finaliser l'installation"

### 2. Polish UX — points à vérifier/corriger

**Validation côté client (avant soumission) :**
- Email admin : format valide
- Mot de passe : minimum 8 caractères, confirmation identique
- DATABASE_URL : commence par `postgresql://` ou `postgres://`

**Feedback utilisateur :**
- Spinner pendant la soumission (le formulaire peut prendre 2-5s — migrations DB)
- Message d'erreur explicite si la DB est injoignable (ex: "Impossible de se connecter à la base. Vérifiez DATABASE_URL.")
- Message de succès avec les variables `.env.local` dans un bloc `<code>` copiable (bouton "Copier")

**Après install :**
- La page de succès doit lister clairement les 3 prochaines étapes :
  1. Copier le bloc `.env.local` (si pas écrit automatiquement)
  2. Redémarrer le serveur
  3. Se connecter sur `/login`

### 3. Vérifier le middleware de protection

Dans `src/middleware.ts`, vérifier que :
- Toutes les routes sauf `/install`, `/login`, et les assets statiques redirigent vers `/install` si `SAAS_INSTALLED !== "true"`
- Le wizard lui-même redirige vers `/` si `SAAS_INSTALLED === "true"` (déjà installé)

### 4. README update

Mettre à jour `docs/INSTALL.md` avec le résultat du test réel :
- Commande exacte pour créer la DB
- Note sur les droits d'écriture du fichier `.env.local` (root vs non-root)
- Temps estimé d'installation (objectif : < 2 minutes)

## Résultat attendu

Installation complète testée et documentée.
Un dev qui clone le repo peut être opérationnel en < 5 minutes.
