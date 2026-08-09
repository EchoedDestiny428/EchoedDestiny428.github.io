/* ==========================================================================
   HIGH-DETAIL 3D FIRST-PERSON WEBGL ENGINE WITH JUMPING & SPRINTING
   ========================================================================== */

(function () {
  'use strict';

  class Global3DEngine {
    constructor() {
      this.container = document.getElementById('advanced-3d-view');
      this.canvas = document.getElementById('3d-webgl-canvas');
      this.isInitialized = false;
      this.isLocked = false;

      // Player Movement State
      this.moveForward = false;
      this.moveBackward = false;
      this.moveLeft = false;
      this.moveRight = false;
      this.isSprinting = false;
      this.canJump = true;

      this.velocity = new THREE.Vector3();
      this.direction = new THREE.Vector3();
      this.prevTime = performance.now();

      // Interactive Terminals & Raycaster
      this.raycaster = new THREE.Raycaster();
      this.mouseCenter = new THREE.Vector2(0, 0);
      this.terminals = [];
      this.hoveredTerminal = null;

      // Multiplayer (WebRTC via PeerJS)
      this.peer = null;
      this.myId = 'player_' + Math.floor(Math.random() * 899999 + 100000);
      this.peers = {};
      this.remoteAvatars = {};
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
      this.camera.position.set(0, 1.7, 8); // Eye-level height

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

      // 4. PointerLock Controls
      if (THREE.PointerLockControls) {
        this.controls = new THREE.PointerLockControls(this.camera, document.body);
        
        // Clicking canvas locks pointer controls seamlessly without blocking screen
        if (this.canvas) {
          this.canvas.addEventListener('click', () => {
            if (!this.isLocked) {
              this.controls.lock();
            }
          });
        }

        const overlayTrigger = document.getElementById('fps-click-trigger');
        if (overlayTrigger) {
          overlayTrigger.addEventListener('click', () => {
            this.controls.lock();
            overlayTrigger.style.display = 'none'; // Hide overlay completely once entered
          });
        }

        this.controls.addEventListener('lock', () => {
          this.isLocked = true;
          document.body.classList.add('fps-locked');
          if (overlayTrigger) overlayTrigger.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
          this.isLocked = false;
          // Unlocking (e.g., via Alt+Tab or ESC) keeps screen clean without blocking menus
        });

        this.scene.add(this.controls.getObject());
      }

      // 5. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
      this.scene.add(ambientLight);

      const mainGoldLight = new THREE.PointLight(0xd4af37, 2, 40);
      mainGoldLight.position.set(0, 10, 0);
      mainGoldLight.castShadow = true;
      this.scene.add(mainGoldLight);

      // 6. Build Environment (Clean Obsidian floor & sky particles)
      this.buildEnvironment();

      // 7. Event Listeners
      this.setupControls();
      window.addEventListener('resize', () => this.onWindowResize());

      // 8. Global Multiplayer Connection
      this.initMultiplayer();

      // 9. Start Render Loop
      this.animate();
    }

    buildEnvironment() {
      // Clean Obsidian Floor Grid
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

      // Gold Grid Lines on Floor
      const gridHelper = new THREE.GridHelper(floorSize, 60, 0xd4af37, 0x333344);
      gridHelper.position.y = 0.01;
      this.scene.add(gridHelper);

      // Floating Particle Skybox Nodes
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
    }

    setupControls() {
      const onKeyDown = (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
          case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
          case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
          case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
          case 'ShiftLeft': case 'ShiftRight': this.isSprinting = true; break;
          case 'Space':
            if (this.canJump) {
              this.velocity.y += 12;
              this.canJump = false;
            }
            break;
        }
      };

      const onKeyUp = (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
          case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
          case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
          case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
          case 'ShiftLeft': case 'ShiftRight': this.isSprinting = false; break;
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    initMultiplayer() {
      if (!window.Peer) return;

      try {
        this.peer = new Peer(this.myId, { debug: 1 });

        this.peer.on('open', (id) => {
          console.log('[Multiplayer] Local Peer ID:', id);
          this.connectToGlobalWorld();
        });

        this.peer.on('connection', (conn) => {
          this.setupPeerConnection(conn);
        });
      } catch (e) {
        console.warn('[Multiplayer] WebRTC Init Warning:', e);
      }
    }

    connectToGlobalWorld() {
      const hubId = 'echoed_destiny_global_world_hub';
      if (this.myId !== hubId) {
        const conn = this.peer.connect(hubId);
        if (conn) {
          this.setupPeerConnection(conn);
        }
      }
    }

    setupPeerConnection(conn) {
      this.peers[conn.peer] = conn;

      conn.on('open', () => {
        this.createRemoteAvatar(conn.peer);
        this.updatePlayerCount();
      });

      conn.on('data', (data) => {
        if (data.type === 'pos') {
          this.updateRemoteAvatarPosition(data);
        }
      });

      conn.on('close', () => {
        this.removeRemoteAvatar(conn.peer);
        delete this.peers[conn.peer];
        this.updatePlayerCount();
      });
    }

    createRemoteAvatar(peerId) {
      if (this.remoteAvatars[peerId]) return;

      const group = new THREE.Group();

      const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.8,
        roughness: 0.2
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.7;
      group.add(body);

      const visorGeo = new THREE.BoxGeometry(0.4, 0.15, 0.2);
      const visorMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 1.1, -0.2);
      group.add(visor);

      this.scene.add(group);
      this.remoteAvatars[peerId] = group;
    }

    updateRemoteAvatarPosition(data) {
      let avatar = this.remoteAvatars[data.id];
      if (!avatar) {
        this.createRemoteAvatar(data.id);
        avatar = this.remoteAvatars[data.id];
      }

      if (avatar) {
        avatar.position.set(data.x, data.y - 1.7, data.z);
        avatar.rotation.y = data.ry;
      }
    }

    removeRemoteAvatar(peerId) {
      const avatar = this.remoteAvatars[peerId];
      if (avatar) {
        this.scene.remove(avatar);
        delete this.remoteAvatars[peerId];
      }
    }

    updatePlayerCount() {
      const countElem = document.getElementById('global-online-count');
      const count = Object.keys(this.peers).length + 1;
      if (countElem) {
        countElem.textContent = `${count} PLAYER${count > 1 ? 'S' : ''} ONLINE`;
      }
    }

    broadcastPosition() {
      if (!this.controls || !this.isLocked) return;

      const pos = this.controls.getObject().position;
      const ry = this.controls.getObject().rotation.y;

      const payload = {
        type: 'pos',
        id: this.myId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        ry: ry
      };

      Object.values(this.peers).forEach((conn) => {
        if (conn.open) {
          conn.send(payload);
        }
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

      // 1. Movement Physics & Jumping & Sprinting
      if (this.controls && this.isLocked) {
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        // Gravity physics for Jumping
        this.velocity.y -= 30.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        const speedMult = this.isSprinting ? 75.0 : 40.0;

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speedMult * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speedMult * delta;

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);

        // Apply Vertical Jump/Gravity position
        this.controls.getObject().position.y += this.velocity.y * delta;

        // Floor Collision Check (Eye level = 1.7)
        if (this.controls.getObject().position.y < 1.7) {
          this.velocity.y = 0;
          this.controls.getObject().position.y = 1.7;
          this.canJump = true;
        }

        // Arena Boundaries
        const pos = this.controls.getObject().position;
        pos.x = Math.max(-28, Math.min(28, pos.x));
        pos.z = Math.max(-28, Math.min(28, pos.z));

        // Broadcast Position at 30Hz
        this.broadcastPosition();
      }

      // 2. Rotate skybox particles gently
      if (this.particles) {
        this.particles.rotation.y += 0.0005;
      }

      // 3. Render Scene
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  window.Global3D = new Global3DEngine();
})();
