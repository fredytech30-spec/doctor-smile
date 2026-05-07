// ════════════════════════════════════════════════════════════════
//  auth-ui.js
//  Logique UI complète de auth.html — Doctor Smile
//  Branche tous les formulaires sur Firebase Auth
//  Import dans auth.html via <script type="module">
// ════════════════════════════════════════════════════════════════

import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  resendVerificationEmail,
  onAuthChange
} from "./firebase-auth.js";

import { redirectIfLoggedIn } from "./auth-guard.js";

// ════════════════════════════════════════════════════════════════
//  INIT — au chargement de la page
// ════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Si déjà connecté → rediriger vers dashboard
  redirectIfLoggedIn();

  // Vérifier si on revient d'un Google login incomplet
  const params = new URLSearchParams(window.location.search);
  if (params.get("complete") === "true") {
    switchTab("register");
    showStep2();
  }
});

// ════════════════════════════════════════════════════════════════
//  ÉTAT GLOBAL
// ════════════════════════════════════════════════════════════════
let currentTab      = "login";
let selectedRole    = "analyst";
let selectedPlan    = "standard";
let selectedSource  = "";

// ════════════════════════════════════════════════════════════════
//  TAB SWITCHER
// ════════════════════════════════════════════════════════════════
window.switchTab = function(tab) {
  if (currentTab === tab) return;
  currentTab = tab;

  const loginForm    = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const tabLogin     = document.getElementById("tab-login");
  const tabRegister  = document.getElementById("tab-register");

  tabLogin.classList.toggle("active",    tab === "login");
  tabRegister.classList.toggle("active", tab === "register");

  if (tab === "login") {
    registerForm.style.display = "none";
    loginForm.style.display    = "block";
    animateIn(loginForm, "left");
  } else {
    loginForm.style.display    = "none";
    registerForm.style.display = "block";
    animateIn(registerForm, "right");
  }

  document.getElementById("panel-right").scrollTop = 0;
};

