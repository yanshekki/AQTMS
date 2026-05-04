// ── AQTMS PM2 Ecosystem Configuration ──
// Usage:
//   pm2 start ecosystem.config.cjs              # Start all
//   pm2 start ecosystem.config.cjs --env production  # Production mode
//   pm2 logs aqtms-backend                       # Backend logs
//   pm2 monit                                     # Dashboard
//
// ⚠️ Multi-Core / Cluster Mode Notes:
//   - Socket.io requires @socket.io/redis-adapter for multi-instance
//   - Bee-Queue workers start inside backend main.ts; for cluster mode,
//     extract workers to separate PM2 processes (see templates below)
//   - Prisma uses shared singleton (shared/prisma.ts); cap pool via
//     DATABASE_URL="mysql://...?connection_limit=5" per instance
//   - Rate limiting (Redis) and JWT (stateless) are cluster-safe
//   - Default: instances=1 (single backend, no Socket.io issues)

module.exports = {
  apps: [
    // ── Backend API Server ──
    {
      name: 'aqtms-backend',
      cwd: './apps/backend',
      script: 'node_modules/.bin/tsx',
      args: 'src/main.ts',
      interpreter: 'node',
      // ── Environment Variables ──
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // ── Process Management ──
      instances: 1,              // Single instance (stateless JWT, scale with cluster later)
      exec_mode: 'fork',
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      watch: false,              // Disable watch in production; use --watch for dev
      // ── Logging ──
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
      // ── Graceful Shutdown ──
      kill_timeout: 10000,
      listen_timeout: 5000,
      wait_ready: true,
    },

    // ── Frontend Dev Server (Development only) ──
    {
      name: 'aqtms-frontend-dev',
      cwd: './apps/web',
      script: 'node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
      // Only start in dev mode
      env_production: {
        NODE_ENV: 'production',
        // Auto-disabled in production (use nginx + static build instead)
      },
    },

    // ── Frontend Static Server (Production) ──
    {
      name: 'aqtms-frontend',
      cwd: './apps/web',
      script: 'serve',
      args: 'dist -l 5173 --single',
      interpreter: 'none',       // Use serve binary directly
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '128M',
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-prod-error.log',
      out_file: './logs/frontend-prod-out.log',
      merge_logs: true,
    },

    // ── Queue Workers (optional, for dedicated worker processes) ──
    // IMPORTANT: When scaling backend to instances > 1, extract workers
    // to separate PM2 processes to avoid duplicate queue processors.
    //
    // {
    //   name: 'aqtms-worker-news',
    //   cwd: './apps/backend',
    //   script: 'node_modules/.bin/tsx',
    //   args: 'src/queues/workers/news.worker.ts',
    //   instances: 2,
    //   exec_mode: 'fork',
    //   env: { NODE_ENV: 'production' },
    //   max_memory_restart: '512M',
    // },
    // {
    //   name: 'aqtms-worker-ai',
    //   cwd: './apps/backend',
    //   script: 'node_modules/.bin/tsx',
    //   args: 'src/queues/workers/ai.worker.ts',
    //   instances: 3,
    //   exec_mode: 'fork',
    //   env: { NODE_ENV: 'production' },
    //   max_memory_restart: '1G',
    // },
    // {
    //   name: 'aqtms-worker-trade',
    //   cwd: './apps/backend',
    //   script: 'node_modules/.bin/tsx',
    //   args: 'src/queues/workers/trade.worker.ts',
    //   instances: 2,
    //   exec_mode: 'fork',
    //   env: { NODE_ENV: 'production' },
    //   max_memory_restart: '512M',
    // },
  ],

  // ── Deployment (optional: git-based deploy) ──
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yanshekki/AQTMS.git',
      path: '/var/www/aqtms',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
    },
  },
};
