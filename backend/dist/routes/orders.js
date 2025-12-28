"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const OrderService_1 = require("../services/OrderService");
const PaymentService_1 = require("../services/PaymentService");
const Database_1 = require("../services/Database");
const router = (0, express_1.Router)();
const orderService = (0, OrderService_1.getOrderService)();
const paymentService = (0, PaymentService_1.getPaymentService)();
/**
 * POST /api/orders/checkout
 * Create checkout session for order
 */
router.post("/checkout", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.body)("customer_email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("items").isArray({ min: 1 }),
    (0, express_validator_1.body)("items.*.card_id").notEmpty(),
    (0, express_validator_1.body)("items.*.quantity").isInt({ min: 1, max: 10 }),
    (0, express_validator_1.body)("success_url").optional().isURL(),
    (0, express_validator_1.body)("cancel_url").optional().isURL(),
]), async (req, res) => {
    try {
        const broker = req.broker;
        const { customer_email, items, success_url, cancel_url } = req.body;
        // Create Stripe checkout session
        const result = await paymentService.createCheckoutSession({
            broker_id: broker.id,
            customer_email,
            items,
            success_url,
            cancel_url,
        });
        // Track checkout started
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await Database_1.prisma.analytics.upsert({
            where: {
                broker_id_date: {
                    broker_id: broker.id,
                    date: today,
                },
            },
            update: {
                cart_additions: { increment: 1 },
            },
            create: {
                broker_id: broker.id,
                date: today,
                cart_additions: 1,
            },
        });
        return res.json({
            success: true,
            session_id: result.session_id,
            checkout_url: result.checkout_url,
            order_id: result.order_id,
        });
    }
    catch (error) {
        console.error("Checkout creation error:", error);
        return res.status(500).json({
            error: "Failed to create checkout session",
            code: "CHECKOUT_ERROR",
            message: error.message,
        });
    }
});
/**
 * GET /api/orders/broker
 * Get broker's orders
 */
router.get("/broker", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("status").optional(),
    (0, express_validator_1.query)("start_date").optional().isISO8601(),
    (0, express_validator_1.query)("end_date").optional().isISO8601(),
]), async (req, res) => {
    try {
        const broker = req.broker;
        const { page, limit, status, start_date, end_date } = req.query;
        const result = await orderService.getBrokerOrders(broker.id, {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            status: status,
            startDate: start_date ? new Date(start_date) : undefined,
            endDate: end_date ? new Date(end_date) : undefined,
        });
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Get broker orders error:", error);
        return res.status(500).json({
            error: "Failed to fetch orders",
            code: "FETCH_ORDERS_ERROR",
        });
    }
});
/**
 * GET /api/orders/:id
 * Get order details (Admin or owning broker)
 */
router.get("/:id", (0, validation_1.validate)([(0, express_validator_1.param)("id").isUUID()]), async (req, res) => {
    try {
        const orderId = req.params.id;
        // Ownership check would be better as an async check
        const order = await orderService.getOrderWithCommission(orderId);
        if (!order) {
            return res.status(404).json({
                error: "Order not found",
                code: "ORDER_NOT_FOUND",
            });
        }
        // Simplified auth for now - in real app, we'd use a combined middleware
        // but here we just check if it matches the current broker/admin context
        let authorized = false;
        if (req.admin) {
            authorized = true;
        }
        else if (req.broker && order.broker_id === req.broker.id) {
            authorized = true;
        }
        if (!authorized) {
            return res.status(403).json({
                error: "Access denied",
                code: "UNAUTHORIZED",
            });
        }
        return res.json({
            success: true,
            order,
        });
    }
    catch (error) {
        console.error("Get order error:", error);
        return res.status(500).json({
            error: "Failed to fetch order",
            code: "FETCH_ORDER_ERROR",
        });
    }
});
/**
 * GET /api/orders
 * List all orders (Admin only)
 */
router.get("/", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("broker_id").optional().isUUID(),
    (0, express_validator_1.query)("status").optional(),
]), async (req, res) => {
    try {
        const { page, limit, broker_id, status } = req.query;
        const result = await orderService.listOrders({
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            status: status,
            brokerId: broker_id,
        });
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("List orders error:", error);
        return res.status(500).json({
            error: "Failed to fetch orders",
            code: "LIST_ORDERS_ERROR",
        });
    }
});
/**
 * POST /api/orders/:id/manual-payment
 * Record a manual payment (Admin only)
 */
router.post("/:id/manual-payment", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.param)("id").isUUID(),
    (0, express_validator_1.body)("payment_method").isIn(["CASH", "WIRE", "CHECK", "MANUAL"]),
]), async (req, res) => {
    try {
        const orderId = req.params.id;
        const { payment_method } = req.body;
        const admin = req.admin;
        const updatedOrder = await orderService.recordManualPayment(orderId, payment_method, admin.id);
        return res.json({
            success: true,
            order: updatedOrder,
        });
    }
    catch (error) {
        console.error("Manual payment recording error:", error);
        return res.status(400).json({
            error: error.message || "Failed to record manual payment",
            code: "MANUAL_PAYMENT_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map