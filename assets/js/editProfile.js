/**
 * Initializes client-side interactions for the profile page.
 *
 * Handles:
 * - Profile picture selection, upload, removal, and modal state.
 * - Profile bio and gender updates.
 * - Bio character and line-count validation.
 * - Profile form submission and feedback messages.
 */
document.addEventListener("DOMContentLoaded", () => {
  const profileImageBtn = document.querySelector(".profile-image-btn");
  const changePicBtn = document.querySelector("#change-pic-btn");
  const editBg = document.querySelector(".edit-bg");
  const editImage = document.querySelector(".edit-pic");
  const cancelBtn = document.querySelector(".cancel-btn");
  const uploadBtn = document.querySelector(".upload-btn");
  const fileInput = document.querySelector("#fileInput");
  const uploadForm = document.querySelector("#uploadForm");
  const removeBtn = document.querySelector(".remove-btn");
  const profilePic = document.querySelector("#profile-pic");
  const textarea = document.getElementById("bio-text");
  const charCountDisplay = document.getElementById("char-count");
  const lineCountDisplay = document.getElementById("line-count");
  const submitButton = document.querySelector("#save-profile");
  const defaultImage = "/assets/NoProfileImage.jpg";

  // ------------------------------------------------------------
  // Profile picture modal
  // ------------------------------------------------------------

  /**
   * Opens the profile picture upload interface.
   *
   * If the default profile picture is displayed, the file picker
   * is opened directly. Otherwise, the profile picture edit modal
   * and its backdrop are displayed and page scrolling is disabled.
   *
   * @returns {void}
   */
  const uploadImg = function () {
    const currentImageSrc = document
      .querySelector(".profile-image-btn img")
      .getAttribute("src");

    if (currentImageSrc === defaultImage) {
      fileInput.click();
    } else {
      editImage.classList.add("active");
      editBg.classList.add("active");
      document.body.classList.add("no-scroll");
    }
  };
  changePicBtn.addEventListener("click", uploadImg);
  profileImageBtn.addEventListener("click", uploadImg);

  /**
   * Closes the profile picture edit interface and restores
   * normal page scrolling.
   *
   * @returns {void}
   */
  const hideProfileImageModal = function () {
    editImage.classList.remove("active");
    editBg.classList.remove("active");
    document.body.classList.remove("no-scroll");
  };

  cancelBtn.addEventListener("click", hideProfileImageModal);
  editBg.addEventListener("click", hideProfileImageModal);

  // --------------------------------------------------
  // Profile picture upload
  // --------------------------------------------------

  uploadBtn.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", ({ target }) => {
    const file = target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showFlashMessage("error", "Please select a valid image.");
      target.value = "";
      return;
    }
    uploadForm.requestSubmit();
  });

  // --------------------------------------------------
  // Remove profile picture
  // --------------------------------------------------

  /**
   * Removes the authenticated user's profile picture.
   *
   * Sends a DELETE request to the profile-picture endpoint and,
   * on success, replaces the current profile picture with the
   * default image and closes the edit interface.
   *
   * @returns {Promise<void>}
   */
  const removePic = async function () {
    const currentImage = document.querySelector(".profile-image-btn img");
    const currentImageSrc = currentImage?.getAttribute("src");

    if (!currentImage || currentImageSrc === defaultImage) {
      return;
    }

    try {
      const response = await fetch("/removeProfilePicture", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        if (profilePic) {
          profilePic.src = defaultImage;
          profilePic.alt = "profile-pic";
        }

        editImage.classList.remove("active");
        editBg.classList.remove("active");
        showFlashMessage("success", "Profile picture removed successfully!");
      } else {
        console.error("❌ Failed to remove profile picture:", result.message);
        showFlashMessage(
          "error",
          result.message || "Failed to remove profile picture.",
        );
      }
    } catch (error) {
      console.error("❌ Error:", error);
      showFlashMessage("error", "Something went wrong. Please try again.");
    }
  };
  removeBtn.addEventListener("click", removePic);

  // --------------------------------------------------
  // Profile update
  // --------------------------------------------------

  /**
   * Updates the user's profile information.
   *
   * Sends the current bio text and selected gender to the server.
   * Displays a success or error message based on the server response.
   *
   * @returns {Promise<void>}
   */
  const updateProfile = async () => {
    const biotext = textarea.value.trim();
    const gender = document.getElementById("gender").value;

    try {
      const response = await fetch("/editprofile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          biotext,
          gender,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showFlashMessage("success", "Profile updated successfully!");
        setTimeout(() => {
          window.location.href = result.redirectTo || "/profile";
        }, 1000);
      } else {
        showFlashMessage(
          "error",
          result.message || "Failed to update profile.",
        );
      }
    } catch (err) {
      console.error("Update error:", err);
      showFlashMessage(
        "error",
        "An error occurred while updating your profile.",
      );
    }
  };
  submitButton.addEventListener("click", updateProfile);

  // --------------------------------------------------
  // Bio validation
  // --------------------------------------------------

  /**
   * Validates and displays the profile bio length constraints.
   *
   * Updates the character and line counters and disables profile
   * submission when the bio exceeds either configured limit.
   * The textarea and counters are visually updated to reflect
   * the current validation state.
   *
   * @returns {void}
   */

  const MAX_LINES = 7;
  const MAX_CHARS = 150;

  const updateCounts = () => {
    const text = textarea.value;

    const lineCount = text.split(/\r?\n/).length;
    const charCount = text.length;

    const exceedsLineLimit = lineCount > MAX_LINES;
    const exceedsCharLimit = charCount > MAX_CHARS;
    const isInvalid = exceedsLineLimit || exceedsCharLimit;

    lineCountDisplay.textContent = `${lineCount}/${MAX_LINES}`;
    charCountDisplay.textContent = `${charCount}/${MAX_CHARS}`;

    lineCountDisplay.classList.toggle("invalid", exceedsLineLimit);

    charCountDisplay.classList.toggle("invalid", exceedsCharLimit);

    textarea.classList.toggle("invalid", isInvalid);

    submitButton.disabled = isInvalid;
  };

  updateCounts();
  textarea.addEventListener("input", updateCounts);
});
