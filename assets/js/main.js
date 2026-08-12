/* ==========================================================================
   ECHOED DESTINY // MAIN LOGIC, ADVANCED AVATAR CREATOR & DATA SAVING
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

    // Avatar Creator Elements (Only available in Advanced Mode)
    const avatarModal = document.getElementById('avatar-creator-modal');
    const openAvatarBtnHud = document.getElementById('open-avatar-creator-hud');
    const avatarCloseBtn = document.getElementById('avatar-modal-close-btn');
    const avatarSaveBtn = document.getElementById('avatar-modal-save-btn');
    const usernameInput = document.getElementById('avatar-username-input');
    const previewCanvas = document.getElementById('avatar-preview-canvas');

    let avatarPreviewScene, avatarPreviewCamera, avatarPreviewRenderer, avatarPreviewMesh;
    let currentAvatarProfile = loadPlayerProfile();

    function loadPlayerProfile() {
      const saved = localStorage.getItem('player_avatar_profile');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
      return {
        username: 'PLAYER_' + Math.floor(Math.random() * 8999 + 1000),
        headColor: '#d4af37',
        torsoColor: '#181824',
        armColor: '#d4af37',
        legColor: '#181824',
        accessory: 'visor'
      };
    }

    function openAvatarCreator() {
      if (!avatarModal) return;
      avatarModal.classList.add('active');

      if (usernameInput) usernameInput.value = currentAvatarProfile.username;

      initAvatarPreview3D();
    }

    function closeAvatarCreator() {
      if (avatarModal) avatarModal.classList.remove('active');
    }

    if (openAvatarBtnHud) openAvatarBtnHud.addEventListener('click', openAvatarCreator);
    if (avatarCloseBtn) avatarCloseBtn.addEventListener('click', closeAvatarCreator);

    // Color Swatch Selection
    document.querySelectorAll('#head-color-swatches .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('#head-color-swatches .color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        currentAvatarProfile.headColor = color;
        currentAvatarProfile.armColor = color;
        updatePreviewMesh();
      });
    });

    document.querySelectorAll('#torso-color-swatches .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('#torso-color-swatches .color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const color = swatch.getAttribute('data-color');
        currentAvatarProfile.torsoColor = color;
        currentAvatarProfile.legColor = color;
        updatePreviewMesh();
      });
    });

    // Accessory Selection
    document.querySelectorAll('#accessory-picker-grid .accessory-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#accessory-picker-grid .accessory-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAvatarProfile.accessory = btn.getAttribute('data-acc');
        updatePreviewMesh();
      });
    });

    // Save & Equip Avatar Profile
    if (avatarSaveBtn) {
      avatarSaveBtn.addEventListener('click', () => {
        if (usernameInput && usernameInput.value.trim() !== '') {
          currentAvatarProfile.username = usernameInput.value.trim();
        }
        localStorage.setItem('player_avatar_profile', JSON.stringify(currentAvatarProfile));

        if (window.Global3D) {
          window.Global3D.playerProfile = currentAvatarProfile;
        }

        closeAvatarCreator();
      });
    }

    // Live 3D Preview Renderer for Avatar Creator Modal
    function initAvatarPreview3D() {
      if (!previewCanvas || !window.THREE || avatarPreviewRenderer) return;

      avatarPreviewScene = new THREE.Scene();
      avatarPreviewCamera = new THREE.PerspectiveCamera(50, previewCanvas.clientWidth / previewCanvas.clientHeight, 0.1, 100);
      avatarPreviewCamera.position.set(0, 1.2, 3.2);

      avatarPreviewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true, alpha: true });
      avatarPreviewRenderer.setSize(previewCanvas.clientWidth, previewCanvas.clientHeight);

      const light = new THREE.AmbientLight(0xffffff, 0.7);
      avatarPreviewScene.add(light);
      const dirLight = new THREE.DirectionalLight(0xd4af37, 1);
      dirLight.position.set(2, 4, 3);
      avatarPreviewScene.add(dirLight);

      updatePreviewMesh();
      animatePreview();
    }

    function updatePreviewMesh() {
      if (!avatarPreviewScene || !window.Global3D) return;
      if (avatarPreviewMesh) avatarPreviewScene.remove(avatarPreviewMesh);

      avatarPreviewMesh = window.Global3D.buildRobloxAvatarMesh(currentAvatarProfile);
      avatarPreviewScene.add(avatarPreviewMesh);
    }

    let previewTime = 0;
    function animatePreview() {
      requestAnimationFrame(animatePreview);
      previewTime += 0.03;
      if (avatarPreviewMesh) {
        avatarPreviewMesh.rotation.y += 0.015;
        const ud = avatarPreviewMesh.userData;
        if (ud && ud.leftArmPivot && ud.rightArmPivot) {
          ud.leftArmPivot.rotation.x = Math.sin(previewTime) * 0.08;
          ud.rightArmPivot.rotation.x = -Math.sin(previewTime) * 0.08;
        }
      }
      if (avatarPreviewRenderer && avatarPreviewScene && avatarPreviewCamera) {
        avatarPreviewRenderer.render(avatarPreviewScene, avatarPreviewCamera);
      }
    }

    // Mode Selection Logic
    let selectedPendingMode = null;
    let currentMode = null;
    localStorage.removeItem('cyber_mode'); // Always start on main selection menu on fresh load

    if (cardBasic) cardBasic.addEventListener('click', () => openConfirmationModal('basic'));
    if (cardAdvanced) cardAdvanced.addEventListener('click', () => openConfirmationModal('advanced'));

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
      if (confirmOverlay) confirmOverlay.classList.add('active');
    }

    function closeConfirmationModal() {
      if (confirmOverlay) confirmOverlay.classList.remove('active');
      selectedPendingMode = null;
    }

    if (cancelBtn) cancelBtn.addEventListener('click', closeConfirmationModal);
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (selectedPendingMode) applyMode(selectedPendingMode, true);
        closeConfirmationModal();
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
        if (themeToggleBtn) themeToggleBtn.style.display = 'none';
        if (showLoadingAnimation && loadingScreen) {
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
              
              // Automatically open Avatar Customization Modal right after loading screen finishes!
              setTimeout(() => {
                openAvatarCreator();
              }, 200);
            }, 300);
          }, 1500);
        } else {
          if (modeSelectionView) modeSelectionView.classList.add('hidden');
          if (basicPortfolioView) basicPortfolioView.classList.remove('active');
          if (window.Global3D) window.Global3D.init();
          setTimeout(() => {
            openAvatarCreator();
          }, 200);
        }
      }
    }

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
