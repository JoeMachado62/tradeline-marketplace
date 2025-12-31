const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBrokers() {
  try {
    const brokers = await prisma.broker.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        business_name: true,
        api_key: true,
        status: true,
        markup_type: true,
        markup_value: true,
      }
    });
    
    console.log('=== BROKERS IN DATABASE ===\n');
    
    brokers.forEach((b, i) => {
      console.log(`[${i+1}] ${b.business_name || b.name}`);
      console.log(`    Name: ${b.name}`);
      console.log(`    Email: ${b.email}`);
      console.log(`    Status: ${b.status}`);
      console.log(`    API Key: ${b.api_key}`);
      console.log(`    Markup: ${b.markup_value}% (${b.markup_type})`);
      console.log('');
    });
    
    console.log(`Total: ${brokers.length} broker(s)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrokers();
