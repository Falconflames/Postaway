/**
 * Handles sign-in/sign-up form interactions,
 * including animations, password visibility,
 * client-side validation, focus management,
 * and flash message dismissal.
 */
document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.querySelector(".form-container");
  const signinTab = document.getElementById("signin-tab");
  const signupTab = document.getElementById("signup-tab");

  const signinForm = document.querySelector(".signin-form form");
  const signupForm = document.querySelector(".signup-form form");

  const firstSigninInput = document.getElementById("username-email");
  const firstSignupInput = document.getElementById("fullname");

  /**
   * Toggle password visibility.
   */
  document.querySelectorAll(".toggle-password").forEach((button) => {
    const input = document.getElementById(button.dataset.target);
    button.addEventListener("click", () => {
      if (!input) return;

      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.classList.toggle("active", show);
    });
  });

  /**
   * Focuses the first input in the active form.
   */
  function focusFirstInput() {
    requestAnimationFrame(() => {
      if (signinTab.checked) {
        firstSigninInput?.focus();
      } else {
        firstSignupInput?.focus();
      }
    });
  }

  focusFirstInput();
  signinTab?.addEventListener("change", focusFirstInput);
  signupTab?.addEventListener("change", focusFirstInput);

  /**
   * Restarts the form transition animation.
   */
  function triggerAnimation() {
    if (!formContainer) return;
    formContainer.classList.remove("animate");
    void formContainer.offsetWidth;
    formContainer.classList.add("animate");
  }

  triggerAnimation();
  signinTab?.addEventListener("change", () => {
    if (signinTab.checked) triggerAnimation();
  });

  signupTab?.addEventListener("change", () => {
    if (signupTab.checked) triggerAnimation();
  });

  formContainer?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
      const activeForm = signinTab.checked ? signinForm : signupForm;
      if (activeForm) activeForm.submit();
    }
  });

  /**
   * Automatically dismiss flash messages.
   */
  const flash = document.querySelector(".flash");

  if (flash) {
    setTimeout(() => {
      flash.remove();
    }, 3000);
  }

  /**
   * Validates the form and updates the submit button state.
   */
  const validateForm = (form, button) => {
    if (!form || !button) return;

    const requiredInputs = form.querySelectorAll("input[required]");

    const allFilled = [...requiredInputs].every((input) => {
      if (input.type === "password") {
        return input.value !== "";
      }
      return input.value.trim() !== "";
    });

    let valid = allFilled;

    const password = form.querySelector('input[name="password"]');
    const confirm = form.querySelector('input[name="confirm-password"]');

    if (password && confirm) {
      valid &&= password.value === confirm.value;
    }

    button.classList.toggle("valid", valid);
    button.classList.toggle("invalid", !valid);
  };

  [
    [signinForm, signinForm?.querySelector(".signin-signup-btn")],
    [signupForm, signupForm?.querySelector(".signin-signup-btn")],
  ].forEach(([form, button]) => {
    if (!form || !button) return;

    form.addEventListener("input", () => validateForm(form, button));
    validateForm(form, button);
  });
});
