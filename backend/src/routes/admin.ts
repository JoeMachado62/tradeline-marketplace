import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validation";
import { getAuthService } from "../services/AuthService";
import { prisma } from "../services/Database";
import { config } from "../config";
import jwt from "jsonwebtoken";

const router = Router();
const authService = getAuthService();

// Temporary until middleware is strictly enforced or imported
const authenticateAdmin = async (req: Request, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization" });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      if (decoded.type !== "admin") return res.status(403).json({ error: "Admin access required" });
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
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

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(401).json({
        error: error.message || "Login failed",
        code: "LOGIN_FAILED",
      });
    }
  }
);

/**
 * GET /api/admin/dashboard
 */
router.get(
  "/dashboard",
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
        const stats = {
            brokers: await prisma.broker.count(),
            active_brokers: await prisma.broker.count({ where: { status: "ACTIVE" } }),
            orders: await prisma.order.count(),
            revenue: 0 // TODO: Aggregate revenue
        };
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: "Dashboard error" });
    }
  }
);

export default router;
