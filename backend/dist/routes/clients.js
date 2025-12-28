"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const ClientService_1 = require("../services/ClientService");
const PricingEngine_1 = require("../services/PricingEngine");
const router = (0, express_1.Router)();
const clientService = (0, ClientService_1.getClientService)();
const pricingEngine = (0, PricingEngine_1.getPricingEngine)();
// Configure upload
const upload = (0, multer_1.default)({ dest: "uploads/credit-reports/" });
/**
 * POST /api/clients/onboard
 * Create or get client profile and optionally process uploaded report
 */
router.post("/onboard", auth_1.authenticateBroker, upload.single("report"), // 'report' is the form field name
(0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    (0, express_validator_1.body)("name").optional().isString(),
    (0, express_validator_1.body)("phone").optional().isString(),
]), async (req, res) => {
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
    }
    catch (error) {
        console.error("Onboarding error:", error);
        res.status(500).json({
            error: "Onboarding failed",
            code: "ONBOARDING_ERROR",
            message: error.message
        });
    }
});
/**
 * POST /api/clients/filter-pricing
 * Get pricing specifically filtered for a client based on their onboarded data
 */
router.post("/filter-pricing", auth_1.authenticateBroker, (0, validation_1.validate)([
    (0, express_validator_1.body)("client_id").isUUID(),
]), async (req, res) => {
    try {
        const { client_id } = req.body;
        const broker = req.broker;
        const client = await clientService.getClientProfile(client_id);
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        const excludedBanks = client.excluded_banks || [];
        const filteredPricing = await pricingEngine.getPricingForBroker(broker.id, excludedBanks);
        return res.json({
            success: true,
            pricing: filteredPricing
        });
    }
    catch (error) {
        console.error("Filtered pricing error:", error);
        return res.status(500).json({
            error: "Failed to fetch filtered pricing",
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=clients.js.map