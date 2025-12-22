console.log("Starting server process...");
import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config";

console.log("Config loaded, environment:", config.env);

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

// Important: Stripe webhook needs the raw body for verification
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

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
import webhookRoutes from "./routes/webhook";
import adminAuthRoutes from "./routes/admin-auth";

app.use("/api/public", publicRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments/webhook", webhookRoutes);
app.use("/api/admin", adminAuthRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: process.env.npm_package_version,
  });
});

// Root endpoint - Status Page
app.get("/", (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tradeline Marketplace API</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 12px; }
          .status { color: #10b981; font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Tradeline Marketplace API</h1>
          <p>The backend services are <span class="status">ONLINE</span>.</p>
          <p>This is the engine powering your widget. It does not have a user interface itself.</p>
          <hr>
          <p style="font-size: 0.9em; color: #666;">
            Deployment: ${config.env}<br>
            Gemini AI: Enabled<br>
            Stripe Payments: Ready
          </p>
        </div>
      </body>
    </html>
  `);
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

// Temporary endpoint to create initial broker
app.get("/api/admin/create-initial-broker", async (_req: Request, res: Response) => {
  try {
    const secret = _req.query.secret;
    if (secret !== "temp-deployment-secret") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { getBrokerService } = await import("./services/BrokerService");
    const brokerService = getBrokerService();
    
    // Create the broker
    const result = await brokerService.createBroker({
      name: "Joe Machado",
      business_name: "EZWAI",
      email: "joe@ezwai.com",
      revenue_share_percent: 10,
      notes: "Initial admin broker created via endpoint"
    });

    // Auto-approve
    const { prisma } = await import("./services/Database");
    
    // Check if duplicate error was thrown or we need to handle it
    // The service throws error if email exists. 
    // If we are here, it worked.

    await prisma.broker.update({
      where: { id: result.broker.id },
      data: { status: "ACTIVE" }
    });

    res.json({
      message: "Broker created successfully",
      broker: result.broker,
      api_key: result.broker.api_key,
      api_secret: result.api_secret
    });
    return;

  } catch (error: any) {
    if (error.message.includes("already exists")) {
       // Fetch existing to show key? No, that is insecure usually, but for this recovery op:
       const { prisma } = await import("./services/Database");
       const existing = await prisma.broker.findUnique({ where: { email: "joe@ezwai.com" } });
       if (existing) {
         res.json({
           message: "Broker already exists",
           broker: existing,
           api_key: existing.api_key,
           note: "Secret cannot be retrieved for existing broker. You may need to reset it if lost."
         });
         return;
       }
    }
    res.status(500).json({ error: error.message });
    return;
  }
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
