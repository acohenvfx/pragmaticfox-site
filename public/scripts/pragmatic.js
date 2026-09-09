(() => {
  // Keep the shared product menu usable on every page, including pages that
  // only use the inline toggle handler. The delegated listener adds the
  // missing outside-click and Escape behavior without double-toggling it.
  const dropdowns = [...document.querySelectorAll('.nav-dropdown')];
  const setDropdownState = (dropdown, open) => {
    dropdown.classList.toggle('open', open);
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close products menu' : 'Open products menu');
      if (menu) {
        if (!menu.id) menu.id = `products-menu-${dropdowns.indexOf(dropdown) + 1}`;
        toggle.setAttribute('aria-controls', menu.id);
      }
    }
  };
  const closeDropdowns = (except = null) => {
    dropdowns.forEach((dropdown) => {
      if (dropdown !== except) setDropdownState(dropdown, false);
    });
  };

  if (dropdowns.length) {
    dropdowns.forEach((dropdown) => setDropdownState(dropdown, dropdown.classList.contains('open')));
    document.addEventListener('click', (event) => {
      const toggle = event.target.closest?.('.nav-dropdown-toggle');
      if (toggle) {
        const dropdown = toggle.closest('.nav-dropdown');
        closeDropdowns(dropdown);
        // Existing pages have an inline handler; the fallback 404 page does
        // not, so toggle it here only when the attribute is absent.
        const open = toggle.hasAttribute('onclick')
          ? dropdown.classList.contains('open')
          : !dropdown.classList.contains('open');
        setDropdownState(dropdown, open);
        return;
      }
      if (!event.target.closest?.('.nav-dropdown')) closeDropdowns();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDropdowns();
        return;
      }
      if (event.key === 'ArrowDown') {
        const openDropdown = dropdowns.find((dropdown) => dropdown.classList.contains('open'));
        if (!openDropdown) return;
        const firstItem = openDropdown.querySelector('.nav-dropdown-menu a');
        if (firstItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll('.pf-reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    revealTargets.forEach((node) => observer.observe(node));
  }

  if (!reduced) {
    const depthTargets = [...document.querySelectorAll('.pf-depth')];
    let ticking = false;
    const updateDepth = () => {
      const viewport = window.innerHeight;
      depthTargets.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const progress = (viewport - rect.top) / (viewport + rect.height);
        const shift = Math.max(-18, Math.min(18, (progress - .5) * 36));
        node.style.setProperty('--pf-shift', `${shift}px`);
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateDepth);
    }, { passive: true });
    updateDepth();
  }
})();

/* Product screenshot lightbox: reuse the same slide set as the inline
   preview and expose the same left/right navigation at full size. */
(() => {
  const overlay = document.getElementById('imageModalOverlay');
  const modal = overlay?.querySelector('.image-modal');
  const image = document.getElementById('imageModalImg');
  const title = document.getElementById('imageModalTitle');
  if (!overlay || !modal || !image || !title) return;

  const slideshowSlides = [...document.querySelectorAll('#slideshow img')];
  const panelSlide = document.querySelector('.panel-showcase .panel-frame > img');
  const slides = slideshowSlides.length ? slideshowSlides : (panelSlide ? [panelSlide] : []);
  if (!slides.length) return;

  let current = 0;
  const footer = modal.querySelector('.image-modal-footer');
  const nav = document.createElement('div');
  nav.className = 'image-modal-nav';
  nav.setAttribute('aria-label', 'Image navigation');
  nav.innerHTML = '<button class="image-modal-arrow image-modal-arrow-prev" type="button" aria-label="Previous slide">←</button>'
    + '<button class="image-modal-arrow image-modal-arrow-next" type="button" aria-label="Next slide">→</button>';
  modal.insertBefore(nav, footer || null);

  const previous = nav.querySelector('.image-modal-arrow-prev');
  const next = nav.querySelector('.image-modal-arrow-next');

  function sync() {
    const slide = slides[current];
    if (!slide) return;
    image.src = slide.currentSrc || slide.src;
    image.alt = slide.alt || '';
    title.textContent = slide.dataset.name || slide.alt || 'Image preview';
    overlay.classList.toggle('single-slide', slides.length < 2);
  }

  function select(index) {
    current = (index + slides.length) % slides.length;
    sync();
  }

  slides.forEach((slide, index) => {
    const remember = () => {
      current = index;
      if (overlay.classList.contains('open')) sync();
    };
    slide.addEventListener('click', remember);
    slide.addEventListener('keydown', remember);
  });

  previous.addEventListener('click', event => {
    event.stopPropagation();
    select(current - 1);
  });
  next.addEventListener('click', event => {
    event.stopPropagation();
    select(current + 1);
  });

  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(current - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(current + 1);
    }
  });
})();

/* Lightweight focus management for image/video previews. The product pages
   keep their existing open/close functions, so observing the shared `open`
   state gives keyboard users a reliable focus target and a contained Tab
   cycle without coupling this file to any one product's inline markup. */
(() => {
  const overlays = [...document.querySelectorAll('.image-modal-overlay, .video-modal-overlay')];
  if (!overlays.length || !('MutationObserver' in window)) return;

  let activeOverlay = null;
  let returnFocus = null;
  const focusable = (overlay) => [...overlay.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((node) => node.getClientRects().length);

  const sync = (overlay) => {
    const isOpen = overlay.classList.contains('open');
    if (isOpen && !overlay.dataset.pfFocusManaged) {
      activeOverlay = overlay;
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      overlay.dataset.pfFocusManaged = 'true';
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('pf-modal-open');
      requestAnimationFrame(() => focusable(overlay)[0]?.focus());
    } else if (!isOpen && overlay.dataset.pfFocusManaged) {
      delete overlay.dataset.pfFocusManaged;
      overlay.setAttribute('aria-hidden', 'true');
      if (activeOverlay === overlay) {
        activeOverlay = null;
        document.body.classList.remove('pf-modal-open');
        if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
        returnFocus = null;
      }
    }
  };

  overlays.forEach((overlay) => {
    if (!overlay.hasAttribute('aria-hidden')) overlay.setAttribute('aria-hidden', 'true');
    sync(overlay);
    new MutationObserver(() => sync(overlay)).observe(overlay, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  });

  document.addEventListener('keydown', (event) => {
    if (!activeOverlay || event.key !== 'Tab') return;
    const items = focusable(activeOverlay);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
