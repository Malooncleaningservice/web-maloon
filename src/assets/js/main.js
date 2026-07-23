/**
 * Main JavaScript file for Maloon Service
 * Streamlined version for Eleventy-based site
 */

// Configuration constants
const CONFIG = {
  DESKTOP_BREAKPOINT: 921,
  SCROLL_OFFSET: 80,
  ANIMATION_THRESHOLD: 0.1
};

// State management
const state = {
  eventListeners: new Map(),
  observers: {
    scroll: null,
    mutation: null,
    intersection: null
  }
};

/**
 * Utility Functions
 */
class Utils {
  static addEventListener(element, event, handler, options = {}) {
    if (!element) return;

    element.addEventListener(event, handler, options);
    const key = `${element.tagName}-${event}`;

    if (!state.eventListeners.has(key)) {
      state.eventListeners.set(key, []);
    }
    state.eventListeners.get(key).push({ element, event, handler, options });

    return () => element.removeEventListener(event, handler, options);
  }

  static cleanupEventListeners() {
    state.eventListeners.forEach(listeners => {
      listeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
    });
    state.eventListeners.clear();
  }

  static cleanupObservers() {
    Object.values(state.observers).forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
    state.observers = { scroll: null, mutation: null, intersection: null };
  }

  static getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  static isDesktop() {
    return window.matchMedia(`(min-width: ${CONFIG.DESKTOP_BREAKPOINT}px)`).matches;
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

/**
 * Navigation Management
 */
class Navbar {
  static init() {
    this.setupMobileMenu();
    this.setupActiveLinks();
  }

  static setupMobileMenu() {
    const tier2 = document.querySelector('.nav-tier-2');
    if (!tier2) return;

    let lastScrollTop = 0;
    const hideThreshold = 100;

    Utils.addEventListener(window, 'scroll', Utils.debounce(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > hideThreshold && scrollTop > lastScrollTop) {
        tier2.classList.add('hidden');
      } else if (scrollTop < lastScrollTop - 10) {
        tier2.classList.remove('hidden');
      }

      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, 10));
  }

  static setupActiveLinks() {
    const currentPage = Utils.getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-menu a');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href === currentPage || href.includes(currentPage))) {
        link.classList.add('active');
      }
    });
  }
}

/**
 * Sidebar Management
 */
class Sidebar {
  static init() {
    this.populateLinks();
    this.setupScrollSpy();
  }

  static populateLinks() {
    const currentPage = Utils.getCurrentPage().replace('.html', '');
    const pageName = currentPage === 'index' ? 'index' : currentPage;

    // Try to get sidebar data from a global variable set in the page template
    const sidebarData = window.SIDEBAR_DATA || this.getDefaultSidebarData(pageName);

    const sidebarContainer = document.querySelector('.sidebar-wrapper #sidebar-placeholder, .sidebar-wrapper .sidebar');
    const mobileSectionStrip = document.getElementById('mobile-section-strip');

    if (!sidebarData || sidebarData.length === 0) {
      if (sidebarContainer) sidebarContainer.style.display = 'none';
      if (mobileSectionStrip) mobileSectionStrip.style.display = 'none';
      return;
    }

    // Populate sidebar
    if (sidebarContainer) {
      const sidebarNav = document.createElement('nav');
      sidebarNav.className = 'sidebar-nav';
      sidebarNav.setAttribute('aria-label', 'Page navigation');

      sidebarData.forEach(item => {
        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.className = 'sidebar-link';
        link.textContent = item.text;
        link.dataset.target = item.id;
        sidebarNav.appendChild(link);
      });

      sidebarContainer.innerHTML = '';
      sidebarContainer.appendChild(sidebarNav);
    }

    // Populate mobile section pills
    if (mobileSectionStrip) {
      mobileSectionStrip.innerHTML = '';

      sidebarData.forEach(item => {
        const pill = document.createElement('a');
        pill.href = `#${item.id}`;
        pill.className = 'section-pill';
        pill.textContent = item.text;
        pill.dataset.target = item.id;
        mobileSectionStrip.appendChild(pill);
      });
    }
  }