// ════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════
window.handleLogin = async function() {
  const email = val("le").trim();
  const pw    = val("lp");
  let ok = true;

  if (!isValidEmail(email)) { showErr("le-wrap", "le-msg", "✗ E-mail invalide"); ok = false; }
  if (pw.length < 6)        { showErr("lp-wrap", "lp-msg", "✗ Mot de passe requis"); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("login-btn");
  setLoading(btn, true);

  const result = await loginUser(email, pw);

  if (result.success) {
    // Vérifier si l'email est confirmé
    if (!result.user.emailVerified) {
      setLoading(btn, false);
      showToast("⚠️ Confirmez votre e-mail avant de continuer.", "warn");
      showOtp("login");
      return;
    }
    // Succès → redirection
    showSuccess("login");
    setTimeout(() => window.location.href = "/dashboard.html", 2200);
  } else {
    setLoading(btn, false);
    showFormError("login-form", result.error);
  }
};

// ════════════════════════════════════════════════════════════════
//  GOOGLE LOGIN
// ════════════════════════════════════════════════════════════════
window.oauthLogin = async function(provider) {
  if (provider !== "Google") {
    showToast("LinkedIn disponible prochainement.", "info");
    return;
  }

  const result = await loginWithGoogle();

  if (result.cancelled) return;

  if (result.success) {
    if (result.isNew) {
      // Nouveau compte → compléter le profil entreprise
      switchTab("register");
      showStep2();
      showToast("Compte Google créé ! Complétez votre profil entreprise.", "ok");
    } else {
      showSuccess("login");
      setTimeout(() => window.location.href = "/dashboard.html", 2200);
    }
  } else if (result.error) {
    showFormError("login-form", result.error);
  }
};

// ════════════════════════════════════════════════════════════════
//  REGISTER — ÉTAPE 1 → ÉTAPE 2
// ════════════════════════════════════════════════════════════════
window.goStep2 = function() {
  const prenom = val("rfn").trim();
  const nom    = val("rln").trim();
  const email  = val("re").trim();
  const pw     = val("rp");
  const cpc    = val("rpc");
  const cgu    = document.getElementById("cgu").checked;
  let ok = true;

  if (prenom.length < 2) { showErr("rfn-wrap", "rfn-msg", "✗ Prénom requis"); ok = false; }
  if (nom.length < 2)    { showErr("rln-wrap", "rln-msg", "✗ Nom requis");    ok = false; }
  if (!isValidEmail(email)) { showErr("re-wrap", "re-msg", "✗ E-mail invalide"); ok = false; }
  if (pw.length < 8)     { showErr("rp-wrap", "rp-msg", "✗ Minimum 8 caractères"); ok = false; }
  if (pw.length >= 8 && cpc.length === 0) {
    showErr("rpc-wrap", "rpc-msg", "✗ Confirmez votre mot de passe"); ok = false;
  }
  if (pw.length >= 8 && cpc.length > 0 && cpc !== pw) {
    showErr("rpc-wrap", "rpc-msg", "✗ Les mots de passe ne correspondent pas"); ok = false;
  }
  if (!cgu) {
    // Flash rouge sur le label CGU
    const lbl = document.querySelector(".cgu-lbl");
    if (lbl) { lbl.style.color = "var(--ruby)"; setTimeout(() => lbl.style.color = "", 1500); }
    shake(document.querySelector(".cgu-wrap .chk-box"));
    ok = false;
  }
  if (!ok) return;

  showStep2();
};

function showStep2() {
  const s1 = document.getElementById("reg-step1");
  const s2 = document.getElementById("reg-step2");
  if (!s1 || !s2) return;

  s1.style.transition = "opacity .3s ease, transform .3s ease";
  s1.style.opacity    = "0";
  s1.style.transform  = "translateX(-16px)";

  setTimeout(() => {
    s1.style.display = "none";
    s2.style.display = "block";
    animateIn(s2, "right");

    // Mettre à jour le step indicator
    const dot1  = document.getElementById("step-dot-1");
    const dot2  = document.getElementById("step-dot-2");
    const line1 = document.getElementById("step-line-1");
    if (dot1) {
      dot1.classList.remove("active");
      dot1.classList.add("done");
      const span = dot1.querySelector("span");
      if (span) span.innerHTML = '<i class="fa-solid fa-check" style="font-size:9px;"></i>';
    }
    if (line1) line1.classList.add("done");
    if (dot2)  dot2.classList.add("active");

    document.getElementById("panel-right").scrollTop = 0;
  }, 300);
}

window.goStep1 = function() {
  const s1 = document.getElementById("reg-step1");
  const s2 = document.getElementById("reg-step2");

  s2.style.transition = "opacity .3s ease, transform .3s ease";
  s2.style.opacity    = "0";
  s2.style.transform  = "translateX(16px)";

  setTimeout(() => {
    s2.style.display = "none";
    s1.style.display = "block";
    animateIn(s1, "left");

    const dot1  = document.getElementById("step-dot-1");
    const dot2  = document.getElementById("step-dot-2");
    const line1 = document.getElementById("step-line-1");
    if (dot1) {
      dot1.classList.add("active");
      dot1.classList.remove("done");
      const span = dot1.querySelector("span");
      if (span) span.textContent = "1";
    }
    if (line1) line1.classList.remove("done");
    if (dot2)  dot2.classList.remove("active");

    document.getElementById("panel-right").scrollTop = 0;
  }, 300);
};

// ════════════════════════════════════════════════════════════════
//  REGISTER — SOUMISSION FINALE (étape 2)
// ════════════════════════════════════════════════════════════════
window.handleRegister = async function() {
  const company  = val("rc").trim();
  const secteur  = val("rsect");
  const taille   = val("rsize");
  const pays     = val("rpays");
  let ok = true;

  if (company.length < 2) { showErr("rc-wrap", "rc-msg", "✗ Nom requis"); ok = false; }
  if (!secteur) { shake(document.getElementById("rsect-wrap")); ok = false; }
  if (!taille)  { shake(document.getElementById("rsize-wrap")); ok = false; }
  if (!pays)    { shake(document.getElementById("rpays-wrap")); ok = false; }
  if (!ok) return;

  const btn = document.getElementById("reg-btn");
  setLoading(btn, true);

  // Construire l'objet userData complet
  const userData = {
    prenom:   val("rfn").trim(),
    nom:      val("rln").trim(),
    email:    val("re").trim(),
    password: val("rp"),
    role:     selectedRole,
    plan:     selectedPlan,
    source:   selectedSource,
    poste:    val("rposte") || "",
    entreprise: {
      nom:     company,
      secteur: secteur,
      taille:  taille,
      pays:    pays,
      siret:   val("rsiret").replace(/\s/g, "") || null
    }
  };

  const result = await registerUser(userData);

  if (result.success) {
    setLoading(btn, false);
    showOtp("register");
  } else {
    setLoading(btn, false);
    showFormError("register-form", result.error);
  }
};

// ════════════════════════════════════════════════════════════════
//  ROLE SELECTOR
// ════════════════════════════════════════════════════════════════
window.selectRole = function(role) {
  selectedRole = role;
  ["analyst", "manager", "expert"].forEach(id => {
    const el = document.getElementById("role-" + id);
    if (el) el.classList.toggle("selected", id === role);
  });
};

// ════════════════════════════════════════════════════════════════
//  PLAN SELECTOR
// ════════════════════════════════════════════════════════════════
window.selectPlan = function(plan) {
  selectedPlan = plan;
  ["standard", "premium", "extra"].forEach(id => {
    const el = document.getElementById("plan-" + id);
    if (el) el.classList.toggle("selected", id === plan);
  });
};

// ════════════════════════════════════════════════════════════════
//  SOURCE SELECTOR
// ════════════════════════════════════════════════════════════════
window.selectSrc = function(el, src) {
  selectedSource = src;
  document.querySelectorAll(".src-btn").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
};

// ════════════════════════════════════════════════════════════════
//  OTP — Vérification email
//  Note: Firebase envoie un lien email, pas un OTP numérique
//  Ici on simule l'UX OTP — en production utilise
//  l'email de vérification Firebase
// ════════════════════════════════════════════════════════════════
let otpMode = "login";

window.showOtp = function(mode) {
  otpMode = mode;
  const loginForm    = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const tabsWrap     = document.getElementById("tabs-wrap");
  const otpPanel     = document.getElementById("otp-panel");

  if (loginForm)    loginForm.style.display    = "none";
  if (registerForm) registerForm.style.display = "none";
  if (tabsWrap)     { tabsWrap.style.opacity = "0"; tabsWrap.style.pointerEvents = "none"; }

  if (otpPanel) {
    otpPanel.style.display = "flex";
    requestAnimationFrame(() => otpPanel.classList.add("show"));
    setTimeout(() => {
      const first = document.querySelectorAll(".otp-d")[0];
      if (first) first.focus();
    }, 300);
  }
};

window.otpNext = function(inp, idx) {
  inp.value = inp.value.replace(/[^0-9]/g, "");
  if (inp.value.length === 1 && idx < 6) {
    const next = document.querySelectorAll(".otp-d")[idx];
    if (next) next.focus();
  }
  const allFilled = [...document.querySelectorAll(".otp-d")].every(d => d.value.length === 1);
  if (allFilled) setTimeout(verifyOtp, 280);
};

window.otpBack = function(e, inp) {
  if (e.key === "Backspace" && inp.value === "") {
    const prev = inp.previousElementSibling;
    if (prev && prev.classList.contains("otp-d")) { prev.focus(); prev.value = ""; }
  }
};

window.resendOtp = async function(e) {
  e.preventDefault();
  document.querySelectorAll(".otp-d").forEach(d => d.value = "");
  document.querySelectorAll(".otp-d")[0]?.focus();
  // Renvoyer l'email de vérification Firebase
  const result = await resendVerificationEmail();
  if (result.success) {
    showToast("E-mail de vérification renvoyé !", "ok");
  }
};

async function verifyOtp() {
  const code = [...document.querySelectorAll(".otp-d")].map(d => d.value).join("");
  if (code.length < 6) {
    document.querySelectorAll(".otp-d").forEach(d => shake(d));
    return;
  }
  // En production Firebase : l'email de vérification envoie un lien,
  // pas un code OTP → ici on simule pour l'UX
  // Pour un vrai OTP, utiliser Firebase Phone Auth ou un service tiers
  const otpPanel = document.getElementById("otp-panel");
  if (otpPanel) otpPanel.style.opacity = "0";
  setTimeout(showSuccessPanel, 450);
}

// ════════════════════════════════════════════════════════════════
//  SUCCESS PANEL + REDIRECTION
// ════════════════════════════════════════════════════════════════
window.showSuccess = function(mode) {
  otpMode = mode;
  showSuccessPanel();
};

function showSuccessPanel() {
  const otpPanel     = document.getElementById("otp-panel");
  const successPanel = document.getElementById("success-panel");
  const sucMsg       = document.getElementById("suc-msg");
  const sucSub       = document.getElementById("suc-sub");

  if (otpPanel)  otpPanel.style.display     = "none";
  if (successPanel) successPanel.style.display = "flex";

  if (sucMsg) sucMsg.textContent = otpMode === "register" ? "Compte créé ! 🎉" : "Connexion réussie !";
  if (sucSub) sucSub.textContent = otpMode === "register"
    ? "Bienvenue chez Doctor Smile. Vérifiez votre e-mail."
    : "Redirection vers votre tableau de bord…";

  setTimeout(() => {
    const flash = document.getElementById("flash");
    if (flash) flash.style.opacity = "1";
    setTimeout(() => window.location.href = "/dashboard.html", 700);
  }, 2600);
}

// ════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════
window.showForgot = function(e) {
  e.preventDefault();
  const card = document.getElementById("login-form");
  card.style.transition = "opacity .3s ease, transform .3s ease";
  card.style.opacity    = "0";
  card.style.transform  = "translateX(-16px)";

  setTimeout(() => {
    card.innerHTML = `
      <div class="form-title">
        <i class="fa-solid fa-key" style="color:var(--gold);font-size:.8em;margin-right:8px;"></i>
        Réinitialiser
      </div>
      <div class="form-sub">
        Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
      </div>
      <div class="inp-group">
        <label class="inp-label">Adresse e-mail</label>
        <div class="inp-wrap" id="forgot-wrap">
          <i class="fa-solid fa-envelope inp-icon"></i>
          <input type="email" class="inp-field" id="forgot-email"
            placeholder="vous@entreprise.com" autocomplete="email">
        </div>
        <div class="inp-msg" id="forgot-msg"></div>
      </div>
      <button class="submit-btn" onclick="sendReset(this)">
        <i class="fa-solid fa-paper-plane"></i>
        <span>Envoyer le lien</span>
        <div class="btn-spin"></div>
      </button>
      <div class="form-link">
        <a href="#" onclick="location.reload()">
          <i class="fa-solid fa-arrow-left" style="margin-right:4px;"></i>
          Retour à la connexion
        </a>
      </div>
    `;
    animateIn(card, "right");
  }, 300);
};

window.sendReset = async function(btn) {
  const email = val("forgot-email")?.trim();
  if (!email || !isValidEmail(email)) {
    showErr("forgot-wrap", "forgot-msg", "✗ E-mail invalide");
    return;
  }

  setLoading(btn, true);
  const result = await resetPassword(email);
  setLoading(btn, false);

  if (result.success) {
    btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--emerald);font-size:15px;"></i><span>Lien envoyé !</span>';
    btn.style.background  = "linear-gradient(135deg,#10b981,#059669)";
    btn.style.animation   = "none";
    btn.style.pointerEvents = "none";
  } else {
    showErr("forgot-wrap", "forgot-msg", "✗ " + result.error);
  }
};

