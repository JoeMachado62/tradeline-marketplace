const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const apiKey = 'tlm_02c2488d6724e0383c4f5cc870da89aa176e4eee615b747de6d89d3a5adc787e';
  const email = 'admin@creditservicesus.com';
  
  // 1. UPDATE PASSWORD
  const passwordHash = await bcrypt.hash('admin123', 10);
  const updatedBroker = await prisma.broker.update({
    where: { email: email },
    data: { password_hash: passwordHash }
  });
  console.log(`✅ Updated password for ${email} to 'admin123'`);

  // 2. FIND ALL RECENT ORDERS
  console.log('\n--- ALL RECENT ORDERS (Last 5) ---');
  const orders = await prisma.order.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: {
      items: true,
      broker: true
    }
  });

  if (orders.length === 0) {
    console.log('No orders found in the entire database.');
  } else {
    orders.forEach(order => {
      console.log(`Order #${order.order_number} | ID: ${order.id}`);
      console.log(`   Customer: ${order.customer_name} (${order.customer_email})`);
      console.log(`   Broker: ${order.broker ? order.broker.name : 'NULL'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Date: ${order.created_at}`);
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
