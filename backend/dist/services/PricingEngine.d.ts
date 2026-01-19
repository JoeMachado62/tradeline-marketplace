import { Tradeline, TradelineWithPricing } from "../types";
export interface PricingOptions {
    brokerId?: string;
    items?: Array<{
        card_id: string;
        quantity: number;
    }>;
}
export declare class PricingEngine {
    private api;
    private cache;
    constructor();
    /**
     * Invalidate pricing cache for a broker
     */
    invalidateCache(_brokerId: string): Promise<void>;
    /**
     * Public accessor for raw tradelines (for metadata lookups)
     */
    getMarketplaceTradelines(): Promise<Tradeline[]>;
    static usdToCents(amount: number): number;
    static centsToUsd(amount: number): number;
    /**
     * Get filtered and priced tradelines for a broker/client
     */
    getPricingForBroker(brokerId: string, excludedBanks?: string[]): Promise<TradelineWithPricing[]>;
    /**
     * Get raw tradelines from source (with caching)
     */
    private getTradelines;
    /**
     * Calculate pricing for a single tradeline based on broker rules
     *
     * PRICING LOGIC:
     * - Base Price: Cost from TradelineSupply API
     * - Broker Markup: Additional amount broker adds (percentage OR fixed)
     * - Customer Price: Base + Markup (what customer pays)
     *
     * COMMISSION LOGIC:
     * - Revenue Share: Base Price × (revenue_share_percent / 100)
     * - Broker Commission: Revenue Share + FULL Markup
     *
     * Example: Base = $500, Markup = 20% ($100), Revenue Share = 10% ($50)
     * - Customer pays: $600
     * - Broker earns: $50 (revenue share) + $100 (markup) = $150
     * - Platform keeps: $500 - $50 = $450
     */
    private calculateTradelinePricing;
    /**
     * Calculate total order price with all splits and volume discounts
     */
    calculateOrderTotal(items: Array<{
        card_id: string;
        quantity: number;
    }>, brokerId?: string, promoCode?: string): Promise<{
        subtotal_base: number;
        total_revenue_share: number;
        total_broker_markup: number;
        total_platform_revenue: number;
        total_customer_price: number;
        multi_line_discount: number;
        items: {
            card_id: string;
            bank_name: any;
            quantity: number;
            base_price: any;
            broker_revenue_share: number;
            broker_markup: number;
            customer_price: number;
            original_price: number;
        }[];
    }>;
}
export declare function getPricingEngine(): PricingEngine;
//# sourceMappingURL=PricingEngine.d.ts.map