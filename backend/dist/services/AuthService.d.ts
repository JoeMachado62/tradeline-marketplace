import { Admin, Broker } from "@prisma/client";
export declare class AuthService {
    /**
     * Generate JWT token
     */
    private generateToken;
    /**
     * Admin login
     */
    adminLogin(email: string, password: string): Promise<{
        admin: Partial<Admin>;
        token: string;
    }>;
    /**
     * Broker portal login (uses password, not API secret)
     */
    brokerLogin(email: string, password: string): Promise<{
        broker: Partial<Broker>;
        token: string;
    }>;
    /**
     * Create initial admin account
     */
    createInitialAdmin(): Promise<void>;
}
export declare function getAuthService(): AuthService;
//# sourceMappingURL=AuthService.d.ts.map