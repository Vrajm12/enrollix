import cors from "cors";
import express from "express";
import { env } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import activitiesRouter from "./routes/activities.js";
import authRouter from "./routes/auth.js";
import bulkRouter from "./routes/bulk.js";
import dashboardRouter from "./routes/dashboard.js";
import leadsRouter from "./routes/leads.js";
import messagingRouter from "./routes/messaging.js";
import reportingRouter from "./routes/reporting.js";
import usersRouter from "./routes/users.js";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok",
    service: "Enrollix API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/info", (_req, res) => {
  res.json({
    name: "Enrollix",
    description: "Modern Admission Management Platform",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime()
  });
});

app.use("/auth", authRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/leads", requireAuth, leadsRouter);
app.use("/activities", requireAuth, activitiesRouter);
app.use("/bulk", requireAuth, bulkRouter);

// Middleware for messaging routes - skip auth for webhook
app.use("/messaging", (req, res, next) => {
  if (req.path === "/webhooks/sms-status" && req.method === "POST") {
    next();
  } else {
    requireAuth(req, res, next);
  }
});
app.use("/messaging", messagingRouter);

app.use("/reports", requireAuth, reportingRouter);
app.use("/users", requireAuth, usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${env.PORT}`);
});
