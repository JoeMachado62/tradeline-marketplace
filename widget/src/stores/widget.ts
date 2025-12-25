import { defineStore } from "pinia";
import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
  Tradeline,
  CartItem,
  WidgetConfig,
  BrokerInfo,
  CalculationResult,
} from "../types";

interface ClientProfile {
  id: string;
  email: string;
  name: string | null;
  excluded_banks: string[];
}

interface WidgetState {
  config: WidgetConfig | null;
  broker: BrokerInfo | null;
  client: ClientProfile | null;
  tradelines: Tradeline[];
  cart: CartItem[];
  loading: boolean;
  error: string | null;
  calculationResult: CalculationResult | null;
  isCalculating: boolean;
  onboardingStep: 'intro' | 'upload' | 'complete';
  uploadProgress: number;
}

export const useWidgetStore = defineStore("widget", {
  state: (): WidgetState => ({
    config: null,
    broker: null,
    client: null,
    tradelines: [],
    cart: [],
    loading: false,
    error: null,
    calculationResult: null,
    isCalculating: false,
    onboardingStep: 'intro',
    uploadProgress: 0,
  }),

  getters: {
    cartItemCount: (state) =>
      state.cart.reduce((sum, item) => sum + item.quantity, 0),

    cartSubtotal: (state) =>
      state.cart.reduce(
        (sum, item) => sum + item.tradeline.price * item.quantity,
        0
      ),

    isConfigured: (state) => state.config !== null,
    
    filteredTradelines: (state) => {
      if (!state.client?.excluded_banks?.length) return state.tradelines;
      
      const excluded = state.client.excluded_banks.map(b => b.toLowerCase());
      return state.tradelines.filter(t => {
        const bank = t.bank_name.toLowerCase();
        return !excluded.some(ex => bank.includes(ex));
      });
    }
  },

  actions: {
    api(): AxiosInstance {
      if (!this.config) {
        throw new Error("Widget not initialized");
      }

      return axios.create({
        baseURL:
          this.config.apiUrl || "https://api.tradelinerental.com/api",
        headers: {
          "X-API-Key": this.config.apiKey,
          "Content-Type": "application/json",
        },
      });
    },

    async initialize(config: WidgetConfig) {
      this.config = config;
      this.error = null;

      // Load initial data
      await this.loadConfig();
      // Don't load pricing yet if we want to force onboarding, 
      // but for now we load it and then filter dynamically
      await this.loadPricing();

      // Track widget load
      this.trackEvent("view");
    },
    
    async onboardClient(email: string, name?: string, phone?: string, file?: File) {
      this.loading = true;
      this.error = null;
      this.uploadProgress = 0;
      
      try {
        const formData = new FormData();
        formData.append("email", email);
        if (name) formData.append("name", name);
        if (phone) formData.append("phone", phone);
        if (file) formData.append("report", file);
        
        const response = await axios.post(
          `${this.config?.apiUrl || 'https://api.tradelinerental.com/api'}/clients/onboard`,
          formData, 
          {
            headers: {
              "X-API-Key": this.config?.apiKey,
              "Content-Type": "multipart/form-data"
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              }
            }
          }
        );
        
        this.client = response.data.client;
        this.onboardingStep = 'complete';
        
        // Refresh pricing if we have exclusions
        if (this.client?.excluded_banks?.length) {
            await this.loadFilteredPricing();
        }
        
      } catch (error: any) {
        this.error = error.response?.data?.error || "Onboarding failed";
        console.error("Onboarding error:", error);
      } finally {
        this.loading = false;
      }
    },
    
    async loadFilteredPricing() {
        if (!this.client) return;
        this.loading = true;
        try {
            const response = await this.api().post("/clients/filter-pricing", {
                client_id: this.client.id
            });
            this.tradelines = response.data.pricing;
        } catch (error) {
            console.error("Failed to load filtered pricing", error);
        } finally {
            this.loading = false;
        }
    },

    async loadPricing() {
      this.loading = true;
      this.error = null;

      try {
        const response = await this.api().get("/public/pricing");
        this.tradelines = response.data.pricing;
        this.broker = response.data.broker;
      } catch (error: any) {
        this.error = error.response?.data?.error || "Failed to load tradelines";
        console.error("Failed to load pricing:", error);
      } finally {
        this.loading = false;
      }
    },

    async loadConfig() {
      try {
        const response = await this.api().get("/public/config");
        // Apply theme if provided
        if (response.data.config.theme) {
          this.applyTheme(response.data.config.theme);
        }
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    },

    addToCart(tradeline: Tradeline) {
      const existing = this.cart.find((item) => item.tradeline.card_id === tradeline.card_id);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push({ tradeline, quantity: 1 });
      }
      this.trackEvent("add_to_cart", { card_id: tradeline.card_id });
      this.calculateTotals();
    },

    removeFromCart(cardId: string) {
      this.cart = this.cart.filter((item) => item.tradeline.card_id !== cardId);
      this.calculateTotals();
    },

    updateQuantity(cardId: string, quantity: number) {
      const item = this.cart.find((item) => item.tradeline.card_id === cardId);
      if (item) {
        item.quantity = Math.max(0, quantity);
        if (item.quantity === 0) {
          this.removeFromCart(cardId);
        } else {
          this.calculateTotals();
        }
      }
    },

    async calculateTotals() {
      if (this.cart.length === 0) {
        this.calculationResult = null;
        return;
      }

      this.isCalculating = true;
      try {
        const items = this.cart.map((item) => ({
          card_id: item.tradeline.card_id,
          quantity: item.quantity,
        }));

        const response = await this.api().post("/public/calculate", { items });
        this.calculationResult = response.data.calculation;
      } catch (error) {
        console.error("Calculation failed:", error);
      } finally {
        this.isCalculating = false;
      }
    },

    async trackEvent(event: string, data?: any) {
      try {
        await this.api().post("/public/track", { event, data });
      } catch (error) {
        // Silent fail for tracking
      }
    },

    applyTheme(theme: any) {
      const root = document.documentElement;
      if (theme.primary_color) root.style.setProperty("--tlm-primary", theme.primary_color);
      if (theme.secondary_color) root.style.setProperty("--tlm-secondary", theme.secondary_color);
      if (theme.font_family) root.style.setProperty("--tlm-font", theme.font_family);
    },

    async checkout(customer: { email: string; name: string; phone: string; password?: string; signature?: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await this.api().post("/public/checkout", {
          customer,
          items: this.cart.map((item) => ({
            card_id: item.tradeline.card_id,
            quantity: item.quantity,
          })),
        });

        if (response.data.redirect_url) {
          window.location.href = response.data.redirect_url;
        } else if (response.data.checkout_url) {
             window.location.href = response.data.checkout_url;
        }
      } catch (error: any) {
        this.error = error.response?.data?.error || "Checkout failed";
        console.error("Checkout failed:", error);
      } finally {
        this.loading = false;
      }
    },
  },
});
