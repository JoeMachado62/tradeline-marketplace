# Tradeline Marketplace - AI Development Blueprint (REVISED)

# PART 3: API Endpoints & Widget Development

## Sprint 3: API Endpoints Implementation

### Task 3.1: Create Authentication Middleware

**Priority**: High
**Complexity**: Simple
**Dependencies**: Part 2 completed

**Commands to Execute**:

```bash
npm install jsonwebtoken express-validator
npm install --save-dev @types/jsonwebtoken
```

**Files to Create**:

`/backend/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getBrokerService } from "@/services/BrokerService";
import { config } from "@/config";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      broker?: any;
      admin?: any;
    }
  }
}

/**
 * Authenticate broker via API key for widget requests
 */
export const authenticateBroker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        code: "MISSING_API_KEY",
      });
    }

    // Get broker from service (uses cache)
    const brokerService = getBrokerService();
    const broker = await brokerService.getBrokerByApiKey(apiKey);

    if (!broker) {
      return res.status(401).json({
        error: "Invalid API key",
        code: "INVALID_API_KEY",
      });
    }

    if (broker.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Broker account is not active",
        code: "BROKER_INACTIVE",
        status: broker.status,
      });
    }

    // Attach broker to request
    req.broker = broker;
    next();
  } catch (error) {
    console.error("Broker authentication error:", error);
    res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Authenticate admin for management endpoints
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Admin authorization required",
        code: "MISSING_AUTH",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== "admin") {
        return res.status(403).json({
          error: "Admin access required",
          code: "INSUFFICIENT_PRIVILEGES",
        });
      }

      req.admin = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Optional broker authentication (for public endpoints that can be enhanced with broker context)
 */
export const optionalBrokerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (apiKey) {
      const brokerService = getBrokerService();
      const broker = await brokerService.getBrokerByApiKey(apiKey);

      if (broker && broker.status === "ACTIVE") {
        req.broker = broker;
      }
    }

    next();
  } catch (error) {
    // Silent fail - optional auth
    next();
  }
};
```

`/backend/src/middleware/validation.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";

/**
 * Validate request using express-validator chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    next();
  };
};
```

---

### Task 3.2: Implement Public API Routes

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 3.1

**Files to Create**:

`/backend/src/routes/public.ts`:

