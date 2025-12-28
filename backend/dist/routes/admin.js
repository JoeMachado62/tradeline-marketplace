"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const AuthService_1 = require("../services/AuthService");
const Database_1 = require("../services/Database");
const config_1 = require("../config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = (0, express_1.Router)();
const authService = (0, AuthService_1.getAuthService)();
// Middleware
const authenticateAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing authorization" });
        return;
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        if (decoded.type !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }
        req.admin = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Invalid token" });
        return;
    }
};
/**
 * POST /api/admin/login
 */
router.post("/login", (0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").notEmpty(),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.adminLogin(email, password);
        res.json({ success: true, ...result });
    }
    catch (error) {
        res.status(401).json({ error: error.message || "Login failed", code: "LOGIN_FAILED" });
    }
});
/**
 * GET /api/admin/dashboard
 */
router.get("/dashboard", authenticateAdmin, async (_req, res) => {
    try {
        const stats = {
            brokers: await Database_1.prisma.broker.count(),
            active_brokers: await Database_1.prisma.broker.count({ where: { status: "ACTIVE" } }),
            orders_total: await Database_1.prisma.order.count(),
            orders_pending: await Database_1.prisma.order.count({ where: { status: "PENDING" } }),
            // Revenue sums (simple aggregation)
            revenue_platform: await Database_1.prisma.order.aggregate({
                _sum: { platform_net_revenue: true },
                where: { status: "COMPLETED" }
            }).then((r) => (r._sum.platform_net_revenue || 0) / 100), // USD
        };
        // Recent orders
        const recent_orders = await Database_1.prisma.order.findMany({
            take: 10,
            orderBy: { created_at: 'desc' },
            include: { broker: { select: { name: true } } }
        });
        res.json({ success: true, stats, recent_orders });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Dashboard error" });
    }
});
/**
 * BROKER MANAGEMENT
 */
