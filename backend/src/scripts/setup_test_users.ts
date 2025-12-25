import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const TEST_PASSWORD = "PasswordTesting123!";
const TEST_EMAIL_ADMIN = "joe@ezwai.com";
const TEST_EMAIL_BROKER = "joe@ezwai.com";
const TEST_EMAIL_CLIENT = "testclient@example.com";

async function setupTestUsers() {
  console.log("🔧 Setting up test users with password:", TEST_PASSWORD);
  
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  console.log("Password hash generated.");

  // 1. Update/Create Admin
  console.log("\n📌 Setting up Admin...");
  const admin = await prisma.admin.upsert({
    where: { email: TEST_EMAIL_ADMIN },
    update: {
      password_hash: passwordHash,
    },
    create: {
      email: TEST_EMAIL_ADMIN,
      password_hash: passwordHash,
      name: "Joe Machado",
      role: "SUPER_ADMIN",
      is_active: true
    }
  });
  console.log(`   ✅ Admin: ${admin.email}`);

  // 2. Update/Create Broker
  console.log("\n📌 Setting up Broker...");
  const apiKey = `tlm_${crypto.randomBytes(32).toString("hex")}`;
  const apiSecretPlain = crypto.randomBytes(16).toString("hex");
  const apiSecretHashed = await bcrypt.hash(apiSecretPlain, 10);

  const broker = await prisma.broker.upsert({
    where: { email: TEST_EMAIL_BROKER },
    update: {
      password_hash: passwordHash,
    },
    create: {
      email: TEST_EMAIL_BROKER,
      password_hash: passwordHash,
      name: "Joe Machado",
      business_name: "EZWAI",
      business_address: "123 Test Street, Miami, FL 33101",
      phone: "555-555-5555",
      api_key: apiKey,
      api_secret: apiSecretHashed,
      status: "ACTIVE",
      revenue_share_percent: 10,
      markup_type: "PERCENTAGE",
      markup_value: 0
    }
  });
  console.log(`   ✅ Broker: ${broker.email}`);
  console.log(`   📋 API Key: ${broker.api_key}`);

  // 3. Update/Create Client (linked to the broker via an order relationship)
  console.log("\n📌 Setting up Client...");
  const client = await prisma.client.upsert({
    where: { email: TEST_EMAIL_CLIENT },
    update: {
      password_hash: passwordHash,
    },
    create: {
      email: TEST_EMAIL_CLIENT,
      password_hash: passwordHash,
      name: "Test Client User",
      phone: "555-123-4567",
      excluded_banks: []
    }
  });
  console.log(`   ✅ Client: ${client.email}`);

  console.log("\n══════════════════════════════════════════════");
  console.log("✅ ALL TEST USERS CONFIGURED");
  console.log("══════════════════════════════════════════════");
  console.log("\n Login Credentials for ALL portals:");
  console.log("───────────────────────────────────────────────");
  console.log(` Admin Portal:  ${TEST_EMAIL_ADMIN}`);
  console.log(` Broker Portal: ${TEST_EMAIL_BROKER}`);
  console.log(` Client Portal: ${TEST_EMAIL_CLIENT}`);
  console.log(` Password:      ${TEST_PASSWORD}`);
  console.log("───────────────────────────────────────────────");
  console.log(` Broker API Key: ${broker.api_key}`);
  console.log("══════════════════════════════════════════════\n");
}

setupTestUsers()
  .catch(e => console.error("Error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
