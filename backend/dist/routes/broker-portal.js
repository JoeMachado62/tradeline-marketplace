"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const AuthService_1 = require("../services/AuthService");
const BrokerService_1 = require("../services/BrokerService");
const OrderService_1 = require("../services/OrderService");
const Database_1 = require("../services/Database");
const router = (0, express_1.Router)();
const authService = (0, AuthService_1.getAuthService)();
const brokerService = (0, BrokerService_1.getBrokerService)();
const orderService = (0, OrderService_1.getOrderService)();
/**
 * POST /api/portal/broker/login
 * Broker login via Email + Password
 */
router.post("/login", (0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.brokerLogin(email, password);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        res.status(401).json({
            error: error.message || "Login failed",
            code: "LOGIN_FAILED"
        });
    }
});
/**
 * GET /api/portal/broker/me
 * Get current broker profile
 */
router.get("/me", auth_1.authenticateBrokerJWT, async (req, res) => {
    try {
        const broker = await Database_1.prisma.broker.findUnique({
            where: { id: req.broker.id },
            select: {
                id: true,
                name: true,
                email: true,
                business_name: true,
                business_address: true,
                phone: true,
                api_key: true, // Needed for display
                status: true,
                revenue_share_percent: true,
                markup_type: true,
                markup_value: true,
                allow_promo_codes: true,
                primary_color: true,
                secondary_color: true,
            }
        });
        if (!broker) {
            return res.status(404).json({ error: "Broker not found" });
        }
        return res.json({ success: true, broker });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
});
/**
 * PUT /api/portal/broker/settings
 * Update broker settings (markup, etc.)
 */
router.put("/settings", auth_1.authenticateBrokerJWT, (0, validation_1.validate)([
    (0, express_validator_1.body)("markup_type").optional().isIn(["PERCENTAGE", "FIXED"]),
    (0, express_validator_1.body)("markup_value").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("allow_promo_codes").optional().isBoolean(),
    (0, express_validator_1.body)("primary_color").optional().isHexColor(),
    (0, express_validator_1.body)("secondary_color").optional().isHexColor(),
]), async (req, res) => {
    try {
        const { markup_type, markup_value, allow_promo_codes, primary_color, secondary_color } = req.body;
        const updateData = {};
        if (markup_type !== undefined)
            updateData.markup_type = markup_type;
        if (markup_value !== undefined)
            updateData.markup_value = parseFloat(markup_value);
        if (allow_promo_codes !== undefined)
            updateData.allow_promo_codes = allow_promo_codes;
        if (primary_color !== undefined)
            updateData.primary_color = primary_color;
        if (secondary_color !== undefined)
            updateData.secondary_color = secondary_color;
        const broker = await Database_1.prisma.broker.update({
            where: { id: req.broker.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                markup_type: true,
                markup_value: true,
                revenue_share_percent: true,
            }
        });
        return res.json({
            success: true,
            broker,
            message: "Settings updated successfully"
        });
    }
    catch (error) {
        console.error("Update settings error:", error);
        return res.status(500).json({ error: "Failed to update settings" });
    }
});
/**
 * GET /api/portal/broker/dashboard
 * Get dashboard stats
 */
router.get("/dashboard", auth_1.authenticateBrokerJWT, async (req, res) => {
    try {
        const stats = await brokerService.getBrokerStats(req.broker.id);
        return res.json({ success: true, stats });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
});
/**
 * GET /api/portal/broker/orders
 * List orders for this broker
 */
router.get("/orders", auth_1.authenticateBrokerJWT, (0, validation_1.validate)([
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("status").optional(),
]), async (req, res) => {
    try {
        const result = await orderService.getBrokerOrders(req.broker.id, {
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20,
            status: req.query.status
        });
        return res.json({ success: true, ...result });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to fetch orders" });
    }
});
/**
 * GET /api/portal/broker/documents/:type/:filename
 * Serve uploaded documents safely
 */
router.get("/documents/:type/*", auth_1.authenticateBrokerJWT, async (req, res) => {
    try {
        const type = req.params.type;
        const filename = req.params[0]; // Capture wildcard
        const { S3Service } = require("../services/S3Service");
        if (!["id_document", "ssn_document"].includes(type)) {
            return res.status(400).json({ error: "Invalid document type" });
        }
        if (S3Service.isConfigured()) {
            const signedUrl = await S3Service.getSignedUrl(filename);
            return res.json({ success: true, url: signedUrl });
        }
        // Fallback for local files
        const path = require("path");
        const fs = require("fs");
        const filePath = path.join(process.cwd(), "uploads", "documents", filename);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filename).toLowerCase();
            const contentTypes = {
                ".pdf": "application/pdf",
                ".jpg": "image/jpeg",
                ".png": "image/png"
            };
            res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            return;
        }
        return res.status(404).json({ error: "Document not found" });
    }
    catch (error) {
        console.error("Document serve error:", error);
        return res.status(500).json({ error: "Failed to serve document" });
    }
});
exports.default = router;
//# sourceMappingURL=broker-portal.js.map