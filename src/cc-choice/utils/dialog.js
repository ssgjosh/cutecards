/**
 * Confirmation Dialog Utility
 *
 * @module utils/dialog
 * @description Custom confirmation dialog for destructive actions
 *
 * @public showConfirmDialog(title: string, message: string) → Promise<boolean>
 *
 * @example
 * import { showConfirmDialog } from './utils/dialog.js';
 *
 * const confirmed = await showConfirmDialog(
 *   'Clear your message?',
 *   'This will permanently delete your message.'
 * );
 * if (confirmed) {
 *   // User clicked "Clear message"
 * }
 */

/**
 * Creates the confirm dialog DOM structure
 * Only called once per page load; dialog is reused
 *
 * @private
 * @returns {HTMLElement} Dialog element appended to body
 */
function createConfirmDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'ccc__confirm-dialog';
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="ccc__confirm-backdrop"></div>
    <div class="ccc__confirm-panel">
      <div class="ccc__confirm-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h3 class="ccc__confirm-title">Clear your message?</h3>
      <p class="ccc__confirm-message">This will permanently delete your message. This action cannot be undone.</p>
      <div class="ccc__confirm-actions">
        <button type="button" class="ccc__confirm-btn ccc__confirm-btn--cancel">Cancel</button>
        <button type="button" class="ccc__confirm-btn ccc__confirm-btn--confirm">Clear message</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  return dialog;
}

/**
 * Shows confirmation dialog and returns user's choice
 *
 * @param {string} title - Dialog title (optional, uses default if not provided)
 * @param {string} message - Dialog message (optional, uses default if not provided)
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
export function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    let confirmDialog = document.querySelector('.ccc__confirm-dialog');

    if (!confirmDialog) {
      confirmDialog = createConfirmDialog();
    }

    const titleEl = confirmDialog.querySelector('.ccc__confirm-title');
    const messageEl = confirmDialog.querySelector('.ccc__confirm-message');
    if (title) titleEl.textContent = title;
    if (message) messageEl.textContent = message;

    const cancelBtn = confirmDialog.querySelector('.ccc__confirm-btn--cancel');
    const confirmBtn = confirmDialog.querySelector('.ccc__confirm-btn--confirm');
    const backdrop = confirmDialog.querySelector('.ccc__confirm-backdrop');

    confirmDialog.hidden = false;

    setTimeout(() => confirmBtn.focus(), 100);

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && document.activeElement === confirmBtn) {
        handleConfirm();
      }
    };

    const cleanup = () => {
      confirmDialog.hidden = true;
      cancelBtn.removeEventListener('click', handleCancel);
      confirmBtn.removeEventListener('click', handleConfirm);
      backdrop.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeydown);
    };

    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    backdrop.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeydown);
  });
}
