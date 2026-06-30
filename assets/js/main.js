/**
 * Main JavaScript file for Maloon Services
 * Improved version with better organization, performance, and maintainability
 */

// Configuration constants
const CONFIG = {
  CONTENT_JSON_URL: 'data/content.json',
  DEFAULT_BRAND: {
    name: "Maloon Cleaning Service",
    tagline: "Professional Cleaning",
    slogan: "We make a difference."
  },
  DEFAULT_CONTACT: {
    phone: "614-555-1234",
    phone_formatted: "614-555-1234",
    email: "info@maloonservices.com",
    address: "123 Cleaning Way, Columbus, OH 43215",
    whatsapp: "https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote."
  },
  DESKTOP_BREAKPOINT: 921,
  SCROLL_OFFSET: 80,
  ANIMATION_THRESHOLD: 0.1
};

// State management
const state = {
  content: null,
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
  static async fetchWithFallback(url, fallback) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.warn(`Fallback used for ${url}:`, error.message);
      return fallback;
    }
  }

  static async fetchHTML(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      return await response.text();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      return null;
    }
  }

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

  static debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

/**
 * Content Management
 */
class ContentManager {
  static async loadContent() {
    if (state.content) return state.content;

    const fallbackContent = {
      brand: CONFIG.DEFAULT_BRAND,
      contact: CONFIG.DEFAULT_CONTACT,
      navigation: {
        sidebar: {}
      },
      pages: {}
    };

    state.content = await Utils.fetchWithFallback(CONFIG.CONTENT_JSON_URL, fallbackContent);
    return state.content;
  }

  static getContent() {
    return state.content;
  }

  static getBrand() {
    return state.content?.brand || CONFIG.DEFAULT_BRAND;
  }

  static getContact() {
    return state.content?.contact || CONFIG.DEFAULT_CONTACT;
  }
}

/**
 * Component Injection System
 */
class ComponentInjector {
  static async injectComponent(placeholderId, templateUrl, dataMapper) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return false;

