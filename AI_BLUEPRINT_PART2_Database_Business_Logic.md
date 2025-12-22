# Tradeline Marketplace - AI Development Blueprint (REVISED)

# PART 2: Database & Business Logic

## Sprint 2: Database Setup & Core Business Logic

### Task 2.1: Setup PostgreSQL with Prisma ORM

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 1.2

**Commands to Execute**:

```bash
cd backend
npm install prisma @prisma/client
npm install --save-dev @types/node
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

// Broker/Affiliate model with corrected commission structure
model Broker {
  id                    String    @id @default(uuid())
  name                  String
  business_name         String?
  email                 String    @unique
  phone                 String?
  website               String?

  // Authentication
  api_key               String    @unique
  api_secret            String    // For admin panel access

  // Commission Settings (Admin controlled)
  revenue_share_percent Float     @default(10) // 10-25% of base price

  // Markup Settings (Broker controlled)
  markup_type           MarkupType @default(PERCENTAGE)
  markup_value          Float     @default(0) // Broker's additional markup

  // Account Status
  status                BrokerStatus @default(PENDING)
  approved_by           String?   // Admin who approved
  approved_at           DateTime?

  // Metadata
  notes                 String?   @db.Text
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  // Relations
  orders                Order[]
  analytics             Analytics[]
  payouts               Payout[]
  activity_logs         ActivityLog[]

  @@index([email])
  @@index([api_key])
  @@index([status])
}

model Order {
  id                      String    @id @default(uuid())
  order_number            String    @unique // Human readable order number

  // Broker relationship
  broker_id               String?
  broker                  Broker?   @relation(fields: [broker_id], references: [id])

  // Customer Information
  customer_email          String
  customer_name           String
  customer_phone          String?

  // Payment Information
  stripe_session_id       String?
  stripe_payment_intent   String?
  payment_status          PaymentStatus @default(PENDING)

  // Pricing Breakdown (all amounts in USD cents for precision)
  subtotal_base           Int      // Sum of TradelineSupply prices
  broker_revenue_share    Int      // Total broker's share of our commission
  broker_markup           Int      // Total broker's additional markup
  platform_net_revenue    Int      // What platform keeps after sharing
  total_charged           Int      // What customer paid

  // TradelineSupply Order
  tradeline_order_id      String?  // Order ID from TradelineSupply
  tradeline_order_status  String?  // Status from TradelineSupply

  // Order Status
  status                  OrderStatus @default(PENDING)

  // Timestamps
  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt
  completed_at            DateTime?

  // Relations
  items                   OrderItem[]
  commission_records      CommissionRecord[]
  webhook_logs            WebhookLog[]

  @@index([broker_id])
  @@index([customer_email])
  @@index([status])
  @@index([created_at])
  @@index([order_number])
}

model OrderItem {
  id                    String    @id @default(uuid())
  order_id              String
  order                 Order     @relation(fields: [order_id], references: [id], onDelete: Cascade)

  // Tradeline Information
  card_id               String
  bank_name             String
  credit_limit          Int
  date_opened           String

  // Pricing (in cents)
  quantity              Int       @default(1)
  base_price            Int       // TradelineSupply price per unit
  revenue_share         Int       // Broker's share per unit
  markup                Int       // Broker's markup per unit
  customer_price        Int       // Final price per unit customer sees

  // Totals (quantity * unit prices)
  total_base            Int
  total_revenue_share   Int
  total_markup          Int
  total_customer_price  Int

  created_at            DateTime  @default(now())

  @@index([order_id])
}

// Track commission records for broker payouts
model CommissionRecord {
  id                    String    @id @default(uuid())
  broker_id             String
  broker                Broker    @relation(fields: [broker_id], references: [id])
  order_id              String
  order                 Order     @relation(fields: [order_id], references: [id])

  // Commission Breakdown (in cents)
  revenue_share_amount  Int       // From platform's 50% commission
  markup_amount         Int       // Broker's additional markup
  total_commission      Int       // Total broker earns

  // Payout Status
  payout_status         PayoutStatus @default(PENDING)
  payout_id             String?
  payout                Payout?   @relation(fields: [payout_id], references: [id])

  created_at            DateTime  @default(now())
  paid_at               DateTime?

  @@index([broker_id])
  @@index([payout_status])
  @@index([created_at])
}

// Monthly broker payouts
model Payout {
  id                    String    @id @default(uuid())
  broker_id             String
  broker                Broker    @relation(fields: [broker_id], references: [id])

  // Payout Period
  period_start          DateTime
  period_end            DateTime

  // Amounts (in cents)
  total_revenue_share   Int       // Total from platform commission sharing
  total_markup          Int       // Total from broker's markups
  total_amount          Int       // Total payout amount

  // Payment Details
  payment_method        PaymentMethod @default(ACH)
  payment_details       Json?     // Bank details, etc.
  transaction_id        String?   // External payment reference

  // Status
  status                PayoutStatus @default(PENDING)
  processed_at          DateTime?
  notes                 String?

  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  // Relations
  commission_records    CommissionRecord[]

  @@index([broker_id])
  @@index([status])
  @@index([period_start, period_end])
}

// Analytics tracking for broker dashboards
model Analytics {
  id                    String    @id @default(uuid())
  broker_id             String
  broker                Broker    @relation(fields: [broker_id], references: [id])
  date                  DateTime  @db.Date

  // Widget Metrics
  widget_loads          Int       @default(0)
  unique_visitors       Int       @default(0)

  // Shopping Metrics
  cart_additions        Int       @default(0)
  cart_abandonment      Int       @default(0)

  // Sales Metrics
  orders_count          Int       @default(0)
  total_sales           Int       @default(0) // In cents
  revenue_share_earned  Int       @default(0) // In cents
  markup_earned         Int       @default(0) // In cents

  // Conversion Metrics
  conversion_rate       Float?    // Calculated field
  average_order_value   Float?    // Calculated field

  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  @@unique([broker_id, date])
  @@index([broker_id])
  @@index([date])
}

// Webhook logs for debugging
model WebhookLog {
  id                    String    @id @default(uuid())
  order_id              String?
  order                 Order?    @relation(fields: [order_id], references: [id])

  source                WebhookSource // STRIPE or TRADELINE_SUPPLY
  event_type            String
  payload               Json
  response              Json?
  status                WebhookStatus
  error_message         String?

  created_at            DateTime  @default(now())
  processed_at          DateTime?

  @@index([order_id])
  @@index([source])
  @@index([created_at])
}

// Activity logs for audit trail
model ActivityLog {
  id                    String    @id @default(uuid())
  broker_id             String?
  broker                Broker?   @relation(fields: [broker_id], references: [id])

  action                String    // e.g., "ORDER_CREATED", "SETTINGS_UPDATED"
  entity_type           String?   // e.g., "Order", "Broker"
  entity_id             String?

  metadata              Json?     // Additional context
  ip_address            String?
  user_agent            String?

  created_at            DateTime  @default(now())

  @@index([broker_id])
  @@index([action])
  @@index([created_at])
}

// Cache for expensive operations
model PricingCache {
  id                    String    @id @default(uuid())
  cache_key             String    @unique
  data                  Json
  expires_at            DateTime
  created_at            DateTime  @default(now())

  @@index([cache_key])
  @@index([expires_at])
}

// Admin users for platform management
model Admin {
  id                    String    @id @default(uuid())
  email                 String    @unique
  password_hash         String
  name                  String
  role                  AdminRole @default(STAFF)

  is_active             Boolean   @default(true)
  last_login            DateTime?

  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  @@index([email])
}

// ENUMS

enum MarkupType {
  PERCENTAGE
  FIXED
}

enum BrokerStatus {
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
  CANCELLED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum PaymentMethod {
  ACH
  WIRE
  CHECK
  PAYPAL
  CASH
  MANUAL
}

enum WebhookSource {
  STRIPE
  TRADELINE_SUPPLY
}

enum WebhookStatus {
  RECEIVED
  PROCESSING
  PROCESSED
  FAILED
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
  STAFF
  SUPPORT
}
```

