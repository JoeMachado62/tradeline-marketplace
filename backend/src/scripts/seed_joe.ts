
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedJoe() {
    const email = "joemachado62@live.com";
    const password = "PasswordTesting123!";

    console.log(`Creating client ${email}...`);

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await prisma.client.upsert({
        where: { email },
        update: { password_hash: passwordHash },
        create: {
            email,
            password_hash: passwordHash,
            name: "Joe Machado",
            phone: "2398881606",
            address: "2748 Lambay Ct, Cape Coral, FL 33991",
            date_of_birth: new Date("1969-01-07")
        }
    });

    console.log("Client created/updated:", client);
}

seedJoe()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