    try {
      const template = await Utils.fetchHTML(templateUrl);
      if (!template) throw new Error('Template not found');

      const data = dataMapper();
      if (!data) return false;

      let html = template;
      for (const [key, value] of Object.entries(data)) {
        html = html.replace(new RegExp(`{${key}}`, 'g'), value);
      }

      placeholder.innerHTML = html;
      return true;
    } catch (error) {
      console.error(`Error injecting component ${placeholderId}:`, error.message);
      return false;
    }
  }

  static async injectNavbar() {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/navbar.html');
    if (template) {
      placeholder.innerHTML = template;
      this.populateNavbar();
      Navbar.init();
    } else {
      // Fallback navbar
      placeholder.innerHTML = `
        <nav class="main-nav">
          <div class="nav-container">
            <div class="logo">
              <img src="logo-maloon.png" alt="Maloon Cleaning Service Logo" style="height:140px; width:auto;">
              
            </div>
            <ul class="nav-menu">
              <li class="menu-item"><a href="index.html" class="active">Home</a></li>
              <li class="menu-item"><a href="about.html">About</a></li>
              <li class="menu-item"><a href="services.html">Services</a></li>
              <li class="menu-item"><a href="contact.html">Contact</a></li>
              <li class="menu-item"><a href="faq.html">FAQ</a></li>
            </ul>
            <a href="${CONFIG.DEFAULT_CONTACT.whatsapp}" class="cta-button desktop-cta">Instant WhatsApp Message</a>
          </div>
        </nav>
      `;
      this.populateNavbar();
      Navbar.init();
    }
  }

  static populateNavbar() {
    const content = ContentManager.getContent();
    if (!content) return;

    const logoText = document.querySelector('.logo-text');
    if (logoText && content.brand) {
      const companyName = logoText.querySelector('.company-name');
      const tagline = logoText.querySelector('.tagline');

      if (companyName) companyName.textContent = content.brand.name;
      if (tagline) tagline.textContent = content.brand.tagline;
    }

    if (content.contact) {
      const desktopCta = document.querySelector('.desktop-cta');
      if (desktopCta) {
        desktopCta.textContent = 'Get a Free Quote';
        desktopCta.href = content.contact.whatsapp;
      }
    }
  }

  static async injectSidebar() {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/sidebar.html');
    if (template) {
      placeholder.innerHTML = template;
      Sidebar.init();
    } else {
      // Fallback sidebar
      placeholder.innerHTML = `
        <div class="sidebar">
          <div class="sidebar-content">
            <div class="sidebar-header"><h3>Quick Navigation</h3></div>
            <nav class="sidebar-nav"><ul class="sidebar-menu"></ul></nav>
          </div>
        </div>
      `;
      Sidebar.init();
    }
  }

  static async injectFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/footer.html');
    if (template) {
      placeholder.innerHTML = template;
      this.updateCopyrightYear();
    } else {
      // Fallback footer
      placeholder.innerHTML = `
        <footer class="main-footer">
          <div class="container">
            <div class="footer-grid">
              <div class="footer-column">
                <img src="logo-maloon.png" alt="Maloon Services Logo" style="height:120px; width:auto; margin-bottom: 15px;">
                <p class="tagline">We make a difference.</p>
              </div>
              <div class="footer-column">
                <h3>Address</h3>
                <div class="footer-divider"></div>
                <div class="address-info">
                  <i class="fas fa-map-marker-alt"></i>
                  <p>123 Cleaning Way<br>Columbus, OH 43215</p>
                </div>
              </div>
              <div class="footer-column">
                <h3>Contact us</h3>
                <div class="footer-divider"></div>
                <div class="contact-info">
                  <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <p>614-555-1234</p>
                  </div>
                  <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <p>info@maloonservices.com</p>
                  </div>
                </div>
              </div>
              <div class="footer-column">
                <h3>Follow Us</h3>
                <div class="footer-divider"></div>
                <div class="social-media">
                  <a href="#" class="social-icon"><i class="fab fa-facebook-f"></i></a>
                  <a href="#" class="social-icon"><i class="fab fa-twitter"></i></a>
                  <a href="#" class="social-icon"><i class="fab fa-instagram"></i></a>
                  <a href="#" class="social-icon"><i class="fab fa-linkedin-in"></i></a>
                </div>
              </div>
            </div>
            <div class="footer-bottom">
              <div class="footer-links">
                <a href="privacy.html">Privacy Policy</a>
              </div>
              <div class="copyright">
                <p>© <span id="year"></span> Maloon Services. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      `;
      this.updateCopyrightYear();
    }
  }

  static updateCopyrightYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }

  static async injectAllComponents() {
    await this.injectStickyBar();
    await this.injectNavbar();
    await this.injectFooter();
    await this.injectSidebar();

    // Inject page-specific components
    await this.injectSplitHero();
    await this.injectTransformationStrip();
    this.injectHeroComponents();
    this.injectCTAComponents();
    this.injectWhyChooseUsComponents();
    this.injectServiceAreasComponents();
  }

  static async injectStickyBar() {
    const placeholder = document.getElementById('sticky-bar-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/sticky-quote-bar.html');
    if (template) {
      placeholder.innerHTML = template;
      StickyBarManager.init();
    }
  }

  static async injectSplitHero() {
    const placeholder = document.getElementById('split-hero-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/split-hero.html');
    if (template) {
      placeholder.innerHTML = template;
    }
  }

  static async injectTransformationStrip() {
    const placeholder = document.getElementById('transformation-strip-placeholder');
    if (!placeholder) return;

    const template = await Utils.fetchHTML('assets/components/transformation-strip.html');
    if (template) {
      placeholder.innerHTML = template;
    }
  }

  static injectHeroComponents() {
    document.querySelectorAll('[id$="-hero-placeholder"]').forEach(placeholder => {
      const pageName = placeholder.id.replace('-hero-placeholder', '');
      HeroComponent.inject(pageName, placeholder);
    });
  }

  static injectCTAComponents() {
    document.querySelectorAll('[id$="-cta-placeholder"]').forEach(placeholder => {
      const pageName = placeholder.id.replace('-cta-placeholder', '');
      CTAComponent.inject(pageName, placeholder);
    });
  }

  static injectWhyChooseUsComponents() {
    document.querySelectorAll('[id$="-why-choose-placeholder"]').forEach(placeholder => {
      const pageName = placeholder.id.replace('-why-choose-placeholder', '');
      WhyChooseUsComponent.inject(pageName, placeholder);
    });
  }

  static injectServiceAreasComponents() {
    document.querySelectorAll('[id$="-service-areas-placeholder"]').forEach(placeholder => {
      const pageName = placeholder.id.replace('-service-areas-placeholder', '');
      ServiceAreasComponent.inject(pageName, placeholder);
    });
  }
}

