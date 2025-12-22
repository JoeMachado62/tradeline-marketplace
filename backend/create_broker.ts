
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

const prisma = new PrismaClient();

async function createBroker() {
  try {
    const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    console.log("Attempting to connect to DB...");
    
    // Create new broker for Joe
    const broker = await prisma.broker.create({
      data: {
        name: "Joe Machado",
        business_name: "EZWAI",
        email: "joe@ezwai.com",
        api_key: apiKey,
        status: "ACTIVE",
        settings: {
           create: {
             commission_percent: 10,
             theme_colors: {
               primary: "#2563eb",
               secondary: "#1e40af"
             }
           }
        }
      }
    });

    console.log('\n✅ SUCCESS! Broker Created.');
    console.log('---------------------------------------------------');
    console.log('HERE IS YOUR API KEY FOR GHL WIDGET:');
    console.log('\n' + broker.api_key + '\n');
    console.log('---------------------------------------------------');
    console.log('Copy this key and paste it into the apiKey field in ghl_integration_code.html');

  } catch (error: any) {
    if (error.code === 'P2002') {
        console.log('Broker already exists! Fetching existing key...');
        const existing = await prisma.broker.findUnique({ where: { email: 'joe@ezwai.com' } });
        if (existing) {
             console.log('\nEXISTING KEY:', existing.api_key);
        } else {
            console.log("Could not find existing broker despite P2002 error.");
        }
    } else {
        console.error('Error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createBroker();
