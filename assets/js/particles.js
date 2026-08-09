// Floating background particles effect
document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('particles-container');
  if (!container) return;

  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const left = Math.random() * 100;
    const delay = Math.random() * 16;
    const duration = Math.random() * 10 + 12;
    const size = Math.random() * 4 + 2;

    particle.style.left = left + '%';
    particle.style.animationDelay = delay + 's';
    particle.style.animationDuration = duration + 's';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';

    container.appendChild(particle);
  }
});