/**
 * Component Classes
 */
class HeroComponent {
  static getData(pageName) {
    const heroData = {
      'index': {
        title: 'Maloon Services<br>Columbus, OH',
        subtitle: 'Professional Janitorial Services for Businesses & Homes',
        background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'about': {
        title: 'About Maloon Services',
        subtitle: 'Columbus, OH\'s Trusted Commercial & Residential Cleaning Company',
        background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'business': {
        title: 'Commercial Cleaning Services',
        subtitle: 'Professional Solutions for Every Business in Columbus, OH',
        background_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'services': {
        title: 'Our Comprehensive Cleaning Services',
        subtitle: 'Professional Solutions for Every Business & Home in Columbus, OH',
        background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'contact': {
        title: 'Contact Maloon Services',
        subtitle: 'Get a Free Quote for Professional Cleaning in Columbus, OH',
        background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
       'residential': {
         title: 'Residential Cleaning Services',
         subtitle: 'Routine cleaning for apartments and houses. Weekly, biweekly, or monthly.',
         background_url: 'assets/vitaly-gariev-0rhc6d7o6T8-unsplash.jpg'
       },
       'homes': {
         title: 'Residential Cleaning Services',
         subtitle: 'Routine cleaning for apartments and houses. Weekly, biweekly, or monthly.',
         background_url: 'assets/vitaly-gariev-0rhc6d7o6T8-unsplash.jpg'
       },
      'locations': {
        title: 'Our Service Areas',
        subtitle: 'Serving Businesses & Homes Throughout Central Ohio',
        background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      }
    };
    return heroData[pageName];
  }

  static async inject(pageName, placeholder) {
    const data = this.getData(pageName);
    if (!data) return;

    const heroHTML = `
      <div class="hero" style="background: linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), url('${data.background_url}'); background-size: cover; background-position: center; min-height: 400px; display: flex; align-items: center; justify-content: center;">
        <div class="hero-content">
          <h1>${data.title}</h1>
          <h2>${data.subtitle}</h2>
        </div>
      </div>
    `;
    
    placeholder.innerHTML = heroHTML;
  }
}

class CTAComponent {
  static getData(pageName) {
    const content = ContentManager.getContent();
    if (content?.pages?.[pageName]?.cta) {
      return content.pages[pageName].cta;
    }

    const ctaData = {
      'index': {
        title: 'Get a Free Quote Today',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'about': {
        title: 'Experience the Maloon Services Difference',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'business': {
        title: 'Ready for a Cleaner Workspace?',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'services': {
        title: 'Ready for a Cleaner Workspace?',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
      'contact': {
        title: 'Ready for a Cleaner, Healthier Workspace?',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      },
       'residential': {
         title: 'Ready for a Spotless Home?',
         phone: '6145551234',
         phone_formatted: '614-555-1234',
         whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
         background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
       },
       'homes': {
         title: 'Ready for a Spotless Home?',
         phone: '6145551234',
         phone_formatted: '614-555-1234',
         whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
         background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
       },
      'locations': {
        title: 'Ready for a Cleaner Space?',
        phone: '6145551234',
        phone_formatted: '614-555-1234',
        whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.',
        background_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      }
    };

    return ctaData[pageName];
  }

  static async inject(pageName, placeholder) {
    const data = this.getData(pageName);
    if (!data) return;

    await ComponentInjector.injectComponent(
      placeholder.id,
      'assets/components/cta.html',
      () => data
    );
  }
}

class WhyChooseUsComponent {
  static async inject(pageName, placeholder) {
    // Keep existing functionality for other pages
    const template = await Utils.fetchHTML('assets/components/why-choose-us.html');
    if (template) {
      placeholder.innerHTML = template;
    }
  }
}

class ServiceAreasComponent {
  static async inject(pageName, placeholder) {
    // Keep existing functionality for other pages
    const template = await Utils.fetchHTML('assets/components/service-areas.html');
    if (template) {
      placeholder.innerHTML = template;
    }
  }
}

/**
 * Navigation Components
 */
class Navbar {
  static init() {
    this.setupMobileMenu();
    this.setupNavigationLinks();
    this.setupActiveLink();
    this.setupDropdowns();
  }

  static setupMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const mobileOverlay = document.querySelector('.mobile-overlay');

    if (mobileMenuToggle && navMenu) {
      Utils.addEventListener(mobileMenuToggle, 'click', () => {
        const isActive = navMenu.classList.contains('active');
        
        if (isActive) {
          // Close menu
          navMenu.classList.remove('active');
          navMenu.classList.remove('open');
          mobileMenuToggle.classList.remove('active');
          mobileMenuToggle.setAttribute('aria-expanded', 'false');
          document.body.classList.remove('menu-open');
          
          // Hide overlay after delay
          if (mobileOverlay) {
            setTimeout(() => {
              mobileOverlay.classList.remove('active');
              mobileOverlay.setAttribute('aria-hidden', 'true');
            }, 300);
          }
        } else {
          // Open menu
          navMenu.classList.add('active');
          navMenu.classList.add('open');
          mobileMenuToggle.classList.add('active');
          mobileMenuToggle.setAttribute('aria-expanded', 'true');
          document.body.classList.add('menu-open');
          
          // Show overlay
          if (mobileOverlay) {
            mobileOverlay.classList.add('active');
            mobileOverlay.setAttribute('aria-hidden', 'false');
          }
        }
      });
    }

    // Close menu when clicking overlay
    if (mobileOverlay) {
      Utils.addEventListener(mobileOverlay, 'click', () => {
        navMenu.classList.remove('active');
        navMenu.classList.remove('open');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
        mobileOverlay.classList.remove('active');
        mobileOverlay.setAttribute('aria-hidden', 'true');
      });
    }

    // Handle mobile dropdown toggles
    this.setupMobileDropdowns();
  }

  static setupMobileDropdowns() {
    const dropdownToggles = document.querySelectorAll('.has-dropdown > a');
    
    dropdownToggles.forEach(toggle => {
      // Remove existing listeners to prevent duplicates
      Utils.addEventListener(toggle, 'click', (e) => {
        // Only handle dropdowns on mobile
        if (!Utils.isDesktop()) {
          e.preventDefault();
          const parentItem = toggle.closest('.has-dropdown');
          const dropdown = parentItem.querySelector('.dropdown-menu');
          
          if (dropdown) {
            // Toggle current dropdown
            const isOpen = parentItem.classList.contains('open');
            
            // Close all other dropdowns
            document.querySelectorAll('.has-dropdown.open').forEach(item => {
              if (item !== parentItem) {
                item.classList.remove('open');
                item.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
              }
            });
            
            // Toggle current
            if (isOpen) {
              parentItem.classList.remove('open');
              toggle.querySelector('.dropdown-arrow').style.transform = 'rotate(0deg)';
            } else {
              parentItem.classList.add('open');
              toggle.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
            }
          }
        }
      });
    });
  }

  static setupNavigationLinks() {
    document.querySelectorAll('.nav-menu a').forEach(link => {
      Utils.addEventListener(link, 'click', () => {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
          navMenu.classList.remove('active');
          navMenu.classList.remove('open');
        }
      });
    });
  }

  static setupActiveLink() {
    const currentPage = Utils.getCurrentPage();
    document.querySelectorAll('.nav-menu a').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      }
    });
  }

  static setupDropdowns() {
    if (!Utils.isDesktop()) return;

    document.querySelectorAll('.menu-item.has-dropdown').forEach(item => {
      const dropdown = item.querySelector('.dropdown-menu');

      if (dropdown) {
        Utils.addEventListener(item, 'mouseenter', () => {
          dropdown.style.opacity = '1';
          dropdown.style.visibility = 'visible';
        });

        Utils.addEventListener(item, 'mouseleave', () => {
          dropdown.style.opacity = '0';
          dropdown.style.visibility = 'hidden';
        });
      }
    });
  }
}

class Sidebar {
  static init() {
    this.populateLinks();
    this.setupNavigation();
    this.setupScrollSpy();
  }

    static populateLinks() {
        const currentPage = Utils.getCurrentPage();
        const sidebarContainer = document.getElementById('page-sidebar-menu');

        if (!sidebarContainer) return;

        sidebarContainer.innerHTML = '';

        let sidebarItems = this.getSidebarItemsForPage(currentPage);

        if (sidebarItems.length === 0) {
            const sidebarEl = document.querySelector('.sidebar');
            if (sidebarEl) sidebarEl.style.display = 'none';
            return;
        }

        sidebarItems.forEach((item, index) => {
            const sidebarItem = document.createElement('div');
            sidebarItem.className = 'sidebar-item';
            sidebarItem.dataset.sectionId = item.id;

            const sidebarDot = document.createElement('div');
            sidebarDot.className = 'sidebar-dot';

            const sidebarText = document.createElement('div');
            sidebarText.className = 'sidebar-text';
            sidebarText.textContent = item.text;

            const link = document.createElement('a');
            link.href = `#${item.id}`;
            link.appendChild(sidebarDot);
            link.appendChild(sidebarText);

            sidebarItem.appendChild(link);
            sidebarContainer.appendChild(sidebarItem);
        });
    }

  static getSidebarItemsForPage(pageName) {
    const content = ContentManager.getContent();
    if (content?.navigation?.sidebar) {
      const pageKey = pageName.replace('.html', '');
      const items = content.navigation.sidebar[pageKey] || [];
      if (items.length > 0) return items;
    }

    // Fallback to hardcoded items
    switch(pageName) {
      case 'index.html':
        return [
          { id: 'home-hero-placeholder', text: 'Overview' },
          { id: 'services-overview', text: 'Services' },
          { id: 'services-overview', text: 'How it works' },
          { id: 'services-overview', text: 'Service areas' },
          { id: 'services-overview', text: 'Sustainability' },
          { id: 'services-overview', text: 'Why choose us' },
          { id: 'final-cta', text: 'Get a quote' }
        ];
      // Additional cases would follow...
      default:
        return [];
    }
  }

  static setupNavigation() {
    document.querySelectorAll('#page-sidebar-menu a').forEach(link => {
      Utils.addEventListener(link, 'click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - CONFIG.SCROLL_OFFSET,
            behavior: 'smooth'
          });
          this.updateActiveLink(targetId);
        }
      });
    });
  }

