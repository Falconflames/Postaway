/**
 * Upload-related constants used throughout the application.
 *
 * Includes supported file types, upload directories,
 * default assets, and maximum allowed file sizes.
 */

/**
 * Supported upload file categories.
 *
 * @readonly
 */

export const FILE_TYPES = Object.freeze({
  IMAGE: "image",
  VIDEO: "video",
});

/**
 * Upload directory names used for storing
 * application files.
 *
 * @readonly
 */

export const UPLOAD_FOLDERS = Object.freeze({
  POSTS: "posts",
  PROFILE_PICTURES: "profilePictures",
});

/**
 * Maximum allowed upload sizes in bytes.
 *
 * @readonly
 */

export const FILE_SIZE = Object.freeze({
  PROFILE_PICTURE: 10 * 1024 * 1024,
  POST_IMAGE: 50 * 1024 * 1024,
  POST_VIDEO: 100 * 1024 * 1024,
});

/**
 * Default profile picture displayed when a user
 * has not uploaded a custom profile picture.
 */

export const DEFAULT_PROFILE_PICTURE = "/assets/NoProfileImage.jpg";
