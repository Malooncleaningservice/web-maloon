// Main JavaScript file for Maloon Services

// Function to inject navbar
function injectNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('assets/components/navbar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text();
            })
            .then(data => {
                navbarPlaceholder.innerHTML = data;
                
                // Initialize nav bar functionality after injection
                setTimeout(() => {
                    initNavBarFunctionality();
                }, 100);
            })
            .catch(error => {
                console.error('Error injecting navbar:', error);
                // Fallback: create basic navbar if fetch fails
                navbarPlaceholder.innerHTML = '<nav class="main-nav"><div class="nav-container"><div class="logo"><img src="logo-maloon.png" alt="Maloon Services Logo" style="height:40px; width:auto;"><div class="logo-text"><div class="company-name">Maloon Services</div><div class="tagline">Professional Cleaning</div></div></div><ul class="nav-menu"><li class="menu-item"><a href="index.html" class="active">Home</a></li><li class="menu-item"><a href="about.html">About</a></li><li class="menu-item"><a href="services.html">Services</a></li><li class="menu-item"><a href="contact.html">Contact</a></li><li class="menu-item"><a href="faq.html">FAQ</a></li></ul><a href="https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote." class="cta-button desktop-cta">Instant WhatsApp Message</a></div></nav>';
                // Initialize nav bar functionality after injection
                setTimeout(() => {
                    initNavBarFunctionality();
                }, 100);
            });
    }
}

// Function to inject sidebar
function injectSidebar() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (sidebarPlaceholder) {
        fetch('assets/components/sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text();
            })
            .then(data => {
                sidebarPlaceholder.innerHTML = data;
                
                // Initialize sidebar functionality after injection
                setTimeout(() => {
                    initSidebarFunctionality();
                }, 100);
            })
            .catch(error => {
                console.error('Error injecting sidebar:', error);
                // Fallback: create basic sidebar if fetch fails
                sidebarPlaceholder.innerHTML = '<div class="sidebar"><div class="sidebar-content"><div class="sidebar-header"><h3>Quick Navigation</h3></div><nav class="sidebar-nav"><ul class="sidebar-menu"><!-- Sidebar items will be populated by JavaScript --></ul></nav></div></div>';
                // Initialize sidebar functionality after injection
                setTimeout(() => {
                    initSidebarFunctionality();
                }, 100);
            });
    }
}

// Function to inject footer
function injectFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        fetch('assets/components/footer.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.text();
            })
            .then(data => {
                footerPlaceholder.innerHTML = data;
                
                // Update copyright year
                const currentYear = new Date().getFullYear();
                const yearElement = document.getElementById('year');
                if (yearElement) {
                    yearElement.textContent = currentYear;
                }
            })
            .catch(error => {
                console.error('Error injecting footer:', error);
                // Fallback: create basic footer if fetch fails
                footerPlaceholder.innerHTML = '<footer class="main-footer"><div class="container"><div class="footer-grid"><div class="footer-column"><img src="logo-maloon.png" alt="Maloon Services Logo" style="height:60px; width:auto; margin-bottom: 15px;"><p class="tagline">save money. go green. make a difference.</p></div><div class="footer-column"><h3>Address</h3><div class="footer-divider"></div><div class="address-info"><i class="fas fa-map-marker-alt"></i><p>123 Cleaning Way<br>Columbus, OH 43215</p></div></div><div class="footer-column"><h3>Contact us</h3><div class="footer-divider"></div><div class="contact-info"><div class="contact-item"><i class="fas fa-phone"></i><p>614-555-1234</p></div><div class="contact-item"><i class="fas fa-envelope"></i><p>info@maloonservices.com</p></div></div></div><div class="footer-column"><h3>Follow Us</h3><div class="footer-divider"></div><div class="social-media"><a href="#" class="social-icon"><i class="fab fa-facebook-f"></i></a><a href="#" class="social-icon"><i class="fab fa-twitter"></i></a><a href="#" class="social-icon"><i class="fab fa-instagram"></i></a><a href="#" class="social-icon"><i class="fab fa-linkedin-in"></i></a></div></div></div><div class="footer-bottom"><div class="footer-links"><a href="privacy.html">Privacy Policy</a></div><div class="copyright"><p>© <span id="year"></span> Maloon Services. All rights reserved.</p></div></div></div></footer>';
                // Update copyright year
                const currentYear = new Date().getFullYear();
                const yearElement = document.getElementById('year');
                if (yearElement) {
                    yearElement.textContent = currentYear;
                }
            });
    }
}

