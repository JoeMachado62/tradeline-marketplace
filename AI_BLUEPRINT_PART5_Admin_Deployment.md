# Tradeline Marketplace - AI Development Blueprint (REVISED)

# PART 5: Admin Dashboard & Production Deployment

## Sprint 6: Admin Dashboard & Broker Portal

### Task 6.1: Create Admin Authentication System

**Priority**: High
**Complexity**: Simple
**Dependencies**: Part 4 completed

**Files to Create**:

`/backend/src/services/AuthService.ts`:

```typescript
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Admin, Broker } from "@prisma/client";
import { prisma } from "./Database";
import { config } from "@/config";

export class AuthService {
  /**
   * Generate JWT token
   */
  private generateToken(payload: any, expiresIn?: string): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn || config.jwt.expiry,
    });
  }

  /**
   * Admin login
   */
  async adminLogin(
    email: string,
    password: string
  ): Promise<{
    admin: Partial<Admin>;
    token: string;
  }> {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.is_active) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { last_login: new Date() },
    });

    // Generate token
    const token = this.generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "admin",
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    };
  }

  /**
   * Broker portal login
   */
  async brokerLogin(
    email: string,
    apiSecret: string
  ): Promise<{
    broker: Partial<Broker>;
    token: string;
  }> {
    const broker = await prisma.broker.findUnique({
      where: { email },
    });

    if (!broker || broker.status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(apiSecret, broker.api_secret);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Generate token
    const token = this.generateToken({
      id: broker.id,
      email: broker.email,
      type: "broker",
    });

    return {
      broker: {
        id: broker.id,
        email: broker.email,
        name: broker.name,
        business_name: broker.business_name,
        api_key: broker.api_key,
        revenue_share_percent: broker.revenue_share_percent,
        markup_type: broker.markup_type,
        markup_value: broker.markup_value,
      },
      token,
    };
  }

  /**
   * Create initial admin account
   */
  async createInitialAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tradelinerental.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

    // Check if admin exists
    const existing = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log("Admin account already exists");
      return;
    }

    // Create admin
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        name: "System Admin",
        role: "SUPER_ADMIN",
      },
    });

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Initial admin account created:
Email: ${adminEmail}
Password: ${adminPassword}
⚠️  CHANGE THIS PASSWORD IMMEDIATELY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
  }

  /**
   * Change admin password
   */
  async changeAdminPassword(
    adminId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new Error("Admin not found");
    }

    const isValid = await bcrypt.compare(oldPassword, admin.password_hash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: adminId },
      data: { password_hash: newPasswordHash },
    });
  }

  /**
   * Reset broker API secret
   */
  async resetBrokerSecret(brokerId: string): Promise<string> {
    const newSecret = crypto.randomBytes(16).toString("hex");
    const hashedSecret = await bcrypt.hash(newSecret, 10);

    await prisma.broker.update({
      where: { id: brokerId },
      data: { api_secret: hashedSecret },
    });

    return newSecret;
  }
}

// Singleton instance
let authInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authInstance) {
    authInstance = new AuthService();
  }
  return authInstance;
}

export default AuthService;
```

---

### Task 6.2: Implement Admin API Routes

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 6.1

**Files to Create**:

`/backend/src/routes/admin.ts`:

