"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
exports.getAuthService = getAuthService;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Database_1 = require("./Database");
const config_1 = require("../config");
class AuthService {
    /**
     * Generate JWT token
     */
    generateToken(payload, expiresIn) {
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
            expiresIn: (expiresIn || config_1.config.jwt.expiry),
        });
    }
    /**
     * Admin login
     */
    async adminLogin(email, password) {
        // Try database first
        const admin = await Database_1.prisma.admin.findUnique({
            where: { email },
        });
        if (admin && admin.is_active) {
            const isValid = await bcryptjs_1.default.compare(password, admin.password_hash);
            if (!isValid) {
                throw new Error("Invalid credentials");
            }
            // Update last login
            await Database_1.prisma.admin.update({
                where: { id: admin.id },
                data: { last_login: new Date() },
            });
            // Generate token
            const token = this.generateToken({
                id: admin.id,
                email: admin.email,
                role: admin.role,
                type: "admin",
            });
            return {
                admin: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                },
                token,
            };
        }
        // Fallback: check environment variables (for initial setup/production)
        const envEmail = process.env.ADMIN_EMAIL;
        const envPassword = process.env.ADMIN_PASSWORD;
        if (envEmail && envPassword && email === envEmail && password === envPassword) {
            const token = this.generateToken({
                id: "env-admin-1",
                email: envEmail,
                role: "SUPER_ADMIN",
                type: "admin",
            });
            return {
                admin: {
                    id: "env-admin-1",
                    email: envEmail,
                    name: "Admin",
                    role: "SUPER_ADMIN",
                },
                token,
            };
        }
        throw new Error("Invalid credentials");
    }
    /**
     * Broker portal login (uses password, not API secret)
     */
    async brokerLogin(email, password) {
        const broker = await Database_1.prisma.broker.findUnique({
            where: { email },
        });
        if (!broker || broker.status !== "ACTIVE") {
            throw new Error("Invalid credentials");
        }
        // Check if broker has a password set
        if (!broker.password_hash) {
            throw new Error("Password not set. Please contact support.");
        }
        // Verify password
        const isValid = await bcryptjs_1.default.compare(password, broker.password_hash);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        // Generate token
        const token = this.generateToken({
            id: broker.id,
            email: broker.email,
            type: "broker",
        });
        return {
            broker: {
                id: broker.id,
                email: broker.email,
                name: broker.name,
                business_name: broker.business_name,
                api_key: broker.api_key,
                revenue_share_percent: broker.revenue_share_percent || 10,
            },
            token,
        };
    }
    /**
     * Create initial admin account
     */
    async createInitialAdmin() {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@tradelinerental.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        // Check if admin exists
        const existing = await Database_1.prisma.admin.findUnique({
            where: { email: adminEmail },
        });
        if (existing) {
            console.log("Admin account already exists");
            return;
        }
        // Create admin
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
        await Database_1.prisma.admin.create({
            data: {
                email: adminEmail,
                password_hash: passwordHash,
                name: "System Admin",
                role: "SUPER_ADMIN",
            },
        });
        console.log(`Initial admin created: ${adminEmail}`);
    }
}
exports.AuthService = AuthService;
// Singleton instance
let authInstance = null;
function getAuthService() {
    if (!authInstance) {
        authInstance = new AuthService();
    }
    return authInstance;
}
//# sourceMappingURL=AuthService.js.map