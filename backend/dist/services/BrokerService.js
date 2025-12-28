"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrokerService = void 0;
exports.getBrokerService = getBrokerService;
const Database_1 = require("./Database");
const Cache_1 = require("./Cache");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../config");
const PricingEngine_1 = require("./PricingEngine");
class BrokerService {
    cache = (0, Cache_1.getCacheService)();
    /**
     * Generate secure API key for broker
     */
    generateApiKey() {
        return `tlm_${crypto_1.default.randomBytes(32).toString("hex")}`;
    }
    /**
     * Generate secure API secret for broker portal access
     */
    async generateApiSecret() {
        const plain = crypto_1.default.randomBytes(16).toString("hex");
        const hashed = await bcryptjs_1.default.hash(plain, 10);
        return { plain, hashed };
    }
    /**
     * Create a new broker account
     */
    async createBroker(data) {
        // Validate revenue share is within allowed range
        const revenueShare = data.revenue_share_percent || config_1.config.commission.defaultBrokerSharePercent;
        if (revenueShare < config_1.config.commission.minBrokerSharePercent ||
            revenueShare > config_1.config.commission.maxBrokerSharePercent) {
            throw new Error(`Revenue share must be between ${config_1.config.commission.minBrokerSharePercent}% and ${config_1.config.commission.maxBrokerSharePercent}%`);
        }
        // Check if email already exists
        const existing = await Database_1.prisma.broker.findUnique({
            where: { email: data.email },
        });
        if (existing) {
            throw new Error("A broker with this email already exists");
        }
        // Generate credentials
        const apiKey = this.generateApiKey();
        const apiSecret = await this.generateApiSecret();
        // Create broker
        const broker = await Database_1.prisma.broker.create({
            data: {
                name: data.name,
                business_name: data.business_name,
                email: data.email,
                phone: data.phone,
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
    async updateBroker(brokerId, updates, adminId) {
        // Validate revenue share if provided
        if (updates.revenue_share_percent !== undefined) {
            if (updates.revenue_share_percent <
                config_1.config.commission.minBrokerSharePercent ||
                updates.revenue_share_percent > config_1.config.commission.maxBrokerSharePercent) {
                throw new Error(`Revenue share must be between ${config_1.config.commission.minBrokerSharePercent}% and ${config_1.config.commission.maxBrokerSharePercent}%`);
            }
        }
        // Update broker
        const broker = await Database_1.prisma.broker.update({
            where: { id: brokerId },
            data: updates,
        });
        // Clear cache
        await this.cache.delete(this.cache.keys.broker(brokerId));
        await this.cache.delete(this.cache.keys.brokerByApiKey(broker.api_key));
        // Invalidate pricing cache if commission settings changed
        if (updates.revenue_share_percent !== undefined ||
            updates.markup_type !== undefined ||
            updates.markup_value !== undefined) {
            const { getPricingEngine } = await Promise.resolve().then(() => __importStar(require("./PricingEngine")));
            await getPricingEngine().invalidateCache(brokerId);
        }
        // Log activity
        await this.logActivity(brokerId, "BROKER_UPDATED", brokerId, { updates, admin_id: adminId });
        return broker;
    }
    /**
     * Approve a pending broker
     */
    async approveBroker(brokerId, adminId) {
        const broker = await Database_1.prisma.broker.update({
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
    async getBrokerByApiKey(apiKey) {
        // Check cache
        const cacheKey = this.cache.keys.brokerByApiKey(apiKey);
        const cached = await this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Query database
        const broker = await Database_1.prisma.broker.findUnique({
            where: { api_key: apiKey },
        });
        if (broker) {
            // Cache for 1 hour
            await this.cache.set(cacheKey, broker, config_1.config.redis.ttl.broker);
        }
        return broker;
    }
    /**
     * Get broker dashboard statistics
     */
    async getBrokerStats(brokerId, startDate, endDate) {
        const where = {
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
        const stats = await Database_1.prisma.order.aggregate({
            where,
            _count: true,
            _sum: {
                total_charged: true,
                broker_revenue_share: true,
                broker_markup: true,
            },
        });
        // Get pending commission
        const pendingCommission = await Database_1.prisma.commissionRecord.aggregate({
            where: {
                broker_id: brokerId,
                payout_status: "PENDING",
            },
            _sum: {
                total_commission: true,
            },
        });
        // Get analytics for conversion rate
        const analyticsWhere = {
            broker_id: brokerId,
        };
        if (startDate && endDate) {
            analyticsWhere.date = {
                gte: startDate,
                lte: endDate,
            };
        }
        const analytics = await Database_1.prisma.analytics.aggregate({
            where: analyticsWhere,
            _sum: {
                widget_loads: true,
                orders_count: true,
            },
        });
        const conversionRate = analytics._sum.widget_loads
            ? (analytics._sum.orders_count / analytics._sum.widget_loads) * 100
            : 0;
        return {
            total_orders: stats._count,
            total_revenue: PricingEngine_1.PricingEngine.centsToUsd(stats._sum.total_charged || 0),
            total_commission: PricingEngine_1.PricingEngine.centsToUsd((stats._sum.broker_revenue_share || 0) + (stats._sum.broker_markup || 0)),
            revenue_share_earned: PricingEngine_1.PricingEngine.centsToUsd(stats._sum.broker_revenue_share || 0),
            markup_earned: PricingEngine_1.PricingEngine.centsToUsd(stats._sum.broker_markup || 0),
            pending_payout: PricingEngine_1.PricingEngine.centsToUsd(pendingCommission._sum.total_commission || 0),
            conversion_rate: Math.round(conversionRate * 100) / 100,
        };
    }
    /**
     * Log broker activity
     */
    async logActivity(brokerId, action, entityId, metadata) {
        await Database_1.prisma.activityLog.create({
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
exports.BrokerService = BrokerService;
// Singleton instance
let serviceInstance = null;
function getBrokerService() {
    if (!serviceInstance) {
        serviceInstance = new BrokerService();
    }
    return serviceInstance;
}
exports.default = BrokerService;
//# sourceMappingURL=BrokerService.js.map