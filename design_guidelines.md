# Roster & Schedule Management Application - Design Guidelines

## Design Approach

**Selected System: Linear-inspired Modern Productivity**
Drawing from Linear's sophisticated minimalism, Material Design's robust components, and Notion's clarity. This approach prioritizes information density, scannable hierarchies, and efficient workflows over decorative elements.

**Core Principles:**
- Information clarity over visual ornamentation
- Productive efficiency through purposeful spacing
- Systematic consistency for learnability
- Subtle depth without distraction

## Typography System

**Font Stack:**
- Primary: Inter (Google Fonts) - all weights 400-700
- Monospace: JetBrains Mono - for time displays, codes

**Hierarchy:**
- H1: text-4xl font-semibold (page titles)
- H2: text-2xl font-semibold (section headers)
- H3: text-lg font-semibold (card/panel headers)
- Body: text-base (main content)
- Small: text-sm (metadata, timestamps)
- Tiny: text-xs (labels, badges)

## Layout & Spacing System

**Tailwind Units:** Standardized on 2, 4, 6, 8, 12, 16, 24 for consistency
- Component padding: p-4, p-6
- Section spacing: py-12, py-16
- Card gaps: gap-4, gap-6
- Grid gaps: gap-8

**Container System:**
- Full app wrapper: max-w-[1400px] mx-auto
- Content sections: max-w-7xl
- Narrow content: max-w-4xl

## Component Library

### Navigation
**Top Header:** Fixed, backdrop-blur, with logo (h-8), main navigation links, user profile dropdown
**Sidebar:** Optional for larger screens (w-64), collapsible on mobile, includes primary navigation items with icons

### Dashboard Layouts
**Calendar View:** Full-width grid with date cells, time slots, draggable shift blocks
**List View:** Table format with sortable columns (Name, Shift, Date, Status), row hover states
**Kanban Board:** Unassigned/Assigned/Confirmed columns with draggable cards

### Data Display Components
**Shift Cards:** Rounded corners (rounded-lg), subtle border, includes employee avatar, time range, location badge, action menu
**Employee Cards:** Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3), avatar, name, role tag, availability status, contact action
**Schedule Rows:** Striped table pattern, expandable details, inline edit capability

### Forms & Inputs
**Input Fields:** Consistent height (h-10), rounded borders (rounded-md), clear labels above, helper text below
**Date/Time Pickers:** Modal popover style, calendar grid, time selector
**Multi-Select:** Dropdown with checkboxes, selected chips display
**Search Bar:** Prominent placement (w-full max-w-md), with icon, real-time filtering

### Status Indicators
**Badges:** Small rounded pills (rounded-full px-2.5 py-0.5 text-xs) for shift types, availability
**Availability Dots:** Inline indicators (h-2 w-2 rounded-full)
**Progress Bars:** Linear fill for shift coverage percentage

### Actions & CTAs
**Primary Buttons:** Prominent, medium size (px-4 py-2), for "Create Shift", "Publish Schedule"
**Secondary Buttons:** Outlined variant for "Cancel", "View Details"
**Icon Buttons:** Circular (h-8 w-8), for edit, delete, more actions

### Data Visualization
**Coverage Charts:** Horizontal bar charts showing shift fulfillment
**Timeline View:** Linear representation of shifts across days/weeks
**Statistics Cards:** Grid of metric cards (Total Employees, Shifts This Week, Coverage %)

### Overlays
**Modals:** Centered, max-w-2xl, for shift creation, employee details
**Slide-overs:** Right-side panel for quick edits, notifications
**Dropdowns:** Subtle shadow, rounded corners, for filters, user menu

## Images

**Hero Section:** Full-width hero (h-[500px]) featuring professional team collaboration imagery - diverse team reviewing schedules on tablets/screens in modern office environment. Place "Get Started" and "View Demo" CTAs over image with backdrop-blur-sm bg-white/90 treatment.

**Dashboard Illustration:** Empty state illustrations for unpopulated sections - friendly, minimal line-art style showing calendar grids, team icons.

**Employee Avatars:** Circular (h-10 w-10 or h-12 w-12), placeholder pattern for missing photos

**Background Patterns:** Subtle dot grid or line patterns for empty calendar cells

## Animations

**Minimal Motion:**
- Hover states: scale-[1.02] transition-transform
- Loading states: Subtle pulse on skeleton screens
- Drag & drop: Smooth transform during card movement
- Avoid scroll-triggered animations

## Logo Treatment

**Adaptive Logo:** Create logo with transparent background, sufficient internal padding. Provide monochrome variant for maximum flexibility across headers, sidebars, and modes.

**Placement:** Header left (h-8), sufficient margin (ml-4), pairs with app name in text-lg font-semibold

This system creates a professional, efficient interface prioritizing user productivity and data clarity while maintaining visual sophistication.