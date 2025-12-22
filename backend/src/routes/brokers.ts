import { Router, Request, Response } from "express";
import { body, query, param } from "express-validator";
import { authenticateAdmin } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getBrokerService } from "../services/BrokerService";
import { PricingEngine } from "../services/PricingEngine";
import { prisma } from "../services/Database";
import { config } from "../config";

const router = Router();
const brokerService = getBrokerService();

/**
 * POST /api/brokers
 * Create a new broker (Admin only)
 */
router.post(
  "/",
  authenticateAdmin,
  validate([
    body("name").notEmpty().trim(),
    body("email").isEmail().normalizeEmail(),
    body("business_name").optional().trim(),
    body("phone").optional().isMobilePhone("any"),
    body("website").optional().isURL(),
    body("revenue_share_percent").optional().isFloat({
      min: config.commission.minBrokerSharePercent,
      max: config.commission.maxBrokerSharePercent,
    }),
    body("notes").optional().trim(),
  ]),
  async (req: Request, res: Response) => {
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
        message:
          "Broker created successfully. Save the API secret - it cannot be retrieved again.",
      });
    } catch (error: any) {
      console.error("Create broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to create broker",
        code: "CREATE_BROKER_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers
 * List all brokers with pagination (Admin only)
 */
router.get(
  "/",
  authenticateAdmin,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    query("search").optional().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const where: any = {};

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
        prisma.broker.findMany({
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
        prisma.broker.count({ where }),
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
    } catch (error) {
      console.error("List brokers error:", error);
      return res.status(500).json({
        error: "Failed to fetch brokers",
        code: "LIST_BROKERS_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers/:id
 * Get broker details (Admin only)
 */
router.get(
  "/:id",
  authenticateAdmin,
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
    try {
      const broker = await prisma.broker.findUnique({
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
    } catch (error) {
      console.error("Get broker error:", error);
      return res.status(500).json({
        error: "Failed to fetch broker",
        code: "GET_BROKER_ERROR",
      });
    }
  }
);

/**
 * PATCH /api/brokers/:id
 * Update broker settings (Admin only)
 */
router.patch(
  "/:id",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    body("revenue_share_percent").optional().isFloat({
      min: config.commission.minBrokerSharePercent,
      max: config.commission.maxBrokerSharePercent,
    }),
    body("status")
      .optional()
      .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    body("notes").optional(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const adminId = req.admin.id;

      const broker = await brokerService.updateBroker(
        req.params.id,
        updates,
        adminId
      );

      res.json({
        success: true,
        broker: {
          ...broker,
          api_secret: undefined,
        },
        message: "Broker updated successfully",
      });
    } catch (error: any) {
      console.error("Update broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to update broker",
        code: "UPDATE_BROKER_ERROR",
      });
    }
  }
);

/**
 * POST /api/brokers/:id/approve
 * Approve a pending broker (Admin only)
 */
router.post(
  "/:id/approve",
  authenticateAdmin,
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Approve broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to approve broker",
        code: "APPROVE_BROKER_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers/:id/analytics
 * Get broker analytics (Admin only)
 */
router.get(
  "/:id/analytics",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;

      const where: any = {
        broker_id: req.params.id,
      };

      if (start_date && end_date) {
        where.date = {
          gte: new Date(start_date as string),
          lte: new Date(end_date as string),
        };
      }

      const analytics = await prisma.analytics.findMany({
        where,
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
      });

      // Calculate summary
      const summary = analytics.reduce(
        (acc: any, day: any) => ({
          total_views: acc.total_views + day.widget_loads,
          total_visitors: acc.total_visitors + day.unique_visitors,
          total_cart_additions: acc.total_cart_additions + day.cart_additions,
          total_orders: acc.total_orders + day.orders_count,
          total_revenue:
            acc.total_revenue + PricingEngine.centsToUsd(day.total_sales),
          total_commission:
            acc.total_commission +
            PricingEngine.centsToUsd(
              day.revenue_share_earned + day.markup_earned
            ),
        }),
        {
          total_views: 0,
          total_visitors: 0,
          total_cart_additions: 0,
          total_orders: 0,
          total_revenue: 0,
          total_commission: 0,
        }
      );

      res.json({
        success: true,
        analytics,
        summary,
      });
    } catch (error) {
      console.error("Broker analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        code: "ANALYTICS_ERROR",
      });
    }
  }
);

export default router;