// Initialize navigation bar functionality
function initNavBarFunctionality() {
    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', function () {
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    });

    // Set active link based on current page
    setActiveLink();
    
    // Handle dropdown menus for desktop
    handleDesktopDropdowns();
}

// Handle desktop dropdown menus for sidebar navigation
function handleSidebarDropdowns() {
    const dropdownToggles = document.querySelectorAll('.sidebar .has-dropdown > .dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const parentItem = this.parentElement;
            parentItem.classList.toggle('active');
        });
    });
}

// Set the active link based on the current page
function setActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    // Debug logging
    console.log('Current page:', currentPage);
    console.log('Number of nav links found:', navLinks.length);
    
    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Check if the link's href matches the current page
        console.log('Checking link href:', link.getAttribute('href'));
        if (link.getAttribute('href') === currentPage) {
            console.log('Setting active class on:', link.getAttribute('href'));
            link.classList.add('active');
        }
    });
}

// Handle desktop dropdown menus
function handleDesktopDropdowns() {
    const dropdownItems = document.querySelectorAll('.menu-item.has-dropdown');
    
    dropdownItems.forEach(item => {
        const dropdown = item.querySelector('.dropdown-menu');
        
        // Only apply hover effect for desktop (min-width 921px)
        if (window.matchMedia('(min-width: 921px)').matches) {
            item.addEventListener('mouseenter', function() {
                if (dropdown) {
                    dropdown.style.opacity = '1';
                    dropdown.style.visibility = 'visible';
                }
            });
            
            item.addEventListener('mouseleave', function() {
                if (dropdown) {
                    dropdown.style.opacity = '0';
                    dropdown.style.visibility = 'hidden';
                }
            });
        }
    });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    // Inject navbar and footer
    injectNavbar();
    injectFooter();
    injectSidebar(); // Add sidebar injection
    
    // Initialize sidebar dropdowns
    handleSidebarDropdowns();
    
    // Toggle FAQ Items
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (question && answer) {
            question.addEventListener('click', function () {
                const isActive = item.classList.contains('active');
                // Close all other FAQ items
                faqItems.forEach(i => i.classList.remove('active'));
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });

    // Toggle Sustainability Items
    const sustainabilityItems = document.querySelectorAll('.sustainability-item');
    sustainabilityItems.forEach(item => {
        const header = item.querySelector('.toggle-header');
        const content = item.querySelector('.toggle-content');

        if (header && content) {
            header.addEventListener('click', function () {
                const isActive = item.classList.contains('active');
                // Close all other items
                sustainabilityItems.forEach(i => i.classList.remove('active'));
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });

    // Form Submission Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(contactForm);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // In a real implementation, you would send this data to a server
            console.log('Form submitted:', data);

            // Show success message (in a real implementation, you'd hide the form and show a thank you message)
            alert('Thank you for your request! We will contact you shortly.');
            contactForm.reset();
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Inject components (hero, cta, etc.) if placeholders exist
    injectComponents();
});

// Handle window resize for dropdowns
window.addEventListener('resize', function() {
    // Reinitialize dropdowns on resize to ensure proper behavior
    if (document.querySelector('.nav-menu')) {
        handleDesktopDropdowns();
    }
});

// Inject reusable components
function injectComponents() {
    // Inject hero components if placeholders exist
    const heroPlaceholders = document.querySelectorAll('[id$="-hero-placeholder"]');
    heroPlaceholders.forEach(placeholder => {
        const pageName = placeholder.id.replace('-hero-placeholder', '');
        injectHero(pageName, placeholder);
    });
    
    // Inject CTA components if placeholders exist
    const ctaPlaceholders = document.querySelectorAll('[id$="-cta-placeholder"]');
    ctaPlaceholders.forEach(placeholder => {
        const pageName = placeholder.id.replace('-cta-placeholder', '');
        injectCTA(pageName, placeholder);
    });
    
    // Inject Why Choose Us components if placeholders exist
    const whyChoosePlaceholders = document.querySelectorAll('[id$="-why-choose-placeholder"]');
    whyChoosePlaceholders.forEach(placeholder => {
        const pageName = placeholder.id.replace('-why-choose-placeholder', '');
        injectWhyChooseUs(pageName, placeholder);
    });
    
    // Inject Service Areas components if placeholders exist
    const serviceAreasPlaceholders = document.querySelectorAll('[id$="-service-areas-placeholder"]');
    serviceAreasPlaceholders.forEach(placeholder => {
        const pageName = placeholder.id.replace('-service-areas-placeholder', '');
        injectServiceAreas(pageName, placeholder);
    });
}

// Initialize sidebar functionality
function initSidebarFunctionality() {
    // Populate sidebar with appropriate links based on page
    populateSidebarLinks();
    
    // Handle sidebar link clicks for smooth scrolling
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Scroll to the element with offset for fixed header
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Update active class
                updateActiveSidebarLink(targetId);
            }
        });
    });
    
    // Update active link based on scroll position
    window.addEventListener('scroll', updateActiveSidebarLinkOnScroll);
    
    // Initial update
    updateActiveSidebarLinkOnScroll();
}

