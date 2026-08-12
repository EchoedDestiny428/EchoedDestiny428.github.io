/* ==========================================================================
   HIGH-DETAIL 3D WEBGL ENGINE WITH ROBLOX 3RD-PERSON SCROLL CAMERA,
   ROBUST FEET-LEVEL PHYSICS, AND FRICTION SLIDING
   ========================================================================== */

(function () {
  'use strict';

  class Global3DEngine {
    constructor() {
      this.container = document.getElementById('advanced-3d-view');
      this.canvas = document.getElementById('3d-webgl-canvas');
      this.isInitialized = false;
      this.isLocked = false;

      // Player Movement Physics (Feet-level positioning: y = 0 is floor)
      this.playerPos = new THREE.Vector3(0, 0, 0); // Feet position
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.yaw = 0;   // Mouse look horizontal rotation
      this.pitch = 0; // Mouse look vertical rotation

      this.moveForward = false;
      this.moveBackward = false;
      this.moveLeft = false;
      this.moveRight = false;
      this.isSprinting = false;
      this.isSliding = false;
      this.canJump = true;
      this.slideSpeed = 0;
      this.targetEyeHeight = 1.7;
      this.currentEyeHeight = 1.7;

      // Roblox 3rd Person Camera Scroll Zoom
      this.cameraDistance = 5.0; // 0 = 1st person, > 0.4 = 3rd person
      this.targetCameraDistance = 5.0;

      this.prevTime = performance.now();

      // Local Player Avatar Profile & Mesh
      this.playerProfile = this.loadPlayerProfile();
      this.localAvatar = null;
      this.myId = 'player_' + Math.floor(Math.random() * 899999 + 100000);

      // Multiplayer State
      this.peer = null;
      this.peers = {};
      this.remoteAvatars = {};
      this.remoteTargetPos = {};
      this.remoteTargetRot = {};
      this.remoteState = {};
      this.broadcastChannel = null;

      // New Slide variables
      this.slideKeyHeld = false;
      this.lastSlideTime = 0;
      this.currentState = 'idle';
      
      // Warzone Mechanics
      this.isTacSprinting = false;
      this.lastSprintTap = 0;
      this.bobTime = 0;

      // Combat & Economy
      this.hp = 100;
      this.cash = 0;
      this.lastShotTime = 0;
      this.environmentObstacles = [];
      this.lootDrops = [];
      this.buyStationBounds = null;
      this.isDead = false;
    }

    loadPlayerProfile() {
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

    init() {
      if (this.isInitialized || !this.container || !window.THREE) return;

      this.isInitialized = true;
      this.container.classList.add('active');

      // 1. Scene Setup
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x050508);
      this.scene.fog = new THREE.FogExp2(0x050508, 0.02);

      // 2. Camera Setup
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      // 3. Renderer Setup
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 4. Pointer Lock & Mouse Look Listeners
      this.setupPointerLock();

      // 5. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(ambientLight);

      const mainGoldLight = new THREE.PointLight(0xd4af37, 2, 50);
      mainGoldLight.position.set(0, 12, 0);
      mainGoldLight.castShadow = true;
      this.scene.add(mainGoldLight);

      // 6. Build Local Roblox Avatar Mesh
      this.localAvatar = this.buildRobloxAvatarMesh(this.playerProfile);
      this.scene.add(this.localAvatar);

      // 7. Environment & Controls
      this.buildEnvironment();
      this.setupControls();
      window.addEventListener('resize', () => this.onWindowResize());

      // 8. Multiplayer
      this.initMultiplayer();

      // 9. Render Loop
      this.animate();
    }

    setupPointerLock() {
      const overlayTrigger = document.getElementById('fps-click-trigger');

      const requestLock = () => {
        if (!this.isLocked && this.canvas) {
          this.canvas.requestPointerLock();
        }
      };

      if (this.canvas) this.canvas.addEventListener('click', requestLock);
      if (overlayTrigger) {
        overlayTrigger.addEventListener('click', () => {
          requestLock();
          overlayTrigger.style.display = 'none';
        });
      }

      document.addEventListener('pointerlockchange', () => {
        this.isLocked = document.pointerLockElement === this.canvas;
        if (this.isLocked) {
          document.body.classList.add('fps-locked');
          if (overlayTrigger) overlayTrigger.style.display = 'none';
        } else {
          document.body.classList.remove('fps-locked');
        }
      });

      // Mouse Look Euler Angle Tracking
      document.addEventListener('mousemove', (e) => {
        if (!this.isLocked) return;

        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;

        this.yaw -= movementX * 0.0022;
        this.pitch -= movementY * 0.0022;

        // Limit vertical pitch angle (-85 deg to +85 deg)
        this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
      });
    }

    buildEnvironment() {
      const floorSize = 60;
      const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 32, 32);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x09090d,
        roughness: 0.2,
        metalness: 0.8
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.scene.add(floor);

      const gridHelper = new THREE.GridHelper(floorSize, 60, 0xd4af37, 0x333344);
      gridHelper.position.y = 0.01;
      this.scene.add(gridHelper);

      // Skybox Particles
      const particleGeo = new THREE.BufferGeometry();
      const particleCount = 200;
      const posArray = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 60;
        posArray[i + 1] = Math.random() * 25 + 0.5;
        posArray[i + 2] = (Math.random() - 0.5) * 60;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.12,
        color: 0xd4af37,
        transparent: true,
        opacity: 0.7
      });
      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);

      // --- Warzone Environment ---
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
      
      const addBox = (w, h, d, x, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), h > 2 ? wallMat : crateMat);
        mesh.position.set(x, h/2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.environmentObstacles.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2, height: h });
      };

      // Outer Walls
      addBox(60, 4, 1, 0, -30);
      addBox(60, 4, 1, 0, 30);
      addBox(1, 4, 60, -30, 0);
      addBox(1, 4, 60, 30, 0);

      // Low crates for vaulting testing
      addBox(2, 1.2, 2, 5, -5);
      addBox(4, 1.4, 2, -5, -8);
      addBox(2, 1.0, 4, -10, 5);
      
      // High cover walls
      addBox(6, 3, 1, 10, 10);
      addBox(1, 3, 6, -15, -15);
      
      // Buy Station (Center)
      const buyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.5 });
      const buyGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
      const buyStation = new THREE.Mesh(buyGeo, buyMat);
      buyStation.position.set(0, 1, 0);
      buyStation.castShadow = true;
      this.scene.add(buyStation);
      this.buyStationBounds = { x: 0, z: 0, radius: 2.5 };
      this.environmentObstacles.push({ minX: -0.75, maxX: 0.75, minZ: -0.75, maxZ: 0.75, height: 2 });
    }

    setupControls() {
      const onKeyDown = (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
          case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
          case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
          case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
          case 'ShiftLeft': case 'ShiftRight': 
            const now = performance.now();
            if (now - this.lastSprintTap < 300) {
              this.isTacSprinting = true;
            }
            this.isSprinting = true;
            this.lastSprintTap = now;
            break;
          case 'KeyC': case 'ControlLeft': case 'ControlRight':
            if (this.isSliding) {
              this.endSlide();
            } else if (this.isSprinting && !this.slideKeyHeld && performance.now() - this.lastSlideTime > 500) {
              this.startSlide();
              this.lastSlideTime = performance.now();
            }
            this.slideKeyHeld = true;
            break;
          case 'Space':
            if (this.canJump) {
              this.performJump();
            }
            break;
          case 'KeyF':
            this.handleInteraction();
            break;
        }
      };

      const onKeyUp = (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
          case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
          case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
          case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
          case 'ShiftLeft': case 'ShiftRight': 
            this.isSprinting = false; 
            this.isTacSprinting = false;
            break;
          case 'KeyC': case 'ControlLeft': case 'ControlRight':
            this.slideKeyHeld = false;
            break;
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      window.addEventListener('mousedown', (e) => {
        if (this.isLocked && e.button === 0 && !this.isDead) { // Left click
          this.shootWeapon();
        }
      });

      // Roblox-style Mouse Scroll Wheel Zoom (0 = 1st person, > 0.4 = 3rd person)
      window.addEventListener('wheel', (e) => {
        if (this.isLocked) {
          this.targetCameraDistance += e.deltaY * 0.005;
          this.targetCameraDistance = Math.max(0, Math.min(10.0, this.targetCameraDistance));
        }
      });
    }

    startSlide() {
      if (!this.canJump) return; // FIX: No air sliding
      this.isSliding = true;
      this.targetEyeHeight = 0.85; // Crouched camera height
      
      const moveZ = Number(this.moveForward) - Number(this.moveBackward);
      const moveX = Number(this.moveRight) - Number(this.moveLeft);
      
      let dirX = -Math.sin(this.yaw);
      let dirZ = -Math.cos(this.yaw);
      
      if (moveZ !== 0 || moveX !== 0) {
          const len = Math.hypot(moveZ, moveX);
          dirX = (-Math.sin(this.yaw) * moveZ + Math.cos(this.yaw) * moveX) / len;
          dirZ = (-Math.cos(this.yaw) * moveZ - Math.sin(this.yaw) * moveX) / len;
      }
      
      // Warzone Slide Boost
      const slideBoost = 18.0;
      this.velocity.x = dirX * slideBoost;
      this.velocity.z = dirZ * slideBoost;
    }

    endSlide() {
      this.isSliding = false;
      this.targetEyeHeight = 1.7; // Standing eye height
    }

    performJump() {
      if (this.isDead) return;
      
      // Vaulting Check
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      let canVault = false;
      let vaultHeight = 0;
      
      // Check if hitting a low obstacle in front
      const checkX = this.playerPos.x + forwardX * 1.5;
      const checkZ = this.playerPos.z + forwardZ * 1.5;
      for (const obs of this.environmentObstacles) {
        if (checkX > obs.minX && checkX < obs.maxX && checkZ > obs.minZ && checkZ < obs.maxZ) {
          if (obs.height <= 2.0) { // Vaultable
            canVault = true;
            vaultHeight = obs.height;
            break;
          }
        }
      }

      if (canVault) {
        // Vault!
        this.velocity.y = 8.0 + (vaultHeight * 2);
        this.velocity.x += forwardX * 5.0;
        this.velocity.z += forwardZ * 5.0;
        this.canJump = false;
        this.currentState = 'vault';
      } else {
        // Standard Snappy Jump
        this.velocity.y = 12.0; 
        this.canJump = false;
      }
      
      if (this.isSliding) {
        this.endSlide();
      }
    }

    handleInteraction() {
      if (this.isDead) return;
      if (this.buyStationBounds) {
        const dx = this.playerPos.x - this.buyStationBounds.x;
        const dz = this.playerPos.z - this.buyStationBounds.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= this.buyStationBounds.radius && this.cash >= 500) {
          this.cash -= 500;
          this.hp = Math.min(100, this.hp + 50); // Buy Armor/Health
          this.updateHUD();
        }
      }
    }

    shootWeapon() {
      const now = performance.now();
      if (now - this.lastShotTime < 100) return; // Fire rate
      this.lastShotTime = now;

      // Recoil
      this.pitch += (Math.random() * 0.02) + 0.01;
      
      // Muzzle Flash
      const flash = document.createElement('div');
      flash.style.position = 'absolute';
      flash.style.top = '50%';
      flash.style.left = '50%';
      flash.style.width = '100px';
      flash.style.height = '100px';
      flash.style.background = 'radial-gradient(circle, rgba(255,200,0,0.8) 0%, rgba(255,100,0,0) 70%)';
      flash.style.transform = `translate(-50%, -50%) rotate(${Math.random()*360}deg)`;
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '998';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 50);

      // Raycast
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

      // Check remote players for hit
      const targets = Object.values(this.remoteAvatars);
      const intersects = raycaster.intersectObjects(targets, true);

      if (intersects.length > 0) {
        const hitMarker = document.getElementById('fps-hit-marker');
        if (hitMarker) {
          hitMarker.classList.add('active');
          setTimeout(() => hitMarker.classList.remove('active'), 150);
        }
        
        const hitMesh = intersects[0].object;
        let hitPeerId = null;
        Object.keys(this.remoteAvatars).forEach(id => {
          if (hitMesh.parent && hitMesh.parent.parent === this.remoteAvatars[id]) hitPeerId = id;
          if (hitMesh.parent === this.remoteAvatars[id]) hitPeerId = id;
        });

        if (hitPeerId) {
          const payload = { type: 'damage', id: hitPeerId, amount: 20 };
          if (this.broadcastChannel) this.broadcastChannel.postMessage(payload);
          Object.values(this.peers).forEach(conn => { if (conn.open) conn.send(payload); });
        }
      }
      
      const shootPayload = { type: 'shoot', id: this.myId };
      if (this.broadcastChannel) this.broadcastChannel.postMessage(shootPayload);
      Object.values(this.peers).forEach(conn => { if (conn.open) conn.send(shootPayload); });
    }

    takeDamage(amount) {
      if (this.isDead) return;
      this.hp -= amount;
      
      const blood = document.getElementById('fps-blood-overlay');
      if (blood) {
        blood.style.boxShadow = `inset 0 0 ${150 - this.hp}px ${50 - this.hp/2}px rgba(220, 20, 60, ${1 - Math.max(0, this.hp)/100})`;
      }

      this.updateHUD();

      if (this.hp <= 0) {
        this.die();
      }
    }

    die() {
      this.isDead = true;
      this.hp = 0;
      this.velocity.set(0, 0, 0);
      this.currentState = 'dead';
      this.broadcastPosition();
      
      const dropPayload = { type: 'drop_cash', x: this.playerPos.x, y: 0.5, z: this.playerPos.z, amount: this.cash + 100 };
      if (this.broadcastChannel) this.broadcastChannel.postMessage(dropPayload);
      Object.values(this.peers).forEach(conn => { if (conn.open) conn.send(dropPayload); });
      
      this.spawnLootDrop(dropPayload.x, dropPayload.y, dropPayload.z, dropPayload.amount);
      
      setTimeout(() => {
        this.playerPos.set((Math.random()-0.5)*20, 5, (Math.random()-0.5)*20);
        this.hp = 100;
        this.cash = 0;
        this.isDead = false;
        const blood = document.getElementById('fps-blood-overlay');
        if (blood) blood.style.boxShadow = 'inset 0 0 100px 10px rgba(220, 20, 60, 0)';
        this.updateHUD();
      }, 3000);
    }
    
    spawnLootDrop(x, y, z, amount) {
      const dropGeo = new THREE.BoxGeometry(0.6, 0.2, 0.3);
      const dropMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
      const drop = new THREE.Mesh(dropGeo, dropMat);
      drop.position.set(x, y, z);
      drop.castShadow = true;
      this.scene.add(drop);
      this.lootDrops.push({ mesh: drop, amount: amount });
    }

    updateHUD() {
      const hpText = document.getElementById('fps-hp-text');
      const hpBar = document.getElementById('fps-hp-bar');
      const cashText = document.getElementById('fps-cash-text');
      if (hpText) hpText.textContent = Math.max(0, this.hp);
      if (hpBar) hpBar.style.width = Math.max(0, this.hp) + '%';
      if (cashText) cashText.textContent = this.cash;
    }

    // ==========================================================================
    // EXACT ROBLOX R6 AVATAR MESH BUILDER
    // ==========================================================================
    buildRobloxAvatarMesh(profile) {
      const group = new THREE.Group();

      const headCol = profile?.headColor || '#d4af37';
      const torsoCol = profile?.torsoColor || '#181824';
      const armCol = profile?.armColor || '#d4af37';
      const legCol = profile?.legColor || '#181824';

      // 1. Torso (0.8 x 0.8 x 0.4)
      const torsoGeo = new THREE.BoxGeometry(0.8, 0.8, 0.4);
      const torsoMat = new THREE.MeshStandardMaterial({ color: torsoCol, metalness: 0.5, roughness: 0.3 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.8;
      torso.castShadow = true;
      group.add(torso);

      // 2. Head (0.5 x 0.5 x 0.5)
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMat = new THREE.MeshStandardMaterial({ color: headCol, roughness: 0.3 });
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.25, 0);

      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.25, 0);
      head.castShadow = true;
      headGroup.add(head);

      const faceGeo = new THREE.BoxGeometry(0.36, 0.12, 0.08);
      const faceMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.set(0, 0.25, -0.26);
      headGroup.add(face);

      if (profile?.accessory === 'headphones') {
        const hpGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16, Math.PI);
        const hpMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
        const hp = new THREE.Mesh(hpGeo, hpMat);
        hp.position.set(0, 0.35, 0);
        hp.rotation.x = Math.PI;
        headGroup.add(hp);
      } else if (profile?.accessory === 'halo') {
        const haloGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 24);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(0, 0.65, 0);
        headGroup.add(halo);
      } else if (profile?.accessory === 'crown') {
        const crownGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.22, 8);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(0, 0.6, 0);
        headGroup.add(crown);
      }
      group.add(headGroup);

      // 3. Left Arm (Shoulder Pivot)
      const armGeo = new THREE.BoxGeometry(0.38, 0.8, 0.38);
      const armMat = new THREE.MeshStandardMaterial({ color: armCol, roughness: 0.3 });

      const leftArmPivot = new THREE.Group();
      leftArmPivot.position.set(-0.6, 1.15, 0);
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.y = -0.38;
      leftArm.castShadow = true;
      leftArmPivot.add(leftArm);
      group.add(leftArmPivot);

      // 4. Right Arm (Shoulder Pivot)
      const rightArmPivot = new THREE.Group();
      rightArmPivot.position.set(0.6, 1.15, 0);
      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.y = -0.38;
      rightArm.castShadow = true;
      rightArmPivot.add(rightArm);

      // Gun Mesh (Assault Rifle) attached to Right Arm
      const gunGroup = new THREE.Group();
      const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.8), new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.8}));
      const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.9}));
      gunBarrel.position.set(0, 0.05, -0.6);
      const gunMag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.2), new THREE.MeshStandardMaterial({color: 0x222222}));
      gunMag.position.set(0, -0.2, -0.1);
      gunGroup.add(gunBody);
      gunGroup.add(gunBarrel);
      gunGroup.add(gunMag);
      
      gunGroup.position.set(0, -0.7, -0.3); // Position relative to arm pivot
      rightArmPivot.add(gunGroup);

      group.add(rightArmPivot);

      // 5. Left Leg (Hip Pivot)
      const legGeo = new THREE.BoxGeometry(0.38, 0.8, 0.38);
      const legMat = new THREE.MeshStandardMaterial({ color: legCol, roughness: 0.4 });

      const leftLegPivot = new THREE.Group();
      leftLegPivot.position.set(-0.21, 0.4, 0);
      const leftLeg = new THREE.Mesh(legGeo, legMat);
      leftLeg.position.y = -0.38;
      leftLeg.castShadow = true;
      leftLegPivot.add(leftLeg);
      group.add(leftLegPivot);

      // 6. Right Leg (Hip Pivot)
      const rightLegPivot = new THREE.Group();
      rightLegPivot.position.set(0.21, 0.4, 0);
      const rightLeg = new THREE.Mesh(legGeo, legMat);
      rightLeg.position.y = -0.38;
      rightLeg.castShadow = true;
      rightLegPivot.add(rightLeg);
      group.add(rightLegPivot);

      // Username Tag Badge
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(18, 18, 24, 0.85)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 252, 60);
      ctx.fillStyle = '#f3e5ab';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameText = (profile?.username || 'PLAYER').substring(0, 12).toUpperCase();
      ctx.fillText(nameText, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(0, 2.1, 0);
      sprite.scale.set(1.6, 0.4, 1);
      group.add(sprite);

      group.userData = {
        torso,
        headGroup,
        leftArmPivot,
        rightArmPivot,
        leftLegPivot,
        rightLegPivot,
        swingTime: 0
      };

      return group;
    }

    initMultiplayer() {
      if (window.BroadcastChannel) {
        try {
          this.broadcastChannel = new BroadcastChannel('echoed_destiny_r6_multiplayer');
          this.broadcastChannel.onmessage = (e) => {
            const data = e.data;
            if (!data || data.id === this.myId) return;

            if (data.type === 'pos') {
              this.handleRemotePositionData(data);
            } else if (data.type === 'leave') {
              this.removeRemoteAvatar(data.id);
            } else {
              this.handleRemoteEvent(data);
            }
          };

          window.addEventListener('beforeunload', () => {
            if (this.broadcastChannel) {
              this.broadcastChannel.postMessage({ type: 'leave', id: this.myId });
            }
          });
        } catch (err) {
          console.warn('BroadcastChannel error:', err);
        }
      }

      if (window.Peer) {
        try {
          this.peer = new Peer(this.myId, { debug: 1 });
          this.peer.on('open', () => this.updatePlayerCount());
          this.peer.on('connection', (conn) => this.setupPeerConnection(conn));
        } catch (e) {
          console.warn('[Multiplayer] WebRTC PeerJS warning:', e);
        }
      }

      this.updatePlayerCount();
    }

    setupPeerConnection(conn) {
      this.peers[conn.peer] = conn;
      conn.on('open', () => {
        this.createRemoteAvatar(conn.peer, null);
        this.updatePlayerCount();
      });
      conn.on('data', (data) => {
        if (data.type === 'pos') {
          this.handleRemotePositionData(data);
        } else {
          this.handleRemoteEvent(data);
        }
      });
      conn.on('close', () => {
        this.removeRemoteAvatar(conn.peer);
        delete this.peers[conn.peer];
        this.updatePlayerCount();
      });
    }

    createRemoteAvatar(peerId, profile) {
      if (this.remoteAvatars[peerId]) return;

      const avatarMesh = this.buildRobloxAvatarMesh(profile);
      this.scene.add(avatarMesh);

      this.remoteAvatars[peerId] = avatarMesh;
      this.remoteTargetPos[peerId] = new THREE.Vector3(0, 0, 0);
      this.remoteTargetRot[peerId] = 0;
      this.remoteState[peerId] = 'idle';

      this.updatePlayerCount();
    }

    handleRemoteEvent(data) {
      if (data.type === 'damage' && data.id === this.myId) {
        this.takeDamage(data.amount);
      } else if (data.type === 'drop_cash') {
        this.spawnLootDrop(data.x, data.y, data.z, data.amount);
      } else if (data.type === 'shoot') {
        // Future: Render remote muzzle flash or play sound
      }
    }

    handleRemotePositionData(data) {
      if (!this.remoteAvatars[data.id]) {
        this.createRemoteAvatar(data.id, data.profile);
      }

      const prevPos = this.remoteTargetPos[data.id];
      const newPos = new THREE.Vector3(data.x, data.y, data.z);

      if (prevPos) {
        this.remoteTargetPos[data.id].copy(newPos);
      } else {
        this.remoteTargetPos[data.id] = newPos;
      }

      this.remoteTargetRot[data.id] = data.ry || 0;
      this.remoteState[data.id] = data.state || 'idle';
    }

    removeRemoteAvatar(peerId) {
      const avatar = this.remoteAvatars[peerId];
      if (avatar) {
        this.scene.remove(avatar);
        delete this.remoteAvatars[peerId];
        delete this.remoteTargetPos[peerId];
        delete this.remoteTargetRot[peerId];
        delete this.remoteState[peerId];
      }
      this.updatePlayerCount();
    }

    updatePlayerCount() {
      const countElem = document.getElementById('global-online-count');
      const activeRemoteCount = Object.keys(this.remoteAvatars).length;
      const totalCount = activeRemoteCount + 1;

      if (countElem) {
        countElem.textContent = `${totalCount} PLAYER${totalCount > 1 ? 'S' : ''} ONLINE`;
      }
    }

    broadcastPosition() {
      if (!this.isLocked) return;

      const payload = {
        type: 'pos',
        id: this.myId,
        profile: this.playerProfile,
        x: Math.round(this.playerPos.x * 100) / 100,
        y: Math.round(this.playerPos.y * 100) / 100,
        z: Math.round(this.playerPos.z * 100) / 100,
        ry: Math.round(this.yaw * 100) / 100,
        state: this.currentState
      };

      if (this.broadcastChannel) this.broadcastChannel.postMessage(payload);

      Object.values(this.peers).forEach((conn) => {
        if (conn.open) conn.send(payload);
      });
    }

    onWindowResize() {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      const time = performance.now();
      const delta = (time - this.prevTime) / 1000;
      this.prevTime = time;

      // 1. Player Physics & Input Logic (Feet Position: y = 0 is floor)
      if (this.isLocked) {
        // Friction deceleration
        let friction = 10.0;
        if (!this.canJump) friction = 1.0;
        else if (this.isSliding) friction = 3.0;

        const speed2D = Math.hypot(this.velocity.x, this.velocity.z);
        if (speed2D > 0) {
            const drop = speed2D * friction * delta;
            const newSpeed = Math.max(0, speed2D - drop);
            this.velocity.x = (this.velocity.x / speed2D) * newSpeed;
            this.velocity.z = (this.velocity.z / speed2D) * newSpeed;
        }

        // Snappy Downward Gravity Physics
        this.velocity.y -= 32.0 * delta;

        const moveZ = Number(this.moveForward) - Number(this.moveBackward);
        const moveX = Number(this.moveRight) - Number(this.moveLeft);
        const isMoving = moveZ !== 0 || moveX !== 0;

        // Update current state for animation and broadcast
        if (this.isSliding) {
            this.currentState = 'slide';
            if (speed2D <= 4.0) this.endSlide(); // Auto-end slide when slow
        }
        else if (!this.canJump) this.currentState = 'jump';
        else if (isMoving) this.currentState = this.isTacSprinting ? 'tac_sprint' : (this.isSprinting ? 'sprint' : 'walk');
        else this.currentState = 'idle';

        if (isMoving && !this.isSliding) {
            const targetSpeed = this.isTacSprinting ? 12.0 : (this.isSprinting ? 8.0 : 4.5);
            const accel = this.canJump ? 60.0 : 5.0; // Air control

            const forwardX = -Math.sin(this.yaw);
            const forwardZ = -Math.cos(this.yaw);
            const rightX = Math.cos(this.yaw);
            const rightZ = -Math.sin(this.yaw);

            const len = Math.hypot(moveZ, moveX);
            const moveDirX = (forwardX * moveZ + rightX * moveX) / len;
            const moveDirZ = (forwardZ * moveZ + rightZ * moveX) / len;

            // Quake Acceleration Formula
            const currentProjSpeed = this.velocity.x * moveDirX + this.velocity.z * moveDirZ;
            let addSpeed = accel * delta;
            if (currentProjSpeed + addSpeed > targetSpeed) {
                addSpeed = Math.max(0, targetSpeed - currentProjSpeed);
            }
            
            this.velocity.x += moveDirX * addSpeed;
            this.velocity.z += moveDirZ * addSpeed;
        }

        // Apply Velocity to Position
        this.playerPos.x += this.velocity.x * delta;
        this.playerPos.y += this.velocity.y * delta;
        this.playerPos.z += this.velocity.z * delta;

        // Environment Collision (AABB)
        const radius = 0.4;
        for (const obs of this.environmentObstacles) {
          if (this.playerPos.y + 0.5 < obs.height) { // Collide if body is below top of obstacle
            const closestX = Math.max(obs.minX, Math.min(this.playerPos.x, obs.maxX));
            const closestZ = Math.max(obs.minZ, Math.min(this.playerPos.z, obs.maxZ));
            const dx = this.playerPos.x - closestX;
            const dz = this.playerPos.z - closestZ;
            const distSq = dx*dx + dz*dz;
            if (distSq < radius * radius && distSq > 0) {
              const dist = Math.sqrt(distSq);
              this.playerPos.x += (dx / dist) * (radius - dist);
              this.playerPos.z += (dz / dist) * (radius - dist);
              this.velocity.x = 0;
              this.velocity.z = 0;
            }
          }
        }

        // Buy Station Prompt
        const prompt = document.getElementById('fps-interaction-prompt');
        if (this.buyStationBounds && prompt) {
          const dx = this.playerPos.x - this.buyStationBounds.x;
          const dz = this.playerPos.z - this.buyStationBounds.z;
          if (Math.hypot(dx, dz) <= this.buyStationBounds.radius) {
            prompt.style.display = 'block';
          } else {
            prompt.style.display = 'none';
          }
        }

        // Loot Drops Update (Rotate and Pickup)
        for (let i = this.lootDrops.length - 1; i >= 0; i--) {
          const drop = this.lootDrops[i];
          drop.mesh.rotation.y += 2 * delta;
          drop.mesh.position.y = 0.5 + Math.sin(time * 0.005) * 0.2;
          
          const dx = this.playerPos.x - drop.mesh.position.x;
          const dz = this.playerPos.z - drop.mesh.position.z;
          if (Math.hypot(dx, dz) < 1.0) { // Pickup range
            this.cash += drop.amount;
            this.scene.remove(drop.mesh);
            this.lootDrops.splice(i, 1);
            this.updateHUD();
          }
        }

        // Floor Collision Check (Floor is at y = 0)
        if (this.playerPos.y <= 0) {
          this.playerPos.y = 0;
          this.velocity.y = 0;
          this.canJump = true;
        }

        // Arena Boundaries (-28 to +28)
        this.playerPos.x = Math.max(-28, Math.min(28, this.playerPos.x));
        this.playerPos.z = Math.max(-28, Math.min(28, this.playerPos.z));

        // Smooth Eye Height crouch/stand transition
        this.currentEyeHeight += (this.targetEyeHeight - this.currentEyeHeight) * 0.25;

        if (this.canJump && this.currentState !== 'idle' && this.currentState !== 'slide') {
            this.bobTime += delta * (this.isTacSprinting ? 18 : (this.isSprinting ? 14 : 9));
        }

        // 2. Camera Positioning & Roblox 3rd Person Scroll Zoom
        this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.2;

        // Head Position at Eye Height
        const headPos = new THREE.Vector3(
          this.playerPos.x,
          this.playerPos.y + this.currentEyeHeight + (this.canJump && !this.isSliding && this.currentState !== 'idle' ? Math.abs(Math.sin(this.bobTime)) * (this.isTacSprinting ? 0.08 : 0.04) : 0),
          this.playerPos.z
        );

        // Apply Pitch & Yaw Euler Rotation to Camera with Tilt
        const camTilt = this.isSliding ? -0.06 : (this.isTacSprinting ? Math.sin(this.bobTime * 0.5) * 0.03 : 0);
        const euler = new THREE.Euler(this.pitch, this.yaw, camTilt, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);

        if (this.cameraDistance > 0.4) {
          // 3rd Person View: Position Camera behind Head along look direction
          const backOffset = new THREE.Vector3(0, 0, this.cameraDistance);
          backOffset.applyQuaternion(this.camera.quaternion);
          this.camera.position.copy(headPos).add(backOffset);

          if (this.localAvatar) this.localAvatar.visible = true;
        } else {
          // 1st Person View: Camera is exactly at Head Position
          this.camera.position.copy(headPos);

          if (this.localAvatar) this.localAvatar.visible = false;
        }

        // Dynamic Sprint FOV stretch
        const targetFov = this.isTacSprinting ? 95 : (this.isSprinting ? 85 : 75);
        this.camera.fov += (targetFov - this.camera.fov) * 0.1;
        this.camera.updateProjectionMatrix();

        // 3. Local Roblox R6 Avatar Mesh Animations
        if (this.localAvatar) {
          const localUd = this.localAvatar.userData;

          // Local Avatar Position (Feet at y = playerPos.y) & Rotation (yaw)
          this.localAvatar.position.copy(this.playerPos);
          this.localAvatar.rotation.y = this.yaw;

          if (localUd && localUd.leftArmPivot) {
            let targetTorsoX = 0, targetLeftArmX = 0, targetRightArmX = 0, targetLeftLegX = 0, targetRightLegX = 0, targetTorsoY = 0.8;

            if (this.currentState === 'slide') {
              targetTorsoX = -0.5;
              targetLeftLegX = -0.8;
              targetRightLegX = -0.8;
              targetLeftArmX = 0.6;
              targetRightArmX = 0.6;
              targetTorsoY = 0.5;
            } else if (this.currentState === 'jump') {
              targetTorsoX = 0.1;
              targetLeftArmX = -2.8;
              targetRightArmX = -2.8;
              targetLeftLegX = 0.5;
              targetRightLegX = -0.5;
              targetTorsoY = 0.8;
            } else if (this.currentState === 'tac_sprint') {
              localUd.swingTime += delta * 18;
              const swing = Math.sin(localUd.swingTime) * 1.2;
              targetTorsoX = -0.4;
              targetLeftArmX = -2.2 + Math.sin(localUd.swingTime) * 0.2;
              targetRightArmX = -2.2 - Math.sin(localUd.swingTime) * 0.2;
              targetLeftLegX = -swing;
              targetRightLegX = swing;
              targetTorsoY = 0.8 + Math.abs(Math.sin(localUd.swingTime * 2)) * 0.08;
            } else if (this.currentState === 'sprint' || this.currentState === 'walk') {
              localUd.swingTime += delta * (this.currentState === 'sprint' ? 14 : 9);
              const swing = Math.sin(localUd.swingTime) * (this.currentState === 'sprint' ? 1.0 : 0.6);
              targetTorsoX = this.currentState === 'sprint' ? -0.2 : 0;
              targetLeftArmX = swing;
              targetRightArmX = -swing;
              targetLeftLegX = -swing;
              targetRightLegX = swing;
              targetTorsoY = 0.8 + Math.abs(Math.sin(localUd.swingTime * 2)) * 0.05;
            } else {
              localUd.swingTime += delta * 3;
              const breath = Math.sin(localUd.swingTime) * 0.05;
              targetTorsoX = 0;
              targetLeftArmX = breath;
              targetRightArmX = -breath;
              targetLeftLegX = 0;
              targetRightLegX = 0;
              targetTorsoY = 0.8 + Math.sin(localUd.swingTime * 2) * 0.02;
            }

            const animSpeed = 18 * delta;
            localUd.torso.rotation.x += (targetTorsoX - localUd.torso.rotation.x) * animSpeed;
            localUd.leftArmPivot.rotation.x += (targetLeftArmX - localUd.leftArmPivot.rotation.x) * animSpeed;
            localUd.rightArmPivot.rotation.x += (targetRightArmX - localUd.rightArmPivot.rotation.x) * animSpeed;
            localUd.leftLegPivot.rotation.x += (targetLeftLegX - localUd.leftLegPivot.rotation.x) * animSpeed;
            localUd.rightLegPivot.rotation.x += (targetRightLegX - localUd.rightLegPivot.rotation.x) * animSpeed;
            localUd.torso.position.y += (targetTorsoY - localUd.torso.position.y) * animSpeed;
          }
        }

        // Broadcast Position at 30Hz
        this.broadcastPosition();
      }

      // 4. Ultra-Smooth Remote Roblox R6 Limb Animations & Lerp
      Object.keys(this.remoteAvatars).forEach((id) => {
        const avatar = this.remoteAvatars[id];
        const targetPos = this.remoteTargetPos[id];
        const targetRot = this.remoteTargetRot[id];
        const state = this.remoteState[id] || 'idle';

        if (avatar && targetPos) {
          avatar.position.lerp(targetPos, 0.22);
          avatar.rotation.y += (targetRot - avatar.rotation.y) * 0.22;

          const ud = avatar.userData;
          if (ud && ud.leftArmPivot) {
            let targetTorsoX = 0, targetLeftArmX = 0, targetRightArmX = 0, targetLeftLegX = 0, targetRightLegX = 0, targetTorsoY = 0.8;

            if (state === 'slide') {
              targetTorsoX = -0.5;
              targetLeftLegX = -0.8;
              targetRightLegX = -0.8;
              targetLeftArmX = 0.6;
              targetRightArmX = 0.6;
              targetTorsoY = 0.5;
            } else if (state === 'jump') {
              targetTorsoX = 0.1;
              targetLeftArmX = -2.8;
              targetRightArmX = -2.8;
              targetLeftLegX = 0.5;
              targetRightLegX = -0.5;
              targetTorsoY = 0.8;
            } else if (state === 'tac_sprint') {
              ud.swingTime += delta * 18;
              const swing = Math.sin(ud.swingTime) * 1.2;
              targetTorsoX = -0.4;
              targetLeftArmX = -2.2 + Math.sin(ud.swingTime) * 0.2;
              targetRightArmX = -2.2 - Math.sin(ud.swingTime) * 0.2;
              targetLeftLegX = -swing;
              targetRightLegX = swing;
              targetTorsoY = 0.8 + Math.abs(Math.sin(ud.swingTime * 2)) * 0.08;
            } else if (state === 'sprint' || state === 'walk') {
              ud.swingTime += delta * (state === 'sprint' ? 14 : 9);
              const swing = Math.sin(ud.swingTime) * (state === 'sprint' ? 1.0 : 0.6);
              targetTorsoX = state === 'sprint' ? -0.2 : 0;
              targetLeftArmX = swing;
              targetRightArmX = -swing;
              targetLeftLegX = -swing;
              targetRightLegX = swing;
              targetTorsoY = 0.8 + Math.abs(Math.sin(ud.swingTime * 2)) * 0.05;
            } else {
              ud.swingTime += delta * 3;
              const breath = Math.sin(ud.swingTime) * 0.05;
              targetTorsoX = 0;
              targetLeftArmX = breath;
              targetRightArmX = -breath;
              targetLeftLegX = 0;
              targetRightLegX = 0;
              targetTorsoY = 0.8 + Math.sin(ud.swingTime * 2) * 0.02;
            }

            const animSpeed = 18 * delta;
            ud.torso.rotation.x += (targetTorsoX - ud.torso.rotation.x) * animSpeed;
            ud.leftArmPivot.rotation.x += (targetLeftArmX - ud.leftArmPivot.rotation.x) * animSpeed;
            ud.rightArmPivot.rotation.x += (targetRightArmX - ud.rightArmPivot.rotation.x) * animSpeed;
            ud.leftLegPivot.rotation.x += (targetLeftLegX - ud.leftLegPivot.rotation.x) * animSpeed;
            ud.rightLegPivot.rotation.x += (targetRightLegX - ud.rightLegPivot.rotation.x) * animSpeed;
            ud.torso.position.y += (targetTorsoY - ud.torso.position.y) * animSpeed;
          }
        }
      });

      // 5. Rotate skybox particles gently
      if (this.particles) {
        this.particles.rotation.y += 0.0005;
      }

      // 6. Render Scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  window.Global3D = new Global3DEngine();
})();
