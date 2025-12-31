const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Restoring brokers from SQLite migration...\n');

  // Generate password hashes
  const ezwaiPassword = await bcrypt.hash('ezwai123', 10);
  const creditServicesPassword = await bcrypt.hash('admin123', 10);
  
  // 1. Restore EZWAI broker (Joe Machado)
  const ezwaiApiKey = 'tlm_02c2488d6724e0383c4f5cc870da89aa176e4eee615b747de6d89d3a5adc787e';
  const ezwaiApiSecret = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  
  const ezwaiBroker = await prisma.broker.upsert({
    where: { email: 'joe@ezwai.com' },
    update: {
      name: 'Joe Machado',
      business_name: 'EZWAI',
      api_key: ezwaiApiKey,
      password_hash: ezwaiPassword,
      status: 'ACTIVE',
    },
    create: {
      name: 'Joe Machado',
      email: 'joe@ezwai.com',
      business_name: 'EZWAI',
      phone: '(305) 555-0200',
      api_key: ezwaiApiKey,
      api_secret: ezwaiApiSecret,
      password_hash: ezwaiPassword,
      status: 'ACTIVE',
      revenue_share_percent: 10,
      markup_type: 'PERCENTAGE',
      markup_value: 25, // 25% markup as shown in your screenshot
    }
  });
  
  console.log('✅ Broker 1 Restored: EZWAI (Joe Machado)');
  console.log('   ID:', ezwaiBroker.id);
  console.log('   Email: joe@ezwai.com');
  console.log('   Password: ezwai123');
  console.log('   API Key:', ezwaiApiKey);
  console.log('');

  // 2. Update Credit Services US broker with password
  const creditServicesApiKey = 'tlm_e85b34bce629fad76e5d7b0a58ed74b3c802ab102fd6b9eece5f1a6835cf5f27';
  
  const creditServicesBroker = await prisma.broker.upsert({
    where: { email: 'admin@creditservicesus.com' },
    update: {
      password_hash: creditServicesPassword,
      status: 'ACTIVE',
    },
    create: {
      name: 'Credit Services US',
      business_name: 'Credit Services US LLC',
      email: 'admin@creditservicesus.com',
      phone: '(305) 555-0100',
      business_address: '1395 Brickell Ave, Suite 800, Miami, FL 33131',
      api_key: creditServicesApiKey,
      api_secret: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      password_hash: creditServicesPassword,
      revenue_share_percent: 0,
      markup_type: 'PERCENTAGE',
      markup_value: 0,
      status: 'ACTIVE',
    }
  });
  
  console.log('✅ Broker 2 Updated: Credit Services US');
  console.log('   ID:', creditServicesBroker.id);
  console.log('   Email: admin@creditservicesus.com');
  console.log('   Password: admin123');
  console.log('   API Key:', creditServicesApiKey);
  console.log('');
  
  // List all brokers
  const allBrokers = await prisma.broker.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      business_name: true,
      api_key: true,
      status: true,
    }
  });
  
  console.log('📋 All Brokers in Database:');
  console.table(allBrokers);
  
  console.log('\n✨ Restore complete!');
  console.log('\n📝 Next Steps:');
  console.log('1. Log out of the broker portal (clear localStorage)');
  console.log('2. Log in again with: joe@ezwai.com / ezwai123');
  console.log('3. Update widget-config.js to use EZWAI API key if needed');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
