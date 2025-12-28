import { PayoutStatus, PaymentMethod } from "@prisma/client";
export declare class PayoutService {
    /**
     * Calculate pending commission for a broker
     */
    calculatePendingCommission(brokerId: string): Promise<{
        revenue_share: number;
        markup: number;
        total: number;
        order_ids: string[];
    }>;
    /**
     * Create a payout for a broker
     */
    createPayout(data: {
        broker_id: string;
        period_start: Date;
        period_end: Date;
        payment_method: PaymentMethod;
    }): Promise<any>;
    /**
     * Process and complete a payout
     */
    processPayout(payoutId: string, transactionId: string): Promise<any>;
    /**
     * Get pending payouts for all brokers
     */
    getPendingPayouts(): Promise<any[]>;
    /**
     * Get broker payout history
     */
    getBrokerPayouts(brokerId: string, options?: {
        page?: number;
        limit?: number;
        status?: PayoutStatus;
    }): Promise<any>;
    /**
     * Generate payout report
     */
    generatePayoutReport(payoutId: string): Promise<any>;
}
export declare function getPayoutService(): PayoutService;
export default PayoutService;
//# sourceMappingURL=PayoutService.d.ts.map