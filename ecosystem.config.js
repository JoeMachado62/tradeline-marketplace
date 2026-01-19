module.exports = {
  apps: [
    {
      name: 'tradeline-backend',
      cwd: '/opt/tradeline/backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'lux-worker',
      cwd: '/opt/tradeline/lux-worker',
      script: 'venv/bin/python',
      args: 'server.py',
      instances: 1,
      autorestart: true
    }
  ]
};
