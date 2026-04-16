# Design System Specification: The Architectural Flow

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Precision Architect."** 

Project ZCA (Zalo Control & Automation) is not merely a utility; it is a command center. To move beyond the "generic SaaS" aesthetic, this system rejects the cluttered, line-heavy interfaces of the past in favor of **Tonal Architecture**. We create clarity through deliberate white space, asymmetric balance, and a "No-Line" philosophy. The interface should feel like a high-end physical workspace—clean, organized, and quietly powerful.

By utilizing high-contrast typography scales and overlapping surface layers, we create a "Vercel-meets-Editorial" experience that feels premium, intentional, and high-performance.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
We move away from 1px borders. In this system, boundaries are defined by light and density, not strokes.

### The Core Palette
*   **Primary (`primary`):** `#004ac6` – The authoritative engine.
*   **Primary Container (`primary_container`):** `#2563eb` – High-action surfaces.
*   **Surface (`surface`):** `#f7f9fb` – The canvas.
*   **Surface Container Lowest (`surface_container_lowest`):** `#ffffff` – High-priority cards/modals.
*   **Surface Container Low (`surface_container_low`):** `#f2f4f6` – Secondary background grouping.

### The "No-Line" Rule
Explicitly prohibit 1px solid borders for sectioning. Contrast must be achieved through:
1.  **Background Color Shifts:** Place a `surface_container_lowest` card on a `surface` background.
2.  **Tonal Transitions:** Use `surface_container_low` to define a sidebar area against a `surface` main content area.

### Glass & Gradient Implementation
Main CTAs and Hero elements should utilize a subtle linear gradient: 
*   **Direction:** 135deg
*   **From:** `primary` (`#004ac6`) 
*   **To:** `primary_container` (`#2563eb`)
This adds a "visual soul" and depth that flat hex codes lack. For floating panels, use **Glassmorphism**: `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur.

---

## 3. Typography: The Editorial Hierarchy
We use **Inter** as a variable font to create a sophisticated, rhythmic hierarchy.

| Token | Size | Weight | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 3.5rem | 700 | -0.04em | High-impact metrics |
| `headline-sm` | 1.5rem | 600 | -0.02em | Section headers |
| `title-md` | 1.125rem | 500 | 0 | Sub-section grouping |
| `body-md` | 0.875rem | 400 | 0 | Primary interface text |
| `label-sm` | 0.6875rem | 600 | 0.05em | Uppercase metadata |

**Editorial Note:** Use `display-lg` sparingly for automation counts or "Project ZCA" status summaries to create an authoritative, dashboard-first feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are a fallback, not a standard. We use **Layering Principles**.

*   **Tonal Stacking:** Place `surface_container_lowest` (White) elements on top of `surface_container_low` (Light Grey) sections. The depth is felt, not seen.
*   **Ambient Shadows:** If an element must "float" (e.g., a dropdown), use an extra-diffused shadow: `0 8px 30px rgba(25, 28, 30, 0.06)`. Note the use of `on_surface` color for the shadow tint to keep it natural.
*   **The Ghost Border:** If accessibility requires a container boundary, use the `outline_variant` (`#c3c6d7`) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components: Custom Precision

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `rounded-md`, white text. No border.
*   **Secondary:** `surface_container_highest` background with `on_surface` text.
*   **Ghost:** No background. `primary` text. Transitions to `surface_container_low` on hover.
*   **Danger:** `error` (`#ba1a1a`) background. Use sparingly for destructive automation triggers.

### Inputs & Automation Controls
*   **The Container:** `surface_container_lowest` background.
*   **The Interaction:** On focus, a 2px outer ring using `primary_fixed` (`#dbe1ff`) and a transition to `primary` for the "Ghost Border."
*   **Status Badges:** Avoid heavy blocks of color. Use a "Soft Fill" (e.g., `error_container` background with `on_error_container` text) and `rounded-full` for a modern, approachable feel.

### Sidebar Navigation (The Command Strip)
*   **Background:** `#1E3A5F` (Dark Navy).
*   **Active State:** No bulky backgrounds. Use a vertical "pill" indicator (3px wide) in `primary` on the left edge, and shift the icon color to `primary_fixed`.
*   **Asymmetry:** The sidebar should be visually detached from the main content via a `surface` gutter, creating an "App-within-an-App" editorial look.

### Cards & Lists
*   **Rule:** Forbid divider lines.
*   **Separation:** Use vertical spacing (e.g., 24px/32px) and `surface_container_low` backgrounds for list items to group related automation tasks.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Align high-level stats to the left and automation logs to the right with different column widths to break the "standard grid" feel.
*   **Embrace Breathing Room:** Increase your white space by 20% more than you think is necessary.
*   **Layer Surfaces:** Think of the UI as layers of fine paper stacked on a desk.

### Don’t:
*   **Don't use 1px Dividers:** Use background shifts or white space to separate content.
*   **Don't use Pure Black:** Always use `on_surface` (`#191c1e`) for text to maintain a premium, softened contrast.
*   **Don't Over-Shadow:** If every card has a shadow, nothing is elevated. Use elevation only for transient elements (modals, tooltips).