/**
 * Tradeline Marketplace - Hostinger Entry Point
 */
const path = require('path');
const fs = require('fs');

// Path to the built server
const serverPath = path.join(__dirname, 'backend', 'dist', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error('Error: backend/dist/server.js not found. Please run npm run build first.');
  process.exit(1);
}

// Start the server
console.log('Starting Tradeline Marketplace from:', serverPath);
require(serverPath);