`/backend/src/services/Database.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { config } from "@/config";

class Database {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log:
          config.env === "development"
            ? ["query", "info", "warn", "error"]
            : ["error"],
        errorFormat: config.env === "development" ? "pretty" : "minimal",
      });

      // Middleware to convert cents to dollars for display
      Database.instance.$use(async (params, next) => {
        const result = await next(params);

        // Convert cents to dollars when fetching
        if (
          params.action === "findFirst" ||
          params.action === "findUnique" ||
          params.action === "findMany"
        ) {
          const convertCentsToUsd = (obj: any) => {
            if (!obj) return obj;

            const centsFields = [
              "subtotal_base",
              "broker_revenue_share",
              "broker_markup",
              "platform_net_revenue",
              "total_charged",
              "base_price",
              "revenue_share",
              "markup",
              "customer_price",
              "total_base",
              "total_revenue_share",
              "total_markup",
              "total_customer_price",
              "revenue_share_amount",
              "markup_amount",
              "total_commission",
              "total_amount",
              "total_sales",
              "revenue_share_earned",
              "markup_earned",
            ];

            centsFields.forEach((field) => {
              if (field in obj && typeof obj[field] === "number") {
                obj[`${field}_usd`] = obj[field] / 100;
              }
            });

            return obj;
          };

          if (Array.isArray(result)) {
            return result.map(convertCentsToUsd);
          } else {
            return convertCentsToUsd(result);
          }
        }

        return result;
      });
    }
    return Database.instance;
  }

  public static async connect(): Promise<void> {
    const prisma = Database.getInstance();
    try {
      await prisma.$connect();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  public static async disconnect(): Promise<void> {
    const prisma = Database.getInstance();
    await prisma.$disconnect();
    console.log("Database disconnected");
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      const prisma = Database.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const prisma = Database.getInstance();
export default Database;
```

