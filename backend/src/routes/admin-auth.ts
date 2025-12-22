import { Router, Request, Response } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";
import { validate } from "../middleware/validation";
import { config } from "../config";

const router = Router();

/**
 * POST /api/admin/login
 * Admin login to get JWT token
 */
router.post(
  "/login",
  validate([
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ]),
  async (req: Request, res: Response) => {
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
        const token = jwt.sign(
          {
            id: "admin-1", // Static ID for single admin
            email: adminEmail,
            type: "admin",
          },
          config.jwt.secret,
          { expiresIn: "24h" }
        );

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

    } catch (error: any) {
      console.error("Admin login error:", error);
      return res.status(500).json({
        error: "Login failed",
        message: error.message
      });
    }
  }
);

export default router;
