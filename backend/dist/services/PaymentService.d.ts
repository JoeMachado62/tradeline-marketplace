export declare class PaymentService {
    private stripe;
    private orderService;
    private pricingEngine;
    constructor();
    /**
     * Create Stripe checkout session for order
     */
    createCheckoutSession(data: {
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
    }>;
    /**
     * Handle Stripe webhook events
     */
    handleWebhook(signature: string, payload: any): Promise<void>;
    /**
     * Handle successful checkout session
     */
    private handleCheckoutSessionCompleted;
    /**
     * Handle successful payment intent (backup handler)
     */
    private handlePaymentIntentSucceeded;
    /**
     * Handle failed payment intent
     */
    private handlePaymentIntentFailed;
}
export declare function getPaymentService(): PaymentService;
export default PaymentService;
//# sourceMappingURL=PaymentService.d.ts.map