**Commands to Execute**:

```bash
# Create initial migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio to view database
npx prisma studio
```

**Acceptance Criteria**:

- [ ] Database migrations run successfully
- [ ] Prisma client generates without errors
- [ ] Can connect to PostgreSQL
- [ ] All models have proper relationships
- [ ] Cents/dollars conversion middleware works
- [ ] Commission structure properly modeled

---

### Task 2.2: Implement Redis Caching Service

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
import { config } from "@/config";

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || config.redis.url,
    });

    this.client.on("error", (err) => {
      console.error("Redis Client Error:", err);
      // Don't exit, cache is optional
      this.connected = false;
    });

    this.client.on("connect", () => {
      console.log("✅ Redis cache connected");
      this.connected = true;
    });

    this.client.on("ready", () => {
      this.connected = true;
    });

    this.client.on("end", () => {
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error("Failed to connect to Redis:", error);
        // Cache is optional, don't throw
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  private isConnected(): boolean {
    return this.connected;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;

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

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || config.redis.ttl.pricing;

      await this.client.setEx(key, ttl, serialized);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async flush(): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client.flushAll();
      console.log("Cache flushed");
    } catch (error) {
      console.error("Cache flush error:", error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(
          `Invalidated ${keys.length} cache entries matching ${pattern}`
        );
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  }

  // Cache key generators for consistency
  keys = {
    pricing: (brokerId?: string) =>
      brokerId ? `pricing:broker:${brokerId}` : "pricing:base",

    broker: (brokerId: string) => `broker:${brokerId}`,

    brokerByApiKey: (apiKey: string) => `broker:apikey:${apiKey}`,

    order: (orderId: string) => `order:${orderId}`,

    analytics: (brokerId: string, date: string) =>
      `analytics:${brokerId}:${date}`,
  };
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

---

### Task 2.3: Implement Pricing Engine with Corrected Commission Model

**Priority**: High
**Complexity**: Complex
**Dependencies**: Task 2.2

**Files to Create**:

`/backend/src/services/PricingEngine.ts`:

```typescript
import { Broker, Prisma } from "@prisma/client";
import { prisma } from "./Database";
import { getCacheService } from "./Cache";
import { getTradelineSupplyAPI } from "./TradelineSupplyAPI";
import {
  Tradeline,
  TradelineWithPricing,
  OrderCalculation,
  CommissionBreakdown,
} from "@/types";
import { config } from "@/config";

export class PricingEngine {
  private cache = getCacheService();
  private api = getTradelineSupplyAPI();

  /**
   * Calculate pricing for a broker with revenue share and markup
   * Remember: TradelineSupply prices already include our 50% commission
   */
  async getPricingForBroker(
    brokerId?: string
  ): Promise<TradelineWithPricing[]> {
    // Try cache first
    const cacheKey = this.cache.keys.pricing(brokerId);
    const cached = await this.cache.get<TradelineWithPricing[]>(cacheKey);
    if (cached) {
      console.log(`Returning cached pricing for ${brokerId || "direct"}`);
      return cached;
    }

    // Get base pricing from TradelineSupply
    const baseTradelines = await this.api.getPricing();

    // Get broker if ID provided
    let broker: Broker | null = null;
    if (brokerId) {
      broker = await prisma.broker.findUnique({
        where: { id: brokerId },
      });

      if (!broker) {
        throw new Error(`Broker ${brokerId} not found`);
      }

      if (broker.status !== "ACTIVE") {
        throw new Error(`Broker ${brokerId} is not active`);
      }
    }

    // Apply pricing calculations
    const pricedTradelines = baseTradelines.map((tradeline) =>
      this.calculateTradelinePricing(tradeline, broker)
    );

    // Cache the results
    await this.cache.set(cacheKey, pricedTradelines, config.redis.ttl.pricing);

    return pricedTradelines;
  }

  /**
   * Calculate pricing for a single tradeline
   */
  private calculateTradelinePricing(
    tradeline: Tradeline,
    broker: Broker | null
  ): TradelineWithPricing {
    const basePrice = tradeline.price; // Already includes our 50% commission

    if (!broker) {
      // Direct sale (no broker)
      return {
        ...tradeline,
        base_price: basePrice,
        broker_revenue_share: 0,
        broker_markup: 0,
        customer_price: basePrice,
        platform_net_revenue: basePrice * 0.5, // We keep all 50%
        broker_total_earnings: 0,
      };
    }

    // Calculate broker's revenue share (from our 50% commission)
    const brokerRevenueShare = basePrice * (broker.revenue_share_percent / 100);

    // Calculate broker's additional markup
    let brokerMarkup = 0;
    if (broker.markup_type === "PERCENTAGE") {
      brokerMarkup = basePrice * (broker.markup_value / 100);
    } else {
      brokerMarkup = broker.markup_value;
    }

    // Calculate final customer price
    const customerPrice = basePrice + brokerMarkup;

    // Platform's net revenue (our 50% minus broker's share)
    const platformNetRevenue = basePrice * 0.5 - brokerRevenueShare;

    return {
      ...tradeline,
      base_price: basePrice,
      broker_revenue_share: Math.round(brokerRevenueShare * 100) / 100,
      broker_markup: Math.round(brokerMarkup * 100) / 100,
      customer_price: Math.round(customerPrice * 100) / 100,
      platform_net_revenue: Math.round(platformNetRevenue * 100) / 100,
      broker_total_earnings:
        Math.round((brokerRevenueShare + brokerMarkup) * 100) / 100,
    };
  }

  /**
   * Calculate order totals with commission breakdown
   */
  async calculateOrderTotal(
    items: Array<{ card_id: string; quantity: number }>,
    brokerId?: string
  ): Promise<OrderCalculation> {
    // Get pricing for this broker
    const pricing = await this.getPricingForBroker(brokerId);
    const pricingMap = new Map(pricing.map((p) => [p.card_id, p]));

    // Calculate totals
    let subtotalBase = 0;
    let totalRevenueShare = 0;
    let totalBrokerMarkup = 0;
    let totalCustomerPrice = 0;

    const calculatedItems = items.map((item) => {
      const tradeline = pricingMap.get(item.card_id);
      if (!tradeline) {
        throw new Error(`Tradeline ${item.card_id} not found or out of stock`);
      }

      if (tradeline.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${tradeline.bank_name}. Available: ${tradeline.stock}`
        );
      }

      const itemBase = tradeline.base_price * item.quantity;
      const itemRevenueShare = tradeline.broker_revenue_share * item.quantity;
      const itemMarkup = tradeline.broker_markup * item.quantity;
      const itemCustomerPrice = tradeline.customer_price * item.quantity;

      subtotalBase += itemBase;
      totalRevenueShare += itemRevenueShare;
      totalBrokerMarkup += itemMarkup;
      totalCustomerPrice += itemCustomerPrice;

      return {
        card_id: item.card_id,
        bank_name: tradeline.bank_name,
        quantity: item.quantity,
        base_price: tradeline.base_price,
        broker_revenue_share: tradeline.broker_revenue_share,
        broker_markup: tradeline.broker_markup,
        customer_price: tradeline.customer_price,
      };
    });

    // Calculate platform's net revenue
    const totalPlatformRevenue = subtotalBase * 0.5 - totalRevenueShare;

    return {
      items: calculatedItems,
      subtotal_base: Math.round(subtotalBase * 100) / 100,
      total_revenue_share: Math.round(totalRevenueShare * 100) / 100,
      total_broker_markup: Math.round(totalBrokerMarkup * 100) / 100,
      total_customer_price: Math.round(totalCustomerPrice * 100) / 100,
      total_platform_revenue: Math.round(totalPlatformRevenue * 100) / 100,
      total_broker_earnings:
        Math.round((totalRevenueShare + totalBrokerMarkup) * 100) / 100,
    };
  }

  /**
   * Get commission breakdown for a specific order amount
   */
  getCommissionBreakdown(
    basePrice: number,
    broker: Broker | null
  ): CommissionBreakdown {
    // TradelineSupply gets their 50% (their actual cost)
    const tradelineSupplyGets = basePrice * 0.5;

    // We get the other 50%
    const platformGrossCommission = basePrice * 0.5;

    if (!broker) {
      return {
        tradeline_supply_gets: tradelineSupplyGets,
        platform_gross_commission: platformGrossCommission,
        broker_revenue_share: 0,
        platform_net_commission: platformGrossCommission,
        broker_markup: 0,
        broker_total_earnings: 0,
      };
    }

    // Broker's share of our commission
    const brokerRevenueShare = basePrice * (broker.revenue_share_percent / 100);

    // Broker's additional markup
    let brokerMarkup = 0;
    if (broker.markup_type === "PERCENTAGE") {
      brokerMarkup = basePrice * (broker.markup_value / 100);
    } else {
      brokerMarkup = broker.markup_value;
    }

    // What we keep after sharing
    const platformNetCommission = platformGrossCommission - brokerRevenueShare;

    return {
      tradeline_supply_gets: tradelineSupplyGets,
      platform_gross_commission: platformGrossCommission,
      broker_revenue_share: brokerRevenueShare,
      platform_net_commission: platformNetCommission,
      broker_markup: brokerMarkup,
      broker_total_earnings: brokerRevenueShare + brokerMarkup,
    };
  }

  /**
   * Invalidate pricing cache for a broker
   */
  async invalidateCache(brokerId?: string): Promise<void> {
    if (brokerId) {
      await this.cache.delete(this.cache.keys.pricing(brokerId));
      console.log(`Invalidated pricing cache for broker ${brokerId}`);
    } else {
      await this.cache.invalidatePattern("pricing:*");
      console.log("Invalidated all pricing caches");
    }
  }

  /**
   * Convert USD to cents for database storage
   */
  static usdToCents(usd: number): number {
    return Math.round(usd * 100);
  }

  /**
   * Convert cents to USD for display
   */
  static centsToUsd(cents: number): number {
    return cents / 100;
  }
}

