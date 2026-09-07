// Constants
import { FILE_SIZE } from "../constants/upload.js";

// Util
import { deleteFile } from "../utils/deleteFile.js";

/**
 * Validates uploaded post media against type-specific size limits.
 * Deletes invalid uploads before forwarding an error to Express.
 *
 * @param {import("express").Request} req - Express request object.
 * @param {import("express").Response} _res - Express response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 */
export default async function validatePostUpload(req, _res, next) {
  const file = req.file;

  if (!file) {
    return next();
  }

  const isImage = file.mimetype.startsWith("image/");
  const isVideo = file.mimetype.startsWith("video/");

  if (!isImage && !isVideo) {
    await deleteFile(file.path);
    return next(new Error("Invalid file type."));
  }

  const maxSize = isImage ? FILE_SIZE.POST_IMAGE : FILE_SIZE.POST_VIDEO;

  if (file.size > maxSize) {
    await deleteFile(file.path);

    return next(
      new Error(
        `File exceeds the maximum allowed size of ${Math.floor(
          maxSize / (1024 * 1024),
        )}MB.`,
      ),
    );
  }

  return next();
}
