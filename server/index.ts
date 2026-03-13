import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import dotenv from "dotenv";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

dotenv.config();

const PostgresStore = connectPg(session);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration using PostgreSQL store
app.use(session({
  store: new PostgresStore({
    pool,
    tableName: 'sessions',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET || "gold-lending-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Enable secure in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'gold-lending-session'
}));


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Register routes synchronously (registerRoutes is async but we don't need to await the HTTP server return here)
registerRoutes(app).catch(err => {
  console.error("Failed to register routes:", err);
});

if (app.get("env") === "development") {
  // Setup Vite only in development
  setupApp();
} else {
  // In production (Vercel/Node), serve static files
  serveStatic(app);
}

async function setupApp() {
  const server = await registerRoutes(app);
  await setupVite(app, server);
}

// Only call listen if we're not on Vercel
if (!process.env.VERCEL) {
  const port = parseInt(process.env.PORT || "5000", 10);
  app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
}

export default app;



