import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create default broker for marketing site widget
  const brokerApiKey = `tlm_${crypto.randomBytes(32).toString('hex')}`;
  const brokerApiSecret = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  
  const defaultBroker = await prisma.broker.upsert({
    where: { email: 'admin@creditservicesus.com' },
    update: {},
    create: {
      name: 'Credit Services US',
      business_name: 'Credit Services US LLC',
      email: 'admin@creditservicesus.com',
      phone: '(305) 555-0100',
      business_address: '1395 Brickell Ave, Suite 800, Miami, FL 33131',
      api_key: brokerApiKey,
      api_secret: brokerApiSecret,
      revenue_share_percent: 0, // No commission for house broker
      markup_type: 'PERCENTAGE',
      markup_value: 0,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created default broker:', defaultBroker.business_name);
  console.log('📝 API Key for widget config:', brokerApiKey);

  // 2. Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@creditservicesus.com' },
    update: {},
    create: {
      email: 'admin@creditservicesus.com',
      password_hash: adminPassword,
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      is_active: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);
  console.log('🔑 Admin password: admin123 (change this in production!)');

  // 3. Output widget configuration
  console.log('\n📦 Widget Configuration for widget-config.js:');
  console.log('─'.repeat(50));
  console.log(`apiKey: '${brokerApiKey}'`);
  console.log('─'.repeat(50));

  // Save the API key to a file for easy reference
  const fs = require('fs');
  fs.writeFileSync(
    './generated_credentials.txt',
    `Credit Services US - Local Development Credentials
Generated: ${new Date().toISOString()}

BROKER API KEY (for widget):
${brokerApiKey}

ADMIN LOGIN:
Email: admin@creditservicesus.com
Password: admin123 (change in production!)
`
  );
  console.log('\n💾 Credentials saved to: backend/generated_credentials.txt');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✨ Seeding complete!');
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