// ════════════════════════════════════════════════════════════════
//  VALIDATION EN TEMPS RÉEL
// ════════════════════════════════════════════════════════════════
window.valEmail = function(id, wid, mid) {
  const v  = val(id);
  const ok = isValidEmail(v);
  setWrap(wid, v ? ok : null);
  setMsg(mid, v ? (ok ? "✓ Adresse valide" : "✗ Format invalide") : "", v ? ok : null);
};

window.valPw = function(id, wid, mid) {
  const v  = val(id);
  const ok = v.length >= 8;
  setWrap(wid, v ? ok : null);
  setMsg(mid, v ? (ok ? "✓ Mot de passe valide" : "✗ Minimum 8 caractères") : "", v ? ok : null);
};

window.valName = function(id, wid, mid) {
  const v  = val(id).trim();
  const ok = v.length >= 2;
  setWrap(wid, v ? ok : null);
  setMsg(mid, v ? (ok ? "✓" : "✗ Trop court") : "", v ? ok : null);
};

window.valConfirm = function() {
  const pw  = val("rp");
  const cpc = val("rpc");
  if (cpc.length === 0) { setWrap("rpc-wrap", null); setMsg("rpc-msg", "", null); return; }
  const ok = cpc === pw && cpc.length >= 8;
  setWrap("rpc-wrap", ok);
  setMsg("rpc-msg", ok ? "✓ Mots de passe identiques" : "✗ Ne correspond pas", ok);
};

