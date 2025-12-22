# Tradeline Marketplace - AI Development Blueprint (REVISED)

# PART 1: Project Overview & Foundation

## Project Overview

Multi-tenant white-label platform for selling tradelines with the following commission structure:

- TradelineSupply prices already include 50% markup for our platform
- Brokers receive 10-25% of the base price as revenue share (admin-controlled)
- Brokers can add their own markup on top (broker-controlled, they keep 100%)

## Commission Structure Example

```
TradelineSupply Price: $1,000 (includes our 50% commission)
├── Cost to TradelineSupply: $500
└── Platform Commission: $500
    ├── Broker Revenue Share (10%): $100
    └── Platform Keeps: $400

Broker Adds 20% Markup: $200
Customer Pays: $1,200
Broker Total Earnings: $300 ($100 share + $200 markup)
```

## Tech Stack

- **Backend**: Node.js with Express & TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Frontend Widget**: Vue.js 3 (compiled to single JS file)
- **Admin Dashboard**: React with Next.js
- **Payment**: Stripe
- **Queue**: Bull (Redis-based)
- **Deployment**: Docker + VPS

---

# PHASE 1: Foundation & Core API (Sprint 1-2)

## Sprint 1: Project Setup & TradelineSupply Integration

### Task 1.1: Initialize Node.js Backend with TypeScript

**Priority**: High
**Complexity**: Simple
**Dependencies**: None

**Commands to Execute**:

```bash
mkdir -p tradeline-marketplace/backend
cd tradeline-marketplace/backend
npm init -y
npm install express typescript @types/node @types/express tsx nodemon
npm install dotenv cors helmet morgan compression express-rate-limit
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier jest @types/jest ts-jest
```

**Files to Create**:

`/backend/package.json`:

