import { prisma } from "./Database";
import { getTradelineSupplyAPI } from "./TradelineSupplyAPI";
import { getCacheService } from "./Cache";
import { Broker, Tradeline } from "@prisma/client";

// Allow strict filtering
export interface PricingOptions {
  brokerId?: string;
  items?: Array<{ card_id: string; quantity: number }>;
}

// Extended Tradeline type with pricing
export interface TradelineWithPricing extends Tradeline {
  base_price: number;
  broker_revenue_share: number;
  broker_markup: number;
  customer_price: number;
}

export class PricingEngine {
  private api = getTradelineSupplyAPI();
  private cache = getCacheService();

  constructor() {
    //
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
   */
  private calculateTradelinePricing(tradeline: any, broker: Broker): TradelineWithPricing {
    const basePrice = tradeline.price as number;
    // Platform commission is 50% of the base price from TradelineSupply
    // Wait - clarification: TradelineSupply IS the platform in some contexts, but here we likely mean
    // the API price we pay to them.
    // Let's assume 'basePrice' is the cost.
    // The previous implementation was:
    // platform_gross = basePrice * 0.5 (which seems wrong if we are PAYING base price)
    // Let's stick to the previous logic structure to be safe, but formalized.
    
    // Re-reading logic from previous files:
    // platform_gross_commission = base_price * 0.5 ??
    // Actually, usually:
    // Wholesale Price = X
    // Broker Share = Y
    // Markup = Z
    
    // Let's use the standard flow defined in config:
    // Platform Fee = 50% of the price listed in the feed (assuming feed is RETAIL price?)
    // Actually, let's treat the feed price as the "Cost Basis".
    
    // Previous logic from OrderService:
    // subtotal_base = PricingEngine.usdToCents(order.subtotal_base)
    
    // Let's assume:
    // Cost = tradeline.price
    // Revenue Share Base = Cost * (revenue_share_percent / 100)
    // Markup = Cost * (markup_percent / 100) OR Fixed Amount
    
    const revenueSharePercent = broker.revenue_share_percent / 100;
    const revenueShare = basePrice * revenueSharePercent;
    
    let markup = 0;
    if (broker.markup_type === "PERCENTAGE") {
      markup = basePrice * (broker.markup_value / 100);
    } else {
      markup = broker.markup_value;
    }
    
    const finalPrice = basePrice + revenueShare + markup;

    return {
      ...tradeline,
      base_price: basePrice,
      broker_revenue_share: revenueShare,
      broker_markup: markup,
      customer_price: finalPrice
    };
  }

  /**
   * Calculate total order price with all splits
   */
  async calculateOrderTotal(
    items: Array<{ card_id: string; quantity: number }>,
    brokerId?: string
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
      } else {
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

// Singleton instance
let pricingEngineInstance: PricingEngine | null = null;

export function getPricingEngine(): PricingEngine {
  if (!pricingEngineInstance) {
    pricingEngineInstance = new PricingEngine();
  }
  return pricingEngineInstance;
}
