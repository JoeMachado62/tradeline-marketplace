"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateClient = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const Database_1 = require("../services/Database");
const authenticateClient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "No token provided" });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ error: "Invalid token format" });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        // Check if user is a client (we can add a role or type check if admin/client tokens differ)
        // For now assuming if it verifies and has 'id', we check DB
        if (decoded.role && decoded.role !== 'CLIENT') {
            // If we share secret, ensure roles separate
            res.status(403).json({ error: "Invalid token scope" });
            return;
        }
        const client = await Database_1.prisma.client.findUnique({
            where: { id: decoded.id },
        });
        if (!client) {
            res.status(401).json({ error: "Client not found" });
            return;
        }
        req.client = client;
        next();
    }
    catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
exports.authenticateClient = authenticateClient;
//# sourceMappingURL=clientAuth.js.map