```typescript
import { Router, Request, Response } from "express";
import { body, query } from "express-validator";
import { authenticateAdmin } from "@/middleware/auth";
import { validate } from "@/middleware/validation";
import { getAuthService } from "@/services/AuthService";
import { getPayoutService } from "@/services/PayoutService";
import { prisma } from "@/services/Database";
import { PricingEngine } from "@/services/PricingEngine";
import { config } from "@/config";

const router = Router();
const authService = getAuthService();
const payoutService = getPayoutService();

/**
 * POST /api/admin/login
 * Admin authentication
 */
router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await authService.adminLogin(email, password);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(401).json({
        error: error.message || "Login failed",
        code: "LOGIN_FAILED",
      });
    }
  }
);

/**
 * GET /api/admin/dashboard
 * Get admin dashboard statistics
 */
router.get(
  "/dashboard",
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get date ranges
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      // Get statistics
      const [
        totalBrokers,
        activeBrokers,
        monthlyOrders,
        lastMonthOrders,
        pendingPayouts,
        monthlyRevenue,
        lastMonthRevenue,
      ] = await Promise.all([
        // Total brokers
        prisma.broker.count(),

        // Active brokers
        prisma.broker.count({
          where: { status: "ACTIVE" },
        }),

        // This month's orders
        prisma.order.count({
          where: {
            status: "COMPLETED",
            created_at: { gte: startOfMonth },
          },
        }),

        // Last month's orders
        prisma.order.count({
          where: {
            status: "COMPLETED",
            created_at: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
          },
        }),

        // Pending payouts
        prisma.payout.count({
          where: { status: "PENDING" },
        }),

        // This month's revenue
        prisma.order.aggregate({
          where: {
            status: "COMPLETED",
            created_at: { gte: startOfMonth },
          },
          _sum: {
            platform_net_revenue: true,
            total_charged: true,
          },
        }),

        // Last month's revenue
        prisma.order.aggregate({
          where: {
            status: "COMPLETED",
            created_at: {
              gte: startOfLastMonth,
              lte: endOfLastMonth,
            },
          },
          _sum: {
            platform_net_revenue: true,
            total_charged: true,
          },
        }),
      ]);

      // Calculate growth rates
      const orderGrowth =
        lastMonthOrders > 0
          ? ((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100
          : 0;

      const revenueGrowth =
        (lastMonthRevenue._sum.platform_net_revenue || 0) > 0
          ? ((monthlyRevenue._sum.platform_net_revenue! -
              lastMonthRevenue._sum.platform_net_revenue!) /
              lastMonthRevenue._sum.platform_net_revenue!) *
            100
          : 0;

      // Get recent orders
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { created_at: "desc" },
        include: {
          broker: {
            select: {
              name: true,
              business_name: true,
            },
          },
        },
      });

      // Get top performing brokers
      const topBrokers = await prisma.order.groupBy({
        by: ["broker_id"],
        where: {
          broker_id: { not: null },
          status: "COMPLETED",
          created_at: { gte: startOfMonth },
        },
        _sum: {
          broker_revenue_share: true,
          broker_markup: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            broker_revenue_share: "desc",
          },
        },
        take: 5,
      });

      // Get broker details for top performers
      const topBrokerDetails = await Promise.all(
        topBrokers.map(async (broker) => {
          const details = await prisma.broker.findUnique({
            where: { id: broker.broker_id! },
            select: {
              name: true,
              business_name: true,
            },
          });
          return {
            ...details,
            orders: broker._count,
            commission: PricingEngine.centsToUsd(
              (broker._sum.broker_revenue_share || 0) +
                (broker._sum.broker_markup || 0)
            ),
          };
        })
      );

      res.json({
        success: true,
        stats: {
          brokers: {
            total: totalBrokers,
            active: activeBrokers,
          },
          orders: {
            this_month: monthlyOrders,
            last_month: lastMonthOrders,
            growth: Math.round(orderGrowth * 100) / 100,
          },
          revenue: {
            this_month: PricingEngine.centsToUsd(
              monthlyRevenue._sum.platform_net_revenue || 0
            ),
            total_sales: PricingEngine.centsToUsd(
              monthlyRevenue._sum.total_charged || 0
            ),
            last_month: PricingEngine.centsToUsd(
              lastMonthRevenue._sum.platform_net_revenue || 0
            ),
            growth: Math.round(revenueGrowth * 100) / 100,
          },
          payouts: {
            pending: pendingPayouts,
          },
        },
        recent_orders: recentOrders.map((order) => ({
          order_number: order.order_number,
          broker: order.broker?.name || "Direct",
          total: PricingEngine.centsToUsd(order.total_charged),
          status: order.status,
          created_at: order.created_at,
        })),
        top_brokers: topBrokerDetails,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        code: "DASHBOARD_ERROR",
      });
    }
  }
);

/**
 * POST /api/admin/payouts/create
 * Create monthly payouts for all brokers
 */
router.post(
  "/payouts/create",
  authenticateAdmin,
  validate([
    body("year").isInt({ min: 2024, max: 2050 }),
    body("month").isInt({ min: 1, max: 12 }),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { year, month } = req.body;

      // Get all active brokers with pending commissions
      const brokers = await prisma.broker.findMany({
        where: {
          status: "ACTIVE",
          commission_records: {
            some: {
              payout_status: "PENDING",
            },
          },
        },
      });

      const payouts = [];
      const errors = [];

      for (const broker of brokers) {
        try {
          const payout = await payoutService.createMonthlyPayout(
            broker.id,
            year,
            month
          );
          payouts.push({
            broker: broker.name,
            amount: PricingEngine.centsToUsd(payout.total_amount),
            id: payout.id,
          });
        } catch (error: any) {
          errors.push({
            broker: broker.name,
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        created: payouts.length,
        payouts,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Create payouts error:", error);
      res.status(500).json({
        error: error.message || "Failed to create payouts",
        code: "CREATE_PAYOUTS_ERROR",
      });
    }
  }
);

/**
 * GET /api/admin/payouts/pending
 * Get all pending payouts
 */
router.get(
  "/payouts/pending",
  authenticateAdmin,
  async (req: Request, res: Response) => {
    try {
      const payouts = await payoutService.getPendingPayouts();

      res.json({
        success: true,
        payouts,
        total: payouts.length,
        total_amount: payouts.reduce((sum, p) => sum + p.total_amount_usd, 0),
      });
    } catch (error) {
      console.error("Get pending payouts error:", error);
      res.status(500).json({
        error: "Failed to fetch pending payouts",
        code: "FETCH_PAYOUTS_ERROR",
      });
    }
  }
);

/**
 * POST /api/admin/payouts/:id/process
 * Mark payout as processed
 */
router.post(
  "/payouts/:id/process",
  authenticateAdmin,
  validate([body("transaction_id").notEmpty(), body("notes").optional()]),
  async (req: Request, res: Response) => {
    try {
      const { transaction_id, notes } = req.body;

      const payout = await payoutService.processPayout(
        req.params.id,
        transaction_id,
        notes
      );

      res.json({
        success: true,
        payout: {
          id: payout.id,
          amount: PricingEngine.centsToUsd(payout.total_amount),
          status: payout.status,
        },
        message: "Payout processed successfully",
      });
    } catch (error: any) {
      console.error("Process payout error:", error);
      res.status(500).json({
        error: error.message || "Failed to process payout",
        code: "PROCESS_PAYOUT_ERROR",
      });
    }
  }
);

/**
 * GET /api/admin/reports/revenue
 * Get revenue report
 */
router.get(
  "/reports/revenue",
  authenticateAdmin,
  validate([query("start_date").isISO8601(), query("end_date").isISO8601()]),
  async (req: Request, res: Response) => {
    try {
      const startDate = new Date(req.query.start_date as string);
      const endDate = new Date(req.query.end_date as string);

      // Get orders in date range
      const orders = await prisma.order.findMany({
        where: {
          status: "COMPLETED",
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          broker: {
            select: {
              name: true,
              revenue_share_percent: true,
            },
          },
        },
      });

      // Calculate totals
      const totals = orders.reduce(
        (acc, order) => ({
          gross_sales: acc.gross_sales + order.total_charged,
          tradeline_costs: acc.tradeline_costs + order.subtotal_base,
          broker_revenue_share:
            acc.broker_revenue_share + order.broker_revenue_share,
          broker_markup: acc.broker_markup + order.broker_markup,
          platform_revenue: acc.platform_revenue + order.platform_net_revenue,
        }),
        {
          gross_sales: 0,
          tradeline_costs: 0,
          broker_revenue_share: 0,
          broker_markup: 0,
          platform_revenue: 0,
        }
      );

      // Group by broker
      const byBroker = orders.reduce((acc, order) => {
        const brokerId = order.broker_id || "direct";
        const brokerName = order.broker?.name || "Direct Sales";

        if (!acc[brokerId]) {
          acc[brokerId] = {
            name: brokerName,
            orders: 0,
            gross_sales: 0,
            revenue_share: 0,
            markup: 0,
            platform_revenue: 0,
          };
        }

        acc[brokerId].orders += 1;
        acc[brokerId].gross_sales += order.total_charged;
        acc[brokerId].revenue_share += order.broker_revenue_share;
        acc[brokerId].markup += order.broker_markup;
        acc[brokerId].platform_revenue += order.platform_net_revenue;

        return acc;
      }, {} as Record<string, any>);

      res.json({
        success: true,
        period: {
          start: startDate,
          end: endDate,
        },
        summary: {
          total_orders: orders.length,
          gross_sales: PricingEngine.centsToUsd(totals.gross_sales),
          tradeline_costs: PricingEngine.centsToUsd(totals.tradeline_costs / 2), // 50% of base
          broker_commissions: PricingEngine.centsToUsd(
            totals.broker_revenue_share + totals.broker_markup
          ),
          platform_revenue: PricingEngine.centsToUsd(totals.platform_revenue),
          average_order: PricingEngine.centsToUsd(
            orders.length > 0 ? totals.gross_sales / orders.length : 0
          ),
        },
        by_broker: Object.values(byBroker).map((b) => ({
          ...b,
          gross_sales: PricingEngine.centsToUsd(b.gross_sales),
          revenue_share: PricingEngine.centsToUsd(b.revenue_share),
          markup: PricingEngine.centsToUsd(b.markup),
          platform_revenue: PricingEngine.centsToUsd(b.platform_revenue),
        })),
      });
    } catch (error) {
      console.error("Revenue report error:", error);
      res.status(500).json({
        error: "Failed to generate revenue report",
        code: "REVENUE_REPORT_ERROR",
      });
    }
  }
);

export default router;
```

