"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function createAdmin() {
    const email = "joe@ezwai.com";
    const password = "Admin123!"; // Default initial password
    const name = "Joe Machado";
    console.log(`Creating/Updating Admin: ${email}`);
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
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
//# sourceMappingURL=create_admin.js.map