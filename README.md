# Maloon Cleaning Service Website

Bilingual static website for Maloon Cleaning Service built with Eleventy (11ty).

## Overview

This site uses Eleventy to generate static HTML from templates and JSON data files, making it easy to maintain both English and Spanish versions from a single codebase.

## Project Structure

```
web-maloon/
├── src/                      # Source files
│   ├── _data/               # Data files
│   │   ├── en.json          # English content
│   │   └── es.json          # Spanish content
│   ├── _includes/           # Reusable templates
│   │   ├── base.njk         # Base layout (shared HTML structure)
│   │   ├── navbar.njk       # Navigation component
│   │   ├── footer.njk       # Footer component
│   │   └── sticky-quote-bar.njk  # Sticky CTA bar
│   ├── assets/              # CSS, JS, images
│   ├── css/                 # Additional stylesheets
│   ├── index.njk            # English homepage
│   └── es/                  # Spanish pages
│       └── index.njk        # Spanish homepage
├── _site/                   # Built output (gitignored)
├── .eleventy.js             # Eleventy configuration
└── package.json             # Dependencies and scripts
```

## Key Features

- **Bilingual Support**: English (`/`) and Spanish (`/es/`) versions
- **Single Source of Truth**: All content in `en.json` and `es.json`
- **Shared Components**: Navbar, footer, and other components automatically use the correct language
- **SEO Optimized**: Proper `hreflang` tags, meta descriptions, OpenGraph tags
- **Auto-Deploy**: GitHub Actions builds and deploys on every push to `main`

## Development

### Install Dependencies

```bash
npm install
```

### Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8080` with live reload.

### Build for Production

```bash
npm run build
```

Outputs to `_site/` directory.

### Clean Build Directory

```bash
npm run clean
```

## How It Works

### 1. Data Files

All content lives in `src/_data/en.json` and `src/_data/es.json`. These files contain:
- Brand information
- Contact details
- Services, testimonials, FAQ
- Navigation structure
- Page-specific content (titles, meta tags, hero text, CTA copy)

### 2. Templates

Templates use Nunjucks syntax and pull data from the JSON files:

**Example: Page Template**
```njk
---
layout: base.njk
pageKey: index
locale: en
permalink: /index.html
---

{% set localeData = en %}
<h2>{{ localeData.pages.index.hero.title }}</h2>
```

**Example: Component Template**
```njk
{% set localeData = en if locale == 'en' else es %}
<nav>
  {% for item in localeData.navigation.main %}
    <a href="{{ item.url }}">{{ item.title }}</a>
  {% endfor %}
</nav>
```

### 3. Language Switching

- English pages set `locale: en` in frontmatter
- Spanish pages set `locale: es` in frontmatter
- Templates use `{% set localeData = en if locale == 'en' else es %}` to load the correct data
- Navbar automatically shows "Español" on English pages and "English" on Spanish pages

## Adding a New Page

### Step 1: Add content to data files

In `src/_data/en.json` and `src/_data/es.json`, add page metadata:

```json
{
  "pages": {
    "about": {
      "title": "About Us | Maloon Service",
      "description": "Learn about Maloon Service...",
      "ogTitle": "About Us | Maloon Service",
      "ogDescription": "...",
      "hero": {
        "title": "About Maloon Service",
        "subtitle": "...",
        "background": "https://..."
      }
    }
  }
}
```

### Step 2: Create the template

**English version** - `src/about.njk`:
```njk
---
layout: base.njk
pageKey: about
locale: en
permalink: /about.html
---

{% set localeData = en %}
{% set pageData = localeData.pages.about %}

<section class="hero">
  <h1>{{ pageData.hero.title }}</h1>
  <p>{{ pageData.hero.subtitle }}</p>
</section>

<!-- Your page content here -->
```

**Spanish version** - `src/es/about.njk`:
```njk
---
layout: base.njk
pageKey: about
locale: es
permalink: /es/about.html
---

{% set localeData = es %}
{% set pageData = localeData.pages.about %}

<section class="hero">
  <h1>{{ pageData.hero.title }}</h1>
  <p>{{ pageData.hero.subtitle }}</p>
</section>

<!-- Same structure, Spanish data -->
```

### Step 3: Build and test

```bash
npm run build
npm run dev
```

Navigate to `/about.html` and `/es/about.html` to verify.

## Deployment

The site automatically deploys to GitHub Pages when you push to the `main` branch.

### First-Time Setup (GitHub Pages)

1. Go to your repo Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to `main` branch
4. The workflow will build and deploy automatically

### Manual Deploy

```bash
npm run build
# Upload the _site/ directory to your hosting provider
```

## Migration Status

### Completed
- ✅ Eleventy setup and configuration
- ✅ Data files (`en.json`, `es.json`) with all content
- ✅ Base layout template with SEO, hreflang, meta tags
- ✅ Shared components (navbar, footer, sticky-bar)
- ✅ Homepage (English + Spanish)
- ✅ GitHub Actions deployment workflow

### To-Do
- ⏳ Migrate remaining pages:
  - `about.html`
  - `business.html`
  - `services.html`
  - `residential.html`
  - `contact.html`
  - `locations.html`
  - `faq.html`
  - `articles.html`
  - `privacy.html`
  - `mobile-cta.html`
- ⏳ Update `main.js` to remove unnecessary component injection code

## Notes

- The old HTML files are still in the root directory as reference
- Components in `src/assets/components/` are from the old system; new templates use `src/_includes/`
- `hero-new.js` and other JS files still inject some dynamic content (hero images, transform strip)

## Support

For questions or issues, contact the development team.
