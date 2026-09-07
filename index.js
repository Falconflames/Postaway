// Third-party
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import expressEjsLayouts from "express-ejs-layouts";
import cookieParser from "cookie-parser";
import multer from "multer";
import mongoose from "mongoose";

// Controllers
import UserController from "./controllers/user.controller.js";
import PostController from "./controllers/post.controller.js";
import LikeController from "./controllers/like.controller.js";
import CommentController from "./controllers/comment.controller.js";

// Middlewares

import ensureAuthenticated from "./middlewares/auth.middleware.js";
import profilePictureUpload from "./middlewares/profilePicUpload.middleware.js";
import postUpload from "./middlewares/postUpload.middleware.js";
import globalErrorHandler from "./middlewares/error.middleware.js";
import validatePostUpload from "./middlewares/validatePostUpload.middleware.js";

// Utils
import { setFlash } from "./utils/setflash.js";
import { defaultCookieOptions } from "./utils/cookieOptions.js";

// Config
import env from "./config/env.js";

/**
 * Main entry point for the Postaway application.
 *
 * Configures Express, security middleware,
 * MongoDB connection, authentication,
 * static assets, routes, and global
 * error handling.
 */

/**
 * Express application instance.
 */
const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://cdn-icons-png.flaticon.com",
          "https://res.cloudinary.com",
        ],

        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],

        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
      },
    },
  }),
);
app.use(mongoSanitize());

/**
 * Limits repeated login attempts to help
 * protect against brute-force attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

app.use(expressEjsLayouts);

/**
 * Configure the EJS view engine and layout.
 */
app.set("layout", "layout.ejs");
app.set("view engine", "ejs");

/**
 * Parses incoming JSON and URL-encoded request bodies.
 */
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

/**
 * Current module directory.
 */
const __dirname = import.meta.dirname;

/**
 * Serves static application assets.
 */
app.use(
  "/assets",
  express.static(path.resolve(__dirname, "assets"), {
    maxAge: "365d",
    immutable: true,
  }),
);

/**
 * Serves uploaded user files.
 */
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "uploads"), {
    maxAge: "1d",
  }),
);

/**
 * Reads flash messages from cookies,
 * exposes them to EJS views,
 * and clears the flash cookie.
 */
app.use((req, res, next) => {
  const flash = req.cookies.flashMessage;

  res.locals.message = null;
  res.locals.flashErrors = [];
  res.locals.formData = {};

  if (flash) {
    try {
      const parsed = JSON.parse(flash);

      res.locals.message = parsed.text
        ? { type: parsed.type, text: parsed.text }
        : null;
      res.locals.flashErrors = parsed.errors || [];
      res.locals.formData = parsed.formData || {};
    } catch {
      res.locals.message = null;
      res.locals.flashErrors = [];
      res.locals.formData = {};
    }
    res.clearCookie("flashMessage", { ...defaultCookieOptions });
  }
  next();
});

/**
 * Prevents authenticated pages from being
 * cached by browsers or intermediate proxies.
 */
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

/**
 * Authentication routes.
 */
app.get("/signup", UserController.renderSignUp);
app.get("/signin", UserController.renderSignIn);
app.post(
  "/signup",
  UserController.registerValidation,
  UserController.registerUser,
);
app.post(
  "/signin",
  loginLimiter,
  UserController.loginValidation,
  UserController.loginUser,
);

/**
 * User profile routes.
 */
app.get("/profile", ensureAuthenticated, UserController.renderProfile);
app.get("/editprofile", ensureAuthenticated, UserController.renderEditProfile);
app.put("/editprofile", ensureAuthenticated, UserController.updateEditProfile);
app.post(
  "/uploads",
  ensureAuthenticated,
  (req, res, next) => {
    profilePictureUpload.single("profilePicture")(req, res, (err) => {
      if (err) {
        let message = err.message;

        if (
          err instanceof multer.MulterError &&
          err.code === "LIMIT_FILE_SIZE"
        ) {
          message = "Profile picture must be smaller than 10 MB.";
        }

        setFlash(res, "error", message);

        return res.redirect(req.body.returnTo || "/editprofile");
      }

      next();
    });
  },
  UserController.uploadProfilePicture,
);
app.delete(
  "/removeProfilePicture",
  ensureAuthenticated,
  UserController.removeProfilePicture,
);

/**
 * Post management routes.
 */
app.get("/posts", ensureAuthenticated, PostController.renderPosts);
app.post(
  "/postUpload",
  ensureAuthenticated,
  postUpload.single("post"),
  validatePostUpload,
  PostController.uploadPost,
);
app.post(
  "/updatePost/:postId",
  ensureAuthenticated,
  postUpload.single("post"),
  validatePostUpload,
  PostController.updatePost,
);
app.delete(
  "/deletePost/:postId",
  ensureAuthenticated,
  PostController.deletePost,
);

/**
 * Like management routes.
 */
app.get("/likes/:postId", ensureAuthenticated, LikeController.getLikesForPost);
app.patch("/toggle/:postId", ensureAuthenticated, LikeController.toggleLike);

/**
 * Comment management routes.
 */
app.get(
  "/comments/:postId",
  ensureAuthenticated,
  CommentController.getComments,
);
app.post(
  "/comment/:postId",
  ensureAuthenticated,
  CommentController.createComment,
);
app.put(
  "/updateComment/:commentId",
  ensureAuthenticated,
  CommentController.updateComment,
);
app.delete(
  "/deleteComment/:commentId",
  ensureAuthenticated,
  CommentController.deleteComment,
);

/**
 * User session routes.
 */
app.post("/logout", ensureAuthenticated, UserController.logoutUser);

/**
 * Global application error handler.
 * Must be registered after all routes.
 */
app.use(globalErrorHandler);

/**
 * Starts the application after establishing
 * a successful MongoDB connection.
 */
const startServer = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);

    console.log("✅ Connected to MongoDB");

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

startServer();
