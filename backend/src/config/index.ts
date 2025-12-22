import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),

  // TradelineSupply API
  tradeline: {
    consumerKey: process.env.TRADELINE_CONSUMER_KEY!,
    consumerSecret: process.env.TRADELINE_CONSUMER_SECRET!,
    apiUrl:
      process.env.TRADELINE_API_URL ||
      "https://tradelinesupply.com/wp-json/wc/v3",
  },

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    ttl: {
      pricing: 300, // 5 minutes for pricing cache
      broker: 3600, // 1 hour for broker config cache
    },
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    apiVersion: "2023-10-16" as const,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiry: process.env.JWT_EXPIRY || "7d",
  },

  // AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
  },

  // Commission Structure (platform constants)
  commission: {
    platformCommissionPercent: 50, // We get 50% from TradelineSupply prices
    minBrokerSharePercent: 10, // Minimum revenue share for brokers
    maxBrokerSharePercent: 25, // Maximum revenue share for brokers
    defaultBrokerSharePercent: 10, // Default for new brokers
  },

  // API
  api: {
    corsOrigin: process.env.CORS_ORIGIN || "*",
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "TRADELINE_CONSUMER_KEY",
  "TRADELINE_CONSUMER_SECRET",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "JWT_SECRET",
  "GEMINI_API_KEY",
];

if (config.env !== "test") {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
}
