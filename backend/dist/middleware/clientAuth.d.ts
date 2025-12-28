import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            client?: any;
        }
    }
}
export declare const authenticateClient: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=clientAuth.d.ts.map