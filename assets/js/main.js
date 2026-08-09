/* ==========================================================================
   ECHOED DESTINY // MAIN INTERACTION ENGINE, THEME TOGGLE & PORTFOLIO VIEW
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    let currentTheme = localStorage.getItem('theme_mode') || 'dark';

    applyTheme(currentTheme);

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
      });
    }

    function applyTheme(theme) {
      localStorage.setItem('theme_mode', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (themeToggleIcon) {
        themeToggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
      }
    }

    // View & Mode Elements
    const modeSelectionView = document.getElementById('mode-selection-view');
    const basicPortfolioView = document.getElementById('basic-portfolio-view');
    const cardBasic = document.getElementById('card-basic');
    const cardAdvanced = document.getElementById('card-advanced');
    const switchModeBtn = document.getElementById('switch-mode-btn');

    // Confirmation Modal Elements
    const confirmOverlay = document.getElementById('confirm-modal-overlay');
    const confirmIcon = document.getElementById('confirm-modal-icon');
    const confirmTitle = document.getElementById('confirm-modal-title');
    const confirmDesc = document.getElementById('confirm-modal-desc');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const proceedBtn = document.getElementById('confirm-proceed-btn');

    let selectedPendingMode = null;
    let currentMode = localStorage.getItem('cyber_mode');

    if (currentMode) {
      applyMode(currentMode);
    }

    // Card click triggers confirmation modal
    if (cardBasic) {
      cardBasic.addEventListener('click', () => {
        openConfirmationModal('basic');
      });
    }

    if (cardAdvanced) {
      cardAdvanced.addEventListener('click', () => {
        openConfirmationModal('advanced');
      });
    }

    function openConfirmationModal(mode) {
      selectedPendingMode = mode;

      if (mode === 'basic') {
        if (confirmIcon) confirmIcon.textContent = '📱';
        if (confirmTitle) confirmTitle.textContent = 'Confirm Basic Mode';
        if (confirmDesc) confirmDesc.textContent = 'A simple about-me portfolio (boring!!!). Are you sure you want to activate Basic Mode?';
      } else {
        if (confirmIcon) confirmIcon.textContent = '⚡';
        if (confirmTitle) confirmTitle.textContent = 'Confirm Advanced Mode';
        if (confirmDesc) confirmDesc.textContent = 'I... suggest headphones. (and WiFi). Are you ready to launch Advanced Mode?';
      }

      if (confirmOverlay) {
        confirmOverlay.classList.add('active');
      }
    }

    function closeConfirmationModal() {
      if (confirmOverlay) {
        confirmOverlay.classList.remove('active');
      }
      selectedPendingMode = null;
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeConfirmationModal();
      });
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (selectedPendingMode) {
          applyMode(selectedPendingMode);
        }
        closeConfirmationModal();
      });
    }

    // Close modal on backdrop click
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) {
          closeConfirmationModal();
        }
      });
    }

    if (switchModeBtn) {
      switchModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('cyber_mode');
        document.body.removeAttribute('data-mode');
        if (modeSelectionView) modeSelectionView.classList.remove('hidden');
        if (basicPortfolioView) basicPortfolioView.classList.remove('active');
        if (window.AmbientMesh) window.AmbientMesh.setMode('basic');
      });
    }

    function applyMode(mode) {
      currentMode = mode;
      localStorage.setItem('cyber_mode', mode);
      document.body.setAttribute('data-mode', mode);

      if (window.AmbientMesh) {
        window.AmbientMesh.setMode(mode);
      }

      if (mode === 'basic') {
        if (modeSelectionView) modeSelectionView.classList.add('hidden');
        if (basicPortfolioView) basicPortfolioView.classList.add('active');
      }
    }

    // Basic Contact Form Submit
    const basicForm = document.getElementById('basic-contact-form');
    if (basicForm) {
      basicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you! Your message has been sent successfully.');
        basicForm.reset();
      });
    }
  });
})();
