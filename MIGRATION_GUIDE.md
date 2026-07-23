# Page Migration Guide

This guide explains how to migrate the remaining 10 pages from static HTML to Eleventy templates.

## Overview

**Completed:**
- ✅ `index.html` (English + Spanish)

**To Migrate:**
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

## Step-by-Step Process

### 1. Understand the Current Page Structure

Each existing HTML page has:
- A head section with title, meta tags, Open Graph tags
- Component placeholders that JS injects content into
- Hardcoded HTML content specific to that page

### 2. Migration Template

For each page, follow this pattern:

#### English Version (`src/pagename.njk`)

```njk
---
layout: base.njk
pageKey: pagename
locale: en
permalink: /pagename.html
---

{% set localeData = en %}
{% set pageData = localeData.pages.pagename %}

<!-- Copy the main content from the original HTML file here -->
<!-- Between the body tags, AFTER the navbar and BEFORE the footer -->

<!-- Replace hardcoded text with {{ localeData.key }} variables -->
```

#### Spanish Version (`src/es/pagename.njk`)

```njk
---
layout: base.njk
pageKey: pagename
locale: es
permalink: /es/pagename.html
---

{% set localeData = es %}
{% set pageData = localeData.pages.pagename %}

<!-- Same HTML structure as English, but pulls from es.json -->
```

### 3. Extract Content from HTML

Open the original HTML file (e.g., `about.html`) and:

1. **Copy everything INSIDE the `<main class="main-content">` tag**
2. **Paste it into your new `.njk` file**
3. **Skip the parts that are now in base.njk:**
   - `<head>` section (already in base.njk)
   - `<div id="navbar-placeholder"></div>` (already in base.njk via `{% include "navbar.njk" %}`)
   - `<div id="footer-placeholder"></div>` (already in base.njk via `{% include "footer.njk" %}`)
   - `<script>` tags at bottom (already in base.njk)

### 4. Replace Hardcoded Text with Variables

**Before (static HTML):**
```html
<h2>About Maloon Service</h2>
<p>Professional cleaning services in Columbus, OH</p>
```

**After (Nunjucks template):**
```njk
<h2>{{ pageData.hero.title }}</h2>
<p>{{ pageData.hero.subtitle }}</p>
```

### 5. Handle Lists and Loops

If the page has repeating content (like FAQ items, testimonials, service cards), use loops:

**Before:**
```html
<div class="faq-item">
  <h3>What types of businesses do you serve?</h3>
  <p>We serve a wide range of businesses...</p>
</div>
<div class="faq-item">
  <h3>Are your cleaning products eco-friendly?</h3>
  <p>Yes! We use environmentally responsible...</p>
</div>
```

**After:**
```njk
{% for item in localeData.faq %}
<div class="faq-item">
  <h3>{{ item.question }}</h3>
  <p>{{ item.answer }}</p>
</div>
{% endfor %}
```

### 6. Verify Data Exists in JSON

Before using a variable like `{{ localeData.faq }}`, make sure it exists in both `src/_data/en.json` and `src/_data/es.json`.

All the data is already there! Just reference the correct keys.

## Example: Migrating `about.html`

### Step 1: Read the original file

Look at `/about.html` lines 62-239 (the body content between navbar and footer)

### Step 2: Create English template

**File: `src/about.njk`**

```njk
---
layout: base.njk
pageKey: about
locale: en
permalink: /about.html
---

{% set localeData = en %}
{% set pageData = localeData.pages.about %}

<!-- Hero section -->
<section class="hero-section">
  <h1>{{ pageData.hero.title }}</h1>
  <p>{{ pageData.hero.subtitle }}</p>
</section>

<!-- Company overview -->
<section id="company-overview" class="section-white section-spacing reveal">
  <div class="container">
    <h2>Our Story</h2>
    <p>Content from the original about.html...</p>
  </div>
</section>

<!-- Mission section -->
<section id="mission-section" class="section-green section-spacing reveal">
  <div class="container">
    <h2>Our Mission</h2>
    <!-- etc -->
  </div>
</section>

<!-- Testimonials -->
<section id="testimonials-section" class="section-white section-spacing reveal">
  <div class="container">
    <h2>What Our Clients Say</h2>
    <div class="testimonials-grid">
      {% for testimonial in localeData.testimonials %}
      <div class="testimonial-card">
        <p class="stars">{{ testimonial.stars }}</p>
        <p class="quote">"{{ testimonial.quote }}"</p>
        <p class="author">— {{ testimonial.author }}</p>
        <p class="role">{{ testimonial.role }}</p>
      </div>
      {% endfor %}
    </div>
  </div>
</section>

<!-- CTA -->
<section id="about-cta-placeholder" class="final-cta reveal">
  <div class="container">
    <h2>{{ pageData.cta.title }}</h2>
    <a href="{{ pageData.cta.whatsapp_url }}" class="btn-cta">Contact Us</a>
  </div>
</section>
```

### Step 3: Create Spanish template

**File: `src/es/about.njk`**

Same structure, just change:
- `locale: es`
- `permalink: /es/about.html`
- `{% set localeData = es %}`

The text will automatically pull from `es.json`.

### Step 4: Test

```bash
npm run build
npm run dev
```

Visit:
- `http://localhost:8080/about.html` (English)
- `http://localhost:8080/es/about.html` (Spanish)

## Quick Reference: Key Nunjucks Syntax

```njk
{# This is a comment #}

{{ variable }}                   <!-- Output a variable -->
{{ localeData.brand.name }}      <!-- Dot notation for nested objects -->

{% if condition %}               <!-- Conditional -->
  ...
{% else %}
  ...
{% endif %}

{% for item in array %}          <!-- Loop through array -->
  {{ item.title }}
{% endfor %}

{% set myVar = "value" %}        <!-- Set a variable -->

{% include "component.njk" %}    <!-- Include another template -->
```

## Tips

1. **Start simple**: Migrate one page at a time, test it, then move to the next
2. **Copy-paste is OK**: The English and Spanish templates will look very similar — that's fine!
3. **Keep the IDs**: HTML IDs like `id="company-overview"` are used by your JS for scrolling and navigation — don't change them
4. **Test in browser**: After building, open the generated HTML files in a browser to verify everything looks right
5. **Check the nav**: Make sure the navbar links to the correct pages in both languages

## Troubleshooting

**Problem**: Build fails with "variable not defined"
**Solution**: Check that the variable exists in both `en.json` and `es.json`

**Problem**: Page renders but content is missing
**Solution**: Check that `locale` and `pageKey` are set correctly in the frontmatter

**Problem**: Links broken after migration
**Solution**: Make sure URLs in `es.json` navigation have `/es/` prefix

## Getting Help

If you get stuck:
1. Look at `src/index.njk` and `src/es/index.njk` as examples
2. Check `src/_data/en.json` to see what data is available
3. Run `npm run build` to see error messages
4. The README.md has more examples

Good luck with the migration!
