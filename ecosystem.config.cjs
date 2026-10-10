// pm2: `npm run build && pm2 startOrReload ecosystem.config.cjs`
module.exports = {
  apps: [
    {
      name: "latin-vocab",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3101",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
    },
  ],
};