// Singleton instance
let engineInstance: PricingEngine | null = null;

export function getPricingEngine(): PricingEngine {
  if (!engineInstance) {
    engineInstance = new PricingEngine();
  }
  return engineInstance;
}

export default PricingEngine;
```

---

### Task 2.4: Create Broker Management Service

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 2.3

**Files to Create**:

`/backend/src/services/BrokerService.ts`:

```typescript
import { Broker, BrokerStatus, Prisma } from "@prisma/client";
import { prisma } from "./Database";
import { getCacheService } from "./Cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "@/config";

export class BrokerService {
  private cache = getCacheService();

  /**
   * Generate secure API key for broker
   */
  private generateApiKey(): string {
    return `tlm_${crypto.randomBytes(32).toString("hex")}`;
  }

  /**
   * Generate secure API secret for broker portal access
   */
  private async generateApiSecret(): Promise<{
    plain: string;
    hashed: string;
  }> {
    const plain = crypto.randomBytes(16).toString("hex");
    const hashed = await bcrypt.hash(plain, 10);
    return { plain, hashed };
  }

  /**
   * Create a new broker account
   */
  async createBroker(data: {
    name: string;
    business_name?: string;
    email: string;
    phone?: string;
    website?: string;
    revenue_share_percent?: number;
    notes?: string;
  }): Promise<{ broker: Broker; api_secret: string }> {
    // Validate revenue share is within allowed range
    const revenueShare =
      data.revenue_share_percent || config.commission.defaultBrokerSharePercent;
    if (
      revenueShare < config.commission.minBrokerSharePercent ||
      revenueShare > config.commission.maxBrokerSharePercent
    ) {
      throw new Error(
        `Revenue share must be between ${config.commission.minBrokerSharePercent}% and ${config.commission.maxBrokerSharePercent}%`
      );
    }

    // Check if email already exists
    const existing = await prisma.broker.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new Error("A broker with this email already exists");
    }

