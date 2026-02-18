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
    winston.format.printf(
      ({ timestamp, level, message, stack, service = "system" }) => {
        return `${timestamp} [${level}] ${service}: ${stack || message}`;
      },
    ),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "system-pulse",
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "system-pulse-app.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});
// if (!app.isPackaged) {
//   logger.add(
//     new winston.transports.Console({
//       format: winston.format.simple(),
//     }),
//   );
// }

export function getRecentLogs(count = 50) {
  const files = fs
    .readdirSync(logDir)
    .filter((f) => f.startsWith("system-pulse-"))
    .sort()
    .reverse();

  if (files.length === 0) return [];
  const content = fs.readFileSync(path.join(logDir, files[0]), "utf-8");

  return content
    .trim()
    .split("\n")

    .slice(-count)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { message: line, level: "info" };
      }
    });
}
export default logger;
