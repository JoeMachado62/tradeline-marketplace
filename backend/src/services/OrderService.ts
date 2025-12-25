import { Order, OrderStatus, Prisma, PaymentMethod } from "@prisma/client";
import { prisma } from "./Database";
import { getPricingEngine, PricingEngine } from "./PricingEngine";
import { getTradelineSupplyAPI } from "./TradelineSupplyAPI";
import { getCacheService } from "./Cache";

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
    client_id?: string;
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
          client_id: data.client_id, // Link to registered client
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
              credit_limit: 0, // Will be populated from tradeline data later if needed
              date_opened: "", // Will be populated from tradeline data later if needed
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
    paymentIntentId?: string,
    paymentMethod: PaymentMethod = "STRIPE" as any
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

    if (order.status !== "PENDING" && order.status !== "FAILED") {
       // Allow reprocessing if it previously failed fulfillment
       if ((order as any).payment_status !== "SUCCEEDED" && (paymentMethod as any) === "STRIPE") {
         // Proceed with payment update
       } else if ((order.status as any) !== "FAILED") {
          throw new Error(`Order ${order.order_number} is not in a valid state for processing`);
       }
    }

    // Start transaction to update order and create fulfillment
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          stripe_payment_intent: paymentIntentId,
          payment_status: "SUCCEEDED",
          status: "COMPLETED",
          payment_method: paymentMethod
        } as any,
      });

      // Create order in TradelineSupply
      try {
        const tradelineOrder = await this.tradelineAPI.createOrder({
          customer_email: order.customer_email,
          customer_name: order.customer_name || "Customer",
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

        // Mark order as failed fulfillment but payment succeeded
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "FAILED",
            tradeline_order_status: "fulfillment_error",
          },
        });

        throw error;
      }

      // Update analytics if broker order
      if (order.broker_id) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.analytics.upsert({
          where: {
            broker_id_date: {
              broker_id: order.broker_id,
              date: today,
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
            date: today,
            orders_count: 1,
            total_sales: order.total_charged,
            revenue_share_earned: order.broker_revenue_share,
            markup_earned: order.broker_markup,
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
            payment_method: paymentMethod,
            total: PricingEngine.centsToUsd(order.total_charged),
          },
        },
      });

      return updated;
    }, {
      timeout: 15000 // Increase timeout for external API call
    });

    // Clear any cached data
    await this.cache.delete(this.cache.keys.order(orderId));

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
   * Record a payment made manually (Cash, Wire, etc.)
   */
  async recordManualPayment(orderId: string, paymentMethod: PaymentMethod, adminId: string): Promise<Order> {
    if ((paymentMethod as any) === "STRIPE") {
      throw new Error("Cannot record manual payment for STRIPE method");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Order not found");
    if (order.status !== 'PENDING') throw new Error("Order is not in a pending state");

    // Process payment with manual method
    const updatedOrder = await this.processPayment(orderId, undefined, paymentMethod);

    // Additional logging for admin action
    await prisma.activityLog.create({
      data: {
        admin_id: adminId, 
        action: 'MANUAL_PAYMENT_RECORDED',
        entity_type: 'Order',
        entity_id: orderId,
        metadata: {
          paymentMethod,
          recordedBy: adminId,
          total: PricingEngine.centsToUsd(order.total_charged)
        },
      } as any
    });

    return updatedOrder;
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
        total_revenue_usd: PricingEngine.centsToUsd(
          summary._sum.total_charged || 0
        ),
        total_commission_usd: PricingEngine.centsToUsd(
          (summary._sum.broker_revenue_share || 0) +
            (summary._sum.broker_markup || 0)
        ),
      },
    };
  }

  /**
   * List all orders (Admin only)
   */
  async listOrders(options: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    brokerId?: string;
  } = {}): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const where: Prisma.OrderWhereInput = {};
    if (options.status) where.status = options.status;
    if (options.brokerId) where.broker_id = options.brokerId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          broker: { select: { name: true, email: true } },
          _count: { select: { items: true } }
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map(o => ({
        ...o,
        total_charged_usd: PricingEngine.centsToUsd(o.total_charged)
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    };
  }
}

// Singleton instance
let orderServiceInstance: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderServiceInstance) {
    orderServiceInstance = new OrderService();
  }
  return orderServiceInstance;
}

export default OrderService;
