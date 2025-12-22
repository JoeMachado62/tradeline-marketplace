import { Router, Request, Response } from "express";
import { body, query, param } from "express-validator";
import { authenticateBroker, authenticateAdmin } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getPayoutService } from "../services/PayoutService";

const router = Router();
const payoutService = getPayoutService();

/**
 * GET /api/payouts/pending
 * List all pending payouts (Admin only)
 */
router.get(
  "/pending",
  authenticateAdmin,
  async (_req: Request, res: Response) => {
    try {
      const payouts = await payoutService.getPendingPayouts();
      res.json({
        success: true,
        payouts,
      });
    } catch (error: any) {
      console.error("Get pending payouts error:", error);
      res.status(500).json({
        error: "Failed to fetch pending payouts",
        code: "FETCH_PAYOUTS_ERROR",
      });
    }
  }
);

/**
 * POST /api/payouts/:id/process
 * Complete a pending payout (Admin only)
 */
router.post(
  "/:id/process",
  authenticateAdmin,
  validate([
    param("id").isUUID(),
    body("transaction_id").notEmpty().withMessage("Transaction ID is required"),
  ]),
  async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      const { transaction_id } = req.body;

      const payout = await payoutService.processPayout(payoutId, transaction_id);

      res.json({
        success: true,
        payout,
      });
    } catch (error: any) {
      console.error("Process payout error:", error);
      res.status(400).json({
        error: error.message || "Failed to process payout",
        code: "PROCESS_PAYOUT_ERROR",
      });
    }
  }
);

/**
 * GET /api/payouts/broker
 * Get broker's payout history
 */
router.get(
  "/broker",
  authenticateBroker,
  validate([
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("status").optional(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const broker = req.broker;
      const { page, limit, status } = req.query;

      const result = await payoutService.getBrokerPayouts(broker.id, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error("Get broker payouts error:", error);
      res.status(500).json({
        error: "Failed to fetch payout history",
        code: "FETCH_HISTORY_ERROR",
      });
    }
  }
);

/**
 * GET /api/payouts/:id/report
 * Generate/get payout report
 */
router.get(
  "/:id/report",
  validate([param("id").isUUID()]),
  async (req: Request, res: Response) => {
    try {
      const payoutId = req.params.id;
      
      const report = await payoutService.generatePayoutReport(payoutId);

      // Auth check
      let authorized = false;
      if (req.admin) {
        authorized = true;
      } else if (req.broker && report.broker_id === req.broker.id) {
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
    } catch (error: any) {
      console.error("Get payout report error:", error);
      return res.status(500).json({
        error: "Failed to fetch payout report",
        code: "FETCH_REPORT_ERROR",
      });
    }
  }
);

export default router;
