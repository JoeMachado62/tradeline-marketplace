import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = "joe@ezwai.com";
  const password = "Admin123!"; // Default initial password
  const name = "Joe Machado";

  console.log(`Creating/Updating Admin: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
        password_hash: passwordHash,
        name,
        role: "SUPER_ADMIN",
        is_active: true
    },
    create: {
        email,
        password_hash: passwordHash,
        name,
        role: "SUPER_ADMIN",
        is_active: true
    }
  });

  console.log(`
  ✅ Admin Account Configured
  -------------------------
  Email: ${admin.email}
  Password: ${password}
  -------------------------
  `);
}

createAdmin()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
