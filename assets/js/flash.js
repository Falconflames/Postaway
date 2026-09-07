/**
 * Displays a temporary flash message in the page.
 *
 * Creates a flash-message element with the specified type and text,
 * inserts it at the beginning of the main container, and provides
 * a close button for immediate dismissal. The message is automatically
 * removed after three seconds.
 *
 * @param {"success"|"error"} type
 *   Flash message type used to determine its styling.
 * @param {string} text
 *   Message text displayed to the user.
 * @returns {void}
 */
const showFlashMessage = function (type, text) {
  const flashContainer = document.createElement("div");
  flashContainer.className = `flash-message ${type}`;

  flashContainer.innerHTML = `
    <strong>${text}</strong>
    <button type="button" class="btn-close"></button>
  `;

  const container = document.querySelector(".container-fluid") || document.body;
  container.prepend(flashContainer);

  flashContainer
    .querySelector(".btn-close")
    ?.addEventListener("click", () => flashContainer.remove());

  setTimeout(() => {
    flashContainer.remove();
  }, 3000);
};

window.showFlashMessage = showFlashMessage;

/**
 * Initializes the server-rendered flash message.
 *
 * Attaches a close handler to the existing flash message, if present,
 * and automatically removes it after three seconds.
 *
 * @returns {void}
 */
document.addEventListener("DOMContentLoaded", () => {
  const flashContainer = document.querySelector(".flash-message");

  if (!flashContainer) return;

  flashContainer
    .querySelector(".btn-close")
    ?.addEventListener("click", () => flashContainer.remove());

  setTimeout(() => {
    flashContainer.remove();
  }, 3000);
});
