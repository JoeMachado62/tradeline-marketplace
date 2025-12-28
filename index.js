/**
 * Tradeline Marketplace - Hostinger Entry Point
 */
const { execSync } = require('child_process');
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

log('=== Tradeline Marketplace Startup ===');
log(`Current directory: ${__dirname}`);
log(`Node version: ${process.version}`);

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

// Skip Prisma migrations for now - tables should already exist
// The database connection will be established when the server starts
log('Skipping Prisma migrations (will run on server start if needed)...');

// Change working directory to backend
process.chdir(backendDir);
log(`Changed working directory to: ${process.cwd()}`);

// Start the server using require() - this works because we're in the same Node process
log('Starting server with require()...');
try {
  require(serverPath);
  log('Server module loaded successfully.');
} catch (err) {
  log(`Server failed to start: ${err.message}`);
  log(`Stack: ${err.stack}`);
  process.exit(1);
}
