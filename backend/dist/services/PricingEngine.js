"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngine = void 0;
exports.getPricingEngine = getPricingEngine;
const Database_1 = require("./Database");
const TradelineSupplyAPI_1 = require("./TradelineSupplyAPI");
const Cache_1 = require("./Cache");
class PricingEngine {
    api = (0, TradelineSupplyAPI_1.getTradelineSupplyAPI)();
    cache = (0, Cache_1.getCacheService)();
    constructor() {
        //
    }
    /**
     * Invalidate pricing cache for a broker
     */
    async invalidateCache(_brokerId) {
        // Invalidate main tradelines cache just in case (though it's global)
        // Realistically we might want to invalidate specific broker calculations if we cached them.
        // For now, this is a placeholder or can clear specific broker keys if we add them.
        // As per BrokerService requirement, we just need the method to exist.
        // We could clear the global tradelines cache if we wanted to force a refresh, but that affects everyone.
        // Let's just return for now as the current caching strategy is global 'tradelines_all'.
        return Promise.resolve();
    }
    /**
     * Public accessor for raw tradelines (for metadata lookups)
     */
    async getMarketplaceTradelines() {
        return this.getTradelines();
    }
    // Utility to handle cents conversion safely
    static usdToCents(amount) {
        return Math.round(amount * 100);
    }
    static centsToUsd(amount) {
        return amount / 100;
    }
    /**
     * Get filtered and priced tradelines for a broker/client
     */
    async getPricingForBroker(brokerId, excludedBanks = []) {
        // 1. Get ALL active tradelines from cache or API
        const tradelines = await this.getTradelines();
        // 2. Get broker settings
        const broker = await Database_1.prisma.broker.findUnique({
            where: { id: brokerId },
        });
        if (!broker) {
            throw new Error(`Broker ${brokerId} not found`);
        }
        if (broker.status !== "ACTIVE") {
            throw new Error(`Broker ${brokerId} is not active`);
        }
        // 3. Filter out excluded banks (smart filtering for end users)
        let availableTradelines = tradelines;
        if (excludedBanks && excludedBanks.length > 0) {
            availableTradelines = tradelines.filter((t) => {
                const bankName = t.bank_name.toLowerCase();
                return !excludedBanks.some((excluded) => bankName.includes(excluded.toLowerCase()));
            });
        }
        // 4. Calculate prices
        return availableTradelines.map((t) => this.calculateTradelinePricing(t, broker));
    }
    /**
     * Get raw tradelines from source (with caching)
     */
    async getTradelines() {
        const cacheKey = "tradelines_all";
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const freshData = await this.api.getPricing();
        // Cache for 15 minutes
        await this.cache.set(cacheKey, freshData, 60 * 15);
        return freshData;
    }
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
    calculateTradelinePricing(tradeline, broker) {
        const basePrice = tradeline.price;
        // Calculate broker markup (percentage or fixed amount)
        let markup = 0;
        if (broker.markup_type === "PERCENTAGE") {
            markup = basePrice * (broker.markup_value / 100);
        }
        else {
            markup = broker.markup_value;
        }
        // Customer price = base + markup (revenue share is NOT added to price)
        const customerPrice = basePrice + markup;
        // Revenue share is broker's commission on base price
        const revenueSharePercent = broker.revenue_share_percent / 100;
        const revenueShare = basePrice * revenueSharePercent;
        // Total broker commission = revenue share + full markup
        const brokerCommission = revenueShare + markup;
        return {
            ...tradeline,
            base_price: basePrice,
            broker_revenue_share: revenueShare,
            broker_markup: markup,
            broker_commission: brokerCommission,
            customer_price: customerPrice
        };
    }
    /**
     * Calculate total order price with all splits
     */
    async calculateOrderTotal(items, brokerId) {
        // Get base pricing
        const pricing = await this.getTradelines();
        const pricingMap = new Map(pricing.map((p) => [p.card_id, p]));
        let broker = null;
        if (brokerId) {
            broker = await Database_1.prisma.broker.findUnique({ where: { id: brokerId } });
        }
        let subtotalBase = 0;
        let totalRevenueShare = 0;
        let totalBrokerMarkup = 0;
        let totalCustomerPrice = 0;
        let totalPlatformRevenue = 0;
        const calculationItems = items.map((item) => {
            const tradeline = pricingMap.get(item.card_id);
            if (!tradeline) {
                throw new Error(`Tradeline ${item.card_id} not found`);
            }
            // Calculate unit pricing
            let unitBase = tradeline.price;
            let unitRevenueShare = 0;
            let unitMarkup = 0;
            let unitCustomerPrice = 0;
            if (broker) {
                // Calculate based on broker settings
                const priced = this.calculateTradelinePricing(tradeline, broker);
                unitRevenueShare = priced.broker_revenue_share;
                unitMarkup = priced.broker_markup;
                unitCustomerPrice = priced.customer_price;
            }
            else {
                // Direct platform sale (no broker)
                unitCustomerPrice = unitBase; // Or some direct markdown?
            }
            const quantity = item.quantity;
            subtotalBase += unitBase * quantity;
            totalRevenueShare += unitRevenueShare * quantity;
            totalBrokerMarkup += unitMarkup * quantity;
            totalCustomerPrice += unitCustomerPrice * quantity;
            return {
                card_id: item.card_id,
                bank_name: tradeline.bank_name,
                quantity: quantity,
                base_price: unitBase,
                broker_revenue_share: unitRevenueShare,
                broker_markup: unitMarkup,
                customer_price: unitCustomerPrice
            };
        });
        // Platform Revenue = 50% of Base + Remainder of Revenue Share?
        // Let's keep it simple: Platform Net = 50% of Base
        totalPlatformRevenue = subtotalBase * 0.5;
        return {
            subtotal_base: subtotalBase,
            total_revenue_share: totalRevenueShare,
            total_broker_markup: totalBrokerMarkup,
            total_platform_revenue: totalPlatformRevenue,
            total_customer_price: totalCustomerPrice,
            items: calculationItems
        };
    }
}
exports.PricingEngine = PricingEngine;
// Singleton instance
let pricingEngineInstance = null;
function getPricingEngine() {
    if (!pricingEngineInstance) {
        pricingEngineInstance = new PricingEngine();
    }
    return pricingEngineInstance;
}
//# sourceMappingURL=PricingEngine.js.map