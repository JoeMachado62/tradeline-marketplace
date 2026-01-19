"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const PricingEngine_1 = require("../services/PricingEngine");
const Database_1 = require("../services/Database");
const EmailService_1 = require("../services/EmailService");
const router = (0, express_1.Router)();
const pricingEngine = (0, PricingEngine_1.getPricingEngine)();
/**
 * GET /api/public/pricing
 * Get pricing for widget display
 * Requires broker API key
 */
router.get("/pricing", auth_1.authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        // Get pricing with broker's markup
        const pricing = await pricingEngine.getPricingForBroker(broker.id);
        // Track widget load in analytics
        const today = new Date().toISOString().split("T")[0];
        await Database_1.prisma.analytics.upsert({
            where: {
                broker_id_date: {
                    broker_id: broker.id,
                    date: new Date(today),
                },
            },
            update: {
                widget_loads: { increment: 1 },
            },
            create: {
                broker_id: broker.id,
                date: new Date(today),
                widget_loads: 1,
            },
        });
        // Return pricing formatted for widget
        res.json({
            success: true,
            broker: {
                name: broker.name,
                business_name: broker.business_name,
            },
            pricing: pricing.map((item) => ({
                card_id: item.card_id,
                bank_name: item.bank_name,
                credit_limit: item.credit_limit,
                date_opened: item.date_opened,
                purchase_deadline: item.purchase_deadline,
                reporting_period: item.reporting_period,
                stock: item.stock,
                price: item.customer_price, // Show final price to customer
                image: item.image,
            })),
            settings: {
                markup_type: broker.markup_type,
                currency: "USD",
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("Pricing API error:", error);
        res.status(500).json({
            error: "Failed to fetch pricing",
            code: "PRICING_ERROR",
            message: error.message,
        });
    }
});
/**
 * POST /api/public/calculate
 * Calculate cart totals with broker pricing
 */
router.post("/calculate", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.body)("items").isArray({ min: 1 }).withMessage("Cart items required"),
    (0, express_validator_1.body)("items.*.card_id").notEmpty().withMessage("Card ID required"),
    (0, express_validator_1.body)("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Valid quantity required"),
]), async (req, res) => {
    try {
        const broker = req.broker;
        const { items, promo_code } = req.body;
        // Calculate totals
        const calculation = await pricingEngine.calculateOrderTotal(items, broker.id, broker.allow_promo_codes !== false ? promo_code : undefined);
        res.json({
            success: true,
            calculation: {
                items: calculation.items.map((item) => ({
                    card_id: item.card_id,
                    bank_name: item.bank_name,
                    quantity: item.quantity,
                    unit_price: item.customer_price,
                    total: item.customer_price * item.quantity,
                })),
                subtotal: calculation.total_customer_price + (calculation.multi_line_discount || 0),
                multi_line_discount: calculation.multi_line_discount || 0,
                total: calculation.total_customer_price,
                item_count: items.reduce((sum, item) => sum + item.quantity, 0),
            },
            currency: "USD",
        });
    }
    catch (error) {
        console.error("Calculation error:", error);
        res.status(400).json({
            error: "Failed to calculate totals",
            code: "CALCULATION_ERROR",
            message: error.message,
        });
    }
});
/**
 * POST /api/public/track
 * Track widget events for analytics
 */
