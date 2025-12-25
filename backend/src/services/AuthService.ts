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
    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: (expiresIn || config.jwt.expiry) as any,
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
    // Try database first
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (admin && admin.is_active) {
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

    // Fallback: check environment variables (for initial setup/production)
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;
    
    if (envEmail && envPassword && email === envEmail && password === envPassword) {
      const token = this.generateToken({
        id: "env-admin-1",
        email: envEmail,
        role: "SUPER_ADMIN",
        type: "admin",
      });

      return {
        admin: {
          id: "env-admin-1",
          email: envEmail,
          name: "Admin",
          role: "SUPER_ADMIN" as any,
        },
        token,
      };
    }

    throw new Error("Invalid credentials");
  }

  /**
   * Broker portal login (uses password, not API secret)
   */
  async brokerLogin(
    email: string,
    password: string
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

    // Check if broker has a password set
    if (!broker.password_hash) {
      throw new Error("Password not set. Please contact support.");
    }

    // Verify password
    const isValid = await bcrypt.compare(password, broker.password_hash);
    if (!isValid) {
      throw new Error("Invalid credentials");
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
