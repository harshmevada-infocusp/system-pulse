const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");
const { app } = require("electron");
const { v4: uuidv4 } = require("uuid");

// Correlation ID for tracing log chains across a session
const sessionId = uuidv4();

// PII scrubbing transport (production pattern)
const scrubPII = winston.format((info) => {
  if (typeof info.message === "string") {
    // Scrub emails
    info.message = info.message.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g,
      "[EMAIL_REDACTED]",
    );
    // Scrub IPs (simple pattern)
    info.message = info.message.replace(
      /\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b/g,
      "[IP_REDACTED]",
    );
  }
  return info;
});

const logDir = path.join(app.getPath("userData"), "logs");

console.log(`Logging initialized. Logs will be stored in: ${logDir}`);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    scrubPII(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "system-pulse",
    sessionId,
    pid: process.pid,
    electronVersion: process.versions.electron,
  },
  transports: [
    // Console: colored for dev
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, sessionId, ...meta }) => {
            const extra =
              Object.keys(meta).length > 2 ? ` ${JSON.stringify(meta)}` : "";
            return `${timestamp} [${level}] [${sessionId?.slice(0, 8)}] ${message}${extra}`;
          },
        ),
      ),
    }),

    // File: rotating JSON logs (production-ready)
    new DailyRotateFile({
      dirname: logDir,
      filename: "system-pulse-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "10m",
      maxFiles: "7d",
      format: winston.format.json(),
    }),

    // Error-only file for quick triage
    new DailyRotateFile({
      dirname: logDir,
      filename: "errors-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "5m",
      maxFiles: "14d",
    }),
  ],
});

// Catch unhandled errors
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
});

module.exports = { logger, sessionId };