window.valRequired = function(id, wid, mid) {
  const v  = val(id).trim();
  const ok = v.length >= 2;
  setWrap(wid, v ? ok : null);
  setMsg(mid, v ? (ok ? "✓ Valide" : "✗ Requis") : "", v ? ok : null);
};

window.valSelect = function(id, wid, mid) {
  const v  = val(id);
  setWrap(wid, v ? true : null);
  if (mid) setMsg(mid, v ? "✓" : "", v ? true : null);
};

window.valSiret = function() {
  const raw = val("rsiret").replace(/\s/g, "");
  if (raw.length === 0) { setWrap("rsiret-wrap", null); setMsg("rsiret-msg", "", null); return; }
  const ok = /^\d{14}$/.test(raw);
  setWrap("rsiret-wrap", ok);
  setMsg("rsiret-msg", ok ? "✓ SIRET valide" : "✗ 14 chiffres requis", ok);
  // Auto-format
  if (ok) {
    document.getElementById("rsiret").value =
      raw.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4");
  }
};

// Barre de force mot de passe
window.checkStr = function() {
  const v    = val("rp");
  const segs = ["ss1", "ss2", "ss3", "ss4"].map(id => document.getElementById(id));
  segs.forEach(s => { if (s) s.className = "sseg"; });
  let sc = 0;
  if (v.length >= 8)          sc++;
  if (/[A-Z]/.test(v))        sc++;
  if (/[0-9]/.test(v))        sc++;
  if (/[^A-Za-z0-9]/.test(v)) sc++;
  for (let i = 0; i < sc; i++) if (segs[i]) segs[i].classList.add("s" + sc);
  const labels = ["", "Faible", "Moyen", "Fort", "Très fort"];
  const colors = ["var(--muted)", "var(--ruby)", "var(--amber)", "var(--ice)", "var(--emerald)"];
  const txt = document.getElementById("str-txt");
  if (txt) {
    txt.textContent = v.length === 0 ? "Force du mot de passe" : (labels[sc] || "Trop court");
    txt.style.color = v.length === 0 ? "var(--muted)" : colors[sc];
  }
};

