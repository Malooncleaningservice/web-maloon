# Maloon Services - Fresh Green Market Design Guide

## Design Philosophy
**"Like an ad you pick up at the local market"**
- Clean, informative, scannable
- Fresh yet grounded
- Professional but approachable
- Easy to understand at a glance

## Color Palette 🎨

### Primary Greens
- **Fresh Mint** `#e8f5e9` - Light, airy backgrounds for freshness
- **Sage Light** `#c8e6c9` - Soft accent areas
- **Leaf Green** `#4caf50` - Primary action color (buttons, accents)
- **Forest** `#2e7d32` - Darker green for trust/tradition
- **Deep Pine** `#1b5e20` - Main text and strong accents

### Supporting Colors
- **White** `#ffffff` - Clean backgrounds
- **Off-White** `#fafafa` - Subtle variations
- **Warm Sand** `#f5f5dc` - Warm accents
- **Accent Warm** `#ffb74d` - For special CTAs/highlights (minimal use)

### Text Colors
- **Primary Text** - Deep Pine (#1b5e20)
- **Secondary Text** - Forest (#2e7d32)
- **Muted Text** - Muted Green (#558b2f)

## Typography

### Hierarchy
- **Headings:** 700 weight, Deep Pine color
- **Subheadings:** 600 weight, Forest color
- **Body Text:** 400 weight, line-height 1.7
- **Font Stack:** system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif

### Sizes
- Main heading: clamp(36px, 5vw, 56px)
- Section headers: clamp(28px, 3.5vw, 36px)
- Subheadings: clamp(22px, 3vw, 28px)
- Body text: 16px base, 1.05-1.1rem for emphasis

## Components

### Buttons
- **Primary:** Forest green background, white text
- **Secondary:** Leaf green background, white text
- **Hover:** Transforms translateY(-2px) with deeper color
- **Border radius:** 12px
- **Padding:** 0.85rem 1.75rem

### Cards
- **Background:** White or Fresh Mint
- **Border:** 2px solid Sage Light
- **Border Radius:** 12px
- **Hover:** Border changes to Leaf Green, slight lift effect
- **Shadow:** Soft natural shadows (rgba(27,94,32,.06))

### Lists with Checkmarks
Use `.checkmark-list` class for scannable bullet points:
- Green circular checkmark icons
- Good spacing for easy scanning
- 1.7 line-height for readability

### Info Boxes
- **Background:** Gradient from Fresh Mint to Sage Light
- **Border-left:** 4px solid Leaf Green
- **Use for:** Key information highlights

### Highlight Boxes
- **Background:** White
- **Border:** 2px solid Leaf Green
- **Use for:** Important callouts, special offers

### Icon Badges
- **Size:** 60px circle
- **Background:** Gradient Leaf Green to Forest
- **Use for:** Service categories, features

## Layout Principles

### Spacing
- **Section padding:** 5rem 0
- **Content spacing:** 24px margins
- **Card gaps:** 2rem in grids

### Grids
- **Feature Grid:** repeat(auto-fit, minmax(300px, 1fr))
- **Process Steps:** repeat(auto-fit, minmax(250px, 1fr))
- **Stats Grid:** repeat(auto-fit, minmax(200px, 1fr))

### Responsive
- **Mobile first approach**
- **Breakpoint:** 768px for tablets, 920px for desktop
- **Stack grids to single column on mobile**

## Special Elements

### Process Steps
Three-step layout with:
- Numbered circles (Forest background)
- Clean cards with hover effects
- Center-aligned content

### Stats Display
- Large numbers (2.5rem, Forest color)
- Small labels below
- Fresh Mint background cards

### Testimonials
- White cards with Sage Light border
- Decorative quotation mark
- Star ratings in warm accent color
- Author info in Forest color

### Service Areas Tags
- Pills with Sage Light background
- Leaf Green border
- Hover: Background changes to Leaf Green with white text

## Shadows

- **Soft:** `0 4px 12px rgba(27,94,32,.06)`
- **Normal:** `0 8px 24px rgba(27,94,32,.08)`
- **Hover:** `0 12px 32px rgba(27,94,32,.12)`

## Transitions

- **Standard:** `all 0.3s ease`
- **Fast:** `all 0.15s ease`

## Usage Tips

### For Scannable Content
1. Use checkmark lists instead of regular bullets
2. Break content into cards with clear headings
3. Use info boxes for important details
4. Keep paragraphs short (2-3 sentences max)

### For Trust Building
1. Use Forest/Deep Pine for professional elements
2. Add subtle shadows to cards
3. Use the gradient backgrounds sparingly
4. Include testimonials with the special styling

### For Call-to-Actions
1. Use Leaf Green or Forest for buttons
2. Ensure good contrast with white text
3. Add hover effects for interactivity
4. Make phone numbers large and clickable

## Accessibility

- **Focus states:** 3px solid Leaf Green outline with offset
- **Color contrast:** All text meets WCAG AA standards
- **Line height:** 1.7 for body text (excellent readability)
- **Font size:** Minimum 16px base, scalable with clamp()

## Do's and Don'ts

### ✅ Do:
- Use generous white space
- Keep text concise and scannable
- Use checkmarks for lists
- Maintain the green color palette
- Use hover effects subtly
- Keep cards clean and simple

### ❌ Don't:
- Overcrowd sections with too much text
- Use more than 2-3 colors per section
- Make buttons too flashy
- Use complex gradients everywhere
- Ignore mobile optimization
- Make clickable areas too small

## File Structure

- **Main CSS:** `assets/css/main.css` - All styles including the fresh green theme
- **Components:** `assets/components/` - Reusable HTML components
- **JavaScript:** `assets/js/main.js` - Dynamic component injection
- **Content:** `data/content.json` - Content management

## Quick Reference Classes

```html
<!-- Scannable List -->
<ul class="checkmark-list">
  <li>Item with green checkmark</li>
</ul>

<!-- Info Box -->
<div class="info-box">
  <h3>Title</h3>
  <p>Important information</p>
</div>

<!-- Highlight Box -->
<div class="highlight-box">
  <h3>Special Callout</h3>
  <p>Key message</p>
</div>

<!-- Service Card -->
<div class="service-card">
  <h3>Service Name</h3>
  <p>Description</p>
</div>

<!-- Process Steps -->
<div class="process-steps">
  <div class="process-step">
    <div class="step-number">1</div>
    <h3>Step Title</h3>
    <p>Description</p>
  </div>
</div>

<!-- Icon Badge -->
<div class="icon-badge">🌿</div>

<!-- Badge Tag -->
<span class="badge">Certified</span>
```

---

**Last Updated:** May 28, 2026
**Theme:** Fresh Green Market
**Version:** 1.0
