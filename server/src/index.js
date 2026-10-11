import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "./config.js";
import logger from "./lib/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ---------- Security headers ---------- */
app.use(
  helmet({
    // Allow the app to talk to Supabase, Gemini, etc.
    contentSecurityPolicy: false,
  }),
);

/* ---------- Request logging ---------- */
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/healthz",
    },
    // Never log sensitive values. Anything listed here is replaced with
    // "[Redacted]" in the output.
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['set-cookie']",
        "res.headers['set-cookie']",
      ],
      censor: "[Redacted]",
    },
    // Keep the log line short — no full header dump in production
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          remoteAddress: req.remoteAddress,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

/* ---------- Body parsing ---------- */
app.use(express.json({ limit: `${config.MAX_UPLOAD_MB}mb` }));
app.use(express.urlencoded({ extended: true }));

/* ---------- Health check ---------- */
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, env: config.NODE_ENV, ts: new Date().toISOString() });
});

/* ---------- API routes (added in later phases) ---------- */
// app.use("/api/categories", categoriesRouter);
// app.use("/api/friends", friendsRouter);
// app.use("/api/transactions", transactionsRouter);

/* ---------- Serve client build in production ---------- */
if (config.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback — any non-API route serves index.html
  app.get(/^\/(?!api|healthz).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

/* ---------- 404 handler ---------- */
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

/* ---------- Error handler ---------- */
app.use((err, req, res, _next) => {
  logger.error({ err, url: req.url, method: req.method }, "Request failed");
  res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

/* ---------- Start ---------- */
const server = app.listen(config.PORT, () => {
  logger.info(
    `🚀 Server listening on http://localhost:${config.PORT} (env: ${config.NODE_ENV})`,
  );
});

/* ---------- Graceful shutdown ---------- */
function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully…`);
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
