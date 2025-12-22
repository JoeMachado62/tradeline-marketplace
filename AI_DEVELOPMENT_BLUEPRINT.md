# Tradeline Marketplace Platform - AI Development Blueprint

## Project Overview

Multi-tenant white-label platform for selling tradelines with affiliate management, dynamic pricing, and embeddable widgets.

## Tech Stack

- **Backend**: Node.js with Express & TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Frontend Widget**: Vue.js 3 (compiled to single JS file)
- **Admin Dashboard**: React with Next.js
- **Payment**: Stripe
- **Queue**: Bull (Redis-based)
- **Deployment**: Docker + VPS

## Directory Structure

```
/tradeline-marketplace
├── /backend            # Node.js API server
├── /widget            # Embeddable Vue.js widget
├── /admin             # React admin dashboard
├── /shared            # Shared types & utilities
├── /docker            # Docker configurations
├── /docs              # Documentation
└── /scripts           # Deployment & utility scripts
```

---

# PHASE 1: Foundation & Core API (Sprint 1-2)

## Sprint 1: Project Setup & TradelineSupply Integration

### Task 1.1: Initialize Node.js Backend

**Priority**: High
**Complexity**: Simple
**Dependencies**: None

**Commands to Execute**:

```bash
mkdir -p tradeline-marketplace/backend
cd tradeline-marketplace/backend
npm init -y
npm install express typescript @types/node @types/express tsx nodemon
npm install dotenv cors helmet morgan compression
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

**Files to Create**:

`/backend/package.json`:

```json
{
  "name": "tradeline-marketplace-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "test": "jest"
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
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`/backend/src/server.ts`:

```typescript
import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
```

`/backend/.env.example`:

```env
NODE_ENV=development
PORT=3000

# TradelineSupply WooCommerce API
TRADELINE_CONSUMER_KEY=your_consumer_key_here
TRADELINE_CONSUMER_SECRET=your_consumer_secret_here
TRADELINE_API_URL=https://tradelinesupply.com/wp-json/wc/v3

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tradeline_marketplace

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=7d
```

**Acceptance Criteria**:

- [ ] Server starts on port 3000
- [ ] GET /health returns 200 with JSON response
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Environment variables load correctly

**Validation Commands**:

```bash
npm run dev
curl http://localhost:3000/health
npm run lint
npm run build
```

---

### Task 1.2: Implement TradelineSupply API Client

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 1.1

**Commands to Execute**:

```bash
npm install oauth-1.0a crypto axios
npm install --save-dev @types/oauth-1.0a
```

**Files to Create**:

`/backend/src/types/tradeline.ts`:

```typescript
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

export interface TradelineWithMarkup extends Tradeline {
  original_price: number;
  markup_amount: number;
  affiliate_price: number;
  commission: number;
}

export interface OrderItem {
  card_id: string;
  quantity: number;
  price: number;
  affiliate_id?: string;
}

export interface Order {
  id?: string;
  customer_email: string;
  customer_name: string;
  items: OrderItem[];
  total: number;
  affiliate_id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at?: Date;
}
```

`/backend/src/services/TradelineSupplyAPI.ts`:

```typescript
import OAuth from "oauth-1.0a";
import crypto from "crypto";
import axios, { AxiosInstance } from "axios";
import { Tradeline, Order } from "../types/tradeline";

export class TradelineSupplyAPI {
  private oauth: OAuth;
  private baseURL: string;
  private axios: AxiosInstance;

  constructor(
    private consumerKey: string,
    private consumerSecret: string,
    baseURL?: string
  ) {
    this.baseURL = baseURL || "https://tradelinesupply.com/wp-json/wc/v3";

    // Initialize OAuth 1.0a
    this.oauth = new OAuth({
      consumer: {
        key: this.consumerKey,
        secret: this.consumerSecret,
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
      },
    });
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

  async getPricing(): Promise<Tradeline[]> {
    try {
      const url = `${this.baseURL}/pricing`;
      const headers = this.getAuthHeader(url, "GET");

      const response = await this.axios.get("/pricing", { headers });

      if (!Array.isArray(response.data)) {
        throw new Error("Invalid response format from TradelineSupply API");
      }

      return response.data as Tradeline[];
    } catch (error) {
      console.error("Error fetching pricing:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `API Error: ${error.response?.status} - ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  async createOrder(order: Order): Promise<any> {
    try {
      const url = `${this.baseURL}/orders`;
      const orderData = this.transformOrderForWooCommerce(order);
      const headers = this.getAuthHeader(url, "POST", orderData);

      const response = await this.axios.post("/orders", orderData, { headers });
      return response.data;
    } catch (error) {
      console.error("Error creating order:", error);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Order Error: ${error.response?.status} - ${error.response?.data?.message}`
        );
      }
      throw error;
    }
  }

  private transformOrderForWooCommerce(order: Order) {
    // Transform our order format to WooCommerce format
    return {
      payment_method: "stripe",
      payment_method_title: "Credit Card",
      set_paid: false,
      billing: {
        first_name: order.customer_name.split(" ")[0],
        last_name: order.customer_name.split(" ").slice(1).join(" "),
        email: order.customer_email,
      },
      line_items: order.items.map((item) => ({
        product_id: item.card_id,
        quantity: item.quantity,
      })),
      meta_data: [
        {
          key: "affiliate_id",
          value: order.affiliate_id || "direct",
        },
      ],
    };
  }

  async getOrderStatus(orderId: string): Promise<any> {
    try {
      const url = `${this.baseURL}/orders/${orderId}`;
      const headers = this.getAuthHeader(url, "GET");

      const response = await this.axios.get(`/orders/${orderId}`, { headers });
      return response.data;
    } catch (error) {
      console.error("Error fetching order status:", error);
      throw error;
    }
  }
}

export default TradelineSupplyAPI;
```

`/backend/src/services/__tests__/TradelineSupplyAPI.test.ts`:

```typescript
import { TradelineSupplyAPI } from "../TradelineSupplyAPI";
import { Tradeline } from "../../types/tradeline";

describe("TradelineSupplyAPI", () => {
  let api: TradelineSupplyAPI;

  beforeEach(() => {
    api = new TradelineSupplyAPI(
      process.env.TRADELINE_CONSUMER_KEY || "test_key",
      process.env.TRADELINE_CONSUMER_SECRET || "test_secret"
    );
  });

  describe("OAuth Signature", () => {
    it("should generate valid OAuth 1.0a signature", () => {
      // Test OAuth signature generation
      const headers = (api as any).getAuthHeader("https://test.com", "GET");
      expect(headers).toHaveProperty("Authorization");
      expect(headers.Authorization).toContain("OAuth");
      expect(headers.Authorization).toContain("oauth_signature=");
    });
  });

  describe("getPricing", () => {
    it("should fetch and parse pricing data", async () => {
      // Mock the API call for testing
      if (process.env.NODE_ENV === "test") {
        jest.spyOn(api["axios"], "get").mockResolvedValue({
          data: [
            {
              card_id: "TEST123",
              bank_name: "Test Bank",
              credit_limit: 5000,
              price: 299,
              stock: 5,
            } as Tradeline,
          ],
        });
      }

      const pricing = await api.getPricing();
      expect(Array.isArray(pricing)).toBe(true);
      if (pricing.length > 0) {
        expect(pricing[0]).toHaveProperty("card_id");
        expect(pricing[0]).toHaveProperty("price");
      }
    });
  });
});
```

**Acceptance Criteria**:

- [ ] OAuth 1.0a signature generates correctly
- [ ] getPricing() returns array of Tradeline objects
- [ ] Error handling for network failures
- [ ] Timeout after 30 seconds
- [ ] Tests pass with mocked responses

**Validation Commands**:

```bash
npm install --save-dev jest @types/jest ts-jest
npm test -- TradelineSupplyAPI
```

---

## Sprint 2: Database & Caching Layer

### Task 2.1: Setup PostgreSQL with Prisma

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 1.2

**Commands to Execute**:

```bash
npm install prisma @prisma/client
npx prisma init
```

**Files to Create**:

`/backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Affiliate {
  id              String    @id @default(uuid())
  name            String
  email           String    @unique
  website         String?
  api_key         String    @unique
  markup_type     MarkupType @default(PERCENTAGE)
  markup_value    Float     @default(20)
  status          AffiliateStatus @default(PENDING)
  commission_rate Float     @default(10)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  orders          Order[]
  analytics       Analytics[]
}

model Order {
  id              String    @id @default(uuid())
  affiliate_id    String?
  customer_email  String
  customer_name   String
  stripe_payment_id String?
  total_amount    Float
  commission_amount Float?
  status          OrderStatus @default(PENDING)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  affiliate       Affiliate? @relation(fields: [affiliate_id], references: [id])
  items           OrderItem[]
  webhook_logs    WebhookLog[]
}

model OrderItem {
  id              String    @id @default(uuid())
  order_id        String
  card_id         String
  bank_name       String
  quantity        Int       @default(1)
  unit_price      Float
  markup_amount   Float
  total_price     Float

  order           Order     @relation(fields: [order_id], references: [id])
}

model Analytics {
  id              String    @id @default(uuid())
  affiliate_id    String
  date            DateTime  @db.Date
  views           Int       @default(0)
  clicks          Int       @default(0)
  conversions     Int       @default(0)
  revenue         Float     @default(0)
  commission      Float     @default(0)

  affiliate       Affiliate @relation(fields: [affiliate_id], references: [id])

  @@unique([affiliate_id, date])
}

model WebhookLog {
  id              String    @id @default(uuid())
  order_id        String?
  source          String    // 'stripe' or 'tradeline_supply'
  event_type      String
  payload         Json
  status          String
  created_at      DateTime  @default(now())

  order           Order?    @relation(fields: [order_id], references: [id])
}

model PricingCache {
  id              String    @id @default(uuid())
  cache_key       String    @unique
  data            Json
  expires_at      DateTime
  created_at      DateTime  @default(now())
}

enum MarkupType {
  PERCENTAGE
  FIXED
}

enum AffiliateStatus {
  PENDING
  ACTIVE
  SUSPENDED
  INACTIVE
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

`/backend/src/services/Database.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

class Database {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "info", "warn", "error"]
            : ["error"],
      });
    }
    return Database.instance;
  }

  public static async connect() {
    const prisma = Database.getInstance();
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  public static async disconnect() {
    const prisma = Database.getInstance();
    await prisma.$disconnect();
  }
}

