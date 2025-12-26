// Core types for the application with corrected commission structure

export interface Tradeline {
  card_id: string;
  bank_name: string;
  credit_limit: number;
  credit_limit_original: number;
  date_opened: string;
  date_opened_original: string;
  purchase_deadline: string;
  purchase_deadline_original: string;
  reporting_period: string;
  reporting_period_original: string;
  stock: number;
  price: number; // This already includes 50% platform markup
  image: string;
}

export interface TradelineWithPricing extends Tradeline {
  base_price: number; // TradelineSupply price (includes our markup)
  broker_revenue_share: number; // Broker's share of our commission (10-25% of base)
  broker_markup: number; // Broker's additional markup (they keep 100%)
  broker_commission: number; // Total broker earnings: revenue_share + markup
  customer_price: number; // Final price customer sees: base + markup
  platform_net_revenue?: number; // What platform keeps after sharing
  broker_total_earnings?: number; // Alias for broker_commission
}


export interface BrokerConfig {
  id: string;
  name: string;
  email: string;
  revenue_share_percent: number; // Admin-controlled: 10-25%
  markup_type: "PERCENTAGE" | "FIXED";
  markup_value: number; // Broker-controlled: their additional markup
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
}

export interface OrderCalculation {
  items: Array<{
    card_id: string;
    bank_name: string;
    quantity: number;
    base_price: number; // TradelineSupply price
    broker_revenue_share: number; // Per item
    broker_markup: number; // Per item
    customer_price: number; // Per item final price
  }>;
  subtotal_base: number; // Sum of base prices
  total_revenue_share: number; // Total broker revenue share
  total_broker_markup: number; // Total broker markup
  total_customer_price: number; // What customer pays
  total_platform_revenue: number; // What platform keeps
  total_broker_earnings: number; // Revenue share + markup
}

export interface CommissionBreakdown {
  tradeline_supply_gets: number; // 50% of base (their cost)
  platform_gross_commission: number; // 50% of base (our commission)
  broker_revenue_share: number; // Broker's share (10-25% of base)
  platform_net_commission: number; // What we keep (25-40% of base)
  broker_markup: number; // Broker's additional markup
  broker_total_earnings: number; // Revenue share + markup
}