// Toggle password visibility
window.togPw = function(id, btn) {
  const inp   = document.getElementById(id);
  if (!inp) return;
  const isText = inp.type === "text";
  inp.type     = isText ? "password" : "text";
  const icon   = btn?.querySelector("i");
  if (icon) icon.className = isText ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
};

// ════════════════════════════════════════════════════════════════
//  HELPERS INTERNES
// ════════════════════════════════════════════════════════════════
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setWrap(wid, ok) {
  const el = document.getElementById(wid);
  if (!el) return;
  el.className = "inp-wrap" + (ok === true ? " valid" : ok === false ? " invalid" : "");
}

function setMsg(mid, text, ok) {
  const el = document.getElementById(mid);
  if (!el) return;
  el.className  = "inp-msg" + (ok === true ? " ok" : ok === false ? " err" : "");
  el.textContent = text;
}

function showErr(wid, mid, msg) {
  setWrap(wid, false);
  setMsg(mid, msg, false);
  shake(document.getElementById(wid));
}

function showFormError(formId, msg) {
  if (!msg) return;
  const form = document.getElementById(formId);
  if (!form) return;
  let errEl = form.querySelector(".form-error-global");
  if (!errEl) {
    errEl = document.createElement("div");
    errEl.className = "form-error-global";
    errEl.style.cssText = `
      margin-bottom: 12px; padding: 10px 14px; border-radius: 8px;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
      font-size: 12px; color: var(--ruby); text-align: center;
    `;
    form.insertBefore(errEl, form.firstChild);
  }
  errEl.textContent = msg;
  shake(errEl);
  setTimeout(() => errEl.remove(), 5000);
}

function showToast(msg, type = "ok") {
  const colors = {
    ok:   { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#10b981" },
    warn: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#f59e0b" },
    err:  { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  text: "#ef4444" },
    info: { bg: "rgba(125,211,252,0.1)",border: "rgba(125,211,252,0.25)",text: "#7DD3FC" }
  };
  const c = colors[type] || colors.info;
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 10000; padding: 12px 24px; border-radius: 10px;
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
    backdrop-filter: blur(16px); white-space: nowrap;
    animation: toastIn .3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  if (!document.getElementById("toast-style")) {
    const s = document.createElement("style");
    s.id = "toast-style";
    s.textContent = "@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
    document.head.appendChild(s);
  }
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity .3s"; setTimeout(() => toast.remove(), 300); }, 3500);
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
}

function animateIn(el, dir = "right") {
  el.style.opacity   = "0";
  el.style.transform = dir === "right" ? "translateX(12px)" : "translateX(-12px)";
  requestAnimationFrame(() => {
    el.style.transition = "opacity .3s ease, transform .3s ease";
    el.style.opacity    = "1";
    el.style.transform  = "none";
  });
}

// shake est déjà défini dans auth.html — on le réexporte window pour compatibilité
window.shake = window.shake || function(el) {
  if (!el) return;
  el.style.animation = "none";
  el.offsetHeight;
  el.style.animation = "shk .45s ease";
};
