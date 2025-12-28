"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const BrokerService_1 = require("../services/BrokerService");
const PricingEngine_1 = require("../services/PricingEngine");
const Database_1 = require("../services/Database");
const config_1 = require("../config");
const router = (0, express_1.Router)();
const brokerService = (0, BrokerService_1.getBrokerService)();
/**
 * POST /api/brokers
 * Create a new broker (Admin only)
 */
router.post("/", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.body)("name").notEmpty().trim(),
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("business_name").optional().trim(),
    (0, express_validator_1.body)("phone").optional().isMobilePhone("any"),
    (0, express_validator_1.body)("website").optional().isURL(),
    (0, express_validator_1.body)("revenue_share_percent").optional().isFloat({
        min: config_1.config.commission.minBrokerSharePercent,
        max: config_1.config.commission.maxBrokerSharePercent,
    }),
    (0, express_validator_1.body)("notes").optional().trim(),
]), async (req, res) => {
    try {
        const result = await brokerService.createBroker(req.body);
        res.status(201).json({
            success: true,
            broker: {
                id: result.broker.id,
                name: result.broker.name,
                email: result.broker.email,
                api_key: result.broker.api_key,
                revenue_share_percent: result.broker.revenue_share_percent,
                status: result.broker.status,
            },
            credentials: {
                api_key: result.broker.api_key,
                api_secret: result.api_secret, // Only shown once
            },
            message: "Broker created successfully. Save the API secret - it cannot be retrieved again.",
        });
    }
    catch (error) {
        console.error("Create broker error:", error);
        res.status(400).json({
            error: error.message || "Failed to create broker",
            code: "CREATE_BROKER_ERROR",
        });
    }
});
/**
 * GET /api/brokers
 * List all brokers with pagination (Admin only)
 */
router.get("/", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("status")
        .optional()
        .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    (0, express_validator_1.query)("search").optional().trim(),
]), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const search = req.query.search;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { business_name: { contains: search, mode: "insensitive" } },
            ];
        }
        const [brokers, total] = await Promise.all([
            Database_1.prisma.broker.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    business_name: true,
                    email: true,
                    revenue_share_percent: true,
                    markup_type: true,
                    markup_value: true,
                    status: true,
                    created_at: true,
                    _count: {
                        select: {
                            orders: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
            }),
            Database_1.prisma.broker.count({ where }),
        ]);
        return res.json({
            success: true,
            brokers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("List brokers error:", error);
        return res.status(500).json({
            error: "Failed to fetch brokers",
            code: "LIST_BROKERS_ERROR",
        });
    }
});
/**
 * GET /api/brokers/:id
 * Get broker details (Admin only)
 */
router.get("/:id", auth_1.authenticateAdmin, (0, validation_1.validate)([(0, express_validator_1.param)("id").isUUID()]), async (req, res) => {
    try {
        const broker = await Database_1.prisma.broker.findUnique({
            where: { id: req.params.id },
            include: {
                _count: {
                    select: {
                        orders: true,
                    },
                },
            },
        });
        if (!broker) {
            return res.status(404).json({
                error: "Broker not found",
                code: "BROKER_NOT_FOUND",
            });
        }
        // Get statistics
        const stats = await brokerService.getBrokerStats(broker.id);
        return res.json({
            success: true,
            broker: {
                ...broker,
                api_secret: undefined, // Never expose
            },
            stats,
        });
    }
    catch (error) {
        console.error("Get broker error:", error);
        return res.status(500).json({
            error: "Failed to fetch broker",
            code: "GET_BROKER_ERROR",
        });
    }
});
/**
 * PATCH /api/brokers/:id
 * Update broker settings (Admin only)
 */
router.patch("/:id", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.param)("id").isUUID(),
    (0, express_validator_1.body)("revenue_share_percent").optional().isFloat({
        min: config_1.config.commission.minBrokerSharePercent,
        max: config_1.config.commission.maxBrokerSharePercent,
    }),
    (0, express_validator_1.body)("status")
        .optional()
        .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    (0, express_validator_1.body)("notes").optional(),
]), async (req, res) => {
    try {
        const updates = req.body;
        const adminId = req.admin.id;
        const broker = await brokerService.updateBroker(req.params.id, updates, adminId);
        res.json({
            success: true,
            broker: {
                ...broker,
                api_secret: undefined,
            },
            message: "Broker updated successfully",
        });
    }
    catch (error) {
        console.error("Update broker error:", error);
        res.status(400).json({
            error: error.message || "Failed to update broker",
            code: "UPDATE_BROKER_ERROR",
        });
    }
});
/**
 * POST /api/brokers/:id/approve
 * Approve a pending broker (Admin only)
 */
router.post("/:id/approve", auth_1.authenticateAdmin, (0, validation_1.validate)([(0, express_validator_1.param)("id").isUUID()]), async (req, res) => {
    try {
        const adminId = req.admin.id;
        const broker = await brokerService.approveBroker(req.params.id, adminId);
        res.json({
            success: true,
            broker: {
                ...broker,
                api_secret: undefined,
            },
            message: "Broker approved successfully",
        });
    }
    catch (error) {
        console.error("Approve broker error:", error);
        res.status(400).json({
            error: error.message || "Failed to approve broker",
            code: "APPROVE_BROKER_ERROR",
        });
    }
});
/**
 * GET /api/brokers/:id/analytics
 * Get broker analytics (Admin only)
 */
router.get("/:id/analytics", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.param)("id").isUUID(),
    (0, express_validator_1.query)("start_date").optional().isISO8601(),
    (0, express_validator_1.query)("end_date").optional().isISO8601(),
]), async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const where = {
            broker_id: req.params.id,
        };
        if (start_date && end_date) {
            where.date = {
                gte: new Date(start_date),
                lte: new Date(end_date),
            };
        }
        const analytics = await Database_1.prisma.analytics.findMany({
            where,
            orderBy: { date: "desc" },
            take: 30, // Last 30 days
        });
        // Calculate summary
        const summary = analytics.reduce((acc, day) => ({
            total_views: acc.total_views + day.widget_loads,
            total_visitors: acc.total_visitors + day.unique_visitors,
            total_cart_additions: acc.total_cart_additions + day.cart_additions,
            total_orders: acc.total_orders + day.orders_count,
            total_revenue: acc.total_revenue + PricingEngine_1.PricingEngine.centsToUsd(day.total_sales),
            total_commission: acc.total_commission +
                PricingEngine_1.PricingEngine.centsToUsd(day.revenue_share_earned + day.markup_earned),
        }), {
            total_views: 0,
            total_visitors: 0,
            total_cart_additions: 0,
            total_orders: 0,
            total_revenue: 0,
            total_commission: 0,
        });
        res.json({
            success: true,
            analytics,
            summary,
        });
    }
    catch (error) {
        console.error("Broker analytics error:", error);
        res.status(500).json({
            error: "Failed to fetch analytics",
            code: "ANALYTICS_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=brokers.js.map