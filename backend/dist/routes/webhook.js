"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PaymentService_1 = require("../services/PaymentService");
const router = (0, express_1.Router)();
const paymentService = (0, PaymentService_1.getPaymentService)();
/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post("/", async (req, res) => {
    try {
        const signature = req.headers["stripe-signature"];
        if (!signature) {
            return res.status(400).json({
                error: "Missing stripe-signature header",
            });
        }
        // Pass raw body for signature verification
        // req.body should be a Buffer due to express.raw in server.ts
        await paymentService.handleWebhook(signature, req.body);
        return res.json({ received: true });
    }
    catch (error) {
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
});
exports.default = router;
//# sourceMappingURL=webhook.js.map