// Dependencies
import mongoose from "mongoose";

// Models
import User from "../models/user.model.js";

//Services
import {
  findRefreshToken,
  removeRefreshToken,
  saveRefreshToken,
} from "../services/user.service.js";

// Utils
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt.js";
import { setFlash } from "../utils/setflash.js";
import {
  accessCookieOptions,
  refreshCookieOptions,
} from "../utils/cookieOptions.js";
import { durationToMs } from "../utils/time.js";
import logger from "../utils/logger.js";

// Config
import env from "../config/env.js";

/**
 * Ensures the user is authenticated before accessing a protected route.
 * Verifies the JWT stored in cookies and attaches the decoded user
 * payload to `req.user`.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 */
export default async function ensureAuthenticated(req, res, next) {
  const { accessToken, refreshToken } = req.cookies;

  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);

      if (payload.type !== "access") {
        throw new Error("Invalid access token type.");
      }
      req.user = payload; // Session is valid!
      res.locals.user = payload;
      return next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.info("Access token expired.");
      } else {
        logger.warn(`Invalid access token: ${err.message}`);
      }
    }
  }

  if (!refreshToken) {
    setFlash(res, "error", "Your session has expired. Please log in.");
    return res.redirect("/signin");
  }

  let session;
  let user;
  let newAccessToken;
  let newRefreshToken;
  let refreshUserId = null;

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.type !== "refresh") {
      throw new Error("Invalid refresh token type.");
    }
    refreshUserId = decoded.id;
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const hashedToken = User.hashRefreshToken(refreshToken);

      user = await findRefreshToken(refreshUserId, hashedToken, session);
      if (!user) {
        throw new Error("Refresh token not recognized.");
      }
      await removeRefreshToken(user._id, hashedToken, session);

      newAccessToken = generateAccessToken(user);
      newRefreshToken = generateRefreshToken(user);

      const newHashedToken = User.hashRefreshToken(newRefreshToken);

      const expiryDate = new Date(
        Date.now() + durationToMs(env.REFRESH_TOKEN_EXPIRES_IN),
      );
      await saveRefreshToken(user._id, newHashedToken, expiryDate, session);
    });
    res.cookie("accessToken", newAccessToken, accessCookieOptions);
    res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

    req.user = verifyAccessToken(newAccessToken);
    res.locals.user = req.user;

    logger.info(`Session automatically rotated for user: ${user.username}`);
    return next();
  } catch (refreshErr) {
    if (
      refreshErr.name === "TokenExpiredError" ||
      refreshErr.name === "JsonWebTokenError"
    ) {
      logger.info(`Refresh token rejected: ${refreshErr.message}`);
    } else {
      logger.error(
        `Refresh rotation failed for user ${refreshUserId}: ${refreshErr.stack}`,
      );
    }

    res.clearCookie("accessToken", accessCookieOptions);
    res.clearCookie("refreshToken", refreshCookieOptions);

    setFlash(res, "error", "Your session has expired. Please log in again.");
    return res.redirect("/signin");
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
