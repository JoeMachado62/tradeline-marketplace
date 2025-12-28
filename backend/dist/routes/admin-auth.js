"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validation_1 = require("../middleware/validation");
const config_1 = require("../config");
const router = (0, express_1.Router)();
/**
 * POST /api/admin/login
 * Admin login to get JWT token
 */
router.post("/login", (0, validation_1.validate)([
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email required"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password required"),
]), async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check credentials against environment variables
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword) {
            console.error("Admin credentials not configured in environment");
            return res.status(500).json({ error: "Server configuration error" });
        }
        if (email === adminEmail && password === adminPassword) {
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                id: "admin-1", // Static ID for single admin
                email: adminEmail,
                type: "admin",
            }, config_1.config.jwt.secret, { expiresIn: "24h" });
            return res.json({
                success: true,
                token,
                admin: {
                    email: adminEmail,
                    role: "SUPER_ADMIN"
                }
            });
        }
        return res.status(401).json({
            error: "Invalid credentials",
            code: "AUTH_FAILED"
        });
    }
    catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({
            error: "Login failed",
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin-auth.js.map