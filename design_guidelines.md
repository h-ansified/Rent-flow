# Landlord Dashboard Design Guidelines

## Design Approach

**Selected System:** Material Design principles adapted for data-intensive dashboard applications
**Justification:** Utility-focused application requiring clear information hierarchy, efficient data display, and established interaction patterns for productivity tools. Drawing inspiration from Linear's clean interface and Notion's data organization.

## Core Design Elements

### A. Typography

**Font Family:** Inter (via Google Fonts CDN)

**Type Scale:**
- Page Titles: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Labels/Meta: text-sm font-medium (14px)
- Captions/Helpers: text-xs font-normal (12px)

### B. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, and 24
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Card spacing: p-6
- Form elements: space-y-4
- Page margins: px-6 md:px-8

**Grid Structure:**
- Main container: max-w-7xl mx-auto
- Dashboard grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Sidebar navigation: w-64 fixed left-0 (desktop), mobile drawer
- Content area: ml-64 (desktop), full-width (mobile)

### C. Component Library

**Navigation:**
- Fixed left sidebar (desktop) with logo, primary navigation items, and user profile at bottom
- Mobile: Collapsible hamburger menu with overlay drawer
- Top bar: Page title, breadcrumbs, search, and notification bell (Heroicons: bell, magnifying-glass)

**Dashboard Cards:**
- Metric Cards: Elevated surfaces (shadow-sm) with icon, label, primary metric, and change indicator
- Chart Cards: Larger elevated cards with header (title + time selector) and chart area
- List Cards: Scrollable lists with row items showing status badges and action buttons

**Data Display:**
- Tables: Alternating row backgrounds, sticky headers, sortable columns, hover states
- Status Badges: Rounded-full px-3 py-1 text-xs with semantic states (paid/pending/overdue)
- Progress Indicators: Linear progress bars with percentage labels
- Charts: Use Chart.js via CDN for line graphs (revenue trends) and donut charts (occupancy)

**Forms & Inputs:**
- Text inputs: border rounded-lg px-4 py-2 with focus ring
- Dropdowns: Custom select with chevron-down icon
- Date pickers: Input with calendar icon (Heroicons: calendar)
- Search bars: Input with magnifying-glass icon prefix

**Action Elements:**
- Primary buttons: rounded-lg px-4 py-2 font-medium
- Secondary buttons: outlined variant with border
- Icon buttons: p-2 rounded-lg for compact actions
- Floating action button: Fixed bottom-right for quick property/tenant add (plus icon)

**Overlays:**
- Modals: Centered with backdrop blur, max-w-2xl, rounded-xl
- Dropdowns: shadow-lg rounded-lg with dividers between groups
- Tooltips: text-xs rounded px-2 py-1 on icon hovers

### D. Animations

Use sparingly for functional feedback only:
- Hover states: Simple opacity or background transitions
- Loading states: Subtle skeleton screens for data tables
- Modal entry: Fade + slight scale (0.95 to 1)
- No scroll animations or decorative motion

## Page-Specific Layouts

**Dashboard Home:**
- Top row: 4 metric cards (total properties, occupied units, monthly revenue, pending maintenance)
- Middle: 2-column layout with revenue chart (left, 2/3 width) and recent activity feed (right, 1/3 width)
- Bottom: Upcoming lease expirations table

**Properties List:**
- Filter bar with search, status dropdown, and sort options
- Grid of property cards showing image placeholder, address, occupancy status, monthly revenue
- Click opens property detail page

**Tenants List:**
- Searchable data table with columns: Name, Property, Unit, Lease End, Payment Status, Actions
- Inline status badges and quick action icons (view, message, document)

**Maintenance Requests:**
- Kanban-style board with columns: New, In Progress, Completed
- Each card shows property, issue type, priority badge, assignment, and timestamp

**Financial Overview:**
- Revenue vs Expenses chart (stacked area or line comparison)
- Payment status breakdown (donut chart)
- Transaction table with filters

## Icons

**Library:** Heroicons (outline variant) via CDN
**Key Icons:** home, users, currency-dollar, wrench-screwdriver, document-text, bell, calendar, chart-bar, cog-6-tooth, plus, chevron-down, magnifying-glass

## Accessibility

- Semantic HTML5 structure throughout
- ARIA labels on all interactive elements
- Keyboard navigation support for all actions
- Focus indicators on all interactive elements (ring-2)
- Sufficient color contrast for all text (minimum WCAG AA)
- Screen reader friendly status announcements