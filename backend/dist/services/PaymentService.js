"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
exports.getPaymentService = getPaymentService;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
const OrderService_1 = require("./OrderService");
const PricingEngine_1 = require("./PricingEngine");
const Database_1 = require("./Database");
class PaymentService {
    stripe;
    orderService = (0, OrderService_1.getOrderService)();
    pricingEngine = (0, PricingEngine_1.getPricingEngine)();
    constructor() {
        if (config_1.config.stripe.secretKey) {
            try {
                this.stripe = new stripe_1.default(config_1.config.stripe.secretKey, {
                    apiVersion: config_1.config.stripe.apiVersion,
                    typescript: true,
                });
            }
            catch (e) {
                console.warn("Failed to initialize Stripe:", e);
            }
        }
        else {
            console.warn("Stripe secret key not found. Stripe features disabled.");
        }
    }
    /**
     * Create Stripe checkout session for order
     */
    async createCheckoutSession(data) {
        if (!this.stripe) {
            throw new Error("Stripe is not configured. Cannot create checkout session.");
        }
        // Calculate pricing with broker commission
        const calculation = await this.pricingEngine.calculateOrderTotal(data.items, data.broker_id);
        // Get full tradeline details for metadata (like credit_limit) which might be missing in calculation items
        const allTradelines = await this.pricingEngine.getMarketplaceTradelines();
        const metadataMap = new Map(allTradelines.map((t) => [t.card_id, t]));
        // Create order in our database first (pending status)
        const order = await this.orderService.createOrder({
            broker_id: data.broker_id,
            customer_email: data.customer_email,
            customer_name: "", // Will be updated from Stripe checkout
            items: data.items,
        });
        // Prepare line items for Stripe
        const lineItems = calculation.items.map((item) => {
            const tradelineMetadata = metadataMap.get(item.card_id);
            if (!tradelineMetadata) {
                throw new Error(`Tradeline ${item.card_id} not found in current pricing`);
            }
            return {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: tradelineMetadata.bank_name,
                        description: `Tradeline - Credit Limit: $${tradelineMetadata.credit_limit.toLocaleString()}`,
                        metadata: {
                            card_id: item.card_id,
                        },
                    },
                    unit_amount: PricingEngine_1.PricingEngine.usdToCents(item.customer_price),
                },
                quantity: item.quantity,
            };
        });
        // Create Stripe checkout session
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: lineItems,
            mode: "payment",
            customer_email: data.customer_email,
            success_url: data.success_url ||
                `${config_1.config.api.corsOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: data.cancel_url || `${config_1.config.api.corsOrigin}/cancel`,
            metadata: {
                order_id: order.id,
                broker_id: data.broker_id || "direct",
                order_number: order.order_number,
            },
            payment_intent_data: {
                metadata: {
                    order_id: order.id,
                    broker_id: data.broker_id || "direct",
                },
            },
        });
        // Update order with Stripe session ID
        await Database_1.prisma.order.update({
            where: { id: order.id },
            data: {
                stripe_session_id: session.id,
            },
        });
        console.log(`Checkout session created: ${session.id} for order ${order.order_number}`);
        return {
            session_id: session.id,
            checkout_url: session.url,
            order_id: order.id,
        };
    }
    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(signature, payload) {
        let event;
        try {
            // payload can be Buffer or string
            event = this.stripe.webhooks.constructEvent(payload, signature, config_1.config.stripe.webhookSecret);
        }
        catch (err) {
            console.error("Webhook signature verification failed:", err.message);
            throw new Error("Invalid webhook signature");
        }
        // Log webhook event
        await Database_1.prisma.webhookLog.create({
            data: {
                source: "STRIPE",
                event_type: event.type,
                payload: event,
                status: "PROCESSING",
            },
        });
        // Handle different event types
        try {
            switch (event.type) {
                case "checkout.session.completed":
                    await this.handleCheckoutSessionCompleted(event.data.object);
                    break;
                case "payment_intent.succeeded":
                    await this.handlePaymentIntentSucceeded(event.data.object);
                    break;
                case "payment_intent.payment_failed":
                    await this.handlePaymentIntentFailed(event.data.object);
                    break;
                default:
                    console.log(`Unhandled webhook event type: ${event.type}`);
            }
            // Mark webhook as processed
            await Database_1.prisma.webhookLog.updateMany({
                where: {
                    source: "STRIPE",
                    event_type: event.type,
                    status: "PROCESSING",
                },
                data: {
                    status: "PROCESSED",
                    processed_at: new Date(),
                },
            });
        }
        catch (error) {
            console.error(`Error processing webhook ${event.type}:`, error);
            // Mark webhook as failed
            await Database_1.prisma.webhookLog.updateMany({
                where: {
                    source: "STRIPE",
                    event_type: event.type,
                    status: "PROCESSING",
                },
                data: {
                    status: "FAILED",
                    error_message: error.message,
                },
            });
            throw error;
        }
    }
    /**
     * Handle successful checkout session
     */
    async handleCheckoutSessionCompleted(session) {
        const orderId = session.metadata?.order_id;
        if (!orderId) {
            console.error("No order_id in checkout session metadata");
            return;
        }
        // Get payment intent details
        const paymentIntentId = session.payment_intent;
        // Update customer name from Stripe
        if (session.customer_details) {
            await Database_1.prisma.order.update({
                where: { id: orderId },
                data: {
                    customer_name: session.customer_details.name || "",
                    customer_phone: session.customer_details.phone || undefined,
                },
            });
        }
        // Process the payment and create TradelineSupply order
        await this.orderService.processPayment(orderId, paymentIntentId, "STRIPE");
        console.log(`Order ${orderId} payment completed and sent to TradelineSupply`);
    }
    /**
     * Handle successful payment intent (backup handler)
     */
    async handlePaymentIntentSucceeded(paymentIntent) {
        const orderId = paymentIntent.metadata?.order_id;
        if (!orderId)
            return;
        // Check if order already processed
        const order = await Database_1.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order || order.payment_status === "SUCCEEDED") {
            return; // Already processed
        }
        await this.orderService.processPayment(orderId, paymentIntent.id, "STRIPE");
    }
    /**
     * Handle failed payment intent
     */
    async handlePaymentIntentFailed(paymentIntent) {
        const orderId = paymentIntent.metadata?.order_id;
        if (!orderId)
            return;
        await this.orderService.handlePaymentFailed(orderId, paymentIntent.last_payment_error?.message);
    }
}
exports.PaymentService = PaymentService;
// Singleton instance
let paymentServiceInstance = null;
function getPaymentService() {
    if (!paymentServiceInstance) {
        paymentServiceInstance = new PaymentService();
    }
    return paymentServiceInstance;
}
exports.default = PaymentService;
//# sourceMappingURL=PaymentService.js.map