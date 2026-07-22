# Plan de Migration Next.js + FastAPI
## Doctor Smile - Architecture Moderne

### 📋 Vue d'ensemble
- **De** : HTML statique + JavaScript vanilla + FastAPI monolithique
- **Vers** : Next.js 14 (App Router) + FastAPI (API uniquement) + TypeScript

### 🎯 Objectifs
1. Séparation claire frontend/backend
2. Meilleure maintenabilité et scalabilité
3. Performance optimisée (SSR, code splitting)
4. TypeScript pour la sécurité des types
5. DX améliorée (Hot reload, debugging)

---

## 📅 Phase 1 : Initialisation (Jour 1)

### 1.1 Créer le projet Next.js
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 1.2 Configuration de base
- Installer les dépendances Firebase
- Configurer Tailwind CSS avec le thème Doctor Smile
- Créer la structure des dossiers
- Configurer les variables d'environnement

### 1.3 Intégration FastAPI
- Séparer les routes API du serveur de fichiers statiques
- Configurer CORS pour Next.js
- Créer un proxy de développement

---

## 📅 Phase 2 : Fondations UI (Jour 2-3)

### 2.1 Composants de base
- Button, Input, Modal, Card
- Layout components (Header, Sidebar, Footer)
- Loading states, Error boundaries

### 2.2 Thème et Styling
- Migrer le CSS existant vers Tailwind
- Créer les tokens de design (couleurs, espacements)
- Mode sombre/clair

### 2.3 Firebase Integration
- Auth context provider
- Firestore hooks
- Configuration des services

---

## 📅 Phase 3 : Pages d'authentification (Jour 4-5)

### 3.1 Pages à migrer
- `auth.html` → `/auth`
- `otp-verify.html` → `/auth/verify`
- `reset-password.html` → `/auth/reset`

### 3.2 Logique à convertir
- `firebase-auth.js` → React hooks
- `auth-ui.js` → Composants React
- Formulaire 2FA avec validation

---

## 📅 Phase 4 : Dashboard principal (Jour 6-8)

### 4.1 Pages à migrer
- `dashboard.html` → `/dashboard`
- `intro.html` → `/intro`

### 4.2 Logique à convertir
- `dashboard.js` → Composants React
- `dashboard-core.js` → Hooks personnalisés
- `dashboard-analytics.js` → Charts/visualisations
- `dashboard-ui.js` → UI components

---

## 📅 Phase 5 : Fonctionnalités avancées (Jour 9-12)

### 5.1 Pages à migrer
- `settings.html` → `/settings`
- `notifications.html` → `/notifications`
- `marketplace.html` → `/marketplace`
- `chatbot.html` → `/chatbot`

### 5.2 Logique à convertir
- `ds-upload.js` → Upload component
- `ds-export.js` → Export functionality
- `ds-chat.js` → Chat interface
- `ds-marketplace.js` → Marketplace logic

---

## 📅 Phase 6 : Landing page (Jour 13)

### 6.1 Pages à migrer
- `doctorSmile.html` → `/`
- `index.html` → Redirection vers `/`

### 6.2 Logique à convertir
- `landing-interactions.js` → Animations/interactions
- SEO optimisation avec Next.js metadata

---

## 📅 Phase 7 : Tests et optimisation (Jour 14-15)

### 7.1 Tests
- Tests unitaires avec Jest
- Tests E2E avec Playwright
- Tests d'intégration API

### 7.2 Optimisation
- Performance audit (Lighthouse)
- Code splitting
- Image optimisation
- Bundle size analysis

---

## 📅 Phase 8 : Déploiement (Jour 16)

### 8.1 Frontend (Next.js)
- Déploiement sur Vercel
- Configuration des variables d'environnement
- Domaine personnalisé

### 8.2 Backend (FastAPI)
- Déploiement sur Railway/Render
- Configuration CORS production
- Monitoring et logging

---

## 🏗️ Structure finale

```
doctor-smile/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities, Firebase
│   │   ├── hooks/        # Custom hooks
│   │   └── styles/       # Global styles
│   ├── public/           # Static assets
│   └── package.json
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── services/     # Business logic
│   │   └── models/       # Data models
│   └── main.py
└── shared/               # Shared types, configs
    └── types.ts
```

---

## ⚠️ Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| Migration bloquante | Développement parallèle sur l'ancien code |
| Perte de fonctionnalités | Tests E2E complets avant chaque phase |
| Performance dégradée | Monitoring continu et optimisation |
| Courbe d'apprentissage | Documentation et pair programming |

---

## 📊 Métriques de succès

- **Performance** : Lighthouse score > 90
- **Couverture de tests** : > 80%
- **Bundle size** : < 500KB initial
- **TTI** : < 3s sur 3G
- **SEO** : 100/100 sur Lighthouse SEO
