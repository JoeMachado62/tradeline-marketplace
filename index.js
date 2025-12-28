const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env.production') });

const logFile = path.join(__dirname, 'startup.log');
function log(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp}: ${msg}\n`);
  console.log(`${timestamp}: ${msg}`);
}

log('Starting application from root index.js...');

// Handle unhandled exceptions
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}`);
  log(`Stack: ${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

try {
  const backendDir = path.join(__dirname, 'backend');
  
  // Run Migrations
  log('Running Prisma Migrations...');
  try {
    // Determine the prisma binary path if needed, but 'npx prisma' usually works
    execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
      cwd: backendDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    log('Migrations successful.');
  } catch (migErr) {
    log(`Migration FAILED: ${migErr.message}`);
  }

  // Start Server
  const serverPath = path.join(backendDir, 'dist', 'server.js');
  log(`Starting server from: ${serverPath}`);

  if (!fs.existsSync(serverPath)) {
    throw new Error(`Server file not found at ${serverPath}`);
  }

  // Change CWD to backend so relative paths work
  process.chdir(backendDir);
  
  // Require the server file to start it in this process
  require(serverPath);
  
} catch (err) {
  log(`CRITICAL STARTUP ERROR: ${err.message}`);
  log(err.stack);
  process.exit(1);
}
