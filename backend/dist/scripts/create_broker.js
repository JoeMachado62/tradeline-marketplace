"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function createBroker() {
    try {
        const email = "joe@ezwai.com";
        console.log(`Checking for existing broker: ${email}...`);
        // Check if broker already exists
        const existing = await prisma.broker.findUnique({ where: { email } });
        if (existing) {
            console.log('\n✅ Broker already exists.');
            console.log('---------------------------------------------------');
            console.log('ID:', existing.id);
            console.log('Name:', existing.name);
            console.log('API KEY:', existing.api_key);
            console.log('---------------------------------------------------');
            console.log('NOTE: If you need to rotate the key, you must update the database manually or use the admin API.');
            return;
        }
        console.log("Creating new broker...");
        // Generate credentials following BrokerService conventions
        const apiKey = `tlm_${crypto_1.default.randomBytes(32).toString("hex")}`;
        const apiSecretPlain = crypto_1.default.randomBytes(16).toString("hex");
        const apiSecretHashed = await bcryptjs_1.default.hash(apiSecretPlain, 10);
        const broker = await prisma.broker.create({
            data: {
                name: "Joe Machado",
                business_name: "EZWAI",
                email: email,
                api_key: apiKey,
                api_secret: apiSecretHashed,
                status: "ACTIVE",
                revenue_share_percent: 10,
                markup_type: "PERCENTAGE",
                markup_value: 0
            }
        });
        console.log('\n✅ SUCCESS! Broker Created.');
        console.log('---------------------------------------------------');
        console.log('HERE IS YOUR API KEY FOR GHL WIDGET:');
        console.log('\n' + broker.api_key + '\n');
        console.log('---------------------------------------------------');
        console.log('API SECRET (Keep safe, shown only once):');
        console.log(apiSecretPlain);
        console.log('---------------------------------------------------');
    }
    catch (error) {
        console.error('Error creating broker:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
createBroker();
//# sourceMappingURL=create_broker.js.map