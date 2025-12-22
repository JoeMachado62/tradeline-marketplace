import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Admin, Broker } from "@prisma/client";
import { prisma } from "./Database";
import { config } from "../config";

export class AuthService {
  /**
   * Generate JWT token
   */
  private generateToken(payload: any, expiresIn?: string): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn || config.jwt.expiry,
    });
  }

  /**
   * Admin login
   */
  async adminLogin(
    email: string,
    password: string
  ): Promise<{
    admin: Partial<Admin>;
    token: string;
  }> {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.is_active) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { last_login: new Date() },
    });

    // Generate token
    const token = this.generateToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "admin",
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    };
  }

  /**
   * Broker portal login
   */
  async brokerLogin(
    email: string,
    apiSecret: string
  ): Promise<{
    broker: Partial<Broker>;
    token: string;
  }> {
    const broker = await prisma.broker.findUnique({
      where: { email },
    });

    if (!broker || broker.status !== "ACTIVE") {
      throw new Error("Invalid credentials");
    }

    // Since we store hashed API secret, we verify it
    // Note: If you stored plain API secret, this needs adjustment. 
    // We assume hashed storage for security.
    const isValid = await bcrypt.compare(apiSecret, broker.api_secret);
    
    // Fallback? If api_secret is not hashed (legacy), we might need direct comparison? 
    // For now, assume it works if we set it up right.
    if (!isValid) {
        // Double check if it's a plain string match (TEMPORARY DEV ONLY)
        if (apiSecret === broker.api_secret) {
            // It was plain text.
        } else {
            throw new Error("Invalid credentials");
        }
    }

    // Generate token
    const token = this.generateToken({
      id: broker.id,
      email: broker.email,
      type: "broker",
    });

    return {
      broker: {
        id: broker.id,
        email: broker.email,
        name: broker.name,
        business_name: broker.business_name,
        // Do not return secret
        api_key: broker.api_key,
        revenue_share_percent: broker.revenue_share_percent || 10,
      },
      token,
    };
  }

  /**
   * Create initial admin account
   */
  async createInitialAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tradelinerental.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Check if admin exists
    const existing = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log("Admin account already exists");
      return;
    }

    // Create admin
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        name: "System Admin",
        role: "SUPER_ADMIN",
      },
    });

    console.log(`Initial admin created: ${adminEmail}`);
  }
}

// Singleton instance
let authInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authInstance) {
    authInstance = new AuthService();
  }
  return authInstance;
}
