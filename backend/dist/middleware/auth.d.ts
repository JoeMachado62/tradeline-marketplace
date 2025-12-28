import { Request, Response, NextFunction } from "express";
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
export declare const authenticateBroker: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Authenticate admin for management endpoints
 */
export declare const authenticateAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Optional broker authentication (for public endpoints that can be enhanced with broker context)
 */
export declare const optionalBrokerAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Authenticate broker via JWT (for portal login)
 */
export declare const authenticateBrokerJWT: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map