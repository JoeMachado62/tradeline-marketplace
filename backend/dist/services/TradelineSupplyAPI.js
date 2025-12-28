"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradelineSupplyAPI = void 0;
exports.getTradelineSupplyAPI = getTradelineSupplyAPI;
const oauth_1_0a_1 = __importDefault(require("oauth-1.0a"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
class TradelineSupplyAPI {
    oauth;
    baseURL;
    axios;
    constructor(consumerKey, consumerSecret, baseURL) {
        this.baseURL = baseURL || config_1.config.tradeline.apiUrl;
        const key = consumerKey || config_1.config.tradeline.consumerKey;
        const secret = consumerSecret || config_1.config.tradeline.consumerSecret;
        // Initialize OAuth 1.0a
        this.oauth = new oauth_1_0a_1.default({
            consumer: {
                key: key,
                secret: secret,
            },
            signature_method: "HMAC-SHA1",
            hash_function(base_string, key) {
                return crypto_1.default
                    .createHmac("sha1", key)
                    .update(base_string)
                    .digest("base64");
            },
        });
        // Initialize axios with defaults
        this.axios = axios_1.default.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        // Add response interceptor for logging
        this.axios.interceptors.response.use((response) => response, (error) => {
            console.error("TradelineSupply API Error:", {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data,
                url: error.config?.url,
            });
            return Promise.reject(error);
        });
    }
    getAuthHeader(url, method, data) {
        const request_data = {
            url: url,
            method: method,
            data: data,
        };
        const oauth_data = this.oauth.authorize(request_data);
        return this.oauth.toHeader(oauth_data);
    }
    /**
     * Fetch current pricing from TradelineSupply
     * Note: Prices already include our 50% platform commission
     */
    async getPricing() {
        try {
            // Use the full URL for OAuth signing - however axios uses relative if baseURL set
            // We must provide the full URL to OAuth
            const fullURL = `${this.baseURL}/pricing`;
            const headers = this.getAuthHeader(fullURL, "GET");
            console.log("Fetching pricing from TradelineSupply...");
            const response = await this.axios.get("/pricing", { headers });
            if (!Array.isArray(response.data)) {
                throw new Error("Invalid response format from TradelineSupply API");
            }
            console.log(`Received ${response.data.length} tradelines from API`);
            const cleanData = response.data.map((item) => {
                // Helper to strip HTML and extract number from price
                // Uses "Largest Number" strategy to avoid capturing prefix IDs/garbage (e.g. "36 67,000")
                const cleanPrice = (val) => {
                    if (typeof val === 'number')
                        return val;
                    if (!val)
                        return 0;
                    const str = val.toString();
                    // Replace tags with space to avoid merging numbers
                    const text = str.replace(/<[^>]*>?/gm, ' ');
                    // Extract all number-like sequences
                    const matches = text.match(/[0-9,]+(\.[0-9]+)?/g);
                    if (!matches)
                        return 0;
                    let maxVal = 0;
                    matches.forEach((m) => {
                        const clean = m.replace(/,/g, '');
                        const num = parseFloat(clean);
                        if (!isNaN(num)) {
                            // Filter out likely year numbers if they appear (e.g. 2021) vs price? 
                            // Usually price/limit > year, or strict parsing checks.
                            // But for "36" vs "67000", max logic works.
                            if (num > maxVal)
                                maxVal = num;
                        }
                    });
                    return maxVal;
                };
                // Helper to extract stock number
                const cleanStock = (val) => {
                    if (typeof val === 'number')
                        return val;
                    if (typeof val === 'string') {
                        const text = val.replace(/<[^>]*>?/gm, '');
                        const match = text.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    }
                    return 0;
                };
                return {
                    ...item,
                    price: cleanPrice(item.price),
                    stock: cleanStock(item.stock),
                    credit_limit: cleanPrice(item.credit_limit),
                };
            });
            return cleanData;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error("Authentication failed. Check API credentials.");
                }
                else if (error.response?.status === 429) {
                    throw new Error("Rate limit exceeded. Please try again later.");
                }
                throw new Error(`API Error: ${error.response?.status} - ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    /**
     * Create an order in TradelineSupply
     * We send them the full price (which includes our commission)
     * They handle the split internally
     */
    async createOrder(orderData) {
        try {
            const fullURL = `${this.baseURL}/orders`;
            const wooCommerceOrder = {
                payment_method: "bacs",
                payment_method_title: "Direct Bank Transfer",
                set_paid: true,
                billing: {
                    first_name: orderData.customer_name.split(" ")[0],
                    last_name: orderData.customer_name.split(" ").slice(1).join(" ") || "",
                    email: orderData.customer_email,
                },
                line_items: orderData.items.map((item) => ({
                    product_id: item.card_id,
                    quantity: item.quantity,
                })),
                meta_data: [
                    {
                        key: "platform_order_id",
                        value: orderData.order_id,
                    },
                    {
                        key: "source",
                        value: "tradeline_marketplace_platform",
                    },
                ],
            };
            const headers = this.getAuthHeader(fullURL, "POST", wooCommerceOrder);
            console.log(`Creating order in TradelineSupply for ${orderData.items.length} items`);
            const response = await this.axios.post("/orders", wooCommerceOrder, {
                headers,
            });
            console.log(`TradelineSupply order created: #${response.data.id}`);
            return response.data;
        }
        catch (error) {
            console.error("Error creating order in TradelineSupply:", error);
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Order Creation Error: ${error.response?.status} - ${error.response?.data?.message}`);
            }
            throw error;
        }
    }
    /**
     * Get order status from TradelineSupply
     */
    async getOrderStatus(orderId) {
        try {
            const fullURL = `${this.baseURL}/orders/${orderId}`;
            const headers = this.getAuthHeader(fullURL, "GET");
            const response = await this.axios.get(`/orders/${orderId}`, { headers });
            return response.data;
        }
        catch (error) {
            console.error(`Error fetching order status for #${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Validate API credentials by making a test request
     */
    async validateCredentials() {
        try {
            await this.getPricing();
            return true;
        }
        catch (error) {
            if (error.message.includes("Authentication failed")) {
                return false;
            }
            throw error;
        }
    }
}
exports.TradelineSupplyAPI = TradelineSupplyAPI;
// Singleton instance
let apiInstance = null;
function getTradelineSupplyAPI() {
    if (!apiInstance) {
        apiInstance = new TradelineSupplyAPI();
    }
    return apiInstance;
}
exports.default = TradelineSupplyAPI;
//# sourceMappingURL=TradelineSupplyAPI.js.map