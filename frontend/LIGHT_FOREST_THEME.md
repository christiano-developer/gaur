# Light Forest Theme - GAUR Dashboard

## Overview
The Light Forest theme provides a professional cybersecurity monitoring aesthetic with lighter forest green tones, replacing the previous dark forest green palette while maintaining security-focused design principles.

## Color Palette

### Base Colors
```css
--forest-bg-primary: #0E2A1B      /* Primary background */
--forest-bg-card: #184C32          /* Card/panel background */
--forest-bg-sidebar: #153C27       /* Sidebar/navbar */
--forest-bg-quick-actions: #E8F2E3 /* Quick actions panel */
```

### Accent Colors
```css
--forest-accent-primary: #00C46B   /* Primary UI highlight */
--forest-accent-light: #56E39F     /* Hover/focus states */
--forest-accent-hover: #297F57     /* Active hover color */
```

### Text Colors
```css
--forest-text-primary: #F2F8F4     /* Primary text (ivory) */
--forest-text-secondary: #B8D1C0   /* Secondary/muted text (sage) */
```

### UI Elements
```css
--forest-border: #264C3B           /* Borders/dividers */
--forest-button-primary: #1DD37C   /* Primary button color */
```

### Status Colors
```css
--forest-trend-up: #3EE57A         /* Positive trends */
--forest-warning: #FFB84C          /* Warnings/alerts */
--forest-error: #FF5E57            /* Errors/negative */
```

### Heatmap Colors
```css
--forest-heatmap-low: #B6E7C8      /* Low activity */
--forest-heatmap-mid: #4AD991      /* Medium activity */
--forest-heatmap-high: #007F4F     /* High activity */
```

## Usage Examples

### 1. Dashboard Card with Gradient
```tsx
<Card className="forest-card-gradient border border-forest-border">
  <div className="p-6">
    <h3 className="text-lg font-semibold text-forest-text-primary">
      Threat Analysis
    </h3>
    <p className="text-sm text-forest-text-secondary mt-2">
      Real-time monitoring dashboard
    </p>
  </div>
</Card>
```

### 2. Sidebar Navigation
```tsx
<aside className="forest-sidebar-gradient border-r border-forest-border">
  <nav className="space-y-2 p-4">
    <button className="w-full text-left px-4 py-2 rounded-lg
      bg-forest-sidebar-active text-forest-text-primary
      hover:bg-forest-accent-hover transition-colors">
      Dashboard
    </button>
    <button className="w-full text-left px-4 py-2 rounded-lg
      text-forest-text-secondary hover:text-forest-text-primary
      hover:bg-forest-accent-hover/30 transition-colors">
      Threats
    </button>
  </nav>
</aside>
```

### 3. Primary Button
```tsx
<button className="px-6 py-3 rounded-lg font-semibold
  bg-forest-button-primary text-forest-text-primary
  hover:bg-forest-accent-hover transition-all
  shadow-lg hover:shadow-xl forest-glow">
  Analyze Threat
</button>
```

### 4. Quick Actions Panel
```tsx
<div className="bg-forest-bg-quick-actions rounded-xl p-6
  border border-forest-border shadow-lg">
  <h4 className="font-semibold text-forest-bg-primary mb-4">
    Quick Actions
  </h4>
  <div className="space-y-2">
    <button className="w-full px-4 py-2 rounded-lg
      bg-forest-button-primary text-white
      hover:bg-forest-accent-hover transition-colors">
      New Patrol
    </button>
  </div>
</div>
```

### 5. Status Badge
```tsx
{/* Trend Up */}
<span className="px-3 py-1 rounded-full text-sm font-medium
  bg-forest-trend-up text-white">
  Active
</span>

{/* Warning */}
<span className="px-3 py-1 rounded-full text-sm font-medium
  bg-forest-warning text-forest-bg-primary">
  Pending
</span>

{/* Error */}
<span className="px-3 py-1 rounded-full text-sm font-medium
  bg-forest-error text-white">
  Critical
</span>
```

### 6. Heatmap Cell
```tsx
<div className={`w-3 h-3 rounded-sm cursor-pointer
  transition-all hover:scale-150 hover:ring-2
  hover:ring-forest-accent-primary
  ${count === 0 ? 'bg-forest-heatmap-low/30' :
    intensity > 0.75 ? 'bg-forest-heatmap-high' :
    intensity > 0.5 ? 'bg-forest-heatmap-mid' :
    'bg-forest-heatmap-low'}`}
  title={`${date}: ${count} threats`}
/>
```

## Tailwind Utility Classes

The theme includes custom Tailwind utilities you can use directly:

```tsx
// Backgrounds
bg-forest-bg-primary
bg-forest-bg-card
bg-forest-bg-sidebar
bg-forest-bg-quick-actions

// Text Colors
text-forest-text-primary
text-forest-text-secondary

// Borders
border-forest-border

// Accents
bg-forest-accent-primary
bg-forest-accent-light
bg-forest-accent-hover

// Status
bg-forest-trend-up
bg-forest-warning
bg-forest-error

// Heatmap
bg-forest-heatmap-low
bg-forest-heatmap-mid
bg-forest-heatmap-high
```

## Custom CSS Classes

```css
.forest-gradient
/* Gradient for main containers */

.forest-card-gradient
/* Card with gradient and shadow */

.forest-sidebar-gradient
/* Sidebar vertical gradient */

.forest-badge-shadow
/* Glowing shadow for badges */

.forest-glow
/* Emerald glow effect */
```

## Design Guidelines

### Typography
- **Headings**: Semibold, `text-forest-text-primary`
- **Body text**: Regular, `text-forest-text-secondary`
- **Font family**: Inter or Manrope (already configured in Tailwind)

### Spacing & Layout
- **Border radius**: `rounded-lg` (1rem) for cards
- **Padding**: Generous padding (p-6, p-8) for cards
- **Gaps**: Consistent spacing (space-y-4, gap-4)

### Shadows & Effects
- **Cards**: `shadow-lg` with optional `forest-card-gradient`
- **Buttons**: `shadow-lg hover:shadow-xl` with `forest-glow`
- **Hover states**: Scale transformations (`hover:scale-105`)

### Contrast & Accessibility
- All text colors meet WCAG AA standards
- Interactive elements have clear hover/focus states
- Status colors provide strong visual differentiation

## Migration from Old Theme

### Quick Find & Replace
If you need to migrate existing components:

```
Old → New
------------------
bg-gray-50 → bg-forest-bg-quick-actions
bg-gray-900 → bg-forest-bg-primary
text-gray-900 → text-forest-text-primary
text-gray-600 → text-forest-text-secondary
border-gray-200 → border-forest-border
bg-blue-600 → bg-forest-accent-primary
hover:bg-blue-700 → hover:bg-forest-accent-hover
```

## Compatibility

- ✅ Works with shadcn/ui components (HSL variables included)
- ✅ Compatible with Tailwind CSS v3
- ✅ Supports dark mode (uses same Light Forest colors)
- ✅ Maintains Goa Police legacy colors for backward compatibility

## Support

For questions or theme customization requests, refer to the main CLAUDE.md documentation.
