/**
 * Tradeline Marketplace - Hostinger Entry Point
 */
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'startup.log');

// Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(message);
}

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}`);
  log(`Stack: ${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`UNHANDLED REJECTION: ${reason}`);
  process.exit(1);
});

log('=== Tradeline Marketplace Startup ===');
log(`Current directory: ${__dirname}`);
log(`Node version: ${process.version}`);

const backendDir = path.join(__dirname, 'backend');
const serverPath = path.join(backendDir, 'dist', 'server.js');

// Load environment variables from .env.production if it exists
const envProductionPath = path.join(backendDir, '.env.production');
const envPath = path.join(backendDir, '.env');

if (fs.existsSync(envProductionPath)) {
  log(`Loading environment from: ${envProductionPath}`);
  require('dotenv').config({ path: envProductionPath });
} else if (fs.existsSync(envPath)) {
  log(`Loading environment from: ${envPath}`);
  require('dotenv').config({ path: envPath });
} else {
  log('No .env file found, relying on system environment variables');
}

log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);

log(`Backend directory: ${backendDir}`);
log(`Server path: ${serverPath}`);
log(`Backend exists: ${fs.existsSync(backendDir)}`);
log(`Server exists: ${fs.existsSync(serverPath)}`);

if (!fs.existsSync(serverPath)) {
  log('ERROR: backend/dist/server.js not found.');
  process.exit(1);
}

// Change working directory to backend
process.chdir(backendDir);
log(`Changed working directory to: ${process.cwd()}`);

// Run Prisma migrations at runtime (env vars are now available)
log('Running Prisma migrations...');
try {
  const { execSync } = require('child_process');
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env
  });
  log('Prisma migrations completed successfully.');
} catch (err) {
  log(`Prisma migrations failed: ${err.message}`);
  // Continue anyway - tables might already exist
}

// Start the server
log('Starting server with require()...');
require(serverPath);
log('Server module loaded successfully.');