// Populate sidebar links based on current page
function populateSidebarLinks() {
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarMenu = document.querySelector('.sidebar-menu');
    
    if (!sidebarMenu) return;
    
    // Clear existing items
    sidebarMenu.innerHTML = '';
    
    // Define sidebar content based on page
    let sidebarItems = [];
    
    switch(currentPage) {
        case 'index.html':
            sidebarItems = [
                { id: 'services-overview', text: 'Services Overview' },
                { id: 'sustainability', text: 'Sustainability' },
                { id: 'why-choose-us', text: 'Why Choose Us' },
                { id: 'cta-section', text: 'Get a Quote' }
            ];
            break;
        case 'about.html':
            sidebarItems = [
                { id: 'company-overview', text: 'Company Overview' },
                { id: 'mission-section', text: 'Our Mission' },
                { id: 'why-choose-section', text: 'Why Choose Us' },
                { id: 'service-areas-section', text: 'Service Areas' },
                { id: 'testimonials-section', text: 'Testimonials' },
                { id: 'cta-section', text: 'Get a Quote' }
            ];
            break;
        case 'services.html':
            sidebarItems = [
                { id: 'services-overview', text: 'Services Overview' },
                { id: 'commercial', text: 'Commercial Services' },
                { id: 'residential', text: 'Residential Services' },
                { id: 'disinfection', text: 'Disinfection Services' },
                { id: 'corporate', text: 'Corporate Industry' },
                { id: 'healthcare', text: 'Healthcare Industry' },
                { id: 'retail', text: 'Retail Industry' },
                { id: 'hospitality', text: 'Hospitality Industry' },
                { id: 'ongoing-maintenance', text: 'Maintenance' },
                { id: 'services-why-choose-placeholder', text: 'Why Choose Us' },
                { id: 'services-service-areas-placeholder', text: 'Service Areas' },
                { id: 'cta-section', text: 'Get a Quote' }
            ];
            break;
        default:
            // For pages without specific sidebar, hide it or show a default message
            return;
    }
    
    // Add items to sidebar
    sidebarItems.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${item.id}`;
        a.textContent = item.text;
        li.appendChild(a);
        sidebarMenu.appendChild(li);
    });
}

// Update active sidebar link based on scroll position
function updateActiveSidebarLinkOnScroll() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100; // Offset for better detection
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            updateActiveSidebarLink(sectionId);
        }
    });
}

// Update active sidebar link
function updateActiveSidebarLink(activeId) {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    
    sidebarLinks.forEach(link => {
        const linkId = link.getAttribute('href').substring(1);
        
        if (linkId === activeId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Helper functions to inject specific components
function injectHero(pageName, placeholder) {
    // This would typically fetch data from content.json or use predefined data
    // For now, we'll just create a basic hero component with defaults
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
            background_url: 'https://images.unsplash.com/photo-1513694203270-74c605394108?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        },
        'locations': {
            title: 'Our Service Areas',
            subtitle: 'Serving Businesses & Homes Throughout Central Ohio',
            background_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
        }
    };
    
    const data = heroData[pageName];
    if (data) {
        fetch('assets/components/hero.html')
            .then(response => response.text())
            .then(template => {
                let html = template
                    .replace('{title}', data.title)
                    .replace('{subtitle}', data.subtitle)
                    .replace('{background_url}', data.background_url);
                placeholder.innerHTML = html;
            })
            .catch(error => {
                console.error('Error injecting hero:', error);
            });
    }
}

function injectCTA(pageName, placeholder) {
    // Data for CTAs
    const ctaData = {
        'index': {
            title: 'Get a Free Quote Today',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        },
        'about': {
            title: 'Experience the Maloon Services Difference',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        },
        'services': {
            title: 'Ready for a Cleaner Workspace?',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        },
        'contact': {
            title: 'Ready for a Cleaner, Healthier Workspace?',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        },
        'residential': {
            title: 'Ready for a Spotless Home?',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        },
        'locations': {
            title: 'Ready for a Cleaner Space?',
            phone: '6145551234',
            phone_formatted: '614-555-1234',
            whatsapp_url: 'https://wa.me/16144830226?text=Hello%20Maloon%20Services!%20I%27d%20like%20a%20cleaning%20quote.'
        }
    };
    
    const data = ctaData[pageName];
    if (data) {
        fetch('assets/components/cta.html')
            .then(response => response.text())
            .then(template => {
                let html = template
                    .replace('{title}', data.title)
                    .replace('{phone}', data.phone)
                    .replace('{phone_formatted}', data.phone_formatted)
                    .replace('{whatsapp_url}', data.whatsapp_url)
                    .replace('{background_url}', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
                placeholder.innerHTML = html;
            })
            .catch(error => {
                console.error('Error injecting CTA:', error);
            });
    }
}

function injectWhyChooseUs(pageName, placeholder) {
    // Data for Why Choose Us sections
    const whyChooseData = {
        'index': {
            title: 'Why Choose Maloon Services in Columbus, OH?',
            features: `
                <div class="feature-item">
                    <div class="feature-icon green-accent">🌿</div>
                    <h3>Sustainable Cleaning Solutions</h3>
                    <p>Looking for an effective way to keep your business clean without harming the environment? We offer high-quality, eco-conscious cleaning services tailored to your needs.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">💰</div>
                    <h3>Cost-Effective Green Cleaning</h3>
                    <p>Our recycling and waste management solutions help businesses save money while reducing their environmental impact.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">✅</div>
                    <h3>Dependable and Professional Service</h3>
                    <p>With years of experience, our team delivers reliable, high-quality cleaning that businesses across Columbus can count on.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">🧴</div>
                    <h3>Powerful Cleaning Without Harsh Chemicals</h3>
                    <p>Our natural cleaning products remove dirt and grime without harmful chemicals, keeping employees and customers safe.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">🏢</div>
                    <h3>Tailored Cleaning for Any Industry</h3>
                    <p>From small offices to large corporate spaces, Maloon Services offers customized cleaning solutions for all types of businesses in Columbus, OH.</p>
                </div>
            `
        },
        'about': {
            title: 'Why Columbus Businesses & Homes Choose Maloon Services',
            features: `
                <div class="choose-item">
                    <div class="choose-icon green-accent">🏆</div>
                    <h3>Trusted by Leading Companies</h3>
                    <p>We proudly serve Fortune 500 companies, healthcare facilities, retail chains, and hospitality businesses throughout Central Ohio.</p>
                </div>

                <div class="choose-item">
                    <div class="choose-icon green-accent">🌱</div>
                    <h3>Leaders in Green Cleaning</h3>
                    <p>Our expertise in sustainable cleaning solutions helps businesses reduce their environmental footprint while maintaining high cleanliness standards.</p>
                </div>

                <div class="choose-item">
                    <div class="choose-icon green-accent">👥</div>
                    <h3>Dedicated Customer Support</h3>
                    <p>Each client works directly with a dedicated account manager and on-site supervisors to ensure consistent quality and responsive service.</p>
                </div>

                <div class="choose-item">
                    <div class="choose-icon green-accent">📊</div>
                    <h3>Proven Client Retention</h3>
                    <p>We maintain a client satisfaction rate of over 95%, with many clients trusting us with their cleaning needs for years.</p>
                </div>

                <div class="choose-item">
                    <div class="choose-icon green-accent">👷</div>
                    <h3>Trained and Skilled Workforce</h3>
                    <p>Our cleaning professionals undergo ongoing training to stay current with the latest cleaning techniques, safety protocols, and industry best practices.</p>
                </div>

                <div class="choose-item">
                    <div class="choose-icon green-accent">🏙️</div>
                    <h3>Local Columbus Experts</h3>
                    <p>As a Columbus-based company, we understand the unique needs of Central Ohio businesses and homes and provide personalized service to our community.</p>
                </div>
            `
        },
        'services': {
            title: 'Why Choose Maloon Services for Your Business or Home?',
            features: `
                <div class="feature-item">
                    <div class="feature-icon green-accent">🌿</div>
                    <h3>Eco-Friendly Cleaning Solutions</h3>
                    <p>We use environmentally responsible cleaning products that improve air quality while creating a safer space for employees and customers.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">💰</div>
                    <h3>Cost-Effective Green Cleaning</h3>
                    <p>Our recycling and waste management solutions help businesses save money while reducing their environmental impact.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">✅</div>
                    <h3>Dependable and Professional Service</h3>
                    <p>With years of experience, our team delivers reliable, high-quality cleaning that businesses and homeowners across Columbus can count on.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">🧴</div>
                    <h3>Powerful Cleaning Without Harsh Chemicals</h3>
                    <p>Our natural cleaning products remove dirt and grime without harmful chemicals, keeping employees and customers safe.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">🏢</div>
                    <h3>Tailored Cleaning for Any Industry</h3>
                    <p>From small offices to large corporate spaces, Maloon Services offers customized cleaning solutions for all types of businesses in Columbus, OH.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">🏘️</div>
                    <h3>Residential & Commercial Expertise</h3>
                    <p>Whether you need regular office cleaning or deep home cleaning, we provide comprehensive services for both business and residential clients.</p>
                </div>
            `
        },
        'residential': {
            title: 'Why Choose Maloon Services for Your Home?',
            features: `
                <div class="feature-item">
                    <div class="feature-icon green-accent">🌿</div>
                    <h3>Eco-Friendly Cleaning</h3>
                    <p>We use safe, environmentally responsible products that are gentle on your family and pets while being tough on dirt.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">✅</div>
                    <h3>Reliable & Professional</h3>
                    <p>Our trained team arrives on time and leaves your home spotless every time.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">💰</div>
                    <h3>Competitive Pricing</h3>
                    <p>Transparent pricing with no hidden fees. Get the best value for your investment in a clean home.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">⏱️</div>
                    <h3>Flexible Scheduling</h3>
                    <p>Book regular cleanings or one-time deep cleans that work around your busy schedule.</p>
                </div>
            `
        },
        'locations': {
            title: 'Why Choose Maloon Services for Your Local Area?',
            features: `
                <div class="feature-item">
                    <div class="feature-icon green-accent">🌿</div>
                    <h3>Eco-Friendly Solutions</h3>
                    <p>We use environmentally responsible products that are safe for your family and the planet.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">✅</div>
                    <h3>Local Expertise</h3>
                    <p>As a Columbus-based company, we understand the unique needs of Central Ohio businesses and homes.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">💰</div>
                    <h3>Competitive Pricing</h3>
                    <p>Transparent, fair pricing for all our services, with no hidden fees.</p>
                </div>

                <div class="feature-item">
                    <div class="feature-icon green-accent">⏱️</div>
                    <h3>Flexible Scheduling</h3>
                    <p>Book regular cleanings or one-time deep cleans that work around your busy schedule.</p>
                </div>
            `
        }
    };
    
    const data = whyChooseData[pageName];
    if (data) {
        fetch('assets/components/why-choose-us.html')
            .then(response => response.text())
            .then(template => {
                let html = template
                    .replace('{title}', data.title)
                    .replace('{features}', data.features);
                placeholder.innerHTML = html;
            })
            .catch(error => {
                console.error('Error injecting Why Choose Us:', error);
            });
    }
}

function injectServiceAreas(pageName, placeholder) {
    // Data for Service Areas sections
    const serviceAreasData = {
        'about': {
            title: 'Proudly Serving Columbus, OH and Central Ohio',
            subtitle: 'Our comprehensive cleaning services are available throughout the Columbus metropolitan area',
            map_image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            map_alt: 'Columbus Ohio Map',
            area_list_1: `
                <li>Columbus Downtown</li>
                <li>Short North</li>
                <li>Dublin</li>
                <li>Worthington</li>
                <li>Hilliard</li>
                <li>Westerville</li>
            `,
            area_list_2: `
                <li>Gahanna</li>
                <li>Reynoldsburg</li>
                <li>New Albany</li>
                <li>Upper Arlington</li>
                <li>Bexley</li>
                <li>Grandview Heights</li>
            `,
            area_list_3: `
                <li>Powell</li>
                <li>Lewis Center</li>
                <li>Pickerington</li>
                <li>Canal Winchester</li>
                <li>Grove City</li>
                <li>And surrounding areas</li>
            `
        },
        'locations': {
            title: 'Our Columbus Service Areas',
            subtitle: 'Proudly serving businesses throughout Central Ohio',
            map_image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            map_alt: 'Columbus Ohio Map',
            area_list_1: `
                <li>Columbus Downtown</li>
                <li>Short North</li>
                <li>Dublin</li>
                <li>Worthington</li>
                <li>Hilliard</li>
                <li>Westerville</li>
            `,
            area_list_2: `
                <li>Gahanna</li>
                <li>Reynoldsburg</li>
                <li>New Albany</li>
                <li>Upper Arlington</li>
                <li>Bexley</li>
                <li>Grandview Heights</li>
            `,
            area_list_3: `
                <li>Powell</li>
                <li>Lewis Center</li>
                <li>Pickerington</li>
                <li>Canal Winchester</li>
                <li>Grove City</li>
                <li>And surrounding areas</li>
            `
        },
        'services': {
            title: 'Serving Businesses & Homes Across Columbus, OH',
            subtitle: 'We provide comprehensive cleaning services throughout the Central Ohio region',
            map_image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            map_alt: 'Columbus Ohio Map',
            area_list_1: `
                <li>Columbus Downtown</li>
                <li>Short North</li>
                <li>Dublin</li>
                <li>Worthington</li>
                <li>Hilliard</li>
                <li>Westerville</li>
            `,
            area_list_2: `
                <li>Gahanna</li>
                <li>Reynoldsburg</li>
                <li>New Albany</li>
                <li>Upper Arlington</li>
                <li>Bexley</li>
                <li>Grandview Heights</li>
            `,
            area_list_3: `
                <li>Powell</li>
                <li>Lewis Center</li>
                <li>Pickerington</li>
                <li>Canal Winchester</li>
                <li>Grove City</li>
                <li>And surrounding areas</li>
            `
        }
    };
    
    const data = serviceAreasData[pageName];
    if (data) {
        fetch('assets/components/service-areas.html')
            .then(response => response.text())
            .then(template => {
                let html = template
                    .replace('{title}', data.title)
                    .replace('{subtitle}', data.subtitle)
                    .replace('{map_image}', data.map_image)
                    .replace('{map_alt}', data.map_alt)
                    .replace('{area_list_1}', data.area_list_1)
                    .replace('{area_list_2}', data.area_list_2)
                    .replace('{area_list_3}', data.area_list_3);
                placeholder.innerHTML = html;
            })
            .catch(error => {
                console.error('Error injecting Service Areas:', error);
            });
    }
}
