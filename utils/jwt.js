import jwt from "jsonwebtoken";

import env from "../config/env.js";

/**
 * Generates a signed JWT access token
 * for the authenticated user.
 *
 * @param {{ _id: string, username: string }} user - Authenticated user.
 * @returns {string} Signed access token.
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      type: "access",
      username: user.username,
    },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
      issuer: "postaway",
      audience: "postaway-users",
      algorithm: "HS256",
    },
  );
};

/**
 * Generates a signed JWT refresh token
 * for the authenticated user.
 *
 * @param {{ _id: string, username: string }} user - Authenticated user.
 * @returns {string} Signed refresh token.
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      type: "refresh",
    },
    env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
      issuer: "postaway",
      audience: "postaway-users",
      algorithm: "HS256",
    },
  );
};

/**
 * Verifies and decodes an access token.
 *
 * @param {string} token - JWT access token.
 * @throws {Error} If the token is invalid or expired.
 * @returns {Object} Decoded token payload.
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    issuer: "postaway",
    audience: "postaway-users",
    algorithms: ["HS256"], 
  });
};

/**
 * Verifies and decodes a refresh token.
 *
 * @param {string} token - JWT refresh token.
 * @throws {Error} If the token is invalid or expired.
 * @returns {Object} Decoded token payload.
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
    issuer: "postaway",
    audience: "postaway-users",
    algorithms: ["HS256"],
  });
};