---

### Task 6.3: Create Broker Portal Routes

**Priority**: High
**Complexity**: Moderate
**Dependencies**: Task 6.2

**Files to Create**:

`/backend/src/routes/portal.ts`:

```typescript
import { Router, Request, Response } from "express";
import { body, query } from "express-validator";
import { validate } from "@/middleware/validation";
import { getAuthService } from "@/services/AuthService";
import { getBrokerService } from "@/services/BrokerService";
import { getOrderService } from "@/services/OrderService";
import { getPayoutService } from "@/services/PayoutService";
import { prisma } from "@/services/Database";
import jwt from "jsonwebtoken";
import { config } from "@/config";

const router = Router();
const authService = getAuthService();
const brokerService = getBrokerService();
const orderService = getOrderService();
const payoutService = getPayoutService();

// Middleware to authenticate broker portal access
const authenticateBrokerPortal = async (
  req: Request,
  res: Response,
  next: Function
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization required",
        code: "MISSING_AUTH",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== "broker") {
        return res.status(403).json({
          error: "Broker access required",
          code: "INSUFFICIENT_PRIVILEGES",
        });
      }

      req.broker = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    console.error("Broker portal auth error:", error);
    res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * POST /api/portal/login
 * Broker portal login
 */
router.post(
  "/login",
  validate([
    body("email").isEmail().normalizeEmail(),
    body("api_secret").notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, api_secret } = req.body;
      const result = await authService.brokerLogin(email, api_secret);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      res.status(401).json({
        error: error.message || "Login failed",
        code: "LOGIN_FAILED",
      });
    }
  }
);

/**
 * GET /api/portal/dashboard
 * Get broker dashboard
 */
router.get(
  "/dashboard",
  authenticateBrokerPortal,
  async (req: Request, res: Response) => {
    try {
      const brokerId = req.broker.id;

      // Get current month stats
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      // Get statistics
      const [
        currentStats,
        lastMonthStats,
        pendingCommissions,
        recentOrders,
        widgetAnalytics,
      ] = await Promise.all([
        // Current month stats
        brokerService.getBrokerStats(brokerId, startOfMonth, today),

        // Last month stats
        brokerService.getBrokerStats(
          brokerId,
          startOfLastMonth,
          endOfLastMonth
        ),

        // Pending commissions
        prisma.commissionRecord.aggregate({
          where: {
            broker_id: brokerId,
            payout_status: "PENDING",
          },
          _sum: {
            total_commission: true,
          },
          _count: true,
        }),

        // Recent orders
        prisma.order.findMany({
          where: { broker_id: brokerId },
          take: 10,
          orderBy: { created_at: "desc" },
          include: {
            items: true,
          },
        }),

        // Widget analytics (last 7 days)
        prisma.analytics.findMany({
          where: {
            broker_id: brokerId,
            date: {
              gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { date: "asc" },
        }),
      ]);

      // Calculate growth
      const revenueGrowth =
        lastMonthStats.total_revenue > 0
          ? ((currentStats.total_revenue - lastMonthStats.total_revenue) /
              lastMonthStats.total_revenue) *
            100
          : 0;

      res.json({
        success: true,
        current_month: {
          ...currentStats,
          month: today.toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
        },
        last_month: {
          ...lastMonthStats,
          month: startOfLastMonth.toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
        },
        growth: {
          revenue: Math.round(revenueGrowth * 100) / 100,
        },
        pending_payout: {
          amount: PricingEngine.centsToUsd(
            pendingCommissions._sum.total_commission || 0
          ),
          orders: pendingCommissions._count,
        },
        recent_orders: recentOrders.map((order) => ({
          order_number: order.order_number,
          date: order.created_at,
          customer: order.customer_email,
          items: order.items.length,
          total: PricingEngine.centsToUsd(order.total_charged),
          commission: PricingEngine.centsToUsd(
            order.broker_revenue_share + order.broker_markup
          ),
          status: order.status,
        })),
        widget_analytics: widgetAnalytics.map((day) => ({
          date: day.date,
          views: day.widget_loads,
          clicks: day.cart_additions,
          orders: day.orders_count,
          conversion:
            day.widget_loads > 0
              ? ((day.orders_count / day.widget_loads) * 100).toFixed(2)
              : 0,
        })),
      });
    } catch (error) {
      console.error("Broker dashboard error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        code: "DASHBOARD_ERROR",
      });
    }
  }
);

/**
 * PATCH /api/portal/settings
 * Update broker settings (markup only)
 */
router.patch(
  "/settings",
  authenticateBrokerPortal,
  validate([
    body("markup_type").optional().isIn(["PERCENTAGE", "FIXED"]),
    body("markup_value").optional().isFloat({ min: 0 }),
  ]),
  async (req: Request, res: Response) => {
    try {
      const brokerId = req.broker.id;
      const { markup_type, markup_value } = req.body;

      // Brokers can only update their markup, not revenue share
      const updates: any = {};
      if (markup_type !== undefined) updates.markup_type = markup_type;
      if (markup_value !== undefined) updates.markup_value = markup_value;

      const broker = await brokerService.updateBroker(brokerId, updates);

      res.json({
        success: true,
        settings: {
          markup_type: broker.markup_type,
          markup_value: broker.markup_value,
          revenue_share_percent: broker.revenue_share_percent, // Read-only
        },
        message: "Settings updated successfully",
      });
    } catch (error: any) {
      console.error("Update settings error:", error);
      res.status(500).json({
        error: error.message || "Failed to update settings",
        code: "UPDATE_SETTINGS_ERROR",
      });
    }
  }
);

/**
 * GET /api/portal/orders
 * Get broker's orders
 */
router.get(
  "/orders",
  authenticateBrokerPortal,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const brokerId = req.broker.id;
      const { page, limit, start_date, end_date } = req.query;

      const result = await orderService.getBrokerOrders(brokerId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        startDate: start_date ? new Date(start_date as string) : undefined,
        endDate: end_date ? new Date(end_date as string) : undefined,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Get broker orders error:", error);
      res.status(500).json({
        error: "Failed to fetch orders",
        code: "FETCH_ORDERS_ERROR",
      });
    }
  }
);

/**
 * GET /api/portal/payouts
 * Get broker's payouts
 */
router.get(
  "/payouts",
  authenticateBrokerPortal,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional().isIn(["PENDING", "PROCESSING", "COMPLETED"]),
  ]),
  async (req: Request, res: Response) => {
    try {
      const brokerId = req.broker.id;
      const { page, limit, status } = req.query;

      const result = await payoutService.getBrokerPayouts(brokerId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Get broker payouts error:", error);
      res.status(500).json({
        error: "Failed to fetch payouts",
        code: "FETCH_PAYOUTS_ERROR",
      });
    }
  }
);

/**
 * GET /api/portal/widget-code
 * Get widget embed code
 */
router.get(
  "/widget-code",
  authenticateBrokerPortal,
  async (req: Request, res: Response) => {
    try {
      const broker = await prisma.broker.findUnique({
        where: { id: req.broker.id },
        select: {
          api_key: true,
          name: true,
          website: true,
        },
      });

      if (!broker) {
        return res.status(404).json({
          error: "Broker not found",
          code: "BROKER_NOT_FOUND",
        });
      }

      const embedCode = `<!-- Tradeline Marketplace Widget -->
