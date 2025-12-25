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

export default router;