```typescript
import { Router, Request, Response } from "express";
import { body, query } from "express-validator";
import { authenticateBroker, optionalBrokerAuth } from "@/middleware/auth";
import { validate } from "@/middleware/validation";
import { getPricingEngine } from "@/services/PricingEngine";
import { prisma } from "@/services/Database";
import { getCacheService } from "@/services/Cache";

const router = Router();
const pricingEngine = getPricingEngine();
const cache = getCacheService();

/**
 * GET /api/public/pricing
 * Get pricing for widget display
 * Requires broker API key
 */
router.get(
  "/pricing",
  authenticateBroker,
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;

      // Get pricing with broker's markup
      const pricing = await pricingEngine.getPricingForBroker(broker.id);

      // Track widget load in analytics
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
        where: {
          broker_id_date: {
            broker_id: broker.id,
            date: new Date(today),
          },
        },
        update: {
          widget_loads: { increment: 1 },
        },
        create: {
          broker_id: broker.id,
          date: new Date(today),
          widget_loads: 1,
        },
      });

      // Return pricing formatted for widget
      res.json({
        success: true,
        broker: {
          name: broker.name,
          business_name: broker.business_name,
        },
        pricing: pricing.map((item) => ({
          card_id: item.card_id,
          bank_name: item.bank_name,
          credit_limit: item.credit_limit,
          date_opened: item.date_opened,
          purchase_deadline: item.purchase_deadline,
          reporting_period: item.reporting_period,
          stock: item.stock,
          price: item.customer_price, // Show final price to customer
          image: item.image,
        })),
        settings: {
          markup_type: broker.markup_type,
          currency: "USD",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Pricing API error:", error);
      res.status(500).json({
        error: "Failed to fetch pricing",
        code: "PRICING_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/public/calculate
 * Calculate cart totals with broker pricing
 */
router.post(
  "/calculate",
  authenticateBroker,
  validate([
    body("items").isArray({ min: 1 }).withMessage("Cart items required"),
    body("items.*.card_id").notEmpty().withMessage("Card ID required"),
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Valid quantity required"),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { items } = req.body;

      // Calculate totals
      const calculation = await pricingEngine.calculateOrderTotal(
        items,
        broker.id
      );

      res.json({
        success: true,
        calculation: {
          items: calculation.items.map((item) => ({
            card_id: item.card_id,
            bank_name: item.bank_name,
            quantity: item.quantity,
            unit_price: item.customer_price,
            total: item.customer_price * item.quantity,
          })),
          subtotal: calculation.total_customer_price,
          total: calculation.total_customer_price,
          item_count: items.reduce(
            (sum: number, item: any) => sum + item.quantity,
            0
          ),
        },
        currency: "USD",
      });
    } catch (error: any) {
      console.error("Calculation error:", error);
      res.status(400).json({
        error: "Failed to calculate totals",
        code: "CALCULATION_ERROR",
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/public/track
 * Track widget events for analytics
 */
router.post(
  "/track",
  authenticateBroker,
  validate([
    body("event").isIn(["view", "click", "add_to_cart", "checkout_started"]),
    body("data").optional().isObject(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { event, data } = req.body;

      const today = new Date().toISOString().split("T")[0];

      // Update analytics based on event type
      const updateData: any = {};

      switch (event) {
        case "view":
          updateData.unique_visitors = { increment: 1 };
          break;
        case "add_to_cart":
          updateData.cart_additions = { increment: 1 };
          break;
        default:
          // Generic event tracking
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.analytics.upsert({
          where: {
            broker_id_date: {
              broker_id: broker.id,
              date: new Date(today),
            },
          },
          update: updateData,
          create: {
            broker_id: broker.id,
            date: new Date(today),
            ...updateData,
          },
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          broker_id: broker.id,
          action: `WIDGET_${event.toUpperCase()}`,
          metadata: data,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Tracking error:", error);
      // Don't fail on tracking errors
      res.json({ success: true });
    }
  }
);

/**
 * GET /api/public/config
 * Get widget configuration and settings
 */
router.get(
  "/config",
  authenticateBroker,
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;

      res.json({
        success: true,
        config: {
          broker: {
            name: broker.name,
            business_name: broker.business_name,
            website: broker.website,
          },
          features: {
            show_stock: true,
            show_purchase_deadline: true,
            show_reporting_period: true,
            enable_cart: true,
            max_items_per_order: 10,
            max_quantity_per_item: 3,
          },
          theme: {
            primary_color: "#2563eb",
            secondary_color: "#64748b",
            success_color: "#16a34a",
            error_color: "#dc2626",
            font_family: "Inter, system-ui, sans-serif",
          },
          checkout: {
            success_url: broker.website ? `${broker.website}/thank-you` : null,
            cancel_url: broker.website ? `${broker.website}/cart` : null,
          },
        },
      });
    } catch (error) {
      console.error("Config error:", error);
      res.status(500).json({
        error: "Failed to fetch configuration",
        code: "CONFIG_ERROR",
      });
    }
  }
);

export default router;
```

---

### Task 3.3: Implement Broker Management API Routes

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 3.2

**Files to Create**:

`/backend/src/routes/brokers.ts`:

