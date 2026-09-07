// Constants
import { DEFAULT_PROFILE_PICTURE } from "../constants/upload.js";

// Models
import User from "../models/user.model.js";

//Errors
import ConflictError from "../errors/conflict.error.js";
import NotFoundError from "../errors/notFound.error.js";
import UnauthorizedError from "../errors/unauthorized.error.js";
import ValidationError from "../errors/validation.error.js";

/**
 * Updates a user document using a MongoDB update operation and
 * throws if the user does not exist.
 *
 * @param {string} userId - User ID.
 * @param {Object} update - MongoDB update document.
 * @param {Object} [options={}] - Additional Mongoose query options.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
const updateUser = (userId, update, options = {}) => {
  return User.findByIdAndUpdate(userId, update, {
    new: true,
    runValidators: true,
    ...options,
  }).orFail(() => new NotFoundError("User not found."));
};

/**
 * Creates a new user account.
 *
 * Normalizes the full name, username and email before saving.
 *
 * @param {Object} userData
 * @param {string} userData.fullname - User's full name.
 * @param {string} userData.username - Desired username.
 * @param {string} userData.email - Email address.
 * @param {string} userData.password - Plain-text password.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {ConflictError} If the username or email already exists.
 */
export const signUpUser = async ({ fullname, username, email, password }) => {
  const normalizedFullname = fullname.trim().replace(/\s+/g, " ");
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  try {
    return await User.create({
      fullname: normalizedFullname,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });
  } catch (err) {
    // 11000 is MongoDB's native code for unique constraint index violations
    if (err.code === 11000) {
      throw new ConflictError("Username or email is already taken.");
    }
    throw err;
  }
};

/**
 * Authenticates a user using their username or email and password.
 *
 * @param {Object} credentials
 * @param {string} credentials.username - Username or email.
 * @param {string} credentials.password - Plain-text password.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {UnauthorizedError} If the credentials are invalid.
 */
export const signInUser = async ({ username, password }) => {
  const identifier = username.trim().toLowerCase();

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  })
    .select("+password")
    .orFail(() => new UnauthorizedError("Invalid credentials."));

  if (!(await user.comparePassword(password))) {
    throw new UnauthorizedError("Invalid credentials.");
  }

  return user;
};

/**
 * Updates a user's profile picture.
 *
 * @param {string} userId - User ID.
 * @param {string} picPath - Path to the uploaded profile picture.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
export const uploadPic = (userId, picPath) => {
  return updateUser(userId, {
    $set: {
      profilePicture: picPath,
    },
  });
};

/**
 * Removes a user's custom profile picture and restores the default image.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
export const removePicture = (userId) => {
  return updateUser(userId, {
    $set: {
      profilePicture: DEFAULT_PROFILE_PICTURE,
    },
  });
};

/**
 * Updates a user's profile information.
 *
 * @param {string} userId - User ID.
 * @param {string} [biotext] - Updated user biography.
 * @param {string} [gender] - Updated user gender.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {ValidationError} If no profile fields are provided.
 * @throws {NotFoundError} If the user does not exist.
 */
export const editProfile = (userId, biotext, gender) => {
  const updateData = {
    ...(biotext !== undefined && { biotext: biotext.trim() }),
    ...(gender !== undefined && { gender }),
  };

  if (!Object.keys(updateData).length) {
    throw new ValidationError("No profile data provided.");
  }

  return updateUser(userId, {
    $set: updateData,
  });
};

/**
 * Finds a user by ID.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<Object>} The user document as a plain JavaScript object.
 * @throws {NotFoundError} If the user does not exist.
 */
export const findUserById = (userId) => {
  return User.findById(userId)
    .lean()
    .orFail(() => new NotFoundError("User not found."));
};

/**
 * Stores a hashed refresh token for a user.
 *
 * Removes any expired refresh tokens and replaces any existing
 * identical hashed token before appending the new one. When a
 * MongoDB session is provided, the operation participates in
 * the caller's transaction.
 *
 * @param {string} userId - User ID.
 * @param {string} hashedToken - SHA-256 hash of the refresh token.
 * @param {Date} expiresAt - Refresh token expiration date.
 * @param {import("mongoose").ClientSession|null} [session=null] - Optional MongoDB transaction session.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
export const saveRefreshToken = async (
  userId,
  hashedToken,
  expiresAt,
  session = null,
) => {
  const now = new Date();

  return User.findByIdAndUpdate(
    userId,
    [
      {
        $set: {
          refreshTokens: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ["$refreshTokens", []] },
                  as: "token",
                  cond: {
                    $and: [
                      { $gt: ["$$token.expiresAt", now] }, // Keep only unexpired tokens
                      { $ne: ["$$token.hashedToken", hashedToken] }, // Filter out target token if it already exists
                    ],
                  },
                },
              },
              [
                {
                  hashedToken,
                  expiresAt,
                  createdAt: now,
                },
              ],
            ],
          },
        },
      },
    ],
    { new: true, session },
  ).orFail(() => new NotFoundError("User not found."));
};

/**
 * Removes a specific refresh token for a user.
 *
 * Used during refresh token rotation and logout. When a MongoDB
 * session is provided, the operation participates in the caller's
 * transaction.
 *
 * @param {string} userId - User ID.
 * @param {string} hashedToken - SHA-256 hash of the refresh token.
 * @param {import("mongoose").ClientSession|null} [session=null] - Optional MongoDB transaction session.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
export const removeRefreshToken = (userId, hashedToken, session = null) => {
  return updateUser(
    userId,
    {
      $pull: {
        refreshTokens: {
          hashedToken,
        },
      },
    },
    { session },
  );
};

/**
 * Removes all refresh tokens for a user.
 *
 * Intended for security-sensitive operations such as
 * "Logout from all devices", password changes,
 * or forced session invalidation.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {NotFoundError} If the user does not exist.
 */
export const removeAllRefreshTokens = (userId) => {
  return updateUser(userId, {
    $set: {
      refreshTokens: [],
    },
  });
};

/**
 * Finds a user by a valid stored refresh token.
 *
 * Returns the user only if the provided hashed refresh token
 * exists in the user's stored refresh tokens and has not expired.
 * When a MongoDB session is provided, the query participates
 * in the caller's transaction.
 *
 * @param {string} userId - User ID.
 * @param {string} hashedToken - SHA-256 hash of the refresh token.
 * @param {import("mongoose").ClientSession|null} [session=null] - Optional MongoDB transaction session.
 * @returns {Promise<import("../models/user.model.js").default>}
 * @throws {UnauthorizedError} If the refresh token is invalid or has expired.
 */
export const findRefreshToken = (userId, hashedToken, session = null) => {
  return User.findOne({
    _id: userId,
    refreshTokens: {
      $elemMatch: {
        hashedToken,
        expiresAt: { $gt: new Date() },
      },
    },
  })
    .session(session)
    .select("+refreshTokens")
    .orFail(() => new UnauthorizedError("Invalid refresh token."));
};
