import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.api.corsOrigin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.api.rateLimitWindow,
  max: config.api.rateLimitMax,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// Important: Stripe webhook needs the raw body for signature verification
// This MUST be registered BEFORE express.json() for this specific path
app.use("/api/orders/webhook/stripe", express.raw({ type: "application/json" }));

// General middleware
app.use(compression());
app.use(morgan(config.env === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registration of routes
import publicRoutes from "./routes/public";
import brokerRoutes from "./routes/brokers";
import orderRoutes from "./routes/orders";
import payoutRoutes from "./routes/payouts";
import clientRoutes from "./routes/clients";

app.use("/api/public", publicRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/clients", clientRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: process.env.npm_package_version,
  });
});

// API info endpoint
app.get("/api", (_req: Request, res: Response) => {
  res.json({
    name: "Tradeline Marketplace API",
    version: "1.0.0",
    commission_structure: {
      platform_commission: "50% of TradelineSupply price",
      broker_revenue_share: "10-25% of base price (admin controlled)",
      broker_markup: "Unlimited (broker controlled, keeps 100%)",
    },
  });
});

// Error handling middleware (must be last)
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: config.env === "development" ? err.message : "Internal server error",
    ...(config.env === "development" && { stack: err.stack }),
  });
});

// Start server
const PORT = config.port;

// Only listen if not in test environment
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
      console.log(`
    🚀 Tradeline Marketplace API Server
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📡 Environment: ${config.env}
    🌐 Server: http://localhost:${PORT}
    💰 Commission Model: 50% platform / 10-25% broker share / unlimited broker markup
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
}

export default app;
