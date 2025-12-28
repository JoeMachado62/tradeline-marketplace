"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("../config");
class Database {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Database.instance) {
            console.log("Initializing PrismaClient instance...");
            Database.instance = new client_1.PrismaClient({
                log: config_1.config.env === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : ['error'],
            });
            console.log("PrismaClient instance initialized successfully.");
            // Middleware to convert cents to dollars for display
            // Note: In newer Prisma versions, $use is deprecated in favor of extensions.
            // We are disabling this for now to fix the build error.
            /*
            Database.instance.$use(async (params, next) => {
              const result = await next(params);
      
              // Convert cents to dollars when fetching
              if (params.action === 'findFirst' || params.action === 'findUnique' || params.action === 'findMany') {
                const convertCentsToUsd = (obj: any) => {
                  if (!obj) return obj;
      
                  const centsFields = [
                    'subtotal_base', 'broker_revenue_share', 'broker_markup',
                    'platform_net_revenue', 'total_charged', 'base_price',
                    'revenue_share', 'markup', 'customer_price', 'total_base',
                    'total_revenue_share', 'total_markup', 'total_customer_price',
                    'revenue_share_amount', 'markup_amount', 'total_commission',
                    'total_amount', 'total_sales', 'revenue_share_earned', 'markup_earned'
                  ];
      
                  centsFields.forEach(field => {
                    if (field in obj && typeof obj[field] === 'number') {
                      obj[`${field}_usd`] = obj[field] / 100;
                    }
                  });
      
                  return obj;
                };
      
                if (Array.isArray(result)) {
                  return result.map(convertCentsToUsd);
                } else {
                  return convertCentsToUsd(result);
                }
              }
      
              return result;
            });
            */
        }
        return Database.instance;
    }
    static async connect() {
        const prisma = Database.getInstance();
        try {
            await prisma.$connect();
            console.log('✅ Database connected successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            // Don't exit immediately in all cases, but for this foundation we might.
            // process.exit(1); 
        }
    }
    static async disconnect() {
        const prisma = Database.getInstance();
        await prisma.$disconnect();
        console.log('Database disconnected');
    }
    static async healthCheck() {
        try {
            const prisma = Database.getInstance();
            await prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.prisma = Database.getInstance();
exports.default = Database;
//# sourceMappingURL=Database.js.map