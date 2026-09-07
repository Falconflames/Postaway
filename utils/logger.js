import fs from "fs";
import path from "path";
import winston from "winston";

/**
 * Winston logger used for application logging.
 *
 * Logs messages to the console and writes
 * error logs to /logs/error.log and all log
 * messages to /logs/combined.log.
 */


/**
 * Absolute path to the application's
 * log directory.
 */
const logsDir = path.join(process.cwd(), "logs");

fs.mkdirSync(logsDir, { recursive: true });

const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
    }),
  ),

  transports: [
    new winston.transports.Console(),

    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),

    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
});

export default logger;