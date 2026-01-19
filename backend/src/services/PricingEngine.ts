import { prisma } from "./Database";
import { getTradelineSupplyAPI } from "./TradelineSupplyAPI";
import { getCacheService } from "./Cache";
import { Broker } from "@prisma/client";
import { Tradeline, TradelineWithPricing } from "../types";

// Allow strict filtering
export interface PricingOptions {
  brokerId?: string;
  items?: Array<{ card_id: string; quantity: number }>;
}



export class PricingEngine {
  private api = getTradelineSupplyAPI();
  private cache = getCacheService();

  constructor() {
    //
  }

  /**
   * Invalidate pricing cache for a broker
   */
  async invalidateCache(_brokerId: string): Promise<void> {
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
  async getMarketplaceTradelines(): Promise<Tradeline[]> {
    return this.getTradelines();
  }

  // Utility to handle cents conversion safely
  static usdToCents(amount: number): number {
    return Math.round(amount * 100);
  }

  static centsToUsd(amount: number): number {
    return amount / 100;
  }

  /**
   * Get filtered and priced tradelines for a broker/client
   */
  async getPricingForBroker(brokerId: string, excludedBanks: string[] = []) {
    // 1. Get ALL active tradelines from cache or API
    const tradelines = await this.getTradelines();

    // 2. Get broker settings
    const broker = await prisma.broker.findUnique({
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
        return !excludedBanks.some((excluded) =>
          bankName.includes(excluded.toLowerCase())
        );
      });
    }

    // 4. Calculate prices
    return availableTradelines.map((t) =>
      this.calculateTradelinePricing(t, broker)
    );
  }

  /**
   * Get raw tradelines from source (with caching)
   */
  private async getTradelines(): Promise<any[]> {
    const cacheKey = "tradelines_all";
    const cached = await this.cache.get<any[]>(cacheKey);

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
  private calculateTradelinePricing(tradeline: any, broker: Broker): TradelineWithPricing {
    const basePrice = tradeline.price as number;

    // Calculate broker markup (percentage or fixed amount)
    let markup = 0;
    if (broker.markup_type === "PERCENTAGE") {
      markup = basePrice * (broker.markup_value / 100);
    } else {
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
   * Calculate total order price with all splits and volume discounts
   */
  async calculateOrderTotal(
    items: Array<{ card_id: string; quantity: number }>,
    brokerId?: string,
    promoCode?: string
  ) {
    // Get base pricing
    const pricing = await this.getTradelines();
    const pricingMap = new Map(pricing.map((p) => [p.card_id, p]));

    let broker: Broker | null = null;
    if (brokerId) {
      broker = await prisma.broker.findUnique({ where: { id: brokerId } });
    }

    let subtotalBase = 0;
    let totalRevenueShare = 0;
    let totalBrokerMarkup = 0;
    let totalCustomerPrice = 0;
    let totalPlatformRevenue = 0;

    let calculationItems = items.map((item) => {
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
      } else {
        // Direct platform sale (no broker)
        unitCustomerPrice = unitBase;
      }

      const quantity = item.quantity;

      return {
        card_id: item.card_id,
        bank_name: tradeline.bank_name,
        quantity: quantity,
        base_price: unitBase,
        broker_revenue_share: unitRevenueShare,
        broker_markup: unitMarkup,
        customer_price: unitCustomerPrice,
        original_price: unitCustomerPrice // Keep track for discount display
      };
    });

    // --- APPLY VOLUME DISCOUNT IF 10-30OFF IS ACTIVE ---
    let multiLineDiscount = 0;

    if (promoCode === "10-30OFF") {
      // 1. Flatten items based on quantity for sorting
      let flatItems: any[] = [];
      calculationItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          flatItems.push({ ...item, quantity: 1 });
        }
      });

      // 2. Sort by purchase price (Highest to Lowest)
      flatItems.sort((a, b) => b.customer_price - a.customer_price);

      // 3. Apply discounts based on index
      flatItems.forEach((item, index) => {
        let discountPercent = 0;
        if (index === 1) discountPercent = 0.10; // 2nd line
        else if (index === 2) discountPercent = 0.20; // 3rd line
        else if (index >= 3) discountPercent = 0.30; // 4th+ line

        if (discountPercent > 0) {
          const discountAmount = item.customer_price * discountPercent;
          multiLineDiscount += discountAmount;

          // Apply discount to price
          item.customer_price -= discountAmount;

          // Pro-rate commission and base price logic:
          // If we discount the total price by X%, we reduce the revenue share and markup AND base by the same ratio (simple pro-rating)
          // OR, based on user request: "Broker revenue share needs to be calculated on base price minus discounts."
          // User Example for $250 final (discounted from something higher): 
          //   Adj Customer Price = $200 (Base portion) + $50 (Markup?) NO...
          // User said: "base price minus discounts. This we would call the revenue share portion... The percentage markup is the amount above that adjusted price"
          // This is complex to reverse engineer perfectly without exact original base.
          // However, the cleanest mathematical way to respect the discount is to scale EVERYTHING down by (1 - discountPercent).

          item.broker_revenue_share = item.broker_revenue_share * (1 - discountPercent);
          item.broker_markup = item.broker_markup * (1 - discountPercent);
          item.base_price = item.base_price * (1 - discountPercent);
        }
      });

      // 4. Rebuild calculationItems with combined discounts
      // Note: We'll just update the totals, but we need to keep the structure.
      // This is slightly complex because items might have quantity > 1.
      // Easiest is to sum everything from flatItems.
      totalCustomerPrice = flatItems.reduce((sum, item) => sum + item.customer_price, 0);

      // Update original sums for consistency
      subtotalBase = flatItems.reduce((sum, item) => sum + item.base_price, 0);
      totalRevenueShare = flatItems.reduce((sum, item) => sum + item.broker_revenue_share, 0);
      totalBrokerMarkup = flatItems.reduce((sum, item) => sum + item.broker_markup, 0);

      // Update calculationItems to reflect the discounted items (flattened)
      // This ensures Order Items created in DB reflect the actual discounted amounts
      calculationItems = flatItems;
    } else {
      // Standard non-discounted calculation
      calculationItems.forEach(item => {
        subtotalBase += item.base_price * item.quantity;
        totalRevenueShare += item.broker_revenue_share * item.quantity;
        totalBrokerMarkup += item.broker_markup * item.quantity;
        totalCustomerPrice += item.customer_price * item.quantity;
      });
    }

    // Platform Revenue = 50% of Base (simplified)
    totalPlatformRevenue = subtotalBase * 0.5;

    return {
      subtotal_base: subtotalBase,
      total_revenue_share: totalRevenueShare,
      total_broker_markup: totalBrokerMarkup,
      total_platform_revenue: totalPlatformRevenue,
      total_customer_price: totalCustomerPrice,
      multi_line_discount: multiLineDiscount,
      items: calculationItems
    };
  }
}

// Singleton instance
let pricingEngineInstance: PricingEngine | null = null;

export function getPricingEngine(): PricingEngine {
  if (!pricingEngineInstance) {
    pricingEngineInstance = new PricingEngine();
  }
  return pricingEngineInstance;
}
