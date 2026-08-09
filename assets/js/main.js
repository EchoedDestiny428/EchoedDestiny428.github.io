/* ==========================================================================
   ECHOED DESTINY // MAIN INTERACTION ENGINE & LOADING OVERLAY
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
    const advanced3DView = document.getElementById('advanced-3d-view');
    const cardBasic = document.getElementById('card-basic');
    const cardAdvanced = document.getElementById('card-advanced');
    const switchModeBtn = document.getElementById('switch-mode-btn');
    const exit3DBtn = document.getElementById('exit-3d-view-btn');

    // Loading Overlay Elements
    const loadingScreen = document.getElementById('3d-loading-screen');
    const loadingFill = document.getElementById('loading-bar-fill');
    const loadingStatusText = document.getElementById('loading-status-text');

    // Confirmation Modal Elements
    const confirmOverlay = document.getElementById('confirm-modal-overlay');
    const confirmIcon = document.getElementById('confirm-modal-icon');
    const confirmTitle = document.getElementById('confirm-modal-title');
    const confirmDesc = document.getElementById('confirm-modal-desc');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const proceedBtn = document.getElementById('confirm-proceed-btn');

    let selectedPendingMode = null;
    let currentMode = null;
    localStorage.removeItem('cyber_mode'); // Always show main selection screen on page load

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
        if (confirmDesc) confirmDesc.textContent = 'I... suggest headphones. (and WiFi). Are you ready to launch the 3D Global World?';
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

    if (cancelBtn) cancelBtn.addEventListener('click', closeConfirmationModal);

    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (selectedPendingMode) {
          applyMode(selectedPendingMode, true);
        }
        closeConfirmationModal();
      });
    }

    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) closeConfirmationModal();
      });
    }

    function resetToSelectionView() {
      localStorage.removeItem('cyber_mode');
      document.body.removeAttribute('data-mode');
      if (themeToggleBtn) themeToggleBtn.style.display = 'flex';
      if (modeSelectionView) modeSelectionView.classList.remove('hidden');
      if (basicPortfolioView) basicPortfolioView.classList.remove('active');
      if (advanced3DView) advanced3DView.classList.remove('active');
      if (window.AmbientMesh) window.AmbientMesh.setMode('basic');
    }

    if (switchModeBtn) switchModeBtn.addEventListener('click', resetToSelectionView);
    if (exit3DBtn) exit3DBtn.addEventListener('click', resetToSelectionView);

    function applyMode(mode, showLoadingAnimation = false) {
      currentMode = mode;
      localStorage.setItem('cyber_mode', mode);
      document.body.setAttribute('data-mode', mode);

      if (mode === 'basic') {
        if (themeToggleBtn) themeToggleBtn.style.display = 'flex';
        if (modeSelectionView) modeSelectionView.classList.add('hidden');
        if (advanced3DView) advanced3DView.classList.remove('active');
        if (basicPortfolioView) basicPortfolioView.classList.add('active');
        if (window.AmbientMesh) window.AmbientMesh.setMode('basic');
      } else if (mode === 'advanced') {
        if (themeToggleBtn) themeToggleBtn.style.display = 'none'; // Hide theme toggle in 3D mode
        if (showLoadingAnimation && loadingScreen) {
          // Trigger Loading Screen Transition
          loadingScreen.classList.add('active');
          if (loadingFill) loadingFill.style.width = '0%';
          if (loadingStatusText) loadingStatusText.textContent = 'INITIALIZING 3D WORLD...';

          setTimeout(() => { if (loadingFill) loadingFill.style.width = '45%'; }, 300);
          setTimeout(() => {
            if (loadingFill) loadingFill.style.width = '90%';
            if (loadingStatusText) loadingStatusText.textContent = 'CONNECTING GLOBAL WEBRTC MULTIPLAYER...';
          }, 900);

          setTimeout(() => {
            if (loadingFill) loadingFill.style.width = '100%';
            setTimeout(() => {
              loadingScreen.classList.remove('active');
              if (modeSelectionView) modeSelectionView.classList.add('hidden');
              if (basicPortfolioView) basicPortfolioView.classList.remove('active');
              if (window.Global3D) window.Global3D.init();
            }, 300);
          }, 1500);
        } else {
          if (modeSelectionView) modeSelectionView.classList.add('hidden');
          if (basicPortfolioView) basicPortfolioView.classList.remove('active');
          if (window.Global3D) window.Global3D.init();
        }
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
