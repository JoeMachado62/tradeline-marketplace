"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutService = void 0;
exports.getPayoutService = getPayoutService;
const Database_1 = require("./Database");
const PricingEngine_1 = require("./PricingEngine");
class PayoutService {
    /**
     * Calculate pending commission for a broker
     */
    async calculatePendingCommission(brokerId) {
        const commissions = await Database_1.prisma.commissionRecord.findMany({
            where: {
                broker_id: brokerId,
                payout_status: "PENDING",
                order: {
                    payment_status: "SUCCEEDED",
                    status: "COMPLETED",
                },
            },
            select: {
                id: true,
                order_id: true,
                revenue_share_amount: true,
                markup_amount: true,
            },
        });
        const totals = commissions.reduce((acc, curr) => {
            acc.revenue_share += curr.revenue_share_amount;
            acc.markup += curr.markup_amount;
            acc.order_ids.push(curr.order_id);
            return acc;
        }, { revenue_share: 0, markup: 0, order_ids: [] });
        return {
            ...totals,
            total: totals.revenue_share + totals.markup,
        };
    }
    /**
     * Create a payout for a broker
     */
    async createPayout(data) {
        const pending = await this.calculatePendingCommission(data.broker_id);
        if (pending.total === 0) {
            throw new Error("No pending commission to pay out");
        }
        return await Database_1.prisma.$transaction(async (tx) => {
            // 1. Create payout record
            const payout = await tx.payout.create({
                data: {
                    broker_id: data.broker_id,
                    total_amount: pending.total,
                    total_revenue_share: pending.revenue_share,
                    total_markup: pending.markup,
                    status: "PENDING",
                    period_start: data.period_start,
                    period_end: data.period_end,
                    payment_method: data.payment_method,
                },
            });
            // 2. Link commission records to this payout and update their status
            await tx.commissionRecord.updateMany({
                where: {
                    broker_id: data.broker_id,
                    payout_status: "PENDING",
                    order: {
                        payment_status: "SUCCEEDED",
                        status: "COMPLETED",
                    },
                },
                data: {
                    payout_id: payout.id,
                    payout_status: "PROCESSING",
                },
            });
            return payout;
        });
    }
    /**
     * Process and complete a payout
     */
    async processPayout(payoutId, transactionId) {
        const payout = await Database_1.prisma.$transaction(async (tx) => {
            const updated = await tx.payout.update({
                where: { id: payoutId },
                data: {
                    status: "COMPLETED",
                    transaction_id: transactionId,
                    processed_at: new Date(),
                },
            });
            // Update linked commissions
            await tx.commissionRecord.updateMany({
                where: { payout_id: payoutId },
                data: {
                    payout_status: "COMPLETED",
                },
            });
            return updated;
        });
        return payout;
    }
    /**
     * Get pending payouts for all brokers
     */
    async getPendingPayouts() {
        const payouts = await Database_1.prisma.payout.findMany({
            where: {
                status: "PENDING",
            },
            include: {
                broker: {
                    select: {
                        name: true,
                        email: true,
                        business_name: true,
                    },
                },
                commission_records: {
                    include: {
                        order: {
                            select: {
                                order_number: true,
                                created_at: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: "asc" },
        });
        return payouts.map((payout) => ({
            ...payout,
            total_amount_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_amount),
            total_revenue_share_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_revenue_share),
            total_markup_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_markup),
            order_count: payout.commission_records.length,
        }));
    }
    /**
     * Get broker payout history
     */
    async getBrokerPayouts(brokerId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const where = {
            broker_id: brokerId,
        };
        if (options.status) {
            where.status = options.status;
        }
        const [payouts, total] = await Promise.all([
            Database_1.prisma.payout.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    _count: {
                        select: {
                            commission_records: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
            }),
            Database_1.prisma.payout.count({ where }),
        ]);
        // Calculate summary
        const summary = await Database_1.prisma.payout.aggregate({
            where: {
                broker_id: brokerId,
                status: "COMPLETED",
            },
            _sum: {
                total_amount: true,
                total_revenue_share: true,
                total_markup: true,
            },
            _count: true,
        });
        return {
            payouts: payouts.map((payout) => ({
                ...payout,
                total_amount_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_amount),
                total_revenue_share_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_revenue_share),
                total_markup_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_markup),
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            summary: {
                total_payouts: summary._count,
                total_paid_usd: PricingEngine_1.PricingEngine.centsToUsd(summary._sum.total_amount || 0),
                revenue_share_paid_usd: PricingEngine_1.PricingEngine.centsToUsd(summary._sum.total_revenue_share || 0),
                markup_paid_usd: PricingEngine_1.PricingEngine.centsToUsd(summary._sum.total_markup || 0),
            },
        };
    }
    /**
     * Generate payout report
     */
    async generatePayoutReport(payoutId) {
        const payout = await Database_1.prisma.payout.findUnique({
            where: { id: payoutId },
            include: {
                broker: true,
                commission_records: {
                    include: {
                        order: {
                            include: {
                                items: true,
                            },
                        },
                    },
                },
            },
        });
        if (!payout) {
            throw new Error("Payout not found");
        }
        // Group commissions by order
        const orderDetails = payout.commission_records.map((commission) => ({
            order_number: commission.order.order_number,
            order_date: commission.order.created_at,
            customer: commission.order.customer_email,
            items: commission.order.items.length,
            order_total_usd: PricingEngine_1.PricingEngine.centsToUsd(commission.order.total_charged),
            revenue_share_usd: PricingEngine_1.PricingEngine.centsToUsd(commission.revenue_share_amount),
            markup_usd: PricingEngine_1.PricingEngine.centsToUsd(commission.markup_amount),
            commission_usd: PricingEngine_1.PricingEngine.centsToUsd(commission.total_commission),
        }));
        return {
            payout_id: payout.id,
            broker: {
                name: payout.broker.name,
                business_name: payout.broker.business_name,
                email: payout.broker.email,
            },
            period: {
                start: payout.period_start,
                end: payout.period_end,
            },
            totals: {
                revenue_share_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_revenue_share),
                markup_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_markup),
                total_usd: PricingEngine_1.PricingEngine.centsToUsd(payout.total_amount),
            },
            payment: {
                method: payout.payment_method,
                status: payout.status,
                transaction_id: payout.transaction_id,
                processed_at: payout.processed_at,
            },
            orders: orderDetails,
            order_count: orderDetails.length,
            created_at: payout.created_at,
        };
    }
}
exports.PayoutService = PayoutService;
// Singleton instance
let payoutServiceInstance = null;
function getPayoutService() {
    if (!payoutServiceInstance) {
        payoutServiceInstance = new PayoutService();
    }
    return payoutServiceInstance;
}
exports.default = PayoutService;
//# sourceMappingURL=PayoutService.js.map