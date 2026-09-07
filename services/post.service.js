// Dependencies
import mongoose from "mongoose";

// Models
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Like from "../models/like.model.js";

//Errors
import NotFoundError from "../errors/notfound.error.js";

/**
 * Creates a new post.
 *
 * @param {string} userId - ID of the user creating the post.
 * @param {string} path - Path to the uploaded media file.
 * @param {string} type - Media type (for example, "image" or "video").
 * @param {string} caption - Post caption.
 * @returns {Promise<import("../models/post.model.js").default>}
 */
export const createPost = (userId, path, type, caption) => {
  return Post.create({
    userId,
    postData: {
      path,
      type,
      caption,
    },
  });
};

/**
 * Retrieves all posts sorted by newest first.
 *
 * Populates the post owner's username and profile picture.
 *
 * @returns {Promise<Object[]>} Array of posts as plain JavaScript objects.
 */
export const getAllPosts = () => {
  return Post.find()
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Retrieves all posts created by a specific user.
 *
 * Populates the post owner's username and profile picture.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<Object[]>} Array of posts as plain JavaScript objects.
 */
export const getPostsByUser = (userId) => {
  return Post.find({ userId })
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Finds a post by its ID.
 *
 * Populates the post owner's username and profile picture.
 *
 * @param {string} postId - Post ID.
 * @returns {Promise<import("../models/post.model.js").default>}
 * @throws {NotFoundError} If the post does not exist.
 */
export const findPostById = (postId) => {
  return Post.findById(postId)
    .populate("userId", "username profilePicture")
    .orFail(() => new NotFoundError("Post not found."));
};

/**
 * Deletes a post along with all its associated likes and comments.
 *
 * @param {string} postId - Post ID.
 * @returns {Promise<import("../models/post.model.js").default>}
 * @throws {NotFoundError} If the post does not exist.
 */
export const deletePost = async (postId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await Post.findByIdAndDelete(postId)
        .session(session)
        .orFail(() => new NotFoundError("Post not found."));

      await Like.deleteMany({ postId }).session(session);

      await Comment.deleteMany({ postId }).session(session);
    });

    return true;
  } finally {
    await session.endSession();
  }
};

/**
 * Updates a post's media information.
 *
 * @param {string} postId - Post ID.
 * @param {Object} updatedData - Updated post data.
 * @param {string} updatedData.path - Path to the media file.
 * @param {string} updatedData.type - Media type.
 * @param {string} updatedData.caption - Post caption.
 * @returns {Promise<import("../models/post.model.js").default>}
 * @throws {NotFoundError} If the post does not exist.
 */
export const updatePost = (postId, updatedData) => {
  return Post.findByIdAndUpdate(
    postId,
    { $set: { postData: updatedData } },
    { new: true, runValidators: true },
  ).orFail(() => new NotFoundError("Post not found."));
};
