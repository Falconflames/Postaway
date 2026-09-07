// Constants
import { UPLOAD_FOLDERS, FILE_TYPES, FILE_SIZE } from "../constants/upload.js";

// Middlewares
import createUploadMiddleware from "./createUpload.middleware.js";

/**
 * Multer middleware configured for post media uploads.
 * Accepts images and videos and stores them in the posts upload directory.
 */
const postUpload = createUploadMiddleware({
  folder: UPLOAD_FOLDERS.POSTS,
  allowedTypes: [FILE_TYPES.IMAGE, FILE_TYPES.VIDEO],
  maxSize: FILE_SIZE.POST_VIDEO,
});

export default postUpload;