import { defaultCookieOptions } from "./cookieOptions.js";

/**
 * Stores a temporary flash message in a cookie.
 *
 * @param {import("express").Response} res - Express response object.
 * @param {"success"|"error"|"info"|"warning"} type - Flash message type.
 * @param {string} text - Flash message content.
 * @param {Record<string, any>} [options={}] - Additional data to include with the flash message.
 */

export const setFlash = (res, type, text, options = {}) => {
  res.cookie("flashMessage", JSON.stringify({ type, text, ...options }), {
    ...defaultCookieOptions,
    maxAge: 5 * 60 * 1000,
  });
};
