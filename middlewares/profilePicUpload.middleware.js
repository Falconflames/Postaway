// Constants
import { UPLOAD_FOLDERS, FILE_TYPES, FILE_SIZE } from "../constants/upload.js";

// Middlewares
import createUploadMiddleware from "./createUpload.middleware.js";

/**
 * Multer middleware configured for profile picture uploads.
 * Accepts image files and stores them in the profilePictures upload directory.
 */
const profilePictureUpload = createUploadMiddleware({
  folder: UPLOAD_FOLDERS.PROFILE_PICTURES,
  allowedTypes: [FILE_TYPES.IMAGE],
  maxSize: FILE_SIZE.PROFILE_PICTURE,
});

export default profilePictureUpload;