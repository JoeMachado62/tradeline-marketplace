/**
 * Tradeline Marketplace - Hostinger Entry Point
 * This file runs Prisma migrations and then starts the server.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'backend');
const serverPath = path.join(backendDir, 'dist', 'server.js');

// Verify the server file exists
if (!fs.existsSync(serverPath)) {
  console.error('Error: backend/dist/server.js not found.');
  console.error('Please ensure the build completed successfully.');
  process.exit(1);
}

// Run Prisma migrations from the backend directory
console.log('Running Prisma migrations...');
try {
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('Prisma migrations completed successfully.');
} catch (err) {
  console.error('Prisma migrations failed:', err.message || err);
  // Continue anyway - tables might already exist
}

// Start the server
console.log('Starting server...');
try {
  execSync(`node ${serverPath}`, {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (err) {
  console.error('Server process exited with error:', err.message || err);
  process.exit(1);
}
