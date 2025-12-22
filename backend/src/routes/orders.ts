import { Router, Request, Response } from "express";
import { body, query, param } from "express-validator";
import { authenticateBroker, authenticateAdmin } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getOrderService } from "../services/OrderService";
import { getPaymentService } from "../services/PaymentService";
import { prisma } from "../services/Database";

const router = Router();
const orderService = getOrderService();
const paymentService = getPaymentService();

/**
 * POST /api/orders/checkout
 * Create checkout session for order
 */
router.post(
  "/checkout",
  authenticateBroker,
  validate([
    body("customer_email").isEmail().normalizeEmail(),
    body("items").isArray({ min: 1 }),
    body("items.*.card_id").notEmpty(),
    body("items.*.quantity").isInt({ min: 1, max: 10 }),
    body("success_url").optional().isURL(),
    body("cancel_url").optional().isURL(),
  ]),
  async (req: Request, res: Response) => {
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

      await prisma.analytics.upsert({
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
    } catch (error: any) {
      console.error("Checkout creation error:", error);
      return res.status(500).json({
        error: "Failed to create checkout session",
        code: "CHECKOUT_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/orders/webhook/stripe
 * Handle Stripe webhook events
 */
router.post(
  "/webhook/stripe",
  // No auth - webhook endpoint
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers["stripe-signature"] as string;

      if (!signature) {
        return res.status(400).json({
          error: "Missing stripe-signature header",
        });
      }

      // Pass raw body for signature verification
      // req.body should be a Buffer due to express.raw in server.ts
      await paymentService.handleWebhook(signature, req.body);

      return res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook processing error:", error);

      // Return 200 to prevent Stripe retries for processing errors
      // Only return 400 for signature verification failures
      if (error.message === "Invalid webhook signature") {
        return res.status(400).json({
          error: "Invalid signature",
        });
      }

      return res.json({ received: true, error: error.message });
    }
  }
);

/**
 * GET /api/orders/broker
 * Get broker's orders
 */
router.get(
  "/broker",
  authenticateBroker,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional(),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { page, limit, status, start_date, end_date } = req.query;

      const result = await orderService.getBrokerOrders(broker.id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
        startDate: start_date ? new Date(start_date as string) : undefined,
        endDate: end_date ? new Date(end_date as string) : undefined,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Get broker orders error:", error);
      return res.status(500).json({
        error: "Failed to fetch orders",
        code: "FETCH_ORDERS_ERROR",
      });
    }
  }
);

/**
 * GET /api/orders/:id
 * Get order details (Admin or owning broker)
 */
router.get(
  "/:id",
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
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
      } else if (req.broker && order.broker_id === req.broker.id) {
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
    } catch (error: any) {
      console.error("Get order error:", error);
      return res.status(500).json({
        error: "Failed to fetch order",
        code: "FETCH_ORDER_ERROR",
      });
    }
  }
);

/**
 * GET /api/orders
 * List all orders (Admin only)
 */
router.get(
  "/",
  authenticateAdmin,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("broker_id").optional().isUUID(),
    query("status").optional(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, broker_id, status } = req.query;

      const result = await orderService.listOrders({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
        brokerId: broker_id as string,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("List orders error:", error);
      return res.status(500).json({
        error: "Failed to fetch orders",
        code: "LIST_ORDERS_ERROR",
      });
    }
  }
);

/**
 * POST /api/orders/:id/manual-payment
 * Record a manual payment (Admin only)
 */
router.post(
  "/:id/manual-payment",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    body("payment_method").isIn(["CASH", "WIRE", "CHECK", "MANUAL"]),
  ]),
  async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      const { payment_method } = req.body;
      const admin = req.admin;

      const updatedOrder = await orderService.recordManualPayment(
        orderId, 
        payment_method, 
        admin.id
      );

      return res.json({
        success: true,
        order: updatedOrder,
      });
    } catch (error: any) {
      console.error("Manual payment recording error:", error);
      return res.status(400).json({
        error: error.message || "Failed to record manual payment",
        code: "MANUAL_PAYMENT_ERROR",
      });
    }
  }
);

export default router;