```typescript
import { Router, Request, Response } from "express";
import { body, query, param } from "express-validator";
import { authenticateAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validation";
import { getBrokerService } from "@/services/BrokerService";
import { getPricingEngine } from "@/services/PricingEngine";
import { prisma } from "@/services/Database";
import { config } from "@/config";

const router = Router();
const brokerService = getBrokerService();

/**
 * POST /api/brokers
 * Create a new broker (Admin only)
 */
router.post(
  "/",
  authenticateAdmin,
  validate([
    body("name").notEmpty().trim(),
    body("email").isEmail().normalizeEmail(),
    body("business_name").optional().trim(),
    body("phone").optional().isMobilePhone("any"),
    body("website").optional().isURL(),
    body("revenue_share_percent").optional().isFloat({
      min: config.commission.minBrokerSharePercent,
      max: config.commission.maxBrokerSharePercent,
    }),
    body("notes").optional().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const result = await brokerService.createBroker(req.body);

      res.status(201).json({
        success: true,
        broker: {
          id: result.broker.id,
          name: result.broker.name,
          email: result.broker.email,
          api_key: result.broker.api_key,
          revenue_share_percent: result.broker.revenue_share_percent,
          status: result.broker.status,
        },
        credentials: {
          api_key: result.broker.api_key,
          api_secret: result.api_secret, // Only shown once
        },
        message:
          "Broker created successfully. Save the API secret - it cannot be retrieved again.",
      });
    } catch (error: any) {
      console.error("Create broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to create broker",
        code: "CREATE_BROKER_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers
 * List all brokers with pagination (Admin only)
 */
router.get(
  "/",
  authenticateAdmin,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status")
      .optional()
      .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    query("search").optional().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const search = req.query.search as string;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { business_name: { contains: search, mode: "insensitive" } },
        ];
      }

      const [brokers, total] = await Promise.all([
        prisma.broker.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            business_name: true,
            email: true,
            revenue_share_percent: true,
            markup_type: true,
            markup_value: true,
            status: true,
            created_at: true,
            _count: {
              select: {
                orders: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        }),
        prisma.broker.count({ where }),
      ]);

      res.json({
        success: true,
        brokers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("List brokers error:", error);
      res.status(500).json({
        error: "Failed to fetch brokers",
        code: "LIST_BROKERS_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers/:id
 * Get broker details (Admin only)
 */
router.get(
  "/:id",
  authenticateAdmin,
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
    try {
      const broker = await prisma.broker.findUnique({
        where: { id: req.params.id },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!broker) {
        return res.status(404).json({
          error: "Broker not found",
          code: "BROKER_NOT_FOUND",
        });
      }

      // Get statistics
      const stats = await brokerService.getBrokerStats(broker.id);

      res.json({
        success: true,
        broker: {
          ...broker,
          api_secret: undefined, // Never expose
        },
        stats,
      });
    } catch (error) {
      console.error("Get broker error:", error);
      res.status(500).json({
        error: "Failed to fetch broker",
        code: "GET_BROKER_ERROR",
      });
    }
  }
);

/**
 * PATCH /api/brokers/:id
 * Update broker settings (Admin only)
 */
router.patch(
  "/:id",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    body("revenue_share_percent").optional().isFloat({
      min: config.commission.minBrokerSharePercent,
      max: config.commission.maxBrokerSharePercent,
    }),
    body("status")
      .optional()
      .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
    body("notes").optional(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const adminId = req.admin.id;

      const broker = await brokerService.updateBroker(
        req.params.id,
        updates,
        adminId
      );

      res.json({
        success: true,
        broker: {
          ...broker,
          api_secret: undefined,
        },
        message: "Broker updated successfully",
      });
    } catch (error: any) {
      console.error("Update broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to update broker",
        code: "UPDATE_BROKER_ERROR",
      });
    }
  }
);

/**
 * POST /api/brokers/:id/approve
 * Approve a pending broker (Admin only)
 */
router.post(
  "/:id/approve",
  authenticateAdmin,
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
    try {
      const adminId = req.admin.id;
      const broker = await brokerService.approveBroker(req.params.id, adminId);

      res.json({
        success: true,
        broker: {
          ...broker,
          api_secret: undefined,
        },
        message: "Broker approved successfully",
      });
    } catch (error: any) {
      console.error("Approve broker error:", error);
      res.status(400).json({
        error: error.message || "Failed to approve broker",
        code: "APPROVE_BROKER_ERROR",
      });
    }
  }
);

/**
 * GET /api/brokers/:id/analytics
 * Get broker analytics (Admin only)
 */
router.get(
  "/:id/analytics",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query;

      const where: any = {
        broker_id: req.params.id,
      };

      if (start_date && end_date) {
        where.date = {
          gte: new Date(start_date as string),
          lte: new Date(end_date as string),
        };
      }

      const analytics = await prisma.analytics.findMany({
        where,
        orderBy: { date: "desc" },
        take: 30, // Last 30 days
      });

      // Calculate summary
      const summary = analytics.reduce(
        (acc, day) => ({
          total_views: acc.total_views + day.widget_loads,
          total_visitors: acc.total_visitors + day.unique_visitors,
          total_cart_additions: acc.total_cart_additions + day.cart_additions,
          total_orders: acc.total_orders + day.orders_count,
          total_revenue:
            acc.total_revenue + PricingEngine.centsToUsd(day.total_sales),
          total_commission:
            acc.total_commission +
            PricingEngine.centsToUsd(
              day.revenue_share_earned + day.markup_earned
            ),
        }),
        {
          total_views: 0,
          total_visitors: 0,
          total_cart_additions: 0,
          total_orders: 0,
          total_revenue: 0,
          total_commission: 0,
        }
      );

      res.json({
        success: true,
        summary,
        daily: analytics.map((day) => ({
          ...day,
          total_sales_usd: PricingEngine.centsToUsd(day.total_sales),
          revenue_share_earned_usd: PricingEngine.centsToUsd(
            day.revenue_share_earned
          ),
          markup_earned_usd: PricingEngine.centsToUsd(day.markup_earned),
        })),
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        code: "ANALYTICS_ERROR",
      });
    }
  }
);

export default router;
```

