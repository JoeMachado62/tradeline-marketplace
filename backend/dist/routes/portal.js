"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const Database_1 = require("../services/Database");
const validation_1 = require("../middleware/validation");
const clientAuth_1 = require("../middleware/clientAuth");
const PricingEngine_1 = require("../services/PricingEngine");
const EmailService_1 = require("../services/EmailService");
const router = (0, express_1.Router)();
// POST /api/portal/login
router.post("/login", (0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isString().notEmpty(),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Database_1.prisma.client.findUnique({ where: { email } });
        if (!client || !client.password_hash) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const valid = await bcrypt_1.default.compare(password, client.password_hash);
        if (!valid) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        // Generate token
        const token = jsonwebtoken_1.default.sign({ id: client.id, role: "CLIENT" }, config_1.config.jwt.secret, { expiresIn: "7d" });
        res.json({
            success: true,
            token,
            client: {
                id: client.id,
                name: client.name,
                email: client.email,
                has_signed_agreement: !!client.signed_agreement_date,
                signed_agreement_date: client.signed_agreement_date
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});
// GET /api/portal/profile
router.get("/profile", clientAuth_1.authenticateClient, async (req, res) => {
    try {
        const client = req.client;
        // Refetch to ensure latest data
        const freshClient = await Database_1.prisma.client.findUnique({ where: { id: client.id } });
        if (!freshClient) {
            res.status(404).json({ error: "Client not found" });
            return;
        }
        res.json({
            success: true,
            client: {
                id: freshClient.id,
                name: freshClient.name,
                email: freshClient.email,
                phone: freshClient.phone,
                has_signed_agreement: !!freshClient.signed_agreement_date,
                signed_agreement_date: freshClient.signed_agreement_date,
                id_document_uploaded: !!freshClient.id_document_path, // Boolean for UI
                ssn_document_uploaded: !!freshClient.ssn_document_path, // Boolean for UI
                // We don't return the path itself for security, 
                // but we could add a specific endpoint to download them if needed.
            }
        });
    }
    catch (error) {
        console.error("Fetch profile error:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
// GET /api/portal/orders - My Orders
router.get("/orders", clientAuth_1.authenticateClient, async (req, res) => {
    try {
        const client = req.client;
        const orders = await Database_1.prisma.order.findMany({
            where: { client_id: client.id },
            include: {
                items: true,
                broker: { select: { name: true, business_name: true, phone: true, email: true } } // Client sees who they bought from?
            },
            orderBy: { created_at: "desc" },
        });
        res.json({
            success: true,
            orders: orders.map((o) => ({
                ...o,
                total_charged_usd: PricingEngine_1.PricingEngine.centsToUsd(o.total_charged),
                item_count: o.items.length
            }))
        });
    }
    catch (error) {
        console.error("Fetch orders error:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// GET /api/portal/orders/:id - Order Details
router.get("/orders/:id", clientAuth_1.authenticateClient, (0, validation_1.validate)([(0, express_validator_1.param)("id").isUUID()]), async (req, res) => {
    try {
        const client = req.client;
        const orderId = req.params.id;
        const order = await Database_1.prisma.order.findFirst({
            where: {
                id: orderId,
                client_id: client.id
            },
            include: {
                items: true,
                broker: {
                    select: {
                        name: true,
                        business_name: true,
                        email: true,
                        phone: true,
                        // If we have custom payment instructions per broker, fetch here
                        // e.g. broker.payment_instructions
                    }
                }
            }
        });
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        res.json({
            success: true,
            order: {
                ...order,
                total_charged_usd: PricingEngine_1.PricingEngine.centsToUsd(order.total_charged),
                // We can attach generic payment instructions here if platform-wide
            }
        });
    }
    catch (error) {
        console.error("Fetch order detail error:", error);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
// POST /api/portal/forgot-password
router.post("/forgot-password", (0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
]), async (req, res) => {
    try {
        const { email } = req.body;
        const client = await Database_1.prisma.client.findUnique({ where: { email } });
        // Always return success to prevent email enumeration
        if (!client) {
            res.json({ success: true, message: "If an account exists, a reset link will be sent." });
            return;
        }
        // Generate reset token (valid for 1 hour)
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        // Store token in database
        await Database_1.prisma.client.update({
            where: { id: client.id },
            data: {
                reset_token: resetToken,
                reset_token_expires: resetExpires,
            },
        });
        // Build reset URL
        const baseUrl = process.env.PUBLIC_URL || "https://tradeline-marketplace-production-bcaa.up.railway.app";
        const resetUrl = `${baseUrl}/portal/reset-password?token=${resetToken}`;
        await (0, EmailService_1.getEmailService)().sendPasswordReset(email, resetToken);
        console.log(`Password reset sent to ${email}`);
        res.json({
            success: true,
            message: "If an account exists, a reset link will be sent.",
            // DEV ONLY - remove in production:
            ...(process.env.NODE_ENV !== 'production' && { resetUrl })
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: "Failed to process request" });
    }
});
// POST /api/portal/validate-reset-token
router.post("/validate-reset-token", (0, validation_1.validate)([
    (0, express_validator_1.body)("token").isString().notEmpty(),
]), async (req, res) => {
    try {
        const { token } = req.body;
        const client = await Database_1.prisma.client.findFirst({
            where: {
                reset_token: token,
                reset_token_expires: { gt: new Date() },
            },
        });
        if (!client) {
            res.status(400).json({ valid: false, error: "Invalid or expired reset token" });
            return;
        }
        res.json({ valid: true });
    }
    catch (error) {
        console.error("Validate token error:", error);
        res.status(500).json({ error: "Failed to validate token" });
    }
});
// POST /api/portal/reset-password
router.post("/reset-password", (0, validation_1.validate)([
    (0, express_validator_1.body)("token").isString().notEmpty(),
    (0, express_validator_1.body)("password").isString().isLength({ min: 8 }),
]), async (req, res) => {
    try {
        const { token, password } = req.body;
        const client = await Database_1.prisma.client.findFirst({
            where: {
                reset_token: token,
                reset_token_expires: { gt: new Date() },
            },
        });
        if (!client) {
            res.status(400).json({ error: "Invalid or expired reset token" });
            return;
        }
        // Hash new password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Update password and clear reset token
        await Database_1.prisma.client.update({
            where: { id: client.id },
            data: {
                password_hash: passwordHash,
                reset_token: null,
                reset_token_expires: null,
            },
        });
        console.log(`Password reset successful for ${client.email}`);
        res.json({ success: true, message: "Password reset successfully" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});
exports.default = router;
//# sourceMappingURL=portal.js.map