export const prisma = Database.getInstance();
export default Database;
```

**Commands to Execute**:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Acceptance Criteria**:

- [ ] Database migrations run successfully
- [ ] Prisma client generates without errors
- [ ] Can connect to PostgreSQL
- [ ] All models have proper relationships
- [ ] Timestamps auto-update

**Validation Commands**:

```bash
npx prisma studio
npx prisma migrate deploy
```

---

### Task 2.2: Implement Redis Caching

**Priority**: High
**Complexity**: Simple
**Dependencies**: Task 2.1

**Commands to Execute**:

```bash
npm install redis
npm install --save-dev @types/redis
```

**Files to Create**:

`/backend/src/services/Cache.ts`:

```typescript
import { createClient, RedisClientType } from "redis";

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;
  private defaultTTL: number = 300; // 5 minutes

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.client.on("error", (err) => {
      console.error("Redis Client Error", err);
    });

    this.client.on("connect", () => {
      console.log("✅ Redis connected successfully");
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value) as T;
      }
      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl || this.defaultTTL, serialized);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushAll();
    } catch (error) {
      console.error("Cache flush error:", error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  generateKey(...parts: string[]): string {
    return parts.join(":");
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

export default CacheService;
```

**Acceptance Criteria**:

- [ ] Redis connection establishes
- [ ] Can set and get JSON objects
- [ ] TTL works correctly
- [ ] Pattern-based invalidation works
- [ ] Graceful error handling

**Validation Commands**:

```bash
redis-cli ping
npm run dev
# Test cache in health endpoint
```

---

# PHASE 2: Business Logic & APIs (Sprint 3-4)

## Sprint 3: Pricing Engine & Affiliate Management

### Task 3.1: Implement Pricing Engine with Markup

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Sprint 2

**Files to Create**:

`/backend/src/services/PricingEngine.ts`:

```typescript
import { Tradeline, TradelineWithMarkup } from "../types/tradeline";
import { Affiliate, MarkupType } from "@prisma/client";
import { prisma } from "./Database";
import { getCacheService } from "./Cache";
import TradelineSupplyAPI from "./TradelineSupplyAPI";

export class PricingEngine {
  private api: TradelineSupplyAPI;
  private cache = getCacheService();

  constructor() {
    this.api = new TradelineSupplyAPI(
      process.env.TRADELINE_CONSUMER_KEY!,
      process.env.TRADELINE_CONSUMER_SECRET!
    );
  }

  async getPricingForAffiliate(
    affiliateId?: string
  ): Promise<TradelineWithMarkup[]> {
    // Generate cache key
    const cacheKey = this.cache.generateKey("pricing", affiliateId || "direct");

    // Check cache first
    const cached = await this.cache.get<TradelineWithMarkup[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get base pricing from TradelineSupply
    const basePricing = await this.api.getPricing();

    // Apply markup if affiliate
    let pricingWithMarkup: TradelineWithMarkup[];

    if (affiliateId) {
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate) {
        throw new Error("Affiliate not found");
      }

      pricingWithMarkup = this.applyMarkup(basePricing, affiliate);
    } else {
      // Direct pricing (no markup)
      pricingWithMarkup = basePricing.map((item) => ({
        ...item,
        original_price: item.price,
        markup_amount: 0,
        affiliate_price: item.price,
        commission: 0,
      }));
    }

    // Cache for 5 minutes
    await this.cache.set(cacheKey, pricingWithMarkup, 300);

    return pricingWithMarkup;
  }

  private applyMarkup(
    tradelines: Tradeline[],
    affiliate: Affiliate
  ): TradelineWithMarkup[] {
    return tradelines.map((tradeline) => {
      let markupAmount: number;
      let affiliatePrice: number;

      if (affiliate.markup_type === MarkupType.PERCENTAGE) {
        markupAmount = tradeline.price * (affiliate.markup_value / 100);
        affiliatePrice = tradeline.price + markupAmount;
      } else {
        // Fixed markup
        markupAmount = affiliate.markup_value;
        affiliatePrice = tradeline.price + markupAmount;
      }

      const commission = markupAmount * (affiliate.commission_rate / 100);

      return {
        ...tradeline,
        original_price: tradeline.price,
        markup_amount: markupAmount,
        affiliate_price: Math.round(affiliatePrice * 100) / 100, // Round to 2 decimals
        commission: Math.round(commission * 100) / 100,
      };
    });
  }

  async calculateOrderTotal(
    items: Array<{ card_id: string; quantity: number }>,
    affiliateId?: string
  ): Promise<{
    items: Array<any>;
    subtotal: number;
    markup: number;
    total: number;
    commission: number;
  }> {
    const pricing = await this.getPricingForAffiliate(affiliateId);
    const pricingMap = new Map(pricing.map((p) => [p.card_id, p]));

    let subtotal = 0;
    let markup = 0;
    let commission = 0;

    const calculatedItems = items.map((item) => {
      const tradeline = pricingMap.get(item.card_id);
      if (!tradeline) {
        throw new Error(`Tradeline ${item.card_id} not found`);
      }

      const itemSubtotal = tradeline.original_price * item.quantity;
      const itemMarkup = tradeline.markup_amount * item.quantity;
      const itemTotal = tradeline.affiliate_price * item.quantity;
      const itemCommission = tradeline.commission * item.quantity;

      subtotal += itemSubtotal;
      markup += itemMarkup;
      commission += itemCommission;

      return {
        ...item,
        bank_name: tradeline.bank_name,
        unit_price: tradeline.affiliate_price,
        original_price: tradeline.original_price,
        markup_amount: tradeline.markup_amount,
        total_price: itemTotal,
      };
    });

    return {
      items: calculatedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      markup: Math.round(markup * 100) / 100,
      total: Math.round((subtotal + markup) * 100) / 100,
      commission: Math.round(commission * 100) / 100,
    };
  }

  async invalidateCache(affiliateId?: string): Promise<void> {
    if (affiliateId) {
      await this.cache.delete(this.cache.generateKey("pricing", affiliateId));
    } else {
      await this.cache.invalidatePattern("pricing:*");
    }
  }
}

export default PricingEngine;
```

**Acceptance Criteria**:

- [ ] Retrieves base pricing from TradelineSupply API
- [ ] Applies percentage and fixed markups correctly
- [ ] Caches pricing for 5 minutes
- [ ] Calculates order totals accurately
- [ ] Handles commission calculations

---

### Task 3.2: Create Affiliate Management API

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 3.1

**Files to Create**:

`/backend/src/routes/affiliates.ts`:

```typescript
import { Router, Request, Response } from "express";
import { prisma } from "../services/Database";
import { body, validationResult } from "express-validator";
import crypto from "crypto";

const router = Router();

// Generate API key for affiliate
const generateApiKey = (): string => {
  return `tlm_${crypto.randomBytes(32).toString("hex")}`;
};

// Create affiliate
router.post(
  "/",
  [
    body("name").notEmpty().trim(),
    body("email").isEmail().normalizeEmail(),
    body("website").optional().isURL(),
    body("markup_type").isIn(["PERCENTAGE", "FIXED"]),
    body("markup_value").isFloat({ min: 0 }),
    body("commission_rate").isFloat({ min: 0, max: 100 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const affiliate = await prisma.affiliate.create({
        data: {
          ...req.body,
          api_key: generateApiKey(),
          status: "PENDING",
        },
      });

      res.status(201).json({
        success: true,
        affiliate: {
          ...affiliate,
          api_key: undefined, // Don't expose in regular responses
        },
        api_key: affiliate.api_key, // Send once on creation
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Failed to create affiliate" });
    }
  }
);

// Get affiliate by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        website: true,
        markup_type: true,
        markup_value: true,
        commission_rate: true,
        status: true,
        created_at: true,
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    res.json(affiliate);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch affiliate" });
  }
});

// Update affiliate
router.patch(
  "/:id",
  [
    body("markup_type").optional().isIn(["PERCENTAGE", "FIXED"]),
    body("markup_value").optional().isFloat({ min: 0 }),
    body("commission_rate").optional().isFloat({ min: 0, max: 100 }),
    body("status")
      .optional()
      .isIn(["PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"]),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const affiliate = await prisma.affiliate.update({
        where: { id: req.params.id },
        data: req.body,
      });

      // Invalidate pricing cache for this affiliate
      const { PricingEngine } = await import("../services/PricingEngine");
      const pricingEngine = new PricingEngine();
      await pricingEngine.invalidateCache(affiliate.id);

      res.json({
        success: true,
        affiliate: {
          ...affiliate,
          api_key: undefined,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update affiliate" });
    }
  }
);

// Get affiliate analytics
router.get("/:id/analytics", async (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;

  try {
    const analytics = await prisma.analytics.findMany({
      where: {
        affiliate_id: req.params.id,
        ...(start_date &&
          end_date && {
            date: {
              gte: new Date(start_date as string),
              lte: new Date(end_date as string),
            },
          }),
      },
      orderBy: { date: "desc" },
    });

    const summary = analytics.reduce(
      (acc, day) => ({
        total_views: acc.total_views + day.views,
        total_clicks: acc.total_clicks + day.clicks,
        total_conversions: acc.total_conversions + day.conversions,
        total_revenue: acc.total_revenue + day.revenue,
        total_commission: acc.total_commission + day.commission,
      }),
      {
        total_views: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_revenue: 0,
        total_commission: 0,
      }
    );

    res.json({
      summary,
      daily: analytics,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// List all affiliates
router.get("/", async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const where = status ? { status: status as any } : {};

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          markup_type: true,
          markup_value: true,
          commission_rate: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      }),
      prisma.affiliate.count({ where }),
    ]);

    res.json({
      affiliates,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

export default router;
```

**Acceptance Criteria**:

- [ ] CRUD operations for affiliates work
- [ ] API key generation is secure
- [ ] Input validation on all endpoints
- [ ] Analytics endpoint aggregates correctly
- [ ] Pagination works on list endpoint

---

## Sprint 4: Public API & Widget Support

### Task 4.1: Create Public Pricing API

**Priority**: High
**Complexity**: Simple
**Dependencies**: Sprint 3

**Files to Create**:

`/backend/src/routes/public.ts`:

```typescript
import { Router, Request, Response } from "express";
import { PricingEngine } from "../services/PricingEngine";
import { prisma } from "../services/Database";
import { getCacheService } from "../services/Cache";

const router = Router();
const pricingEngine = new PricingEngine();
const cache = getCacheService();

// Middleware to authenticate widget requests
const authenticateWidget = async (
  req: Request,
  res: Response,
  next: Function
) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { api_key: apiKey },
    });

    if (!affiliate) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (affiliate.status !== "ACTIVE") {
      return res.status(403).json({ error: "Affiliate not active" });
    }

    // Attach affiliate to request
    (req as any).affiliate = affiliate;
    next();
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Get pricing for widget
router.get(
  "/pricing",
  authenticateWidget,
  async (req: Request, res: Response) => {
    try {
      const affiliate = (req as any).affiliate;
      const pricing = await pricingEngine.getPricingForAffiliate(affiliate.id);

      // Track widget load
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
        where: {
          affiliate_id_date: {
            affiliate_id: affiliate.id,
            date: new Date(today),
          },
        },
        update: {
          views: { increment: 1 },
        },
        create: {
          affiliate_id: affiliate.id,
          date: new Date(today),
          views: 1,
        },
      });

      res.json({
        success: true,
        data: pricing.map((item) => ({
          card_id: item.card_id,
          bank_name: item.bank_name,
          credit_limit: item.credit_limit,
          date_opened: item.date_opened,
          purchase_deadline: item.purchase_deadline,
          reporting_period: item.reporting_period,
          stock: item.stock,
          price: item.affiliate_price, // Show marked up price
          image: item.image,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Pricing API error:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  }
);

// Calculate cart total
router.post(
  "/calculate",
  authenticateWidget,
  async (req: Request, res: Response) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid cart items" });
    }

    try {
      const affiliate = (req as any).affiliate;
      const calculation = await pricingEngine.calculateOrderTotal(
        items,
        affiliate.id
      );

      res.json({
        success: true,
        calculation: {
          items: calculation.items.map((item) => ({
            card_id: item.card_id,
            bank_name: item.bank_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total_price,
          })),
          subtotal: calculation.subtotal + calculation.markup,
          total: calculation.total,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Track click events
router.post(
  "/track/click",
  authenticateWidget,
  async (req: Request, res: Response) => {
    try {
      const affiliate = (req as any).affiliate;
      const { card_id } = req.body;

      // Track in analytics
      const today = new Date().toISOString().split("T")[0];
      await prisma.analytics.upsert({
        where: {
          affiliate_id_date: {
            affiliate_id: affiliate.id,
            date: new Date(today),
          },
        },
        update: {
          clicks: { increment: 1 },
        },
        create: {
          affiliate_id: affiliate.id,
          date: new Date(today),
          clicks: 1,
        },
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track event" });
    }
  }
);

// Get widget configuration
router.get(
  "/widget/config",
  authenticateWidget,
  async (req: Request, res: Response) => {
    try {
      const affiliate = (req as any).affiliate;

      res.json({
        affiliate: {
          name: affiliate.name,
          website: affiliate.website,
        },
        theme: {
          primary_color: "#007bff",
          secondary_color: "#6c757d",
          font_family: "system-ui, -apple-system, sans-serif",
        },
        features: {
          show_stock: true,
          show_purchase_deadline: true,
          show_reporting_period: true,
          enable_cart: true,
          max_items_per_order: 10,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  }
);

export default router;
```

**Acceptance Criteria**:

- [ ] API key authentication works
- [ ] Pricing returns marked up prices
- [ ] Analytics tracking increments correctly
- [ ] Cart calculation is accurate
- [ ] CORS headers allow widget embedding

---

# PHASE 3: Widget Development (Sprint 5-6)

## Sprint 5: Vue.js Widget Implementation

### Task 5.1: Initialize Vue.js Widget Project

**Priority**: High
**Complexity**: Simple
**Dependencies**: Phase 2

**Commands to Execute**:

```bash
cd tradeline-marketplace
npm create vite@latest widget -- --template vue-ts
cd widget
npm install
npm install axios
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
  apiUrl: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  features?: {
    showStock?: boolean;
    showPurchaseDeadline?: boolean;
    showReportingPeriod?: boolean;
    enableCart?: boolean;
    maxItemsPerOrder?: number;
  };
}
```

`/widget/src/store/index.ts`:

```typescript
import { reactive, computed } from "vue";
import axios from "axios";
import type { Tradeline, CartItem, WidgetConfig } from "../types";

interface State {
  config: WidgetConfig | null;
  tradelines: Tradeline[];
  cart: CartItem[];
  loading: boolean;
  error: string | null;
}

const state = reactive<State>({
  config: null,
  tradelines: [],
  cart: [],
  loading: false,
  error: null,
});

const api = axios.create();

export const store = {
  state,

  // Computed
  cartTotal: computed(() => {
    return state.cart.reduce((total, item) => {
      return total + item.tradeline.price * item.quantity;
    }, 0);
  }),

  cartItemCount: computed(() => {
    return state.cart.reduce((total, item) => total + item.quantity, 0);
  }),

  // Actions
  async initialize(config: WidgetConfig) {
    state.config = config;
    api.defaults.baseURL = config.apiUrl;
    api.defaults.headers.common["X-API-Key"] = config.apiKey;

    await this.loadTradelines();
  },

  async loadTradelines() {
    state.loading = true;
    state.error = null;

    try {
      const response = await api.get("/pricing");
      state.tradelines = response.data.data;
    } catch (error: any) {
      state.error = error.response?.data?.error || "Failed to load tradelines";
      console.error("Failed to load tradelines:", error);
    } finally {
      state.loading = false;
    }
  },

  addToCart(tradeline: Tradeline, quantity: number = 1) {
    const existingItem = state.cart.find(
      (item) => item.tradeline.card_id === tradeline.card_id
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      state.cart.push({ tradeline, quantity });
    }

    this.trackClick(tradeline.card_id);
  },

  removeFromCart(cardId: string) {
    const index = state.cart.findIndex(
      (item) => item.tradeline.card_id === cardId
    );
    if (index > -1) {
      state.cart.splice(index, 1);
    }
  },

  updateQuantity(cardId: string, quantity: number) {
    const item = state.cart.find((item) => item.tradeline.card_id === cardId);
    if (item && quantity > 0) {
      item.quantity = quantity;
    }
  },

  clearCart() {
    state.cart = [];
  },

  async trackClick(cardId: string) {
    try {
      await api.post("/track/click", { card_id: cardId });
    } catch (error) {
      console.error("Failed to track click:", error);
    }
  },

  async calculateTotal() {
    try {
      const items = state.cart.map((item) => ({
        card_id: item.tradeline.card_id,
        quantity: item.quantity,
      }));

      const response = await api.post("/calculate", { items });
      return response.data.calculation;
    } catch (error) {
      console.error("Failed to calculate total:", error);
      throw error;
    }
  },
};
```

`/widget/src/components/TradelineList.vue`:

```vue
<template>
  <div class="tradeline-list">
    <div v-if="store.state.loading" class="loading">Loading tradelines...</div>

    <div v-else-if="store.state.error" class="error">
      {{ store.state.error }}
    </div>

    <div v-else class="tradelines-grid">
      <div
        v-for="tradeline in store.state.tradelines"
        :key="tradeline.card_id"
        class="tradeline-card"
      >
        <div class="tradeline-image">
          <img :src="tradeline.image" :alt="tradeline.bank_name" />
        </div>

        <div class="tradeline-details">
          <h3>{{ tradeline.bank_name }}</h3>
          <div class="tradeline-info">
            <div class="info-item">
              <span class="label">Credit Limit:</span>
              <span class="value"
                >${{ tradeline.credit_limit.toLocaleString() }}</span
              >
            </div>
            <div class="info-item">
              <span class="label">Date Opened:</span>
              <span class="value">{{ tradeline.date_opened }}</span>
            </div>
            <div class="info-item" v-if="showPurchaseDeadline">
              <span class="label">Purchase By:</span>
              <span class="value">{{ tradeline.purchase_deadline }}</span>
            </div>
            <div class="info-item" v-if="showStock">
              <span class="label">Stock:</span>
              <span
                class="value"
                :class="{ 'low-stock': tradeline.stock <= 2 }"
              >
                {{ tradeline.stock }} available
              </span>
            </div>
          </div>

          <div class="tradeline-actions">
            <div class="price">${{ tradeline.price }}</div>
            <button
              @click="addToCart(tradeline)"
              :disabled="tradeline.stock === 0"
              class="add-to-cart-btn"
            >
              {{ tradeline.stock === 0 ? "Out of Stock" : "Add to Cart" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { store } from "../store";
import type { Tradeline } from "../types";

const showStock = computed(
  () => store.state.config?.features?.showStock ?? true
);

const showPurchaseDeadline = computed(
  () => store.state.config?.features?.showPurchaseDeadline ?? true
);

const addToCart = (tradeline: Tradeline) => {
  store.addToCart(tradeline);
};
</script>

<style scoped>
.tradeline-list {
  padding: 20px;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
}

.error {
  color: #dc3545;
}

.tradelines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.tradeline-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.tradeline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.tradeline-image {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 10px;
}

.tradeline-image img {
  max-height: 40px;
  max-width: 150px;
}

.tradeline-details {
  padding: 15px;
}

.tradeline-details h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
}

.tradeline-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
  color: #333;
}

.low-stock {
  color: #dc3545;
}

.tradeline-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #28a745;
}

.add-to-cart-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.add-to-cart-btn:hover:not(:disabled) {
  background: #0056b3;
}

.add-to-cart-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
```

**Acceptance Criteria**:

- [ ] Widget initializes with API configuration
- [ ] Displays tradeline list from API
- [ ] Add to cart functionality works
- [ ] Responsive grid layout
- [ ] Loading and error states handled

---

### Task 5.2: Build Widget Entry Point

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 5.1

**Files to Create**:

`/widget/src/main.ts`:

```typescript
import { createApp } from "vue";
import Widget from "./Widget.vue";
import { store } from "./store";
import type { WidgetConfig } from "./types";

// Global function to initialize widget
(window as any).TradelineWidget = {
  init: function (config: WidgetConfig, elementId: string) {
    // Validate configuration
    if (!config.apiKey) {
      console.error("TradelineWidget: API key is required");
      return;
    }

    if (!config.apiUrl) {
      config.apiUrl = "https://api.tradelinerental.com/api/public";
    }

    // Find target element
    const targetElement = document.getElementById(elementId);
    if (!targetElement) {
      console.error(
        `TradelineWidget: Element with id "${elementId}" not found`
      );
      return;
    }

    // Initialize store
    store.initialize(config);

    // Create and mount Vue app
    const app = createApp(Widget);
    app.mount(targetElement);

    return {
      store,
      refresh: () => store.loadTradelines(),
      clearCart: () => store.clearCart(),
    };
  },
};
```

`/widget/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: "./src/main.ts",
      name: "TradelineWidget",
      fileName: "tradeline-widget",
      formats: ["umd"],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        assetFileNames: "tradeline-widget.[ext]",
      },
    },
  },
});
```

`/widget/embed-example.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tradeline Widget Example</title>
  </head>
  <body>
    <h1>My Website</h1>

    <!-- Widget container -->
    <div id="tradeline-widget"></div>

    <!-- Widget script -->
    <script src="./dist/tradeline-widget.umd.js"></script>
    <link rel="stylesheet" href="./dist/tradeline-widget.css" />

    <script>
      // Initialize the widget
      TradelineWidget.init(
        {
          apiKey: "tlm_your_api_key_here",
          apiUrl: "http://localhost:3000/api/public",
          theme: {
            primaryColor: "#007bff",
            secondaryColor: "#6c757d",
          },
          features: {
            showStock: true,
            showPurchaseDeadline: true,
            enableCart: true,
          },
        },
        "tradeline-widget"
      );
    </script>
  </body>
</html>
```

**Commands to Execute**:

```bash
cd widget
npm run build
```

**Acceptance Criteria**:

- [ ] Widget builds to single UMD file
- [ ] CSS is bundled separately
- [ ] Global TradelineWidget object exposed
- [ ] Widget can be embedded with script tag
- [ ] Configuration options work

---

# PHASE 4: Payment & Order Processing (Sprint 7-8)

## Sprint 7: Stripe Integration

### Task 7.1: Implement Stripe Payment Processing

**Priority**: High
**Complexity**: Complex
**Dependencies**: Phase 3

**Commands to Execute**:

```bash
cd backend
npm install stripe
npm install --save-dev @types/stripe
```

**Files to Create**:

`/backend/src/services/PaymentService.ts`:

```typescript
import Stripe from "stripe";
import { prisma } from "./Database";
import { PricingEngine } from "./PricingEngine";
import TradelineSupplyAPI from "./TradelineSupplyAPI";

export class PaymentService {
  private stripe: Stripe;
  private pricingEngine: PricingEngine;
  private tradelineAPI: TradelineSupplyAPI;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    this.pricingEngine = new PricingEngine();
    this.tradelineAPI = new TradelineSupplyAPI(
      process.env.TRADELINE_CONSUMER_KEY!,
      process.env.TRADELINE_CONSUMER_SECRET!
    );
  }

  async createCheckoutSession(
    items: Array<{ card_id: string; quantity: number }>,
    customerEmail: string,
    affiliateId?: string,
    successUrl?: string,
    cancelUrl?: string
  ) {
    // Calculate totals
    const calculation = await this.pricingEngine.calculateOrderTotal(
      items,
      affiliateId
    );

    // Create order in database (pending status)
    const order = await prisma.order.create({
      data: {
        affiliate_id: affiliateId,
        customer_email: customerEmail,
        customer_name: "", // Will be updated after payment
        total_amount: calculation.total,
        commission_amount: calculation.commission,
        status: "PENDING",
        items: {
          create: calculation.items.map((item) => ({
            card_id: item.card_id,
            bank_name: item.bank_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            markup_amount: item.markup_amount,
            total_price: item.total_price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create Stripe checkout session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: calculation.items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${item.bank_name} - Tradeline`,
            description: `Card ID: ${item.card_id}`,
          },
          unit_amount: Math.round(item.unit_price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      customer_email: customerEmail,
      success_url:
        successUrl ||
        `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        order_id: order.id,
        affiliate_id: affiliateId || "",
      },
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { stripe_payment_id: session.id },
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: order.id,
    };
  }

  async handleWebhook(signature: string, payload: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      throw new Error("Invalid webhook signature");
    }

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        source: "stripe",
        event_type: event.type,
        payload: event as any,
        status: "processing",
      },
    });

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "payment_intent.payment_failed":
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const orderId = session.metadata?.order_id;
    if (!orderId) {
      console.error("No order ID in session metadata");
      return;
    }

    try {
      // Update order status
      const order = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "PROCESSING",
          customer_name: session.customer_details?.name || "",
        },
        include: {
          items: true,
        },
      });

      // Create order in TradelineSupply
      const tradelineOrder = await this.tradelineAPI.createOrder({
        id: order.id,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        items: order.items.map((item) => ({
          card_id: item.card_id,
          quantity: item.quantity,
          price: item.unit_price,
          affiliate_id: order.affiliate_id,
        })),
        total: order.total_amount,
        affiliate_id: order.affiliate_id,
        status: "processing",
      });

      // Update order with TradelineSupply order ID
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
        },
      });

      // Update analytics
      if (order.affiliate_id) {
        const today = new Date().toISOString().split("T")[0];
        await prisma.analytics.upsert({
          where: {
            affiliate_id_date: {
              affiliate_id: order.affiliate_id,
              date: new Date(today),
            },
          },
          update: {
            conversions: { increment: 1 },
            revenue: { increment: order.total_amount },
            commission: { increment: order.commission_amount || 0 },
          },
          create: {
            affiliate_id: order.affiliate_id,
            date: new Date(today),
            conversions: 1,
            revenue: order.total_amount,
            commission: order.commission_amount || 0,
          },
        });
      }

      console.log(`Order ${orderId} processed successfully`);
    } catch (error) {
      console.error(`Failed to process order ${orderId}:`, error);

      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const orderId = paymentIntent.metadata?.order_id;
    if (!orderId) return;

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "FAILED" },
    });
  }
}

export default PaymentService;
```

**Acceptance Criteria**:

- [ ] Creates Stripe checkout session
- [ ] Handles webhook events securely
- [ ] Updates order status appropriately
- [ ] Creates order in TradelineSupply
- [ ] Updates affiliate analytics

---

# PHASE 5: Deployment & Production (Sprint 9-10)

## Sprint 9: Docker & Deployment Setup

### Task 9.1: Create Docker Configuration

**Priority**: High
**Complexity**: Moderate
**Dependencies**: All previous phases

**Files to Create**:

`/docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: tradeline
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: tradeline_marketplace
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - tradeline_network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - tradeline_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://tradeline:${DB_PASSWORD}@postgres:5432/tradeline_marketplace
      REDIS_URL: redis://redis:6379
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - tradeline_network
    volumes:
      - ./backend:/app
      - /app/node_modules

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./widget/dist:/usr/share/nginx/html/widget
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - tradeline_network

volumes:
  postgres_data:

networks:
  tradeline_network:
    driver: bridge
```

`/backend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

`/nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    server {
        listen 80;
        server_name api.tradelinerental.com;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 80;
        server_name widget.tradelinerental.com;

        location / {
            root /usr/share/nginx/html/widget;
            try_files $uri $uri/ /index.html;

            # CORS headers for widget
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept";
        }
    }
}
```

**Commands to Execute**:

```bash
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy
```

**Acceptance Criteria**:

- [ ] All services start successfully
- [ ] Database migrations run
- [ ] API accessible via nginx
- [ ] Widget files served correctly
- [ ] Redis connection works

---

## Final Validation Checklist

### Phase 1: Foundation ✓

- [ ] Node.js backend initialized
- [ ] TradelineSupply API integration working
- [ ] OAuth 1.0a authentication implemented
- [ ] Database schema created
- [ ] Redis caching functional

### Phase 2: Business Logic ✓

- [ ] Pricing engine with markup
- [ ] Affiliate management CRUD
- [ ] Public API endpoints
- [ ] Analytics tracking

### Phase 3: Widget ✓

- [ ] Vue.js widget builds
- [ ] Embeddable via script tag
- [ ] Cart functionality
- [ ] API communication

### Phase 4: Payments ✓

- [ ] Stripe checkout integration
- [ ] Order processing
- [ ] Webhook handling
- [ ] Commission tracking

### Phase 5: Deployment ✓

- [ ] Docker configuration
- [ ] Production build
- [ ] Nginx reverse proxy
- [ ] SSL certificates

---

## Commands Summary

```bash
# Development
cd backend && npm run dev
cd widget && npm run dev

# Testing
npm test
npm run lint

# Build
cd backend && npm run build
cd widget && npm run build

# Deploy
docker-compose up -d
docker-compose exec backend npx prisma migrate deploy

# Monitor
docker-compose logs -f backend
docker-compose exec backend npx prisma studio
```

This blueprint provides a complete, AI-consumable specification for building your tradeline marketplace platform. Each task includes specific implementation details, file paths, code skeletons, and validation criteria that an AI assistant can follow step-by-step.
