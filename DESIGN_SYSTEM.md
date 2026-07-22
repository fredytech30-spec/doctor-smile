# Doctor Smile — Design System Premium

## 🎨 Identité Visuelle

**Philosophie** : Intelligence, précision, fiabilité, élégance, innovation

**Couleur principale** : Violet premium (#7C3AED)

**Règle 60/30/10** :
- 60% : Surfaces principales (fonds sobres)
- 30% : Surfaces secondaires (cartes, panneaux)
- 10% : Accent violet (actions principales, liens, états actifs)

---

## 🎯 Palette de Couleurs

### Surfaces (60% - Fond principal)

```css
/* Dark Mode (par défaut) */
--surface-bg: #04040A;           /* Fond principal */
--surface-primary: #0A0A1A;      /* Surfaces principales */
--surface-secondary: #12122A;    /* Cartes, panneaux */
--surface-tertiary: #1A1A3A;     /* Sections */
--surface-elevated: #22224A;     /* Modales, dropdowns */
--surface-hover: #2A2A5A;        /* Hover states */

/* Light Mode */
--surface-bg-light: #FFFFFF;
--surface-primary-light: #F8F9FA;
--surface-secondary-light: #E9ECEF;
--surface-tertiary-light: #DEE2E6;
--surface-elevated-light: #CED4DA;
--surface-hover-light: #ADB5BD;
```

### Surfaces Secondaires (30% - Cartes, panneaux)

```css
/* Dark Mode */
--card-bg: #12122A;
--card-border: rgba(124, 58, 237, 0.15);
--card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
--card-hover-shadow: 0 8px 30px rgba(124, 58, 237, 0.2);

/* Light Mode */
--card-bg-light: #FFFFFF;
--card-border-light: rgba(124, 58, 237, 0.1);
--card-shadow-light: 0 2px 10px rgba(0, 0, 0, 0.1);
--card-hover-shadow-light: 0 4px 20px rgba(124, 58, 237, 0.15);
```

### Accent Violet (10% - Actions principales)

```css
/* Primary Violet */
--violet-primary: #7C3AED;       /* Actions principales */
--violet-secondary: #8B5CF6;     /* Liens importants */
--violet-tertiary: #A78BFA;      /* États actifs */
--violet-muted: #C4B5FD;         /* Texte accent */

/* Violet Gradients */
--violet-gradient: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%);
--violet-gradient-hover: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
--violet-glow: rgba(124, 58, 237, 0.4);
--violet-glow-subtle: rgba(124, 58, 237, 0.15);
```

### Couleurs Sémantiques

```css
/* Success */
--success-primary: #10B981;
--success-bg: rgba(16, 185, 129, 0.1);
--success-border: rgba(16, 185, 129, 0.2);

/* Warning */
--warning-primary: #F59E0B;
--warning-bg: rgba(245, 158, 11, 0.1);
--warning-border: rgba(245, 158, 11, 0.2);

/* Error */
--error-primary: #EF4444;
--error-bg: rgba(239, 68, 68, 0.1);
--error-border: rgba(239, 68, 68, 0.2);

/* Info */
--info-primary: #3B82F6;
--info-bg: rgba(59, 130, 246, 0.1);
--info-border: rgba(59, 130, 246, 0.2);
```

### Couleurs de Texte

```css
/* Dark Mode */
--text-primary: #FFFFFF;
--text-secondary: rgba(255, 255, 255, 0.85);
--text-tertiary: rgba(255, 255, 255, 0.65);
--text-muted: rgba(255, 255, 255, 0.45);
--text-disabled: rgba(255, 255, 255, 0.25);

/* Light Mode */
--text-primary-light: #1A1A2E;
--text-secondary-light: rgba(26, 26, 46, 0.75);
--text-tertiary-light: rgba(26, 26, 46, 0.55);
--text-muted-light: rgba(26, 26, 46, 0.35);
--text-disabled-light: rgba(26, 26, 46, 0.2);
```

### Bordures

```css
--border-subtle: rgba(255, 255, 255, 0.08);
--border-default: rgba(255, 255, 255, 0.12);
--border-strong: rgba(255, 255, 255, 0.18);
--border-violet: rgba(124, 58, 237, 0.3);
--border-violet-strong: rgba(124, 58, 237, 0.5);
```

---

## 🔤 Typographie

### Polices

```css
/* Display Font - Titres, Hero */
--font-display: 'Syne', sans-serif;

/* Body Font - Texte courant */
--font-body: 'Instrument Sans', sans-serif;

/* Mono Font - Code, données */
--font-mono: 'JetBrains Mono', monospace;
```

### Échelle Typographique

```css
/* Display */
--text-display-xs: 32px;    /* line-height: 40px */
--text-display-sm: 40px;    /* line-height: 48px */
--text-display-md: 48px;    /* line-height: 56px */
--text-display-lg: 56px;    /* line-height: 64px */
--text-display-xl: 64px;    /* line-height: 72px */

/* Heading */
--text-h1: 36px;            /* line-height: 44px */
--text-h2: 30px;            /* line-height: 38px */
--text-h3: 24px;            /* line-height: 32px */
--text-h4: 20px;            /* line-height: 28px */
--text-h5: 18px;            /* line-height: 26px */
--text-h6: 16px;            /* line-height: 24px */

/* Body */
--text-xl: 18px;            /* line-height: 28px */
--text-lg: 16px;            /* line-height: 24px */
--text-base: 14px;          /* line-height: 20px */
--text-sm: 13px;            /* line-height: 18px */
--text-xs: 12px;            /* line-height: 16px */

/* Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
```

### Utilisation

- **Display** : Hero sections, grandes titres landing
- **H1-H3** : Titres de sections, cards
- **H4-H6** : Sous-titres, labels
- **Body** : Texte courant, descriptions
- **Mono** : Code, données techniques, chiffres

---

## 📐 Espacements

### Système Spatial (Base 8px)

```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;
--space-40: 160px;
--space-48: 192px;
--space-56: 224px;
--space-64: 256px;
```

### Utilisation

- **space-1-2** : Micro-espacements (icones, badges)
- **space-3-4** : Éléments internes (padding inputs)
- **space-6-8** : Composants (cards, buttons)
- **space-10-12** : Sections (margins)
- **space-16+** : Layout (conteneurs)

---

## 🔘 Rayons

```css
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-3xl: 32px;
--radius-full: 9999px;
```

### Utilisation

- **sm** : Tags, badges, petits éléments
- **md** : Inputs, buttons standard
- **lg** : Cards, modales
- **xl** : Grandes cards, panels
- **2xl+** : Hero sections, bento grids

---

## 💫 Ombres

```css
/* Subtle */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);

/* Medium */
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.15);
--shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.2);

/* Large */
--shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.25);
--shadow-2xl: 0 24px 48px rgba(0, 0, 0, 0.3);

/* Colored */
--shadow-violet: 0 8px 24px rgba(124, 58, 237, 0.25);
--shadow-violet-lg: 0 16px 48px rgba(124, 58, 237, 0.35);

/* Inner */
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.1);
```

---

## 🎬 Animations

### Durées

```css
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 700ms;
```

### Easing

```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-premium: cubic-bezier(0.16, 1, 0.3, 1); /* Custom smooth */
```

### Transitions

```css
/* Default */
--transition-default: all var(--duration-normal) var(--ease-premium);

/* Fast */
--transition-fast: all var(--duration-fast) var(--ease-premium);

/* Slow */
--transition-slow: all var(--duration-slow) var(--ease-premium);

/* Specific */
--transition-colors: color var(--duration-normal) var(--ease-premium);
--transition-transform: transform var(--duration-normal) var(--ease-premium);
--transition-opacity: opacity var(--duration-normal) var(--ease-premium);
```

### Animations Keyframes

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade In Down */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide In Right */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Spin */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Bounce */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🧩 Composants

### Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Variants** :
- **primary** : Violet gradient, actions principales
- **secondary** : Surface secondary, actions secondaires
- **ghost** : Transparent, actions subtiles
- **danger** : Error color, actions destructives

**Sizes** :
- **sm** : 32px height, 13px font
- **md** : 40px height, 14px font (default)
- **lg** : 48px height, 16px font

### Card

```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

**Variants** :
- **default** : Surface secondary, shadow subtle
- **elevated** : Surface elevated, shadow medium
- **bordered** : Border violet, no shadow

### Input

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
}
```

**States** :
- **default** : Border subtle
- **focus** : Border violet, glow subtle
- **error** : Border error, error message
- **disabled** : Opacity reduced, no interaction

### Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

**Sizes** :
- **sm** : 400px max-width
- **md** : 600px max-width (default)
- **lg** : 800px max-width
- **xl** : 1000px max-width

### Badge

```tsx
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}
```

**Variants** :
- **default** : Violet
- **success** : Green
- **warning** : Amber
- **error** : Red
- **info** : Blue

---

## 🌓 Thèmes

### Dark Mode (Default)

```css
[data-theme="dark"] {
  --bg: var(--surface-bg);
  --surface: var(--surface-primary);
  --surface-secondary: var(--surface-secondary);
  --text: var(--text-primary);
  --text-secondary: var(--text-secondary);
  --border: var(--border-default);
}
```

### Light Mode

```css
[data-theme="light"] {
  --bg: var(--surface-bg-light);
  --surface: var(--surface-primary-light);
  --surface-secondary: var(--surface-secondary-light);
  --text: var(--text-primary-light);
  --text-secondary: var(--text-secondary-light);
  --border: var(--border-subtle);
}
```

### System Preference

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    /* Light mode variables */
  }
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Dark mode variables */
  }
}
```

---

## ♿ Accessibilité (WCAG 2.2 AA)

### Contraste Ratios

- **Texte normal** : Minimum 4.5:1
- **Texte large** : Minimum 3:1
- **Composants UI** : Minimum 3:1
- **Focus visible** : Minimum 3:1

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--violet-primary);
  outline-offset: 2px;
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--violet-primary);
  outline-offset: 2px;
}
```

