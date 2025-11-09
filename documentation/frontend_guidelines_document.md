# Frontend Guideline Document

## 1. Frontend Architecture

Our Admin Dashboard frontend is built with Next.js (App Router) and React + TypeScript. We use Tailwind CSS for styling, enhanced by the `shadcn/ui` component library. This setup gives us:

• **Scalability**: File-based routing makes it easy to add or reorganize pages. Component-based structure ensures new features slot in without touching unrelated code.  
• **Maintainability**: TypeScript catches errors early and documents props/types. Shared utilities live in a `/lib` folder. Components live in `/components` (and `/ui` for themed elements), keeping UI pieces decoupled.  
• **Performance**: Next.js offers automatic code splitting, image optimization, and built-in support for static generation (SSG) and server-side rendering (SSR). CSS is purged of unused classes in production, and we lazy-load heavy components.

## 2. Design Principles

We follow three guiding principles:

1. **Usability**  
   - Clear layouts and consistent patterns (e.g., sidebar + top bar) lower the learning curve.  
   - Form labels and error messages follow best practices for user feedback.

2. **Accessibility**  
   - All interactive elements use semantic HTML and ARIA attributes.  
   - Keyboard navigation is supported throughout (focus rings, skip links).  
   - Color contrast meets WCAG AA standards.

3. **Responsiveness**  
   - Mobile-first breakpoints in Tailwind ensure the dashboard adapts from phones to large desktop monitors.  
   - Fluid grids and flex layouts adjust tables, cards, and forms for any screen size.

## 3. Styling and Theming

### CSS Methodology
• **Utility-First (Tailwind CSS)**: We write most styles via utility classes for speed and consistency.  
• **Component Styles**: For complex components, we add small scoped CSS modules or inline styles in combination with Tailwind.

### Theming
• Central theme tokens are defined in `tailwind.config.js` under `theme.extend`. This ensures a single source for colors, spacing, and fonts.  
• Dark/light mode is supported via the `dark` variant in Tailwind.

### Visual Style
• **Design Style**: Modern, flat design with subtle depth (soft shadows and rounded corners).  
• **Glassmorphism Accents**: Transparent panels with blurred backgrounds are used sparingly (e.g., overview widgets) to highlight key data.

### Color Palette
• Primary: `#4F46E5` (Indigo-600)  
• Secondary: `#9333EA` (Violet-600)  
• Accent: `#22D3EE` (Cyan-400)  
• Background: `#F9FAFB` (Gray-50)  
• Surface (cards/panels): `#FFFFFF` (White)  
• Border: `#E5E7EB` (Gray-200)  
• Success: `#10B981` (Green-500)  
• Error: `#EF4444` (Red-500)  
• Warning: `#F59E0B` (Yellow-500)  
• Info: `#3B82F6` (Blue-500)

### Typography
• **Font Family**: `Inter`, sans-serif  
• **Headings**: Bold, scale from 1.5rem (H2) to 2.25rem (H1)  
• **Body**: 1rem with 1.5 line-height for readability

## 4. Component Structure

We organize components into three folders:

1. `/components` – App-specific pieces (e.g., `Sidebar`, `UserTable`).  
2. `/ui` – Reusable primitives from `shadcn/ui` (e.g., `Button`, `Input`, `Dialog`).  
3. `/hooks` – Custom React hooks (e.g., `useAuth`, `useFetch`).

Each component has its own folder when it needs multiple files (e.g., `ComponentName/ComponentName.tsx`, `ComponentName.styles.ts`). This encourages co-location of logic, styles, and tests.

**Benefits**:
• Clear boundaries between generic UI and app logic.  
• Easy to find, update, or replace a single component.  
• Encourages small, focused components that are simple to test and reuse.

## 5. State Management

We use a combination of:

• **React Context** for global concerns (e.g., authentication session, theme toggling).  
• **Local State** within components for UI interactions (e.g., open/close dialogs, form inputs).  
• **Data Fetching Hooks** (e.g., `useSWR` or `React Query`, if added) to cache and update remote data (tournaments, users) transparently.

**Auth Flow**:  
A custom `AuthProvider` wraps the app. It stores the JWT token in an HTTP-only cookie or `localStorage` and exposes `user` and `login/logout` via context. Components call `useAuth()` to guard routes or display user info.

## 6. Routing and Navigation

• **Next.js App Router** (`/app` folder): File-based routing automatically maps folders to URLs.  
• **Protected Routes**: We use a client-side guard in `layout.tsx` under `/dashboard` to redirect unauthenticated users to `/sign-in`.  
• **Navigation**: The `Sidebar` component contains `<Link>`s to key pages (`/dashboard`, `/dashboard/tournaments`, `/dashboard/users`). Active link highlighting uses Next.js’s `usePathname()` hook.

## 7. Performance Optimization

Key strategies:

1. **Code Splitting & Lazy Loading**  
   - Dynamic imports for heavy components (e.g., bracket visualizer).  
2. **Image Optimization**  
   - Next.js `<Image>` component serves responsive, WebP formats.  
3. **CSS Purge**  
   - Tailwind removes unused classes in production builds.  
4. **Caching**  
   - SWR or React Query caches API responses. Incremental static regeneration (ISR) can refresh data without full rebuilds.  
5. **Bundle Analysis**  
   - We run `next build --analyze` to spot large dependencies and prune or lazy-load them.

## 8. Testing and Quality Assurance

We ensure reliability using:

• **Unit Tests** with Jest and React Testing Library for components and hooks.  
• **Integration Tests** for multi-component interactions (e.g., form submission workflows).  
• **End-to-End Tests** with Cypress or Playwright to simulate user flows (sign-in, dashboard CRUD operations).  

**CI Integration**: Tests run on every pull request via GitHub Actions, with coverage reports and automatic linting (`eslint` + `prettier`).

## 9. Conclusion and Overall Frontend Summary

This document outlines a modern, scalable, and maintainable frontend setup for your Tournament Manager Admin Dashboard. By leveraging Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui, we ensure rapid development without sacrificing performance or accessibility. Component-based architecture, clear state management, and robust testing practices keep the codebase healthy as it grows. The visual style—flat, modern, with strategic glassmorphism—delivers a polished look while maintaining usability across devices. Together, these guidelines provide a solid foundation for building out your tournament management features with confidence and clarity.