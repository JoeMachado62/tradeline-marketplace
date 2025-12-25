import { Router, Request, Response } from "express";
import { body, query } from "express-validator";
import { authenticateBrokerJWT } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getAuthService } from "../services/AuthService";
import { getBrokerService } from "../services/BrokerService";
import { getOrderService } from "../services/OrderService";
import { prisma } from "../services/Database";

const router = Router();
const authService = getAuthService();
const brokerService = getBrokerService();
const orderService = getOrderService();

/**
 * POST /api/portal/broker/login
 * Broker login via Email + API Secret
 */
router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("api_key").notEmpty().withMessage("API Secret is required"), // Intentionally called api_key in FE form? Or use api_secret? Let's use api_secret
  ]),
  async (req: Request, res: Response) => {
    try {
        const { email, api_secret } = req.body;
        // Map form field if needed, but let's expect 'api_secret'
        const result = await authService.brokerLogin(email, api_secret);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        res.status(401).json({
            error: error.message || "Login failed",
            code: "LOGIN_FAILED"
        });
    }
  }
);

/**
 * GET /api/portal/broker/me
 * Get current broker profile
 */
router.get(
    "/me",
    authenticateBrokerJWT,
    async (req: Request, res: Response) => {
        try {
            const broker = await prisma.broker.findUnique({
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
                }
            });

            if (!broker) {
                 return res.status(404).json({ error: "Broker not found" });
            }

            return res.json({ success: true, broker });
        } catch (error) {
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
    }
);

/**
 * GET /api/portal/broker/dashboard
 * Get dashboard stats
 */
router.get(
    "/dashboard",
    authenticateBrokerJWT,
    async (req: Request, res: Response) => {
        try {
            const stats = await brokerService.getBrokerStats(req.broker.id);
            return res.json({ success: true, stats });
        } catch (error) {
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
    }
);

/**
 * GET /api/portal/broker/orders
 * List orders for this broker
 */
router.get(
    "/orders",
    authenticateBrokerJWT,
    validate([
        query("page").optional().isInt({ min: 1 }),
        query("limit").optional().isInt({ min: 1, max: 100 }),
        query("status").optional(),
    ]),
    async (req: Request, res: Response) => {
        try {
            const result = await orderService.getBrokerOrders(req.broker.id, {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                status: req.query.status as any
            });

            return res.json({ success: true, ...result });
        } catch (error) {
            return res.status(500).json({ error: "Failed to fetch orders" });
        }
    }
);

export default router;
