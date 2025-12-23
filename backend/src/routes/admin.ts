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
                id: true, name: true, business_name: true, email: true, phone: true,
                website: true, status: true, created_at: true, revenue_share_percent: true, api_key: true
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
        body("name").notEmpty().withMessage("Contact name is required"),
        body("email").isEmail().withMessage("Valid email is required"),
        body("business_name").notEmpty().withMessage("Business name is required"),
        body("phone").notEmpty().withMessage("Phone number is required"),
        body("website").isURL().withMessage("Valid website URL is required"),
        body("revenue_share").isInt({min: 0, max: 100}).optional(),
    ]),
    async (req: Request, res: Response) => {
    try {
        const { name, email, business_name, phone, website, revenue_share } = req.body;
        
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
                business_name,
                phone,
                website,
                revenue_share_percent: revenue_share || 10,
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
                business_name: broker.business_name,
                phone: broker.phone,
                website: broker.website,
                api_key: broker.api_key
            },
            api_secret: apiSecretPlain
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create broker" });
    }
});

// PUT /api/admin/brokers/:id - Update broker profile
router.put("/brokers/:id", authenticateAdmin,
    validate([
        body("name").optional().notEmpty(),
        body("email").optional().isEmail(),
        body("business_name").optional().notEmpty(),
        body("phone").optional().notEmpty(),
        body("website").optional().isURL(),
        body("revenue_share").optional().isInt({min: 0, max: 100}),
        body("status").optional().isIn(["ACTIVE", "INACTIVE", "PENDING"]),
    ]),
    async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, business_name, phone, website, revenue_share, status } = req.body;
        
        const existing = await prisma.broker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Broker not found" });
            return;
        }

        // Check email uniqueness if changing
        if (email && email !== existing.email) {
            const emailTaken = await prisma.broker.findUnique({ where: { email } });
            if (emailTaken) {
                res.status(400).json({ error: "Email already in use by another broker" });
                return;
            }
        }

        const broker = await prisma.broker.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(business_name && { business_name }),
                ...(phone && { phone }),
                ...(website && { website }),
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
                website: broker.website,
                revenue_share_percent: broker.revenue_share_percent,
                status: broker.status,
                api_key: broker.api_key
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update broker" });
    }
});

// POST /api/admin/brokers/:id/reset-secret - Reset broker's API secret
router.post("/brokers/:id/reset-secret", authenticateAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const existing = await prisma.broker.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: "Broker not found" });
            return;
        }

        const newSecretPlain = crypto.randomBytes(16).toString("hex");
        const newSecretHashed = await bcrypt.hash(newSecretPlain, 10);

        await prisma.broker.update({
            where: { id },
            data: { api_secret: newSecretHashed }
        });

        res.json({
            success: true,
            message: "API secret has been reset",
            api_secret: newSecretPlain // Show once
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to reset secret" });
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
