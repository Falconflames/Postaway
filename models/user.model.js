// Dependencies
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Constants
import { DEFAULT_PROFILE_PICTURE } from "../constants/upload.js";

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    profilePicture: {
      type: String,
      default: DEFAULT_PROFILE_PICTURE,
    },
    biotext: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "others"],
      default: "male",
    },
    refreshTokens: {
      type: [
        {
          hashedToken: {
            type: String,
            required: true,
          },
          expiresAt: {
            type: Date,
            required: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },

    methods: {
      /**
       * Compares a plain-text password with the user's hashed password.
       *
       * @param {string} plainPassword - Plain-text password.
       * @returns {Promise<boolean>} True if the password matches.
       */
      comparePassword(plainPassword) {
        return bcrypt.compare(plainPassword, this.password);
      },
    },

    statics: {
      /**
       * Generates a SHA-256 hash of a refresh token.
       *
       * @param {string} token - Plain-text refresh token.
       * @returns {string} SHA-256 hash of the refresh token.
       */
      hashRefreshToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
      },

      /**
       * Compares a plain-text refresh token against a stored SHA-256 hash
       * using a timing-safe comparison.
       *
       * @param {string} token - Plain-text refresh token.
       * @param {string} hashedToken - Stored SHA-256 hash.
       * @returns {boolean} True if the refresh token matches.
       */
      compareRefreshToken(token, hashedToken) {
        const hashed = crypto.createHash("sha256").update(token).digest("hex");
        return crypto.timingSafeEqual(
          Buffer.from(hashed),
          Buffer.from(hashedToken),
        );
      },
    },
  },
);

/**
 * Cost factor used for bcrypt password hashing.
 */
const BCRYPT_ROUNDS = 12;

/**
 * Hashes the user's password before saving if the password has been modified.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    next();
  } catch (err) {
    return next(err);
  }
});

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;
