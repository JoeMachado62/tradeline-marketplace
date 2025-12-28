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
log(`Environment variables: DATABASE_URL=${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);

const backendDir = path.join(__dirname, 'backend');
const serverPath = path.join(backendDir, 'dist', 'server.js');

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

// Start the server
log('Starting server with require()...');
require(serverPath);
log('Server module loaded - if you see this, require() succeeded.');
