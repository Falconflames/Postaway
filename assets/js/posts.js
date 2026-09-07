document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------
  const ALLOWED_MEDIA_TYPES = ["image/", "video/"];
  // ------------------------------------------------------------
  // Post DOM Elements
  // ------------------------------------------------------------
  const deletePostBtns = document.querySelectorAll(".delete");

  const cardHearts = document.querySelectorAll(".card-heart i");
  const likeBtns = document.querySelectorAll(".like");

  const cardImages = document.querySelectorAll(".card-img");
  const cardVideos = document.querySelectorAll(".card-video");

  const commentBtns = document.querySelectorAll(".comment");
  const commentContainers = document.querySelectorAll(".comment-container");

  // ------------------------------------------------------------
  // Post Update DOM Elements
  // ------------------------------------------------------------
  const updateBtns = document.querySelectorAll(".select-file-btn");
  const updateInputs = document.querySelectorAll(".post-update-input");
  const updateCaptionInputs = document.querySelectorAll(".caption-input");
  const updatePreviewContainers =
    document.querySelectorAll(".preview-container");
  const submitUpdateBtns = document.querySelectorAll(".submit-update-btn");
  const updateForms = document.querySelectorAll(".updatePost-form");
  const closePreviews = document.querySelectorAll(".close-preview");

  // ------------------------------------------------------------
  // Comment Modal DOM Elements
  // ------------------------------------------------------------
  const commentBgs = document.querySelectorAll(".comment-bg");
  const commentBgOverlays = document.querySelectorAll(".comment-bg-bg");
  const closeComments = document.querySelectorAll(".close-comment");

  const postBtn = document.querySelector(".post-btn");
  const createPostBtn = document.querySelector("#createPostBtn");
  const uploadFileInput = document.querySelector("#uploadFileInput");
  const uploadPreviewContainer = document.querySelector(
    "#uploadPreviewContainer",
  );
  const uploadClosePreview = document.querySelector("#uploadClosePreview");
  const uploadCaptionInput = document.querySelector("#uploadCaptionInput");
  const uploadPostForm = document.querySelector("#uploadPost-form");

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  /**
   * Safely parses an HTTP response as JSON when the response
   * contains a JSON content type.
   *
   * Returns a standardized error object when the server returns
   * an unexpected non-JSON response.
   *
   * @param {Response} response - The HTTP response to parse.
   * @returns {Promise<Object>} Parsed JSON response or a standardized error object.
   */
  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return {
      success: false,
      message: "Unexpected server response.",
    };
  };

  // ------------------------------------------------------------
  // Post Preview
  // ------------------------------------------------------------

  /**
   * Resets the post media preview UI.
   *
   * Clears the selected file and preview content, hides the
   * associated controls, and restores page scrolling.
   *
   * @param {HTMLInputElement} input - File input element.
   * @param {HTMLElement} preview - Preview container.
   * @param {HTMLElement|null} caption - Caption input.
   * @param {HTMLButtonElement|null} button - Submit button.
   * @param {HTMLElement|null} close - Close preview button.
   * @returns {void}
   */
  const resetPreview = (input, preview, caption, button, close) => {
    preview?.replaceChildren();
    preview?.classList.remove("active");

    caption?.classList.remove("active");
    button?.classList.remove("active");
    close?.classList.remove("active");

    if (input) {
      input.value = "";
    }
    document.body.classList.remove("no-scroll");
  };

  /**
   * Displays a preview of the selected image or video
   * and updates the related upload UI.
   *
   * Hides the preview when no file is selected and
   * validates the selected file type before rendering.
   *
   * @param {HTMLInputElement} input File input element.
   * @param {HTMLElement} preview Preview container.
   * @param {HTMLElement} caption Caption textarea.
   * @param {HTMLButtonElement} button Submit button.
   * @param {HTMLElement} close Close preview button.
   */
  const mediaPreview = (input, preview, caption, button, close) => {
    if (!input || !preview) {
      return;
    }

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resetPreview(input, preview, caption, button, close);
        return;
      }

      const isAllowedType = ALLOWED_MEDIA_TYPES.some((type) =>
        file.type.startsWith(type),
      );

      if (!isAllowedType) {
        showFlashMessage("error", "Only image and video files are allowed!");

        input.value = "";
        return;
      }

      preview.replaceChildren();

      const objectUrl = URL.createObjectURL(file);

      if (file.type.startsWith("image/")) {
        const image = document.createElement("img");

        image.src = objectUrl;
        image.alt = "Post preview";

        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };

        preview.appendChild(image);
      } else {
        const video = document.createElement("video");

        video.src = objectUrl;
        video.controls = true;

        video.onloadeddata = () => {
          URL.revokeObjectURL(objectUrl);
        };

        video.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };

        preview.appendChild(video);
      }
      preview.classList.add("active");
      caption?.classList.add("active");
      button?.classList.add("active");
      close?.classList.add("active");

      document.body.classList.add("no-scroll");
    });
  };

  /**
   * Deletes the selected post.
   *
   * Removes the post from the DOM after
   * a successful server response.
   *
   * @param {MouseEvent} e
   * @returns {Promise<void>}
   */
  const deletePostLocks = new Set();

  const deletePost = async function (e) {
    const button = e.currentTarget;
    const postId = button.dataset.postId;

    if (!postId) {
      showFlashMessage("error", "Unable to delete the post.");
      return;
    }

    if (deletePostLocks.has(postId)) {
      return;
    }

    deletePostLocks.add(postId);
    button.disabled = true;

    try {
      const response = await fetch(`/deletePost/${postId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || !result.success) {
        showFlashMessage("error", result.message || "Failed to remove post.");
        return;
      }

      const postCard = button.closest(".card");
      const commentModal = document.querySelector(
        `.comment-bg-bg[data-post-id="${postId}"]`,
      );
      commentModal?.remove();
      postCard?.remove();

      showFlashMessage("success", "Post removed successfully!");
    } catch (error) {
      showFlashMessage("error", "Something went wrong. Please try again.");
    } finally {
      deletePostLocks.delete(postId);
      button.disabled = false;
    }
  };

  // ------------------------------------------------------------
  // Likes
  // ------------------------------------------------------------

  const likeLocks = new Set();
  /**
   * Toggles the authenticated user's like status for a post.
   *
   * When `likeOnly` is enabled, the action only adds a like
   * and does nothing if the post is already liked.
   *
   * @param {HTMLElement} likeButton - Like button element.
   * @param {boolean} [likeOnly=false] - Whether to only add a like.
   * @returns {Promise<void>}
   */
  const toggleLike = async (likeButton, likeOnly = false) => {
    if (!likeButton) return;

    const postId = likeButton.dataset.postId;

    if (!postId) {
      return;
    }

    if (likeLocks.has(postId)) {
      return;
    }

    const heartIcon = likeButton.querySelector("i");

    if (!heartIcon) {
      return;
    }

    const isLiked = heartIcon.classList.contains("fa-solid");

    if (likeOnly && isLiked) {
      return;
    }

    likeLocks.add(postId);

    likeButton.disabled = true;

    try {
      const response = await fetch(`/toggle/${postId}`, {
        method: "PATCH",
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || !result.success) {
        showFlashMessage("error", result.message || "Failed to update like.");
        return;
      }

      heartIcon.classList.toggle("fa-solid", result.liked);
      heartIcon.classList.toggle("fa-regular", !result.liked);
      heartIcon.classList.toggle("liked", result.liked);

      const likeCountElement = document.querySelector(`#like-count-${postId}`);

      if (likeCountElement) {
        likeCountElement.textContent = result.likeCount;
      }
    } catch (error) {
      showFlashMessage("error", "Something went wrong. Please try again.");
    } finally {
      likeLocks.delete(postId);

      likeButton.disabled = false;
    }
  };

  /**
   * Registers double-click like behavior for a post media element.
   *
   * Displays the like animation and adds a like when the post
   * is not already liked.
   *
   * @param {HTMLElement} element - Post media element.
   * @param {number} index - Index of the corresponding like button.
   * @returns {void}
   */
  const handleDoubleClickLike = (element, index) => {
    if (!element) return;

    element.addEventListener("dblclick", () => {
      const cardHeart = cardHearts[index];
      const likeButton = likeBtns[index];

      if (!likeButton) return;

      if (cardHeart) {
        cardHeart.classList.remove("animate");
        void cardHeart.offsetWidth;
        cardHeart.classList.add("animate");
      }

      void toggleLike(likeButton, true);
    });
  };

  // ------------------------------------------------------------
  // Comments
  // ------------------------------------------------------------

  /**
   * Opens the comment modal for a post.
   *
   * @param {number} index - Index of the corresponding comment modal.
   * @returns {void}
   */
  const openCommentModal = (index) => {
    const commentBg = commentBgs[index];
    const commentBgOverlay = commentBgOverlays[index];

    if (!commentBg || !commentBgOverlay) {
      return;
    }

    commentBg.classList.add("active");
    commentBgOverlay.classList.add("active");

    document.body.classList.add("no-scroll");
  };

  /**
   * Closes the comment modal for a post.
   *
   * @param {number} index - Index of the corresponding comment modal.
   * @returns {void}
   */
  const closeCommentModal = (index) => {
    commentBgs[index]?.classList.remove("active");
    commentBgOverlays[index]?.classList.remove("active");

    document.body.classList.remove("no-scroll");
  };

  /**
   * Updates the visibility of the empty-comments message.
   *
   * @param {HTMLElement} container - Comment container.
   * @returns {void}
   */
  const updateCommentEmptyState = (container) => {
    if (!container) return;

    const emptyMessage = container.querySelector(".no-comments-msg");
    if (!emptyMessage) return;

    const comments = container.querySelectorAll(".comments");

    emptyMessage.style.display = comments.length === 0 ? "block" : "none";
  };

  /**
   * Handles delegated comment interactions.
   *
   * Supports:
   * - opening the update modal
   * - updating comments
   * - deleting comments
   * - closing the update modal
   *
   * @param {MouseEvent} e
   * @returns {Promise<void>}
   */
  const commentDeleteLocks = new Set();

  const handleCommentActions = async (e) => {
    const updateBtn = e.target.closest(".comment-update-btn");
    if (updateBtn) {
      e.preventDefault();
      const commentId = updateBtn.dataset.commentId;
      if (!commentId) return;

      const commentDiv = document.getElementById(`comment-${commentId}`);
      if (!commentDiv) return;

      const formBg = commentDiv.querySelector(".comment-form-bg");
      if (!formBg) return;

      const input = formBg.querySelector(".update-input");
      if (!input) return;

      formBg.classList.toggle("active");

      if (formBg.classList.contains("active")) {
        const textElement = commentDiv.querySelector(
          `#comment-text-${commentId}`,
        );

        if (textElement) {
          input.value = textElement.textContent.trim();
        }

        setTimeout(() => input.focus(), 0);
      }

      return;
    }

    const deleteBtn = e.target.closest(".comment-delete-btn");
    if (deleteBtn) {
      e.preventDefault();
      const commentId = deleteBtn.dataset.commentId;
      if (!commentId) {
        return;
      }

      if (commentDeleteLocks.has(commentId)) {
        return;
      }

      commentDeleteLocks.add(commentId);
      deleteBtn.disabled = true;

      try {
        const response = await fetch(`/deleteComment/${commentId}`, {
          method: "DELETE",
        });

        if (response.status === 401) {
          window.location.href = "/signin";
          return;
        }

        const result = await parseResponse(response);

        if (response.ok && result.success) {
          const comment = document.getElementById(`comment-${commentId}`);
          if (!comment) {
            return;
          }

          const container = comment.closest(".comment-container");

          comment.remove();

          if (container) {
            updateCommentEmptyState(container);
          }

          showFlashMessage("success", "Comment deleted successfully!");
        } else {
          showFlashMessage("error", result.message || "Failed to delete.");
        }
      } catch (err) {
        showFlashMessage(
          "error",
          "Something went wrong while deleting the comment.",
        );
      } finally {
        commentDeleteLocks.delete(commentId);
        deleteBtn.disabled = false;
      }
      return;
    }
  };

  /**
   * Updates an existing comment.
   *
   * @param {SubmitEvent} event - Comment update form submit event.
   * @returns {Promise<void>}
   */
  const commentUpdateLocks = new Set();

  const updateComment = async (event) => {
    event.preventDefault();

    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const formBg = form.closest(".comment-form-bg");
    const commentDiv = form.closest(".comments");

    if (!formBg || !commentDiv) {
      return;
    }

    const commentId = commentDiv.id.replace("comment-", "");

    if (!commentId) {
      return;
    }

    const input = form.querySelector(".update-input");

    if (!input) {
      return;
    }

    const updatedText = input.value.trim();

    if (!updatedText) {
      showFlashMessage("error", "Comment cannot be empty!");
      return;
    }

    const submitButton = form.querySelector(".real-comment-update-btn");

    if (!submitButton) {
      return;
    }

    if (commentUpdateLocks.has(commentId)) {
      return;
    }

    commentUpdateLocks.add(commentId);
    submitButton.disabled = true;

    try {
      const response = await fetch(`/updateComment/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: updatedText,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || !result.success) {
        showFlashMessage(
          "error",
          result.message || "Failed to update comment.",
        );

        return;
      }

      const textElement = commentDiv.querySelector(
        `#comment-text-${commentId}`,
      );

      if (textElement) {
        textElement.textContent = updatedText;
      }

      formBg.classList.remove("active");

      showFlashMessage("success", "Comment updated successfully!");
    } catch (error) {
      showFlashMessage(
        "error",
        "Something went wrong while updating the comment.",
      );
    } finally {
      commentUpdateLocks.delete(commentId);
      submitButton.disabled = false;
    }
  };

  /**
   * Creates the DOM element for a comment.
   *
   * The returned element uses the same structure as server-rendered
   * comments so delegated event handlers continue to work for
   * dynamically-created comments.
   *
   * @param {Object} comment - Created comment returned by the server.
   * @returns {HTMLDivElement}
   */
  const createCommentElement = (comment) => {
    const commentElement = document.createElement("div");

    commentElement.className = "comments";
    commentElement.id = `comment-${comment._id}`;

    commentElement.innerHTML = `
    <p>
      <b></b>
      <span id="comment-text-${comment._id}"></span>
    </p>

    <div class="dropdown">
      <button
        type="button"
        class="dropdown-toggle"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <span>...</span>
      </button>

      <div class="dropdown-menu">
        <button
          type="button"
          class="comment-update-btn"
          data-comment-id="${comment._id}"
        >
          Update
        </button>

        <button
          type="button"
          class="comment-delete-btn"
          data-comment-id="${comment._id}"
        >
          Delete
        </button>
      </div>
    </div>

    <div class="comment-form-bg">
      <form
        class="update-comment-form"
        id="updateComment-form-${comment._id}"
      >
        <input
          type="text"
          maxlength="500"
          name="text"
          class="update-input"
          placeholder="Edit your comment..."
          required
        />

        <button
          type="submit"
          class="real-comment-update-btn"
        >
          Update
        </button>
      </form>
    </div>
  `;

    const usernameElement = commentElement.querySelector("p b");
    const textElement = commentElement.querySelector(
      `#comment-text-${comment._id}`,
    );

    if (usernameElement) {
      usernameElement.textContent = comment.userId.username;
    }

    if (textElement) {
      textElement.textContent = comment.text;
    }

    return commentElement;
  };

  /**
   * Creates a new comment for a post.
   *
   * @param {SubmitEvent} event - Comment form submit event.
   * @returns {Promise<void>}
   */
  const commentCreateLocks = new Set();

  const createComment = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const postId = form.dataset.postId;

    if (!postId) {
      return;
    }

    const input = form.querySelector('input[name="text"]');

    if (!input) {
      return;
    }

    const text = input.value.trim();

    if (!text) {
      showFlashMessage("error", "Comment cannot be empty.");
      return;
    }

    const submitButton = form.querySelector(".comment-post-btn");

    if (!submitButton) {
      return;
    }

    if (commentCreateLocks.has(postId)) {
      return;
    }

    commentCreateLocks.add(postId);
    submitButton.disabled = true;

    try {
      const response = await fetch(`/comment/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      const result = await parseResponse(response);

      if (!response.ok || !result.success || !result.comment) {
        showFlashMessage("error", result.message || "Failed to post comment.");
        return;
      }

      const commentContainer = form.closest(".comment-container");

      if (!commentContainer) {
        return;
      }

      const commentElement = createCommentElement(result.comment);

      form.insertAdjacentElement("beforebegin", commentElement);

      updateCommentEmptyState(commentContainer);

      input.value = "";

      showFlashMessage("success", "Comment added successfully!");
    } catch (error) {
      showFlashMessage(
        "error",
        "Something went wrong while posting the comment.",
      );
    } finally {
      commentCreateLocks.delete(postId);
      submitButton.disabled = false;
    }
  };

  // ------------------------------------------------------------
  // Event Registration
  // ------------------------------------------------------------

  if (createPostBtn && uploadFileInput) {
    createPostBtn.addEventListener("click", (e) => {
      e.preventDefault();
      uploadFileInput.click();
    });

    mediaPreview(
      uploadFileInput,
      uploadPreviewContainer,
      uploadCaptionInput,
      postBtn,
      uploadClosePreview,
    );

    postBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!uploadPostForm) {
        return;
      }
      uploadPostForm.requestSubmit();
    });
  }

  uploadClosePreview?.addEventListener("click", (e) => {
    e.preventDefault();
    resetPreview(
      uploadFileInput,
      uploadPreviewContainer,
      uploadCaptionInput,
      postBtn,
      uploadClosePreview,
    );
  });

  submitUpdateBtns.forEach((btn, index) => {
    btn.addEventListener("click", (e) => {
      if (!updateInputs[index]?.files.length) {
        return;
      }
      e.preventDefault();
      updateForms[index]?.requestSubmit();
    });
  });

  // Post deletion
  deletePostBtns.forEach((button) => {
    button.addEventListener("click", deletePost);
  });

  // Post media update
  updateBtns.forEach((updateBtn, index) => {
    updateBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const input = updateInputs[index];
      const form = updateForms[index];

      if (!input || !form) return;

      input.value = "";
      input.click();

      form.style.display = "block";
    });
  });

  updateInputs.forEach((input, index) => {
    mediaPreview(
      input,
      updatePreviewContainers[index],
      updateCaptionInputs[index],
      submitUpdateBtns[index],
      closePreviews[index],
    );
  });

  closePreviews.forEach((closeButton, index) => {
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();

      const input = updateInputs[index];
      const preview = updatePreviewContainers[index];

      if (!input || !preview) return;

      resetPreview(
        updateInputs[index],
        updatePreviewContainers[index],
        updateCaptionInputs[index],
        submitUpdateBtns[index],
        closeButton,
      );
    });
  });

  // Likes
  likeBtns.forEach((likeButton) => {
    likeButton.addEventListener("click", () => {
      void toggleLike(likeButton);
    });
  });

  // Double-click likes
  cardImages.forEach((image, index) => {
    handleDoubleClickLike(image, index);
  });

  cardVideos.forEach((video, index) => {
    handleDoubleClickLike(video, index);
  });

  // Comment modals
  commentBtns.forEach((button, index) => {
    button.addEventListener("click", () => {
      openCommentModal(index);
    });
  });

  closeComments.forEach((button, index) => {
    button.addEventListener("click", () => {
      closeCommentModal(index);
    });
  });

  commentBgOverlays.forEach((overlay, index) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeCommentModal(index);
      }
    });
  });

  // Comment empty states
  commentContainers.forEach((container) => {
    updateCommentEmptyState(container);
  });

  // Comment creation
  document.querySelectorAll(".comment-form").forEach((form) => {
    form.addEventListener("submit", createComment);
  });

  // Comment update
  document.addEventListener("submit", (event) => {
    if (event.target.matches(".update-comment-form")) {
      void updateComment(event);
    }
  });

  // Comment update/delete actions
  document.addEventListener("click", handleCommentActions);
});