    // Generate credentials
    const apiKey = this.generateApiKey();
    const apiSecret = await this.generateApiSecret();

    // Create broker
    const broker = await prisma.broker.create({
      data: {
        name: data.name,
        business_name: data.business_name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        api_key: apiKey,
        api_secret: apiSecret.hashed,
        revenue_share_percent: revenueShare,
        status: "PENDING",
        notes: data.notes,
      },
    });

    // Log activity
    await this.logActivity(broker.id, "BROKER_CREATED", broker.id);

    return {
      broker,
      api_secret: apiSecret.plain, // Return plain secret only once
    };
  }

  /**
   * Update broker settings
   */
  async updateBroker(
    brokerId: string,
    updates: Partial<{
      name: string;
      business_name: string;
      phone: string;
      website: string;
      revenue_share_percent: number;
      markup_type: "PERCENTAGE" | "FIXED";
      markup_value: number;
      status: BrokerStatus;
      notes: string;
    }>,
    adminId?: string
  ): Promise<Broker> {
    // Validate revenue share if provided
    if (updates.revenue_share_percent !== undefined) {
      if (
        updates.revenue_share_percent <
          config.commission.minBrokerSharePercent ||
        updates.revenue_share_percent > config.commission.maxBrokerSharePercent
      ) {
        throw new Error(
          `Revenue share must be between ${config.commission.minBrokerSharePercent}% and ${config.commission.maxBrokerSharePercent}%`
        );
      }
    }

    // Update broker
    const broker = await prisma.broker.update({
      where: { id: brokerId },
      data: updates,
    });

    // Clear cache
    await this.cache.delete(this.cache.keys.broker(brokerId));
    await this.cache.delete(this.cache.keys.brokerByApiKey(broker.api_key));

    // Invalidate pricing cache if commission settings changed
    if (
      updates.revenue_share_percent !== undefined ||
      updates.markup_type !== undefined ||
      updates.markup_value !== undefined
    ) {
      const { getPricingEngine } = await import("./PricingEngine");
      await getPricingEngine().invalidateCache(brokerId);
    }

    // Log activity
    await this.logActivity(brokerId, "BROKER_UPDATED", brokerId, { updates });

    return broker;
  }

  /**
   * Approve a pending broker
   */
  async approveBroker(brokerId: string, adminId: string): Promise<Broker> {
    const broker = await prisma.broker.update({
      where: { id: brokerId },
      data: {
        status: "ACTIVE",
        approved_by: adminId,
        approved_at: new Date(),
      },
    });

    await this.logActivity(brokerId, "BROKER_APPROVED", brokerId, {
      admin_id: adminId,
    });

    return broker;
  }

  /**
   * Get broker by API key (with caching)
   */
  async getBrokerByApiKey(apiKey: string): Promise<Broker | null> {
    // Check cache
    const cacheKey = this.cache.keys.brokerByApiKey(apiKey);
    const cached = await this.cache.get<Broker>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const broker = await prisma.broker.findUnique({
      where: { api_key: apiKey },
    });

    if (broker) {
      // Cache for 1 hour
      await this.cache.set(cacheKey, broker, config.redis.ttl.broker);
    }

    return broker;
  }

  /**
   * Get broker dashboard statistics
   */
  async getBrokerStats(
    brokerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total_orders: number;
    total_revenue: number;
    total_commission: number;
    revenue_share_earned: number;
    markup_earned: number;
    pending_payout: number;
    conversion_rate: number;
  }> {
    const where: Prisma.OrderWhereInput = {
      broker_id: brokerId,
      status: "COMPLETED",
    };

    if (startDate && endDate) {
      where.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get order statistics
    const stats = await prisma.order.aggregate({
      where,
      _count: true,
      _sum: {
        total_charged: true,
        broker_revenue_share: true,
        broker_markup: true,
      },
    });

    // Get pending commission
    const pendingCommission = await prisma.commissionRecord.aggregate({
      where: {
        broker_id: brokerId,
        payout_status: "PENDING",
      },
      _sum: {
        total_commission: true,
      },
    });

    // Get analytics for conversion rate
    const analyticsWhere: Prisma.AnalyticsWhereInput = {
      broker_id: brokerId,
    };

    if (startDate && endDate) {
      analyticsWhere.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const analytics = await prisma.analytics.aggregate({
      where: analyticsWhere,
      _sum: {
        widget_loads: true,
        orders_count: true,
      },
    });

    const conversionRate = analytics._sum.widget_loads
      ? (analytics._sum.orders_count! / analytics._sum.widget_loads) * 100
      : 0;

    return {
      total_orders: stats._count,
      total_revenue: PricingEngine.centsToUsd(stats._sum.total_charged || 0),
      total_commission: PricingEngine.centsToUsd(
        (stats._sum.broker_revenue_share || 0) + (stats._sum.broker_markup || 0)
      ),
      revenue_share_earned: PricingEngine.centsToUsd(
        stats._sum.broker_revenue_share || 0
      ),
      markup_earned: PricingEngine.centsToUsd(stats._sum.broker_markup || 0),
      pending_payout: PricingEngine.centsToUsd(
        pendingCommission._sum.total_commission || 0
      ),
      conversion_rate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Log broker activity
   */
  private async logActivity(
    brokerId: string | null,
    action: string,
    entityId?: string,
    metadata?: any
  ): Promise<void> {
    await prisma.activityLog.create({
      data: {
        broker_id: brokerId,
        action,
        entity_type: "Broker",
        entity_id: entityId,
        metadata,
      },
    });
  }
}

// Singleton instance
let serviceInstance: BrokerService | null = null;

export function getBrokerService(): BrokerService {
  if (!serviceInstance) {
    serviceInstance = new BrokerService();
  }
  return serviceInstance;
}

export default BrokerService;
```

**Commands to Execute**:

```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

**Acceptance Criteria**:

- [ ] Database schema correctly models commission structure
- [ ] Pricing engine calculates correct revenue shares
- [ ] Broker service manages broker lifecycle
- [ ] Caching works for performance
- [ ] Commission breakdown is accurate
- [ ] All monetary values handled in cents internally

**Validation Commands**:

```bash
# Run migrations
npm run migrate

# Open Prisma Studio to inspect database
npm run prisma:studio

# Run tests
npm test
```

---

This completes Part 2: Database & Business Logic. The key changes include:

1. Correct commission model where TradelineSupply prices include 50% markup
2. Brokers get 10-25% of base price as revenue share
3. Brokers can add their own markup on top
4. All monetary values stored in cents for precision
5. Proper caching strategy

Should I continue with Part 3: API Endpoints & Widget?