  static getDefaultSidebarData(pageName) {
    // Fallback sidebar configurations
    const defaults = {
      'index': [
        { id: 'home-hero-placeholder', text: 'Overview' },
        { id: 'services-overview', text: 'Services' },
        { id: 'final-cta', text: 'Get a Quote' }
      ],
      'about': [
        { id: 'about-hero-placeholder', text: 'Overview' },
        { id: 'company-overview', text: 'Our Story' },
        { id: 'mission-section', text: 'Our Mission' }
      ],
      'contact': [
        { id: 'contact-hero-placeholder', text: 'Overview' },
        { id: 'contactForm', text: 'Quote Form' }
      ]
    };

    return defaults[pageName] || [];
  }

  static setupScrollSpy() {
    const sidebarLinks = document.querySelectorAll('.sidebar-link, .section-pill');
    if (sidebarLinks.length === 0) return;

    const sections = Array.from(sidebarLinks).map(link => {
      const id = link.dataset.target;
      return document.getElementById(id);
    }).filter(Boolean);

    if (sections.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sidebarLinks.forEach(link => {
            if (link.dataset.target === entry.target.id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
    state.observers.scroll = observer;
  }
}

/**
 * Sticky Bar Management
 */
class StickyBarManager {
  static init() {
    const stickyBar = document.getElementById('sticky-quote-bar');
    if (!stickyBar) return;

    const showThreshold = 300;

    Utils.addEventListener(window, 'scroll', Utils.debounce(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > showThreshold) {
        stickyBar.classList.add('visible');
      } else {
        stickyBar.classList.remove('visible');
      }
    }, 10));
  }
}

/**
 * FAQ Management
 */
class FAQManager {
  static init() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (!question || !answer) return;

      Utils.addEventListener(question, 'click', () => {
        const isOpen = question.getAttribute('aria-expanded') === 'true';

        // Close all other FAQs
        faqItems.forEach(otherItem => {
          const otherQuestion = otherItem.querySelector('.faq-question');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          if (otherQuestion && otherAnswer && otherItem !== item) {
            otherQuestion.setAttribute('aria-expanded', 'false');
            otherAnswer.style.maxHeight = null;
            otherQuestion.querySelector('.faq-icon').textContent = '+';
          }
        });

        // Toggle current FAQ
        if (isOpen) {
          question.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = null;
          question.querySelector('.faq-icon').textContent = '+';
        } else {
          question.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          question.querySelector('.faq-icon').textContent = '−';
        }
      });
    });
  }
}

/**
 * Form Management
 */
class FormManager {
  static init() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    Utils.addEventListener(contactForm, 'submit', (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const data = {};
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }

      console.log('Form submitted:', data);
      alert('Thank you for your request! We will contact you shortly.');
      contactForm.reset();
    });
  }
}

/**
 * Scroll Animations
 */
class ScrollManager {
  static init() {
    this.setupRevealAnimations();
    this.setupSmoothScroll();
  }

  static setupRevealAnimations() {
    const revealElements = document.querySelectorAll('.reveal');

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: CONFIG.ANIMATION_THRESHOLD
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
        }
      });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
    state.observers.intersection = observer;

    // Watch for dynamically added elements
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const newReveals = node.querySelectorAll ? node.querySelectorAll('.reveal') : [];
            newReveals.forEach(el => {
              if (!el.classList.contains('reveal-active')) {
                observer.observe(el);
              }
            });
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    state.observers.mutation = mutationObserver;
  }

  static setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
      Utils.addEventListener(link, 'click', (e) => {
        const targetId = link.getAttribute('href').substring(1);
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();

        const top = target.getBoundingClientRect().top + window.pageYOffset - CONFIG.SCROLL_OFFSET;

        window.scrollTo({
          top: top,
          behavior: 'smooth'
        });
      });
    });
  }
}

/**
 * Main Application
 */
class MaloonApp {
  static async initialize() {
    try {
      Navbar.init();
      Sidebar.init();
      StickyBarManager.init();
      FAQManager.init();
      FormManager.init();
      ScrollManager.init();

      // Set year in footer
      const yearElements = document.querySelectorAll('#year, .year');
      yearElements.forEach(el => {
        el.textContent = new Date().getFullYear();
      });

      console.log('✓ Maloon Service app initialized');
    } catch (error) {
      console.error('Error initializing app:', error);
    }
  }

  static cleanup() {
    Utils.cleanupEventListeners();
    Utils.cleanupObservers();
    console.log('Maloon Service app cleaned up');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MaloonApp.initialize());
} else {
  MaloonApp.initialize();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => MaloonApp.cleanup());
