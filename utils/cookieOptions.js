import env from "../config/env.js";

/**
 * Default cookie options shared across the application.
 *
 * Provides secure default settings for authentication
 * and flash-message cookies.
 *
 * @readonly
 */
export const defaultCookieOptions = Object.freeze({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

/**
 * Cookie options used when storing
 * access tokens.
 *
 * Inherits the default cookie settings.
 *
 * @readonly
 */
export const accessCookieOptions = Object.freeze({
  ...defaultCookieOptions,
});

/**
 * Cookie options used when storing
 * refresh tokens.
 *
 * Inherits the default cookie settings.
 *
 * @readonly
 */
export const refreshCookieOptions = Object.freeze({
  ...defaultCookieOptions,
});