<div id="tradeline-widget"></div>
<script src="https://widget.tradelinerental.com/widget.js"></script>
<script>
  TradelineWidget.init({
    apiKey: '${broker.api_key}',
    theme: {
      primaryColor: '#2563eb',
      fontFamily: 'Inter, sans-serif'
    }
  }, 'tradeline-widget');
</script>`;

      res.json({
        success: true,
        api_key: broker.api_key,
        embed_code: embedCode,
        instructions: [
          "1. Copy the embed code above",
          "2. Paste it into your website HTML where you want the widget to appear",
          "3. The widget will automatically load and display tradelines with your pricing",
          "4. Customers can browse, add to cart, and checkout directly from your site",
        ],
      });
    } catch (error) {
      console.error("Get widget code error:", error);
      res.status(500).json({
        error: "Failed to generate widget code",
        code: "WIDGET_CODE_ERROR",
      });
    }
  }
);

export default router;
```

---

## Sprint 7: Production Deployment

### Task 7.1: Create Docker Configuration

**Priority**: High
**Complexity**: Moderate
**Dependencies**: All previous tasks

**Files to Create**:

`/docker-compose.yml`:

```yaml
version: "3.8"

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-tradeline}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-tradeline_marketplace}
      POSTGRES_HOST_AUTH_METHOD: scram-sha-256
      POSTGRES_INITDB_ARGS: --auth-host=scram-sha-256
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - tradeline_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-tradeline}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - tradeline_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER:-tradeline}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-tradeline_marketplace}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      TRADELINE_CONSUMER_KEY: ${TRADELINE_CONSUMER_KEY}
      TRADELINE_CONSUMER_SECRET: ${TRADELINE_CONSUMER_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - tradeline_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Widget CDN
  widget:
    build:
      context: ./widget
      dockerfile: Dockerfile
    networks:
      - tradeline_network
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - backend
      - widget
    networks:
      - tradeline_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  nginx_cache:

networks:
  tradeline_network:
    driver: bridge
```

