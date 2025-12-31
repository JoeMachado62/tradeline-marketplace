const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apiKey = 'tlm_02c2488d6724e0383c4f5cc870da89aa176e4eee615b747de6d89d3a5adc787e';
  
  console.log('Restoring broker with API Key:', apiKey);

  const broker = await prisma.broker.upsert({
    where: { api_key: apiKey },
    update: {
      status: 'ACTIVE'
    },
    create: {
      name: 'Joe Machado',
      email: 'joe@ezwai.com', 
      business_name: 'EZWAI',
      api_key: apiKey,
      api_secret: 'restored_secret_' + Date.now(), // Secret doesn't matter for widget, only key
      status: 'ACTIVE',
      revenue_share_percent: 10,
      markup_type: 'PERCENTAGE',
      markup_value: 0
    }
  });

  console.log('Broker restored:', broker);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
