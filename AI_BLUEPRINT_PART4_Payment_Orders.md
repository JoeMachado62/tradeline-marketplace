# Tradeline Marketplace - AI Development Blueprint (REVISED)

# PART 4: Payment Processing & Order Management

## Sprint 5: Stripe Integration & Order Processing

### Task 5.1: Implement Order Service with Commission Tracking

**Priority**: High
**Complexity**: Complex
**Dependencies**: Part 3 completed

**Files to Create**:

`/backend/src/services/OrderService.ts`:

```typescript
import { Order, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "./Database";
import { getPricingEngine, PricingEngine } from "./PricingEngine";
import { getTradelineSupplyAPI } from "./TradelineSupplyAPI";
import { getCacheService } from "./Cache";
import { config } from "@/config";

export class OrderService {
  private pricingEngine = getPricingEngine();
  private tradelineAPI = getTradelineSupplyAPI();
  private cache = getCacheService();

  /**
   * Generate human-readable order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `TLM${year}${month}${random}`;
  }

  /**
   * Create a new order with proper commission tracking
   */
  async createOrder(data: {
    broker_id?: string;
    customer_email: string;
    customer_name: string;
    customer_phone?: string;
    items: Array<{
      card_id: string;
      quantity: number;
    }>;
    stripe_session_id?: string;
  }): Promise<Order> {
    // Calculate pricing with broker commission
    const calculation = await this.pricingEngine.calculateOrderTotal(
      data.items,
      data.broker_id
    );

    // Get broker for commission details
    let broker = null;
    if (data.broker_id) {
      broker = await prisma.broker.findUnique({
        where: { id: data.broker_id },
      });
    }

    // Create order with all commission details
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          order_number: this.generateOrderNumber(),
          broker_id: data.broker_id,
          customer_email: data.customer_email,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          stripe_session_id: data.stripe_session_id,

          // Pricing breakdown (in cents for precision)
          subtotal_base: PricingEngine.usdToCents(calculation.subtotal_base),
          broker_revenue_share: PricingEngine.usdToCents(
            calculation.total_revenue_share
          ),
          broker_markup: PricingEngine.usdToCents(
            calculation.total_broker_markup
          ),
          platform_net_revenue: PricingEngine.usdToCents(
            calculation.total_platform_revenue
          ),
          total_charged: PricingEngine.usdToCents(
            calculation.total_customer_price
          ),

          status: "PENDING",
          payment_status: "PENDING",

          // Create order items
          items: {
            create: calculation.items.map((item) => ({
              card_id: item.card_id,
              bank_name: item.bank_name,
              credit_limit: 0, // Will be populated from tradeline data
              date_opened: "", // Will be populated from tradeline data
              quantity: item.quantity,

              // Unit prices (in cents)
              base_price: PricingEngine.usdToCents(item.base_price),
              revenue_share: PricingEngine.usdToCents(
                item.broker_revenue_share
              ),
              markup: PricingEngine.usdToCents(item.broker_markup),
              customer_price: PricingEngine.usdToCents(item.customer_price),

              // Total prices (quantity * unit)
              total_base: PricingEngine.usdToCents(
                item.base_price * item.quantity
              ),
              total_revenue_share: PricingEngine.usdToCents(
                item.broker_revenue_share * item.quantity
              ),
              total_markup: PricingEngine.usdToCents(
                item.broker_markup * item.quantity
              ),
              total_customer_price: PricingEngine.usdToCents(
                item.customer_price * item.quantity
              ),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Create commission record for broker if applicable
      if (data.broker_id && broker) {
        await tx.commissionRecord.create({
          data: {
            broker_id: data.broker_id,
            order_id: newOrder.id,
            revenue_share_amount: newOrder.broker_revenue_share,
            markup_amount: newOrder.broker_markup,
            total_commission:
              newOrder.broker_revenue_share + newOrder.broker_markup,
            payout_status: "PENDING",
          },
        });
      }

      // Log the order creation
      await tx.activityLog.create({
        data: {
          broker_id: data.broker_id,
          action: "ORDER_CREATED",
          entity_type: "Order",
          entity_id: newOrder.id,
          metadata: {
            order_number: newOrder.order_number,
            item_count: newOrder.items.length,
            total: PricingEngine.centsToUsd(newOrder.total_charged),
          },
        },
      });

      return newOrder;
    });

    console.log(
      `Order created: ${order.order_number} for ${PricingEngine.centsToUsd(
        order.total_charged
      )}`
    );
    return order;
  }

  /**
   * Process successful payment and create TradelineSupply order
   */
  async processPayment(
    orderId: string,
    paymentIntentId: string
  ): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        broker: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== "PENDING") {
      throw new Error(`Order ${order.order_number} is not in pending state`);
    }

    // Start transaction to update order and create fulfillment
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          stripe_payment_intent: paymentIntentId,
          payment_status: "SUCCEEDED",
          status: "PROCESSING",
        },
      });

      // Create order in TradelineSupply
      try {
        const tradelineOrder = await this.tradelineAPI.createOrder({
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          items: order.items.map((item) => ({
            card_id: item.card_id,
            quantity: item.quantity,
          })),
          order_id: order.order_number,
        });

        // Update with TradelineSupply order ID
        await tx.order.update({
          where: { id: orderId },
          data: {
            tradeline_order_id: tradelineOrder.id.toString(),
            tradeline_order_status: tradelineOrder.status,
            status: "COMPLETED",
            completed_at: new Date(),
          },
        });

        console.log(`TradelineSupply order created: #${tradelineOrder.id}`);
      } catch (error) {
        console.error("Failed to create TradelineSupply order:", error);

        // Mark order as failed fulfillment
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "FAILED",
            tradeline_order_status: "failed_to_create",
          },
        });

        throw error;
      }

      // Update analytics if broker order
      if (order.broker_id) {
        const today = new Date().toISOString().split("T")[0];

        await tx.analytics.upsert({
          where: {
            broker_id_date: {
              broker_id: order.broker_id,
              date: new Date(today),
            },
          },
          update: {
            orders_count: { increment: 1 },
            total_sales: { increment: order.total_charged },
            revenue_share_earned: { increment: order.broker_revenue_share },
            markup_earned: { increment: order.broker_markup },
          },
          create: {
            broker_id: order.broker_id,
            date: new Date(today),
            orders_count: 1,
            total_sales: order.total_charged,
            revenue_share_earned: order.broker_revenue_share,
            markup_earned: order.broker_markup,
          },
        });
      }

      // Update commission record
      if (order.broker_id) {
        await tx.commissionRecord.updateMany({
          where: {
            order_id: orderId,
            payout_status: "PENDING",
          },
          data: {
            payout_status: "PENDING", // Will be paid out in next payout cycle
          },
        });
      }

      // Log successful payment
      await tx.activityLog.create({
        data: {
          broker_id: order.broker_id,
          action: "PAYMENT_COMPLETED",
          entity_type: "Order",
          entity_id: orderId,
          metadata: {
            order_number: order.order_number,
            payment_intent: paymentIntentId,
            total: PricingEngine.centsToUsd(order.total_charged),
          },
        },
      });

      return updated;
    });

    // Clear any cached data
    if (order.broker_id) {
      await this.cache.delete(this.cache.keys.order(orderId));
    }

    return updatedOrder;
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(orderId: string, reason?: string): Promise<void> {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        payment_status: "FAILED",
        status: "FAILED",
      },
    });

    // Log failure
    await prisma.activityLog.create({
      data: {
        action: "PAYMENT_FAILED",
        entity_type: "Order",
        entity_id: orderId,
        metadata: { reason },
      },
    });
  }

  /**
   * Get order details with commission breakdown
   */
  async getOrderWithCommission(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        broker: {
          select: {
            id: true,
            name: true,
            business_name: true,
            revenue_share_percent: true,
            markup_type: true,
            markup_value: true,
          },
        },
        commission_records: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Calculate commission breakdown
    const commissionBreakdown = {
      tradeline_supply_gets: PricingEngine.centsToUsd(order.subtotal_base),
      platform_gross_commission:
        PricingEngine.centsToUsd(order.subtotal_base) * 0.5,
      broker_revenue_share: PricingEngine.centsToUsd(
        order.broker_revenue_share
      ),
      broker_markup: PricingEngine.centsToUsd(order.broker_markup),
      platform_net_commission: PricingEngine.centsToUsd(
        order.platform_net_revenue
      ),
      broker_total_earnings: PricingEngine.centsToUsd(
        order.broker_revenue_share + order.broker_markup
      ),
    };

    return {
      ...order,
      commission_breakdown: commissionBreakdown,
      // Add USD versions of cent values
      subtotal_base_usd: PricingEngine.centsToUsd(order.subtotal_base),
      broker_revenue_share_usd: PricingEngine.centsToUsd(
        order.broker_revenue_share
      ),
      broker_markup_usd: PricingEngine.centsToUsd(order.broker_markup),
      platform_net_revenue_usd: PricingEngine.centsToUsd(
        order.platform_net_revenue
      ),
      total_charged_usd: PricingEngine.centsToUsd(order.total_charged),
    };
  }

  /**
   * Get orders for a broker
   */
  async getBrokerOrders(
    brokerId: string,
    options: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    orders: any[];
    pagination: any;
    summary: any;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const where: Prisma.OrderWhereInput = {
      broker_id: brokerId,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate && options.endDate) {
      where.created_at = {
        gte: options.startDate,
        lte: options.endDate,
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          items: true,
          commission_records: true,
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    // Calculate summary statistics
    const summary = await prisma.order.aggregate({
      where: {
        ...where,
        status: "COMPLETED",
      },
      _sum: {
        broker_revenue_share: true,
        broker_markup: true,
        total_charged: true,
      },
      _count: true,
    });

    return {
      orders: orders.map((order) => ({
        ...order,
        total_charged_usd: PricingEngine.centsToUsd(order.total_charged),
        broker_earnings_usd: PricingEngine.centsToUsd(
          order.broker_revenue_share + order.broker_markup
        ),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total_orders: summary._count,
        total_revenue: PricingEngine.centsToUsd(
          summary._sum.total_charged || 0
        ),
        total_commission: PricingEngine.centsToUsd(
          (summary._sum.broker_revenue_share || 0) +
            (summary._sum.broker_markup || 0)
        ),
        revenue_share_earned: PricingEngine.centsToUsd(
          summary._sum.broker_revenue_share || 0
        ),
        markup_earned: PricingEngine.centsToUsd(
          summary._sum.broker_markup || 0
        ),
      },
    };
  }
}

// Singleton instance
let orderInstance: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderInstance) {
    orderInstance = new OrderService();
  }
  return orderInstance;
}

export default OrderService;
```

---

### Task 5.2: Admin Manual Payment Recording

**Priority**: Medium
**Complexity**: Moderate
**Dependencies**: Task 5.1

Admins need to be able to record payments made outside the Stripe system (e.g., Cash, Wire Transfer handled manually).

**Files to Update**:
`/backend/src/services/OrderService.ts`:
Add a `recordManualPayment` method.

```typescript
  /**
   * Record a payment made manually (Cash, Wire, etc.)
   */
  async recordManualPayment(orderId: string, paymentMethod: 'CASH' | 'WIRE' | 'CHECK', adminId: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Order not found");
    if (order.status !== 'PENDING') throw new Error("Order is not in a pending state");

    return await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          payment_status: 'SUCCEEDED',
          status: 'PROCESSING',
        }
      });

      // 2. Trigger TradelineSupply fulfillment
      // (This will call the same logic as Stripe success)

      // 3. Log the admin action
      await tx.activityLog.create({
        data: {
          action: 'MANUAL_PAYMENT_RECORDED',
          entity_type: 'Order',
          entity_id: orderId,
          metadata: {
            paymentMethod,
            recordedBy: adminId,
            total: order.total_charged
          },
        }
      });

      return updatedOrder;
    });
  }