---

## Sprint 4: Widget Development

### Task 4.1: Initialize Vue.js Widget Project

**Priority**: High
**Complexity**: Simple
**Dependencies**: API endpoints ready

**Commands to Execute**:

```bash
cd ..
npm create vite@latest widget -- --template vue-ts
cd widget
npm install
npm install axios pinia @vueuse/core
```

**Files to Create**:

`/widget/src/types/index.ts`:

```typescript
export interface Tradeline {
  card_id: string;
  bank_name: string;
  credit_limit: number;
  date_opened: string;
  purchase_deadline: string;
  reporting_period: string;
  stock: number;
  price: number;
  image: string;
}

export interface CartItem {
  tradeline: Tradeline;
  quantity: number;
}

export interface WidgetConfig {
  apiKey: string;
  apiUrl?: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    successColor?: string;
    errorColor?: string;
    fontFamily?: string;
  };
  onCheckout?: (items: CartItem[]) => void;
}

export interface BrokerInfo {
  name: string;
  business_name: string | null;
}

export interface CalculationResult {
  items: Array<{
    card_id: string;
    bank_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  item_count: number;
}
```

`/widget/src/stores/widget.ts`:

```typescript
import { defineStore } from "pinia";
import axios, { AxiosInstance } from "axios";
import type {
  Tradeline,
  CartItem,
  WidgetConfig,
  BrokerInfo,
  CalculationResult,
} from "../types";

interface WidgetState {
  config: WidgetConfig | null;
  broker: BrokerInfo | null;
  tradelines: Tradeline[];
  cart: CartItem[];
  loading: boolean;
  error: string | null;
  calculationResult: CalculationResult | null;
  isCalculating: boolean;
}

export const useWidgetStore = defineStore("widget", {
  state: (): WidgetState => ({
    config: null,
    broker: null,
    tradelines: [],
    cart: [],
    loading: false,
    error: null,
    calculationResult: null,
    isCalculating: false,
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
  },

  actions: {
    api(): AxiosInstance {
      if (!this.config) {
        throw new Error("Widget not initialized");
      }

      return axios.create({
        baseURL:
          this.config.apiUrl || "https://api.tradelinerental.com/api/public",
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
      await Promise.all([this.loadPricing(), this.loadConfig()]);

      // Track widget load
      this.trackEvent("view");
    },

    async loadPricing() {
      this.loading = true;
      this.error = null;

      try {
        const response = await this.api().get("/pricing");
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
        const response = await this.api().get("/config");
        const config = response.data.config;

        // Apply theme if provided
        if (this.config?.theme) {
          Object.assign(config.theme, this.config.theme);
        }

        // Merge with existing config
        this.config = { ...this.config!, ...config };
      } catch (error) {
        console.error("Failed to load config:", error);
      }
    },

    addToCart(tradeline: Tradeline, quantity: number = 1) {
      const existing = this.cart.find(
        (item) => item.tradeline.card_id === tradeline.card_id
      );

      if (existing) {
        // Check stock limit
        const newQuantity = existing.quantity + quantity;
        if (newQuantity <= tradeline.stock) {
          existing.quantity = newQuantity;
        } else {
          this.error = `Only ${tradeline.stock} available`;
        }
      } else {
        this.cart.push({ tradeline, quantity });
      }

      this.trackEvent("add_to_cart", { card_id: tradeline.card_id });
      this.calculateTotals();
    },

    removeFromCart(cardId: string) {
      const index = this.cart.findIndex(
        (item) => item.tradeline.card_id === cardId
      );
      if (index > -1) {
        this.cart.splice(index, 1);
        this.calculateTotals();
      }
    },

    updateQuantity(cardId: string, quantity: number) {
      const item = this.cart.find((item) => item.tradeline.card_id === cardId);

      if (item) {
        if (quantity <= 0) {
          this.removeFromCart(cardId);
        } else if (quantity <= item.tradeline.stock) {
          item.quantity = quantity;
          this.calculateTotals();
        } else {
          this.error = `Only ${item.tradeline.stock} available`;
        }
      }
    },

    clearCart() {
      this.cart = [];
      this.calculationResult = null;
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

        const response = await this.api().post("/calculate", { items });
        this.calculationResult = response.data.calculation;
      } catch (error) {
        console.error("Failed to calculate totals:", error);
        // Fall back to client-side calculation
        this.calculationResult = {
          items: this.cart.map((item) => ({
            card_id: item.tradeline.card_id,
            bank_name: item.tradeline.bank_name,
            quantity: item.quantity,
            unit_price: item.tradeline.price,
            total: item.tradeline.price * item.quantity,
          })),
          subtotal: this.cartSubtotal,
          total: this.cartSubtotal,
          item_count: this.cartItemCount,
        };
      } finally {
        this.isCalculating = false;
      }
    },

    async trackEvent(event: string, data?: any) {
      try {
        await this.api().post("/track", { event, data });
      } catch (error) {
        // Silent fail for tracking
        console.debug("Tracking event failed:", event, error);
      }
    },

    async checkout() {
      if (this.cart.length === 0) return;

      this.trackEvent("checkout_started");

      // If custom checkout handler provided
      if (this.config?.onCheckout) {
        this.config.onCheckout(this.cart);
        return;
      }

      // Otherwise, create checkout session
      try {
        const items = this.cart.map((item) => ({
          card_id: item.tradeline.card_id,
          quantity: item.quantity,
        }));

        const response = await this.api().post("/checkout/session", { items });

        // Redirect to checkout
        if (response.data.checkout_url) {
          window.location.href = response.data.checkout_url;
        }
      } catch (error: any) {
        this.error = error.response?.data?.error || "Checkout failed";
        console.error("Checkout error:", error);
      }
    },
  },
});
```

