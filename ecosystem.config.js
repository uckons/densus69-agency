module.exports = {
  apps: [
    {
      name: "densus69-agency",
      script: "server.js",
      cwd: "/var/www/densus69-agency",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
}
