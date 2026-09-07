// Services
import {
  getLikeCount,
  addLike,
  removeLike,
  getLikesForPost,
  hasUserLiked,
} from "../services/like.service.js";

// Utils
import asyncHandler from "../utils/asyncHandler.js";

// Errors
import UnauthorizedError from "../errors/unauthorized.error.js";

/**
 * Controller responsible for retrieving post likes
 * and handling like and unlike actions.
 */

class LikeController {
  /**
   * Retrieves all likes for the specified post.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  getLikesForPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const likes = await getLikesForPost(postId);

    return res.status(200).json({
      success: true,
      likes,
    });
  });

  /**
   * Toggles the authenticated user's like status
   * for the specified post.
   *
   * Adds a like if the user has not already liked
   * the post, otherwise removes the existing like.
   * Returns the updated like status together
   * with the current total number of likes
   * for the post.
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @throws {UnauthorizedError} If the user is not authenticated.
   * @returns {Promise<void>}
   */
  toggleLike = asyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    if (!userId) {
      throw new UnauthorizedError(
        "Authentication timeout. Please sign in again.",
      );
    }

    const { postId } = req.params;

    const liked = await hasUserLiked(postId, userId);

    if (liked) {
      await removeLike(postId, userId);
    } else {
      await addLike(postId, userId);
    }

    const likeCount = await getLikeCount(postId);

    return res.status(200).json({
      success: true,
      liked: !liked,
      likeCount,
    });
  });
}

export default new LikeController();
