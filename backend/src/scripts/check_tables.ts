
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
    try {
        const result = await prisma.$queryRaw`SHOW TABLES`;
        console.log('Tables in database:', result);

        // Also try to count admins
        try {
            const admins = await prisma.admin.findMany();
            console.log(`Found ${admins.length} admins.`);
        } catch (e) {
            console.log("Could not query admins (tables might be missing).");
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