```json
{
  "name": "tradeline-marketplace-backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

`/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@services/*": ["services/*"],
      "@routes/*": ["routes/*"],
      "@types/*": ["types/*"],
      "@utils/*": ["utils/*"],
      "@middleware/*": ["middleware/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

`/backend/src/types/index.ts`:

```typescript
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
  customer_price: number; // Final price customer sees
  platform_net_revenue: number; // What platform keeps after sharing
  broker_total_earnings: number; // Revenue share + markup
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
```

`/backend/src/config/index.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),

  // TradelineSupply API
  tradeline: {
    consumerKey: process.env.TRADELINE_CONSUMER_KEY!,
    consumerSecret: process.env.TRADELINE_CONSUMER_SECRET!,
    apiUrl:
      process.env.TRADELINE_API_URL ||
      "https://tradelinesupply.com/wp-json/wc/v3",
  },

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    ttl: {
      pricing: 300, // 5 minutes for pricing cache
      broker: 3600, // 1 hour for broker config cache
    },
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    apiVersion: "2023-10-16" as const,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiry: process.env.JWT_EXPIRY || "7d",
  },

  // Commission Structure (platform constants)
  commission: {
    platformCommissionPercent: 50, // We get 50% from TradelineSupply prices
    minBrokerSharePercent: 10, // Minimum revenue share for brokers
    maxBrokerSharePercent: 25, // Maximum revenue share for brokers
    defaultBrokerSharePercent: 10, // Default for new brokers
  },

  // API
  api: {
    corsOrigin: process.env.CORS_ORIGIN || "*",
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "TRADELINE_CONSUMER_KEY",
  "TRADELINE_CONSUMER_SECRET",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "JWT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

`/backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.api.corsOrigin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.api.rateLimitWindow,
  max: config.api.rateLimitMax,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// General middleware
app.use(compression());
app.use(morgan(config.env === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: process.env.npm_package_version,
  });
});

// API info endpoint
app.get("/api", (req: Request, res: Response) => {
  res.json({
    name: "Tradeline Marketplace API",
    version: "1.0.0",
    commission_structure: {
      platform_commission: "50% of TradelineSupply price",
      broker_revenue_share: "10-25% of base price (admin controlled)",
      broker_markup: "Unlimited (broker controlled, keeps 100%)",
    },
  });
});

// Error handling middleware (must be last)
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: config.env === "development" ? err.message : "Internal server error",
    ...(config.env === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
🚀 Tradeline Marketplace API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Environment: ${config.env}
🌐 Server: http://localhost:${PORT}
💰 Commission Model: 50% platform / 10-25% broker share / unlimited broker markup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
```

`/backend/.env.example`:

```env
# Environment
NODE_ENV=development
PORT=3000

# TradelineSupply WooCommerce API (OAuth 1.0a)
TRADELINE_CONSUMER_KEY=ck_your_consumer_key_here
TRADELINE_CONSUMER_SECRET=cs_your_consumer_secret_here
TRADELINE_API_URL=https://tradelinesupply.com/wp-json/wc/v3

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/tradeline_marketplace

# Redis Cache
REDIS_URL=redis://localhost:6379

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d

# CORS (for widget embedding)
CORS_ORIGIN=*

# Admin Credentials (initial setup)
ADMIN_EMAIL=admin@tradelinerental.com
ADMIN_PASSWORD=change_this_password
```

**Acceptance Criteria**:

- [ ] Server starts on configured port
- [ ] GET /health returns 200 with proper JSON
- [ ] GET /api returns commission structure info
- [ ] TypeScript compiles without errors
- [ ] Environment variables load correctly
- [ ] Rate limiting works (test with multiple requests)

**Validation Commands**:

```bash
npm run dev
curl http://localhost:3000/health
curl http://localhost:3000/api
npm run lint
npm run build
```

---

### Task 1.2: Implement TradelineSupply API Client with OAuth 1.0a

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 1.1

**Commands to Execute**:

```bash
npm install oauth-1.0a crypto axios
npm install --save-dev @types/oauth-1.0a
```

**Files to Create**:

`/backend/src/services/TradelineSupplyAPI.ts`:

```typescript
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import axios, { AxiosInstance, AxiosError } from "axios";
import { Tradeline } from "@/types";
import { config } from "@/config";

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
      const url = `${this.baseURL}/pricing`;
      const headers = this.getAuthHeader(url, "GET");

      console.log("Fetching pricing from TradelineSupply...");
      const response = await this.axios.get("/pricing", { headers });

      if (!Array.isArray(response.data)) {
        throw new Error("Invalid response format from TradelineSupply API");
      }

      // Important: These prices already include our 50% markup
      // No need to add platform commission on top
      console.log(`Received ${response.data.length} tradelines from API`);
      return response.data as Tradeline[];
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
      const url = `${this.baseURL}/orders`;

      const wooCommerceOrder = {
        payment_method: "bacs", // Bank transfer (since we handle payment)
        payment_method_title: "Direct Bank Transfer",
        set_paid: true, // Mark as paid since we collected payment
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

      const headers = this.getAuthHeader(url, "POST", wooCommerceOrder);

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
      const url = `${this.baseURL}/orders/${orderId}`;
      const headers = this.getAuthHeader(url, "GET");

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
```

`/backend/src/services/__tests__/TradelineSupplyAPI.test.ts`:

```typescript
import { TradelineSupplyAPI } from "../TradelineSupplyAPI";
import { Tradeline } from "@/types";

describe("TradelineSupplyAPI", () => {
  let api: TradelineSupplyAPI;

  beforeEach(() => {
    api = new TradelineSupplyAPI(
      "test_consumer_key",
      "test_consumer_secret",
      "https://test.tradelinesupply.com/wp-json/wc/v3"
    );
  });

  describe("OAuth Signature Generation", () => {
    it("should generate valid OAuth 1.0a headers", () => {
      const headers = (api as any).getAuthHeader("https://test.com/api", "GET");

      expect(headers).toHaveProperty("Authorization");
      expect(headers.Authorization).toContain("OAuth");
      expect(headers.Authorization).toContain("oauth_consumer_key=");
      expect(headers.Authorization).toContain("oauth_signature=");
      expect(headers.Authorization).toContain(
        'oauth_signature_method="HMAC-SHA1"'
      );
      expect(headers.Authorization).toContain("oauth_timestamp=");
      expect(headers.Authorization).toContain("oauth_nonce=");
    });
  });

  describe("getPricing", () => {
    it("should return array of tradelines with correct structure", async () => {
      // Mock successful response
      jest.spyOn(api["axios"], "get").mockResolvedValue({
        data: [
          {
            card_id: "TEST123",
            bank_name: "Chase Sapphire",
            credit_limit: 15000,
            price: 1000, // This includes 50% platform commission
            stock: 5,
            date_opened: "2019-01-15",
            purchase_deadline: "2024-12-31",
            reporting_period: "2024-01-15",
            image: "https://tradelinerental.com/chase.png",
          } as Tradeline,
        ],
      });

      const pricing = await api.getPricing();

      expect(Array.isArray(pricing)).toBe(true);
      expect(pricing).toHaveLength(1);
      expect(pricing[0].card_id).toBe("TEST123");
      expect(pricing[0].price).toBe(1000); // Platform commission already included
    });

    it("should handle authentication errors", async () => {
      jest.spyOn(api["axios"], "get").mockRejectedValue({
        isAxiosError: true,
        response: { status: 401, statusText: "Unauthorized" },
      });

      await expect(api.getPricing()).rejects.toThrow("Authentication failed");
    });
  });

  describe("createOrder", () => {
    it("should create order with correct WooCommerce format", async () => {
      const mockPost = jest.spyOn(api["axios"], "post").mockResolvedValue({
        data: { id: 12345, status: "processing" },
      });

      const orderData = {
        customer_email: "customer@tradelinerental.com",
        customer_name: "John Doe",
        items: [{ card_id: "TEST123", quantity: 1 }],
        order_id: "ORD-001",
      };

      const result = await api.createOrder(orderData);

      expect(mockPost).toHaveBeenCalledWith(
        "/orders",
        expect.objectContaining({
          payment_method: "bacs",
          set_paid: true,
          billing: expect.objectContaining({
            email: "customer@tradelinerental.com",
          }),
          line_items: expect.arrayContaining([
            expect.objectContaining({
              product_id: "TEST123",
              quantity: 1,
            }),
          ]),
        }),
        expect.any(Object)
      );

      expect(result.id).toBe(12345);
    });
  });
});
```

**Acceptance Criteria**:

- [ ] OAuth 1.0a signature generates correctly
- [ ] getPricing() returns array of Tradeline objects
- [ ] Prices are understood to include 50% platform commission
- [ ] createOrder() formats data for WooCommerce
- [ ] Error handling for auth failures and rate limits
- [ ] Tests pass with mocked responses

**Validation Commands**:

```bash
npm test -- TradelineSupplyAPI
npm run dev
# Test the API connection (requires valid credentials in .env)
```

---

This completes Part 1 of the blueprint. Should I continue with Part 2 (Database & Business Logic)?

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create Part 1: Project Overview & Foundation", "status": "completed", "activeForm": "Creating Part 1: Project Overview & Foundation"}, {"content": "Create Part 2: Database & Business Logic", "status": "in_progress", "activeForm": "Creating Part 2: Database & Business Logic"}, {"content": "Create Part 3: API Endpoints & Widget", "status": "pending", "activeForm": "Creating Part 3: API Endpoints & Widget"}, {"content": "Create Part 4: Payment & Order Processing", "status": "pending", "activeForm": "Creating Part 4: Payment & Order Processing"}, {"content": "Create Part 5: Admin Dashboard & Deployment", "status": "pending", "activeForm": "Creating Part 5: Admin Dashboard & Deployment"}]
