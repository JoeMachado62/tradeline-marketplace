const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apiKey = 'tlm_02c2488d6724e0383c4f5cc870da89aa176e4eee615b747de6d89d3a5adc787e';
  
  const broker = await prisma.broker.findUnique({
    where: { api_key: apiKey },
  });

  if (!broker) {
    console.log('Broker not found for API Key:', apiKey);
    return;
  }

  console.log('--- BROKER INFO ---');
  console.log('ID:', broker.id);
  console.log('Name:', broker.name);
  console.log('Email:', broker.email);
  console.log('Has Password?', broker.password_hash ? 'YES' : 'NO');

  const orders = await prisma.order.findMany({
    where: { broker_id: broker.id },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      items: true
    }
  });

  console.log('\n--- RECENT ORDERS ---');
  if (orders.length === 0) {
    console.log('No orders found for this broker.');
  } else {
    orders.forEach(order => {
      console.log(`Order #${order.order_number} | ${order.customer_name} (${order.customer_email}) | Total: $${(order.total_charged / 100).toFixed(2)}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Date: ${order.created_at}`);
      console.log('   Items:', order.items ? order.items.length : 'N/A');
      console.log('-----------------------------------');
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