`/backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application and Prisma
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]
```

`/widget/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build widget
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built widget files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for widget serving
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

`/widget/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # CORS headers for widget embedding
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Serve widget files
    location / {
        try_files $uri $uri/ =404;
    }

    # Security headers
    add_header X-Frame-Options "ALLOWALL";
    add_header X-Content-Type-Options "nosniff";
}
```

`/nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Upstream servers
    upstream backend {
        server backend:3000;
    }

    upstream widget {
        server widget:80;
    }

    # Cache settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=widget_cache:10m max_size=100m inactive=60m use_temp_path=off;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=widget_limit:10m rate=50r/s;

    # API Server
    server {
        listen 80;
        server_name api.tradelinerental.com;

        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

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

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Webhook endpoint (no rate limiting)
        location /api/orders/webhook/stripe {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Pass raw body for Stripe signature verification
            proxy_set_header Content-Type $content_type;
            proxy_pass_request_body on;
            proxy_pass_request_headers on;
        }
    }

    # Widget CDN
    server {
        listen 80;
        server_name widget.tradelinerental.com;

        # Rate limiting
        limit_req zone=widget_limit burst=100 nodelay;

        location / {
            # Cache widget files
            proxy_cache widget_cache;
            proxy_cache_valid 200 1h;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;

            proxy_pass http://widget;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # CORS headers
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept" always;
        }
    }

    # SSL configuration (when ready)
    # server {
    #     listen 443 ssl http2;
    #     server_name api.tradelinerental.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers HIGH:!aNULL:!MD5;
    #
    #     # ... rest of configuration
    # }
}
```

---

### Task 7.2: Create Deployment Scripts

**Priority**: High
**Complexity**: Simple
**Dependencies**: Task 7.1

**Files to Create**:

`/scripts/deploy.sh`:

```bash
#!/bin/bash

