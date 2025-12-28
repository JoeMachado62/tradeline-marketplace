import { Request, Response, NextFunction } from "express";
import { ValidationChain } from "express-validator";
/**
 * Validate request using express-validator chains
 */
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=validation.d.ts.map