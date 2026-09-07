// Dependencies
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path from "path";

// Utils
import ValidationError from "../errors/validation.error.js";

/**
 * Creates a configurable Multer upload middleware.
 *
 * @param {Object} options - Upload middleware configuration.
 * @param {string} options.folder - Upload subfolder inside /uploads.
 * @param {string[]} options.allowedTypes - Allowed media type prefixes such as ["image", "video"].
 * @param {number} options.maxSize - Maximum file size in bytes.
 * @returns {import("multer").Multer} Configured Multer instance.
 */
export default function createUploadMiddleware({
  folder,
  allowedTypes,
  maxSize,
}) {
  if (
    typeof folder !== "string" ||
    !Array.isArray(allowedTypes) ||
    allowedTypes.length === 0 ||
    typeof maxSize !== "number"
  ) {
    throw new Error("createUploadMiddleware requires { folder, allowedTypes, maxSize }.");
  }

  const uploadDir = path.join(process.cwd(), "uploads", folder);

  const storage = multer.diskStorage({
    destination(_req, _file, cb) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },

    filename(_req, file, cb) {
      try {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();

        cb(null, `${timestamp}-${crypto.randomUUID()}${ext}`);
      } catch (error) {
        cb(error);
      }
    },
  });

  const fileFilter = (_req, file, cb) => {
    const isAllowed = allowedTypes.some((type) =>
      file.mimetype.toLowerCase().startsWith(`${type.toLowerCase()}/`),
    );
    if (isAllowed) {
      return cb(null, true);
    }
    return cb(
      new ValidationError(`Only ${allowedTypes.join(", ")} files are allowed.`),
      false,
    );
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
    },
  });
  
}
