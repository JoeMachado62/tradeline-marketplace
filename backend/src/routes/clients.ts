import { Router, Request, Response } from "express";
import { body } from "express-validator";
import multer from "multer";
import { authenticateBroker } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { getClientService } from "../services/ClientService";
import { getPricingEngine } from "../services/PricingEngine";

const router = Router();
const clientService = getClientService();
const pricingEngine = getPricingEngine();

// Configure upload
const upload = multer({ dest: "uploads/credit-reports/" });

/**
 * POST /api/clients/onboard
 * Create or get client profile and optionally process uploaded report
 */
router.post(
  "/onboard",
  authenticateBroker,
  upload.single("report"), // 'report' is the form field name
  validate([
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("name").optional().isString(),
    body("phone").optional().isString(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, name, phone } = req.body;
      const file = req.file;

      // 1. Get or Create Client
      const client = await clientService.getOrCreateClient({
        email,
        name,
        phone,
      });

      // 2. Process Credit Report if uploaded
      let reportResult = null;
      if (file) {
        reportResult = await clientService.processCreditReport(client.id, file);
      }

      // 3. Return client profile + excluded banks
      res.json({
        success: true,
        client: {
          id: client.id,
          email: client.email,
          name: client.name,
          excluded_banks: reportResult 
            ? Array.from(new Set([...client.excluded_banks, ...reportResult.creditors_found]))
            : client.excluded_banks
        },
        report: reportResult
      });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      res.status(500).json({
        error: "Onboarding failed",
        code: "ONBOARDING_ERROR",
        message: error.message
      });
    }
  }
);

/**
 * POST /api/clients/filter-pricing
 * Get pricing specifically filtered for a client based on their onboarded data
 */
router.post(
  "/filter-pricing",
  authenticateBroker,
  validate([
    body("client_id").isUUID(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { client_id } = req.body;
      const broker = req.broker;

      const client = await clientService.getClientProfile(client_id);
      if (!client) {
         return res.status(404).json({ error: "Client not found" });
      }

      const excludedBanks = client.excluded_banks || [];

      const filteredPricing = await pricingEngine.getPricingForBroker(
        broker.id,
        excludedBanks
      );

      return res.json({
        success: true,
        pricing: filteredPricing
      });

    } catch (error: any) {
      console.error("Filtered pricing error:", error);
      return res.status(500).json({
        error: "Failed to fetch filtered pricing",
        message: error.message
      });
    }
  }
);

export default router;