# Production deployment script
set -e

echo "🚀 Starting Tradeline Marketplace Deployment"

# Check environment file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Copy .env.example to .env and configure your settings"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
required_vars=(
    "DB_PASSWORD"
    "TRADELINE_CONSUMER_KEY"
    "TRADELINE_CONSUMER_SECRET"
    "STRIPE_SECRET_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

echo "🔄 Starting services..."
docker-compose up -d

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec backend npx prisma migrate deploy

# Create initial admin
echo "👤 Creating initial admin account..."
docker-compose exec backend npx tsx src/scripts/setup.ts

echo "✅ Deployment complete!"
echo ""
echo "📌 Access URLs:"
echo "   API: http://api.tradelinerental.com"
echo "   Widget: http://widget.tradelinerental.com"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
```

`/backend/src/scripts/setup.ts`:

```typescript
import { getAuthService } from "../services/AuthService";
import { prisma } from "../services/Database";
import Database from "../services/Database";

async function setup() {
  console.log("🔧 Running initial setup...\n");

  try {
    // Connect to database
    await Database.connect();

    // Create initial admin
    const authService = getAuthService();
    await authService.createInitialAdmin();

    // Seed test data if in development
    if (process.env.NODE_ENV === "development") {
      console.log("🌱 Seeding test data...");

      // Create test broker
      const testBroker = await prisma.broker.create({
        data: {
          name: "Test Broker",
          email: "test@broker.com",
          api_key: "tlm_test_key_123",
          api_secret: await bcrypt.hash("test_secret", 10),
          revenue_share_percent: 15,
          markup_type: "PERCENTAGE",
          markup_value: 20,
          status: "ACTIVE",
        },
      });

      console.log(`Test broker created: ${testBroker.email}`);
    }

    console.log("\n✅ Setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setup();
```

`/.env.production`:

```env
# Database
DB_USER=tradeline
DB_PASSWORD=your_secure_password_here
DB_NAME=tradeline_marketplace

# Redis
REDIS_PASSWORD=your_redis_password_here

# TradelineSupply API
TRADELINE_CONSUMER_KEY=your_consumer_key_here
TRADELINE_CONSUMER_SECRET=your_consumer_secret_here
TRADELINE_API_URL=https://tradelinesupply.com/wp-json/wc/v3

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# JWT
JWT_SECRET=your_super_secure_jwt_secret_change_this
JWT_EXPIRY=7d

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=change_this_immediately

# CORS
CORS_ORIGIN=https://yourdomain.com
```

---

### Task 7.3: Create Monitoring & Backup Scripts

**Priority**: Medium
**Complexity**: Simple
**Dependencies**: Task 7.2

**Files to Create**:

`/scripts/backup.sh`:

```bash
#!/bin/bash

# Database backup script
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tradeline_marketplace_$TIMESTAMP.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

echo "📦 Starting database backup..."

# Run pg_dump
docker-compose exec -T postgres pg_dump \
    -U ${DB_USER:-tradeline} \
    -d ${DB_NAME:-tradeline_marketplace} \
    > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "🧹 Old backups cleaned"
```

`/scripts/health-check.sh`:

```bash
#!/bin/bash

# Health check script

echo "🏥 Running health checks..."

# Check API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ $API_STATUS -eq 200 ]; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Unhealthy (Status: $API_STATUS)"
fi

# Check database
docker-compose exec -T postgres pg_isready > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
fi

# Check Redis
docker-compose exec -T redis redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "✅ Disk Space: ${DISK_USAGE}% used"
else
    echo "⚠️  Disk Space: ${DISK_USAGE}% used"
fi
```

---

### Task 7.4: Create Documentation

**Priority**: High
**Complexity**: Simple
**Dependencies**: All tasks

**Files to Create**:

`/README.md`:

````markdown
# Tradeline Marketplace Platform

A white-label multi-tenant platform for selling tradelines with advanced commission management.

## 🚀 Features

- **Multi-Tenant Architecture**: Support unlimited brokers with individual pricing
- **Advanced Commission System**:
  - Platform receives 50% commission from TradelineSupply prices
  - Brokers get 10-25% revenue share (admin-controlled)
  - Brokers can add unlimited markup (broker-controlled)
- **Embeddable Widget**: Single-line embed code for broker websites
- **Automated Fulfillment**: Direct integration with TradelineSupply
- **Payment Processing**: Stripe checkout with webhook handling
- **Analytics Dashboard**: Real-time metrics for brokers and admins
- **Commission Payouts**: Automated monthly payout system

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
- Stripe Account
- TradelineSupply API Credentials

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/tradeline-marketplace.git
cd tradeline-marketplace
```
````

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Deploy with Docker**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

4. **Access the platform**

- API: http://api.tradelinerental.com
- Widget: http://widget.tradelinerental.com

## 💰 Commission Structure

| Component            | Percentage | Description                   |
| -------------------- | ---------- | ----------------------------- |
| TradelineSupply      | 50%        | Base cost (built into prices) |
| Platform Commission  | 50%        | Your gross commission         |
| Broker Revenue Share | 10-25%     | From platform commission      |
| Platform Net         | 25-40%     | After broker share            |
| Broker Markup        | Unlimited  | Broker keeps 100%             |

### Example Transaction ($1,000 tradeline)

- Customer pays: $1,200 (with 20% broker markup)
- TradelineSupply gets: $500
- Broker gets: $100 (share) + $200 (markup) = $300
- Platform keeps: $400

## 🔧 Admin Panel

### Initial Login

```
Email: admin@tradelinerental.com
Password: [set in .env]
```

### Key Functions

- Approve/manage brokers
- Set revenue share percentages
- Process monthly payouts
- View platform analytics
- Generate revenue reports

## 🔌 Broker Integration

### Widget Embed Code

```html
<div id="tradeline-widget"></div>
<script src="https://widget.tradelinerental.com/widget.js"></script>
<script>
  TradelineWidget.init(
    {
      apiKey: "tlm_broker_api_key_here",
    },
    "tradeline-widget"
  );
</script>
```

## 📊 API Documentation

### Public Endpoints (Widget)

- `GET /api/public/pricing` - Get tradeline pricing
- `POST /api/public/calculate` - Calculate cart totals
- `POST /api/public/track` - Track analytics events

### Order Endpoints

- `POST /api/orders/checkout` - Create checkout session
- `POST /api/orders/webhook/stripe` - Stripe webhook handler

### Admin Endpoints

- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Platform statistics
- `POST /api/brokers` - Create broker account

### Broker Portal

- `POST /api/portal/login` - Broker authentication
- `GET /api/portal/dashboard` - Broker statistics
- `PATCH /api/portal/settings` - Update markup

## 🔐 Security

- OAuth 1.0a for TradelineSupply API
- JWT authentication for admin/broker portals
- API key authentication for widgets
- Rate limiting on all endpoints
- Stripe webhook signature verification

## 🚀 Deployment

### Production Checklist

- [ ] Configure SSL certificates
- [ ] Set strong passwords in .env
- [ ] Enable backup cron job
- [ ] Configure monitoring alerts
- [ ] Set up log aggregation
- [ ] Configure CDN for widget

### Backup & Recovery

```bash
# Backup database
./scripts/backup.sh

# Restore from backup
docker-compose exec -T postgres psql -U tradeline < backup.sql
```

## 📈 Monitoring

```bash
# Check system health
./scripts/health-check.sh

# View logs
docker-compose logs -f backend

# Monitor resources
docker stats
```

## 🤝 Support

- Documentation: https://docs.tradelinerental.com
- Issues: https://github.com/your-org/tradeline-marketplace/issues

## 📄 License

Proprietary - All rights reserved

````

---

## Final Validation Checklist

### ✅ Phase 1: Foundation
- [x] Node.js/TypeScript backend setup
- [x] TradelineSupply OAuth 1.0a integration
- [x] Environment configuration
- [x] Health check endpoints

### ✅ Phase 2: Database & Business Logic
- [x] PostgreSQL with Prisma ORM
- [x] Redis caching layer
- [x] Pricing engine with correct commission model
- [x] Broker management service

### ✅ Phase 3: API & Widget
- [x] Authentication middleware
- [x] Public API for widget
- [x] Broker management endpoints
- [x] Vue.js embeddable widget

### ✅ Phase 4: Payment & Orders
- [x] Stripe checkout integration
- [x] Order processing with commission tracking
- [x] Webhook handling
- [x] Payout management

### ✅ Phase 5: Admin & Deployment
- [x] Admin authentication system
- [x] Admin dashboard endpoints
- [x] Broker portal endpoints
- [x] Docker configuration
- [x] Deployment scripts
- [x] Monitoring & backup scripts
- [x] Complete documentation

## Commands Summary

### Development
```bash
# Backend development
cd backend
npm run dev

# Widget development
cd widget
npm run dev

# Run tests
npm test
````

### Database

```bash
# Run migrations
npm run migrate

# Open Prisma Studio
npm run prisma:studio

# Generate Prisma client
npm run prisma:generate
```

### Deployment

```bash
# Deploy to production
./scripts/deploy.sh

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Backup database
./scripts/backup.sh

# Health check
./scripts/health-check.sh
```

### Stripe Testing

```bash
# Forward webhooks locally
stripe listen --forward-to localhost:3000/api/orders/webhook/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
```

---

## Project Structure Summary

```
tradeline-marketplace/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Auth & validation
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Entry point
│   ├── prisma/            # Database schema
│   └── Dockerfile
├── widget/                 # Vue.js embeddable widget
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── stores/        # Pinia state
│   │   └── Widget.vue     # Main component
│   └── Dockerfile
├── scripts/               # Deployment & maintenance
│   ├── deploy.sh
│   ├── backup.sh
│   └── health-check.sh
├── nginx/                 # Reverse proxy config
├── docker-compose.yml     # Container orchestration
└── README.md             # Documentation
```

This completes the entire AI Development Blueprint for the Tradeline Marketplace platform with the corrected commission structure!
