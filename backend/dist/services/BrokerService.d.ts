import { Broker, BrokerStatus } from "@prisma/client";
export declare class BrokerService {
    private cache;
    /**
     * Generate secure API key for broker
     */
    private generateApiKey;
    /**
     * Generate secure API secret for broker portal access
     */
    private generateApiSecret;
    /**
     * Create a new broker account
     */
    createBroker(data: {
        name: string;
        business_name?: string;
        email: string;
        phone?: string;
        revenue_share_percent?: number;
        notes?: string;
    }): Promise<{
        broker: Broker;
        api_secret: string;
    }>;
    /**
     * Update broker settings
     */
    updateBroker(brokerId: string, updates: Partial<{
        name: string;
        business_name: string;
        phone: string;
        revenue_share_percent: number;
        markup_type: "PERCENTAGE" | "FIXED";
        markup_value: number;
        status: BrokerStatus;
        notes: string;
    }>, adminId?: string): Promise<Broker>;
    /**
     * Approve a pending broker
     */
    approveBroker(brokerId: string, adminId: string): Promise<Broker>;
    /**
     * Get broker by API key (with caching)
     */
    getBrokerByApiKey(apiKey: string): Promise<Broker | null>;
    /**
     * Get broker dashboard statistics
     */
    getBrokerStats(brokerId: string, startDate?: Date, endDate?: Date): Promise<{
        total_orders: number;
        total_revenue: number;
        total_commission: number;
        revenue_share_earned: number;
        markup_earned: number;
        pending_payout: number;
        conversion_rate: number;
    }>;
    /**
     * Log broker activity
     */
    private logActivity;
}
export declare function getBrokerService(): BrokerService;
export default BrokerService;
//# sourceMappingURL=BrokerService.d.ts.map