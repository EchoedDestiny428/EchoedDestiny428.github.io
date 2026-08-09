/* ==========================================================================
   AMBIENT GOLD & WHITE MESH ENGINE (BASIC & ADVANCED MODES)
   ========================================================================== */

(function () {
  'use strict';

  class AmbientMeshSystem {
    constructor() {
      this.canvas = document.getElementById('cyber-canvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'cyber-canvas';
        document.body.appendChild(this.canvas);
      }
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: -1000, y: -1000 };
      this.mode = localStorage.getItem('cyber_mode') || 'basic';

      this.init();
    }

    init() {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });

      this.createParticles();
      this.loop();
    }

    resize() {
      this.width = this.canvas.width = window.innerWidth;
      this.height = this.canvas.height = window.innerHeight;
      this.createParticles();
    }

    setMode(newMode) {
      this.mode = newMode;
      this.createParticles();
    }

    createParticles() {
      this.particles = [];
      const count = this.mode === 'advanced' ? 65 : 20;
      const colors = ['#d4af37', '#f3e5ab', '#ffffff'];

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * (this.mode === 'advanced' ? 0.6 : 0.2),
          vy: (Math.random() - 0.5) * (this.mode === 'advanced' ? 0.6 : 0.2),
          radius: Math.random() * 2 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.4 + 0.2
        });
      }
    }

    loop() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > this.width) p.vx *= -1;
        if (p.y < 0 || p.y > this.height) p.vy *= -1;

        // Draw smooth rounded dot
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fill();

        // Connect ambient gold lines in Advanced mode
        if (this.mode === 'advanced') {
          for (let j = i + 1; j < this.particles.length; j++) {
            const p2 = this.particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 130) {
              this.ctx.beginPath();
              this.ctx.moveTo(p.x, p.y);
              this.ctx.lineTo(p2.x, p2.y);
              this.ctx.strokeStyle = p.color;
              this.ctx.globalAlpha = (1 - dist / 130) * 0.2;
              this.ctx.lineWidth = 1;
              this.ctx.stroke();
            }
          }
        }
      }

      this.ctx.globalAlpha = 1.0;
      requestAnimationFrame(() => this.loop());
    }
  }

  window.AmbientMesh = new AmbientMeshSystem();
})();
