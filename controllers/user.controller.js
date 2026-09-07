// Third-party
import { body, validationResult } from "express-validator";

// Constants
import { DEFAULT_PROFILE_PICTURE } from "../constants/upload.js";

// Models
import User from "../models/user.model.js";

// Services
import {
  signUpUser,
  signInUser,
  uploadPic,
  editProfile,
  removePicture,
  findUserById,
  saveRefreshToken,
  removeRefreshToken,
} from "../services/user.service.js";
import { getPostsByUser } from "../services/post.service.js";
import { getCommentsForMultiplePosts } from "../services/comment.service.js";
import { getUserLikes } from "../services/like.service.js";

// Utils
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { deleteFile } from "../utils/deleteFile.js";
import { setFlash } from "../utils/setflash.js";
import {
  accessCookieOptions,
  refreshCookieOptions,
} from "../utils/cookieOptions.js";
import { durationToMs } from "../utils/time.js";

// Config
import env from "../config/env.js";

// Errors
import ConflictError from "../errors/conflict.error.js";
import UnauthorizedError from "../errors/unauthorized.error.js";
import ValidationError from "../errors/validation.error.js";

/**
 * Controller responsible for handling user authentication,
 * profile management, and rendering user-related views.
 */
class UserController {
  /**
   * Renders the sign-in page.
   *
   * @param {import("express").Request} _req
   * @param {import("express").Response} res
   * @returns {void}
   */
  renderSignIn = (_req, res) => {
    return this.renderAuthPage(res);
  };

  /**
   * Renders the sign-up page.
   *
   * @param {import("express").Request} _req
   * @param {import("express").Response} res
   * @returns {void}
   */
  renderSignUp = (_req, res) => {
    return this.renderAuthPage(res, { showSignUp: true });
  };