  static setupScrollSpy() {
    const debouncedUpdate = Utils.debounce(this.updateActiveLinkOnScroll, 50);
    Utils.addEventListener(window, 'scroll', debouncedUpdate);
    debouncedUpdate(); // Initial update
  }

  static updateActiveLinkOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        this.updateActiveLink(sectionId);
      }
    });
  }

  static updateActiveLink(activeId) {
    document.querySelectorAll('#page-sidebar-menu a').forEach(link => {
      const linkId = link.getAttribute('href').substring(1);
      if (linkId === activeId) {
        link.classList.add('active');
        link.querySelector('.sidebar-dot').classList.add('active');
        link.querySelector('.sidebar-text').classList.add('active');
      } else {
        link.classList.remove('active');
        link.querySelector('.sidebar-dot').classList.remove('active');
        link.querySelector('.sidebar-text').classList.remove('active');
      }
    });
    this.updateScrollProgress();
  }

  static updateScrollProgress() {
    const scrollPosition = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = (scrollPosition / documentHeight) * 100;

    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.height = `${scrollPercentage}%`;
    }

    // Mark completed sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionId = section.getAttribute('id');

      if (scrollPosition >= sectionTop - 100) {
        const link = document.querySelector(`#page-sidebar-menu a[href="#${sectionId}"]`);
        if (link) {
          link.querySelector('.sidebar-dot').classList.add('done');
          link.querySelector('.sidebar-text').classList.add('done');
        }
      }
    });
  }
}

