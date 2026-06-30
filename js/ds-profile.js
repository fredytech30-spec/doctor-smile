// ════════════════════════════════════════════════════════════════
//  ds-profile.js — Doctor Smile
//  Drawer profil : photo, prénom/nom, déconnexion
//  Dépend de : ds-core.js, firebase-config.js, firebase-auth.js
// ════════════════════════════════════════════════════════════════

window.DS_PROFILE = {

  // ── Ouvrir le drawer ─────────────────────────────────────────
  openDrawer() {
    this._populate();
    document.getElementById('profile-drawer')?.classList.add('open');
    document.getElementById('profile-drawer-overlay')?.classList.add('open');
  },

  // ── Fermer le drawer ─────────────────────────────────────────
  closeDrawer() {
    document.getElementById('profile-drawer')?.classList.remove('open');
    document.getElementById('profile-drawer-overlay')?.classList.remove('open');
  },

  // ── Remplir le drawer avec les données actuelles ─────────────
  _populate() {
    const prenom = S.profile?.prenom || S.user?.displayName?.split(' ')[0] || '';
    const nom    = S.profile?.nom    || S.user?.displayName?.split(' ').slice(1).join(' ') || '';
    const email  = S.user?.email     || '—';
    const plan   = S.abonnement?.plan || S.profile?.plan || 'standard';

    const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    f('pd-prenom', prenom);
    f('pd-nom',    nom);
    f('pd-email',  email);

    // Nom affiché + email sous l'avatar
    const nameEl  = document.getElementById('pd-display-name');
    const emailEl = document.getElementById('pd-display-email');
    if (nameEl)  nameEl.textContent  = [prenom, nom].filter(Boolean).join(' ') || '—';
    if (emailEl) emailEl.textContent = email;

    // Badge plan
    const pb = document.getElementById('pd-drawer-plan-badge');
    if (pb) {
      const labels = { standard:'Standard', premium:'Premium', extra:'Extra' };
      pb.textContent = labels[plan] ?? plan;
      pb.className   = `badge ${plan}`;
    }

    // Photo existante
    const photoURL = S.profile?.photoURL || S.user?.photoURL || null;
    this._setAvatarPhoto(photoURL);

    // Mot de passe ou Google
    const pwRow = document.getElementById('pd-password-row');
    if (pwRow) {
      const isGoogle = S.user?.providerData?.[0]?.providerId === 'google.com';
      pwRow.innerHTML = isGoogle
        ? `<div style="font-size:10px;color:var(--muted);padding:4px 0;"><i class="fa-brands fa-google" style="color:#4285F4;margin-right:6px;"></i>Compte Google — mot de passe géré par Google</div>`
        : `<button class="pd-change-photo" onclick="DS_PROFILE?.sendResetEmail()" style="width:100%;text-align:center;">
             <i class="fa-solid fa-key" style="margin-right:6px;"></i>Envoyer un email de réinitialisation
           </button>`;
    }
  },

  // ── Mettre à jour l'avatar (nav + drawer) ────────────────────
  _setAvatarPhoto(url) {
    // Drawer
    const pdPhoto = document.getElementById('pd-avatar-photo');
    const pdText  = document.getElementById('pd-avatar-text');
    // Nav
    const navImg   = document.getElementById('nav-avatar-img');
    const navInit  = document.getElementById('nav-avatar-initials');
    const navAvatar= document.getElementById('nav-avatar');

    const initials = S.profile
      ? ([S.profile.prenom?.[0], S.profile.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?')
      : (S.user?.displayName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?');

    if (url) {
      // Drawer : photo visible, texte masqué
      if (pdPhoto) { pdPhoto.src = url; pdPhoto.style.display = 'block'; }
      if (pdText)  pdText.style.display = 'none';
      // Nav : photo visible, initiales masquées
      if (navImg) {
        navImg.src = url;
        navImg.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
      }
      if (navInit) navInit.style.display = 'none';
      // Enlever le gradient de fond quand une photo est présente
      if (navAvatar) navAvatar.style.background = 'transparent';
    } else {
      if (pdPhoto) pdPhoto.style.display = 'none';
      if (pdText)  { pdText.textContent = initials; pdText.style.display = 'block'; }
      if (navImg)  navImg.style.display = 'none';
      if (navInit) { navInit.textContent = initials; navInit.style.display = 'block'; }
      // Remettre le gradient (Design System)
      if (navAvatar) navAvatar.style.background = 'var(--gold-ice)';
    }
  },

  // ── Déclencher l'input file ───────────────────────────────────
  triggerPhotoUpload() {
    document.getElementById('pd-photo-input')?.click();
  },

  // ── Gérer l'upload de photo ───────────────────────────────────
  async handlePhotoUpload(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Photo trop lourde (max 5 Mo)', 'warn'); return; }
    if (!file.type.startsWith('image/')) { showToast('Format non supporté', 'err'); return; }

    const statusEl = document.getElementById('pd-upload-status');
    if (statusEl) statusEl.innerHTML = `<div class="pd-uploading"><i class="fa-solid fa-circle-notch fa-spin"></i>Envoi en cours…</div>`;

    try {
      // Compression côté client avant envoi
      const compressed = await this._compressImage(file, 400, 0.82);

      // Essayer Firebase Storage (si disponible)
      let photoURL = null;
      try {
        photoURL = await this._uploadToFirebaseStorage(compressed);
      } catch (storageErr) {
        console.warn('[Profile] Firebase Storage indisponible, utilisation base64 locale', storageErr);
        // Fallback : stocker en base64 dans Firestore (max ~200ko après compression)
        photoURL = await this._toBase64(compressed);
      }

      // Mettre à jour le profil Firestore
      await this._savePhotoURL(photoURL);

      // Mettre à jour l'UI immédiatement
      if (S.profile) S.profile.photoURL = photoURL;
      this._setAvatarPhoto(photoURL);

      if (statusEl) statusEl.innerHTML = '';
      showToast('Photo mise à jour', 'ok');

    } catch (err) {
      console.error('[Profile] Upload photo erreur:', err);
      if (statusEl) statusEl.innerHTML = '';
      showToast('Erreur upload photo', 'err');
    }
  },

  // ── Compression image ─────────────────────────────────────────
  _compressImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width: w, height: h } = img;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else       { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  },

  // ── Upload vers Firebase Storage ─────────────────────────────
  async _uploadToFirebaseStorage(blob) {
    const { storage } = await import('./firebase-config.js');
    if (!storage) throw new Error('Storage non configuré');
    const { ref, uploadBytes, getDownloadURL } = await import(
      'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js'
    );
    const uid      = S.user.uid;
    const fileRef  = ref(storage, `avatars/${uid}/profile.jpg`);
    await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(fileRef);
  },

  // ── Fallback base64 ───────────────────────────────────────────
  _toBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Base64 failed'));
      reader.readAsDataURL(blob);
    });
  },

  // ── Sauvegarder photoURL dans Firestore ───────────────────────
  async _savePhotoURL(photoURL) {
    try {
      const { db }       = await import('./firebase-config.js');
      const { doc, setDoc, updateDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      const uid = S.user.uid;
      await updateDoc(doc(db, 'users', uid), { photoURL });
    } catch {
      // Si le doc n'existe pas encore
      try {
        const { db }     = await import('./firebase-config.js');
        const { doc, setDoc } = await import(
          'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
        );
        await setDoc(doc(db, 'users', S.user.uid), { photoURL }, { merge: true });
      } catch (err) {
        console.error('[Profile] Impossible de sauvegarder photoURL:', err);
      }
    }
    // Aussi mettre à jour le profil Firebase Auth
    try {
      const { auth } = await import('./firebase-config.js');
      const { updateProfile } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
      );
      await updateProfile(auth.currentUser, { photoURL });
    } catch {}
  },

  // ── Sauvegarder prénom / nom ──────────────────────────────────
  async saveProfile() {
    const prenom = document.getElementById('pd-prenom')?.value.trim();
    const nom    = document.getElementById('pd-nom')?.value.trim();
    if (!S.user) return;

    // Mise à jour optimiste
    if (S.profile) { if (prenom) S.profile.prenom = prenom; if (nom) S.profile.nom = nom; }

    // Mettre à jour les initiales si pas de photo
    const hasPhoto = !!(S.profile?.photoURL || S.user?.photoURL);
    if (!hasPhoto) this._setAvatarPhoto(null);

    // Mise à jour displayName Firebase Auth
    try {
      const { auth } = await import('./firebase-config.js');
      const { updateProfile } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
      );
      const fullName = [prenom, nom].filter(Boolean).join(' ');
      if (fullName) await updateProfile(auth.currentUser, { displayName: fullName });
    } catch {}

    // Persistance Firestore
    try {
      const { db } = await import('./firebase-config.js');
      const { doc, updateDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
      );
      await updateDoc(doc(db, 'users', S.user.uid), { prenom, nom });
      showToast('Profil mis à jour', 'ok');
    } catch {
      // Essayer setDoc merge
      try {
        const { db } = await import('./firebase-config.js');
        const { doc, setDoc } = await import(
          'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
        );
        await setDoc(doc(db, 'users', S.user.uid), { prenom, nom }, { merge: true });
        showToast('Profil mis à jour', 'ok');
      } catch {
        showToast('Profil mis à jour localement', 'ok');
      }
    }

    // Mettre à jour l'UI dashboard
    if (window.DS_DASH?.updateUserUI) window.DS_DASH.updateUserUI();
    else if (typeof updateUserUI === 'function') updateUserUI();
  },

  // ── Réinitialisation mot de passe via Brevo ──────────────────
  async sendResetEmail() {
    try {
      const API_BASE = window.API_BASE || ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
        ? 'http://127.0.0.1:8000'
        : 'https://votre-api-render.onrender.com');
      const response = await fetch(`${API_BASE}/reset-password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: S.user.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur d\'envoi');
      showToast(`Email envoyé à ${S.user.email}`, 'ok');
    } catch (err) {
      console.error('[sendResetEmail]', err);
      showToast("Erreur d'envoi email", 'err');
    }
  },

  // ── Déconnexion ───────────────────────────────────────────────
  async logout() {
    // Confirmation visuelle rapide
    const confirmed = await this._confirmLogout();
    if (!confirmed) return;

    try {
      // Désabonner les listeners Firestore
      S._unsubProfile?.();
      S._unsubAnalyses?.();
      S._unsubAbonnement?.();
      window.DS_NOTIFS?._state?._unsub?.();

      // Déconnexion Firebase
      const { auth } = await import('./firebase-config.js');
      const { signOut } = await import(
        'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
      );
      await signOut(auth);

      // Nettoyer session et rediriger
      sessionStorage.clear();
      localStorage.removeItem('ds_user');
      showToast('Déconnecté', 'ok');
      setTimeout(() => { window.location.href = 'auth.html'; }, 600);

    } catch (err) {
      console.error('[Profile] Erreur déconnexion:', err);
      // Forcer la redirection même en cas d'erreur
      sessionStorage.clear();
      window.location.href = 'auth.html';
    }
  },

  // ── Dialog de confirmation logout ────────────────────────────
  _confirmLogout() {
    if (window.Modal) {
      return window.Modal.confirm('Se déconnecter ?', 'Vous serez redirigé vers la page de connexion.', {
        confirmLabel: 'Déconnecter',
        size: 'small'
      });
    }
    
    // Fallback original si Modal n'est pas chargé
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:var(--overlay-bg);backdrop-filter:blur(12px);';
      overlay.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--error-border);border-radius:16px;
          padding:28px;max-width:340px;width:90%;animation:mIn .22s cubic-bezier(.16,1,.3,1);">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:40px;height:40px;border-radius:10px;background:var(--error-bg);
              color:var(--error);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
              <i class="fa-solid fa-right-from-bracket"></i></div>
            <div>
              <div style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;color:var(--text);margin-bottom:2px;">Se déconnecter ?</div>
              <div style="font-size:10px;color:var(--text-hint);">Vous serez redirigé vers la page de connexion.</div>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <button id="_logout_cancel" style="flex:1;padding:9px;border-radius:9px;background:var(--surface-2);
              border:1px solid var(--border);color:var(--text-2);font-family:Syne,sans-serif;
              font-size:10px;font-weight:700;cursor:pointer;">Annuler</button>
            <button id="_logout_confirm" style="flex:1;padding:9px;border-radius:9px;background:var(--error-bg);
              border:1px solid var(--error-border);color:var(--error);font-family:Syne,sans-serif;
              font-size:10px;font-weight:800;cursor:pointer;letter-spacing:.04em;">Déconnecter</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.getElementById('_logout_cancel') .addEventListener('click', () => { overlay.remove(); resolve(false); });
      document.getElementById('_logout_confirm').addEventListener('click', () => { overlay.remove(); resolve(true);  });
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  },

  // ── Init : charger photo depuis profil au démarrage ──────────
  initFromProfile() {
    const photoURL = S.profile?.photoURL || S.user?.photoURL || null;
    this._setAvatarPhoto(photoURL);
  },

  // ── Supprimer la photo de profil ──────────────────────────
  async removePhoto() {
    try {
      await this._savePhotoURL(null);
      if (S.profile) S.profile.photoURL = null;
      this._setAvatarPhoto(null);
      showToast('Photo supprimée', 'ok');
      // Rafraîchir la vue paramètres si ouverte
      if (document.getElementById('param-avatar-wrap')) {
        window.DS_VIEWS?.renderParametres?.();
      }
    } catch (err) {
      console.error('[Profile] removePhoto erreur:', err);
      showToast('Erreur suppression photo', 'err');
    }
  },
};

// Exposer DS_LOGOUT pour compatibilité avec les anciens onclick
window.DS_LOGOUT = () => window.DS_PROFILE?.logout();

console.log('[ds-profile] ✓ Chargé');
