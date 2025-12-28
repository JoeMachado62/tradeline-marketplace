/**
 * Tradeline Marketplace - Hostinger Entry Point
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'startup.log');

// Log function that writes to file
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

// Verify the server file exists
if (!fs.existsSync(serverPath)) {
  log('ERROR: backend/dist/server.js not found.');
  process.exit(1);
}

// List what's in backend/dist
try {
  const distContents = fs.readdirSync(path.join(backendDir, 'dist'));
  log(`Contents of backend/dist: ${distContents.join(', ')}`);
} catch (err) {
  log(`Error reading dist folder: ${err.message}`);
}

// Run Prisma migrations
log('Running Prisma migrations...');
try {
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
  log('Prisma migrations completed successfully.');
} catch (err) {
  log(`Prisma migrations failed: ${err.message || err}`);
}

// Start the server using spawn (keeps running)
log('Starting server with spawn...');
process.chdir(backendDir);
log(`Changed working directory to: ${process.cwd()}`);

// Use spawn instead of execSync so the server can keep running
const server = spawn('node', ['dist/server.js'], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (err) => {
  log(`Server spawn error: ${err.message}`);
});

server.on('exit', (code) => {
  log(`Server exited with code: ${code}`);
});
