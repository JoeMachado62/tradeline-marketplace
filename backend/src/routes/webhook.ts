import { Router, Request, Response } from "express";
import { getPaymentService } from "../services/PaymentService";

const router = Router();
const paymentService = getPaymentService();

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post(
  "/",
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

export default router;
