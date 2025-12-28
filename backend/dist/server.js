"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("Starting server process...");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const express_ejs_layouts_1 = __importDefault(require("express-ejs-layouts"));
const config_1 = require("./config");
console.log("Config loaded, environment:", config_1.config.env);
const app = (0, express_1.default)();
// View engine setup
app.set("view engine", "ejs");
app.set("views", path_1.default.join(__dirname, "../views"));
app.use(express_ejs_layouts_1.default);
app.set("layout", "partials/base");
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);
// Trust proxy for Railway/reverse proxy environments
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Required for external widget and scripts
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)({
    origin: config_1.config.api.corsOrigin,
    credentials: false,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.api.rateLimitWindow,
    max: config_1.config.api.rateLimitMax,
    message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);
// Important: Stripe webhook needs the raw body for verification
app.use("/api/payments/webhook", express_1.default.raw({ type: "application/json" }));
// General middleware
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(config_1.config.env === "development" ? "dev" : "combined"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Static files for the main website
app.use(express_1.default.static(path_1.default.join(__dirname, "../public/site")));
// Registration of routes
const admin_1 = __importDefault(require("./routes/admin"));
app.use("/api/admin", admin_1.default);
const public_1 = __importDefault(require("./routes/public"));
const brokers_1 = __importDefault(require("./routes/brokers"));
const orders_1 = __importDefault(require("./routes/orders"));
const payouts_1 = __importDefault(require("./routes/payouts"));
const clients_1 = __importDefault(require("./routes/clients"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const portal_1 = __importDefault(require("./routes/portal"));
app.use("/api/public", public_1.default);
app.use("/api/brokers", brokers_1.default);
app.use("/api/orders", orders_1.default);
app.use("/api/payouts", payouts_1.default);
app.use("/api/clients", clients_1.default);
app.use("/api/portal", portal_1.default);
const broker_portal_1 = __importDefault(require("./routes/broker-portal"));
app.use("/api/portal/broker", broker_portal_1.default);
app.use("/api/payments/webhook", webhook_1.default);
// Note: admin routes (including login) are handled by adminRoutes above
const fs_1 = __importDefault(require("fs"));
// Admin Frontend Static Serving
const adminPath = path_1.default.join(__dirname, '../admin-dist');
console.log('Admin path:', adminPath);
console.log('Admin path exists:', fs_1.default.existsSync(adminPath));
if (fs_1.default.existsSync(adminPath)) {
    app.use('/admin', express_1.default.static(adminPath));
    app.get('/admin/*', (_req, res) => {
        res.sendFile(path_1.default.join(adminPath, 'index.html'));
    });
}
else {
    app.get('/admin', (_req, res) => {
        res.status(503).send('Admin panel not available - dist folder not found at: ' + adminPath);
    });
}
// Client Portal Static Serving
const portalPath = path_1.default.join(__dirname, '../portal-dist');
if (fs_1.default.existsSync(portalPath)) {
    app.use('/portal/assets', express_1.default.static(path_1.default.join(portalPath, 'assets')));
    app.use('/portal', express_1.default.static(portalPath));
    app.get('/portal/*', (_req, res) => {
        res.sendFile(path_1.default.join(portalPath, 'index.html'));
    });
}
// Broker Portal Static Serving
const brokerPath = path_1.default.join(__dirname, '../broker-dist');
if (fs_1.default.existsSync(brokerPath)) {
    app.use('/broker-portal/assets', express_1.default.static(path_1.default.join(brokerPath, 'assets')));
    app.use('/broker-portal', express_1.default.static(brokerPath));
    app.get('/broker-portal/*', (_req, res) => {
        res.sendFile(path_1.default.join(brokerPath, 'index.html'));
    });
}
// Widget JavaScript Serving (for external websites)
const widgetPath = path_1.default.join(__dirname, '../widget-dist');
if (fs_1.default.existsSync(widgetPath)) {
    // Serve widget files with CORS headers so external sites can load them
    app.use('/widget', (_req, res, next) => {
        // CORS headers for cross-origin embedding
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Critical: Allow resource to be loaded cross-origin
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Cache for 1 hour
        res.setHeader('Cache-Control', 'public, max-age=3600');
        next();
    }, express_1.default.static(widgetPath));
    console.log('Widget files available at /widget/');
}
// Health check endpoint
app.get("/health", (_req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: config_1.config.env,
        version: process.env.npm_package_version,
    });
});
// API info endpoint
app.get("/api", (_req, res) => {
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
const site_1 = __importDefault(require("./routes/site"));
app.use("/", site_1.default);
// Error handling middleware (must be last)
app.use((err, _req, res, _next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
        error: config_1.config.env === "development" ? err.message : "Internal server error",
        ...(config_1.config.env === "development" && { stack: err.stack }),
    });
});
// Start server
const PORT = config_1.config.port;
// Only listen if not in test environment
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`
    🚀 Tradeline Marketplace API Server
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📡 Environment: ${config_1.config.env}
    🌐 Server: http://localhost:${PORT}
    💰 Commission Model: 50% platform / 10-25% broker share / unlimited broker markup
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map