// GET /api/admin/brokers
router.get("/brokers", authenticateAdmin, async (_req, res) => {
    try {
        const brokers = await Database_1.prisma.broker.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                id: true, name: true, business_name: true, business_address: true, email: true, phone: true,
                status: true, created_at: true, revenue_share_percent: true, api_key: true
            }
        });
        res.json({ success: true, brokers });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch brokers" });
    }
});
// POST /api/admin/brokers - Onboard new broker
router.post("/brokers", authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.body)("name").notEmpty().withMessage("Contact name is required"),
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("business_name").notEmpty().withMessage("Legal Business Name is required"),
    (0, express_validator_1.body)("business_address").notEmpty().withMessage("Business Address is required"),
    (0, express_validator_1.body)("phone").notEmpty().withMessage("Phone number is required"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("revenue_share").isInt({ min: 0, max: 100 }).optional(),
]), async (req, res) => {
    try {
        const { name, email, business_name, business_address, phone, password, revenue_share } = req.body;
        const existing = await Database_1.prisma.broker.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: "Broker email already exists" });
            return;
        }
        const apiKey = `tlm_${crypto_1.default.randomBytes(32).toString("hex")}`;
        const apiSecretPlain = crypto_1.default.randomBytes(16).toString("hex");
        const apiSecretHashed = await bcryptjs_1.default.hash(apiSecretPlain, 10);
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const broker = await Database_1.prisma.broker.create({
            data: {
                name,
                email,
                business_name,
                business_address,
                phone,
                revenue_share_percent: revenue_share || 10,
                api_key: apiKey,
                api_secret: apiSecretHashed,
                password_hash: passwordHash,
                status: "ACTIVE",
                markup_type: "PERCENTAGE",
                markup_value: 0
            }
        });
        res.json({
            success: true,
            broker: {
                id: broker.id,
                name: broker.name,
                email: broker.email,
                business_name: broker.business_name,
                phone: broker.phone,
                api_key: broker.api_key
            },
            message: "Broker created. They can log in with their email and password."
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create broker" });
    }
});
// PUT /api/admin/brokers/:id - Update broker profile
router.put("/brokers/:id", authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.body)("name").optional().notEmpty(),
    (0, express_validator_1.body)("email").optional().isEmail(),
    (0, express_validator_1.body)("business_name").optional().notEmpty(),
    (0, express_validator_1.body)("business_address").optional().notEmpty(),
    (0, express_validator_1.body)("phone").optional().notEmpty(),
    (0, express_validator_1.body)("revenue_share").optional().isInt({ min: 0, max: 100 }),
    (0, express_validator_1.body)("status").optional().isIn(["ACTIVE", "INACTIVE", "PENDING"]),
]), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, business_name, business_address, phone, revenue_share, status } = req.body;
        const existing = await Database_1.prisma.broker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Broker not found" });
            return;
        }
        // Check email uniqueness if changing
        if (email && email !== existing.email) {
            const emailTaken = await Database_1.prisma.broker.findUnique({ where: { email } });
            if (emailTaken) {
                res.status(400).json({ error: "Email already in use by another broker" });
                return;
            }
        }
        const broker = await Database_1.prisma.broker.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(business_name && { business_name }),
                ...(business_address && { business_address }),
                ...(phone && { phone }),
                ...(revenue_share !== undefined && { revenue_share_percent: revenue_share }),
                ...(status && { status }),
            }
        });
        res.json({
            success: true,
            broker: {
                id: broker.id,
                name: broker.name,
                email: broker.email,
                business_name: broker.business_name,
                phone: broker.phone,
                revenue_share_percent: broker.revenue_share_percent,
                status: broker.status,
                api_key: broker.api_key
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update broker" });
    }
});
// POST /api/admin/brokers/:id/reset-secret - Reset broker's API secret
router.post("/brokers/:id/reset-secret", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Database_1.prisma.broker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Broker not found" });
            return;
        }
        const newSecretPlain = crypto_1.default.randomBytes(16).toString("hex");
        const newSecretHashed = await bcryptjs_1.default.hash(newSecretPlain, 10);
        await Database_1.prisma.broker.update({
            where: { id },
            data: { api_secret: newSecretHashed }
        });
        res.json({
            success: true,
            message: "API secret has been reset",
            api_secret: newSecretPlain // Show once
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to reset secret" });
    }
});
/**
 * ORDER MANAGEMENT
 */