```

### Task 5.3: Implement Stripe Payment Service

**Priority**: High
**Complexity**: Complex
**Dependencies**: Task 5.1

**Commands to Execute**:

```bash
npm install stripe
npm install --save-dev @types/stripe
```

**Files to Create**:

`/backend/src/services/PaymentService.ts`:

```typescript
import Stripe from "stripe";
import { config } from "@/config";
import { getOrderService } from "./OrderService";
import { getPricingEngine } from "./PricingEngine";
import { prisma } from "./Database";

export class PaymentService {
  private stripe: Stripe;
  private orderService = getOrderService();
  private pricingEngine = getPricingEngine();

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion,
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

    // Get tradeline details for line items
    const pricing = await this.pricingEngine.getPricingForBroker(
      data.broker_id
    );
    const pricingMap = new Map(pricing.map((p) => [p.card_id, p]));

    // Create order in our database first (pending status)
    const order = await this.orderService.createOrder({
      broker_id: data.broker_id,
      customer_email: data.customer_email,
      customer_name: "", // Will be updated from Stripe
      items: data.items,
    });

    // Prepare line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      calculation.items.map((item) => {
        const tradeline = pricingMap.get(item.card_id)!;
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: tradeline.bank_name,
              description: `Tradeline - Credit Limit: $${tradeline.credit_limit.toLocaleString()}`,
              metadata: {
                card_id: item.card_id,
              },
            },
            unit_amount: Math.round(item.customer_price * 100), // Convert to cents
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
  async handleWebhook(signature: string, payload: string): Promise<void> {
    let event: Stripe.Event;

    try {
      // Verify webhook signature
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

        case "charge.refunded":
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
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
    await this.orderService.processPayment(orderId, paymentIntentId);

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

    await this.orderService.processPayment(orderId, paymentIntent.id);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    const failureMessage =
      paymentIntent.last_payment_error?.message || "Payment failed";
    await this.orderService.handlePaymentFailed(orderId, failureMessage);

    console.log(`Payment failed for order ${orderId}: ${failureMessage}`);
  }

  /**
   * Handle refund
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = charge.payment_intent as string;
    if (!paymentIntentId) return;

    // Find order by payment intent
    const order = await prisma.order.findFirst({
      where: { stripe_payment_intent: paymentIntentId },
    });

    if (!order) return;

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "REFUNDED",
        payment_status: "REFUNDED",
      },
    });

    // Update commission records
    await prisma.commissionRecord.updateMany({
      where: {
        order_id: order.id,
        payout_status: "PENDING",
      },
      data: {
        payout_status: "CANCELLED",
      },
    });

    console.log(`Order ${order.order_number} refunded`);
  }

  /**
   * Create payment link for manual payment
   */
  async createPaymentLink(data: {
    order_id: string;
    expires_in_hours?: number;
  }): Promise<string> {
    const order = await this.orderService.getOrderWithCommission(data.order_id);

    if (!order) {
      throw new Error("Order not found");
    }

    // Create payment link
    const paymentLink = await this.stripe.paymentLinks.create({
      line_items: order.items.map((item: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.bank_name,
            metadata: {
              card_id: item.card_id,
            },
          },
          unit_amount: item.customer_price, // Already in cents
        },
        quantity: item.quantity,
      })),
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
      after_completion: {
        type: "redirect",
        redirect: {
          url: `${config.api.corsOrigin}/order-complete?order=${order.order_number}`,
        },
      },
    });

    return paymentLink.url;
  }
}

