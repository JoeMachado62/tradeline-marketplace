
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAndVerify() {
    const email = 'joemachado62@live.com';
    const newPassword = 'PasswordTesting123!';

    try {
        const client = await prisma.client.findUnique({ where: { email } });
        if (!client) {
            console.log('Client not found');
            return;
        }

        // 1. Reset password manually
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.client.update({
            where: { id: client.id },
            data: { password_hash: passwordHash }
        });
        console.log(`Password reset to: ${newPassword}`);

        // 2. Verify login logic
        const updatedClient = await prisma.client.findUnique({ where: { email } });
        if (!updatedClient) return;

        const valid = await bcrypt.compare(newPassword, updatedClient.password_hash!);
        console.log(`Login verification with '${newPassword}': ${valid ? 'SUCCESS' : 'FAILED'}`);

        // 3. Check "temp1234" just in case the old one was that
        const validTemp = await bcrypt.compare("temp1234", updatedClient.password_hash!);
        console.log(`Login verification with 'temp1234': ${validTemp ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAndVerify();
