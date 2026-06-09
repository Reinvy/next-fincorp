---
name: Nusantara Fiscal Standard
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#4a5f85'
  primary: '#000f27'
  on-primary: '#ffffff'
  primary-container: '#0b2447'
  on-primary-container: '#778cb5'
  inverse-primary: '#b1c7f3'
  secondary: '#435d95'
  on-secondary: '#ffffff'
  secondary-container: '#a6c0ff'
  on-secondary-container: '#324e85'
  tertiary: '#1d0a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c1c00'
  on-tertiary-container: '#b48059'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b1c7f3'
  on-primary-fixed: '#011b3e'
  on-primary-fixed-variant: '#32476c'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#afc6ff'
  on-secondary-fixed: '#001a43'
  on-secondary-fixed-variant: '#29457c'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#f6ba8e'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#663d1b'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  success-positive: '#1A5D1A'
  danger-liability: '#A73121'
  warning-deadline: '#B45309'
  surface-muted: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  tabular-nums:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 16px
  margin-edge: 24px
  table-row-height: 40px
---

## Brand & Style

The design system is engineered for the Indonesian financial sector, prioritizing **Regulatory Trust**, **Operational Precision**, and **Institutional Stability**. It bridges the gap between traditional banking reliability and modern SaaS efficiency. The target audience includes accountants, tax consultants, and business owners who require a high-density interface to manage complex compliance tasks like e-Faktur and PSAK reporting.

The visual direction follows a **Corporate / Modern** aesthetic with a "Data-First" philosophy. It utilizes a structured, high-density layout inspired by professional ERP systems but refined with modern clarity. The interface avoids decorative flourishes in favor of functional hierarchy, using subtle tonal layering and hairline dividers to organize vast amounts of quantitative data without overwhelming the user.

## Colors

The palette is anchored by **Deep Professional Blues** to evoke the authority of Indonesian state-owned enterprises and financial institutions. 

- **Primary & Secondary Blues:** Used for navigation, primary actions, and brand reinforcement. These colors signify stability and long-term reliability.
- **Semantic Color Logic:** The "Success" green and "Danger" red are specifically calibrated for financial legibility. Green represents positive cash flow, credits, and compliance success. Red is reserved for liabilities, debits, and critical tax alerts.
- **Neutral Scale:** A sophisticated range of cool grays (Slate) provides the necessary contrast for data tables and dashboard backgrounds, ensuring that multi-level Chart of Accounts (COA) remain readable during long working hours.

## Typography

Typography is optimized for **Tabular Realism**. 

- **Headlines:** Use **Hanken Grotesk** for a sharp, contemporary professional look in dashboards and report titles.
- **Body & Data:** **Inter** is utilized for its exceptional legibility and support for "Tabular Numbers." All financial figures in tables and KPI cards must use `font-variant-numeric: tabular-nums` to ensure decimal points align perfectly for rapid scanning.
- **Hierarchy:** We use a tight scale where `body-md` (14px) is the standard for data entry and tables, while `body-sm` (13px) is reserved for secondary metadata and audit trails to maximize information density.

## Layout & Spacing

This design system employs a **Fixed-Fluid Hybrid Grid**. The main workspace uses a 12-column system for dashboards, while individual accounting modules (like the General Ledger) use a fluid width to accommodate numerous columns.

- **Rhythm:** An 8px base grid is used for layout, while a 4px "micro-grid" is used for tight component internals (e.g., input field padding, icon spacing).
- **Density:** To align with DJP/e-Faktur standards, vertical spacing is condensed. Table rows are capped at 40px height to maximize the visibility of transaction lines on a single screen.
- **Breakpoints:**
  - **Desktop (1280px+):** Full sidebar with multi-level navigation.
  - **Tablet (768px - 1024px):** Collapsed sidebar, focus on KPI cards and summarized tables.
  - **Mobile (<768px):** Single column, card-based transaction list replaces horizontal tables.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** rather than aggressive shadows, maintaining a professional "flat-plus" look.

- **Base Layer:** Background color (`#F8FAFC`) provides a neutral canvas.
- **Content Layer:** White surfaces with a `1px` border (`#E2E8F0`) host the primary data.
- **Interactive Layer:** Subtle, low-blur shadows (4px blur, 5% opacity) are used only for active dropdowns, modals, and hovering over clickable cards.
- **Strict Separation:** Deep blue sidebars act as the "anchor" layer, clearly separating navigation from the working data area.

## Shapes

The shape language is **Soft (0.25rem)**, leaning towards architectural precision. 

- **Inputs & Buttons:** Use a 4px radius (`rounded-md`) to appear modern yet disciplined.
- **KPI Cards:** May use an 8px radius (`rounded-lg`) to differentiate dashboard summary components from the more rigid data tables.
- **Separators:** 1px hairline strokes are used for table borders and field grouping to maintain a clean, grid-like structure.

## Components

- **Data Tables:** The core of the system. Must include fixed headers, "Zebra-striping" on hover, and right-aligned numeric columns. Integrated filters should reside in the table header.
- **KPI Cards:** Feature a primary metric (e.g., Total PPN), a secondary trend indicator (Sparkline or percentage), and a bottom-aligned link to the full report.
- **Form Inputs:** "Floating Label" or "Top-Aligned" labels are required for complex tax forms to ensure the user never loses context. Support for input masks (Currency, NPWP, NIK) is mandatory.
- **Status Badges:** Compact, pill-shaped chips using semantic colors (e.g., "DRAFT" in gray, "TERKIRIM" in green, "DITOLAK" in red).
- **Financial Charts:** Use minimalist line and bar charts. Avoid 3D effects. Use the brand blue for primary data and semantic colors for variance analysis.
- **Action Bar:** A persistent bottom bar for "Input Jurnal" or "Simpan SPT" actions to ensure primary tasks are always accessible on long forms.