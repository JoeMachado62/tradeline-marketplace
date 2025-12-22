import Stripe from "stripe";
import { config } from "../config";
import { getOrderService } from "./OrderService";
import { getPricingEngine, PricingEngine } from "./PricingEngine";
import { prisma } from "./Database";
import { Tradeline } from "../types";

export class PaymentService {
  private stripe: any;
  private orderService = getOrderService();
  private pricingEngine = getPricingEngine();

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion as any,
      typescript: true,
    });
  }

  /**
   * Create Stripe checkout session for order
   */
  async createCheckoutSession(data: {
    broker_id?: string;
    customer_email: string;
    items: Array<{
      card_id: string;
      quantity: number;
    }>;
    success_url?: string;
    cancel_url?: string;
  }): Promise<{
    session_id: string;
    checkout_url: string;
    order_id: string;
  }> {
    // Calculate pricing with broker commission
    const calculation = await this.pricingEngine.calculateOrderTotal(
      data.items,
      data.broker_id
    );

    // Get full tradeline details for metadata (like credit_limit) which might be missing in calculation items
    const allTradelines = await this.pricingEngine.getMarketplaceTradelines();
    const metadataMap = new Map<string, Tradeline>(allTradelines.map((t) => [t.card_id, t]));

    // Create order in our database first (pending status)
    const order = await this.orderService.createOrder({
      broker_id: data.broker_id,
      customer_email: data.customer_email,
      customer_name: "", // Will be updated from Stripe checkout
      items: data.items,
    });

    // Prepare line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      calculation.items.map((item) => {
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
            unit_amount: PricingEngine.usdToCents(item.customer_price),
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
      success_url:
        data.success_url ||
        `${config.api.corsOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: data.cancel_url || `${config.api.corsOrigin}/cancel`,
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
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripe_session_id: session.id,
      },
    });

    console.log(
      `Checkout session created: ${session.id} for order ${order.order_number}`
    );

    return {
      session_id: session.id,
      checkout_url: session.url!,
      order_id: order.id,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(signature: string, payload: any): Promise<void> {
    let event: Stripe.Event;

    try {
      // payload can be Buffer or string
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      throw new Error("Invalid webhook signature");
    }

    // Log webhook event
    await prisma.webhookLog.create({
      data: {
        source: "STRIPE",
        event_type: event.type,
        payload: event as any,
        status: "PROCESSING",
      },
    });

    // Handle different event types
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session
          );
          break;

        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      // Mark webhook as processed
      await prisma.webhookLog.updateMany({
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
    } catch (error: any) {
      console.error(`Error processing webhook ${event.type}:`, error);

      // Mark webhook as failed
      await prisma.webhookLog.updateMany({
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
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error("No order_id in checkout session metadata");
      return;
    }

    // Get payment intent details
    const paymentIntentId = session.payment_intent as string;

    // Update customer name from Stripe
    if (session.customer_details) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          customer_name: session.customer_details.name || "",
          customer_phone: session.customer_details.phone || undefined,
        },
      });
    }

    // Process the payment and create TradelineSupply order
    await this.orderService.processPayment(orderId, paymentIntentId, "STRIPE" as any);

    console.log(
      `Order ${orderId} payment completed and sent to TradelineSupply`
    );
  }

  /**
   * Handle successful payment intent (backup handler)
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    // Check if order already processed
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.payment_status === "SUCCEEDED") {
      return; // Already processed
    }

    await this.orderService.processPayment(orderId, paymentIntent.id, "STRIPE" as any);
  }

  /**
   * Handle failed payment intent
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    await this.orderService.handlePaymentFailed(orderId, paymentIntent.last_payment_error?.message);
  }
}

// Singleton instance
let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}

export default PaymentService;
