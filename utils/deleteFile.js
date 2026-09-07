import fs from "fs";
import path from "path";

/**
 * Deletes a file from the local filesystem.
 *
 * Resolves the provided path relative to the
 * application root. Missing files are ignored,
 * while unexpected filesystem errors are logged.
 *
 * @param {string} filePath - Relative or absolute path to the file.
 * @returns {Promise<void>}
 */

export const deleteFile = async (filePath) => {
  if (!filePath) return;

  const absolutePath = path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ""));

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(error);
    }
  }
};
