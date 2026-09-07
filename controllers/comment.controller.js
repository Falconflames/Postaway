// Third-party
import { body, validationResult } from "express-validator";

// Services
import {
  getCommentsForPost,
  createComment,
  updateCommentForPost,
  deleteCommentForPost,
} from "../services/comment.service.js";

// Utils
import asyncHandler from "../utils/asyncHandler.js";

// Errors
import ValidationError from "../errors/validation.error.js";
import UnauthorizedError from "../errors/unauthorized.error.js";

/**
 * Controller responsible for retrieving,
 * creating, updating, and deleting
 * post comments.
 */

class CommentController {
  /**
   * Retrieves all comments for the specified post.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  getComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const comments = await getCommentsForPost(postId);

    return res.status(200).json({
      success: true,
      comments,
    });
  });

  /**
   * Express-validator middleware used to validate
   * comment text.
   *
   * @type {import("express-validator").ValidationChain[]}
   */
  commentValidation = [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment cannot be empty.")
      .isLength({ max: 500 })
      .withMessage("Comment must be 500 characters or less."),
  ];

  /**
   * Creates a new comment for the specified post.
   *
   * Validates the submitted comment text and
   * associates the new comment with the
   * authenticated user.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {UnauthorizedError} If the user is not authenticated.
   * @throws {ValidationError} If the submitted comment is invalid.
   * @returns {Promise<void>}
   */
  createComment = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    if (!userId) {
      throw new UnauthorizedError(
        "Authentication timeout. Please sign in again.",
      );
    }

    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const [firstError] = validationErrors.array();
      throw new ValidationError(firstError.msg);
    }

    const { postId } = req.params;
    const { text } = req.body;

    const newComment = await createComment(postId, userId, text);
    return res.status(201).json({
      success: true,
      comment: newComment,
      message: "Comment added successfully.",
    });
  });

  /**
   * Updates an existing comment belonging to
   * the authenticated user.
   *
   * Validates the submitted comment text
   * before updating the comment.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {UnauthorizedError} If the user is not authenticated.
   * @throws {ValidationError} If the submitted comment is invalid.
   * @returns {Promise<void>}
   */
  updateComment = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    if (!userId) {
      throw new UnauthorizedError(
        "Authentication timeout. Please sign in again.",
      );
    }

    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      const [firstError] = validationErrors.array();
      throw new ValidationError(firstError.msg);
    }

    const { commentId } = req.params;
    const { text } = req.body;

    const updatedComment = await updateCommentForPost(commentId, userId, text);

    return res.status(200).json({
      success: true,
      comment: updatedComment,
      message: "Comment updated successfully.",
    });
  });

  /**
   * Deletes a specified comment owned by
   * the authenticated user.
   *
   * Removes the comment and returns
   * success response.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {UnauthorizedError} If the user is not authenticated.
   * @returns {Promise<void>}
   */
  deleteComment = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    if (!userId) {
      throw new UnauthorizedError(
        "Authentication timeout. Please sign in again.",
      );
    }

    const { commentId } = req.params;

    await deleteCommentForPost(commentId, userId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  });
}

export default new CommentController();
