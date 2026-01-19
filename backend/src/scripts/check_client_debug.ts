
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkClient() {
    const email = 'joemachado62@live.com';
    console.log(`Checking for client with email: ${email}`);
    try {
        const client = await prisma.client.findUnique({
            where: { email },
        });

        if (client) {
            console.log('Client found:', client);
            if (client.password_hash) {
                console.log('Password hash exists.');
            } else {
                console.log('Password hash is MISSING.');
            }
        } else {
            // Try finding by any matching email (case insensitive maybe?)
            const allClients = await prisma.client.findMany();
            const sensitiveMatch = allClients.find(c => c.email.toLowerCase() === email.toLowerCase());
            if (sensitiveMatch) {
                console.log('Client found with case mismatch:', sensitiveMatch);
            } else {
                console.log('Client NOT found.');
                console.log('Listing all clients:', allClients.map(c => c.email));
            }

        }
    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkClient();
