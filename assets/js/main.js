// Portfolio Interactive Engine
document.addEventListener('DOMContentLoaded', function() {
  
  // 1. Mobile Navigation Toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      navToggle.classList.toggle('open');
      navMenu.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
        navToggle.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });
  }

  // 2. Project Category / Tag Filter System
  const filterContainer = document.getElementById('project-filters');
  const projectCards = document.querySelectorAll('#projects-grid .project-card');

  if (filterContainer && projectCards.length > 0) {
    const filterButtons = filterContainer.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Active button highlight
        filterButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filterValue = this.getAttribute('data-filter').toLowerCase();

        projectCards.forEach(card => {
          const category = (card.getAttribute('data-category') || '').toLowerCase();
          const tags = (card.getAttribute('data-tags') || '').toLowerCase();

          if (filterValue === 'all' || category.includes(filterValue) || tags.includes(filterValue)) {
            card.style.display = 'flex';
            card.classList.add('animate-fade-in');
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // 3. Project Quick View Modal
  const modal = document.getElementById('project-modal');
  const modalClose = document.getElementById('modal-close');

  if (modal && modalClose) {
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const modalCategory = document.getElementById('modal-category');
    const modalDescription = document.getElementById('modal-description');
    const modalTags = document.getElementById('modal-tags');
    const modalGithub = document.getElementById('modal-github');
    const modalDemo = document.getElementById('modal-demo');

    // Attach click triggers on project cards
    document.addEventListener('click', function(e) {
      const trigger = e.target.closest('.project-modal-trigger');
      if (!trigger) return;

      const title = trigger.getAttribute('data-title') || 'Project Details';
      const subtitle = trigger.getAttribute('data-subtitle') || '';
      const category = trigger.getAttribute('data-category') || 'Project';
      const description = trigger.getAttribute('data-description') || '';
      const tagsString = trigger.getAttribute('data-tags') || '';
      const github = trigger.getAttribute('data-github') || '#';
      const demo = trigger.getAttribute('data-demo') || '#';

      if (modalTitle) modalTitle.textContent = title;
      if (modalSubtitle) modalSubtitle.textContent = subtitle;
      if (modalCategory) modalCategory.textContent = category;
      if (modalDescription) modalDescription.textContent = description;

      if (modalTags) {
        modalTags.innerHTML = '';
        if (tagsString) {
          tagsString.split(',').forEach(tag => {
            const span = document.createElement('span');
            span.className = 'pill';
            span.textContent = tag.trim();
            modalTags.appendChild(span);
          });
        }
      }

      if (modalGithub) modalGithub.href = github;
      if (modalDemo) modalDemo.href = demo;

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    });

    const closeModal = function() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    };

    modalClose.addEventListener('click', closeModal);

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  // 4. Back to Top Button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 5. Contact Form Demonstration Handler
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  if (contactForm && formStatus) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
      }

      formStatus.className = 'form-status success';
      formStatus.innerHTML = '✨ Thank you! Your message has been received. (Demonstration Mode)';

      setTimeout(function() {
        contactForm.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
      }, 2500);
    });
  }

});
