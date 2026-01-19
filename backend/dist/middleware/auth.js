"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateBrokerJWT = exports.optionalBrokerAuth = exports.authenticateAdmin = exports.authenticateBroker = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const BrokerService_1 = require("../services/BrokerService");
const config_1 = require("../config");
/**
 * Authenticate broker via API key for widget requests
 */
const authenticateBroker = async (req, res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];
        if (!apiKey) {
            return res.status(401).json({
                error: "API key required",
                code: "MISSING_API_KEY",
            });
        }
        // Get broker from service (uses cache)
        const brokerService = (0, BrokerService_1.getBrokerService)();
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
    }
    catch (error) {
        console.error("Broker authentication error:", error);
        try {
            const fs = require('fs');
            const path = require('path');
            fs.appendFileSync(path.join(process.cwd(), 'error.log'), `[${new Date().toISOString()}] Auth Error: ${error.message}\n${error.stack}\n\n`);
        }
        catch (e) { /* ignore log error */ }
        return res.status(500).json({
            error: "Authentication failed",
            code: "AUTH_ERROR",
        });
    }
};
exports.authenticateBroker = authenticateBroker;
/**
 * Authenticate admin for management endpoints
 */
const authenticateAdmin = async (req, res, next) => {
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
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            if (decoded.type !== "admin") {
                return res.status(403).json({
                    error: "Admin access required",
                    code: "INSUFFICIENT_PRIVILEGES",
                });
            }
            req.admin = decoded;
            return next();
        }
        catch (jwtError) {
            return res.status(401).json({
                error: "Invalid or expired token",
                code: "INVALID_TOKEN",
            });
        }
    }
    catch (error) {
        console.error("Admin authentication error:", error);
        return res.status(500).json({
            error: "Authentication failed",
            code: "AUTH_ERROR",
        });
    }
};
exports.authenticateAdmin = authenticateAdmin;
/**
 * Optional broker authentication (for public endpoints that can be enhanced with broker context)
 */
const optionalBrokerAuth = async (req, _res, next) => {
    try {
        const apiKey = req.headers["x-api-key"];
        if (apiKey) {
            const brokerService = (0, BrokerService_1.getBrokerService)();
            const broker = await brokerService.getBrokerByApiKey(apiKey);
            if (broker && broker.status === "ACTIVE") {
                req.broker = broker;
            }
        }
        next();
    }
    catch (error) {
        // Silent fail - optional auth
        next();
    }
};
exports.optionalBrokerAuth = optionalBrokerAuth;
/**
 * Authenticate broker via JWT (for portal login)
 */
const authenticateBrokerJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Authorization required",
                code: "MISSING_AUTH",
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            if (decoded.type !== "broker") {
                return res.status(403).json({
                    error: "Broker access required",
                    code: "INSUFFICIENT_PRIVILEGES",
                });
            }
            req.broker = decoded;
            return next();
        }
        catch (jwtError) {
            return res.status(401).json({
                error: "Invalid or expired token",
                code: "INVALID_TOKEN",
            });
        }
    }
    catch (error) {
        console.error("Broker JWT authentication error:", error);
        return res.status(500).json({
            error: "Authentication failed",
            code: "AUTH_ERROR",
        });
    }
};
exports.authenticateBrokerJWT = authenticateBrokerJWT;
//# sourceMappingURL=auth.js.map