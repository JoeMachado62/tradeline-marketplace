import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getBrokerService } from "../services/BrokerService";
import { config } from "../config";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      broker?: any;
      admin?: any;
    }
  }
}

/**
 * Authenticate broker via API key for widget requests
 */
export const authenticateBroker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: "API key required",
        code: "MISSING_API_KEY",
      });
    }

    // Get broker from service (uses cache)
    const brokerService = getBrokerService();
    const broker = await brokerService.getBrokerByApiKey(apiKey);

    if (!broker) {
      return res.status(401).json({
        error: "Invalid API key",
        code: "INVALID_API_KEY",
      });
    }

    if (broker.status !== "ACTIVE") {
      return res.status(403).json({
        error: "Broker account is not active",
        code: "BROKER_INACTIVE",
        status: broker.status,
      });
    }

    // Attach broker to request
    req.broker = broker;
    return next();
  } catch (error) {
    console.error("Broker authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Authenticate admin for management endpoints
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Admin authorization required",
        code: "MISSING_AUTH",
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== "admin") {
        return res.status(403).json({
          error: "Admin access required",
          code: "INSUFFICIENT_PRIVILEGES",
        });
      }

      req.admin = decoded;
      return next();
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }
  } catch (error) {
    console.error("Admin authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Optional broker authentication (for public endpoints that can be enhanced with broker context)
 */
export const optionalBrokerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (apiKey) {
      const brokerService = getBrokerService();
      const broker = await brokerService.getBrokerByApiKey(apiKey);

      if (broker && broker.status === "ACTIVE") {
        req.broker = broker;
      }
    }

    next();
  } catch (error) {
    // Silent fail - optional auth
    next();
  }
};