/**
 * Sticky Bar Manager
 */
class StickyBarManager {
  static init() {
    const stickyBar = document.getElementById('sticky-quote-bar');
    const mainNav = document.querySelector('.main-nav');
    const hero = document.querySelector('.hero-split');

    if (!stickyBar || !mainNav || !hero) return;

    const handleScroll = () => {
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      
      if (window.scrollY > heroBottom - 100) {
        stickyBar.classList.add('visible');
        mainNav.style.transform = 'translateY(-100%)';
        mainNav.style.opacity = '0';
      } else {
        stickyBar.classList.remove('visible');
        mainNav.style.transform = 'translateY(0)';
        mainNav.style.opacity = '1';
      }
    };

    const debouncedScroll = Utils.debounce(handleScroll, 10);
    Utils.addEventListener(window, 'scroll', debouncedScroll);
    
    // Initial check
    handleScroll();
  }
}

/**
 * UI Components
 */
class FAQManager {
  static init() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (question && answer) {
        Utils.addEventListener(question, 'click', () => {
          const isActive = item.classList.contains('active');
          // Close all other FAQ items
          document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
          // Toggle current item
          if (!isActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }
}

class SustainabilityManager {
  static init() {
    document.querySelectorAll('.sustainability-item').forEach(item => {
      const header = item.querySelector('.toggle-header');
      const content = item.querySelector('.toggle-content');

      if (header && content) {
        Utils.addEventListener(header, 'click', () => {
          const isActive = item.classList.contains('active');
          // Close all other items
          document.querySelectorAll('.sustainability-item').forEach(i => i.classList.remove('active'));
          // Toggle current item
          if (!isActive) {
            item.classList.add('active');
          }
        });
      }
    });
  }
}

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

class ScrollManager {
  static init() {
    this.setupSmoothScrolling();
    this.setupScrollAnimations();
    this.setupResizeHandler();
  }

  static setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      Utils.addEventListener(anchor, 'click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          window.scrollTo({
            top: target.offsetTop - CONFIG.SCROLL_OFFSET,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  static setupScrollAnimations() {
    const observerOptions = {
      threshold: CONFIG.ANIMATION_THRESHOLD
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    state.observers.intersection = observer;

    // Observe existing reveal elements
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Observe dynamically added elements
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList.contains('reveal')) {
              observer.observe(node);
            }
            // Check children
            node.querySelectorAll('.reveal').forEach(child => observer.observe(child));
          }
        });
      });
    });

    state.observers.mutation = mutationObserver;
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  static setupResizeHandler() {
    const debouncedResize = Utils.debounce(() => {
      if (document.querySelector('.nav-menu')) {
        Navbar.setupDropdowns();
      }
    }, 100);

    Utils.addEventListener(window, 'resize', debouncedResize);
  }
}

/**
 * Main Application
 */
class MaloonApp {
  static async initialize() {
    try {
      // Load content first
      await ContentManager.loadContent();

      // Initialize components
      await ComponentInjector.injectAllComponents();

      // Initialize UI functionality
      Navbar.init();
      Sidebar.init();
      FAQManager.init();
      SustainabilityManager.init();
      FormManager.init();
      ScrollManager.init();

      console.log('Maloon Services application initialized successfully');
    } catch (error) {
      console.error('Application initialization failed:', error);
    }
  }

  static cleanup() {
    Utils.cleanupEventListeners();
    Utils.cleanupObservers();
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  MaloonApp.initialize();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    MaloonApp.cleanup();
  });
});