`/widget/src/components/TradelineCard.vue`:

```vue
<template>
  <div class="tl-card">
    <div class="tl-card-image">
      <img :src="tradeline.image" :alt="tradeline.bank_name" />
    </div>

    <div class="tl-card-content">
      <h3 class="tl-card-title">{{ tradeline.bank_name }}</h3>

      <div class="tl-card-details">
        <div class="tl-detail">
          <span class="tl-detail-label">Credit Limit:</span>
          <span class="tl-detail-value"
            >${{ formatNumber(tradeline.credit_limit) }}</span
          >
        </div>

        <div class="tl-detail">
          <span class="tl-detail-label">Age:</span>
          <span class="tl-detail-value">{{
            calculateAge(tradeline.date_opened)
          }}</span>
        </div>

        <div class="tl-detail" v-if="showPurchaseDeadline">
          <span class="tl-detail-label">Purchase By:</span>
          <span class="tl-detail-value">{{
            formatDate(tradeline.purchase_deadline)
          }}</span>
        </div>

        <div class="tl-detail" v-if="showStock">
          <span class="tl-detail-label">Available:</span>
          <span
            class="tl-detail-value"
            :class="{ 'tl-low-stock': tradeline.stock <= 2 }"
          >
            {{ tradeline.stock }} left
          </span>
        </div>
      </div>

      <div class="tl-card-footer">
        <div class="tl-price">${{ formatNumber(tradeline.price) }}</div>

        <button
          class="tl-btn tl-btn-primary"
          :disabled="tradeline.stock === 0 || isInCart"
          @click="handleAddToCart"
        >
          {{ buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useWidgetStore } from "../stores/widget";
import type { Tradeline } from "../types";

const props = defineProps<{
  tradeline: Tradeline;
  showStock?: boolean;
  showPurchaseDeadline?: boolean;
}>();

const store = useWidgetStore();

const isInCart = computed(() =>
  store.cart.some((item) => item.tradeline.card_id === props.tradeline.card_id)
);

const buttonText = computed(() => {
  if (props.tradeline.stock === 0) return "Out of Stock";
  if (isInCart.value) return "In Cart";
  return "Add to Cart";
});

const handleAddToCart = () => {
  if (!isInCart.value && props.tradeline.stock > 0) {
    store.addToCart(props.tradeline);
  }
};

const formatNumber = (num: number) => num.toLocaleString("en-US");

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const calculateAge = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const years = Math.floor(
    (now.getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  const months =
    Math.floor(
      (now.getTime() - date.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    ) % 12;

  if (years > 0) {
    return `${years}y ${months}m`;
  }
  return `${months}m`;
};
</script>

<style scoped>
.tl-card {
  border: 1px solid var(--tl-border-color, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  background: var(--tl-card-bg, white);
  transition: transform 0.2s, box-shadow 0.2s;
}

.tl-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tl-card-image {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tl-image-bg, #f9fafb);
  padding: 12px;
}

.tl-card-image img {
  max-height: 56px;
  max-width: 180px;
  object-fit: contain;
}

.tl-card-content {
  padding: 16px;
}

.tl-card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--tl-text-primary, #111827);
}

.tl-card-details {
  margin-bottom: 16px;
}

.tl-detail {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.tl-detail-label {
  color: var(--tl-text-secondary, #6b7280);
}

.tl-detail-value {
  font-weight: 500;
  color: var(--tl-text-primary, #111827);
}

.tl-low-stock {
  color: var(--tl-error-color, #dc2626);
}

.tl-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--tl-border-color, #e5e7eb);
}

.tl-price {
  font-size: 24px;
  font-weight: 700;
  color: var(--tl-primary-color, #2563eb);
}

.tl-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;
}

.tl-btn-primary {
  background: var(--tl-primary-color, #2563eb);
  color: white;
}

.tl-btn-primary:hover:not(:disabled) {
  background: var(--tl-primary-hover, #1d4ed8);
}

.tl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

`/widget/src/Widget.vue`:

```vue
<template>
  <div id="tradeline-widget" :style="cssVariables">
    <div v-if="store.loading" class="tl-loading">Loading tradelines...</div>

    <div v-else-if="store.error" class="tl-error">
      {{ store.error }}
    </div>

    <div v-else class="tl-widget">
      <!-- Header -->
      <div class="tl-header" v-if="store.broker">
        <h2>Tradelines Available</h2>
        <div class="tl-cart-summary" @click="showCart = !showCart">
          <span class="tl-cart-icon">🛒</span>
          <span class="tl-cart-count" v-if="store.cartItemCount > 0">
            {{ store.cartItemCount }}
          </span>
        </div>
      </div>

      <!-- Tradelines Grid -->
      <div class="tl-grid" v-show="!showCart">
        <TradelineCard
          v-for="tradeline in store.tradelines"
          :key="tradeline.card_id"
          :tradeline="tradeline"
          :show-stock="true"
          :show-purchase-deadline="true"
        />
      </div>

      <!-- Cart View -->
      <Cart v-if="showCart" @close="showCart = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useWidgetStore } from "./stores/widget";
