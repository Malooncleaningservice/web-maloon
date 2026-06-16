# 🌿 Maloon Design System: "Pristine Freshness" (v2.0)

## 1. Core Philosophy: The Breath of Fresh Air
The Maloon brand should not feel "clinical" or "sterile." It should feel **revitalized**. We move away from the "methodical checklist" look and toward a "transformation" experience.

*   **The Goal:** To communicate the feeling of walking into a room that has just been deep-cleaned: airy, bright, organized, and revitalized.
*   **The Vibe:** High-end, organic, breathable, and effortless.

---

## 2. The Color Atmosphere 🎨
We use colors to create "atmospheres" rather than just filling containers.

### A. Atmospheric Gradients (The Environment)
*   **`gradient-fresh`**: `linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%)`
    *   *Use:* Hero sections, large background blocks. Creates a sense of light and air.
*   **`gradient-sunlight`**: `linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)`
    *   *Use:* Standard content sections. Maintains a clean, "high-end hotel linen" feel.
*   **`gradient-deep`**: `linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%)`
    *   *Use:* High-impact sections (Footers, CTAs). Provides grounding and trust.

### B. Functional Tones (The UI)
*   **`vitality-green` (`#4caf50`)**: The pulse. Primary actions and active states.
*   **`forest-anchor` (`#2e7d32`)**: The weight. Subheaders and secondary buttons.
*   **`deep-pine` (`#1b5e20`)**: The foundation. Main headings and primary text.
*   **`sage-soft` (`#c8e6c9`)**: The texture. Borders, dividers, and subtle accents.
*   **`sparkle-warm` (`#ffb74d`)**: The glint. Used sparingly for high-value CTAs to suggest a "polished" finish.

---

## 3. The Z-Axis: Depth & Elevation 🏔️
We treat the website as a 3D space to break the "flat/methodical" feeling.

| Level | Name | Visual Signature | Use Case |
| :--- | :--- | :--- | :--- |
| **0** | **Ground** | Flat, no shadow. | Page backgrounds, base sections. |
| **1** | **Surface** | `0 4px 12px rgba(27,94,32,.06)` | Standard cards, info boxes. |
| **2** | **Interaction** | `0 12px 32px rgba(27,94,32,.12)` + `scale(1.02)` | Hover states for cards and buttons. |
| **3** | **Focus** | `0 24px 48px rgba(27,94,32,.16)` | Modals, pop-ups, critical alerts. |

---

## 4. Organic Geometry 🍃
We break the "boxiness" of standard web design.

1.  **The Squircle Rule:** Use generous, soft corner radii.
    *   Large containers: `24px`
    *   Cards/Buttons: `16px`
2.  **Background Blobs:** Use low-opacity (`0.05`), large, organic SVG shapes in `sage-soft` behind text to create depth and visual interest without adding clutter.
3.  **Glassmorphism:** Use `backdrop-filter: blur(10px)` on cards to create a "frosted glass" effect, suggesting clarity and transparency.
4.  **Subtle Texture:** Add a fine "paper" texture overlay (`noise.png` pattern) on fresh-mint backgrounds at 3% opacity for an organic, grounded feel.

### Organic Shape Library
*   **Leaf Blob:** Large, asymmetrical leaf-shaped SVG for hero sections
*   **Water Droplet:** Circular with wavy edges for service highlights
*   **Cloud Form:** Soft, irregular cloud shapes for info boxes
*   **Wave Divider:** Gentle wave patterns for section transitions

---

## 5. The Motion Language (Life) ⚡
Interaction is how the site "breathes."

*   **The Lift:** On hover, elements should feel like they are being lifted toward the user (`translateY(-6px)`).
*   **The Pulse:** High-value buttons should have a very subtle, slow-moving gradient animation to attract the eye.
*   **The Reveal (Scroll-Triggered):** Content sections should "fade in and lift" as they enter the viewport, creating a sense of discovery.
*   **The Breathe:** Organic background elements should have gentle, continuous motion to simulate natural movement.
*   **The Glow:** Interactive elements should have a soft glow effect on focus/hover to enhance accessibility and visual interest.

### Micro-Interaction Patterns
*   **Icon Badge Pulse:** Service icons should gently pulse when their parent card is hovered
*   **Border Glow:** Card borders should transition from sage-soft to leaf-green with a subtle glow effect
*   **CTA Shimmer:** Primary call-to-action buttons should have a horizontal gradient shimmer
*   **Section Transition Fade:** As users scroll, sections should fade in with a 200ms delay between elements for a cascading effect

---

## 6. Typography Hierarchy ✍️
A wider contrast between headings and body text creates an "editorial" feel.

*   **Display (H1):** `clamp(40px, 6vw, 64px)`, `font-weight: 800`, `color: var(--deep-pine)`.
*   **Headline (H2):** `clamp(30px, 4vw, 42px)`, `font-weight: 700`, `color: var(--forest-anchor)`.
*   **Subhead (H3/H4):** `clamp(20px, 2.5vw, 28px)`, `font-weight: 600`, `color: var(--text-secondary)`.
*   **Body:** `17px` base, `1.8` line-height for maximum readability and "air."

---

## 7. Component Patterns

### A. The "Glass Pane" Card
*   `background: rgba(255, 255, 255, 0.7)`
*   `backdrop-filter: blur(12px)`
*   `border: 1px solid rgba(200, 230, 201, 0.5)` (Sage Soft)
*   `border-radius: 24px`

### B. The "Breathing" List
*   Instead of standard bullets, use elegant, small green checkmarks.
*   Use generous `padding-left` to give the text "room to breathe."

### C. The "Floating" CTA
*   Buttons should have a slight shadow and a clear hover lift.
*   Primary buttons: `forest-anchor` background $\rightarrow$ `deep-pine` on hover.

### D. Color Blocking Patterns
*   **Full-Width Block:** Use `var(--forest)` or `var(--deep-pine)` backgrounds with white text for high-impact sections
*   **Gradient Block:** Apply `var(--gradient-deep)` to create depth in key sections like "How It Works"
*   **Accent Block:** Use `var(--leaf-green)` for highlight sections with 90% opacity overlay

### E. Section Transition Patterns
*   **Wave Divider:** SVG wave pattern between sections (height: 60px, color: sage-soft at 20% opacity)
*   **Gradient Fade:** 100px gradient transition between color blocks (from section color to next section color)
*   **Organic Blob:** Large SVG blob overlapping two sections to create visual continuity

---

**Last Updated:** June 16, 2026
**Theme:** Living Green (Pristine Freshness v2.1)
**Version:** 2.1
**Key Upgrades:** Enhanced motion language, organic geometry patterns, color blocking system, and micro-interaction guidelines