// GET /api/admin/orders
router.get("/orders", authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            Database_1.prisma.order.findMany({
                skip, take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    broker: { select: { name: true } },
                    client: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            id_document_path: true,
                            ssn_document_path: true,
                            documents_verified: true,
                            signature: true,
                            signed_agreement_date: true
                        }
                    },
                    items: true
                }
            }),
            Database_1.prisma.order.count()
        ]);
        res.json({
            success: true,
            orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// DELETE /api/admin/orders/:id - Delete an order (for cleaning up test data)
router.delete("/orders/:id", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if order exists
        const order = await Database_1.prisma.order.findUnique({ where: { id } });
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        // Delete related records first (cascade should handle most, but be explicit)
        await Database_1.prisma.orderItem.deleteMany({ where: { order_id: id } });
        await Database_1.prisma.commissionRecord.deleteMany({ where: { order_id: id } });
        await Database_1.prisma.webhookLog.deleteMany({ where: { order_id: id } });
        // Delete the order
        await Database_1.prisma.order.delete({ where: { id } });
        console.log(`Admin deleted order ${order.order_number}`);
        res.json({
            success: true,
            message: `Order ${order.order_number} deleted successfully`
        });
    }
    catch (error) {
        console.error("Delete order error:", error);
        res.status(500).json({ error: "Failed to delete order" });
    }
});
// DELETE /api/admin/clients/:id - Delete a client (for cleaning up test data)
router.delete("/clients/:id", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if client exists
        const client = await Database_1.prisma.client.findUnique({
            where: { id },
            include: { orders: true }
        });
        if (!client) {
            res.status(404).json({ error: "Client not found" });
            return;
        }
        // Delete related orders first
        for (const order of client.orders) {
            await Database_1.prisma.orderItem.deleteMany({ where: { order_id: order.id } });
            await Database_1.prisma.commissionRecord.deleteMany({ where: { order_id: order.id } });
            await Database_1.prisma.webhookLog.deleteMany({ where: { order_id: order.id } });
            await Database_1.prisma.order.delete({ where: { id: order.id } });
        }
        // Delete credit reports
        await Database_1.prisma.creditReport.deleteMany({ where: { client_id: id } });
        // Delete the client
        await Database_1.prisma.client.delete({ where: { id } });
        console.log(`Admin deleted client ${client.email}`);
        res.json({
            success: true,
            message: `Client ${client.email} and ${client.orders.length} related orders deleted`
        });
    }
    catch (error) {
        console.error("Delete client error:", error);
        res.status(500).json({ error: "Failed to delete client" });
    }
});
// GET /api/admin/clients - List all clients
router.get("/clients", authenticateAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;
        const [clients, total] = await Promise.all([
            Database_1.prisma.client.findMany({
                skip, take: limit,
                orderBy: { created_at: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    created_at: true,
                    documents_verified: true,
                    signed_agreement_date: true,
                    _count: { select: { orders: true } }
                }
            }),
            Database_1.prisma.client.count()
        ]);
        res.json({
            success: true,
            clients,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch clients" });
    }
});
// GET /api/admin/clients/:id - Get client details with documents
router.get("/clients/:id", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Database_1.prisma.client.findUnique({
            where: { id },
            include: {
                orders: {
                    orderBy: { created_at: 'desc' },
                    take: 10,
                    include: { items: true }
                }
            }
        });
        if (!client) {
            res.status(404).json({ error: "Client not found" });
            return;
        }
        res.json({
            success: true,
            client: {
                id: client.id,
                email: client.email,
                name: client.name,
                phone: client.phone,
                date_of_birth: client.date_of_birth,
                address: client.address,
                id_document_path: client.id_document_path,
                ssn_document_path: client.ssn_document_path,
                documents_verified: client.documents_verified,
                signature: client.signature,
                signed_agreement_date: client.signed_agreement_date,
                created_at: client.created_at,
                orders: client.orders
            }
        });
    }
    catch (error) {
        console.error("Fetch client error:", error);
        res.status(500).json({ error: "Failed to fetch client" });
    }
});
// GET /api/admin/documents/:type/:filename - Serve uploaded documents
router.get("/documents/:type/:filename", authenticateAdmin, async (req, res) => {
    try {
        const { type, filename } = req.params;
        const { S3Service } = require("../services/S3Service");
        // Validate type
        if (!["id_document", "ssn_document"].includes(type)) {
            res.status(400).json({ error: "Invalid document type" });
            return;
        }
        // Check if S3 is configured
        if (S3Service.isConfigured()) {
            // Generate signed URL for S3 document
            const signedUrl = await S3Service.getSignedUrl(filename);
            res.json({ success: true, url: signedUrl });
            return;
        }
        // Fallback to local file serving (for dev)
        const path = require("path");
        const fs = require("fs");
        const filePath = path.join(process.cwd(), "uploads", "documents", filename);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ error: "Document not found" });
            return;
        }
        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        const contentTypes = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif"
        };
        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error("Document serve error:", error);
        res.status(500).json({ error: "Failed to serve document" });
    }
});
// PUT /api/admin/clients/:id/verify-documents - Mark documents as verified
router.put("/clients/:id/verify-documents", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { verified } = req.body;
        const client = await Database_1.prisma.client.update({
            where: { id },
            data: { documents_verified: verified === true }
        });
        res.json({
            success: true,
            message: verified ? "Documents verified" : "Documents unverified",
            documents_verified: client.documents_verified
        });
    }
    catch (error) {
        console.error("Verify documents error:", error);
        res.status(500).json({ error: "Failed to update verification status" });
    }
});
/**
 * POST /api/admin/setup-test-users
 * TEMPORARY endpoint to setup test user passwords. Protected by secret key.
 */