  /**
   * Express-validator middleware used to validate
   * user registration requests.
   *
   * @type {import("express-validator").ValidationChain[]}
   */
  registerValidation = [
    body("fullname")
      .trim()
      .notEmpty()
      .withMessage("Full name is required.")
      .isLength({ min: 3, max: 50 })
      .withMessage("Full name must be between 3 and 50 characters.")
      .matches(/^(?=.*\p{L})[\p{L}\s.'-]+$/u)
      .withMessage(
        "Full name can only contain letters, spaces, apostrophes, periods, and hyphens.",
      ),

    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required.")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3 and 20 characters.")
      .toLowerCase()
      .matches(/^[a-z0-9._]+$/)
      .withMessage(
        "Username can only contain letters, numbers, dots and underscores.",
      )
      .not()
      .matches(/[._]{2,}/)
      .withMessage("Username cannot contain consecutive dots or underscores.")
      .not()
      .matches(/^[._]|[._]$/)
      .withMessage("Username cannot start or end with a dot or underscore."),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required.")
      .isLength({ max: 254 })
      .withMessage("Email is too long.")
      .isEmail()
      .withMessage("Invalid email address.")
      .normalizeEmail(),

    body("password")
      .notEmpty()
      .withMessage("Password is required.")
      .matches(/^\S+$/)
      .withMessage("Password cannot contain spaces.")
      .isStrongPassword({
        minLength: 8,
        maxLength: 64,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
      .withMessage(
        "Password must be of atleast 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      ),

    body("confirm-password")
      .notEmpty()
      .withMessage("Please confirm your password.")
      .matches(/^\S+$/)
      .withMessage("Password cannot contain spaces.")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match.");
        }
        return true;
      }),
  ];

  /**
   * Registers a new user.
   *
   * Validates the registration request, creates the user account,
   * issues authentication cookies, sets a welcome flash message,
   * and redirects to the posts page.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {ConflictError} If the username or email is already in use.
   * @returns {Promise<void>}
   */
  registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email } = req.body;
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      setFlash(res, "error", "Validation Failed.", {
        errors: validationErrors.array(),
        formData: { fullname, username, email },
      });
      return res.redirect("/signup");
    }

    try {
      const newUser = await signUpUser(req.body);
      await this.issueAuthCookies(res, newUser);
      setFlash(res, "success", `Welcome to the platform, ${newUser.username}!`);
      return res.redirect("/posts");
    } catch (error) {
      if (error instanceof ConflictError) {
        console.log(error.message);
        setFlash(res, "error", `Registration failed! ${error.message}`, {
          formData: { fullname, username, email },
        });
        return res.redirect("/signup");
      }
      throw error;
    }
  });

  /**
   * Express-validator middleware used to validate
   * user login requests.
   *
   * @type {import("express-validator").ValidationChain[]}
   */
  loginValidation = [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username or email is required.")
      .isLength({ max: 254 })
      .withMessage("Username or email is too long."),

    body("password")
      .notEmpty()
      .withMessage("Password is required.")
      .matches(/^\S+$/)
      .withMessage("Password cannot contain spaces.")
      .isLength({ max: 64 })
      .withMessage("Password is too long."),
  ];

  /**
   * Authenticates a user, sets the authentication cookies,
   * and redirects to the posts page.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {UnauthorizedError} If the credentials are invalid.
   * @returns {Promise<void>}
   */
  loginUser = asyncHandler(async (req, res) => {
    const { username = "" } = req.body;
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      setFlash(res, "error", "Username and password are required.", {
        errors: validationErrors.array(),
        formData: { username },
      });
      return res.redirect("/signin");
    }

    try {
      const user = await signInUser(req.body);
      await this.issueAuthCookies(res, user);

      setFlash(res, "success", `Welcome back, ${user.username}!`);
      return res.redirect("/posts");
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        setFlash(res, "error", "Invalid username or password.", {
          formData: { username },
        });
        return res.redirect("/signin");
      }
      throw error;
    }
  });

  /**
   * Renders the authenticated user's profile page
   * including their posts, comments, liked posts,
   * and profile information.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {NotFoundError} If the authenticated user does not exist.
   * @returns {Promise<void>}
   */
  renderProfile = asyncHandler(async (req, res) => {
    const { id } = req.user;

    const [posts, dbUser, userLikes] = await Promise.all([
      getPostsByUser(id),
      findUserById(id),
      getUserLikes(id),
    ]);

    const postIds = posts.map((post) => post._id);
    const allComments = await getCommentsForMultiplePosts(postIds);

    const commentsMap = allComments.reduce((acc, comment) => {
      const postId = comment.postId.toString();
      if (!acc[postId]) acc[postId] = [];
      acc[postId].push(comment);
      return acc;
    }, {});

    const postsWithComments = posts.map((post) => ({
      ...post,
      comments: commentsMap[post._id.toString()] || [],
    }));

    const formattedGender = dbUser.gender
      ? dbUser.gender.charAt(0).toUpperCase() + dbUser.gender.slice(1)
      : "";

    return res.render("profile", {
      username: dbUser.username || "",
      profilePicture: dbUser.profilePicture,
      biotext: dbUser.biotext || "",
      gender: formattedGender,
      posts: postsWithComments,
      userLikes,
      showLayout: true,
      message: res.locals.message || null,
      pageCss: "profile.css",
      pageJs: "profile.js",
    });
  });

  /**
   * Renders the edit profile page for the authenticated user.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {NotFoundError} If the authenticated user does not exist.
   * @returns {Promise<void>}
   */
  renderEditProfile = asyncHandler(async (req, res) => {
    const { id } = req.user;
    const dbUser = await findUserById(id);

    return res.render("editProfile", {
      username: dbUser.username,
      profilePicture: dbUser.profilePicture,
      biotext: dbUser.biotext || "",
      gender: dbUser.gender || "male",
      message: res.locals.message || null,
      pageCss: "editProfile.css",
      pageJs: "editProfile.js",
    });
  });

  /**
   * Express-validator middleware used to validate
   * profile update requests.
   *
   * @type {import("express-validator").ValidationChain[]}
   */
  updateEditProfileValidation = [
    body("biotext")
      .trim()
      .isLength({ max: 150 })
      .withMessage("Bio must be 150 characters or less."),
    body("gender")
      .trim()
      .toLowerCase()
      .isIn(["male", "female", "other"])
      .withMessage("Invalid gender selection."),
  ];

  /**
   * Updates the authenticated user's profile information.
   *
   * Validates the request, updates the user's profile,
   * and returns a JSON response indicating success.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {ValidationError} If the submitted profile data is invalid.
   * @throws {NotFoundError} If the authenticated user does not exist.
   * @returns {Promise<void>}
   */
  updateEditProfile = asyncHandler(async (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const [firstError] = validationErrors.array();
      throw new ValidationError(firstError.msg);
    }

    const { id: userId } = req.user;
    const { biotext, gender } = req.body;

    await editProfile(userId, biotext, gender.toLowerCase());

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      redirectTo: "/profile",
    });
  });

  /**
   * Uploads or replaces the authenticated user's profile picture.
   *
   * Stores the uploaded image, updates the user's profile picture,
   * removes the previous custom profile picture when applicable,
   * and redirects back to the originating page.
   *
   * @param {import("express").Request} req - Express request object.
   * @param {import("express").Response} res - Express response object.
   * @throws {NotFoundError} If the authenticated user does not exist.
   * @returns {Promise<void>}
   */
  uploadProfilePicture = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;

    if (!req.file) {
      setFlash(res, "error", "Please select an image.");
      return res.redirect(req.body.returnTo || "/profile");
    }

    const picturePath = `/uploads/profilePictures/${req.file.filename}`;

    const { profilePicture: oldPicture } = await findUserById(userId);

    try {
      await uploadPic(userId, picturePath);
    } catch (error) {
      await deleteFile(picturePath);
      throw error;
    }
    if (
      oldPicture &&
      oldPicture !== DEFAULT_PROFILE_PICTURE &&
      oldPicture !== picturePath
    ) {
      try {
        await deleteFile(oldPicture);
      } catch (error) {
        logger.warn("Failed to delete old profile picture.", {
          path: oldPicture,
          error: error.message,
        });
      }
    }

    setFlash(res, "success", "Profile picture updated successfully.");

    return res.redirect(req.body.returnTo || "/profile");
  });

  /**
   * Removes the authenticated user's custom profile picture
   * and restores the default profile image.
   *
   * Deletes the previous profile picture from storage when
   * applicable and returns a success response.
   *
   * @param {import("express").Request} req - Express request object.
   * @param {import("express").Response} res - Express response object.
   * @throws {NotFoundError} If the authenticated user does not exist.
   * @returns {Promise<void>}
   */
  removeProfilePicture = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;

    const user = await findUserById(userId);

    const oldPicture = user.profilePicture;

    await removePicture(userId);

    if (oldPicture && oldPicture !== DEFAULT_PROFILE_PICTURE) {
      try {
        await deleteFile(oldPicture);
      } catch (error) {
        logger.warn("Failed to delete old profile picture.", {
          path: oldPicture,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully.",
    });
  });

  /**
   * Logs out the authenticated user by invalidating the stored
   * refresh token, clearing the authentication cookies,
   * and redirecting to the sign-in page.
   *
   * @param {import("express").Request} req - Express request object.
   * @param {import("express").Response} res - Express response object.
   * @returns {Promise<void>}
   */
  logoutUser = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    const userId = req.user?.id;

    if (userId && refreshToken) {
      const hashedToken = User.hashRefreshToken(refreshToken);
      await removeRefreshToken(userId, hashedToken).catch((err) =>
        logger.warn("Failed to invalidate refresh token during logout.", {
          userId,
          error: err.message,
        }),
      );
    }
    res.clearCookie("accessToken", accessCookieOptions);
    res.clearCookie("refreshToken", refreshCookieOptions);

    setFlash(res, "success", "You’ve been logged out.");

    return res.redirect("/signin");
  });

  /* -------------------------------------------------------------------------- */
  /* Private helpers */
  /* -------------------------------------------------------------------------- */

  /**
   * Renders the shared authentication page used for both
   * sign-in and sign-up forms.
   *
   * @param {import("express").Response} res - Express response object.
   * @param {Object} [overrides={}] - Values that override the default view model.
   * @param {boolean} [overrides.showSignUp=false] - Whether to display the sign-up form.
   * @param {Array<{ msg: string }>} [overrides.errors] - Validation errors to display.
   * @param {string} [overrides.username]
   * @param {string} [overrides.fullname]
   * @param {string} [overrides.email]
   * @param {string} [overrides.message]
   * @param {number} [status=200] - HTTP response status.
   * @returns {void}
   */
  renderAuthPage = (res, overrides = {}, status = 200) => {
    const { showSignUp = false } = overrides;
    const savedForm = res.locals.formData || {};

    return res.status(status).render("signIn-signUp", {
      ...overrides,
      errors: overrides.errors ?? res.locals.flashErrors ?? [],
      username: overrides.username ?? savedForm.username ?? "",
      fullname: overrides.fullname ?? savedForm.fullname ?? "",
      email: overrides.email ?? savedForm.email ?? "",
      password: "",
      showSignUp,
      showSignIn: !showSignUp,
      showLayout: false,
      message: overrides.message ?? res.locals.message ?? null,
      pageCss: "signIn-signUp.css",
      pageJs: "signIn-signUp.js",
    });
  };

  /**
   * Generates authentication tokens, stores a hashed refresh token,
   * persists it for future validation, and sets the authentication cookies.
   *
   * @param {import("express").Response} res - Express response object.
   * @param {import("../models/user.model.js").default} user - Authenticated user.
   * @throws {Error} If persisting the refresh token fails.
   * @returns {Promise<void>}
   */
  issueAuthCookies = async (res, user) => {
    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    const hashedRefreshToken = User.hashRefreshToken(refreshToken);

    const expiryDate = new Date(
      Date.now() + durationToMs(env.REFRESH_TOKEN_EXPIRES_IN),
    );

    await saveRefreshToken(user._id, hashedRefreshToken, expiryDate);

    res.cookie("accessToken", accessToken, accessCookieOptions);

    res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  };
}
export default new UserController();