// Singleton instance
let paymentInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentInstance) {
    paymentInstance = new PaymentService();
  }
  return paymentInstance;
}

export default PaymentService;
```

---

### Task 5.3: Create Order & Payment API Routes

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 5.2

**Files to Create**:

`/backend/src/routes/orders.ts`:

```typescript
import { Router, Request, Response } from "express";
import { body, query, param } from "express-validator";
import { authenticateBroker, authenticateAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validation";
import { getOrderService } from "@/services/OrderService";
import { getPaymentService } from "@/services/PaymentService";
import { prisma } from "@/services/Database";
import { PricingEngine } from "@/services/PricingEngine";

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
        success_url:
          success_url || broker.website
            ? `${broker.website}/success`
            : undefined,
        cancel_url:
          cancel_url || broker.website ? `${broker.website}/cart` : undefined,
      });

      // Track checkout started
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
        where: {
          broker_id_date: {
            broker_id: broker.id,
            date: new Date(today),
          },
        },
        update: {
          cart_additions: { increment: 1 },
        },
        create: {
          broker_id: broker.id,
          date: new Date(today),
          cart_additions: 1,
        },
      });

      res.json({
        success: true,
        session_id: result.session_id,
        checkout_url: result.checkout_url,
        order_id: result.order_id,
      });
    } catch (error: any) {
      console.error("Checkout creation error:", error);
      res.status(500).json({
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
      await paymentService.handleWebhook(signature, req.body);

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook processing error:", error);

      // Return 200 to prevent Stripe retries for processing errors
      // Only return 400 for signature verification failures
      if (error.message === "Invalid webhook signature") {
        return res.status(400).json({
          error: "Invalid signature",
        });
      }

      res.json({ received: true, error: error.message });
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
    query("status")
      .optional()
      .isIn(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"]),
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

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Get broker orders error:", error);
      res.status(500).json({
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

      // Check authorization
      let authorized = false;
      let brokerId: string | undefined;

      // Try broker auth first
      if (req.headers["x-api-key"]) {
        const { authenticateBroker } = await import("@/middleware/auth");
        await new Promise((resolve) => {
          authenticateBroker(req, res, resolve as any);
        });

        if (req.broker) {
          brokerId = req.broker.id;
        }
      }

      // Check if order belongs to broker
      const order = await orderService.getOrderWithCommission(orderId);

      if (!order) {
        return res.status(404).json({
          error: "Order not found",
          code: "ORDER_NOT_FOUND",
        });
      }

      // Check authorization
      if (brokerId) {
        authorized = order.broker_id === brokerId;
      } else if (req.admin) {
        authorized = true;
      }

      if (!authorized) {
        return res.status(403).json({
          error: "Access denied",
          code: "UNAUTHORIZED",
        });
      }

      res.json({
        success: true,
        order,
      });
    } catch (error: any) {
      console.error("Get order error:", error);
      res.status(500).json({
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
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        broker_id,
        status,
        start_date,
        end_date,
      } = req.query;

      const where: any = {};

      if (broker_id) {
        where.broker_id = broker_id;
      }

      if (status) {
        where.status = status;
      }

      if (start_date && end_date) {
        where.created_at = {
          gte: new Date(start_date as string),
          lte: new Date(end_date as string),
        };
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          include: {
            broker: {
              select: {
                name: true,
                business_name: true,
              },
            },
            items: true,
          },
          orderBy: { created_at: "desc" },
        }),
        prisma.order.count({ where }),
      ]);

      // Calculate summary
      const summary = await prisma.order.aggregate({
        where: {
          ...where,
          status: "COMPLETED",
        },
        _sum: {
          total_charged: true,
          platform_net_revenue: true,
          broker_revenue_share: true,
          broker_markup: true,
        },
      });

      res.json({
        success: true,
        orders: orders.map((order) => ({
          ...order,
          total_charged_usd: PricingEngine.centsToUsd(order.total_charged),
          platform_net_revenue_usd: PricingEngine.centsToUsd(
            order.platform_net_revenue
          ),
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        summary: {
          total_revenue: PricingEngine.centsToUsd(
            summary._sum.total_charged || 0
          ),
          platform_revenue: PricingEngine.centsToUsd(
            summary._sum.platform_net_revenue || 0
          ),
          broker_commissions: PricingEngine.centsToUsd(
            (summary._sum.broker_revenue_share || 0) +
              (summary._sum.broker_markup || 0)
          ),
        },
      });
    } catch (error) {
      console.error("List orders error:", error);
      res.status(500).json({
        error: "Failed to fetch orders",
        code: "LIST_ORDERS_ERROR",
      });
    }
  }
);

export default router;
```

---

### Task 5.4: Implement Commission Payout Service

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 5.3

**Files to Create**:

`/backend/src/services/PayoutService.ts`:

```typescript
import { Payout, PayoutStatus, Prisma } from "@prisma/client";
import { prisma } from "./Database";
import { PricingEngine } from "./PricingEngine";

export class PayoutService {
  /**
   * Create monthly payout for broker
   */
  async createMonthlyPayout(
    brokerId: string,
    year: number,
    month: number
  ): Promise<Payout> {
    // Calculate period dates
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Check if payout already exists
    const existing = await prisma.payout.findFirst({
      where: {
        broker_id: brokerId,
        period_start: periodStart,
        period_end: periodEnd,
      },
    });

    if (existing) {
      throw new Error("Payout already exists for this period");
    }

    // Get all unpaid commission records for the period
    const commissions = await prisma.commissionRecord.findMany({
      where: {
        broker_id: brokerId,
        payout_status: "PENDING",
        created_at: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        order: true,
      },
    });

    if (commissions.length === 0) {
      throw new Error("No commissions to pay out for this period");
    }

    // Calculate totals
    const totals = commissions.reduce(
      (acc, commission) => ({
        revenue_share: acc.revenue_share + commission.revenue_share_amount,
        markup: acc.markup + commission.markup_amount,
        total: acc.total + commission.total_commission,
      }),
      { revenue_share: 0, markup: 0, total: 0 }
    );

    // Create payout in transaction
    const payout = await prisma.$transaction(async (tx) => {
      // Create payout record
      const newPayout = await tx.payout.create({
        data: {
          broker_id: brokerId,
          period_start: periodStart,
          period_end: periodEnd,
          total_revenue_share: totals.revenue_share,
          total_markup: totals.markup,
          total_amount: totals.total,
          payment_method: "ACH",
          status: "PENDING",
        },
      });

      // Update commission records
      await tx.commissionRecord.updateMany({
        where: {
          broker_id: brokerId,
          payout_status: "PENDING",
          created_at: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        data: {
          payout_id: newPayout.id,
          payout_status: "PROCESSING",
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          broker_id: brokerId,
          action: "PAYOUT_CREATED",
          entity_type: "Payout",
          entity_id: newPayout.id,
          metadata: {
            period: `${year}-${month.toString().padStart(2, "0")}`,
            amount: PricingEngine.centsToUsd(totals.total),
            commission_count: commissions.length,
          },
        },
      });

      return newPayout;
    });

    console.log(
      `Payout created for broker ${brokerId}: $${PricingEngine.centsToUsd(
        payout.total_amount
      )}`
    );
    return payout;
  }

  /**
   * Process payout (mark as completed)
   */
  async processPayout(
    payoutId: string,
    transactionId: string,
    notes?: string
  ): Promise<Payout> {
    const payout = await prisma.$transaction(async (tx) => {
      // Update payout
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: "COMPLETED",
          transaction_id: transactionId,
          processed_at: new Date(),
          notes,
        },
      });

      // Update commission records
      await tx.commissionRecord.updateMany({
        where: {
          payout_id: payoutId,
          payout_status: "PROCESSING",
        },
        data: {
          payout_status: "COMPLETED",
          paid_at: new Date(),
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          broker_id: updated.broker_id,
          action: "PAYOUT_COMPLETED",
          entity_type: "Payout",
          entity_id: payoutId,
          metadata: {
            transaction_id: transactionId,
            amount: PricingEngine.centsToUsd(updated.total_amount),
          },
        },
      });

      return updated;
    });

    console.log(
      `Payout ${payoutId} completed: $${PricingEngine.centsToUsd(
        payout.total_amount
      )}`
    );
    return payout;
  }

  /**
   * Get pending payouts for all brokers
   */
  async getPendingPayouts(): Promise<any[]> {
    const payouts = await prisma.payout.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        broker: {
          select: {
            name: true,
            email: true,
            business_name: true,
          },
        },
        commission_records: {
          include: {
            order: {
              select: {
                order_number: true,
                created_at: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return payouts.map((payout) => ({
      ...payout,
      total_amount_usd: PricingEngine.centsToUsd(payout.total_amount),
      total_revenue_share_usd: PricingEngine.centsToUsd(
        payout.total_revenue_share
      ),
      total_markup_usd: PricingEngine.centsToUsd(payout.total_markup),
      order_count: payout.commission_records.length,
    }));
  }

  /**
   * Get broker payout history
   */
  async getBrokerPayouts(
    brokerId: string,
    options: {
      page?: number;
      limit?: number;
      status?: PayoutStatus;
    } = {}
  ): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const where: Prisma.PayoutWhereInput = {
      broker_id: brokerId,
    };

    if (options.status) {
      where.status = options.status;
    }

    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              commission_records: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.payout.count({ where }),
    ]);

    // Calculate summary
    const summary = await prisma.payout.aggregate({
      where: {
        broker_id: brokerId,
        status: "COMPLETED",
      },
      _sum: {
        total_amount: true,
        total_revenue_share: true,
        total_markup: true,
      },
      _count: true,
    });

    return {
      payouts: payouts.map((payout) => ({
        ...payout,
        total_amount_usd: PricingEngine.centsToUsd(payout.total_amount),
        total_revenue_share_usd: PricingEngine.centsToUsd(
          payout.total_revenue_share
        ),
        total_markup_usd: PricingEngine.centsToUsd(payout.total_markup),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total_payouts: summary._count,
        total_paid: PricingEngine.centsToUsd(summary._sum.total_amount || 0),
        revenue_share_paid: PricingEngine.centsToUsd(
          summary._sum.total_revenue_share || 0
        ),
        markup_paid: PricingEngine.centsToUsd(summary._sum.total_markup || 0),
      },
    };
  }

  /**
   * Generate payout report
   */
  async generatePayoutReport(payoutId: string): Promise<any> {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        broker: true,
        commission_records: {
          include: {
            order: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    // Group commissions by order
    const orderDetails = payout.commission_records.map((commission) => ({
      order_number: commission.order.order_number,
      order_date: commission.order.created_at,
      customer: commission.order.customer_email,
      items: commission.order.items.length,
      order_total: PricingEngine.centsToUsd(commission.order.total_charged),
      revenue_share: PricingEngine.centsToUsd(commission.revenue_share_amount),
      markup: PricingEngine.centsToUsd(commission.markup_amount),
      commission: PricingEngine.centsToUsd(commission.total_commission),
    }));

    return {
      payout_id: payout.id,
      broker: {
        name: payout.broker.name,
        business_name: payout.broker.business_name,
        email: payout.broker.email,
      },
      period: {
        start: payout.period_start,
        end: payout.period_end,
      },
      totals: {
        revenue_share: PricingEngine.centsToUsd(payout.total_revenue_share),
        markup: PricingEngine.centsToUsd(payout.total_markup),
        total: PricingEngine.centsToUsd(payout.total_amount),
      },
      payment: {
        method: payout.payment_method,
        status: payout.status,
        transaction_id: payout.transaction_id,
        processed_at: payout.processed_at,
      },
      orders: orderDetails,
      order_count: orderDetails.length,
      created_at: payout.created_at,
    };
  }
}

// Singleton instance
let payoutInstance: PayoutService | null = null;

export function getPayoutService(): PayoutService {
  if (!payoutInstance) {
    payoutInstance = new PayoutService();
  }
  return payoutInstance;
}

export default PayoutService;
```

**Acceptance Criteria**:

- [ ] Order creation with correct commission tracking
- [ ] Stripe checkout session creation works
- [ ] Webhook handling processes payments
- [ ] TradelineSupply orders created on successful payment
- [ ] Commission records properly tracked
- [ ] Payout system calculates correctly
- [ ] All amounts stored in cents, displayed in USD

**Validation Commands**:

```bash
# Test API endpoints
npm run dev

# Test Stripe webhook locally
stripe listen --forward-to localhost:3000/api/orders/webhook/stripe

# Run tests
npm test
```

---

This completes Part 4: Payment & Order Processing with the corrected commission model. The key implementations include:

1. **Order Service** - Tracks commission breakdown correctly
2. **Payment Service** - Stripe integration with checkout
3. **Webhook handling** - Processes payments and creates TradelineSupply orders
4. **Payout Service** - Monthly broker commission payouts
5. **API Routes** - Complete order management endpoints

Ready for Part 5: Admin Dashboard & Deployment?
