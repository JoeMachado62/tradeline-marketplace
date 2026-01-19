import { Order } from "@prisma/client";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentMethod = "STRIPE" | "MANUAL" | "ZELLE" | "CASHAPP" | "VENMO";
export declare class OrderService {
    private pricingEngine;
    private tradelineAPI;
    private cache;
    private emailService;
    /**
     * Generate human-readable order number
     */
    private generateOrderNumber;
    /**
     * Create a new order with proper commission tracking
     */
    createOrder(data: {
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
        promoCode?: string;
    }): Promise<Order>;
    /**
     * Process successful payment and create TradelineSupply order
     */
    processPayment(orderId: string, paymentIntentId?: string, paymentMethod?: PaymentMethod): Promise<Order>;
    /**
     * Handle failed payment
     */
    handlePaymentFailed(orderId: string, reason?: string): Promise<void>;
    /**
     * Record a payment made manually (Cash, Wire, etc.) and trigger LUX Bot
     */
    recordManualPayment(orderId: string, paymentMethod: PaymentMethod, adminId: string): Promise<Order>;
    /**
     * Trigger the LUX Bot to fulfill an order on TradelineSupply.com
     * Runs asynchronously to not block the API response
     */
    private triggerLuxBot;
    /**
     * Get order details with commission breakdown
     */
    getOrderWithCommission(orderId: string): Promise<any>;
    /**
     * Get orders for a broker
     */
    getBrokerOrders(brokerId: string, options?: {
        page?: number;
        limit?: number;
        status?: OrderStatus;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        orders: any[];
        pagination: any;
        summary: any;
    }>;
    /**
     * List all orders (Admin only)
     */
    listOrders(options?: {
        page?: number;
        limit?: number;
        status?: OrderStatus;
        brokerId?: string;
    }): Promise<any>;
}
export declare function getOrderService(): OrderService;
export default OrderService;
//# sourceMappingURL=OrderService.d.ts.map