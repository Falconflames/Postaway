import dotenv from "dotenv";

/**
 * Loads environment variables from the .env file.
 */

dotenv.config({ quiet: true });

/**
 * Environment variables required for the
 * application to start successfully.
 *
 * @type {string[]}
 */

const requiredEnvVars = [
  "PORT",
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "NODE_ENV",
];

/**
 * Verifies that all required environment variables
 * are present.
 */

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`${varName} is missing in your .env file.`);
  }
}

const MIN_SECRET_LENGTH = 32;

if (process.env.ACCESS_TOKEN_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters long.");
}

if (process.env.REFRESH_TOKEN_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters long.");
}

/**
 * Supported Node.js runtime environments.
 *
 *  @type {string[]}
 */

const validNodeEnvs = ["development", "production", "test"];
if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
  throw new Error(`NODE_ENV must be one of: ${validNodeEnvs.join(", ")}`);
}

/**
 * Parses and validates the application port.
 * 
 * @type {number}
 */

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a valid positive integer.");
}

/**
 * Immutable application configuration.
 *
 * Exposes validated environment variables
 * for use throughout the application.
 * 
 * @readonly
 */

export default Object.freeze({
  PORT: port,
  MONGO_URI: process.env.MONGO_URI,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,
  NODE_ENV: process.env.NODE_ENV,
});
