const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const count = await p.tradeline.count();
  console.log('Tradeline count:', count);
  if (count > 0) {
    const sample = await p.tradeline.findFirst();
    console.log('Sample tradeline:', sample);
  }
  await p.$disconnect();
}
check();
