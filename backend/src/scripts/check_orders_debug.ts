
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listOrders() {
    try {
        const orders = await prisma.order.findMany();
        console.log(`Total orders in DB: ${orders.length}`);
        orders.forEach(o => {
            console.log(`- Order: ${o.order_number} (ID: ${o.id}) - Status: ${o.status}`);
        });

        // Check specifically for the one mentioned earlier if possible
        // The user mentioned TLM26011313
        const target = orders.find(o => o.order_number === 'TLM26011313');
        if (target) {
            console.log("Order TLM26011313 EXISTS.");
        } else {
            console.log("Order TLM26011313 does NOT exist.");
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listOrders();
