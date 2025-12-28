"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validate request using express-validator chains
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
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
exports.validate = validate;
//# sourceMappingURL=validation.js.map