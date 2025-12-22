import { Broker, BrokerStatus, Prisma } from "@prisma/client";
import { prisma } from "./Database";
import { getCacheService } from "./Cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../config";
import { PricingEngine } from "./PricingEngine";

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
