import OAuth from "oauth-1.0a";
import crypto from "crypto";
import axios, { AxiosInstance, AxiosError } from "axios";
import { Tradeline } from "../types";
import { config } from "../config";

export class TradelineSupplyAPI {
  private oauth: OAuth;
  private baseURL: string;
  private axios: AxiosInstance;

  constructor(consumerKey?: string, consumerSecret?: string, baseURL?: string) {
    this.baseURL = baseURL || config.tradeline.apiUrl;
    const key = consumerKey || config.tradeline.consumerKey;
    const secret = consumerSecret || config.tradeline.consumerSecret;

    // Initialize OAuth 1.0a
    this.oauth = new OAuth({
      consumer: {
        key: key,
        secret: secret,
      },
      signature_method: "HMAC-SHA1",
      hash_function(base_string: string, key: string) {
        return crypto
          .createHmac("sha1", key)
          .update(base_string)
          .digest("base64");
      },
    });

    // Initialize axios with defaults
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Add response interceptor for logging
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error("TradelineSupply API Error:", {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  private getAuthHeader(url: string, method: string, data?: any) {
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
  async getPricing(): Promise<Tradeline[]> {
    try {
      // Use the full URL for OAuth signing - however axios uses relative if baseURL set
      // We must provide the full URL to OAuth
      const fullURL = `${this.baseURL}/pricing`;
      const headers = this.getAuthHeader(fullURL, "GET") as any;

      console.log("Fetching pricing from TradelineSupply...");
      const response = await this.axios.get("/pricing", { headers });

      if (!Array.isArray(response.data)) {
        throw new Error("Invalid response format from TradelineSupply API");
      }

      console.log(`Received ${response.data.length} tradelines from API`);

      const cleanData = response.data.map((item: any) => {
        // Helper to strip HTML and extract number from price
        const cleanPrice = (val: any) => {
             if (typeof val === 'number') return val;
             if (typeof val === 'string') {
                 // Remove tags
                 const text = val.replace(/<[^>]*>?/gm, '');
                 // Remove non-numeric chars except dot
                 const num = text.replace(/[^0-9.]/g, '');
                 return parseFloat(num) || 0;
             }
             return 0;
        };

        // Helper to extract stock number
        const cleanStock = (val: any) => {
            if (typeof val === 'number') return val;
             if (typeof val === 'string') {
                 // Remove tags if any
                 const text = val.replace(/<[^>]*>?/gm, '');
                 // Extract first number found
                 const match = text.match(/\d+/);
                 return match ? parseInt(match[0]) : 0;
             }
             return 0;
        };

        return {
            ...item,
            // Sanitize price (it sometimes contains WooCommerce HTML)
            price: cleanPrice(item.price),
            stock: cleanStock(item.stock),
            // Ensure other fields are strings if they contain HTML
            // bank_name usually plain text, but good to be safe? 
            // We assume others are fine for now.
        };
      });

      return cleanData as Tradeline[];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("Authentication failed. Check API credentials.");
        } else if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        throw new Error(
          `API Error: ${error.response?.status} - ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Create an order in TradelineSupply
   * We send them the full price (which includes our commission)
   * They handle the split internally
   */
  async createOrder(orderData: {
    customer_email: string;
    customer_name: string;
    items: Array<{
      card_id: string;
      quantity: number;
    }>;
    order_id: string; // Our internal order ID for reference
  }): Promise<any> {
    try {
      const fullURL = `${this.baseURL}/orders`;

      const wooCommerceOrder = {
        payment_method: "bacs",
        payment_method_title: "Direct Bank Transfer",
        set_paid: true, 
        billing: {
          first_name: orderData.customer_name.split(" ")[0],
          last_name:
            orderData.customer_name.split(" ").slice(1).join(" ") || "",
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

      const headers = this.getAuthHeader(fullURL, "POST", wooCommerceOrder) as any;

      console.log(
        `Creating order in TradelineSupply for ${orderData.items.length} items`
      );
      const response = await this.axios.post("/orders", wooCommerceOrder, {
        headers,
      });

      console.log(`TradelineSupply order created: #${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error("Error creating order in TradelineSupply:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Order Creation Error: ${error.response?.status} - ${error.response?.data?.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get order status from TradelineSupply
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const fullURL = `${this.baseURL}/orders/${orderId}`;
      const headers = this.getAuthHeader(fullURL, "GET") as any;

      const response = await this.axios.get(`/orders/${orderId}`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Error fetching order status for #${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Validate API credentials by making a test request
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getPricing();
      return true;
    } catch (error: any) {
      if (error.message.includes("Authentication failed")) {
        return false;
      }
      throw error;
    }
  }
}

// Singleton instance
let apiInstance: TradelineSupplyAPI | null = null;

export function getTradelineSupplyAPI(): TradelineSupplyAPI {
  if (!apiInstance) {
    apiInstance = new TradelineSupplyAPI();
  }
  return apiInstance;
}

export default TradelineSupplyAPI;
