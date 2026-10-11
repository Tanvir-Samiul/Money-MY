import pino from "pino";
import config from "../config.js";

/**
 * Shared logger.
 * - Development: pretty, colored output
 * - Production: structured JSON (easy to search in a log aggregator)
 */
const logger = pino({
  level: config.NODE_ENV === "development" ? "debug" : "info",
  transport:
    config.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        }
      : undefined,
});

export default logger;
