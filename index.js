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
    env: { ...process.env }
  });
  console.log('Prisma migrations completed successfully.');
} catch (error) {
  console.error('Prisma migration failed:', error.message);
  // Continue anyway - tables might already exist
}

// Change working directory to backend so relative paths work
process.chdir(backendDir);

// Start the server
console.log('Starting Tradeline Marketplace server...');
require(serverPath);
