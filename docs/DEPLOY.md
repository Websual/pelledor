# SaaS OS — Guide déploiement

## Prérequis

- Node.js ≥ 20
- PostgreSQL ≥ 15
- Nginx
- PM2 ou Systemd

## 1. Cloner et installer

```bash
git clone <repo> /var/www/mon-saas
cd /var/www/mon-saas
# Utiliser le lockfile du repo :
# - pnpm-lock.yaml => pnpm install
# - package-lock.json => npm install
pnpm install
```

## 2. Créer la base de données

```sql
CREATE DATABASE saas_demo;
CREATE USER saas_demo WITH PASSWORD 'VOTRE_MOT_DE_PASSE';
GRANT ALL PRIVILEGES ON DATABASE saas_demo TO saas_demo;
```

## 3. Configurer .env.local

```bash
cp .env.example .env.local
```

Remplir :
```
DATABASE_URL=postgresql://saas_demo:PASSWORD@localhost:5432/saas_demo
AUTH_SECRET=<32+ chars random>
ENCRYPTION_KEY=<64 hex chars>
NONCE_SALT=<random>
SECURE_AUTH_SALT=<random>
AUTH_URL=https://votre-domaine.com
```

Générer les secrets :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Migrer la base de données

```bash
pnpm db:push
# ou
pnpm db:migrate
```

## 5. Build (modules + Next.js)

```bash
pnpm run saas:build   # fusionne les modules dans src/
pnpm install          # installe d'éventuelles deps ajoutées par modules
pnpm run build        # compile Next.js production
```

## 6. Démarrer avec PM2

```bash
pm2 start ecosystem.config.cjs --only saas-os
pm2 save
pm2 startup
```

Fichier `ecosystem.config.cjs` :
```js
module.exports = {
  apps: [{
    name: "saas-os",
    script: "node_modules/.bin/next",
    args: "start -p 3001",
    cwd: "/var/www/mon-saas",
    env: { NODE_ENV: "production" },
    env_file: ".env.local"
  }]
};
```

## 7. Nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name mon-saas.fr www.mon-saas.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name mon-saas.fr www.mon-saas.fr;

    ssl_certificate /etc/letsencrypt/live/mon-saas.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mon-saas.fr/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 8. Première installation (wizard)

Accéder à `https://votre-domaine.com` → redirigé vers `/install`.

Remplir le formulaire :
- Nom du site
- Email admin
- Mot de passe admin (8+ chars)
- **Blueprint métier** (artisan, restaurant, gite, hotel, praticien, cabinet, immobilier, salon, boutique)

Une fois installé → accéder à `/admin/blueprint` pour appliquer le blueprint complet (modules + seed données).

## 9. Appliquer le blueprint

Dans `/admin/blueprint` :
1. Cliquer "Appliquer blueprint <métier>" pour activer les modules + créer les données de démo
2. Optionnel : modifier les tokens du site (nom entreprise, couleurs, etc.)
3. Rebuild si nécessaire : bouton "Mettre à jour le site" dans `/admin/blueprint`
   (ou CLI : `pnpm run saas:build && pnpm install && pnpm run build && pm2 restart saas-os`)

## Déploiement de démo sur sous-domaine

Pour un sous-domaine de démo (ex: `demo.saas-os.fr`) :
1. Pointer le DNS vers le serveur
2. `certbot --nginx -d demo.saas-os.fr`
3. Créer un site Nginx sur le port dédié (ex: 3010)
4. Lancer PM2 sur ce port
5. Accéder à `/install` et choisir le blueprint voulu

Chaque démo = instance indépendante avec sa propre DB et son propre blueprint.
