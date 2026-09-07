// Third-party
import { body, validationResult } from "express-validator";

// Constants
import { FILE_SIZE, DEFAULT_PROFILE_PICTURE } from "../constants/upload.js";

// Services
import {
  getAllPosts,
  findPostById,
  createPost,
  updatePost as updatePostInDB,
  deletePost as deletePostInDB,
} from "../services/post.service.js";
import { getUserLikes } from "../services/like.service.js";
import { getCommentsForMultiplePosts } from "../services/comment.service.js";

// Utils
import { deleteFile } from "../utils/deleteFile.js";
import { setFlash } from "../utils/setflash.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

// Errors
import NotFoundError from "../errors/notfound.error.js";
import ForbiddenError from "../errors/forbidden.error.js";
import ValidationError from "../errors/validation.error.js";

/**
 * Controller responsible for rendering posts,
 * uploading media, updating posts,
 * and deleting user posts.
 */

class PostController {
  /**
   * Renders the main posts feed for the authenticated user.
   *
   * Fetches all posts together with their comments,
   * profile pictures, and the authenticated user's likes.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */

  renderPosts = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;

    const [posts, userLikes] = await Promise.all([
      getAllPosts(),
      getUserLikes(userId),
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
      profilePicture: post.userId?.profilePicture || DEFAULT_PROFILE_PICTURE,
      comments: commentsMap[post._id.toString()] || [],
    }));

    return res.render("posts", {
      posts: postsWithComments,
      userLikes,
      pageCss: "posts.css",
      pageJs: "posts.js",
    });
  });

  /**
   * Express-validator middleware used to validate
   * post captions.
   *
   * @type {import("express-validator").ValidationChain[]}
   */

  captionValidation = [
    body("caption")
      .trim()
      .isLength({ max: 300 })
      .withMessage("Caption must be 300 characters or less."),
  ];

  /**
   * Uploads a new post for the authenticated user.
   *
   * Validates the uploaded media and caption,
   * creates the post, and removes uploaded files
   * if persistence fails.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {ValidationError} If the submitted caption is invalid.
   * @returns {Promise<void>}
   */

  uploadPost = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;

    if (!req.file) {
      setFlash(res, "error", "No file uploaded or unsupported file type.");
      return res.redirect("/posts");
    }

    if (
      req.file.mimetype.startsWith("image/") &&
      req.file.size > FILE_SIZE.POST_IMAGE
    ) {
      await deleteFile(req.file.path);
      setFlash(res, "error", "Post images must be smaller than 50 MB.");
      return res.redirect("/posts");
    }

    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      if (req.file) {
        await deleteFile(req.file.path);
      }
      const [firstError] = validationErrors.array();
      throw new ValidationError(firstError.msg);
    }
    const postPath = `/uploads/posts/${req.file.filename}`;
    const mimeType = req.file.mimetype.startsWith("image/") ? "image" : "video";
    const { caption } = req.body;

    try {
      await createPost(userId, postPath, mimeType, caption);
    } catch (error) {
      await deleteFile(req.file.path);
      setFlash(
        res,
        "error",
        error.message || "An unexpected error occurred while saving your post.",
      );
      return res.redirect("/posts");
    }
    setFlash(res, "success", "Post uploaded successfully!");
    return res.redirect("/posts");
  });

  /**
   * Updates an existing post belonging to the
   * authenticated user.
   *
   * Verifies ownership, validates the uploaded
   * media and caption, replaces the post content,
   * and removes the previous media file after
   * a successful update.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {ValidationError} If the submitted data is invalid.
   * @returns {Promise<void>}
   */

  updatePost = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { postId } = req.params;
    const post = await findPostById(postId);

    if (!post) {
      if (req.file) await deleteFile(req.file.path);
      setFlash(res, "error", "The post does not exist.");
      return res.redirect(req.body.returnTo || "/posts");
    }

    const postOwnerId = post.userId._id
      ? post.userId._id.toString()
      : post.userId.toString();

    if (postOwnerId !== userId.toString()) {
      if (req.file) await deleteFile(req.file.path);
      setFlash(res, "error", "Access Denied: You do not own this post.");

      logger.warn("Unauthorized attempt to update post.", {
        postId,
        userId,
        ownerId: postOwnerId,
      });
      return res.redirect(req.body.returnTo || "/posts");
    }

    if (!req.file) {
      setFlash(res, "error", "Please select an image or video.");
      return res.redirect(req.body.returnTo || "/posts");
    }

    if (
      req.file.mimetype.startsWith("image/") &&
      req.file.size > FILE_SIZE.POST_IMAGE
    ) {
      await deleteFile(req.file.path);
      setFlash(res, "error", "Images must be smaller than 50 MB.");
      return res.redirect(req.body.returnTo || "/posts");
    }

    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      if (req.file) {
        await deleteFile(req.file.path);
      }
      const [firstError] = validationErrors.array();
      throw new ValidationError(firstError.msg);
    }

    const postPath = `/uploads/posts/${req.file.filename}`;
    const mimeType = req.file.mimetype.startsWith("image/") ? "image" : "video";
    const { caption } = req.body;
    const oldPath = post.postData?.path;

    try {
      await updatePostInDB(postId, {
        path: postPath,
        type: mimeType,
        caption: caption,
      });
    } catch (error) {
      await deleteFile(req.file.path);
      throw error;
    }

    if (oldPath && oldPath !== postPath) {
      try {
        await deleteFile(`.${oldPath}`);
      } catch (err) {
        logger.warn("Failed deleting old post.", {
          path: oldPath,
          error: err.message,
        });
      }
    }

    setFlash(res, "success", "Post updated successfully!");

    return res.redirect(req.body.returnTo || "/posts");
  });

  /**
   * Deletes a post owned by the authenticated user.
   *
   * Removes the post from the database and
   * deletes its associated media file from storage.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {NotFoundError} If the post does not exist.
   * @throws {ForbiddenError} If the authenticated user does not own the post.
   * @throws {ValidationError} If the post cannot be deleted.
   * @returns {Promise<void>}
   */
  deletePost = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { postId } = req.params;

    const post = await findPostById(postId);

    if (!post) {
      throw new NotFoundError("The post does not exist.");
    }

    const postOwnerId = post.userId._id
      ? post.userId._id.toString()
      : post.userId.toString();

    if (postOwnerId !== userId.toString()) {
      throw new ForbiddenError("Access Denied: You do not own this post.");
    }

    const result = await deletePostInDB(postId);

    if (result.error) {
      throw new ValidationError(result.error);
    }

    if (post.postData?.path) {
      await deleteFile(`.${post.postData.path}`);
    }

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  });
}

export default new PostController();
