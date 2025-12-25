import { Router, Request, Response } from "express";
import { body } from "express-validator";
import { authenticateBroker } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getPricingEngine } from "../services/PricingEngine";
import { prisma } from "../services/Database";

const router = Router();
const pricingEngine = getPricingEngine();

/**
 * GET /api/public/pricing
 * Get pricing for widget display
 * Requires broker API key
 */
router.get(
  "/pricing",
  authenticateBroker,
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;

      // Get pricing with broker's markup
      const pricing = await pricingEngine.getPricingForBroker(broker.id);

      // Track widget load in analytics
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
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
    } catch (error: any) {
      console.error("Pricing API error:", error);
      res.status(500).json({
        error: "Failed to fetch pricing",
        code: "PRICING_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/public/calculate
 * Calculate cart totals with broker pricing
 */
router.post(
  "/calculate",
  authenticateBroker,
  validate([
    body("items").isArray({ min: 1 }).withMessage("Cart items required"),
    body("items.*.card_id").notEmpty().withMessage("Card ID required"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Valid quantity required"),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { items } = req.body;

      // Calculate totals
      const calculation = await pricingEngine.calculateOrderTotal(
        items,
        broker.id
      );

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
          subtotal: calculation.total_customer_price,
          total: calculation.total_customer_price,
          item_count: items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          ),
        },
        currency: "USD",
      });
    } catch (error: any) {
      console.error("Calculation error:", error);
      res.status(400).json({
        error: "Failed to calculate totals",
        code: "CALCULATION_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/public/track
 * Track widget events for analytics
 */
router.post(
  "/track",
  authenticateBroker,
  validate([
    body("event").isIn(["view", "click", "add_to_cart", "checkout_started"]),
    body("data").optional().isObject(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { event, data } = req.body;

      const today = new Date().toISOString().split("T")[0];

      // Update analytics based on event type
      const updateData: any = {};

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
        await prisma.analytics.upsert({
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
            ...updateData,
          },
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          broker_id: broker.id,
          action: `WIDGET_${event.toUpperCase()}`,
          metadata: data,
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Tracking API error:", error);
      res.status(500).json({
        error: "Failed to track event",
        code: "TRACKING_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/public/config
 * Get widget configuration and settings
 */
router.get(
  "/config",
  authenticateBroker,
  async (req: Request, res: Response) => {
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
          },
          theme: {
            primary_color: "#2563eb",
            secondary_color: "#64748b",
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
    } catch (error) {
      console.error("Config error:", error);
      res.status(500).json({
        error: "Failed to fetch configuration",
        code: "CONFIG_ERROR",
      });
    }
  }
);

/**
 * POST /api/public/checkout
 * Create a Stripe checkout session
 */
router.post(
  "/checkout",
  authenticateBroker,
  validate([
    body("customer_email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("items").isArray({ min: 1 }).withMessage("Cart items required"),
    body("items.*.card_id").notEmpty().withMessage("Card ID required"),
    body("items.*.quantity").isInt({ min: 1, max: 10 }).withMessage("Invalid quantity"),
    body("success_url").optional().isURL(),
    body("cancel_url").optional().isURL(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { customer, items } = req.body;
      const { email, name, phone, password, signature } = customer;

      // Import services dynamically if needed or rely on globals at top
      // const { getOrderService } = require("../services/OrderService");
      // const orderService = getOrderService();
      // Using global 'prisma' from imports
      const bcrypt = require('bcrypt');
      
      // 1. Upsert Client
      let client = await prisma.client.findUnique({ where: { email } });
      
      const updateData: any = {
        name,
        phone,
        // Always update agreement timestamp if signature is present
        ...(signature ? { 
            signature, 
            signed_agreement_date: new Date() 
        } : {})
      };
      
      if (client) {
         // Update existing client info
         client = await prisma.client.update({
             where: { id: client.id },
             data: updateData
         });
      } else {
         const passwordHash = await bcrypt.hash(password || "temp1234", 10);
         client = await prisma.client.create({
            data: {
               email,
               password_hash: passwordHash,
               ...updateData
            }
         });
      }

      // 2. Create Order (Unpaid)
      const { getOrderService } = require("../services/OrderService");
      const orderService = getOrderService();

      const order = await orderService.createOrder({
        broker_id: broker.id,
        client_id: client.id,
        customer_email: email,
        customer_name: name,
        customer_phone: phone,
        items: items
      });

      // 3. Track Analytics
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
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

      res.json({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        redirect_url: `https://app.tradelinesupply.com/portal/login?email=${encodeURIComponent(email)}&new=true`
        // Provide absolute URL for redirection
      });

    } catch (error: any) {
      console.error("Manual checkout error:", error);
      res.status(500).json({
        error: "Failed to process checkout",
        code: "CHECKOUT_ERROR",
        message: error.message,
      });
    }
  }
);

export default router;
