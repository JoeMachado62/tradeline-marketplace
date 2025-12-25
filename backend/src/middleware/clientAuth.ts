import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../services/Database";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      client?: any;
    }
  }
}

export const authenticateClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Check if user is a client (we can add a role or type check if admin/client tokens differ)
    // For now assuming if it verifies and has 'id', we check DB
    
    if (decoded.role && decoded.role !== 'CLIENT') {
         // If we share secret, ensure roles separate
         res.status(403).json({ error: "Invalid token scope" });
         return;
    }

    const client = await prisma.client.findUnique({
      where: { id: decoded.id },
    });

    if (!client) {
      res.status(401).json({ error: "Client not found" });
      return;
    }

    req.client = client;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
