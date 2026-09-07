// Dependencies
import mongoose from "mongoose";

// Models
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";

// Error
import NotFoundError from "../errors/notfound.error.js";
import ValidationError from "../errors/validation.error.js";
import ForbiddenError from "../errors/forbidden.error.js";

/**
 * Retrieves all comments sorted by newest first.
 *
 * Populates each comment's author with their username and profile picture.
 *
 * @returns {Promise<Object[]>} Array of comments as plain JavaScript objects.
 */
export const getAllComments = () => {
  return Comment.find()
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Retrieves all comments for a specific post.
 *
 * Populates each comment's author with their username and profile picture.
 *
 * @param {string} postId - Post ID.
 * @returns {Promise<Object[]>} Array of comments as plain JavaScript objects.
 * @throws {ValidationError} If the post ID is invalid.
 */
export const getCommentsForPost = (postId) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ValidationError("Invalid post ID.");
  }

  return Comment.find({ postId })
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Retrieves comments for multiple posts in a single query.
 *
 * This bulk utility avoids N+1 database queries when loading
 * comments for a feed containing multiple posts.
 *
 * Invalid post IDs are ignored. Returns an empty array if no
 * valid post IDs are provided.
 *
 * @param {string[]} postIds - Array of post IDs.
 * @returns {Promise<Object[]>} Array of comments as plain JavaScript objects.
 */
export const getCommentsForMultiplePosts = async (postIds) => {
  if (!Array.isArray(postIds) || postIds.length === 0) return [];

  const sanitizedPostIds = postIds.filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (sanitizedPostIds.length === 0) return [];

  return Comment.find({ postId: { $in: sanitizedPostIds } })
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Creates a new comment on a post.
 *
 * Verifies that the target post exists before creating the comment
 * and populates the comment author's username before returning.
 *
 * @param {string} postId - Post ID.
 * @param {string} userId - User ID.
 * @param {string} text - Comment text.
 * @returns {Promise<import("../models/comment.model.js").default>}
 * @throws {ValidationError} If the post ID is invalid or the comment text is empty.
 * @throws {NotFoundError} If the target post does not exist.
 */
export const createComment = async (postId, userId, text) => {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ValidationError("Invalid post ID.");
  }

  if (!text || !text.trim()) {
    throw new ValidationError("Comment text cannot be empty.");
  }

  await Post.findById(postId).orFail(
    () => new NotFoundError("Cannot comment on a non-existent post."),
  );

  const newComment = await Comment.create({
    postId,
    userId,
    text: text.trim(),
  });

  return await newComment.populate("userId", "username");
};

/**
 * Deletes a comment owned by the specified user.
 *
 * @param {string} commentId - Comment ID.
 * @param {string} userId - User ID.
 * @returns {Promise<boolean>}
 * @throws {ValidationError} If the comment ID is invalid.
 * @throws {NotFoundError} If the comment does not exist.
 * @throws {ForbiddenError} If the user does not own the comment.
 */
export const deleteCommentForPost = async (commentId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ValidationError("Invalid comment ID format.");
  }

  const comment = await Comment.findById(commentId).orFail(
    () => new NotFoundError("Comment not found."),
  );

  if (!comment.userId.equals(userId)) {
    throw new ForbiddenError(
      "You do not have permission to delete this comment.",
    );
  }

  await comment.deleteOne();
  return true;
};

/**
 * Updates the text of a comment owned by the specified user.
 *
 * @param {string} commentId - Comment ID.
 * @param {string} userId - User ID.
 * @param {string} updatedText - Updated comment text.
 * @returns {Promise<import("../models/comment.model.js").default>}
 * @throws {ValidationError} If the comment ID is invalid or the updated text is empty.
 * @throws {NotFoundError} If the comment does not exist.
 * @throws {ForbiddenError} If the user does not own the comment.
 */
export const updateCommentForPost = async (commentId, userId, updatedText) => {
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ValidationError("Invalid comment ID format.");
  }

  if (!updatedText || !updatedText.trim()) {
    throw new ValidationError("Comment text cannot be empty.");
  }
  const comment = await Comment.findById(commentId).orFail(
    () => new NotFoundError("Comment not found."),
  );

  if (!comment.userId.equals(userId)) {
    throw new ForbiddenError(
      "You do not have permission to modify this comment.",
    );
  }

  comment.text = updatedText.trim();
  await comment.save();
  return comment;
};