router.post("/track", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.body)("event").isIn(["view", "click", "add_to_cart", "checkout_started"]),
    (0, express_validator_1.body)("data").optional().isObject(),
]), async (req, res) => {
    try {
        const broker = req.broker;
        const { event, data } = req.body;
        const today = new Date().toISOString().split("T")[0];
        // Update analytics based on event type
        const updateData = {};
        switch (event) {
            case "view":
                updateData.unique_visitors = { increment: 1 };
                break;
            case "add_to_cart":
                updateData.cart_additions = { increment: 1 };
                break;
            default:
                // Generic event tracking
                break;
        }
        if (Object.keys(updateData).length > 0) {
            // Convert increment objects to simple values for create
            const createData = {};
            for (const [key, value] of Object.entries(updateData)) {
                if (typeof value === 'object' && value !== null && 'increment' in value) {
                    createData[key] = value.increment;
                }
                else {
                    createData[key] = value;
                }
            }
            await Database_1.prisma.analytics.upsert({
                where: {
                    broker_id_date: {
                        broker_id: broker.id,
                        date: new Date(today),
                    },
                },
                update: updateData,
                create: {
                    broker_id: broker.id,
                    date: new Date(today),
                    ...createData,
                },
            });
        }
        // Log activity
        await Database_1.prisma.activityLog.create({
            data: {
                broker_id: broker.id,
                action: `WIDGET_${event.toUpperCase()}`,
                metadata: data ? JSON.stringify(data) : null,
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error("Tracking API error:", error);
        res.status(500).json({
            error: "Failed to track event",
            code: "TRACKING_ERROR",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
/**
 * GET /api/public/config
 * Get widget configuration and settings
 */
router.get("/config", auth_1.authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        res.json({
            success: true,
            config: {
                broker: {
                    name: broker.name,
                    business_name: broker.business_name,
                    website: broker.website,
                },
                features: {
                    show_stock: true,
                    show_purchase_deadline: true,
                    show_reporting_period: true,
                    enable_cart: true,
                    max_items_per_order: 10,
                    max_quantity_per_item: 3,
                    allow_promo_codes: broker.allow_promo_codes,
                },
                theme: {
                    primary_color: broker.primary_color || "#032530",
                    secondary_color: broker.secondary_color || "#F4D445",
                    success_color: "#16a34a",
                    error_color: "#dc2626",
                    font_family: "Inter, system-ui, sans-serif",
                },
                checkout: {
                    success_url: broker.website ? `${broker.website}/thank-you` : null,
                    cancel_url: broker.website ? `${broker.website}/cart` : null,
                },
            },
        });
    }
    catch (error) {
        console.error("Config error:", error);
        res.status(500).json({
            error: "Failed to fetch configuration",
            code: "CONFIG_ERROR",
        });
    }
});
/**
 * POST /api/public/checkout
 * Process checkout with document uploads (multipart/form-data)
 */
router.post("/checkout", auth_1.authenticateBroker, async (req, res) => {
    try {
        const broker = req.broker;
        const multer = require("multer");
        const path = require("path");
        const bcrypt = require("bcryptjs");
        const { S3Service } = require("../services/S3Service");
        // Use memory storage for S3 uploads
        const storage = multer.memoryStorage();
        const upload = multer({
            storage,
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
            fileFilter: (_req, file, cb) => {
                const allowed = /jpeg|jpg|png|gif|pdf|webp|heic|heif/;
                const ext = path.extname(file.originalname).toLowerCase();
                // Check if extension matches (ignoring the dot) or contains the string
                const extValid = allowed.test(ext);
                const mimeValid = allowed.test(file.mimetype);
                if (extValid && mimeValid) {
                    cb(null, true);
                }
                else {
                    cb(new Error(`File type ${file.mimetype} or extension ${ext} not allowed. Only Images (JPG, PNG, HEIC) and PDFs are accepted.`));
                }
            }
        }).fields([
            { name: "id_document", maxCount: 1 },
            { name: "ssn_document", maxCount: 1 }
        ]);
        // Process upload
        upload(req, res, async (uploadErr) => {
            if (uploadErr) {
                return res.status(400).json({ error: uploadErr.message, code: "UPLOAD_ERROR" });
            }
            try {
                // Parse form data
                let { email, name, phone, password, signature, date_of_birth, address } = req.body;
                // Normalize email
                if (email)
                    email = email.toLowerCase().trim();
                let items = req.body.items;
                // Items come as JSON string from FormData
                if (typeof items === "string") {
                    items = JSON.parse(items);
                }
                if (!email || !name || !items || items.length === 0) {
                    return res.status(400).json({ error: "Missing required fields", code: "VALIDATION_ERROR" });
                }
                const files = req.files;
                // Create or find client first to get ID for S3 paths
                let client = await Database_1.prisma.client.findUnique({ where: { email } });
                const clientId = client?.id || require("crypto").randomUUID();
                // Upload documents to S3 if present
                let idDocPath = null;
                let ssnDocPath = null;
                if (S3Service.isConfigured()) {
                    const idDocFile = files?.id_document?.[0];
                    const ssnDocFile = files?.ssn_document?.[0];
                    if (idDocFile) {
                        const key = S3Service.generateKey("id_document", clientId, idDocFile.originalname);
                        const result = await S3Service.upload(idDocFile.buffer, key, idDocFile.mimetype);
                        idDocPath = result.key; // Store S3 key, not full URL
                        console.log(`Uploaded ID document to S3: ${key}`);
                    }
                    if (ssnDocFile) {
                        const key = S3Service.generateKey("ssn_document", clientId, ssnDocFile.originalname);
                        const result = await S3Service.upload(ssnDocFile.buffer, key, ssnDocFile.mimetype);
                        ssnDocPath = result.key; // Store S3 key, not full URL
                        console.log(`Uploaded SSN document to S3: ${key}`);
                    }
                }
                else {
                    console.warn("S3 not configured - documents will not be stored!");
                }
                // 1. Upsert Client
                const updateData = {
                    name,
                    phone,
                    ...(date_of_birth ? { date_of_birth: new Date(date_of_birth) } : {}),
                    ...(address ? { address } : {}),
                    ...(idDocPath ? { id_document_path: idDocPath } : {}),
                    ...(ssnDocPath ? { ssn_document_path: ssnDocPath } : {}),
                    ...(signature ? { signature, signed_agreement_date: new Date() } : {})
                };
                if (client) {
                    client = await Database_1.prisma.client.update({
                        where: { id: client.id },
                        data: updateData
                    });
                }
                else {
                    const passwordHash = await bcrypt.hash(password || "temp1234", 10);
                    client = await Database_1.prisma.client.create({
                        data: {
                            email,
                            password_hash: passwordHash,
                            ...updateData
                        }
                    });
                }
                // 2. Create Order (Pending Payment)
                const { getOrderService } = require("../services/OrderService");
                const orderService = getOrderService();
                const { promo_code } = req.body;
                const order = await orderService.createOrder({
                    broker_id: broker.id,
                    client_id: client.id,
                    customer_email: email,
                    customer_name: name,
                    customer_phone: phone,
                    items: items,
                    promoCode: broker.allow_promo_codes !== false ? promo_code : undefined
                });
                // 3. Track Analytics
                const today = new Date().toISOString().split("T")[0];
                await Database_1.prisma.analytics.upsert({
                    where: {
                        broker_id_date: {
                            broker_id: broker.id,
                            date: new Date(today),
                        },
                    },
                    update: {
                        checkout_starts: { increment: 1 },
                        orders_count: { increment: 1 },
                    },
                    create: {
                        broker_id: broker.id,
                        date: new Date(today),
                        checkout_starts: 1,
                        orders_count: 1
                    },
                });
                // 4. Send confirmation emails (async, don't block response)
                const emailService = (0, EmailService_1.getEmailService)();
                // Send customer order confirmation
                emailService.sendOrderConfirmation(order).catch((err) => {
                    console.error("Failed to send order confirmation email:", err.message);
                });
                // Send admin notification
                emailService.sendNewOrderAdminNotification(order).catch((err) => {
                    console.error("Failed to send admin notification email:", err.message);
                });
                // Determine Base URL dynamically
                let baseUrl = process.env.PUBLIC_URL;
                if (!baseUrl) {
                    const protocol = req.protocol;
                    const host = req.get('host');
                    baseUrl = `${protocol}://${host}`;
                }
                res.json({
                    success: true,
                    order_id: order.id,
                    order_number: order.order_number,
                    total: order.total_charged / 100, // Convert cents to dollars
                    redirect_url: `${baseUrl}/portal/login?email=${encodeURIComponent(email)}&new=true`,
                    confirmation_url: `${baseUrl}/portal/order/${order.id}`,
                    message: "Order submitted successfully! Check your email for payment instructions."
                });
                return;
            }
            catch (error) {
                console.error("Checkout processing error:", error);
                res.status(500).json({
                    error: "Failed to process order",
                    code: "CHECKOUT_ERROR",
                    message: error.message,
                });
                return;
            }
        });
    }
    catch (error) {
        console.error("Checkout setup error:", error);
        res.status(500).json({
            error: "Checkout failed",
            code: "CHECKOUT_ERROR",
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map