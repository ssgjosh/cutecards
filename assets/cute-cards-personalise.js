/**
 * Cute Cards Personalization
 * Handles character counters and validation for front caption and inside message fields
 * Includes debug mode for testing: add ?cc_debug=1 to URL
 */

(function() {
  'use strict';

  // Check for debug mode
  const debugMode = new URLSearchParams(window.location.search).get('cc_debug') === '1';

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const personalizationFieldset = document.querySelector('[data-cc-personalization]');
    if (!personalizationFieldset) return;

    const frontInput = personalizationFieldset.querySelector('[data-cc-front]');
    const frontCounter = personalizationFieldset.querySelector('[data-cc-front-counter]');
    const insideTextarea = personalizationFieldset.querySelector('[data-cc-inside]');
    const insideCounter = personalizationFieldset.querySelector('[data-cc-inside-counter]');
    const errorContainer = personalizationFieldset.querySelector('[data-cc-error]');

    // Find the product form by ID (fields are associated via form attribute)
    let productForm = null;
    if (insideTextarea && insideTextarea.getAttribute('form')) {
      const formId = insideTextarea.getAttribute('form');
      productForm = document.getElementById(formId);
    }

    // Set up character counters
    let frontCounterWorking = false;
    let insideCounterWorking = false;

    if (frontInput && frontCounter) {
      setupCharacterCounter(frontInput, frontCounter);
      frontCounterWorking = true;
    }

    if (insideTextarea && insideCounter) {
      setupCharacterCounter(insideTextarea, insideCounter);
      insideCounterWorking = true;
    }

    // Set up form validation
    if (productForm && insideTextarea) {
      setupFormValidation(productForm, insideTextarea, frontInput, errorContainer);
    }

    // Debug mode: Display status and visual indicator
    if (debugMode) {
      const status = {
        foundForm: !!productForm,
        formId: productForm ? productForm.id : null,
        frontCounterWorking: frontCounterWorking,
        insideCounterWorking: insideCounterWorking,
        frontInputAttached: frontInput ? frontInput.hasAttribute('form') : false,
        insideTextareaAttached: insideTextarea ? insideTextarea.hasAttribute('form') : false,
        hiddenFieldsPresent: personalizationFieldset.querySelectorAll('input[type="hidden"]').length
      };

      console.log('%c[CC Debug] Personalization Status', 'color: #3cb371; font-weight: bold;');
      console.table(status);

      // Visual indicator
      if (status.foundForm && status.insideTextareaAttached) {
        personalizationFieldset.style.boxShadow = '0 0 0 3px #3cb371';
        console.log('%c✓ All systems operational', 'color: #3cb371; font-weight: bold;');
      } else {
        personalizationFieldset.style.boxShadow = '0 0 0 3px #d32f2f';
        console.error('%c✗ Issues detected - see status table above', 'color: #d32f2f; font-weight: bold;');
      }

      // Runtime self-checks
      runSelfChecks(frontInput, insideTextarea, productForm);
    }
  }

  /**
   * Set up live character counter for an input/textarea
   */
  function setupCharacterCounter(field, counter) {
    const limit = parseInt(field.dataset.ccLimit, 10);

    function updateCounter() {
      const length = field.value.length;
      counter.textContent = `${length}/${limit}`;
    }

    field.addEventListener('input', updateCounter);
    updateCounter(); // Initialize
  }

  /**
   * Set up form validation for required inside message
   */
  function setupFormValidation(form, insideTextarea, frontInput, errorContainer) {
    // Intercept form submission
    form.addEventListener('submit', function(event) {
      // Clear previous errors
      clearError(errorContainer);

      // Validate inside message
      const trimmedMessage = normalizeText(insideTextarea.value);

      if (trimmedMessage.length === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showError(errorContainer, 'Please write a message inside your card.');
        insideTextarea.focus();
        return false;
      }

      // Validate length constraints
      const insideLimit = parseInt(insideTextarea.dataset.ccLimit, 10);
      if (trimmedMessage.length > insideLimit) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showError(errorContainer, `Inside message is too long (max ${insideLimit} characters).`);
        insideTextarea.focus();
        return false;
      }

      // Validate front caption if present
      if (frontInput) {
        const trimmedFront = frontInput.value.trim();
        const frontLimit = parseInt(frontInput.dataset.ccLimit, 10);
        if (trimmedFront.length > frontLimit) {
          event.preventDefault();
          event.stopImmediatePropagation();
          showError(errorContainer, `Front caption is too long (max ${frontLimit} characters).`);
          frontInput.focus();
          return false;
        }
      }

      // If validation passes, normalize the textarea value before submission
      insideTextarea.value = trimmedMessage;
      if (frontInput) {
        frontInput.value = frontInput.value.trim();
      }

      // TODO: Future step - populate _artwork_prompt based on selections
      // const artworkPromptField = form.querySelector('[data-cc-artwork-prompt]');
      // if (artworkPromptField) {
      //   artworkPromptField.value = generateArtworkPrompt();
      // }
    });

    // Also validate on button click (in case form submit doesn't fire)
    const submitButton = form.querySelector('[name="add"]');
    if (submitButton) {
      submitButton.addEventListener('click', function(event) {
        const trimmedMessage = normalizeText(insideTextarea.value);

        if (trimmedMessage.length === 0) {
          event.preventDefault();
          event.stopImmediatePropagation();
          clearError(errorContainer);
          showError(errorContainer, 'Please write a message inside your card.');
          insideTextarea.focus();
          return false;
        }
      });
    }
  }

  /**
   * Run runtime self-checks (debug mode only)
   */
  function runSelfChecks(frontInput, insideTextarea, form) {
    const checks = [];

    // Check 1: Inside textarea has reasonable value length
    if (insideTextarea) {
      const insideLimit = parseInt(insideTextarea.dataset.ccLimit, 10);
      const insideValue = insideTextarea.value;
      checks.push({
        check: 'Inside message within limit',
        pass: insideValue.length <= insideLimit,
        details: `${insideValue.length}/${insideLimit} chars`
      });
    }

    // Check 2: Front input has reasonable value length (if present)
    if (frontInput) {
      const frontLimit = parseInt(frontInput.dataset.ccLimit, 10);
      const frontValue = frontInput.value;
      checks.push({
        check: 'Front caption within limit',
        pass: frontValue.length <= frontLimit,
        details: `${frontValue.length}/${frontLimit} chars`
      });
    }

    // Check 3: Form contains hidden inputs
    if (form) {
      const hiddenInputs = form.querySelectorAll('input[type="hidden"][name^="properties"]');
      checks.push({
        check: 'Hidden property inputs attached to form',
        pass: hiddenInputs.length >= 2,
        details: `Found ${hiddenInputs.length} hidden inputs`
      });
    }

    // Check 4: Form association via 'form' attribute
    if (insideTextarea && form) {
      const formAttr = insideTextarea.getAttribute('form');
      checks.push({
        check: 'Inside textarea associated with form',
        pass: formAttr === form.id,
        details: `form="${formAttr}" → #${form.id}`
      });
    }

    // Log results
    console.log('%c[CC Debug] Self-Check Results', 'color: #3cb371; font-weight: bold;');
    console.table(checks);

    // Warn on failures
    const failures = checks.filter(c => !c.pass);
    if (failures.length > 0) {
      console.warn('%c⚠ Self-check failures detected:', 'color: #ff9800; font-weight: bold;', failures);
    } else {
      console.log('%c✓ All self-checks passed', 'color: #3cb371;');
    }
  }

  /**
   * Normalize text: trim whitespace, normalize line breaks
   */
  function normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')  // Normalize Windows line breaks
      .replace(/\r/g, '\n')    // Normalize old Mac line breaks
      .trim();                 // Remove leading/trailing whitespace
  }

  /**
   * Show error message
   */
  function showError(errorContainer, message) {
    if (!errorContainer) return;

    errorContainer.textContent = message;
    errorContainer.hidden = false;
  }

  /**
   * Clear error message
   */
  function clearError(errorContainer) {
    if (!errorContainer) return;

    errorContainer.textContent = '';
    errorContainer.hidden = true;
  }

  /**
   * Generate artwork prompt (placeholder for future implementation)
   * This will be implemented in a later step when AI artwork generation is added
   */
  function generateArtworkPrompt() {
    // TODO: Combine template selection + style preferences + message sentiment
    // to create a prompt for AI artwork generation
    return '';
  }

})();
