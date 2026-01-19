
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Admin Users...");
    const admins = await prisma.admin.findMany();
    console.log("Found admins:", admins.map(a => ({ email: a.email, id: a.id })));

    const targetEmail = "admin@creditservicesus.com";
    const joeEmail = "joe@ezwai.com";
    const password = "PasswordTesting123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check/Fix Joe
    let joe = await prisma.admin.findUnique({ where: { email: joeEmail } });
    if (joe) {
        console.log(`Updating password for ${joeEmail}...`);
        await prisma.admin.update({
            where: { email: joeEmail },
            data: { password_hash: hashedPassword }
        });
    } else {
        console.log(`Creating admin ${joeEmail}...`);
        await prisma.admin.create({
            data: {
                email: joeEmail,
                name: "Joe Machado",
                password_hash: hashedPassword,
                role: "SUPER_ADMIN"
            }
        });
    }

    // Check/Fix Other Admin
    let adminUser = await prisma.admin.findUnique({ where: { email: targetEmail } });
    if (adminUser) {
        console.log(`Updating password for ${targetEmail}...`);
        await prisma.admin.update({
            where: { email: targetEmail },
            data: { password_hash: hashedPassword }
        });
    } else {
        console.log(`Creating admin ${targetEmail}...`);
        await prisma.admin.create({
            data: {
                email: targetEmail,
                name: "Admin User",
                password_hash: hashedPassword,
                role: "ADMIN"
            }
        });
    }

    console.log("Done. All admins set to password: " + password);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