### Keyboard Navigation

- **Tab order** : Logique et prévisible
- **Skip links** : Liens d'évitement
- **ARIA labels** : Descriptifs et précis
- **Live regions** : Mises à jour dynamiques

### Screen Readers

```html
<!-- Exemple -->
<button
  aria-label="Fermer la modale"
  aria-pressed="false"
>
  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
</button>
```

---

## 📱 Responsive

### Breakpoints

```css
--breakpoint-xs: 375px;
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Grid System

```css
/* Container */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

/* Responsive Grid */
@media (min-width: 768px) {
  .md\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}
```

---

## 🎯 Utilisation

### Import dans Next.js

```tsx
// globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Design System tokens */
  }
}
```

### Composant React

```tsx
import React from 'react';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner />}
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};
```

---

## 📚 Règles d'Utilisation

### DO ✅

- Utiliser les tokens CSS pour tout
- Respecter la règle 60/30/10
- Maintenir la cohérence des espacements
- Utiliser les animations avec parcimonie
- Respecter prefers-reduced-motion
- Tester l'accessibilité

### DON'T ❌

- Hardcoder les valeurs
- Mélanger les variantes de composants
- Surcharger les animations
- Ignorer les contrastes
- Oublier les focus states
- Négliger le responsive

---

## 🔧 Maintenance

### Version

- **Version actuelle** : 1.0.0
- **Dernière mise à jour** : 2026-07-11

### Processus de mise à jour

1. Proposer les changements
2. Tester l'impact sur tous les composants
3. Mettre à jour la documentation
4. Communiquer les changements
5. Versionner le Design System

### Outils

- **Figma** : Design et prototypes
- **Storybook** : Documentation composants
- **Chromatic** : Tests visuels
- **Lighthouse** : Performance et accessibilité

---

Ce Design System est la source unique de vérité pour tous les composants UI de Doctor Smile. Toute modification doit être validée et documentée.
