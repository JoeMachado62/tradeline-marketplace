import { PrismaClient } from '@prisma/client';
import { config } from '../config';

class Database {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!Database.instance) {
      Database.instance = new PrismaClient({
        log: config.env === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
        // errorFormat: config.env === 'development' ? 'pretty' : 'minimal', // Note: removed errorFormat as it might differ by prisma version
      });

      // Middleware to convert cents to dollars for display
      // Note: In newer Prisma versions, $use is deprecated in favor of extensions, 
      // but for this blueprint we'll use the provided middleware logic.
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
    }
    return Database.instance;
  }

  public static async connect(): Promise<void> {
    const prisma = Database.getInstance();
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      // Don't exit immediately in all cases, but for this foundation we might.
      // process.exit(1); 
    }
  }

  public static async disconnect(): Promise<void> {
    const prisma = Database.getInstance();
    await prisma.$disconnect();
    console.log('Database disconnected');
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      const prisma = Database.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const prisma = Database.getInstance();
export default Database;
