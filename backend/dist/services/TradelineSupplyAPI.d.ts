import { Tradeline } from "../types";
export declare class TradelineSupplyAPI {
    private oauth;
    private baseURL;
    private axios;
    constructor(consumerKey?: string, consumerSecret?: string, baseURL?: string);
    private getAuthHeader;
    /**
     * Fetch current pricing from TradelineSupply
     * Note: Prices already include our 50% platform commission
     */
    getPricing(): Promise<Tradeline[]>;
    /**
     * Create an order in TradelineSupply
     * We send them the full price (which includes our commission)
     * They handle the split internally
     */
    createOrder(orderData: {
        customer_email: string;
        customer_name: string;
        items: Array<{
            card_id: string;
            quantity: number;
        }>;
        order_id: string;
    }): Promise<any>;
    /**
     * Get order status from TradelineSupply
     */
    getOrderStatus(orderId: string): Promise<any>;
    /**
     * Validate API credentials by making a test request
     */
    validateCredentials(): Promise<boolean>;
}
export declare function getTradelineSupplyAPI(): TradelineSupplyAPI;
export default TradelineSupplyAPI;
//# sourceMappingURL=TradelineSupplyAPI.d.ts.map