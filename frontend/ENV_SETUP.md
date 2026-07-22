# Configuration des Variables d'Environnement Frontend

Créez un fichier `.env.local` dans le dossier `frontend/` avec les variables suivantes:

```env
# Firebase Configuration (existant dans .env principal)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBkZ7v6a8b9c0d1e2f3g4h5i6j7k8l9m0n
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=doctorsmile.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=doctorsmile
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=doctorsmile.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=75568990441
NEXT_PUBLIC_FIREBASE_APP_ID=1:75568990441:web:f9c3ffa689a4ff5b080878

# Brevo (Sendinblue) Configuration (existant dans .env principal)
NEXT_PUBLIC_BREVO_API_KEY=xkeysib-93ed9deec9acdfc8c663762a1a85e9e676f6c2d5edc81b61ce837cf2d83d0519-bgraj5FoUYYNwnN
NEXT_PUBLIC_BREVO_SENDER_EMAIL=fredymael70@gmail.com
NEXT_PUBLIC_BREVO_SENDER_NAME=Doctor Smile
NEXT_PUBLIC_BREVO_REPLY_TO=contact@doctorsmile.io

# FastAPI Backend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Instructions

1. Copiez les variables depuis le fichier `.env` principal vers `frontend/.env.local`
2. Ajoutez le préfixe `NEXT_PUBLIC_` aux variables qui doivent être accessibles côté client
3. Redémarrez le serveur de développement après avoir ajouté les variables

## Notes de Sécurité

- **NE JAMAIS** commiter le fichier `.env.local` dans Git
- Le fichier `.env.local` est déjà dans `.gitignore`
- Les variables avec `NEXT_PUBLIC_` sont accessibles côté client (navigateur)
- Les variables sans `NEXT_PUBLIC_` ne sont accessibles que côté serveur (API routes)
