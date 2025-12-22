import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";

/**
 * Validate request using express-validator chains
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: errors.array(),
      });
    }

    return next();
  };
};
