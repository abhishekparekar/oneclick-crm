module.exports = {
  apps: [
    {
      name: "oneclick-backend",
      script: "src/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      max_restarts: 100,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
