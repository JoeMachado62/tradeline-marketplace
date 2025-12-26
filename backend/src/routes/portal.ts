import { Router, Request, Response } from "express";
import { body, param } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../services/Database";
import { validate } from "../middleware/validation";
import { authenticateClient } from "../middleware/clientAuth";
import { PricingEngine } from "../services/PricingEngine";

const router = Router();

// POST /api/portal/login
router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const client = await prisma.client.findUnique({ where: { email } });
      if (!client || !client.password_hash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const valid = await bcrypt.compare(password, client.password_hash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Generate token
      const token = jwt.sign(
        { id: client.id, role: "CLIENT" },
        config.jwt.secret,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        token,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          has_signed_agreement: !!client.signed_agreement_date,
          signed_agreement_date: client.signed_agreement_date
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// GET /api/portal/profile
router.get("/profile", authenticateClient, async (req: Request, res: Response) => {
    try {
        const client = req.client;
        // Refetch to ensure latest data
        const freshClient = await prisma.client.findUnique({ where: { id: client.id } });
        
        if (!freshClient) {
             res.status(404).json({ error: "Client not found" });
             return;
        }

        res.json({
            success: true,
            client: {
                id: freshClient.id,
                name: freshClient.name,
                email: freshClient.email,
                phone: freshClient.phone,
                has_signed_agreement: !!freshClient.signed_agreement_date,
                signed_agreement_date: freshClient.signed_agreement_date
            }
        });
    } catch (error) {
        console.error("Fetch profile error:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// GET /api/portal/orders - My Orders
router.get("/orders", authenticateClient, async (req: Request, res: Response) => {
  try {
    const client = req.client;
    
    const orders = await prisma.order.findMany({
      where: { client_id: client.id },
      include: { 
         items: true,
         broker: { select: { name: true, business_name: true, phone: true, email: true }} // Client sees who they bought from?
      },
      orderBy: { created_at: "desc" },
    });

    res.json({
      success: true,
      orders: orders.map((o: any) => ({
        ...o,
        total_charged_usd: PricingEngine.centsToUsd(o.total_charged),
        item_count: o.items.length
      }))
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/portal/orders/:id - Order Details
router.get(
    "/orders/:id", 
    authenticateClient,
    validate([param("id").isUUID()]),
    async (req: Request, res: Response) => {
    try {
      const client = req.client;
      const orderId = req.params.id;
      
      const order = await prisma.order.findFirst({
        where: { 
            id: orderId,
            client_id: client.id 
        },
        include: {
            items: true,
            broker: { 
                select: { 
                    name: true, 
                    business_name: true, 
                    email: true, 
                    phone: true,
                    // If we have custom payment instructions per broker, fetch here
                    // e.g. broker.payment_instructions
                } 
            }
        }
      });
  
      if (!order) {
         res.status(404).json({ error: "Order not found" });
         return;
      }
  
      res.json({
        success: true,
        order: {
          ...order,
          total_charged_usd: PricingEngine.centsToUsd(order.total_charged),
          // We can attach generic payment instructions here if platform-wide
        }
      });
    } catch (error) {
      console.error("Fetch order detail error:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

// POST /api/portal/forgot-password
router.post(
  "/forgot-password",
  validate([
    body("email").isEmail().normalizeEmail(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const client = await prisma.client.findUnique({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!client) {
        res.json({ success: true, message: "If an account exists, a reset link will be sent." });
        return;
      }

      // Generate reset token (valid for 1 hour)
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      await prisma.client.update({
        where: { id: client.id },
        data: {
          reset_token: resetToken,
          reset_token_expires: resetExpires,
        },
      });

      // Build reset URL
      const baseUrl = process.env.PUBLIC_URL || "https://tradeline-marketplace-production-bcaa.up.railway.app";
      const resetUrl = `${baseUrl}/portal/reset-password?token=${resetToken}`;

      // TODO: Send email with reset link
      // For now, log it (in production, use email service)
      console.log(`Password reset requested for ${email}`);
      console.log(`Reset URL: ${resetUrl}`);

      res.json({ 
        success: true, 
        message: "If an account exists, a reset link will be sent.",
        // DEV ONLY - remove in production:
        ...(process.env.NODE_ENV !== 'production' && { resetUrl })
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  }
);

// POST /api/portal/validate-reset-token
router.post(
  "/validate-reset-token",
  validate([
    body("token").isString().notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const client = await prisma.client.findFirst({
        where: {
          reset_token: token,
          reset_token_expires: { gt: new Date() },
        },
      });

      if (!client) {
        res.status(400).json({ valid: false, error: "Invalid or expired reset token" });
        return;
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Validate token error:", error);
      res.status(500).json({ error: "Failed to validate token" });
    }
  }
);

// POST /api/portal/reset-password
router.post(
  "/reset-password",
  validate([
    body("token").isString().notEmpty(),
    body("password").isString().isLength({ min: 8 }),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      const client = await prisma.client.findFirst({
        where: {
          reset_token: token,
          reset_token_expires: { gt: new Date() },
        },
      });

      if (!client) {
        res.status(400).json({ error: "Invalid or expired reset token" });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      await prisma.client.update({
        where: { id: client.id },
        data: {
          password_hash: passwordHash,
          reset_token: null,
          reset_token_expires: null,
        },
      });

      console.log(`Password reset successful for ${client.email}`);

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

export default router;

