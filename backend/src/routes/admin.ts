import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { getAuthService } from "../services/AuthService";
import { prisma } from "../services/Database";
import { config } from "../config";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const router = Router();
const authService = getAuthService();

// Middleware
const authenticateAdmin = async (req: Request, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authorization" });
      return;
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwt.secret as string) as any;
      if (decoded.type !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      req.admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
};

/**
 * POST /api/admin/login
 */
router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await authService.adminLogin(email, password);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(401).json({ error: error.message || "Login failed", code: "LOGIN_FAILED" });
    }
  }
);

/**
 * GET /api/admin/dashboard
 */
router.get("/dashboard", authenticateAdmin, async (_req: Request, res: Response) => {
    try {
        const stats = {
            brokers: await prisma.broker.count(),
            active_brokers: await prisma.broker.count({ where: { status: "ACTIVE" } }),
            orders_total: await prisma.order.count(),
            orders_pending: await prisma.order.count({ where: { status: "PENDING" } }),
             // Revenue sums (simple aggregation)
            revenue_platform: await prisma.order.aggregate({
                _sum: { platform_net_revenue: true },
                where: { status: "COMPLETED" }
            }).then((r: any) => (r._sum.platform_net_revenue || 0) / 100), // USD
        };
        
        // Recent orders
        const recent_orders = await prisma.order.findMany({
            take: 10,
            orderBy: { created_at: 'desc' },
            include: { broker: { select: { name: true } } }
        });

        res.json({ success: true, stats, recent_orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Dashboard error" });
    }
});

/**
 * BROKER MANAGEMENT
 */

// GET /api/admin/brokers
router.get("/brokers", authenticateAdmin, async (_req: Request, res: Response) => {
    try {
        const brokers = await prisma.broker.findMany({
            orderBy: { created_at: 'desc' },
            select: {
                id: true, name: true, business_name: true, email: true, status: true,
                created_at: true, revenue_share_percent: true, api_key: true
            }
        });
        res.json({ success: true, brokers });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch brokers" });
    }
});

// POST /api/admin/brokers - Onboard new broker
router.post("/brokers", authenticateAdmin, 
    validate([
        body("name").notEmpty(),
        body("email").isEmail(),
        body("business_name").optional(),
        body("revenue_share").isInt({min: 0, max: 100}).optional(),
    ]),
    async (req: Request, res: Response) => {
    try {
        const { name, email, business_name, revenue_share } = req.body;
        
        const existing = await prisma.broker.findUnique({ where: { email } });
        if (existing) {
             res.status(400).json({ error: "Broker email already exists" });
             return;
        }

        const apiKey = `tlm_${crypto.randomBytes(32).toString("hex")}`;
        const apiSecretPlain = crypto.randomBytes(16).toString("hex");
        const apiSecretHashed = await bcrypt.hash(apiSecretPlain, 10);

        const broker = await prisma.broker.create({
            data: {
                name,
                email,
                business_name: business_name || "",
                revenue_share_percent: revenue_share || 10, // Default 10%
                api_key: apiKey,
                api_secret: apiSecretHashed,
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
                api_key: broker.api_key
            },
            api_secret: apiSecretPlain // Show once
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create broker" });
    }
});

/**
 * ORDER MANAGEMENT
 */

// GET /api/admin/orders
router.get("/orders", authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                skip, take: limit,
                orderBy: { created_at: 'desc' },
                include: { broker: { select: { name: true } } }
            }),
            prisma.order.count()
        ]);

        res.json({
            success: true,
            orders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

export default router;
