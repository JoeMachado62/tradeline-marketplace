
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabases() {
    try {
        const result = await prisma.$queryRaw`SHOW DATABASES`;
        console.log('Databases:', result);
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabases();
