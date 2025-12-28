"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const PayoutService_1 = require("../services/PayoutService");
const router = (0, express_1.Router)();
const payoutService = (0, PayoutService_1.getPayoutService)();
/**
 * GET /api/payouts/pending
 * List all pending payouts (Admin only)
 */
router.get("/pending", auth_1.authenticateAdmin, async (_req, res) => {
    try {
        const payouts = await payoutService.getPendingPayouts();
        res.json({
            success: true,
            payouts,
        });
    }
    catch (error) {
        console.error("Get pending payouts error:", error);
        res.status(500).json({
            error: "Failed to fetch pending payouts",
            code: "FETCH_PAYOUTS_ERROR",
        });
    }
});
/**
 * POST /api/payouts/:id/process
 * Complete a pending payout (Admin only)
 */
router.post("/:id/process", auth_1.authenticateAdmin, (0, validation_1.validate)([
    (0, express_validator_1.param)("id").isUUID(),
    (0, express_validator_1.body)("transaction_id").notEmpty().withMessage("Transaction ID is required"),
]), async (req, res) => {
    try {
        const payoutId = req.params.id;
        const { transaction_id } = req.body;
        const payout = await payoutService.processPayout(payoutId, transaction_id);
        res.json({
            success: true,
            payout,
        });
    }
    catch (error) {
        console.error("Process payout error:", error);
        res.status(400).json({
            error: error.message || "Failed to process payout",
            code: "PROCESS_PAYOUT_ERROR",
        });
    }
});
/**
 * GET /api/payouts/broker
 * Get broker's payout history
 */
router.get("/broker", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.query)("page").optional().isInt({ min: 1 }),
    (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)("status").optional(),
]), async (req, res) => {
    try {
        const broker = req.broker;
        const { page, limit, status } = req.query;
        const result = await payoutService.getBrokerPayouts(broker.id, {
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            status: status,
        });
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Get broker payouts error:", error);
        res.status(500).json({
            error: "Failed to fetch payout history",
            code: "FETCH_HISTORY_ERROR",
        });
    }
});
/**
 * GET /api/payouts/:id/report
 * Generate/get payout report
 */
router.get("/:id/report", (0, validation_1.validate)([(0, express_validator_1.param)("id").isUUID()]), async (req, res) => {
    try {
        const payoutId = req.params.id;
        const report = await payoutService.generatePayoutReport(payoutId);
        // Auth check
        let authorized = false;
        if (req.admin) {
            authorized = true;
        }
        else if (req.broker && report.broker_id === req.broker.id) {
            authorized = true;
        }
        if (!authorized) {
            return res.status(403).json({
                error: "Access denied",
            });
        }
        return res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        console.error("Get payout report error:", error);
        return res.status(500).json({
            error: "Failed to fetch payout report",
            code: "FETCH_REPORT_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=payouts.js.map