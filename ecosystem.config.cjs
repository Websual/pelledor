/**
 * PM2 ecosystem config pour SaaS OS
 * Usage : pm2 start ecosystem.config.cjs
 *
 * Prérequis : .env.local configuré (DATABASE_URL, AUTH_SECRET, etc.)
 * Port : 3001 (changer si conflit)
 */
module.exports = {
  apps: [
    {
      name: "saas-os",
      script: "./node_modules/.bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
