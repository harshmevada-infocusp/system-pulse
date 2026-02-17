import { app } from "electron";
import winston from "winston";
import path from "path";
import fs from "fs";

const logDir = path.join(app.getPath("userData"), "logs");
console.log("Log directory:", logDir);
// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}] ${stack || message}`;
    }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
if (!app.isPackaged) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
export default logger;
