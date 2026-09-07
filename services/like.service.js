// Dependencies
import mongoose from "mongoose";

// Models
import Like from "../models/like.model.js";
import Post from "../models/post.model.js";

// Errors
import ValidationError from "../errors/validation.error.js";
import NotFoundError from "../errors/notFound.error.js";
import ConflictError from "../errors/conflict.error.js";

/**
 * Adds a like to a post.
 *
 * Creates a like for the specified user and atomically increments
 * the post's like count within a MongoDB transaction.
 *
 * @param {string} postId - Post ID.
 * @param {string} userId - User ID.
 * @returns {Promise<import("../models/like.model.js").default>}
 * @throws {ValidationError} If the post ID or user ID is invalid.
 * @throws {NotFoundError} If the post does not exist.
 * @throws {ConflictError} If the user has already liked the post.
 */
export const addLike = async (postId, userId) => {
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new ValidationError("Invalid post or user ID structure.");
  }

  const session = await mongoose.startSession();

  let like;

  try {
    await session.withTransaction(async () => {
      await Post.findById(postId)
        .session(session)
        .orFail(() => new NotFoundError("Post not found."));

      try {
        [like] = await Like.create([{ postId, userId }], { session });
      } catch (error) {
        if (error?.code === 11000) {
          throw new ConflictError("Post already liked.");
        }
        throw error;
      }

      await Post.findByIdAndUpdate(
        postId,
        { $inc: { likeCount: 1 } },
        { session, runValidators: true },
      ).orFail(() => new NotFoundError("Post not found."));
    });

    return like;
  } finally {
    await session.endSession();
  }
};

/**
 * Removes a user's like from a post.
 *
 * Deletes the user's like and atomically decrements the post's
 * like count within a MongoDB transaction.
 *
 * @param {string} postId - Post ID.
 * @param {string} userId - User ID.
 * @returns {Promise<boolean>}
 * @throws {ValidationError} If the post ID or user ID is invalid.
 * @throws {NotFoundError} If the like or post does not exist.
 */
export const removeLike = async (postId, userId) => {
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    throw new ValidationError("Invalid post or user ID structure.");
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Like.findOneAndDelete({ postId, userId })
        .session(session)
        .orFail(() => new NotFoundError("Like not found."));

      await Post.findByIdAndUpdate(
        postId,
        { $inc: { likeCount: -1 } },
        { runValidators: true, session },
      ).orFail(() => new NotFoundError("Post not found."));
    });

    return true;
  } finally {
    await session.endSession();
  }
};

/**
 * Retrieves all likes for a specific post.
 *
 * Returns an empty array if the post ID is invalid.
 *
 * @param {string} postId - Post ID.
 * @returns {Promise<Object[]>} Array of like documents as plain JavaScript objects.
 */
export const getLikesForPost = (postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) return [];
  return Like.find({ postId }).lean();
};

/**
 * Counts the total number of likes for a post.
 *
 * Returns 0 if the post ID is invalid.
 *
 * @param {string} postId - Post ID.
 * @returns {Promise<number>}
 */
export const getLikeCount = (postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) return 0;
  return Like.countDocuments({ postId });
};

/**
 * Checks whether a user has liked a specific post.
 *
 * Returns false if either ID is invalid.
 *
 * @param {string} postId - Post ID.
 * @param {string} userId - User ID.
 * @returns {Promise<boolean>}
 */
export const hasUserLiked = async (postId, userId) => {
  if (
    !mongoose.Types.ObjectId.isValid(postId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return false;
  }
  return Boolean(await Like.exists({ postId, userId }));
};

/**
 * Retrieves the IDs of all posts liked by a user.
 *
 * Returns an empty array if the user ID is invalid.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<string[]>}
 */
export const getUserLikes = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];

  const postIds = await Like.find({ userId }).distinct("postId");

  return postIds.map((id) => id.toString());
};
