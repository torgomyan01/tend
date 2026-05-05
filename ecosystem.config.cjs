/** PM2 — Next.js միայն։ Webhook-ը առանձին է՝ /var/www/tend-deploy-hook/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "tend",
      cwd: "/var/www/tend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "/usr/bin/node",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        PATH: "/usr/bin:/usr/local/bin:/bin",
      },
    },
  ],
};
