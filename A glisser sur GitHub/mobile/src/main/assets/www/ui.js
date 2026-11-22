/* AMEDIS pro Asso 2.0 — habillage : icônes dessinées, animations, confettis, mode sombre, visite guidée, palette */
'use strict';
(function (root) {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sobre = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ icônes (traits 24 × 24)
  const T = {
    tableau: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    homme: '<circle cx="10" cy="14" r="5.5"/><path d="M14 10l6-6M15 4h5v5"/>',
    femme: '<circle cx="12" cy="9" r="5.5"/><path d="M12 14.5V22M8.5 18.5h7"/>',
    membres: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.8 5 4.6"/>',
    reunions: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M13 14h3M8 17.5h3"/>',
    cotisations: '<ellipse cx="9" cy="7" rx="6" ry="2.6"/><path d="M3 7v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7"/><path d="M3 11v4c0 1.4 2.7 2.6 6 2.6 1 0 2-.1 2.8-.3"/><circle cx="17" cy="16" r="4.5"/><path d="M17 14v4M15.4 16h3.2"/>',
    depenses: '<rect x="2.5" y="6" width="19" height="13" rx="2.2"/><path d="M2.5 10h19M7 15h4"/><path d="M15 15.5l3-3M15.5 12.5H18v2.5"/>',
    dons: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    solidarite: '<path d="M2.5 13.5l3.5-3 4 1.5h3.2a1.6 1.6 0 0 1 0 3.2H10"/><path d="M13 14.7l5.4-2.9a1.6 1.6 0 0 1 1.7 2.7L13.8 19H7l-4.5-1.5"/><path d="M15.5 4.5v5M13 7h5"/>',
    caisses: '<rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="12" cy="12" r="3.6"/><path d="M12 8.4v1.2M12 14.4v1.2M15.6 12h-1.2M9.6 12H8.4M6 20v1.5M18 20v1.5"/>',
    bilan: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6.5a3 3 0 0 0 6 0L5 7zM19 7l-3 6.5a3 3 0 0 0 6 0L19 7z"/>',
    documents: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16h7"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    parametres: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    recherche: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
    lune: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cadenas: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
    bouclier: '<path d="M12 2.8l7.5 3v5.7c0 4.6-3.2 8.3-7.5 9.7-4.3-1.4-7.5-5.1-7.5-9.7V5.8z"/><path d="M8.7 12l2.3 2.3 4.4-4.6"/>',
    visite: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17h.01"/>',
    bulle: '<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M7 10h10M7 13.5h6"/>',
    enveloppe: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    recu: '<path d="M6 2.5h12v19l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z"/><path d="M9 7.5h6M9 11h6M9 14.5h3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8.2 19z"/><path d="M9 9.5c.3 2.4 2.2 4.6 4.9 5.3l1.2-1.2 1.6.8-.4 1.6c-3.6.4-7.6-3.4-7.3-7.1l1.6-.4.8 1.6z"/>',
    sauvegarde: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5"/><path d="M12 12v8M9 17l3 3 3-3"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    alerte: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7 5.3-5.6"/>',
    sortie: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>',
    utilisateur: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5"/>',
    clavier: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7 14h10"/>'
  };
  const icone = (n, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${T[n] || ''}</svg>`;

  // ------------------------------------------------------------ menu : icônes et pastille glissante
  const ICONES_NAV = { tableau: 'tableau', membres: 'membres', reunions: 'reunions', cotisations: 'cotisations', depenses: 'depenses', dons: 'dons', solidarite: 'solidarite', caisses: 'caisses', bilan: 'bilan', documents: 'documents', qr: 'qr', demarches: 'enveloppe', messagerie: 'bulle', parametres: 'parametres' };
  function iconesMenu(nav) {
    $$('a', nav).forEach(a => {
      const i = $('i', a); if (!i) return;
      const n = a.dataset.genre === 'H' ? 'homme' : a.dataset.genre === 'F' ? 'femme' : ICONES_NAV[a.dataset.vue];
      if (n) i.outerHTML = icone(n, 'ico-nav');
    });
    if (!$('.nav-pastille', nav)) { const p = document.createElement('span'); p.className = 'nav-pastille'; nav.prepend(p); }
  }
  function pastille(nav) {
    const p = $('.nav-pastille', nav), a = $('a.actif', nav);
    if (!p) return;
    if (!a || !a.offsetParent) { p.style.opacity = 0; return; }
    p.style.opacity = 1; p.style.transform = `translateY(${a.offsetTop}px)`; p.style.height = a.offsetHeight + 'px';
  }

  // ------------------------------------------------------------ apparitions
  function cascade(rootEl) {
    if (!rootEl || sobre()) return;
    const enfants = Array.from(rootEl.children).filter(e => !e.classList.contains('masque'));
    enfants.forEach((e, i) => { e.style.setProperty('--i', Math.min(i, 12)); e.classList.remove('apparait'); void e.offsetWidth; e.classList.add('apparait'); });
    $$('.tab tbody tr, table.tab > tr', rootEl).slice(0, 40).forEach((tr, i) => { tr.style.setProperty('--j', i); tr.classList.add('ligne-apparait'); });
  }
  function brillance(el) { if (!el || sobre()) return; el.classList.remove('brille'); void el.offsetWidth; el.classList.add('brille'); }

  /** Les nombres « [data-compte] » défilent de 0 jusqu'à leur valeur */
  function compter(rootEl, fmt) {
    const f = fmt || ((n) => Math.round(n).toLocaleString('fr-FR'));
    $$('[data-compte]', rootEl).forEach(el => {
      const cible = Number(el.dataset.compte) || 0;
      if (sobre() || !cible) { el.textContent = f(cible); return; }
      const t0 = performance.now(), d = 900 + Math.min(700, Math.log10(Math.abs(cible) + 1) * 120);
      const pas = (t) => { const x = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - x, 3); el.textContent = f(cible * e); if (x < 1) requestAnimationFrame(pas); };
      requestAnimationFrame(pas);
    });
  }
  /** Anneau de progression SVG (0 → 1) ; s'anime à l'affichage */
  function anneau(valeur, couleur, libelle, detail) {
    const r = 42, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, Number(valeur) || 0));
    return `<div class="anneau"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="fond-anneau"/>
      <circle cx="50" cy="50" r="${r}" class="arc" style="stroke:${couleur};stroke-dasharray:${c.toFixed(1)};--fin:${(c * (1 - v)).toFixed(1)};stroke-dashoffset:${c.toFixed(1)}"/></svg>
      <div class="anneau-val"><b data-compte="${Math.round(v * 100)}">0</b><small>%</small></div><div class="anneau-lib">${libelle}</div>${detail ? `<div class="anneau-det">${detail}</div>` : ''}</div>`;
  }
  function animerAnneaux(rootEl) {
    $$('.anneau .arc', rootEl).forEach((a, i) => { const fin = a.style.getPropertyValue('--fin'); if (sobre()) { a.style.strokeDashoffset = fin; return; } setTimeout(() => { a.style.strokeDashoffset = fin; }, 120 + i * 140); });
  }

  // ------------------------------------------------------------ onde au clic, relief des cartes
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .recent, .tuile, .palette-item');
    if (!b || sobre() || b.disabled) return;
    const r = b.getBoundingClientRect(), o = document.createElement('span'), t = Math.max(r.width, r.height) * 2;
    o.className = 'onde'; o.style.width = o.style.height = t + 'px'; o.style.left = (e.clientX - r.left - t / 2) + 'px'; o.style.top = (e.clientY - r.top - t / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = 'hidden'; b.appendChild(o); setTimeout(() => o.remove(), 650);
  });
  document.addEventListener('pointermove', (e) => {
    const k = e.target.closest && e.target.closest('.kpi, .tuile');
    $$('.kpi.incline, .tuile.incline').forEach(x => { if (x !== k) { x.classList.remove('incline'); x.style.transform = ''; } });
    if (!k || sobre()) return;
    const r = k.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    k.classList.add('incline'); k.style.transform = `perspective(700px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-3px)`;
    k.style.setProperty('--mx', ((x + .5) * 100).toFixed(0) + '%'); k.style.setProperty('--my', ((y + .5) * 100).toFixed(0) + '%');
  });

  function secouer(el) { if (!el || sobre()) return; el.classList.remove('secoue'); void el.offsetWidth; el.classList.add('secoue'); }

  // ------------------------------------------------------------ confettis
  function confettis(n) {
    if (sobre()) return;
    const cv = document.createElement('canvas'); cv.className = 'confettis'; document.body.appendChild(cv);
    const W = cv.width = innerWidth, H = cv.height = innerHeight, ctx = cv.getContext('2d');
    const coul = ['#0f6b45', '#f0b429', '#e8792b', '#2563a8', '#be185d', '#22c55e', '#ffffff'];
    const p = Array.from({ length: n || 160 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .35, w: 6 + Math.random() * 7, h: 4 + Math.random() * 5, c: coul[Math.floor(Math.random() * coul.length)] }));
    const t0 = performance.now();
    (function boucle(t) {
      ctx.clearRect(0, 0, W, H);
      p.forEach(q => { q.vy += .38; q.vx *= .99; q.x += q.vx; q.y += q.vy; q.r += q.vr; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); ctx.restore(); });
      if (t - t0 < 3200) requestAnimationFrame(boucle); else cv.remove();
    })(t0);
  }

  // ------------------------------------------------------------ mode sombre
  const lireLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ecrireLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
  function theme(t) { document.documentElement.dataset.theme = t === 'sombre' ? 'sombre' : 'clair'; ecrireLS('asso-theme', document.documentElement.dataset.theme); majBoutonsTheme(); }
  const themeActuel = () => document.documentElement.dataset.theme || 'clair';
  function basculerTheme() { theme(themeActuel() === 'sombre' ? 'clair' : 'sombre'); }
  function majBoutonsTheme() { $$('[data-bascule-theme]').forEach(b => { b.innerHTML = icone(themeActuel() === 'sombre' ? 'soleil' : 'lune'); b.title = themeActuel() === 'sombre' ? 'Mode clair' : 'Mode sombre'; }); }
  theme(lireLS('asso-theme') || 'clair');

  // ------------------------------------------------------------ visite guidée
  function visite(etapes, fin) {
    let i = 0;
    const voile = document.createElement('div'); voile.className = 'visite';
    voile.innerHTML = '<div class="visite-trou"></div><div class="visite-bulle"></div>';
    document.body.appendChild(voile);
    const trou = $('.visite-trou', voile), bulle = $('.visite-bulle', voile);
    function fermer(termine) { document.removeEventListener('keydown', clavier); voile.remove(); if (fin) fin(termine); }
    function montrer() {
      const e = etapes[i], cible = e.cible ? $(e.cible) : null;
      const r = cible && cible.offsetParent ? cible.getBoundingClientRect() : { left: innerWidth / 2 - 1, top: innerHeight / 2 - 1, width: 2, height: 2 };
      const m = cible ? 8 : 0;
      Object.assign(trou.style, { left: (r.left - m) + 'px', top: (r.top - m) + 'px', width: (r.width + 2 * m) + 'px', height: (r.height + 2 * m) + 'px' });
      bulle.innerHTML = `<div class="visite-num">Étape ${i + 1} sur ${etapes.length}</div><h4>${e.titre}</h4><p>${e.texte}</p>
        <div class="visite-pied"><button class="btn btn-lien-sombre" data-v="passer">Passer la visite</button><span style="flex:1"></span>
        ${i ? '<button class="btn" data-v="prec">Précédent</button>' : ''}<button class="btn btn-primaire" data-v="suiv">${i === etapes.length - 1 ? 'Terminer' : 'Suivant'}</button></div>`;
      const bw = 360, bh = bulle.offsetHeight || 190;
      let x = r.left + r.width + 22, y = r.top;
      if (x + bw > innerWidth - 12) x = Math.max(12, r.left - bw - 22);
      if (!cible || (x < 12)) { x = innerWidth / 2 - bw / 2; y = innerHeight / 2 - bh / 2; }
      if (cible && r.width > innerWidth * .5) { x = Math.min(innerWidth - bw - 12, Math.max(12, r.left + 20)); y = r.top + r.height + 18; if (y + bh > innerHeight - 12) y = Math.max(12, r.top - bh - 18); }
      y = Math.max(12, Math.min(y, innerHeight - bh - 12));
      Object.assign(bulle.style, { left: x + 'px', top: y + 'px' });
      bulle.classList.remove('entre'); void bulle.offsetWidth; bulle.classList.add('entre');
      $$('[data-v]', bulle).forEach(b => b.onclick = () => {
        if (b.dataset.v === 'passer') return fermer(false);
        if (b.dataset.v === 'prec') { i--; return montrer(); }
        if (i === etapes.length - 1) { fermer(true); confettis(120); return; }
        i++; montrer();
      });
    }
    function clavier(e) { if (e.key === 'Escape') fermer(false); if (e.key === 'ArrowRight' && i < etapes.length - 1) { i++; montrer(); } if (e.key === 'ArrowLeft' && i > 0) { i--; montrer(); } }
    document.addEventListener('keydown', clavier);
    montrer();
  }

  // ------------------------------------------------------------ vitrine (écrans de connexion et d'accueil)
  const ATOUTS = [
    ['cotisations', 'Cotisations et reçus', 'Grille par mois, reçus numérotés, relances WhatsApp en un clic.'],
    ['caisses', "Où est l'argent", 'Espèces, Wave, Orange Money, MTN, Moov, banque : chaque solde, au franc près.'],
    ['reunions', 'Vie associative', 'Réunions, appel, amendes automatiques, solidarité, cartes de membre.'],
    ['bilan', 'Transparence', "Bilan signé, budget prévu et réalisé, rapport d'assemblée générale."],
    ['qr', 'Espace des membres', 'Chaque membre consulte son dossier et ses reçus sur son téléphone.'],
    ['bouclier', 'Sécurité', 'Comptes protégés, verrouillage, journal infalsifiable, sauvegardes.']
  ];
  const ASTUCES = [
    'Le trésorier saisit, le Président et le SG consultent : chacun son compte, chacun ses droits.',
    'Ctrl + K ouvre la recherche : un membre, un reçu, un écran, une action.',
    "Chaque paiement encaissé donne un reçu numéroté, envoyé au membre par WhatsApp.",
    "Les membres scannent un code QR pour suivre leurs cotisations : plus de questions au trésorier.",
    "Le journal infalsifiable garde la trace de chaque opération, avec son auteur et l'heure.",
    "Une clé USB branchée ? Chaque modification y est copiée automatiquement."
  ];
  function scene() {
    return `<svg class="scene" viewBox="0 0 520 330" aria-hidden="true">
      <defs><linearGradient id="sc-or" x1="0" x2="1"><stop offset="0" stop-color="#ffd76a"/><stop offset="1" stop-color="#f0b429"/></linearGradient>
        <linearGradient id="sc-tel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8f3ee"/></linearGradient></defs>
      <ellipse cx="260" cy="305" rx="230" ry="16" fill="rgba(0,0,0,.18)"/>
      <!-- caisse et pièces -->
      <g class="sc-caisse"><rect x="40" y="190" width="150" height="105" rx="12" fill="#0b4f33" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
        <rect x="88" y="186" width="54" height="10" rx="5" fill="#062e1e"/><circle cx="115" cy="245" r="18" fill="none" stroke="#f0b429" stroke-width="3"/><path d="M115 233v24M107 240h12a5 5 0 0 1 0 10h-12" stroke="#f0b429" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
      <g class="sc-piece p1"><circle cx="115" cy="40" r="14" fill="url(#sc-or)"/><text x="115" y="45" text-anchor="middle" font-size="13" font-weight="800" fill="#8a5a00">F</text></g>
      <g class="sc-piece p2"><circle cx="115" cy="40" r="14" fill="url(#sc-or)"/><text x="115" y="45" text-anchor="middle" font-size="13" font-weight="800" fill="#8a5a00">F</text></g>
      <g class="sc-piece p3"><circle cx="115" cy="40" r="14" fill="url(#sc-or)"/><text x="115" y="45" text-anchor="middle" font-size="13" font-weight="800" fill="#8a5a00">F</text></g>
      <!-- reçu -->
      <g class="sc-recu"><rect x="205" y="70" width="96" height="128" rx="6" fill="#fff"/><path d="M205 192l8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8 6-6v-6H205z" fill="#fff"/>
        <rect x="217" y="84" width="50" height="7" rx="3" fill="#0f6b45"/><rect x="217" y="100" width="72" height="5" rx="2.5" fill="#cfd8d3"/><rect x="217" y="112" width="60" height="5" rx="2.5" fill="#cfd8d3"/>
        <rect x="217" y="124" width="66" height="5" rx="2.5" fill="#cfd8d3"/><rect x="217" y="146" width="40" height="9" rx="3" fill="#f0b429"/><path class="sc-coche" d="M266 160l8 8 15-17" stroke="#0f6b45" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <!-- graphique -->
      <g class="sc-graph"><rect x="205" y="222" width="130" height="78" rx="10" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)"/>
        <rect class="b b1" x="220" y="250" width="16" height="40" rx="3" fill="#7ee2b8"/><rect class="b b2" x="244" y="240" width="16" height="50" rx="3" fill="#f0b429"/>
        <rect class="b b3" x="268" y="232" width="16" height="58" rx="3" fill="#7ee2b8"/><rect class="b b4" x="292" y="244" width="16" height="46" rx="3" fill="#ffffff"/>
        <path class="sc-courbe" d="M222 262 L250 248 L276 238 L304 230 L322 236" stroke="#ffd76a" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
      <!-- téléphone et QR -->
      <g class="sc-tel"><rect x="360" y="60" width="118" height="232" rx="20" fill="#16212c"/><rect x="368" y="72" width="102" height="208" rx="14" fill="url(#sc-tel)"/>
        <rect x="368" y="72" width="102" height="34" rx="14" fill="#0f6b45"/><rect x="380" y="84" width="54" height="8" rx="4" fill="rgba(255,255,255,.85)"/>
        <g transform="translate(386 122)" fill="#16212c"><rect width="22" height="22" rx="3"/><rect x="44" width="22" height="22" rx="3"/><rect y="44" width="22" height="22" rx="3"/>
          <rect x="6" y="6" width="10" height="10" fill="#fff"/><rect x="50" y="6" width="10" height="10" fill="#fff"/><rect x="6" y="50" width="10" height="10" fill="#fff"/>
          <rect x="28" y="4" width="8" height="8"/><rect x="30" y="28" width="10" height="10"/><rect x="48" y="30" width="8" height="8"/><rect x="28" y="50" width="8" height="12"/><rect x="46" y="48" width="18" height="8"/><rect x="56" y="58" width="8" height="8"/></g>
        <rect class="sc-scan" x="380" y="120" width="78" height="3" rx="1.5" fill="#22c55e"/>
        <rect x="382" y="206" width="74" height="9" rx="4" fill="#cfe9dc"/><rect x="382" y="222" width="58" height="9" rx="4" fill="#cfe9dc"/><rect x="382" y="244" width="74" height="22" rx="8" fill="#0f6b45"/></g>
      <!-- bouclier -->
      <g class="sc-bouclier"><path d="M455 22l26 10v20c0 16-11 29-26 34-15-5-26-18-26-34V32z" fill="#f0b429"/><path d="M444 52l8 8 15-16" stroke="#0b4f33" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>`;
  }
  function vitrine(el) {
    if (!el || el.dataset.prete) return;
    el.dataset.prete = '1';
    el.innerHTML = `<div class="bulles">${Array.from({ length: 14 }, (_, i) => `<span style="--x:${(i * 73) % 100}%;--d:${9 + (i * 7) % 11}s;--t:${8 + (i * 5) % 26}px;--r:${-(i * 1.7) % 14}s"></span>`).join('')}</div>
      <div class="vitrine-haut"><div class="vitrine-logo"><span>A</span></div><div><div class="vitrine-nom">AMEDIS <b>pro Asso</b></div><div class="vitrine-sous">Gestion professionnelle d'association</div></div></div>
      <h2 class="vitrine-titre">La gestion de votre association,<br><span>simple, sûre et transparente.</span></h2>
      ${scene()}
      <div class="atouts">${ATOUTS.map((a, i) => `<div class="atout" style="--i:${i}">${icone(a[0])}<div><b>${a[1]}</b><small>${a[2]}</small></div></div>`).join('')}</div>
      <div class="astuce"><b>Le saviez-vous ?</b> <span class="astuce-texte">${ASTUCES[0]}</span></div>
      <div class="credit-vitrine"><b>Conception :</b> M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.</div>`;
    let k = 0;
    setInterval(() => { const t = $(".astuce-texte", el); if (!t || !el.offsetParent) return; t.classList.add('fondu'); setTimeout(() => { k = (k + 1) % ASTUCES.length; t.textContent = ASTUCES[k]; t.classList.remove('fondu'); }, 400); }, 6500);
  }

  // ------------------------------------------------------------ force d'un mot de passe
  function forceMdp(m) {
    m = String(m || ''); let s = 0;
    if (m.length >= 8) s++; if (m.length >= 12) s++; if (/[a-zà-ÿ]/.test(m) && /[A-ZÀ-Ý]/.test(m)) s++; if (/\d/.test(m)) s++; if (/[^A-Za-z0-9À-ÿ]/.test(m)) s++;
    if (m.length < 8 || !/\d/.test(m) || !/[A-Za-zÀ-ÿ]/.test(m)) s = Math.min(s, 1);
    return { score: s, lib: ['Trop faible', 'Faible', 'Moyen', 'Bon', 'Très bon', 'Excellent'][s], couleur: ['#c0392b', '#e05d3a', '#e8a33b', '#7cb342', '#22a35a', '#0f6b45'][s] };
  }
  function jaugeMdp(input, cible) {
    const maj = () => { const f = forceMdp(input.value); cible.innerHTML = input.value ? `<div class="jauge"><div style="width:${(f.score + 1) * 100 / 6}%;background:${f.couleur}"></div></div><small style="color:${f.couleur}">${f.lib}</small>` : '<small class="aide">8 caractères au moins, avec des lettres et des chiffres.</small>'; };
    input.addEventListener('input', maj); maj();
  }

  root.UI = { icone, iconesMenu, pastille, cascade, brillance, compter, anneau, animerAnneaux, secouer, confettis, theme, basculerTheme, themeActuel, majBoutonsTheme, visite, vitrine, forceMdp, jaugeMdp, lireLS, ecrireLS, sobre };
})(typeof window !== 'undefined' ? window : globalThis);
