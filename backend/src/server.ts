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

// Trust proxy for Railway/reverse proxy environments
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.api.corsOrigin,
    credentials: false,
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
import adminRoutes from "./routes/admin";
app.use("/api/admin", adminRoutes);

import publicRoutes from "./routes/public";
import brokerRoutes from "./routes/brokers";
import orderRoutes from "./routes/orders";
import payoutRoutes from "./routes/payouts";
import clientRoutes from "./routes/clients";
import webhookRoutes from "./routes/webhook";
import portalRoutes from "./routes/portal";

app.use("/api/public", publicRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/portal", portalRoutes);

import brokerPortalRoutes from "./routes/broker-portal";
app.use("/api/portal/broker", brokerPortalRoutes);
app.use("/api/payments/webhook", webhookRoutes);
// Note: admin routes (including login) are handled by adminRoutes above

import path from 'path';
import fs from 'fs';

// Admin Frontend Static Serving
const adminPath = path.join(__dirname, '../admin-dist');
console.log('Admin path:', adminPath);
console.log('Admin path exists:', fs.existsSync(adminPath));

if (fs.existsSync(adminPath)) {
    app.use('/admin', express.static(adminPath));
    app.get('/admin/*', (_req: Request, res: Response) => {
        res.sendFile(path.join(adminPath, 'index.html'));
    });
} else {
    app.get('/admin', (_req: Request, res: Response) => {
        res.status(503).send('Admin panel not available - dist folder not found at: ' + adminPath);
    });
}

// Client Portal Static Serving
const portalPath = path.join(__dirname, '../portal-dist');
if (fs.existsSync(portalPath)) {
    app.use('/portal/assets', express.static(path.join(portalPath, 'assets')));
    app.use('/portal', express.static(portalPath));
    app.get('/portal/*', (_req: Request, res: Response) => {
        res.sendFile(path.join(portalPath, 'index.html'));
    });
}

// Broker Portal Static Serving
const brokerPath = path.join(__dirname, '../broker-dist');
if (fs.existsSync(brokerPath)) {
    app.use('/broker/assets', express.static(path.join(brokerPath, 'assets')));
    app.use('/broker', express.static(brokerPath));
    app.get('/broker/*', (_req: Request, res: Response) => {
        res.sendFile(path.join(brokerPath, 'index.html'));
    });
}

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