router.post("/setup-test-users", async (req, res) => {
    const { secret } = req.body;
    // Simple protection - must know the secret
    if (secret !== "SETUP_SECRET_2025") {
        res.status(401).json({ error: "Invalid secret" });
        return;
    }
    const TEST_PASSWORD = "PasswordTesting123!";
    const passwordHash = await bcryptjs_1.default.hash(TEST_PASSWORD, 10);
    const results = { admin: null, broker: null, client: null };
    try {
        // Admin
        results.admin = await Database_1.prisma.admin.upsert({
            where: { email: "joe@ezwai.com" },
            update: { password_hash: passwordHash },
            create: {
                email: "joe@ezwai.com",
                password_hash: passwordHash,
                name: "Joe Machado",
                role: "SUPER_ADMIN",
                is_active: true
            }
        });
        // Broker
        const apiKey = `tlm_${crypto_1.default.randomBytes(32).toString("hex")}`;
        const apiSecretHashed = await bcryptjs_1.default.hash(crypto_1.default.randomBytes(16).toString("hex"), 10);
        results.broker = await Database_1.prisma.broker.upsert({
            where: { email: "joe@ezwai.com" },
            update: { password_hash: passwordHash },
            create: {
                email: "joe@ezwai.com",
                password_hash: passwordHash,
                name: "Joe Machado",
                business_name: "EZWAI",
                business_address: "123 Test St, Miami, FL 33101",
                phone: "555-555-5555",
                api_key: apiKey,
                api_secret: apiSecretHashed,
                status: "ACTIVE",
                revenue_share_percent: 10,
                markup_type: "PERCENTAGE",
                markup_value: 0
            }
        });
        // Client
        results.client = await Database_1.prisma.client.upsert({
            where: { email: "testclient@example.com" },
            update: { password_hash: passwordHash },
            create: {
                email: "testclient@example.com",
                password_hash: passwordHash,
                name: "Test Client",
                phone: "555-123-4567",
                excluded_banks: []
            }
        });
        res.json({
            success: true,
            message: "All test users configured with password: " + TEST_PASSWORD,
            admin_email: results.admin.email,
            broker_email: results.broker.email,
            broker_api_key: results.broker.api_key,
            client_email: results.client.email
        });
    }
    catch (error) {
        console.error("Setup error:", error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/admin/orders/:id/mark-paid
 * Mark an order as paid (manual payment received)
 */
router.post("/orders/:id/mark-paid", authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_method } = req.body;
        const adminId = req.admin?.id;
        // Find the order
        const order = await Database_1.prisma.order.findUnique({
            where: { id },
            include: { broker: true }
        });
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        if (order.payment_status === "PAID") {
            res.status(400).json({ error: "Order is already marked as paid" });
            return;
        }
        // Update order status
        const updatedOrder = await Database_1.prisma.order.update({
            where: { id },
            data: {
                payment_status: "PAID",
                payment_method: payment_method || "MANUAL",
                status: "PROCESSING", // Move to processing after payment received
                updated_at: new Date()
            }
        });
        // Log activity
        await Database_1.prisma.activityLog.create({
            data: {
                broker_id: order.broker_id || undefined,
                action: "ORDER_MARKED_PAID",
                metadata: {
                    order_id: id,
                    order_number: order.order_number,
                    payment_method,
                    admin_id: adminId,
                    amount: order.total_charged
                }
            }
        });
        // TODO: Trigger TradelineSupply order creation here
        // const orderService = getOrderService();
        // await orderService.processPayment(id, undefined, payment_method);
        res.json({
            success: true,
            order: updatedOrder,
            message: "Payment recorded successfully. Order moved to processing."
        });
    }
    catch (error) {
        console.error("Mark paid error:", error);
        res.status(500).json({ error: error.message || "Failed to mark order as paid" });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map