import TradelineCard from "./components/TradelineCard.vue";
import Cart from "./components/Cart.vue";

const store = useWidgetStore();
const showCart = ref(false);

const cssVariables = computed(() => {
  const theme = store.config?.theme;
  if (!theme) return {};

  return {
    "--tl-primary-color": theme.primaryColor,
    "--tl-secondary-color": theme.secondaryColor,
    "--tl-success-color": theme.successColor,
    "--tl-error-color": theme.errorColor,
    "--tl-font-family": theme.fontFamily,
  };
});
</script>

<style>
#tradeline-widget {
  font-family: var(--tl-font-family, Inter, system-ui, sans-serif);
  color: var(--tl-text-primary, #111827);
  line-height: 1.5;
}

.tl-loading,
.tl-error {
  padding: 40px;
  text-align: center;
}

.tl-error {
  color: var(--tl-error-color, #dc2626);
}

.tl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 2px solid var(--tl-border-color, #e5e7eb);
  margin-bottom: 24px;
}

.tl-cart-summary {
  position: relative;
  cursor: pointer;
  padding: 8px 16px;
  background: var(--tl-primary-color, #2563eb);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-cart-count {
  background: white;
  color: var(--tl-primary-color, #2563eb);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.tl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

* {
  box-sizing: border-box;
}
</style>
```

**Acceptance Criteria**:

- [ ] API authentication works with broker API key
- [ ] Pricing shows with correct broker markups
- [ ] Analytics tracking implemented
- [ ] Widget store manages state properly
- [ ] Components render tradeline data
- [ ] Cart functionality works

**Validation Commands**:

```bash
cd widget
npm run dev
# Test widget in browser
```

---

This completes Part 3. Should I continue with Part 4: Payment & Order Processing?
