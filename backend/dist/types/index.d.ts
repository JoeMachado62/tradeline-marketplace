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
    price: number;
    image: string;
}
export interface TradelineWithPricing extends Tradeline {
    base_price: number;
    broker_revenue_share: number;
    broker_markup: number;
    broker_commission: number;
    customer_price: number;
    platform_net_revenue?: number;
    broker_total_earnings?: number;
}
export interface BrokerConfig {
    id: string;
    name: string;
    email: string;
    revenue_share_percent: number;
    markup_type: "PERCENTAGE" | "FIXED";
    markup_value: number;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE";
}
export interface OrderCalculation {
    items: Array<{
        card_id: string;
        bank_name: string;
        quantity: number;
        base_price: number;
        broker_revenue_share: number;
        broker_markup: number;
        customer_price: number;
    }>;
    subtotal_base: number;
    total_revenue_share: number;
    total_broker_markup: number;
    total_customer_price: number;
    total_platform_revenue: number;
    total_broker_earnings: number;
}
export interface CommissionBreakdown {
    tradeline_supply_gets: number;
    platform_gross_commission: number;
    broker_revenue_share: number;
    platform_net_commission: number;
    broker_markup: number;
    broker_total_earnings: number;
}
//# sourceMappingURL=index.d.ts.map