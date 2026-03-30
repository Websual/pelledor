#!/bin/bash
set -a
source /var/www/saas-os/.env.local
set +a
export SAAS_INSTALLED=false
export NODE_ENV=production
exec node /var/www/saas-os/node_modules/.bin/next start -p 3350
