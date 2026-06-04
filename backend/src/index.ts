import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import type { Options } from "express-rate-limit";
import { env } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { tenantContext } from "./middleware/tenant.js";
import { securityHeaders, rateLimitHeaders } from "./middleware/security.js";
import activitiesRouter from "./routes/activities.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import bulkRouter from "./routes/bulk.js";
import dashboardRouter from "./routes/dashboard.js";
import leadsRouter from "./routes/leads.js";
import metaWebhookRouter from "./routes/metaWebhook.js";
import messagingRouter from "./routes/messaging.js";
import partnerIntegrationsRouter from "./routes/partnerIntegrations.js";
import reportingRouter from "./routes/reporting.js";
import usersRouter from "./routes/users.js";

const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
const allowSubdomainOrigins = env.ALLOW_SUBDOMAIN_ORIGINS;
const isDevelopment = (process.env.NODE_ENV ?? "development") !== "production";

const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, "");
const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);
const allowedRootHosts = new Set(
  [env.ROOT_DOMAIN, ...normalizedAllowedOrigins]
    .map((value) => {
      const normalizedValue = value.trim().replace(/\/$/, "");
      if (!normalizedValue) return null;
      try {
        if (/^https?:\/\//i.test(normalizedValue)) {
          return new URL(normalizedValue).hostname.toLowerCase();
        }
        return normalizedValue.toLowerCase();
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value))
);

const isLocalDevOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
};

const isAllowedSubdomainOrigin = (origin: string) => {
  try {
    const { hostname } = new URL(origin);
    const normalizedHost = hostname.toLowerCase();
    return [...allowedRootHosts].some(
      (rootHost) => normalizedHost === rootHost || normalizedHost.endsWith(`.${rootHost}`)
    );
  } catch {
    return false;
  }
};

const rateLimitJsonHandler: Options["handler"] = (_req, res, _next, options) => {
  const message = typeof options.message === "string" ? options.message : "Too many requests";
  return res.status(options.statusCode).json({
    success: false,
    message
  });
};

const authenticatedUserKey = (req: express.Request) => {
  const user = (req as any).user;
  if (user?.id && user?.tenantId) {
    return `tenant:${user.tenantId}:user:${user.id}`;
  }
  return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown");
};

// Rate limiting middleware - Auth endpoint (strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: "Too many login attempts, please try again later",
  handler: rateLimitJsonHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "unknown";
    return `${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown")}:${email}`;
  },
  skip: (req) => {
    // Don't rate limit health checks and info endpoints
    return req.path === "/health" || req.path === "/api/info";
  }
});

// Rate limiting middleware - General API (moderate)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Normal CRM pages make several parallel API calls per navigation.
  message: "Too many API requests, please wait a minute and try again.",
  handler: rateLimitJsonHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedUserKey,
  skip: (req) => {
    // Don't rate limit super admins (if user has role)
    return (req as any).user?.role === "SUPER_ADMIN";
  }
});

// Rate limiting middleware - Bulk operations (very strict)
const bulkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: "Bulk operation limit exceeded, please try again later",
  handler: rateLimitJsonHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authenticatedUserKey,
  skip: (req) => {
    // CSV import can require many chunk/commit calls for large files.
    // Do not throttle these paths with the strict bulk limiter.
    return req.path.startsWith("/import/csv/");
  }
});

// Security: Trust proxy in production
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// CORS with strict options
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      if (normalizedAllowedOrigins.includes(normalizedOrigin)) return callback(null, true);
      if (isDevelopment && isLocalDevOrigin(origin)) return callback(null, true);
      if (allowSubdomainOrigins && isAllowedSubdomainOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'X-API-Key'],
    maxAge: 3600
  })
);

// Allow larger payloads for bulk CSV flows while still keeping a bounded limit.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple cookie parser middleware
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    req.cookies = cookies;
  } else {
    req.cookies = {};
  }
  next();
});

// Rate limiting response headers
app.use(rateLimitHeaders);
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok",
    service: "Guruverse API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/info", (_req, res) => {
  res.json({
    name: "Guruverse",
    description: "Modern Admission Management Platform",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime()
  });
});

app.use("/integrations/meta", metaWebhookRouter);
app.use("/integrations", partnerIntegrationsRouter);

app.use("/auth", authLimiter, authRouter);
app.use("/admin", apiLimiter, adminRouter);

// Apply tenant context middleware to all protected routes
app.use("/dashboard", requireAuth, apiLimiter, tenantContext, dashboardRouter);
app.use("/leads", requireAuth, apiLimiter, tenantContext, leadsRouter);
app.use("/activities", requireAuth, apiLimiter, tenantContext, activitiesRouter);
app.use("/bulk", requireAuth, bulkLimiter, tenantContext, bulkRouter);

// Middleware for messaging routes - skip auth for webhook
app.use("/messaging", (req, res, next) => {
  if (req.path === "/webhooks/sms-status" && req.method === "POST") {
    next();
  } else {
    requireAuth(req, res, (err) => {
      if (err) return;
      apiLimiter(req, res, (err) => {
        if (err) return;
        tenantContext(req, res, next);
      });
    });
  }
});
app.use("/messaging", messagingRouter);

app.use("/reports", requireAuth, apiLimiter, tenantContext, reportingRouter);
app.use("/users", requireAuth, apiLimiter, tenantContext, usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${env.PORT}`);
});
