/* AMEDIS pro Asso — interface */
'use strict';
(function () {
  const A = window.amedis;
  const M = window.Asso;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const S = { chemin: null, session: null, vue: 'tableau', cotActive: null, filtreCot: 'tous', rechercheCot: '', rechercheMembre: '', filtreMembre: 'actifs',
    genre: '', rechercheOp: '', filtreCat: '', filtreMois: '', ongletParam: 'association', minuterie: null, enCours: false, attente: false, lic: null };

  // ------------------------------------------------------------ utilitaires
  function esc(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mt(n) { if (n === null || n === undefined || n === '') return ''; const x = Number(n); return isFinite(x) ? x.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(n); }
  const dev = () => S.session.params.monnaie || 'F CFA';
  const mtd = (n) => `${mt(n)} ${dev()}`;
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function dateFr(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(iso || ''); }
  const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function toast(msg, type) {
    const t = document.createElement('div'), vie = type === 'err' ? 6500 : 3800;
    t.className = 'toast ' + (type || ''); t.style.setProperty('--vie', vie + 'ms');
    t.innerHTML = UI.icone(type === 'err' ? 'alerte' : type === 'ok' ? 'ok' : 'info') + '<span></span>'; t.lastChild.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('sort'); setTimeout(() => t.remove(), 380); }, vie);
    if (type === 'err') UI.secouer($('#modale-fond:not(.masque) .modale') || $('#ecran-connexion:not(.masque) .accueil-carte'));
  }
  const salutation = () => { const h = new Date().getHours(); return h < 5 ? 'Bonsoir' : h < 13 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; };
  const dateLongue = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function nettoyerErreur(e) { return String(e && e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''); }
  const P = () => S.session.params;
  const membres = () => S.session.membres;
  const actifs = () => membres().filter(m => m.actif !== false);
  const cots = () => S.session.cotisations;
  // ---- genre : Tableau de bord, Membres et Cotisations existent en « Ensemble », « Hommes » et « Femmes »
  const VUES_GENRE = ['tableau', 'membres', 'cotisations'];
  const SG = () => VUES_GENRE.includes(S.vue) ? M.sousSession(S.session, S.genre) : S.session;
  const membresG = () => SG().membres;
  const actifsG = () => membresG().filter(m => m.actif !== false);
  const cotsVisibles = () => cots().filter(c => !S.genre || !VUES_GENRE.includes(S.vue) || c.public === 'tous' || !c.public || c.public === S.genre);
  const attTxt = (k) => S.genre && VUES_GENRE.includes(S.vue) && !k.arriere ? `${mtd(M.attendu(k, P(), undefined, { genre: S.genre }))} (${M.GENRES[S.genre].toLowerCase()})` : M.libelleAttendu(k, P(), mtd);
  const libGenre = (g) => g === 'H' ? 'Homme' : g === 'F' ? 'Femme' : '';
  const badgeGenre = (m) => { const g = M.genreDe(m); return g ? `<span class="genre g-${g}" title="${libGenre(g)}">${g}</span>` : '<span class="genre g-N" title="Genre non renseigné">?</span>'; };
  const cot = () => cots().find(k => k.id === S.cotActive) || cots()[0];
  // ---- gestion courante (1.6)
  const G = window.Gestion;
  const parQui = () => S.user ? S.user.nom : (P().tresorier || 'Trésorier');
  const journal = (quoi, detail) => { if (S.session) G.journaliser(S.session, parQui(), quoi, detail); };
  const caisses = () => P().caisses;
  const selCaisse = (id, v, attrs) => `<select class="entree" id="${id}" ${attrs || ''}>${caisses().map(c => `<option ${c === v ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
  // ---- rôles (version activée) : le trésorier administre ; Président et SG consultent seulement Cotisations, Dépenses, Dons
  const licenceActive = () => !!(S.lic && S.lic.licence);
  const estTresorier = () => !licenceActive() || !!(S.user && S.user.role === 'tresorier');
  const libRole = () => S.user ? S.user.libelleRole : '';
  const zoneRestreinte = () => licenceActive() && !estTresorier() &&
    (['cotisations', 'depenses', 'dons', 'caisses', 'solidarite'].includes(S.vue) || (S.vue === 'parametres' && ['cotisations', 'depenses', 'exercice', 'budget'].includes(S.ongletParam)));
  const exerciceClos = () => !!(S.session && S.session.cloture);
  const lectureSeule = () => !!(S.lic && S.lic.lectureSeule) || zoneRestreinte() || exerciceClos();
  function peutModifier() {
    if (!lectureSeule()) return true;
    if (exerciceClos() && !(S.lic && S.lic.lectureSeule)) toast(`Exercice ${P().exercice} clôturé : consultation seule. Les paiements en retard se saisissent dans « Arriérés ${P().exercice} » de l'exercice ${Number(P().exercice) + 1}.`, 'err');
    else if (zoneRestreinte()) toast(`Consultation seule : en tant que ${libRole()}, vous pouvez consulter cet onglet, mais seul le trésorier peut y modifier, ajouter ou retirer quoi que ce soit.`, 'err');
    else toast('Lecture seule : ' + (S.lic.message || 'licence inactive.'), 'err');
    return false;
  }
  function bandeauRole() {
    if (exerciceClos()) {
      const c = S.session.cloture;
      $('#vue').insertAdjacentHTML('afterbegin', `<div class="bandeau-role">🔒 <b>Exercice ${esc(P().exercice)} clôturé</b> le ${new Date(c.le).toLocaleDateString('fr-FR')}${c.par ? ' par ' + esc(c.par) : ''} : consultation et impression seulement. Les paiements en retard se saisissent dans « Arriérés ${esc(P().exercice)} » de l'exercice ${Number(P().exercice) + 1}.</div>`);
      return;
    }
    if (!zoneRestreinte()) return;
    $('#vue').insertAdjacentHTML('afterbegin', `<div class="bandeau-role">👁 <b>Consultation seule</b> — en tant que ${esc(libRole())}, vous pouvez parcourir cet onglet ; seul le trésorier peut y modifier, ajouter ou retirer quoi que ce soit.</div>`);
  }
  const initiales = (m) => ((m.nom || '?')[0] + (m.prenoms || '')[0] || '').toUpperCase();
  const vignette = (m) => m.photo ? `<img class="vignette" src="${m.photo}">` : `<span class="vignette vide-photo">${esc(initiales(m))}</span>`;

  /** Réduit une image (photo de membre, logo) pour garder des fichiers légers */
  function reduireImage(dataUrl, max, format) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const x = c.getContext('2d');
        if (format !== 'png') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
        x.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // ------------------------------------------------------------ thème
  function hexRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); const n = m ? parseInt(m[1], 16) : 0x1b2a4a; return [n >> 16, (n >> 8) & 255, n & 255]; }
  function teinte(h, t) { return '#' + hexRgb(h).map(x => Math.round(t >= 0 ? x + (255 - x) * t : x * (1 + t))).map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join(''); }
  function appliquerTheme() {
    const c = P().couleur || '#1b2a4a', r = document.documentElement.style;
    r.setProperty('--primaire', c); r.setProperty('--primaire-fonce', teinte(c, -0.3)); r.setProperty('--primaire-clair', teinte(c, 0.88));
    r.setProperty('--barre', teinte(c, -0.35)); r.setProperty('--barre-texte', teinte(c, 0.82));
    const lg = $('#marque-logo');
    if (P().logo) { lg.classList.add('photo'); lg.style.backgroundImage = `url("${P().logo}")`; } else { lg.classList.remove('photo'); lg.style.backgroundImage = ''; }
    $('#asso-carte').innerHTML = `<b>${esc(P().sigle || P().nom)}</b>${P().sigle ? esc(P().nom) + '<br>' : ''}Exercice ${esc(P().exercice)} · ${actifs().length} membre(s)`;
  }

  // ------------------------------------------------------------ modale
  function modale({ titre, corps, boutons, large, apresOuverture }) {
    return new Promise(resolve => {
      const m = $('#modale');
      m.className = 'modale' + (large ? ' large' : '');
      m.innerHTML = `<div class="modale-entete">${esc(titre)}</div><div class="modale-corps">${corps}</div><div class="modale-pied"></div>`;
      const pied = $('.modale-pied', m);
      (boutons || [{ lib: 'Fermer', val: null }]).forEach(b => {
        const el = document.createElement('button');
        el.className = 'btn ' + (b.classe || ''); el.textContent = b.lib;
        if (b.gauche) el.style.marginRight = 'auto';
        el.onclick = async () => {
          if (b.avant) { const ok = await b.avant(m); if (ok === false) return; }
          fermer(); resolve(typeof b.val === 'function' ? b.val(m) : b.val);
        };
        pied.appendChild(el);
      });
      function fermer() { $('#modale-fond').classList.add('masque'); document.removeEventListener('keydown', echap); }
      function echap(e) { if (e.key === 'Escape') { fermer(); resolve(null); } }
      document.addEventListener('keydown', echap);
      $('#modale-fond').classList.remove('masque');
      if (apresOuverture) apresOuverture(m);
      const f = $('input:not([type=checkbox]):not([disabled]),select', m); if (f) setTimeout(() => f.focus(), 30);
    });
  }
  function confirmer(titre, texte, libOk, danger) {
    return modale({ titre, corps: `<p style="margin:0;line-height:1.55">${texte}</p>`,
      boutons: [{ lib: 'Annuler', val: false }, { lib: libOk || 'Confirmer', val: true, classe: danger ? 'btn-danger' : 'btn-primaire' }] });
  }

  // ------------------------------------------------------------ enregistrement
  function modifie() {
    S.session.modifieLe = new Date().toISOString();
    etatEnreg('Modifications non enregistrées…', 'en-cours');
    clearTimeout(S.minuterie);
    S.minuterie = setTimeout(enregistrer, 500);
  }
  async function enregistrer(forcer) {
    clearTimeout(S.minuterie);
    if (!S.chemin) return;
    if (S.enCours) { S.attente = true; return; }
    S.enCours = true;
    try {
      await A.enregistrer({ chemin: S.chemin, donnees: S.session, sauvegardeForcee: !!forcer });
      etatEnreg('Enregistré à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      publicationAuto(); sauvegardeAuto();
    } catch (e) {
      etatEnreg("Erreur d'enregistrement", 'erreur');
      toast('Enregistrement impossible : ' + nettoyerErreur(e), 'err');
      chargerLicence();
    } finally {
      S.enCours = false;
      if (S.attente) { S.attente = false; enregistrer(); }
    }
  }
  function etatEnreg(t, c) { const e = $('#etat-enregistrement'); e.textContent = t; e.className = 'etat-enreg ' + (c || ''); }
  A.surDemandeFermeture(async () => { if (S.chemin) await enregistrer(true); A.fermer(); });
  A.surOuvrirFichier(async (p) => { if (S.chemin) await enregistrer(true); ouvrir(p); });

  // ------------------------------------------------------------ licence
  const LIB_MODE = { valide: 'Licence active', rappel: 'Licence bientôt expirée', essai: "Version d'évaluation", 'essai-expire': 'Essai terminé', expiree: 'Licence expirée', horloge: 'Date du PC incorrecte' };
  const CL_MODE = { valide: 'ok', rappel: 'attention', essai: 'essai', 'essai-expire': 'bloque', expiree: 'bloque', horloge: 'bloque' };
  async function chargerLicence() {
    try { S.lic = await A.licenceEtat(); } catch (e) { S.lic = null; }
    afficherLicence();
    return S.lic;
  }
  function resumeLicence() {
    const l = S.lic; if (!l) return '';
    if (l.licence && (l.mode === 'valide' || l.mode === 'rappel')) return `${l.licence.etablissement} · jusqu'au ${new Date(l.licence.fin + 'T12:00').toLocaleDateString('fr-FR')}`;
    if (l.mode === 'essai') return `${l.jours} jour${l.jours > 1 ? 's' : ''} d'essai restant${l.jours > 1 ? 's' : ''}`;
    return LIB_MODE[l.mode] || '';
  }
  function afficherLicence() {
    const l = S.lic; if (!l) return;
    const b = $('#btn-licence');
    b.className = 'licence-pastille ' + (CL_MODE[l.mode] || '');
    b.innerHTML = `<b>${LIB_MODE[l.mode] || 'Licence'}</b><span>${esc(resumeLicence())}</span>`;
    const band = $('#bandeau-licence');
    const montrer = l.mode !== 'valide';
    band.className = 'bandeau-licence ' + (CL_MODE[l.mode] || '') + (montrer ? '' : ' masque');
    if (montrer) band.innerHTML = `<span>${l.lectureSeule ? '🔒 <b>Lecture seule</b> — ' : ''}${esc(l.message)}</span><button class="btn btn-petit" id="bandeau-activer">${l.licence && !l.lectureSeule ? 'Renouveler…' : 'Activer une licence…'}</button>`;
    if ($('#bandeau-activer')) $('#bandeau-activer').onclick = fenetreLicence;
    const acc = $('#accueil-licence');
    acc.className = 'accueil-licence ' + (CL_MODE[l.mode] || '');
    acc.innerHTML = `<div><b>${LIB_MODE[l.mode]}</b> — ${esc(l.mode === 'valide' ? resumeLicence() : l.message)}</div><button class="btn btn-petit" id="acc-licence">Licence…</button>`;
    $('#acc-licence').onclick = fenetreLicence;
    $('#btn-nouvelle').disabled = l.lectureSeule || !estTresorier(); $('#btn-reprise').disabled = l.lectureSeule || !estTresorier();
    $('#btn-nouvelle').title = $('#btn-reprise').title = estTresorier() ? '' : 'Réservé au trésorier';
    document.body.classList.toggle('lecture-seule', lectureSeule());
  }
  async function fenetreLicence() {
    const l = await chargerLicence();
    const fin = l.licence ? new Date(l.licence.fin + 'T12:00').toLocaleDateString('fr-FR') : '';
    const corps = `
      <div class="licence-etat ${CL_MODE[l.mode] || ''}"><b>${LIB_MODE[l.mode]}</b><div>${esc(l.message || (l.licence ? `Licence n° ${l.licence.numero} — ${l.licence.etablissement}, valable jusqu'au ${fin}.` : ''))}</div></div>
      ${l.licence ? `<table class="tab tab-compact" style="margin:10px 0"><tr><td>Association</td><td><b>${esc(l.licence.etablissement)}</b>${l.licence.codeEtablissement ? ' (' + esc(l.licence.codeEtablissement) + ')' : ''}</td></tr>
        <tr><td>N° de licence</td><td>${esc(l.licence.numero)}</td></tr><tr><td>Valable jusqu'au</td><td><b>${fin}</b></td></tr>
        <tr><td>Postes autorisés</td><td>${l.licence.postes.map(esc).join('<br>')}</td></tr></table>` : ''}
      <h4 style="margin:14px 0 6px">1. Code de ce poste</h4>
      <div class="code-poste"><span id="lic-code">${esc(l.codePoste)}</span><button class="btn btn-petit" id="lic-copier">Copier</button></div>
      <p class="aide">Envoyez ce code (et ceux des autres postes de l'association) avec la preuve de paiement à votre fournisseur AMEDIS. Une licence AMEDIS pro Asso est valable un an.</p>
      <h4 style="margin:14px 0 6px">2. Clé de licence reçue</h4>
      <textarea id="lic-cle" class="entree" rows="4" style="width:100%;font-family:Consolas,monospace;font-size:12px" placeholder="Collez ici la clé reçue (elle commence par AMEDIS1.)"></textarea>`;
    const v0 = await modale({ titre: 'Licence AMEDIS pro Asso', corps,
      apresOuverture: (m) => { $('#lic-copier', m).onclick = async () => { await A.copier(l.codePoste); toast('Code du poste copié : collez-le dans votre message WhatsApp.', 'ok'); }; },
      boutons: [
        { lib: 'Importer un fichier…', val: 'fichier', gauche: true },
        { lib: 'Fermer', val: null },
        { lib: 'Activer la licence', classe: 'btn-primaire', avant: async (m) => {
          const t = $('#lic-cle', m).value.trim();
          if (!t) { toast('Collez la clé de licence.', 'err'); return false; }
          try { S.lic = await A.licenceActiver(t); } catch (e) { toast(nettoyerErreur(e), 'err'); return false; }
        }, val: 'ok' }
      ] });
    let v = v0;
    if (v === 'fichier') { try { const r = await A.licenceImporter(); if (r) { S.lic = r; v = 'ok'; } } catch (e) { toast(nettoyerErreur(e), 'err'); } }
    if (v === 'ok') { afficherLicence(); toast(`Licence activée : ${S.lic.licence.etablissement}, jusqu'au ${new Date(S.lic.licence.fin + 'T12:00').toLocaleDateString('fr-FR')}.`, 'ok'); if (!S.user) { await porteEntree(); return; } if (S.session) allerA(S.vue); }
  }

  // ------------------------------------------------------------ connexion (version activée)
  /** Porte d'entrée : sans licence -> accueil ; licence activée -> création du compte du trésorier, puis connexion */
  async function porteEntree() {
    await chargerLicence();
    if (!licenceActive()) { S.user = null; majUtilisateur(); return afficherAccueil(); }
    let e; try { e = await A.comptesEtat(); } catch (err) { toast(nettoyerErreur(err), 'err'); return afficherAccueil(); }
    if (e.utilisateur) { S.user = e.utilisateur; majUtilisateur(); return S.session ? reprendreApp() : afficherAccueil(); }
    ecranConnexion(e.aDesComptes ? 'connexion' : 'creation');
  }
  function reprendreApp() { $('#ecran-connexion').classList.add('masque'); $('#ecran-accueil').classList.add('masque'); $('#ecran-app').classList.remove('masque'); allerA(S.vue || 'tableau'); }
  function ecranConnexion(mode) {
    $('#ecran-app').classList.add('masque'); $('#ecran-accueil').classList.add('masque'); $('#ecran-connexion').classList.remove('masque');
    const lic = S.lic.licence, ch = (id, l, t, ph, ico) => `<div class="champ cx-champ" style="margin-bottom:12px"><label>${l}</label>${UI.icone(ico || 'utilisateur')}<input class="entree" id="${id}" ${t ? `type="${t}"` : ''} ${ph ? `placeholder="${ph}"` : ''} autocomplete="off">${t === 'password' ? `<button class="voir-mdp" type="button" data-voir="${id}" tabindex="-1">Afficher</button>` : ''}</div>`;
    $('#cx-sous').textContent = `${lic.etablissement} — version activée`;
    UI.vitrine($('#ecran-connexion .vitrine'));
    if (mode === 'creation') {
      $('#cx-corps').innerHTML = `<div class="alerte info" style="margin-top:0">Première connexion de la version activée. Le <b>trésorier</b> est l'administrateur du logiciel : il crée son compte maintenant, puis ceux du Président et du Secrétaire général (Paramètres &gt; Utilisateurs).</div>
        ${ch('cx-nom', 'Nom et prénoms du trésorier', '', 'ex. KOUASSI Aya')}${ch('cx-login', "Nom d'utilisateur", '', 'ex. tresorier')}${ch('cx-mdp', 'Mot de passe (8 caractères au moins, lettres et chiffres)', 'password', '', 'cadenas')}<div id="cx-force" style="margin:-6px 0 10px"></div>${ch('cx-mdp2', 'Confirmer le mot de passe', 'password', '', 'cadenas')}
        <div id="cx-maj" class="maj-active masque">Majuscules activées</div><div id="cx-err"></div><button class="btn btn-primaire btn-grand" id="cx-ok" style="width:100%">${UI.icone('bouclier')} Créer le compte du trésorier</button>
        <div class="cx-securite">${UI.icone('bouclier')}<span>Mot de passe chiffré, jamais enregistré en clair.</span></div>`;
    } else {
      $('#cx-corps').innerHTML = `<div class="salut">${salutation()} ! Nous sommes le ${dateLongue()}.</div>${ch('cx-login', "Nom d'utilisateur", '', 'trésorier, président ou SG')}${ch('cx-mdp', 'Mot de passe', 'password', '', 'cadenas')}
        <div id="cx-maj" class="maj-active masque">Majuscules activées</div><div id="cx-err"></div>
        <button class="btn btn-primaire btn-grand" id="cx-ok" style="width:100%;justify-content:center">Se connecter ${UI.icone('fleche')}</button>
        <p class="aide" style="margin-top:14px">Trésorier, Président ou Secrétaire général. <a class="lien" id="cx-oubli" style="cursor:pointer;text-decoration:underline">Mot de passe du trésorier oublié ?</a></p>
        <div class="cx-securite">${UI.icone('bouclier')}<span>Connexion protégée : blocage après 5 essais, verrouillage automatique, journal des connexions.</span></div>`;
      $('#cx-oubli').onclick = oubliMdp;
    }
    const err = (t) => { $('#cx-err').innerHTML = `<div class="erreur-cx">${esc(t)}</div>`; UI.secouer($('#ecran-connexion .accueil-carte')); };
    $$('[data-voir]', $('#cx-corps')).forEach(b => b.onclick = () => { const i = $('#' + b.dataset.voir); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Afficher' : 'Masquer'; });
    $$('#cx-corps input').forEach(i => i.addEventListener('keyup', (e) => { if (e.getModifierState) $('#cx-maj').classList.toggle('masque', !e.getModifierState('CapsLock')); }));
    if ($('#cx-force')) UI.jaugeMdp($('#cx-mdp'), $('#cx-force'));
    const valider = async () => {
      const mdpSaisi = $('#cx-mdp').value;
      try {
        if (mode === 'creation') {
          if ($('#cx-mdp').value !== $('#cx-mdp2').value) return err('Les deux mots de passe ne sont pas identiques.');
          S.user = await A.comptesCreerAdmin({ nom: $('#cx-nom').value, login: $('#cx-login').value, mdp: $('#cx-mdp').value });
          toast('Compte du trésorier créé. Créez ensuite les comptes du Président et du SG dans Paramètres > Utilisateurs.', 'ok');
        } else S.user = await A.comptesConnexion({ login: $('#cx-login').value, mdp: $('#cx-mdp').value });
      } catch (e) { return err(nettoyerErreur(e)); }
      if (S.user.provisoire && !(await mdpObligatoire(mdpSaisi))) { await A.comptesDeconnexion(); S.user = null; return err('Le mot de passe provisoire doit être remplacé avant de continuer.'); }
      $('#ecran-connexion').classList.add('masque'); majUtilisateur(); geste();
      if (mode !== 'creation') toast(`${salutation()}, ${S.user.nom}.${S.user.precedenteConnexion ? ' Dernière connexion : ' + new Date(S.user.precedenteConnexion).toLocaleString('fr-FR') + '.' : ''}`, 'ok');
      if (S.session) reprendreApp(); else afficherAccueil();
    };
    $('#cx-ok').onclick = valider;
    $$('#cx-corps input').forEach(i => i.onkeydown = (e) => { if (e.key === 'Enter') valider(); });
    setTimeout(() => { const f = $('#cx-corps input'); if (f) f.focus(); }, 50);
  }
  /** Premier accès avec un mot de passe provisoire : il doit être remplacé */
  async function mdpObligatoire(ancien) {
    const r = await modale({ titre: 'Choisissez votre mot de passe', corps: `<div class="alerte info" style="margin-top:0">Votre mot de passe est <b>provisoire</b> (donné par le trésorier). Pour votre sécurité, choisissez maintenant votre mot de passe personnel.</div>
        <div class="form-grille" style="grid-template-columns:1fr"><div class="champ"><label>Nouveau mot de passe (8 caractères au moins, lettres et chiffres)</label><input type="password" id="mo-n"><div id="mo-f"></div></div>
        <div class="champ"><label>Confirmer</label><input type="password" id="mo-c"></div></div>`,
      apresOuverture: (m) => UI.jaugeMdp($('#mo-n', m), $('#mo-f', m)),
      boutons: [{ lib: 'Plus tard', val: false }, { lib: 'Enregistrer mon mot de passe', classe: 'btn-primaire', avant: async (m) => {
        if ($('#mo-n', m).value !== $('#mo-c', m).value) { toast('Les deux mots de passe ne sont pas identiques.', 'err'); return false; }
        try { await A.comptesChangerMdp({ ancien, nouveau: $('#mo-n', m).value }); } catch (e) { toast(nettoyerErreur(e), 'err'); return false; }
      }, val: true }] });
    if (r) { S.user.provisoire = false; toast('Mot de passe personnel enregistré.', 'ok'); }
    return !!r;
  }
  async function oubliMdp() {
    const t = await modale({ titre: 'Mot de passe du trésorier oublié', corps: `<p style="margin-top:0">Pour prouver que vous détenez la licence de ce poste, collez la <b>clé de licence</b> (elle commence par AMEDIS1.). Tous les comptes de ce poste seront alors effacés et le trésorier recréera le sien. <b>Les exercices et leurs données ne sont pas touchés.</b></p>
      <textarea id="ou-cle" class="entree" rows="4" style="width:100%;font-family:Consolas,monospace;font-size:12px"></textarea>`,
      boutons: [{ lib: 'Annuler', val: null }, { lib: 'Effacer les comptes', classe: 'btn-danger', val: (m) => $('#ou-cle', m).value.trim() }] });
    if (!t) return;
    try { await A.comptesOubli(t); toast('Comptes effacés : le trésorier recrée son compte.', 'ok'); ecranConnexion('creation'); } catch (e) { toast(nettoyerErreur(e), 'err'); }
  }
  async function deconnecter() {
    if (S.chemin) await enregistrer(true);
    await A.comptesDeconnexion(); S.user = null; S.session = null; S.chemin = null; majUtilisateur();
    const v = $('.verrou'); if (v) v.remove(); S.verrouille = false;
    ecranConnexion('connexion');
  }
  function majUtilisateur() {
    const el = $('#utilisateur'); if (!el) return;
    if (!S.user) { el.classList.add('masque'); el.innerHTML = ''; return; }
    el.classList.remove('masque');
    el.innerHTML = `<b>${esc(S.user.nom)}</b>${esc(S.user.libelleRole)}<div class="liens-u"><a id="u-mdp">Mon mot de passe</a><a id="u-deco">Se déconnecter</a></div>`;
    $('#u-deco').onclick = deconnecter; $('#u-mdp').onclick = changerMonMdp;
  }
  async function changerMonMdp() {
    const r = await modale({ titre: 'Changer mon mot de passe', corps: `<div class="form-grille" style="grid-template-columns:1fr">
        <div class="champ"><label>Mot de passe actuel</label><input type="password" id="mp-a"></div>
        <div class="champ"><label>Nouveau mot de passe (8 caractères au moins, lettres et chiffres)</label><input type="password" id="mp-n"><div id="mp-f"></div></div>
        <div class="champ"><label>Confirmer</label><input type="password" id="mp-c"></div></div>`,
      apresOuverture: (m) => UI.jaugeMdp($('#mp-n', m), $('#mp-f', m)),
      boutons: [{ lib: 'Annuler', val: null }, { lib: 'Changer', classe: 'btn-primaire', avant: async (m) => {
        if ($('#mp-n', m).value !== $('#mp-c', m).value) { toast('Les deux mots de passe ne sont pas identiques.', 'err'); return false; }
        try { await A.comptesChangerMdp({ ancien: $('#mp-a', m).value, nouveau: $('#mp-n', m).value }); } catch (e) { toast(nettoyerErreur(e), 'err'); return false; }
      }, val: true }] });
    if (r) toast('Mot de passe changé.', 'ok');
  }
  const mdpProvisoire = () => { let m; do { m = M.aleatoire(6) + M.aleatoire(3, true); } while (!/[A-Za-z]/.test(m)); return m; };
  /** Paramètres > Utilisateurs : le trésorier crée et gère les comptes du Président et du SG */
  async function paramUtilisateurs() {
    const pc = $('#p-contenu');
    if (!estTresorier()) {
      pc.innerHTML = `<div class="carte"><h3>Mon compte</h3><p>Vous êtes connecté en tant que <b>${esc(S.user.nom)}</b> (${esc(S.user.libelleRole)}).</p>
        <p class="aide">Vous pouvez tout faire, sauf dans les onglets Cotisations, Dépenses et Dons (et leurs réglages) que vous consultez seulement. Les comptes sont gérés par le trésorier.</p>
        <button class="btn" id="pu-mdp">Changer mon mot de passe</button></div>`;
      $('#pu-mdp').onclick = changerMonMdp; return;
    }
    let l = []; try { l = await A.comptesListe(); } catch (e) { pc.innerHTML = `<div class="alerte">${esc(nettoyerErreur(e))}</div>`; return; }
    const role = (r) => l.find(c => c.role === r);
    pc.innerHTML = `<div class="carte"><h3>Comptes utilisateurs <small>ce poste</small></h3>
      <table class="tab"><tr><th>Nom</th><th>Nom d'utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th></th></tr>
      ${l.map(c => `<tr><td><b>${esc(c.nom)}</b>${c.provisoire ? ' <span class="badge b-repech">mot de passe provisoire</span>' : ''}${c.bloque ? ' <span class="badge b-non">bloqué</span>' : ''}</td><td>${esc(c.login)}</td><td>${esc(c.libelleRole)}</td><td>${c.derniereConnexion ? new Date(c.derniereConnexion).toLocaleString('fr-FR') : '–'}</td>
        <td style="white-space:nowrap">${c.role === 'tresorier' ? '<button class="btn btn-petit" id="pu-mdp">Changer mon mot de passe</button>' : `<button class="btn btn-petit" data-pu-reinit="${esc(c.login)}">Nouveau mot de passe</button> <button class="btn btn-petit btn-danger" data-pu-suppr="${esc(c.login)}">Supprimer</button>`}</td></tr>`).join('')}</table>
      <div class="groupe-btn" style="margin-top:14px">
        <button class="btn btn-primaire" data-pu-ajout="president" ${role('president') ? 'disabled title="Ce compte existe déjà"' : ''}>+ Compte du Président</button>
        <button class="btn btn-primaire" data-pu-ajout="sg" ${role('sg') ? 'disabled title="Ce compte existe déjà"' : ''}>+ Compte du Secrétaire général</button></div></div>
      <div class="carte"><h3>Droits de chacun</h3><table class="tab tab-compact">
        <tr><th>Rôle</th><th>Membres, documents, bilan, codes QR, paramètres de l'association</th><th>Cotisations, Dépenses, Dons (et leurs réglages)</th><th>Comptes, nouvel exercice</th></tr>
        <tr><td><b>Trésorier</b> (administrateur)</td><td>Tout</td><td>Tout</td><td>Oui</td></tr>
        <tr><td><b>Président</b></td><td>Tout</td><td>Consultation seule</td><td>Non</td></tr>
        <tr><td><b>Secrétaire général</b></td><td>Tout</td><td>Consultation seule</td><td>Non</td></tr></table>
        <p class="aide">Les comptes sont propres à ce téléphone. Chacun se connecte avec son nom d'utilisateur et son mot de passe à l'ouverture du logiciel.</p></div>`;
    if ($('#pu-mdp')) $('#pu-mdp').onclick = changerMonMdp;
    $$('[data-pu-ajout]').forEach(b => b.onclick = async () => {
      const r = b.dataset.puAjout, lib = r === 'president' ? 'du Président' : 'du Secrétaire général';
      const v = await modale({ titre: `Créer le compte ${lib}`, corps: `<div class="form-grille" style="grid-template-columns:1fr">
          <div class="champ"><label>Nom et prénoms</label><input id="pa-nom"></div>
          <div class="champ"><label>Nom d'utilisateur</label><input id="pa-login" value="${r === 'president' ? 'president' : 'sg'}"></div>
          <div class="champ"><label>Mot de passe provisoire (8 caractères au moins, lettres et chiffres)</label><input id="pa-mdp" value="${mdpProvisoire()}"></div>
          <p class="aide" style="margin:0">Communiquez ce mot de passe à l'intéressé : il devra le remplacer par son mot de passe personnel à sa première connexion.</p></div>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Créer le compte', classe: 'btn-primaire', avant: async (m) => {
          try { await A.comptesAjouter({ role: r, nom: $('#pa-nom', m).value, login: $('#pa-login', m).value, mdp: $('#pa-mdp', m).value }); } catch (e) { toast(nettoyerErreur(e), 'err'); return false; }
        }, val: (m) => ({ login: $('#pa-login', m).value, mdp: $('#pa-mdp', m).value }) }] });
      if (v) { toast(`Compte créé. Nom d'utilisateur : ${v.login} — mot de passe : ${v.mdp}`, 'ok'); paramUtilisateurs(); }
    });
    $$('[data-pu-reinit]').forEach(b => b.onclick = async () => {
      const mdp = mdpProvisoire();
      if (!await confirmer('Nouveau mot de passe', `Le mot de passe de <b>${esc(b.dataset.puReinit)}</b> sera remplacé par : <b style="font-size:15px">${esc(mdp)}</b><br><br>Notez-le et communiquez-le à l'intéressé.`, 'Remplacer')) return;
      try { await A.comptesReinitialiser({ login: b.dataset.puReinit, mdp }); toast('Mot de passe remplacé : ' + mdp, 'ok'); } catch (e) { toast(nettoyerErreur(e), 'err'); }
    });
    $$('[data-pu-suppr]').forEach(b => b.onclick = async () => {
      if (!await confirmer('Supprimer le compte', `Supprimer le compte <b>${esc(b.dataset.puSuppr)}</b> ? La personne ne pourra plus se connecter.`, 'Supprimer', true)) return;
      try { await A.comptesSupprimer(b.dataset.puSuppr); toast('Compte supprimé.'); paramUtilisateurs(); } catch (e) { toast(nettoyerErreur(e), 'err'); }
    });
  }

  // ------------------------------------------------------------ accueil / exercices
  async function afficherAccueil() {
    S.chemin = null; S.session = null;
    chargerLicence();
    $('#ecran-app').classList.add('masque');
    $('#ecran-accueil').classList.remove('masque');
    UI.vitrine($('#ecran-accueil .vitrine')); UI.majBoutonsTheme();
    $('#acc-salut').textContent = `${salutation()}${S.user ? ', ' + S.user.nom : ''} — ${dateLongue()}`;
    const infos = await A.infos(); S.infos = infos;
    $('#accueil-pied').innerHTML = `${S.user ? `Connecté : <b>${esc(S.user.nom)}</b> (${esc(S.user.libelleRole)}) — <a class="lien" id="acc-deco" style="cursor:pointer;text-decoration:underline">Se déconnecter</a><br>` : ''}Version ${esc(infos.version)} — vos exercices et documents sont dans : ${esc(infos.racine)}`;
    if ($('#acc-deco')) $('#acc-deco').onclick = deconnecter;
    if (infos.fichierDemarrage) { ouvrir(infos.fichierDemarrage); return; }
    const rec = await A.recents();
    const el = $('#liste-recents');
    if (!rec.length) { el.innerHTML = '<div class="vide">Aucun exercice pour le moment. Créez un nouvel exercice, ou reprenez votre classeur Excel (BASE_A2B ou liste de membres).</div>'; return; }
    el.innerHTML = rec.map((r, i) => `<div class="recent" data-i="${i}" style="--i:${i}">
      <span class="ico-rec">${UI.icone('documents')}</span><div style="flex:1;min-width:0"><strong>${esc(r.nom)}</strong>
      <small>${r.erreur ? esc(r.erreur) : `${esc(r.association || '')} · exercice ${esc(r.exercice || '')} · ${r.nbMembres} membre(s)`} · modifié le ${new Date(r.modifie).toLocaleString('fr-FR')}</small></div>
      <button class="x" title="Retirer de la liste" data-x="${i}">×</button></div>`).join('');
    UI.cascade(el);
    $$('.recent', el).forEach(d => d.onclick = async (e) => {
      const r = rec[+d.dataset.i];
      if (e.target.dataset.x !== undefined) { e.stopPropagation(); await A.retirerRecent(r.chemin); afficherAccueil(); return; }
      ouvrir(r.chemin);
    });
  }
  async function ouvrir(chemin) {
    try {
      const r = await A.ouvrirSession(chemin);
      if (!r) return;
      demarrer(r.chemin, M.normaliser(r.donnees)); S.integrite = r.integrite;
      if (r.integrite === 'altere') {
        journal('Alerte : fichier modifié hors du logiciel', 'sceau d\'intégrité non conforme à l\'ouverture');
        A.comptesNoter({ ev: 'fichier', detail: 'sceau non conforme : ' + (r.chemin || '').split(/[\\/]/).pop() }).catch(() => {});
        modale({ titre: 'Attention : fichier modifié en dehors du logiciel', corps: `<div class="alerte alerte-forte" style="margin-top:0">${UI.icone('alerte')} Le <b>sceau d'intégrité</b> de cet exercice ne correspond pas à son contenu : le fichier a été modifié en dehors d'AMEDIS pro Asso (éditeur de texte, autre programme), ou il est endommagé.</div>
          <p>Vérifiez les montants avec le bureau. Une sauvegarde récente se trouve dans le dossier des sauvegardes (Paramètres). L'événement est noté dans le journal des opérations. Le sceau sera recalculé au prochain enregistrement.</p>` });
      }
    } catch (e) { toast('Ouverture impossible : ' + nettoyerErreur(e), 'err'); }
  }
  function demarrer(chemin, session) {
    S.chemin = chemin; S.session = session; S.cotActive = null;
    $('#ecran-accueil').classList.add('masque');
    $('#ecran-app').classList.remove('masque');
    etatEnreg('Enregistré');
    allerA(membres().length ? 'tableau' : 'membres');
    if (S.infos && S.infos.visiteAuto && !UI.lireLS('asso-visite-2')) { UI.ecrireLS('asso-visite-2', '1'); setTimeout(lancerVisite, 900); }
  }

  function champsAssociation(d) {
    const ch = (k, l, cls, type) => `<div class="champ ${cls || ''}"><label>${l}</label><input data-k="${k}" ${type ? `type="${type}"` : ''} value="${esc(d[k])}"></div>`;
    return `<div class="form-grille" style="grid-template-columns:1fr 1fr">
      ${ch('nom', "Nom de l'association", 'plein')}${ch('sigle', 'Sigle (ex. A2B)')}${ch('siege', 'Siège (ville)')}
      ${ch('exercice', 'Exercice (année)', '', 'number')}${ch('monnaie', 'Monnaie')}</div>`;
  }
  async function creerExercice(donnees, nomFichier) {
    try {
      const r = await A.creerSession({ nom: nomFichier, donnees });
      if (!r) return false;
      demarrer(r.chemin, M.normaliser(r.donnees));
      return true;
    } catch (e) { toast('Création impossible : ' + nettoyerErreur(e), 'err'); return false; }
  }
  const nomExercice = (p) => `Exercice ${p.exercice} - ${p.sigle || p.nom}`;

  async function nouvelExercice() {
    if (lectureSeule()) { fenetreLicence(); return; }
    const d = Object.assign({}, M.PARAMS_DEFAUT, { nom: '', exercice: new Date().getFullYear() });
    const vals = await modale({ titre: 'Nouvel exercice', corps: `<p class="aide" style="margin-top:0">Un exercice regroupe, pour une année, les membres de l'association, leurs cotisations, les dépenses et les dons. Tout reste modifiable ensuite dans « Paramètres ».</p>
      ${champsAssociation(d)}
      <div class="form-grille" style="grid-template-columns:1fr 1fr;margin-top:14px">
        <div class="champ"><label>Cotisation mensuelle : montant attendu sur l'année</label><input data-c="mens" type="number" min="0" value="12000"></div>
        <div class="champ"><label>Cotisation exceptionnelle : montant attendu</label><input data-c="exc" type="number" min="0" value="6000"></div>
        <div class="champ plein"><span class="aide">Vous pourrez ajouter d'autres types de cotisation (décès, mariage, projet…) ou retirer ceux-ci dans « Paramètres ».</span></div></div>`,
      boutons: [{ lib: 'Annuler', val: null }, { lib: "Créer l'exercice", classe: 'btn-primaire',
        avant: (m) => { if (!$('[data-k=nom]', m).value.trim()) { toast("Indiquez le nom de l'association.", 'err'); return false; } },
        val: (m) => { const o = {}; $$('[data-k]', m).forEach(i => o[i.dataset.k] = i.type === 'number' ? Number(i.value) : i.value.trim()); o._mens = Number($('[data-c=mens]', m).value) || 0; o._exc = Number($('[data-c=exc]', m).value) || 0; return o; } }] });
    if (!vals) return;
    const mens = vals._mens, exc = vals._exc; delete vals._mens; delete vals._exc;
    vals.nom = vals.nom.toUpperCase();
    const s = M.nouvelExercice(vals);
    s.cotisations = [M.cotisationMensuelle(mens), M.cotisationExceptionnelle(exc)];
    if (await creerExercice(s, nomExercice(s.params))) { allerA('membres'); toast('Exercice créé. Ajoutez ou importez maintenant les membres.', 'ok'); }
  }

  /** Reprise d'un classeur Excel : BASE_A2B complet ou simple liste de membres */
  async function lireClasseur() {
    let r;
    try { r = await A.importerExcel(); } catch (e) { toast('Lecture impossible : ' + nettoyerErreur(e), 'err'); return null; }
    return r;
  }
  async function photosImportees(r, rapport) {
    let n = 0;
    for (const ph of rapport.photos) {
      const brut = await A.lireImage({ dossier: r.dossier, relatif: ph.chemin });
      if (!brut) continue;
      const img = await reduireImage(brut, 360);
      const m = membres().find(x => x.id === ph.membre);
      if (img && m) { m.photo = img; n++; }
    }
    return n;
  }
  async function repriseExcel() {
    if (lectureSeule()) { fenetreLicence(); return; }
    const r = await lireClasseur(); if (!r) return;
    const a2b = M.estClasseurA2B(r.feuilles);
    const d = Object.assign({}, M.PARAMS_DEFAUT, a2b ? { nom: devinerNom(r.feuilles) || '', sigle: 'A2B' } : { nom: '' });
    const vals = await modale({ titre: `Reprendre « ${r.fichier} »`, corps: `${a2b
      ? `<div class="alerte info" style="margin-top:0">Classeur reconnu (BASE_A2B) : les membres et leurs photos, les cotisations mensuelles et exceptionnelles, les dépenses et les dons seront repris.</div>`
      : `<div class="alerte info" style="margin-top:0">Les membres seront repris depuis la première feuille qui contient une colonne « Nom ».</div>`}
      ${champsAssociation(d)}`,
      boutons: [{ lib: 'Annuler', val: null }, { lib: "Créer l'exercice", classe: 'btn-primaire',
        avant: (m) => { if (!$('[data-k=nom]', m).value.trim()) { toast("Indiquez le nom de l'association.", 'err'); return false; } },
        val: (m) => { const o = {}; $$('[data-k]', m).forEach(i => o[i.dataset.k] = i.type === 'number' ? Number(i.value) : i.value.trim()); return o; } }] });
    if (!vals) return;
    vals.nom = vals.nom.toUpperCase();
    const s = M.nouvelExercice(vals);
    let rapport = null, texte = '';
    if (a2b) {
      const imp = M.importerA2B(r.feuilles, vals.exercice);
      Object.assign(s, { membres: imp.membres, cotisations: imp.cotisations.length ? imp.cotisations : s.cotisations, depenses: imp.depenses, dons: imp.dons });
      rapport = imp.rapport;
    } else {
      let lm = null;
      for (const f of r.feuilles) { lm = M.importerMembresListe(f.lignes); if (lm && lm.membres.length) break; }
      if (!lm || !lm.membres.length) { toast('Aucune liste de membres reconnue (il faut au moins une colonne « Nom »).', 'err'); return; }
      s.membres = lm.membres;
      numeroterSansIdent(s);
    }
    if (!(await creerExercice(s, nomExercice(s.params)))) return;
    if (rapport) {
      const nPh = await photosImportees(r, rapport);
      modifie();
      texte = `<ul style="line-height:1.7;margin:0;padding-left:18px"><li><b>${rapport.membres}</b> membre(s), dont <b>${nPh}</b> avec photo${rapport.photos.length > nPh ? ` (${rapport.photos.length - nPh} photo(s) introuvable(s) à côté du classeur)` : ''}</li>
        ${rapport.cotisations.map(c => `<li>${esc(c.nom)} : <b>${c.versements}</b> versement(s), montant attendu <b>${mtd(c.montantAttendu)}</b></li>`).join('')}
        <li><b>${rapport.depenses}</b> dépense(s) et <b>${rapport.dons}</b> don(s)</li></ul><p class="aide">Vérifiez les catégories des dépenses (elles sont classées « Autres ») et ajoutez le logo de l'association dans « Paramètres ».</p>`;
      await modale({ titre: 'Reprise terminée', corps: texte });
    } else toast(`${membres().length} membre(s) repris.`, 'ok');
    allerA('tableau');
  }
  function devinerNom(feuilles) {
    for (const f of feuilles) for (const l of f.lignes.slice(0, 3)) for (const v of l || []) { if (/^association/i.test(String(v || '').trim())) return String(v).trim().toUpperCase(); }
    return '';
  }
  function numeroterSansIdent(s) {
    const pre = (s.params.prefixeIdent || s.params.sigle || 'M').trim();
    s.membres.forEach(m => { m.nom = String(m.nom || '').toUpperCase(); if (/^\d+$/.test(m.ident)) m.ident = `${pre} ${m.ident}`; if (!m.ident) m.ident = M.prochainIdent(s); });
  }

  // ------------------------------------------------------------ navigation
  const TITRES = { tableau: 'Tableau de bord', membres: 'Membres', cotisations: 'Cotisations', depenses: 'Dépenses', dons: 'Dons', bilan: 'Bilan financier', documents: 'Documents', parametres: 'Paramètres', caisses: 'Caisses — où est l\'argent', reunions: 'Réunions et présences', solidarite: 'Solidarité', qr: 'Codes QR — consultation des membres', demarches: 'Démarches des membres', messagerie: 'Messagerie du bureau' };
  function sousTitre() { const p = P(); return `${p.nom}${p.sigle ? ' (' + p.sigle + ')' : ''} · exercice ${p.exercice}${p.siege ? ' · ' + p.siege : ''}`; }
  function allerA(vue, opts) {
    if (opts && opts.genre !== undefined) S.genre = opts.genre;
    else if (!VUES_GENRE.includes(vue)) S.genre = '';
    S.vue = vue;
    surveillerDemarches();
    afficherLicence(); appliquerTheme();
    $$('#nav a').forEach(a => a.classList.toggle('actif', a.dataset.vue === vue && (a.dataset.genre || '') === S.genre));
    $$('#nav .sous-nav').forEach(a => a.classList.toggle('ouvert', a.dataset.vue === vue));
    $('#titre-vue').textContent = TITRES[vue] + (S.genre && VUES_GENRE.includes(vue) ? ' — ' + M.GENRES[S.genre] : '');
    $('#sous-titre').textContent = sousTitre();
    $('#entete-actions').innerHTML = '';
    ({ tableau: vueTableau, membres: vueMembres, cotisations: vueCotisations, depenses: () => vueOperations('depenses'), dons: () => vueOperations('dons'), bilan: vueBilan, qr: vueQR, demarches: vueDemarches, messagerie: vueMessagerie, caisses: vueCaisses, reunions: vueReunions, solidarite: vueSolidarite, documents: vueDocuments, parametres: vueParametres })[vue](opts || {});
    if (lectureSeule()) $$('#vue .ecriture-champ').forEach(x => { x.disabled = true; });
    if (vue !== 'parametres') bandeauRole();
    alerteSansGenre();
    UI.pastille($('#nav')); setTimeout(() => UI.pastille($('#nav')), 30);
    $('#btn-verrou').classList.toggle('masque', !peutVerrouiller());
    UI.brillance($('#titre-vue')); UI.cascade($('#vue')); UI.compter($('#vue'), (n) => mt(Math.round(n)) || '0'); UI.animerAnneaux($('#vue'));
    $('#vue').scrollTop = 0;
  }
  /** Vues Hommes / Femmes : signale les membres sans genre (ils n'y apparaissent pas) et propose de l'indiquer */
  function alerteSansGenre() {
    if (!S.session || !S.genre || !VUES_GENRE.includes(S.vue)) return;
    const n = membres().filter(m => m.actif !== false && !M.genreDe(m)).length;
    if (!n) return;
    $('#vue').insertAdjacentHTML('afterbegin', `<div class="alerte info" style="display:flex;align-items:center;gap:12px;justify-content:space-between">
      <span><b>${n} membre(s) actif(s) n'ont pas de genre</b> : ils n'apparaissent pas dans les vues « ${M.GENRES[S.genre]} ». Indiquez leur genre pour les y voir.</span>
      <button class="btn btn-petit btn-primaire" id="sg-serie">Indiquer le genre des membres</button></div>`);
    $('#sg-serie').onclick = genreEnSerie;
  }
  /** Indiquer le genre de plusieurs membres en une seule fois */
  async function genreEnSerie() {
    if (lectureSeule() && !zoneRestreinte()) { peutModifier(); return; }
    const l = membres().filter(m => !M.genreDe(m)).sort((a, b) => (a.actif === false) - (b.actif === false) || M.triMembres(a, b));
    if (!l.length) { toast('Tous les membres ont un genre.', 'ok'); return; }
    const r = await modale({ titre: `Indiquer le genre — ${l.length} membre(s)`, large: true,
      corps: `<p class="aide" style="margin-top:0">Cochez H (homme) ou F (femme) pour chaque membre, puis « Enregistrer ». Les lignes laissées sur « ? » ne changent pas.</p>
        <div class="tableau-conteneur" style="max-height:58vh"><table class="tab tab-compact"><tr><th>Identifiant</th><th>Nom et prénoms</th><th class="centre">H</th><th class="centre">F</th><th class="centre">?</th></tr>
        ${l.map(m => `<tr><td><b>${esc(m.ident)}</b></td><td>${esc(M.nomComplet(m))}${m.actif === false ? ' <span class="aide">(inactif)</span>' : ''}</td>
          ${['H', 'F', ''].map(g => `<td class="centre"><input type="radio" name="sg-${m.id}" value="${g}" ${g === '' ? 'checked' : ''} style="width:18px;height:18px"></td>`).join('')}</tr>`).join('')}</table></div>`,
      boutons: [{ lib: 'Annuler', val: null }, { lib: 'Enregistrer', classe: 'btn-primaire', val: (md) => l.map(m => [m, ($(`input[name="sg-${m.id}"]:checked`, md) || {}).value || '']) }] });
    if (!r) return;
    let n = 0; r.forEach(([m, g]) => { if (g) { m.genre = g; n++; } });
    if (n) { journal('Genre des membres', `${n} membre(s) complété(s)`); modifie(); allerA(S.vue); toast(`Genre indiqué pour ${n} membre(s).`, 'ok'); }
  }
  function actionsEntete(html) { $('#entete-actions').innerHTML = html; }


  // ------------------------------------------------------------ démarches des membres (appli Android « AMEDIS Asso », site 1.8.0)
  const DEM = { liste: null, le: 0, erreur: '', filtre: 'atraiter', charge: false, pour: null, minuterie: null };
  const aTraiter = (d) => d.statut === 'En attente' || d.statut === 'En cours';
  /** À l'ouverture d'un exercice (site installé) puis toutes les 10 minutes : compteur du menu Démarches */
  function surveillerDemarches() {
    if (!S.session || DEM.pour === S.session) return;
    DEM.pour = S.session; DEM.liste = null; DEM.erreur = ''; majCompteurDemarches();
    MSGS.liste = null; MSGS.erreur = ''; MSGS.choisis.clear(); MSGS.brouillon = ''; majCompteurMessages();
    if (!PUB().url) return;
    setTimeout(() => chargerDemarches(true), 2500);
    clearInterval(DEM.minuterie); DEM.minuterie = setInterval(() => { if (PUB().url) chargerDemarches(true); }, 10 * 60 * 1000);
  }
  function majCompteurDemarches() {
    const a = $('#nav a[data-vue="demarches"]'); if (!a) return;
    const n = (DEM.liste || []).filter(aTraiter).length;
    let b = $('.nav-compte', a); if (!b) { b = document.createElement('span'); b.className = 'nav-compte'; a.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('masque', !n);
    a.title = n ? `${n} démarche(s) de membres à traiter` : 'Démarches des membres';
  }
  // ---- opérations faites dans l'appli du trésorier : appliquées ici, l'ordinateur reste la référence
  const OPS = () => { S.session.opsAppli = S.session.opsAppli || []; return S.session.opsAppli; };
  const peutAppliquerOps = () => S.session && PUB().url && PUB().codeOps && (!licenceActive() || estTresorier()) && !exerciceClos() && !(S.lic && S.lic.lectureSeule);
  function membreParIdent(x) { const v = norm(x); return membres().find(m => norm(m.ident) === v); }
  function appliquerOperation(o) {
    const d = o.donnees || {}, par = `${o.par} (appli)`, s = S.session;
    const montant = (v) => { const n = Math.round(Number(v) * 100) / 100; if (!(n > 0) || n > 50000000) throw new Error('Montant invalide.'); return n; };
    const date = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : aujourdhui();
    const caisse = (v) => caisses().includes(v) ? v : caisseDe(v);
    const txt = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, ' ').trim().slice(0, n || 120);
    if (o.type === 'encaissement') {
      const m = membreParIdent(d.membre); if (!m) throw new Error(`Membre ${d.membre} introuvable.`);
      const lignes = (d.lignes || []).map(l => { const k = cots().find(x => x.nom === l.nom) || cots()[Number(l.index)]; if (!k) throw new Error('Cotisation introuvable : ' + l.nom); return { kid: k.id, j: Number(l.j) || 0, montant: montant(l.montant) }; });
      const recu = G.encaisser(s, { membreId: m.id, lignes, mode: caisse(d.caisse), date: date(d.date), par });
      return `Reçu n° ${recu.num} — ${mt(recu.total)} ${dev()}`;
    }
    if (o.type === 'depense' || o.type === 'don') {
      const dep = o.type === 'depense', liste = s[dep ? 'depenses' : 'dons'];
      if (!txt(d.designation)) throw new Error('Désignation manquante.');
      const x = { id: M.nouvelId(dep ? 'p' : 'd'), numero: M.prochainNumero(liste, dep ? 'Dépense' : 'Don'), date: date(d.date), designation: txt(d.designation), montant: montant(d.montant), mode: caisse(d.caisse) };
      if (dep) { x.categorie = s.categories.includes(d.categorie) ? d.categorie : (s.categories[0] || 'Divers'); } else x.donateur = txt(d.donateur, 80);
      liste.push(x); return `${x.numero} enregistré(e) — ${mt(x.montant)} ${dev()}`;
    }
    if (o.type === 'membre_ajout') {
      const nom = txt(d.nom, 60).toUpperCase(), prenoms = txt(d.prenoms, 80);
      if (!nom) throw new Error('Nom manquant.');
      const deja = membres().find(m => norm(m.nom) === norm(nom) && norm(m.prenoms) === norm(prenoms));
      if (deja) throw new Error(`Ce membre existe déjà (${deja.ident}).`);
      const m = { id: M.nouvelId('m'), ident: M.prochainIdent(s), nom, prenoms, genre: ['H', 'F'].includes(d.genre) ? d.genre : '', contact: txt(d.contact, 40), residence: txt(d.residence, 60), fonction: txt(d.fonction, 40), dateAdhesion: date(d.dateAdhesion), actif: true };
      membres().push(m); M.accesMembre(m); return `Membre ${m.ident} ajouté : ${M.nomComplet(m)}`;
    }
    if (o.type === 'membre_modif') {
      const m = membreParIdent(d.membre); if (!m) throw new Error(`Membre ${d.membre} introuvable.`);
      const c = d.champs || {}, avant = [];
      ['nom', 'prenoms', 'contact', 'residence', 'fonction'].forEach(k => { if (c[k] !== undefined && txt(c[k]) !== (m[k] || '')) { avant.push(k); m[k] = k === 'nom' ? txt(c[k], 60).toUpperCase() : txt(c[k], 80); } });
      if (c.genre !== undefined && ['H', 'F', ''].includes(c.genre) && c.genre !== (m.genre || '')) { m.genre = c.genre; avant.push('genre'); }
      if (c.dateAdhesion !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(c.dateAdhesion)) { m.dateAdhesion = c.dateAdhesion; avant.push('adhésion'); }
      if (c.actif !== undefined && !!c.actif !== (m.actif !== false)) { m.actif = !!c.actif; avant.push(m.actif ? 'réactivé' : 'rendu inactif'); }
      return avant.length ? `${m.ident} modifié : ${avant.join(', ')}` : `${m.ident} : aucune modification`;
    }
    if (o.type === 'reunion') {
      let u = d.reunionId ? s.reunions.find(x => x.id === d.reunionId) : null;
      if (!u) u = G.ajouterReunion(s, { date: date(d.date), objet: txt(d.objet, 80) || 'Réunion', lieu: txt(d.lieu, 60), amendes: d.amendes || {} });
      let n = 0;
      Object.entries(d.presences || {}).forEach(([ident, st]) => { const m = membreParIdent(ident); if (m && ['P', 'R', 'A', 'E'].includes(st)) { u.presences[m.id] = st; n++; } });
      G.majAmendes(s);
      return `${u.objet} du ${dateFr(u.date)} : ${n} présence(s) notée(s)`;
    }
    if (o.type === 'solidarite_evt') {
      const ev = G.creerEvenement(s, { type: d.type, libelle: txt(d.libelle, 80), beneficiaire: txt(d.beneficiaire, 80), date: date(d.date), contribution: Number(d.contribution) || 0 });
      return `Événement « ${ev.libelle} » créé${ev.contribution ? ` — contribution ${mt(ev.contribution)} ${dev()} par membre` : ''}`;
    }
    if (o.type === 'solidarite_aide') {
      const dp = G.remettreAide(s, d.evenementId, { montant: montant(d.montant), date: date(d.date), mode: caisse(d.caisse) });
      return `${dp.numero} — aide remise ${mt(dp.montant)} ${dev()}`;
    }
    throw new Error('Opération inconnue : ' + o.type);
  }
  async function chargerOperations(silencieux) {
    if (!peutAppliquerOps()) return 0;
    const pub = PUB(); let l;
    try { l = (await A.operationsListe({ url: pub.url, cle: pub.cle })).operations || []; }
    catch (e) { if (!silencieux) toast(nettoyerErreur(e), 'err'); return 0; }
    let n = 0, rej = 0;
    for (const o of l) {
      if (String(o.exercice) !== String(P().exercice)) continue;   // autre exercice : il l'appliquera
      let x = OPS().find(y => y.id === o.id);
      if (!x) {
        x = { id: o.id, le: new Date().toISOString(), recueLe: o.recueLe, type: o.type, libelle: o.libelle, resume: o.resume, par: o.par, statut: 'Appliquée', resultat: '', marque: false };
        try { x.resultat = appliquerOperation(o); n++; journal("Opération depuis l'appli", `${o.libelle} — ${o.resume || ''} — ${x.resultat} (par ${o.par})`); }
        catch (e) { x.statut = 'Rejetée'; x.resultat = nettoyerErreur(e); rej++; journal("Opération de l'appli rejetée", `${o.libelle} — ${o.resume || ''} — ${x.resultat}`); }
        OPS().push(x); if (OPS().length > 500) OPS().splice(0, OPS().length - 500);
        modifie();
      }
      if (!x.marque) { try { await A.operationsResultat({ url: pub.url, cle: pub.cle, id: x.id, statut: x.statut, resultat: x.resultat }); x.marque = true; modifie(); } catch (e) { /* nouvel essai à la prochaine vérification */ } }
    }
    if (n || rej) {
      await enregistrer(true); await publier(true);
      toast(`📱 ${n} opération(s) de l'appli du trésorier appliquée(s)${rej ? `, ${rej} rejetée(s)` : ''} et publiée(s).`, rej ? 'err' : 'ok');
      if (['tableau', 'cotisations', 'membres', 'depenses', 'dons', 'reunions', 'solidarite', 'caisses', 'demarches'].includes(S.vue)) allerA(S.vue);
    }
    return n;
  }
  async function chargerDemarches(silencieux) {
    const pub = PUB(); if (!pub.url || DEM.charge) return false;
    if (licenceActive() && !S.user) return false;
    DEM.charge = true; if (S.vue === 'demarches') vueDemarches();
    const avant = (DEM.liste || []).filter(aTraiter).length;
    try { const r = await A.demarchesListe({ url: pub.url, cle: pub.cle }); DEM.liste = r.demarches || []; DEM.le = Date.now(); DEM.erreur = ''; }
    catch (e) { DEM.erreur = nettoyerErreur(e); if (!silencieux) toast(DEM.erreur, 'err'); }
    DEM.charge = false; majCompteurDemarches();
    await chargerOperations(silencieux);
    await chargerMessages(true);
    const apres = (DEM.liste || []).filter(aTraiter).length;
    if (silencieux && apres > avant && S.vue !== 'demarches') toast(`✉ ${apres} démarche(s) de membres à traiter (menu Démarches).`, 'ok');
    if (S.vue === 'demarches') vueDemarches();
    return !DEM.erreur;
  }
  /** Caisse du logiciel correspondant au mode de paiement déclaré par le membre */
  function caisseDe(mode) {
    const c = caisses(), s = norm(mode), t = (re) => re.test(s) && c.find(x => re.test(norm(x)));
    return c.find(x => norm(x) === s) || t(/orange/) || t(/mtn/) || t(/moov/) || t(/wave/) || t(/esp/) ||
      (/(virement|banq)/.test(s) && c.find(x => /banq/.test(norm(x)))) || c.find(x => s && norm(x) && (s.includes(norm(x)) || norm(x).includes(s))) || c[0];
  }
  async function statuerDemarche(d, statut, reponse) {
    const pub = PUB();
    try {
      await A.demarchesStatuer({ url: pub.url, cle: pub.cle, id: d.id, statut, reponse: reponse || '', par: parQui() });
      journal('Démarche de membre', `${d.numero} ${d.membre} — ${d.libelle} : ${statut}${reponse ? ' (' + reponse + ')' : ''}`);
      toast(`Démarche de ${d.membre} : ${statut.toLowerCase()}. Le membre voit la réponse dans son appli.`, 'ok');
      d.statut = statut; d.reponse = reponse || ''; d.traiteePar = parQui();
      majCompteurDemarches(); if (S.vue === 'demarches') vueDemarches();
      chargerDemarches(true);
      return true;
    } catch (e) { toast('Réponse non envoyée : ' + nettoyerErreur(e), 'err'); return false; }
  }
  async function texteDemarche(titre, aide, obligatoire, val0) {
    return modale({ titre, corps: `<p class="aide" style="margin-top:0">${aide}</p><textarea class="entree" id="dm-txt" rows="4" maxlength="300" style="width:100%">${esc(val0 || '')}</textarea>`,
      apresOuverture: (md) => setTimeout(() => $('#dm-txt', md).focus(), 60),
      boutons: [{ lib: 'Annuler', val: null }, { lib: 'Envoyer au membre', classe: 'btn-primaire', avant: (md) => { if (obligatoire && !$('#dm-txt', md).value.trim()) { toast('Écrivez la réponse.', 'err'); return false; } }, val: (md) => $('#dm-txt', md).value.trim() }] });
  }
  async function encaisserDemarche(d) {
    if (licenceActive() && !estTresorier()) { toast('Seul le trésorier encaisse un paiement déclaré.', 'err'); return; }
    if (exerciceClos()) { peutModifier(); return; }
    const m = membres().find(x => x.ident === d.numero);
    if (!m) { toast(`Membre ${d.numero} introuvable dans cet exercice : vérifiez qu'il s'agit du bon exercice.`, 'err'); return; }
    const k = cots().find(c => norm(c.nom) === norm(d.cotisation));
    const date = /^\d{4}-\d{2}-\d{2}$/.test(d.datePaiement) ? d.datePaiement : aujourdhui();
    const note = `Déclaré dans l'appli le ${new Date(d.recueLe).toLocaleDateString('fr-FR')} : ${mtd(d.montant)} — ${d.cotisation} — ${d.modePaiement}${d.reference ? ', réf. ' + d.reference : ''}. Vérifiez la réception du paiement avant d'encaisser.`;
    await encaisserMembre(m, k && k.id, { montant: d.montant, mode: caisseDe(d.modePaiement), date, note,
      apres: (recu) => statuerDemarche(d, 'Validée', `Paiement enregistré : reçu n° ${recu.num} (${mt(recu.total)} ${dev()}). Merci !`).then(() => publier(true)) });
  }
  function vueDemarches() {
    const pub = PUB();
    actionsEntete(pub.url ? `<button class="btn" id="dm-actu">${DEM.charge ? 'Actualisation…' : 'Actualiser'}</button>` : '');
    if (!pub.url) {
      $('#vue').innerHTML = `<div class="alerte info">Les membres envoient leurs démarches depuis l'appli Android <b>AMEDIS Asso</b>, par le site de consultation. Installez d'abord le site (menu <b>Codes QR</b>), en version 1.8.0 avec le fichier Demandes.gs.</div>`;
      return;
    }
    if (DEM.liste === null && !DEM.charge && !DEM.erreur) setTimeout(() => chargerDemarches(false), 0);
    const l = DEM.liste || [], f = DEM.filtre, tres = !licenceActive() || estTresorier();
    const vis = l.filter(d => f === 'tout' ? true : f === 'paiements' ? d.type === 'paiement' && aTraiter(d) : aTraiter(d));
    const nAt = l.filter(aTraiter).length, nPa = l.filter(d => d.type === 'paiement' && aTraiter(d)).length;
    const cls = { 'En attente': 'att', 'En cours': 'cours', 'Validée': 'ok', 'Répondu': 'ok', 'Refusée': 'ref', 'Annulée': 'ann' };
    const quand = (x) => x ? new Date(x).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const detail = (d) => d.type === 'paiement'
      ? `<b>${mtd(d.montant)}</b> — ${esc(d.cotisation)}<br><span class="aide">${esc(d.modePaiement)}${d.reference ? ' · réf. ' + esc(d.reference) : ''}${d.datePaiement ? ' · payé le ' + esc(dateFr(d.datePaiement)) : ''}</span>${d.detail ? '<br>' + esc(d.detail) : ''}`
      : esc(d.detail);
    const suite = (d) => {
      if (!aTraiter(d)) return d.reponse ? `<span class="aide">${esc(d.reponse)}${d.traiteePar ? '<br>— ' + esc(d.traiteePar) + (d.traiteeLe ? ', ' + quand(d.traiteeLe) : '') : ''}</span>` : '';
      const b = [];
      if (d.type === 'paiement') {
        if (!tres) return '<span class="aide">À encaisser par le trésorier.</span>';
        b.push(`<button class="btn btn-petit btn-primaire" data-dm-enc="${esc(d.id)}">Encaisser…</button>`);
      } else {
        if (d.statut === 'En attente') b.push(`<button class="btn btn-petit" data-dm-cours="${esc(d.id)}">Prendre en charge</button>`);
        b.push(`<button class="btn btn-petit btn-primaire" data-dm-rep="${esc(d.id)}">Répondre…</button>`);
        if (d.type === 'coordonnees') b.push(`<button class="btn btn-petit" data-dm-fiche="${esc(d.id)}">Fiche du membre</button>`);
      }
      b.push(`<button class="btn btn-petit btn-danger" data-dm-ref="${esc(d.id)}">Refuser…</button>`);
      return `<div class="groupe-btn">${b.join('')}</div>`;
    };
    $('#vue').innerHTML = `
      <div class="carte" style="margin-bottom:14px"><p style="margin:0">Démarches envoyées par les membres depuis l'appli <b>AMEDIS Asso</b> : paiements déclarés, coordonnées, événements, messages au bureau.</p>
        <p class="aide" style="margin:6px 0 0">Un paiement déclaré ne change aucune cotisation tant qu'il n'est pas encaissé ici : <b>Encaisser…</b> ouvre la fenêtre habituelle déjà remplie, émet le reçu, puis répond au membre et publie. Le membre suit chaque réponse dans son appli.</p></div>
      ${DEM.erreur ? `<div class="alerte err" style="margin-bottom:12px">${esc(DEM.erreur)}</div>` : ''}
      <div class="barre-outils" style="margin-bottom:10px">
        ${[['atraiter', `À traiter (${nAt})`], ['paiements', `Paiements à encaisser (${nPa})`], ['tout', `Toutes (${l.length})`]].map(([k, lib]) => `<button class="btn btn-petit ${f === k ? 'btn-primaire' : ''}" data-dm-f="${k}">${lib}</button>`).join('')}
        <span style="flex:1"></span><span class="aide">${DEM.charge ? 'Actualisation en cours…' : DEM.le ? 'Mis à jour à ' + new Date(DEM.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
      ${vis.length ? `<div class="tableau-conteneur"><table class="tab tab-dem"><tr><th>Reçue le</th><th>Membre</th><th>Démarche</th><th>Détail</th><th>Statut</th><th>Suite à donner</th></tr>
        ${vis.map(d => `<tr><td style="white-space:nowrap">${quand(d.recueLe)}</td><td><b>${esc(d.numero)}</b><br>${esc(d.membre)}</td><td>${esc(d.libelle)}</td><td style="max-width:300px">${detail(d)}</td>
          <td><span class="badge-dem ${cls[d.statut] || ''}">${esc(d.statut)}</span></td><td class="dem-suite">${suite(d)}</td></tr>`).join('')}</table></div>`
      : `<div class="alerte info">${DEM.charge || DEM.liste === null ? 'Chargement des démarches…' : f === 'tout' ? 'Aucune démarche reçue pour l\'instant.' : 'Aucune démarche à traiter. 👍'}</div>`}
      ${PUB().codeOps || (S.session.opsAppli || []).length ? `<h3 class="titre-section" style="margin-top:24px">Opérations faites dans l'appli du trésorier <small class="aide">appliquées automatiquement par ce logiciel</small></h3>
        ${(S.session.opsAppli || []).length ? `<div class="tableau-conteneur"><table class="tab tab-dem"><tr><th>Reçue le</th><th>Opération</th><th>Détail</th><th>Statut</th><th>Résultat</th></tr>
          ${(S.session.opsAppli || []).slice(-40).reverse().map(x => `<tr><td style="white-space:nowrap">${quand(x.recueLe || x.le)}</td><td>${esc(x.libelle)}<br><span class="aide">par ${esc(x.par)}</span></td><td>${esc(x.resume || '')}</td>
            <td><span class="badge-dem ${x.statut === 'Appliquée' ? 'ok' : 'ref'}">${esc(x.statut)}</span></td><td class="dem-suite"><span class="aide">${esc(x.resultat)}</span></td></tr>`).join('')}</table></div>`
          : `<div class="alerte info">Aucune opération reçue de l'appli pour l'instant.</div>`}` : ''}`;
    const trouver = (id) => l.find(x => x.id === id);
    if ($('#dm-actu')) $('#dm-actu').onclick = () => chargerDemarches(false);
    $$('[data-dm-f]').forEach(b => b.onclick = () => { DEM.filtre = b.dataset.dmF; vueDemarches(); });
    $$('[data-dm-enc]').forEach(b => b.onclick = () => encaisserDemarche(trouver(b.dataset.dmEnc)));
    $$('[data-dm-cours]').forEach(b => b.onclick = () => statuerDemarche(trouver(b.dataset.dmCours), 'En cours', 'Votre démarche est prise en charge par le bureau.'));
    $$('[data-dm-rep]').forEach(b => b.onclick = async () => { const d = trouver(b.dataset.dmRep); const t = await texteDemarche(`Répondre à ${d.membre}`, `${esc(d.libelle)} : « ${esc(d.detail)} »`, true); if (t) statuerDemarche(d, 'Répondu', t); });
    $$('[data-dm-ref]').forEach(b => b.onclick = async () => {
      const d = trouver(b.dataset.dmRef);
      if (d.type === 'paiement' && licenceActive() && !estTresorier()) { toast('Seul le trésorier statue sur un paiement déclaré.', 'err'); return; }
      const t = await texteDemarche(`Refuser la démarche de ${d.membre}`, 'Le motif est obligatoire : il est envoyé au membre (ex. « paiement non reçu sur le compte Wave de l\'association »).', true);
      if (t) statuerDemarche(d, 'Refusée', t);
    });
    $$('[data-dm-fiche]').forEach(b => b.onclick = () => { const d = trouver(b.dataset.dmFiche), m = membres().find(x => x.ident === d.numero); if (m) editerMembre(m); else toast(`Membre ${d.numero} introuvable dans cet exercice.`, 'err'); });
  }

  // ------------------------------------------------------------ messagerie écrite du bureau (site 1.9.0) : le logiciel écrit aux membres
  const MSGS = { liste: null, le: 0, erreur: '', charge: false, filtre: 'tout', mode: 'tous', choisis: new Set(), q: '', brouillon: '' };
  const roleMsg = () => (S.user && ['tresorier', 'president', 'sg'].includes(S.user.role)) ? S.user.role : 'tresorier';
  const LIB_ROLE = { tresorier: 'Trésorier', president: 'Président', sg: 'Secrétaire général' };
  const nomMsg = () => S.user ? S.user.nom : (P()[{ tresorier: 'tresorier', president: 'president', sg: 'secretaire' }[roleMsg()]] || LIB_ROLE[roleMsg()]);
  const cleVus = () => 'msgVus|' + (P().nom || '') + '|' + roleMsg();
  function lireVus() { try { return localStorage.getItem(cleVus()) || ''; } catch (e) { return ''; } }
  function ecrireVus(v) { try { localStorage.setItem(cleVus(), v); } catch (e) { /* sans importance */ } }
  const recusMsg = () => (MSGS.liste || []).filter(x => !x.moi);
  function nonLusMsg() { const v = lireVus(); return v ? recusMsg().filter(x => x.le > v).length : 0; }
  function majCompteurMessages() {
    const a = $('#nav a[data-vue="messagerie"]'); if (!a) return;
    const n = nonLusMsg();
    let b = $('.nav-compte', a); if (!b) { b = document.createElement('span'); b.className = 'nav-compte'; a.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n); b.classList.toggle('masque', !n);
    a.title = n ? `${n} nouveau(x) message(s) de membres` : 'Messagerie du bureau';
  }
  function marquerMessagesVus() {
    const max = recusMsg().reduce((m, x) => x.le > m ? x.le : m, '');
    if (max) ecrireVus(max); else if (!lireVus()) ecrireVus(new Date(0).toISOString());
    majCompteurMessages();
  }
  async function chargerMessages(silencieux) {
    const pub = PUB(); if (!pub.url || MSGS.charge) return false;
    if (licenceActive() && !S.user) return false;
    MSGS.charge = true; if (S.vue === 'messagerie') vueMessagerie();
    const avant = nonLusMsg();
    try {
      const r = await A.messagesBoite({ url: pub.url, cle: pub.cle, role: roleMsg() });
      MSGS.liste = r.messages || []; MSGS.le = Date.now(); MSGS.erreur = '';
      if (!lireVus()) marquerMessagesVus();   // premier chargement : rien d'ancien n'est compté comme nouveau
    } catch (e) { MSGS.erreur = nettoyerErreur(e); if (!silencieux) toast(MSGS.erreur, 'err'); }
    MSGS.charge = false;
    if (S.vue === 'messagerie') { marquerMessagesVus(); vueMessagerie(); }
    else { majCompteurMessages(); const n = nonLusMsg(); if (silencieux && n > avant) toast(`💬 ${n} nouveau(x) message(s) de membres (menu Messagerie).`, 'ok'); }
    return !MSGS.erreur;
  }
  async function envoyerMessageBureau(message) {
    const pub = PUB();
    try {
      const r = await A.messagesEnvoyer({ url: pub.url, cle: pub.cle, role: roleMsg(), nom: nomMsg(), message });
      const m = r.message || {};
      const qui = m.pourTous ? 'toute l\'association' : (m.pour || []).length + ' membre(s)';
      journal('Message aux membres', `${LIB_ROLE[roleMsg()]} → ${qui} : ${String(message.texte).slice(0, 80)}`);
      toast(`Message envoyé à ${qui}. Il apparaît dans l'appli AMEDIS Asso des destinataires.`, 'ok');
      if (!message.reponseA && message.pour !== 'TOUS' && (m.pour || []).length < message.pour.length)
        toast(`${message.pour.length - (m.pour || []).length} destinataire(s) ignoré(s) : membre(s) pas encore publié(s) sur le site (publiez, puis renvoyez).`, 'err');
      await chargerMessages(true);
      return true;
    } catch (e) { toast('Message non envoyé : ' + nettoyerErreur(e), 'err'); return false; }
  }
  function vueMessagerie() {
    const pub = PUB();
    actionsEntete(pub.url ? `<button class="btn" id="ms-actu">${MSGS.charge ? 'Actualisation…' : 'Actualiser'}</button>` : '');
    if (!pub.url) {
      $('#vue').innerHTML = `<div class="alerte info">La messagerie passe par le site de consultation et l'appli Android <b>AMEDIS Asso</b>. Installez d'abord le site (menu <b>Codes QR</b>), en version 1.9.0 avec le fichier Bureau.gs.</div>`;
      return;
    }
    if (MSGS.liste === null && !MSGS.charge && !MSGS.erreur) setTimeout(() => chargerMessages(false), 0);
    const tous = membres().filter(m => m.actif !== false && m.ident).sort((a, b) => (a.nom + ' ' + a.prenoms).localeCompare(b.nom + ' ' + b.prenoms, 'fr'));
    const nomDe = (m) => `${m.nom || ''} ${m.prenoms || ''}`.trim();
    const quand = (x) => x ? new Date(x).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const l = MSGS.liste || [], f = MSGS.filtre;
    const vis = l.filter(x => f === 'tout' ? true : f === 'recus' ? !x.moi : x.moi);
    const listeMembres = () => {
      const q = norm(MSGS.q);
      const v = tous.filter(m => !q || norm(`${m.ident} ${nomDe(m)} ${m.fonction || ''} ${m.contact || ''}`).includes(q));
      return v.length ? v.map(m => `<label class="ms-membre"><input type="checkbox" data-ms-m="${esc(m.ident)}" ${MSGS.choisis.has(m.ident) ? 'checked' : ''}>
        <span><b>${esc(nomDe(m))}</b><br><span class="aide">${esc(m.ident)}${m.fonction ? ' · ' + esc(m.fonction) : ''}${m.contact ? ' · ' + esc(m.contact) : ''}</span></span></label>`).join('')
        : '<div class="aide" style="padding:10px">Aucun membre trouvé.</div>';
    };
    const puces = () => [...MSGS.choisis].map(i => tous.find(m => m.ident === i)).filter(Boolean)
      .map(m => `<span class="ms-puce">${esc(nomDe(m))} <button title="Retirer" data-ms-x="${esc(m.ident)}">×</button></span>`).join('');
    $('#vue').innerHTML = `
      <div class="carte" style="margin-bottom:14px"><p style="margin:0">Écrivez aux membres : ils reçoivent le message dans l'appli <b>AMEDIS Asso</b> (menu Messagerie) et peuvent vous répondre.</p>
        <p class="aide" style="margin:6px 0 0">Vous écrivez en tant que <b>${esc(nomMsg())} — ${LIB_ROLE[roleMsg()]}</b>. Les réponses des membres arrivent ici. Les messages vocaux se font depuis l'appli.</p></div>
      ${MSGS.erreur ? `<div class="alerte err" style="margin-bottom:12px">${esc(MSGS.erreur)}</div>` : ''}
      <div class="ms-grille">
        <div class="carte ms-ecrire">
          <h3 style="margin-top:0">Nouveau message</h3>
          <div class="groupe-btn" style="margin-bottom:10px">
            <button class="btn btn-petit ${MSGS.mode === 'tous' ? 'btn-primaire' : ''}" data-ms-mode="tous">Toute l'association (${tous.length})</button>
            <button class="btn btn-petit ${MSGS.mode === 'choix' ? 'btn-primaire' : ''}" data-ms-mode="choix">Choisir des membres${MSGS.choisis.size ? ' (' + MSGS.choisis.size + ')' : ''}</button>
          </div>
          ${MSGS.mode === 'choix' ? `<div class="ms-choix">
            <div class="barre-outils" style="margin-bottom:6px"><input class="entree" id="ms-q" placeholder="Rechercher : nom, numéro, fonction, contact" value="${esc(MSGS.q)}" style="flex:1">
              <button class="btn btn-petit" id="ms-tout">Cocher la liste</button><button class="btn btn-petit" id="ms-rien">Aucun</button></div>
            <div class="ms-liste" id="ms-liste">${listeMembres()}</div>
            <p class="aide" id="ms-nb" style="margin:6px 0 0">${MSGS.choisis.size} destinataire(s) choisi(s)</p>
            <div class="ms-puces" id="ms-puces">${puces()}</div></div>` : ''}
          <textarea class="entree" id="ms-texte" rows="6" maxlength="1500" placeholder="Votre message (1 500 caractères au plus)" style="width:100%;margin-top:10px">${esc(MSGS.brouillon)}</textarea>
          <div class="barre-outils" style="margin-top:8px"><span class="aide" id="ms-cpt">${MSGS.brouillon.length} / 1500</span><span style="flex:1"></span>
            <button class="btn btn-primaire" id="ms-envoyer">Envoyer</button></div>
        </div>
        <div>
          <div class="barre-outils" style="margin-bottom:10px">
            ${[['tout', `Tous (${l.length})`], ['recus', `Reçus (${l.filter(x => !x.moi).length})`], ['envoyes', `Envoyés (${l.filter(x => x.moi).length})`]].map(([k, lib]) => `<button class="btn btn-petit ${f === k ? 'btn-primaire' : ''}" data-ms-f="${k}">${lib}</button>`).join('')}
            <span style="flex:1"></span><span class="aide">${MSGS.charge ? 'Actualisation en cours…' : MSGS.le ? 'Mis à jour à ' + new Date(MSGS.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
          ${vis.length ? vis.map(x => `<div class="carte ms-msg ${x.moi ? 'moi' : ''}">
              <div class="ms-tete"><b>${x.moi ? 'Vous → ' + esc(x.pourNoms) : esc(x.deNom) + (x.deFonction ? ' · ' + esc(x.deFonction) : '')}</b><span class="aide">${quand(x.le)}</span></div>
              ${!x.moi && x.pourTous ? '<div class="aide">à toute l\'association</div>' : ''}
              ${x.texte ? `<div class="ms-texte">${esc(x.texte)}</div>` : ''}
              ${x.audio ? `<div class="aide">🎤 Message vocal (${Math.floor(x.duree / 60)}:${String(x.duree % 60).padStart(2, '0')}) — à écouter dans l'appli AMEDIS Asso.</div>` : ''}
              ${!x.moi && !String(x.de).startsWith('PC-') ? `<div class="groupe-btn" style="margin-top:8px"><button class="btn btn-petit btn-primaire" data-ms-rep="${esc(x.id)}">Répondre…</button></div>` : ''}
            </div>`).join('')
          : `<div class="alerte info">${MSGS.charge || MSGS.liste === null ? 'Chargement des messages…' : 'Aucun message pour l\'instant.'}</div>`}
        </div>
      </div>`;
    const trouver = (id) => l.find(x => x.id === id);
    if ($('#ms-actu')) $('#ms-actu').onclick = () => chargerMessages(false);
    $$('[data-ms-f]').forEach(b => b.onclick = () => { MSGS.filtre = b.dataset.msF; vueMessagerie(); });
    $$('[data-ms-mode]').forEach(b => b.onclick = () => { MSGS.brouillon = $('#ms-texte').value; MSGS.mode = b.dataset.msMode; vueMessagerie(); });
    const txt = $('#ms-texte');
    txt.oninput = () => { MSGS.brouillon = txt.value; $('#ms-cpt').textContent = `${txt.value.length} / 1500`; };
    const lierCases = () => $$('[data-ms-m]').forEach(c => c.onchange = () => {
      if (c.checked) MSGS.choisis.add(c.dataset.msM); else MSGS.choisis.delete(c.dataset.msM);
      $('#ms-nb').textContent = `${MSGS.choisis.size} destinataire(s) choisi(s)`;
      $('#ms-puces').innerHTML = puces(); lierPuces();
      const bt = $('[data-ms-mode="choix"]'); if (bt) bt.textContent = `Choisir des membres${MSGS.choisis.size ? ' (' + MSGS.choisis.size + ')' : ''}`;
    });
    const lierPuces = () => $$('[data-ms-x]').forEach(b => b.onclick = () => {
      MSGS.choisis.delete(b.dataset.msX); const c = $(`[data-ms-m="${CSS.escape(b.dataset.msX)}"]`); if (c) c.checked = false;
      $('#ms-nb').textContent = `${MSGS.choisis.size} destinataire(s) choisi(s)`; $('#ms-puces').innerHTML = puces(); lierPuces();
      const bt = $('[data-ms-mode="choix"]'); if (bt) bt.textContent = `Choisir des membres${MSGS.choisis.size ? ' (' + MSGS.choisis.size + ')' : ''}`;
    });
    lierPuces();
    lierCases();
    if ($('#ms-q')) $('#ms-q').oninput = (e) => { MSGS.q = e.target.value; $('#ms-liste').innerHTML = listeMembres(); lierCases(); };
    if ($('#ms-tout')) $('#ms-tout').onclick = () => { $$('[data-ms-m]').forEach(c => MSGS.choisis.add(c.dataset.msM)); MSGS.brouillon = txt.value; vueMessagerie(); };
    if ($('#ms-rien')) $('#ms-rien').onclick = () => { MSGS.choisis.clear(); MSGS.brouillon = txt.value; vueMessagerie(); };
    $('#ms-envoyer').onclick = async () => {
      const texte = txt.value.trim();
      if (!texte) { toast('Écrivez le message.', 'err'); return; }
      const pour = MSGS.mode === 'tous' ? 'TOUS' : [...MSGS.choisis].filter(i => tous.some(m => m.ident === i));
      if (pour !== 'TOUS' && !pour.length) { toast('Choisissez au moins un destinataire.', 'err'); return; }
      if (pour === 'TOUS' && !(await confirmer('Envoyer à toute l\'association ?', `Le message sera envoyé aux ${tous.length} membres actifs, dans leur appli AMEDIS Asso.`, 'Envoyer'))) return;
      const b = $('#ms-envoyer'); b.disabled = true; b.textContent = 'Envoi…';
      const ok = await envoyerMessageBureau({ texte, pour, idAppli: 'pc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
      if (ok) { MSGS.brouillon = ''; MSGS.choisis.clear(); }
      if (S.vue === 'messagerie') vueMessagerie();
    };
    $$('[data-ms-rep]').forEach(b => b.onclick = async () => {
      const x = trouver(b.dataset.msRep);
      const t = await modale({ titre: `Répondre à ${x.deNom}`, corps: `<p class="aide" style="margin-top:0">« ${esc(String(x.texte || 'Message vocal').slice(0, 300))} »</p><textarea class="entree" id="ms-rep" rows="5" maxlength="1500" style="width:100%"></textarea>`,
        apresOuverture: (md) => setTimeout(() => $('#ms-rep', md).focus(), 60),
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Envoyer la réponse', classe: 'btn-primaire', avant: (md) => { if (!$('#ms-rep', md).value.trim()) { toast('Écrivez la réponse.', 'err'); return false; } }, val: (md) => $('#ms-rep', md).value.trim() }] });
      if (t) await envoyerMessageBureau({ texte: t, reponseA: x.id, pour: [], idAppli: 'pc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
    });
  }

  // ------------------------------------------------------------ tableau de bord
  /** Carte « Répartition par genre » du tableau de bord Ensemble */
  function carteGenre(b) {
    const e = M.effectifsGenre(S.session), cp = b.cotParGenre, tc = b.totalCotisations || 0;
    const pc = (x, t) => t ? Math.round(100 * x / t) + ' %' : '–';
    const ligne = (g, lib) => `<tr class="cliquable" data-allergenre="${g}"><td>${badgeGenre({ genre: g })} <b>${lib}</b></td><td class="num">${e[g]}</td><td class="num">${pc(e[g], e.total)}</td><td class="num">${mtd(cp[g])}</td><td class="num">${pc(cp[g], tc)}</td>
      <td style="width:28%"><div class="progression"><div style="width:${tc ? Math.round(100 * cp[g] / tc) : 0}%;background:${g === 'H' ? '#2563a8' : '#be185d'}"></div></div></td></tr>`;
    return `<div class="carte" style="margin-bottom:18px"><h3>Répartition par genre <small>membres actifs et cotisations collectées — cliquez sur une ligne pour ouvrir son tableau de bord</small></h3>
      <table class="tab tab-compact"><tr><th>Genre</th><th class="num">Membres</th><th class="num">%</th><th class="num">Cotisations</th><th class="num">% du total</th><th></th></tr>
      ${ligne('H', 'Hommes')}${ligne('F', 'Femmes')}
      ${e.N || cp.N ? `<tr><td>${badgeGenre({})} Genre non renseigné</td><td class="num">${e.N}</td><td class="num">${pc(e.N, e.total)}</td><td class="num">${mtd(cp.N)}</td><td class="num">${pc(cp.N, tc)}</td><td class="aide">à compléter dans « Membres »</td></tr>` : ''}
      <tr style="font-weight:700"><td>Ensemble</td><td class="num">${e.total}</td><td class="num">100 %</td><td class="num">${mtd(tc)}</td><td class="num">100 %</td><td></td></tr></table></div>`;
  }

  /** Tableau de bord 2.0 : bandeau d'accueil avec voyant d'état */
  function bandeauAccueil(b, retard, reste) {
    const sec = SEC(), jours = (iso) => iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null;
    const dj = Math.min(...[jours(sec.derniereCopie), jours(sec.derniereGoogle)].filter(x => x !== null).concat([9999]));
    const etats = [];
    if (exerciceClos()) etats.push(['', `Exercice ${P().exercice} clôturé : consultation seule.`]);
    if (dj > 7 && membres().length) etats.push(['rouge', dj === 9999 ? "Aucune sauvegarde hors du téléphone : activez la sauvegarde Google Drive (Paramètres › Sauvegardes)." : `Dernière sauvegarde hors du téléphone il y a ${dj} jours.`]);
    if (retard.length) etats.push(['orange', `${retard.length} membre(s) pas à jour — ${mtd(reste)} à recouvrer.`]);
    if (!etats.length) etats.push(['', membres().length ? 'Tous les membres sont à jour. Bravo !' : 'Commencez par ajouter les membres.']);
    const lg = P().logo;
    return `<div class="bandeau-accueil"><div class="bandeau-logo" style="${lg ? `background-image:url('${lg}')` : ''}">${lg ? '' : esc((P().sigle || P().nom || 'A')[0])}</div>
      <div><h2>${salutation()}${S.user ? ', ' + esc(S.user.nom.split(' ').slice(-1)[0]) : ''} !</h2><p>${esc(P().nom)}${P().sigle ? ' (' + esc(P().sigle) + ')' : ''} · exercice ${esc(P().exercice)} · ${dateLongue()}</p></div>
      <div class="bandeau-etat"><span class="voyant ${etats[0][0]}"></span><span>${etats[0][1]}${etats.length > 1 ? `<br><small style="opacity:.85">+ ${etats.length - 1} autre(s) point(s) à voir</small>` : ''}</span></div></div>`;
  }
  function anneauxTableau(b, retard, reste) {
    const a = actifs().length, coll = b.totalCotisations || 0, cb = G.comparaisonBudget(S.session), st = G.statsPresence(S.session);
    const tp = Object.values(st).filter(x => x.n); const presence = (S.session.reunions || []).length && tp.length ? tp.reduce((t, x) => t + x.taux, 0) / tp.length : null;
    const caisse = G.soldesCaisses(S.session);
    return `<div class="anneaux">
      ${UI.anneau(coll + reste ? coll / (coll + reste) : 0, '#16a34a', 'Taux de recouvrement', `${mt(coll)} sur ${mt(coll + reste)} ${esc(dev())}`)}
      ${UI.anneau(a ? (a - retard.length) / a : 0, '#2563a8', 'Membres à jour', `${a - retard.length} sur ${a} membre(s) actif(s)`)}
      ${presence !== null ? UI.anneau(presence, '#d97706', 'Assiduité aux réunions', `${(S.session.reunions || []).length} réunion(s)`) : UI.anneau(cb.actif && cb.totRec.prevu ? cb.totRec.realise / cb.totRec.prevu : 0, '#d97706', 'Budget des recettes', cb.actif ? `réalisé sur ${mt(cb.totRec.prevu)} prévus` : 'saisissez le budget (Paramètres)')}
      ${UI.anneau(cb.actif && cb.totDep.prevu ? cb.totDep.realise / cb.totDep.prevu : (b.totalCotisations + b.dons ? b.depenses / (b.totalCotisations + b.dons + (b.report || 0)) : 0), '#be185d', cb.actif ? 'Budget des dépenses consommé' : 'Part des ressources dépensée', `solde ${mt(caisse.total)} ${esc(dev())} en caisse`)}
    </div>`;
  }
  const TUILES = [
    ['encaisser', 'recu', 'Encaisser', 'paiement + reçu', () => encaisserMembre(null, null)],
    ['relancer', 'whatsapp', 'Relancer', 'les pas à jour', () => { allerA('cotisations'); relancer(actifs()); }],
    ['depense', 'depenses', 'Dépense', 'nouvelle sortie', () => { allerA('depenses'); editerOperation('depenses', null); }],
    ['reunion', 'reunions', 'Réunion', 'appel et compte rendu', () => allerA('reunions')],
    ['documents', 'documents', 'Documents', 'PDF et rapports', () => allerA('documents')],
    ['qr', 'qr', 'Espace membres', 'codes QR, site', () => allerA('qr')]
  ];
  function tuilesTableau() {
    const ro = lectureSeule();
    return `<div class="raccourcis">${TUILES.filter(t => !(ro && ['encaisser', 'depense'].includes(t[0]))).map(t => `<div class="tuile" data-tuile="${t[0]}">${UI.icone(t[1])}<b>${t[2]}</b><small>${t[3]}</small></div>`).join('')}</div>`;
  }
  function vueTableau() {
    const g = S.genre, s = SG(), b = M.bilan(g ? Object.assign({}, s, { dons: [], depenses: [] }) : s), bTous = M.bilan(S.session);
    const k = (lib, val, det, cl, ico) => `<div class="kpi ${cl || ''}">${ico ? `<span class="ico-kpi">${UI.icone(ico)}</span>` : ''}<div class="lib">${lib}</div><div class="val">${val}</div><div class="det">${det || '&nbsp;'}</div></div>`;
    const n = (x, u) => `<span data-compte="${Math.round(Number(x) || 0)}">${mt(Math.round(Number(x) || 0)) || '0'}</span>${u ? `<small>${u}</small>` : ''}`;
    const inactifs = membresG().length - actifsG().length;
    const maxMois = Math.max(1, ...b.parMois.map(x => Math.max(x.recettes, x.depenses)));
    const retard = [];
    actifsG().forEach(m => { const l = cotsVisibles().filter(c => !M.situation(c, m, P()).aJour).map(c => c.court || c.nom); if (l.length) retard.push({ m, l }); });
    actionsEntete(`<button class="btn btn-primaire ecriture" id="tb-encaisser">${UI.icone('recu')} Encaisser…</button><button class="btn ecriture" id="tb-versement">Saisir des cotisations</button><button class="btn" id="tb-bilan">Bilan financier</button>`);
    const reste = cotsVisibles().reduce((t, c) => t + M.resumeCotisation(s, c).resteTotal, 0);
    $('#vue').innerHTML = `
      ${g ? '' : bandeauAccueil(b, retard, reste)}
      ${!membresG().length ? `<div class="alerte info">Aucun membre pour le moment : ajoutez-les ou importez-les dans l'écran « Membres ».</div>` : ''}
      ${g ? '' : anneauxTableau(b, retard, reste)}
      <div class="kpis k5">
        ${k(g ? M.GENRES[g] : 'Membres', n(actifsG().length), inactifs ? `${inactifs} inactif(s)` : 'tous actifs', 'bleu', g === 'H' ? 'homme' : g === 'F' ? 'femme' : 'membres')}
        ${k('Cotisations collectées', n(b.totalCotisations, esc(dev())), b.cotisations.map(c => `${esc(c.nom.replace(/^Cotisations? /i, ''))} : ${mt(c.total)}`).join(' · ') || '–', 'vert', 'cotisations')}
        ${g ? `${k('Part des cotisations', n(bTous.totalCotisations ? Math.round(100 * b.totalCotisations / bTous.totalCotisations) : 0, '%'), `sur ${mt(bTous.totalCotisations)} ${esc(dev())} collectés au total`, 'bleu', 'bilan')}
        ${k('Membres à jour', `${n(actifsG().length - retard.length)}<small>/ ${actifsG().length}</small>`, `${retard.length} pas à jour`, retard.length ? 'rouge' : 'vert', 'ok')}
        ${k('Reste à recouvrer', n(reste, esc(dev())), 'toutes cotisations', 'rouge', 'alerte')}` : `
        ${k('Dons reçus', n(b.dons, esc(dev())), `${s.dons.length} don(s)`, 'vert', 'dons')}
        ${k('Dépenses', n(b.depenses, esc(dev())), `${s.depenses.length} dépense(s)`, 'rouge', 'depenses')}
        ${k('Solde', n(b.solde, esc(dev())), b.report ? `dont report : ${mt(b.report)}` : 'recettes − dépenses', b.solde >= 0 ? 'vert' : 'rouge', 'caisses')}`}
      </div>
      ${g ? '' : tuilesTableau()}
      ${g ? `<div class="alerte info">Vue limitée aux <b>${M.GENRES[g].toLowerCase()}</b> : cotisations, membres à jour et retards de ce seul groupe. Les dons, les dépenses et le solde figurent dans le tableau de bord « Ensemble ».</div>` : carteGenre(bTous)}
      <div class="panneaux-cot">${cotsVisibles().map(c => { const r = M.resumeCotisation(s, c);
        return `<div class="carte panneau-cot" style="--c:${esc(c.couleur)}"><h3>${esc(c.nom)} <small>attendu : ${attTxt(c)}${c.mode === 'periode' ? ' à ce jour' : ''} par membre</small></h3>
          <div class="ligne"><span>Total collecté</span><b>${mtd(r.total)}</b></div>
          <div class="ligne"><span>Membres à jour</span><b><span class="badge b-ok">${r.aJour}</span></b></div>
          <div class="ligne"><span>Membres pas à jour</span><b><span class="badge b-non">${r.pasAJour}</span></b></div>
          <div class="ligne"><span>Reste à recouvrer</span><b>${mtd(r.resteTotal)}</b></div>
          <div class="progression" style="margin-top:12px"><div style="width:${Math.round(100 * r.taux)}%;background:${esc(c.couleur)}"></div></div>
          <div class="aide">${Math.round(100 * r.taux)} % des membres à jour</div>
          <div class="groupe-btn" style="margin-top:10px"><button class="btn btn-petit" data-allercot="${c.id}">Ouvrir la grille</button></div></div>`; }).join('')}</div>
      <div class="grille g2">
        <div class="carte"><h3>${g ? 'Cotisations par mois' : 'Recettes et dépenses par mois'} <small>exercice ${esc(P().exercice)}</small></h3>
          <div class="barres-mois">${b.parMois.map((x, i) => `<div class="m" style="--m:${i}" title=""${M.MOIS[i]} : recettes ${mt(x.recettes)}, dépenses ${mt(x.depenses)}"><div class="duo"><div class="r" style="height:${Math.round(150 * x.recettes / maxMois)}px"></div><div class="d" style="height:${Math.round(150 * x.depenses / maxMois)}px"></div></div><small>${M.MOIS[i].slice(0, 3)}</small></div>`).join('')}</div>
          <div class="legende"><span style="--c:#2f9e6a">${g ? 'Cotisations des ' + M.GENRES[g].toLowerCase() + ', par mois' : 'Recettes (cotisations et dons, par mois)'}</span>${g ? '' : '<span style="--c:#d1503f">Dépenses</span>'}</div></div>
        <div class="carte"><h3>Membres pas à jour <small>${retard.length} membre(s)</small></h3>
          <div class="tableau-conteneur" style="max-height:300px"><table class="tab tab-compact">
            <tr><th></th><th>Identifiant</th><th>Nom et prénoms</th><th>Contact</th><th>En retard sur</th></tr>
            ${retard.slice().sort((x, y) => M.triMembres(x.m, y.m)).map(x => `<tr class="cliquable" data-membre="${x.m.id}"><td>${vignette(x.m)}</td><td><b>${esc(x.m.ident)}</b></td><td>${esc(M.nomComplet(x.m))}</td><td>${esc(x.m.contact)}</td><td>${x.l.map(esc).join(', ')}</td></tr>`).join('') || '<tr><td colspan="5" class="aide">Tous les membres sont à jour.</td></tr>'}
          </table></div></div>
      </div>`;
    $$('[data-tuile]').forEach(t => t.onclick = () => TUILES.find(x => x[0] === t.dataset.tuile)[4]());
    $('#tb-versement').onclick = () => allerA('cotisations', { genre: S.genre });
    $('#tb-encaisser').onclick = () => encaisserMembre(null, null);
    $('#tb-bilan').onclick = () => allerA('bilan');
    $$('[data-allercot]').forEach(x => x.onclick = () => { S.cotActive = x.dataset.allercot; allerA('cotisations', { genre: S.genre }); });
    $$('[data-allergenre]').forEach(x => x.onclick = () => allerA(x.dataset.vue || 'tableau', { genre: x.dataset.allergenre }));
    $$('[data-membre]').forEach(tr => tr.onclick = () => editerMembre(membres().find(m => m.id === tr.dataset.membre)));
  }

  // ------------------------------------------------------------ membres
  function vueMembres() {
    actionsEntete(`<button class="btn btn-primaire ecriture" id="m-ajout">+ Ajouter un membre</button><button class="btn ecriture" id="m-import">Importer depuis Excel…</button><button class="btn" id="m-export">Exporter vers Excel</button><button class="btn" id="m-pdf">Liste PDF</button>`);
    $('#vue').innerHTML = `<div class="barre-outils">
        <input class="entree recherche" id="m-rech" placeholder="Rechercher (nom, identifiant, quartier, contact)…" value="${esc(S.rechercheMembre)}">
        <select class="entree" id="m-filtre"><option value="actifs">Membres actifs</option><option value="tous">Tous les membres</option><option value="inactifs">Membres inactifs</option><option value="retard">Pas à jour (au moins une cotisation)</option>${S.genre ? '' : '<option value="sansgenre">Genre non renseigné</option>'}</select>
        <span class="compteur" id="m-compteur"></span></div>
      <div class="carte" style="padding:0"><div class="tableau-conteneur" style="max-height:calc(100vh - 230px)"><table class="tab" id="m-table"></table></div></div>`;
    if (S.genre && S.filtreMembre === 'sansgenre') S.filtreMembre = 'actifs';
    $('#m-filtre').value = S.filtreMembre;
    const dessiner = () => {
      const q = norm(S.rechercheMembre);
      let l = membresG().slice().sort(M.triMembres);
      if (S.filtreMembre === 'actifs') l = l.filter(m => m.actif !== false);
      if (S.filtreMembre === 'inactifs') l = l.filter(m => m.actif === false);
      if (S.filtreMembre === 'sansgenre') l = l.filter(m => !M.genreDe(m));
      if (S.filtreMembre === 'retard') l = l.filter(m => m.actif !== false && cots().some(c => !M.situation(c, m, P()).aJour));
      if (q) l = l.filter(m => norm([m.ident, m.nom, m.prenoms, m.residence, m.contact, m.fonction].join(' ')).includes(q));
      $('#m-compteur').textContent = `${l.length} membre(s) affiché(s) sur ${membresG().length}${S.genre ? ' ' + M.GENRES[S.genre].toLowerCase() : ''}`;
      const sansG = S.genre ? 0 : membres().filter(m => m.actif !== false && !M.genreDe(m)).length;
      if (sansG) $('#m-compteur').innerHTML += ` · <a class="lien" id="m-sansg" style="cursor:pointer;text-decoration:underline">${sansG} sans genre</a> — <a class="lien" id="m-serie" style="cursor:pointer;text-decoration:underline"><b>indiquer le genre de tous</b></a>`;
      if ($('#m-serie')) $('#m-serie').onclick = genreEnSerie;
      if ($('#m-sansg')) $('#m-sansg').onclick = () => { S.filtreMembre = 'sansgenre'; $('#m-filtre').value = 'sansgenre'; dessiner(); };
      $('#m-table').innerHTML = `<tr><th></th><th>Identifiant</th><th>Nom</th><th>Prénoms</th><th class="centre">Genre</th><th>${esc(P().libelleResidence)}</th><th>Contact</th><th>Fonction</th>${cots().map(c => `<th class="centre">${esc(c.court || c.nom)}</th>`).join('')}</tr>` +
        (l.map(m => `<tr class="cliquable" data-id="${m.id}"><td>${vignette(m)}</td><td><b>${esc(m.ident)}</b>${m.actif === false ? ' <span class="badge b-inactif">inactif</span>' : ''}</td><td>${esc(m.nom)}</td><td>${esc(m.prenoms)}</td><td class="centre"><span class="bascule-genre" data-gm="${m.id}" title="Cliquer pour changer le genre (? → H → F)">${badgeGenre(m)}</span></td><td>${esc(m.residence)}</td><td>${esc(m.contact)}</td><td>${esc(m.fonction)}</td>
          ${cots().map(c => { const st = M.situation(c, m, P()); return st.nonConcerne ? `<td class="centre"><span class="badge b-inactif" title="Cotisation réservée aux ${c.public === 'H' ? 'hommes' : 'femmes'}">non concerné</span></td>` : `<td class="centre"><span class="badge ${st.aJour ? 'b-ok' : 'b-non'}" title="Versé : ${mt(st.total)} / attendu : ${mt(st.attendu)}">${st.aJour ? 'À jour' : 'Reste ' + mt(st.reste)}</span></td>`; }).join('')}</tr>`).join('')
        || `<tr><td colspan="${8 + cots().length}"><div class="vide" style="margin:10px">${membresG().length ? 'Aucun membre ne correspond.' : S.genre ? `Aucun membre enregistré comme « ${libGenre(S.genre)} ». Indiquez le genre dans la fiche de chaque membre.` : 'Aucun membre. Utilisez « Ajouter un membre » ou « Importer depuis Excel ».'}</div></td></tr>`);
      $$('#m-table tr[data-id]').forEach(tr => tr.onclick = () => editerMembre(membres().find(m => m.id === tr.dataset.id)));
      $$('#m-table [data-gm]').forEach(b => b.onclick = (e) => {
        e.stopPropagation(); if (!peutModifier()) return;
        const m = membres().find(x => x.id === b.dataset.gm); const g = M.genreDe(m);
        m.genre = g === '' ? 'H' : g === 'H' ? 'F' : ''; modifie(); dessiner();
      });
    };
    $('#m-rech').oninput = (e) => { S.rechercheMembre = e.target.value; dessiner(); };
    $('#m-filtre').onchange = (e) => { S.filtreMembre = e.target.value; dessiner(); };
    $('#m-ajout').onclick = () => editerMembre(null);
    $('#m-import').onclick = importerMembres;
    $('#m-export').onclick = exporterExcel;
    $('#m-pdf').onclick = (e) => pdf(Docs.listeMembres(SG()), e.target);
    dessiner();
  }

  async function editerMembre(m) {
    const nouveau = !m;
    const v = m ? Object.assign({}, m) : { ident: M.prochainIdent(S.session), actif: true, dateAdhesion: aujourdhui(), genre: S.genre || '' };
    let photo = v.photo || '';
    const ch = (k, l, type) => `<div class="champ"><label>${l}</label><input data-k="${k}" ${type ? `type="${type}"` : ''} value="${esc(v[k])}" class="ecriture-champ"></div>`;
    const situations = m ? `<h4 style="margin:16px 0 6px">Cotisations</h4><table class="tab tab-compact"><tr><th>Type</th><th class="num">Versé</th><th class="num">Attendu</th><th class="num">Reste</th><th>Situation</th></tr>
      ${cots().map(c => { const st = M.situation(c, m, P()); return st.nonConcerne ? `<tr><td>${esc(c.nom)}</td><td colspan="4" class="aide">Non concerné (cotisation réservée aux ${c.public === 'H' ? 'hommes' : 'femmes'})</td></tr>` : `<tr><td>${esc(c.nom)}</td><td class="num">${mt(st.total)}</td><td class="num">${mt(st.attendu)}</td><td class="num">${mt(st.reste)}</td><td><span class="badge ${st.aJour ? 'b-ok' : 'b-non'}">${st.aJour ? 'À jour' : 'Pas à jour'}</span></td></tr>`; }).join('')}</table>` : '';
    const r = await modale({ titre: nouveau ? 'Ajouter un membre' : `Membre ${m.ident || ''}`, large: true,
      corps: `<div class="form-membre"><div><div class="photo-membre" id="mb-photo">${photo ? '' : 'Pas de photo'}</div>
          ${m ? '<div class="qr-perso" id="mb-qr"></div>' : ''}
          <div class="groupe-btn" style="margin-top:8px;flex-direction:column;align-items:stretch"><button class="btn btn-petit ecriture" id="mb-photo-choix">Choisir une photo…</button><button class="btn btn-petit ecriture" id="mb-photo-suppr">Retirer la photo</button></div></div>
        <div><div class="form-grille" style="grid-template-columns:1fr 1fr">
          ${ch('ident', 'Identifiant')}${ch('fonction', 'Fonction (facultatif)')}
          ${ch('nom', 'Nom')}${ch('prenoms', 'Prénoms')}
          ${ch('residence', P().libelleResidence)}${ch('contact', 'Contact (téléphone)')}
          <div class="champ"><label>Genre</label><select data-k="genre" class="entree ecriture-champ"><option value="">— à préciser —</option><option value="H" ${M.genreDe(v) === 'H' ? 'selected' : ''}>Homme</option><option value="F" ${M.genreDe(v) === 'F' ? 'selected' : ''}>Femme</option></select></div>
          ${ch('dateAdhesion', "Date d'adhésion", 'date')}
          <div class="champ" style="grid-column:1/-1"><label class="case"><input type="checkbox" id="mb-actif" ${v.actif !== false ? 'checked' : ''} class="ecriture-champ"> Membre actif</label></div></div>
          ${situations}</div></div>`,
      apresOuverture: (md) => {
        const montrer = () => { const el = $('#mb-photo', md); el.style.backgroundImage = photo ? `url("${photo}")` : ''; el.textContent = photo ? '' : 'Pas de photo'; };
        montrer();
        $('#mb-photo-choix', md).onclick = async () => { const brut = await A.choisirImage(); if (!brut) return; const img = await reduireImage(brut, 360); if (img) { photo = img; montrer(); } };
        $('#mb-photo-suppr', md).onclick = () => { photo = ''; montrer(); };
        if (m) qrPersonnel(m, $('#mb-qr', md));
        if (lectureSeule()) $$('.ecriture-champ', md).forEach(x => x.disabled = true);
      },
      boutons: [
        ...(nouveau ? [] : [{ lib: 'Supprimer', classe: 'btn-danger ecriture', val: 'suppr', gauche: true }, { lib: 'Fiche PDF', val: 'fiche' }]),
        { lib: 'Annuler', val: null },
        ...(lectureSeule() ? [] : [{ lib: nouveau ? 'Ajouter' : 'Enregistrer', classe: 'btn-primaire', avant: (md) => {
          const ident = $('[data-k=ident]', md).value.trim(), nom = $('[data-k=nom]', md).value.trim();
          if (!nom) { toast('Indiquez le nom du membre.', 'err'); return false; }
          if (ident && membres().some(x => x !== m && norm(x.ident) === norm(ident))) { toast(`L'identifiant « ${ident} » est déjà utilisé.`, 'err'); return false; }
        }, val: (md) => { const o = {}; $$('[data-k]', md).forEach(i => o[i.dataset.k] = i.value.trim()); o.actif = $('#mb-actif', md).checked; o.photo = photo; return o; } }])
      ] });
    if (!r) return;
    if (r === 'fiche') { const d = Docs.fiches(S.session, [m]); pdf(d); return; }
    if (r === 'suppr') {
      if (!peutModifier()) return;
      const verse = cots().reduce((t, c) => t + M.totalMembre(c, m.id), 0);
      if (!await confirmer('Supprimer le membre', `Supprimer <b>${esc(M.nomComplet(m))}</b> (${esc(m.ident)}) ?${verse ? `<br><br>Ce membre a versé <b>${mtd(verse)}</b> : ses versements seront aussi supprimés et le bilan diminuera d'autant. Pour garder l'historique, décochez plutôt « Membre actif ».` : ''}`, 'Supprimer', true)) return;
      S.session.membres = membres().filter(x => x !== m);
      cots().forEach(c => { delete c.versements[m.id]; });
      modifie(); allerA(S.vue); toast('Membre supprimé.'); return;
    }
    if (!peutModifier()) return;
    r.nom = r.nom.toUpperCase();
    if (nouveau) { membres().push(Object.assign({ id: M.nouvelId('m') }, r)); toast('Membre ajouté.', 'ok'); }
    else { Object.assign(m, r); toast('Membre enregistré.', 'ok'); }
    journal(nouveau ? 'Membre ajouté' : 'Membre modifié', `${r.ident} — ${r.nom} ${r.prenoms || ''}`);
    if (!r.genre) toast('Genre non renseigné : ce membre n\'apparaît que dans les vues « Ensemble ».', 'err');
    modifie(); allerA(S.vue);
  }

  /** Code QR personnel du membre (sous sa photo) : lien secret vers son seul dossier, à envoyer uniquement à lui */
  async function qrPersonnel(m, el) {
    if (!el) return;
    M.accesMembre(m);
    const l = Publication.liens(S.session, m);
    el.innerHTML = `<div style="font-weight:600;font-size:12.5px">Accès personnel en ligne</div>
      ${l ? `<div class="qr-img">${await qrSvg(l.perso)}</div>` : '<p class="aide" style="margin:6px 0">Configurez le site dans « Codes QR » pour obtenir le lien personnel.</p>'}
      <div class="code-perso">Code personnel : <b>${esc(m.code)}</b></div>
      <div class="groupe-btn" style="flex-direction:column;align-items:stretch;gap:4px">
        ${l ? `<button class="btn btn-petit btn-primaire" id="qp-wa" title="Ouvre WhatsApp vers le numéro du membre">Envoyer par WhatsApp</button><button class="btn btn-petit" id="qp-lien">Copier le lien</button><button class="btn btn-petit" id="qp-png">Enregistrer l'image</button>` : ''}
        <button class="btn btn-petit ecriture" id="qp-renouv" title="L'ancien lien et l'ancien code ne fonctionneront plus après la prochaine publication">Nouveau code et lien</button></div>`;
    if (l) {
      $('#qp-wa', el).onclick = async () => {
        const num = Publication.numeroWhatsApp(m.contact, P().indicatif || '225'), t = encodeURIComponent(Publication.messagePersonnel(S.session, m));
        if (!num) toast("Pas de numéro valide dans le contact du membre : choisissez le destinataire dans WhatsApp.", 'err');
        await A.ouvrirLien(num ? `https://wa.me/${num}?text=${t}` : `https://wa.me/?text=${t}`);
        if (PUB().dernier && S.session.modifieLe > PUB().dernier) toast('Pensez à publier (menu Codes QR) pour que ce lien affiche les dernières données.', '');
      };
      $('#qp-lien', el).onclick = async () => { await A.copier(l.perso); toast('Lien personnel copié : envoyez-le uniquement à ce membre.', 'ok'); };
      $('#qp-png', el).onclick = async () => { const f = await A.enregistrerImage({ nom: `QR personnel ${m.ident || M.nomComplet(m)}.png`, dataUrl: await qrPng(l.perso, M.nomComplet(m), 'Mon dossier de membre — ' + (P().nom || '')) }); if (f) toast('Image enregistrée : ' + f, 'ok'); };
    }
    $('#qp-renouv', el).onclick = async () => {
      if (!peutModifier()) return;
      if (!await confirmer('Nouveau code et lien', `Un nouveau code personnel et un nouveau lien seront créés pour <b>${esc(M.nomComplet(m))}</b>. L'ancien code et l'ancien lien ne fonctionneront plus après la prochaine publication.`, 'Renouveler')) return;
      M.accesMembre(m, true); modifie(); qrPersonnel(m, el); toast('Nouveau code : ' + m.code + '. Envoyez-le au membre.', 'ok');
    };
  }

  // ------------------------------------------------------------ encaissement et reçus (1.6)
  /** Fenêtre « Encaisser » : membre, montants par cotisation et période, mode de paiement ; ajoute à la grille et émet le reçu */
  async function encaisserMembre(m0, kid0, preset) {
    if (!peutModifier()) return null;
    const actifsL = actifs().slice().sort(M.triMembres);
    const ligne = (l) => { const k = cots().find(x => x.id === l.kid) || cots()[0];
      return `<tr class="enc-l"><td><select class="entree enc-k">${cots().map(c => `<option value="${c.id}" ${c.id === k.id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select></td>
        <td><select class="entree enc-j">${k.colonnes.map((c, j) => `<option value="${j}" ${j === +l.j ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
        <td><input class="entree enc-mt" type="number" min="0" step="any" value="${l.montant || ''}" style="width:110px"></td><td class="aide enc-reste">${l.reste ? 'reste ' + mt(l.reste) : ''}</td><td><button class="btn-icone enc-suppr" title="Retirer">✕</button></td></tr>`; };
    const r = await modale({ titre: 'Encaisser un paiement', large: true,
      corps: `<div class="form-grille" style="grid-template-columns:2fr 1fr 1fr">
          <div class="champ"><label>Membre</label><input class="entree" id="enc-m" list="enc-liste" placeholder="Identifiant ou nom…" value="${m0 ? esc(m0.ident + ' — ' + M.nomComplet(m0)) : ''}"><datalist id="enc-liste">${actifsL.map(m => `<option value="${esc(m.ident + ' — ' + M.nomComplet(m))}">`).join('')}</datalist></div>
          <div class="champ"><label>Payé par</label>${selCaisse('enc-mode', (preset && preset.mode) || S.modeSaisie || caisses()[0])}</div>
          <div class="champ"><label>Date</label><input class="entree" type="date" id="enc-date" value="${(preset && preset.date) || aujourdhui()}"></div></div>
        ${preset && preset.note ? `<div class="alerte info" style="margin:8px 0">✉ ${esc(preset.note)}</div>` : ''}
        <div id="enc-sit" class="aide" style="margin:6px 0 8px"></div>
        <table class="tab tab-compact" id="enc-t"><tr><th>Cotisation</th><th>Période</th><th>Montant (${esc(dev())})</th><th></th><th></th></tr></table>
        <div class="barre-outils" style="margin-top:8px"><button class="btn btn-petit" id="enc-plus">+ Ajouter une ligne</button><span style="flex:1"></span><b id="enc-total"></b></div>
        <p class="aide">Les montants s'ajoutent aux cases de la grille des cotisations, et un reçu numéroté est émis.</p>`,
      apresOuverture: (md) => {
        const trouver = () => { const v = norm($('#enc-m', md).value); return actifsL.find(m => norm(m.ident + ' — ' + M.nomComplet(m)) === v) || actifsL.find(m => norm(m.ident) === v.split(' — ')[0]); };
        const total = () => { const t = $$('.enc-mt', md).reduce((a, i) => a + (Number(i.value) || 0), 0); $('#enc-total', md).textContent = 'Total : ' + mtd(t); };
        const brancher = () => {
          $$('.enc-l', md).forEach(tr => {
            $('.enc-k', tr).onchange = () => { const k = cots().find(x => x.id === $('.enc-k', tr).value); $('.enc-j', tr).innerHTML = k.colonnes.map((c, j) => `<option value="${j}">${esc(c)}</option>`).join(''); };
            $('.enc-mt', tr).oninput = total; $('.enc-suppr', tr).onclick = () => { tr.remove(); total(); };
          });
          total();
        };
        let dernier, presetPris = false;
        /** Démarche « paiement » : le montant déclaré est réparti sur ce qui reste à payer, cotisation déclarée d'abord */
        const repartir = (pr) => {
          let reste = Number(preset.montant) || 0; const out = [];
          for (const l of pr) { if (reste <= 0) break; const v = Math.min(Number(l.reste) || reste, reste); out.push(Object.assign({}, l, { montant: v })); reste -= v; }
          if (reste > 0) { if (out.length) out[out.length - 1].montant += reste; else out.push({ kid: kid0 || cots()[0].id, j: 0, montant: reste }); }
          return out;
        };
        const remplir = () => {
          const m = trouver();
          if ((m ? m.id : null) === dernier && $$('.enc-l', md).length) return;   // même membre : on garde les lignes en cours de saisie
          dernier = m ? m.id : null; $$('.enc-l', md).forEach(x => x.remove());
          if (!m) { $('#enc-sit', md).textContent = ''; return; }
          const pr = G.proposition(S.session, m).filter(l => !kid0 || l.kid === kid0 || true);
          pr.sort((a, b) => (b.kid === kid0) - (a.kid === kid0));
          $('#enc-sit', md).innerHTML = pr.length ? `Reste à payer : ${pr.map(l => `${esc((cots().find(c => c.id === l.kid) || {}).nom)} <b>${mt(l.reste)}</b>`).join(' · ')}` : '✅ Ce membre est à jour de toutes ses cotisations.';
          let lignesInit = pr.length ? pr : [{ kid: kid0 || cots()[0].id, j: 0, montant: '' }];
          if (preset && preset.montant && !presetPris && m0 && m.id === m0.id) { presetPris = true; lignesInit = repartir(pr.filter(l => !kid0 || l.kid === kid0).concat(pr.filter(l => kid0 && l.kid !== kid0))); }
          $('#enc-t', md).insertAdjacentHTML('beforeend', lignesInit.map(ligne).join('')); brancher();
        };
        $('#enc-m', md).onchange = remplir; $('#enc-m', md).oninput = () => { if (trouver()) remplir(); };
        $('#enc-plus', md).onclick = () => { $('#enc-t', md).insertAdjacentHTML('beforeend', ligne({ kid: kid0 || cots()[0].id, j: 0 })); brancher(); };
        remplir(); setTimeout(() => (m0 ? $('.enc-mt', md) : $('#enc-m', md)) && (m0 ? $('.enc-mt', md) : $('#enc-m', md)).focus(), 60);
        md.__trouver = trouver;
      },
      boutons: [{ lib: 'Annuler', val: null }, { lib: 'Encaisser et émettre le reçu', classe: 'btn-primaire', avant: (md) => {
        if (!md.__trouver()) { toast('Choisissez le membre dans la liste.', 'err'); return false; }
        if (!$$('.enc-mt', md).some(i => Number(i.value) > 0)) { toast('Indiquez au moins un montant.', 'err'); return false; }
      }, val: (md) => ({ m: md.__trouver(), mode: $('#enc-mode', md).value, date: $('#enc-date', md).value, lignes: $$('.enc-l', md).map(tr => ({ kid: $('.enc-k', tr).value, j: +$('.enc-j', tr).value, montant: Number($('.enc-mt', tr).value) || 0 })) }) }] });
    if (!r) return null;
    const avantAJour = cots().every(k => M.situation(k, r.m, P()).aJour);
    let recu; try { recu = G.encaisser(S.session, { membreId: r.m.id, lignes: r.lignes, mode: r.mode, date: r.date, par: parQui() }); } catch (e) { toast(nettoyerErreur(e), 'err'); return null; }
    if (!avantAJour && cots().every(k => M.situation(k, r.m, P()).aJour)) { UI.confettis(); setTimeout(() => toast(`${M.nomComplet(r.m)} est maintenant à jour de toutes ses cotisations !`, 'ok'), 400); }
    S.modeSaisie = r.mode;
    journal('Encaissement', `Reçu ${recu.num} — ${recu.ident} ${recu.nom} — ${mt(recu.total)} (${recu.mode})`);
    modifie(); if (S.vue === 'cotisations' || S.vue === 'tableau') allerA(S.vue);
    if (preset && preset.apres) await preset.apres(recu);
    actionsRecu(recu);
    return recu;
  }
  /** Après l'émission : PDF, WhatsApp, image */
  async function actionsRecu(recu) {
    const m = membres().find(x => x.id === recu.membreId);
    const v = await modale({ titre: `Reçu n° ${recu.num}`, corps: `<p style="margin-top:0">✅ Reçu émis pour <b>${esc(recu.nom)}</b> (${esc(recu.ident)}) : <b>${mtd(recu.total)}</b> payés par ${esc(recu.mode)}.</p>
        <table class="tab tab-compact">${recu.lignes.map(l => `<tr><td>${esc(l.nom)}</td><td>${esc(l.periode)}</td><td class="num">${mtd(l.montant)}</td></tr>`).join('')}</table>`,
      boutons: [{ lib: 'Fermer', val: null }, { lib: 'Image', val: 'png' }, { lib: 'WhatsApp', val: 'wa' }, { lib: 'Reçu PDF', classe: 'btn-primaire', val: 'pdf' }] });
    if (v === 'pdf') pdf(Docs.recu(S.session, recu));
    if (v === 'wa') envoyerRecuWhatsApp(recu, m);
    if (v === 'png') { const f = await A.enregistrerImage({ nom: `Reçu ${recu.num} - ${recu.nom}.png`, dataUrl: recuPng(recu) }); if (f) toast('Image enregistrée : ' + f, 'ok'); }
  }
  function texteRecu(recu) {
    return `🧾 *${P().nom || 'Association'}* — REÇU N° ${recu.num}\nDate : ${dateFr(recu.date)}\nMembre : ${recu.nom} (${recu.ident})\n` +
      recu.lignes.map(l => `• ${l.nom} — ${l.periode} : ${mt(l.montant)} ${dev()}`).join('\n') + `\n*Total : ${mt(recu.total)} ${dev()}* (${recu.mode})\nReçu par : ${recu.par || P().tresorier || 'le trésorier'}\nMerci pour votre contribution.`;
  }
  async function envoyerRecuWhatsApp(recu, m) {
    const num = Publication.numeroWhatsApp(m && m.contact, P().indicatif || '225'), t = encodeURIComponent(texteRecu(recu));
    if (!num) toast('Pas de numéro valide pour ce membre : choisissez le destinataire dans WhatsApp.', 'err');
    await A.ouvrirLien(num ? `https://wa.me/${num}?text=${t}` : `https://wa.me/?text=${t}`);
    journal('Reçu envoyé par WhatsApp', recu.num);
  }
  function recuPng(recu) {
    const W = 760, lh = 34, H = 330 + recu.lignes.length * lh, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = P().couleur || '#0f6b45'; x.fillRect(0, 0, W, 90);
    x.fillStyle = '#fff'; x.font = 'bold 28px Arial'; x.fillText(String(P().nom || 'Association').slice(0, 42), 28, 42); x.font = '20px Arial'; x.fillText(`REÇU N° ${recu.num} — ${dateFr(recu.date)}`, 28, 74);
    x.fillStyle = '#222'; x.font = '22px Arial'; x.fillText(`Membre : ${recu.nom} (${recu.ident})`, 28, 132);
    x.font = '20px Arial'; let y = 180;
    recu.lignes.forEach(l => { x.fillStyle = '#333'; x.fillText(`${l.nom} — ${l.periode}`.slice(0, 50), 28, y); x.textAlign = 'right'; x.fillText(`${mt(l.montant)} ${dev()}`, W - 28, y); x.textAlign = 'left'; y += lh; });
    x.strokeStyle = '#999'; x.beginPath(); x.moveTo(28, y - 18); x.lineTo(W - 28, y - 18); x.stroke();
    x.font = 'bold 24px Arial'; x.fillStyle = '#000'; x.fillText(`TOTAL : ${mt(recu.total)} ${dev()}`, 28, y + 16); x.font = '19px Arial'; x.fillText(`Payé par : ${recu.mode}`, 28, y + 52);
    x.fillStyle = '#555'; x.fillText(`Reçu par : ${recu.par || P().tresorier || 'le trésorier'}`, 28, y + 84); x.font = '15px Arial'; x.fillText('Document émis par AMEDIS pro Asso', 28, H - 18);
    if (recu.annule) { x.save(); x.translate(W / 2, H / 2); x.rotate(-0.3); x.fillStyle = 'rgba(200,0,0,.35)'; x.font = 'bold 80px Arial'; x.textAlign = 'center'; x.fillText('ANNULÉ', 0, 0); x.restore(); }
    return c.toDataURL('image/png');
  }
  /** Reçus d'un membre : liste, réédition, annulation ; reçu pour les versements saisis dans la grille sans reçu */
  async function recusMembre(m) {
    const l = S.session.recus.filter(r => r.membreId === m.id).slice().reverse(), sr = G.sansRecu(S.session, m.id);
    const nomK = (kid) => (cots().find(c => c.id === kid) || {}).nom || '';
    const v = await modale({ titre: `Reçus — ${M.nomComplet(m)} (${m.ident})`, large: true,
      corps: `${l.length ? `<table class="tab tab-compact"><tr><th>N°</th><th>Date</th><th>Détail</th><th>Caisse</th><th class="num">Montant</th><th></th></tr>
        ${l.map(r => `<tr${r.annule ? ' style="opacity:.55;text-decoration:line-through"' : ''}><td><b>${esc(r.num)}</b></td><td>${dateFr(r.date)}</td><td style="font-size:12px">${r.lignes.map(x => `${esc(x.nom)} ${esc(x.periode)} : ${mt(x.montant)}`).join('<br>')}${r.annule ? `<br><span style="color:var(--rouge)">Annulé : ${esc(r.annule.motif)}</span>` : ''}</td><td>${esc(r.mode)}</td><td class="num">${mt(r.total)}</td>
          <td style="white-space:nowrap"><button class="btn btn-petit" data-rp="${r.id}">PDF</button> <button class="btn btn-petit" data-rw="${r.id}">WhatsApp</button>${r.annule ? '' : ` <button class="btn btn-petit btn-danger ecriture" data-ra="${r.id}">Annuler</button>`}</td></tr>`).join('')}</table>` : '<p class="aide">Aucun reçu émis pour ce membre.</p>'}
        ${sr.length ? `<h4 style="margin:16px 0 6px">Versements saisis dans la grille sans reçu</h4><table class="tab tab-compact"><tr><th></th><th>Cotisation</th><th>Période</th><th>Caisse</th><th class="num">Montant</th></tr>
          ${sr.map((x, i) => `<tr><td><input type="checkbox" data-sr="${i}" checked></td><td>${esc(nomK(x.kid))}</td><td>${esc((cots().find(c => c.id === x.kid) || { colonnes: [] }).colonnes[x.j])}</td><td>${esc(x.mode)}</td><td class="num">${mt(x.montant)}</td></tr>`).join('')}</table>` : ''}`,
      apresOuverture: (md) => {
        $$('[data-rp]', md).forEach(b => b.onclick = (e) => pdf(Docs.recu(S.session, S.session.recus.find(r => r.id === b.dataset.rp)), e.target));
        $$('[data-rw]', md).forEach(b => b.onclick = () => envoyerRecuWhatsApp(S.session.recus.find(r => r.id === b.dataset.rw), m));
        $$('[data-ra]', md).forEach(b => b.onclick = async () => {
          if (!peutModifier()) return;
          const mot = prompt0(md, b.dataset.ra);
        });
      },
      boutons: [{ lib: 'Fermer', val: null }, ...(sr.length && !lectureSeule() ? [{ lib: 'Émettre le reçu des versements cochés', classe: 'btn-primaire', val: (md) => sr.filter((x, i) => $(`[data-sr="${i}"]`, md).checked) }] : [])] });
    if (Array.isArray(v) && v.length) {
      const modes = Array.from(new Set(v.map(x => x.mode)));
      try {
        const recu = G.creerRecu(S.session, { membreId: m.id, lignes: v, mode: modes.join(' + '), date: aujourdhui(), par: parQui() });
        journal('Reçu émis', `${recu.num} — ${recu.ident} ${recu.nom} — ${mt(recu.total)}`); modifie(); actionsRecu(recu);
      } catch (e) { toast(nettoyerErreur(e), 'err'); }
    }
  }
  /** Annulation d'un reçu (motif obligatoire), depuis la liste des reçus du membre */
  function prompt0(md, rid) {
    const r = S.session.recus.find(x => x.id === rid);
    const zone = document.createElement('div');
    zone.className = 'alerte'; zone.style.marginTop = '12px';
    zone.innerHTML = `<b>Annuler le reçu ${esc(r.num)}</b> — motif : <input class="entree" id="ra-mot" style="width:50%" placeholder="ex. erreur de saisie"> <button class="btn btn-petit btn-danger" id="ra-ok">Confirmer l'annulation</button>
      <div class="aide">L'annulation ne retire pas les montants de la grille : corrigez-les dans Cotisations si nécessaire.</div>`;
    $('.modale-corps', md.closest('.modale') || md).appendChild(zone); $('#ra-mot').focus();
    $('#ra-ok').onclick = () => {
      try { G.annulerRecu(S.session, rid, $('#ra-mot').value); } catch (e) { toast(nettoyerErreur(e), 'err'); return; }
      journal('Reçu annulé', `${r.num} — ${$('#ra-mot').value}`); modifie(); toast(`Reçu ${r.num} annulé.`, 'ok'); zone.remove();
    };
  }
  /** Relances WhatsApp des membres pas à jour (toutes cotisations) */
  async function relancer(liste) {
    const l = liste.map(m => ({ m, d: cots().filter(k => M.concerne(k, m)).map(k => ({ k, st: M.situation(k, m, P()) })).filter(x => x.st.reste > 0) })).filter(x => x.d.length);
    if (!l.length) { toast('Tous les membres de cette liste sont à jour.', 'ok'); return; }
    const lien = (m) => { const li = Publication.liens(S.session, m); return li ? li.perso : ''; };
    const message = (x) => `Bonjour ${[x.m.prenoms, x.m.nom].filter(Boolean).join(' ')},\n\nSauf erreur de notre part, il reste à régler pour l'exercice ${P().exercice} de *${P().nom || "l'association"}* :\n` +
      x.d.map(y => `• ${y.k.nom} : ${mt(y.st.reste)} ${dev()}`).join('\n') + `\n*Total : ${mt(x.d.reduce((t, y) => t + y.st.reste, 0))} ${dev()}*\n\nMerci de vous rapprocher du trésorier${P().tresorier ? ' (' + P().tresorier + ')' : ''}.` + (lien(x.m) ? `\nVotre dossier : ${lien(x.m)}` : '');
    await modale({ titre: `Relancer les membres pas à jour — ${l.length}`, large: true,
      corps: `<p class="aide" style="margin-top:0">Cliquez sur « WhatsApp » : le message est prêt, il ne reste qu'à l'envoyer. Les membres sans numéro valide ouvrent WhatsApp sans destinataire.</p>
        <div class="tableau-conteneur" style="max-height:56vh"><table class="tab tab-compact"><tr><th>Membre</th><th>Contact</th><th>Reste à payer</th><th class="num">Total</th><th>Dernière relance</th><th></th></tr>
        ${l.map((x, i) => `<tr><td><b>${esc(x.m.ident)}</b> · ${esc(M.nomComplet(x.m))}</td><td>${esc(x.m.contact || '–')}</td><td style="font-size:12px">${x.d.map(y => `${esc(y.k.nom)} : ${mt(y.st.reste)}`).join('<br>')}</td>
          <td class="num"><b>${mt(x.d.reduce((t, y) => t + y.st.reste, 0))}</b></td><td class="aide" data-dr="${i}">${x.m.derniereRelance ? dateFr(x.m.derniereRelance) : '–'}</td>
          <td style="white-space:nowrap"><button class="btn btn-petit btn-primaire" data-rl="${i}">WhatsApp</button> <button class="btn btn-petit" data-rc="${i}">Copier</button></td></tr>`).join('')}</table></div>`,
      apresOuverture: (md) => {
        $$('[data-rl]', md).forEach(b => b.onclick = async () => {
          const x = l[+b.dataset.rl], num = Publication.numeroWhatsApp(x.m.contact, P().indicatif || '225'), t = encodeURIComponent(message(x));
          await A.ouvrirLien(num ? `https://wa.me/${num}?text=${t}` : `https://wa.me/?text=${t}`);
          if (!lectureSeule()) { x.m.derniereRelance = aujourdhui(); journal('Relance WhatsApp', `${x.m.ident} ${M.nomComplet(x.m)}`); modifie(); }
          $(`[data-dr="${b.dataset.rl}"]`, md).textContent = dateFr(aujourdhui()); b.textContent = 'Envoyé ✓';
        });
        $$('[data-rc]', md).forEach(b => b.onclick = async () => { await A.copier(message(l[+b.dataset.rc])); toast('Message copié.', 'ok'); });
      }, boutons: [{ lib: 'Fermer', val: null }] });
  }

  async function importerMembres() {
    if (!peutModifier()) return;
    const r = await lireClasseur(); if (!r) return;
    if (M.estClasseurA2B(r.feuilles)) {
      const imp = M.importerA2B(r.feuilles, P().exercice);
      const deja = new Set(membres().map(m => norm(m.ident)));
      const nouveaux = imp.membres.filter(m => !deja.has(norm(m.ident)));
      const ok = await confirmer('Importer le classeur BASE_A2B', `Classeur reconnu. <b>${nouveaux.length}</b> nouveau(x) membre(s) sur ${imp.membres.length} seront ajoutés (les identifiants déjà présents sont ignorés).<br><br>Pour reprendre aussi les cotisations, dépenses et dons, utilisez plutôt « Reprendre un classeur Excel » sur l'écran d'accueil (nouvel exercice).`, 'Importer les membres');
      if (!ok) return;
      nouveaux.forEach(m => membres().push(m));
      const n = await photosImportees(r, { photos: imp.rapport.photos.filter(p => nouveaux.some(m => m.id === p.membre)) });
      modifie(); allerA('membres'); toast(`${nouveaux.length} membre(s) importé(s), dont ${n} avec photo.`, 'ok'); return;
    }
    let lm = null;
    for (const f of r.feuilles) { lm = M.importerMembresListe(f.lignes); if (lm && lm.membres.length) break; }
    if (!lm || !lm.membres.length) { toast('Aucune liste reconnue : il faut une ligne d\'en-tête avec au moins « Nom » (et si possible Prénoms, Identifiant, Quartier, Contact).', 'err'); return; }
    const deja = new Set(membres().filter(m => m.ident).map(m => norm(m.ident)));
    const nouveaux = lm.membres.filter(m => !m.ident || !deja.has(norm(m.ident)));
    if (!await confirmer('Importer des membres', `<b>${nouveaux.length}</b> membre(s) à ajouter (colonnes reconnues : ${lm.colonnes.join(', ')}).`, 'Importer')) return;
    const pre = (P().prefixeIdent || P().sigle || 'M').trim();
    nouveaux.forEach(m => { if (/^\d+$/.test(m.ident)) m.ident = `${pre} ${m.ident}`; if (!m.ident) m.ident = M.prochainIdent(S.session); m.nom = m.nom.toUpperCase(); membres().push(m); });
    modifie(); allerA('membres'); toast(`${nouveaux.length} membre(s) importé(s).`, 'ok');
  }

  // ------------------------------------------------------------ cotisations (grille)
  function vueCotisations() {
    if (!cots().length) { $('#vue').innerHTML = '<div class="vide">Aucun type de cotisation. Ajoutez-en dans « Paramètres ».</div>'; return; }
    if (!cotsVisibles().length) { $('#vue').innerHTML = `<div class="vide">Aucune cotisation ne concerne les ${M.GENRES[S.genre].toLowerCase()} (voir « Paramètres > Types de cotisation »).</div>`; return; }
    let k = cot(); if (!cotsVisibles().includes(k)) k = cotsVisibles()[0]; S.cotActive = k.id;
    actionsEntete(`<button class="btn btn-primaire ecriture" id="k-encaisser">Encaisser…</button><button class="btn" id="k-relancer">Relancer les pas à jour</button><button class="btn" id="k-ajour">Liste des membres à jour</button><button class="btn" id="k-retard">Liste des pas à jour</button><button class="btn" id="k-etat">État complet (PDF)</button>`);
    $('#vue').innerHTML = `<div class="onglets">${cotsVisibles().map(c => `<button data-kt="${c.id}" class="${c.id === k.id ? 'actif' : ''}"><span class="pastille" style="background:${esc(c.couleur)}"></span> ${esc(c.nom)}</button>`).join('')}</div>
      <div class="resume-cot" id="k-resume" style="--c:${esc(k.couleur)}"></div>
      <div class="barre-outils"><input class="entree recherche" id="k-rech" placeholder="Rechercher un membre…" value="${esc(S.rechercheCot)}">
        <select class="entree" id="k-filtre"><option value="tous">${S.genre === 'F' ? 'Toutes les femmes actives' : S.genre === 'H' ? 'Tous les hommes actifs' : 'Tous les membres actifs'}</option><option value="ajour">À jour</option><option value="retard">Pas à jour</option></select>
        <label class="aide" style="display:flex;align-items:center;gap:6px">Payé par ${selCaisse('k-mode', S.modeSaisie || caisses()[0], 'title="Mode de paiement des montants saisis dans la grille"')}</label>
        <span class="aide">Tapez le montant dans la case de la période, puis Entrée. 🧾 : reçus du membre.</span></div>
      <div class="carte" style="padding:0"><div class="tableau-conteneur" style="max-height:calc(100vh - 300px)"><table class="tab grille-cot" id="k-table"></table></div></div>`;
    $('#k-filtre').value = S.filtreCot;
    $$('[data-kt]').forEach(b => b.onclick = () => { S.cotActive = b.dataset.kt; allerA('cotisations'); });
    $('#k-ajour').onclick = (e) => pdf(Docs.situationCotisation(SG(), k, 'ajour'), e.target);
    $('#k-retard').onclick = (e) => pdf(Docs.situationCotisation(SG(), k, 'pasajour'), e.target);
    $('#k-etat').onclick = (e) => pdf(Docs.etatCotisations(SG(), k), e.target);
    $('#k-encaisser').onclick = () => encaisserMembre(null, k.id);
    $('#k-relancer').onclick = () => relancer(actifsG());
    $('#k-mode').onchange = (e) => { S.modeSaisie = e.target.value; };
    const resume = () => {
      const r = M.resumeCotisation(SG(), k);
      $('#k-resume').innerHTML = `<div><small>Montant attendu par membre</small><b>${attTxt(k)}</b></div><div><small>Total collecté</small><b>${mtd(r.total)}</b></div>
        <div><small>À jour</small><b class="vert">${r.aJour}</b></div><div><small>Pas à jour</small><b style="color:var(--rouge)">${r.pasAJour}</b></div><div><small>Reste à recouvrer</small><b>${mtd(r.resteTotal)}</b></div>
        <div style="flex:1;min-width:160px"><div class="progression"><div style="width:${Math.round(100 * r.taux)}%;background:${esc(k.couleur)}"></div></div><span class="aide">${Math.round(100 * r.taux)} % à jour</span></div>`;
      const f = $('#k-total-ligne');
      if (f) f.innerHTML = `<td class="fixe" colspan="2">TOTAL</td>${r.parColonne.map(v => `<td class="num">${v ? mt(v) : ''}</td>`).join('')}<td class="num">${mt(r.total)}</td><td class="num">${mt(r.resteTotal)}</td><td></td>`;
    };
    const ligneEtat = (m) => { const st = M.situation(k, m, P()); return [`<td class="num"><b>${mt(st.total)}</b></td>`, `<td class="num">${st.reste ? mt(st.reste) : '–'}</td>`, `<td><span class="badge ${st.aJour ? 'b-ok' : 'b-non'}">${st.aJour ? 'À jour' : 'Pas à jour'}</span></td>`]; };
    const dessiner = () => {
      const q = norm(S.rechercheCot);
      let l = actifsG().filter(m => M.concerne(k, m) || M.totalMembre(k, m.id) > 0).sort(M.triMembres);
      if (S.filtreCot === 'ajour') l = l.filter(m => M.situation(k, m, P()).aJour);
      if (S.filtreCot === 'retard') l = l.filter(m => !M.situation(k, m, P()).aJour);
      if (q) l = l.filter(m => norm([m.ident, m.nom, m.prenoms].join(' ')).includes(q));
      const ro = lectureSeule() ? 'disabled' : '';
      $('#k-table').innerHTML = `<thead><tr><th class="fixe">Membre</th><th></th>${k.colonnes.map(c => `<th class="num">${esc(c)}</th>`).join('')}<th class="num">Total</th><th class="num">Reste</th><th>Situation</th></tr></thead><tbody>
        ${l.map(m => `<tr data-m="${m.id}"><td class="fixe" style="white-space:nowrap">${S.genre ? '' : badgeGenre(m) + ' '}<b>${esc(m.ident)}</b> · ${esc(M.nomComplet(m))}</td><td style="white-space:nowrap">${vignette(m)} <button class="btn-icone" data-recus="${m.id}" title="Reçus de ce membre">🧾</button></td>
          ${k.colonnes.map((c, j) => { const v = M.valeur(k, m.id, j); return `<td><input data-j="${j}" value="${v === null ? '' : v}" class="${v === null ? '' : 'plein'}" ${ro} inputmode="decimal"></td>`; }).join('')}
          ${ligneEtat(m).join('')}</tr>`).join('') || `<tr><td colspan="${k.colonnes.length + 5}"><div class="vide" style="margin:10px">Aucun membre dans cette liste.</div></td></tr>`}</tbody>
        <tfoot><tr id="k-total-ligne"></tr></tfoot>`;
      resume();
      $$('[data-recus]').forEach(b => b.onclick = () => recusMembre(membres().find(x => x.id === b.dataset.recus)));
      const entrees = $$('#k-table input');
      entrees.forEach((inp, idx) => {
        inp.onfocus = () => inp.select();
        inp.onchange = () => {
          if (!peutModifier()) return;
          const tr = inp.closest('tr'), mid = tr.dataset.m, j = +inp.dataset.j;
          const brut = inp.value.trim(), v = M.lireMontant(brut);
          if (brut !== '' && (v === null || v < 0)) { inp.classList.add('err'); toast('Montant non reconnu.', 'err'); return; }
          inp.classList.remove('err');
          const ver = k.versements[mid] = k.versements[mid] || {}, avant = ver[j], mo = $('#k-mode') ? $('#k-mode').value : caisses()[0];
          if (v === null || v === 0) { delete ver[j]; inp.value = ''; } else { ver[j] = v; inp.value = v; k.modes = k.modes || {}; (k.modes[mid] = k.modes[mid] || {})[j] = mo; }
          { const mm = membres().find(x => x.id === mid); journal('Versement', `${k.nom} — ${mm ? mm.ident + ' ' + M.nomComplet(mm) : mid} — ${k.colonnes[j]} : ${avant === undefined ? '∅' : mt(avant)} → ${v ? mt(v) + ' (' + mo + ')' : '∅'}`); }
          if (!Object.keys(ver).length) delete k.versements[mid];
          inp.classList.toggle('plein', v !== null && v !== 0);
          const cells = tr.children, n = cells.length, e = ligneEtat(membres().find(x => x.id === mid));
          cells[n - 3].outerHTML = e[0]; tr.children[n - 2].outerHTML = e[1]; tr.children[n - 1].outerHTML = e[2];
          resume(); modifie();
        };
        inp.onkeydown = (e) => {
          const nc = k.colonnes.length;
          if (e.key === 'Enter') { e.preventDefault(); inp.blur(); const s2 = entrees[idx + nc] || entrees[idx + 1]; if (s2) s2.focus(); }
          if (e.key === 'ArrowDown') { e.preventDefault(); if (entrees[idx + nc]) entrees[idx + nc].focus(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); if (entrees[idx - nc]) entrees[idx - nc].focus(); }
        };
      });
    };
    $('#k-rech').oninput = (e) => { S.rechercheCot = e.target.value; dessiner(); };
    $('#k-filtre').onchange = (e) => { S.filtreCot = e.target.value; dessiner(); };
    dessiner();
  }

  // ------------------------------------------------------------ dépenses / dons
  function vueOperations(quoi) {
    const dep = quoi === 'depenses', liste = S.session[quoi];
    actionsEntete(`<button class="btn btn-primaire ecriture" id="o-ajout">+ ${dep ? 'Nouvelle dépense' : 'Nouveau don'}</button><button class="btn" id="o-pdf">Liste PDF</button>`);
    $('#vue').innerHTML = `<div class="barre-outils"><input class="entree recherche" id="o-rech" placeholder="Rechercher…" value="${esc(S.rechercheOp)}">
        <select class="entree" id="o-mois"><option value="">Tous les mois</option>${M.MOIS.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select>
        ${dep ? `<select class="entree" id="o-cat"><option value="">Toutes les catégories</option>${S.session.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select>` : ''}
        <span class="compteur" id="o-compteur"></span></div>
      <div class="carte" style="padding:0"><div class="tableau-conteneur" style="max-height:calc(100vh - 230px)"><table class="tab" id="o-table"></table></div></div>`;
    $('#o-mois').value = S.filtreMois; if (dep) $('#o-cat').value = S.filtreCat;
    const dessiner = () => {
      const q = norm(S.rechercheOp);
      let l = liste.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.numero).localeCompare(String(a.numero), 'fr', { numeric: true }));
      if (S.filtreMois !== '') l = l.filter(x => M.moisDe(x.date) === +S.filtreMois);
      if (dep && S.filtreCat) l = l.filter(x => x.categorie === S.filtreCat);
      if (q) l = l.filter(x => norm([x.numero, x.designation, x.categorie, x.donateur].join(' ')).includes(q));
      const tot = M.somme(l);
      $('#o-compteur').innerHTML = `${l.length} ${dep ? 'dépense(s)' : 'don(s)'} · total <b>${mtd(tot)}</b>`;
      $('#o-table').innerHTML = `<tr><th>N°</th><th>Date</th><th>Désignation</th><th>${dep ? 'Catégorie' : 'Donateur'}</th><th>Caisse</th><th class="num">Montant</th></tr>` +
        (l.map(x => `<tr class="cliquable" data-id="${x.id}"><td><b>${esc(x.numero)}</b></td><td>${dateFr(x.date)}</td><td>${esc(x.designation)}</td><td>${esc(dep ? x.categorie : x.donateur)}</td><td>${esc(x.mode || caisses()[0])}</td><td class="num"><b>${mt(x.montant)}</b></td></tr>`).join('')
        || `<tr><td colspan="6"><div class="vide" style="margin:10px">${liste.length ? 'Aucune ligne ne correspond.' : (dep ? 'Aucune dépense enregistrée.' : 'Aucun don enregistré.')}</div></td></tr>`) +
        (l.length ? `<tr style="font-weight:700"><td colspan="5" style="text-align:right">TOTAL</td><td class="num">${mtd(tot)}</td></tr>` : '');
      $$('#o-table tr[data-id]').forEach(tr => tr.onclick = () => editerOperation(quoi, liste.find(x => x.id === tr.dataset.id)));
    };
    $('#o-rech').oninput = (e) => { S.rechercheOp = e.target.value; dessiner(); };
    $('#o-mois').onchange = (e) => { S.filtreMois = e.target.value; dessiner(); };
    if (dep) $('#o-cat').onchange = (e) => { S.filtreCat = e.target.value; dessiner(); };
    $('#o-ajout').onclick = () => editerOperation(quoi, null);
    $('#o-pdf').onclick = (e) => pdf(dep ? Docs.listeDepenses(S.session) : Docs.listeDons(S.session), e.target);
    dessiner();
  }

  async function editerOperation(quoi, x) {
    const dep = quoi === 'depenses', liste = S.session[quoi], nouveau = !x;
    const v = x ? Object.assign({}, x) : { numero: M.prochainNumero(liste, dep ? 'Dépense' : 'Don'), date: aujourdhui(), categorie: S.session.categories[0] };
    const r = await modale({ titre: nouveau ? (dep ? 'Nouvelle dépense' : 'Nouveau don') : `${v.numero}`,
      corps: `<div class="form-grille" style="grid-template-columns:1fr 1fr">
        <div class="champ"><label>N°</label><input data-k="numero" value="${esc(v.numero)}" class="ecriture-champ"></div>
        <div class="champ"><label>Date</label><input data-k="date" type="date" value="${esc(v.date)}" class="ecriture-champ"></div>
        <div class="champ plein"><label>Désignation</label><input data-k="designation" value="${esc(v.designation)}" class="ecriture-champ" placeholder="${dep ? 'ex. Achat de matériel de bureau' : 'ex. Don du parrain'}"></div>
        ${dep ? `<div class="champ"><label>Catégorie</label><select data-k="categorie" class="ecriture-champ">${S.session.categories.map(c => `<option ${c === v.categorie ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`
              : `<div class="champ"><label>Donateur (facultatif)</label><input data-k="donateur" value="${esc(v.donateur)}" class="ecriture-champ"></div>`}
        <div class="champ"><label>Montant (${esc(dev())})</label><input data-k="montant" type="number" min="0" step="any" value="${esc(v.montant)}" class="ecriture-champ"></div>
        <div class="champ"><label>${dep ? 'Payé par (caisse)' : 'Reçu par (caisse)'}</label><select data-k="mode" class="ecriture-champ">${caisses().map(c => `<option ${c === (v.mode || caisses()[0]) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>`,
      apresOuverture: (md) => { if (lectureSeule()) $$('.ecriture-champ', md).forEach(i => i.disabled = true); },
      boutons: [...(nouveau ? [] : [{ lib: 'Supprimer', classe: 'btn-danger ecriture', val: 'suppr', gauche: true }]), { lib: 'Annuler', val: null },
        ...(lectureSeule() ? [] : [{ lib: nouveau ? 'Ajouter' : 'Enregistrer', classe: 'btn-primaire', avant: (md) => {
          if (!$('[data-k=designation]', md).value.trim()) { toast('Indiquez la désignation.', 'err'); return false; }
          if (!(Number($('[data-k=montant]', md).value) > 0)) { toast('Indiquez un montant supérieur à 0.', 'err'); return false; }
        }, val: (md) => { const o = {}; $$('[data-k]', md).forEach(i => o[i.dataset.k] = i.dataset.k === 'montant' ? Number(i.value) : i.value.trim()); return o; } }])] });
    if (!r) return;
    if (!peutModifier()) return;
    if (r === 'suppr') {
      if (!await confirmer('Supprimer', `Supprimer <b>${esc(x.numero)}</b> — ${esc(x.designation)} (${mtd(x.montant)}) ?`, 'Supprimer', true)) return;
      S.session[quoi] = liste.filter(y => y !== x); journal(dep ? 'Dépense supprimée' : 'Don supprimé', `${x.numero} — ${x.designation} — ${mt(x.montant)}`); modifie(); allerA(S.vue); toast('Ligne supprimée.'); return;
    }
    if (nouveau) liste.push(Object.assign({ id: M.nouvelId(dep ? 'p' : 'd') }, r)); else Object.assign(x, r);
    journal(nouveau ? (dep ? 'Dépense ajoutée' : 'Don ajouté') : (dep ? 'Dépense modifiée' : 'Don modifié'), `${r.numero} — ${r.designation} — ${mt(r.montant)} (${r.mode})`);
    modifie(); allerA(S.vue); toast(nouveau ? (dep ? 'Dépense ajoutée.' : 'Don ajouté.') : 'Modification enregistrée.', 'ok');
  }

  // ------------------------------------------------------------ bilan
  function vueBilan() {
    const b = M.bilan(S.session);
    actionsEntete('<button class="btn btn-primaire" id="b-pdf">Bilan financier (PDF)</button><button class="btn" id="b-imp">Imprimer…</button><button class="btn" id="b-xls">Exporter vers Excel</button>');
    const cats = Object.keys(b.parCategorie), nr = b.nonReparti.recettes || b.nonReparti.depenses, avecGenre = membres().some(m => M.genreDe(m));
    const reserve = (x) => { const c = cots().find(y => y.id === x.id); return c && (c.public === 'H' || c.public === 'F'); };
    $('#vue').innerHTML = `<div class="grille g3" style="margin-bottom:18px">
        <div class="carte"><h3>Ressources</h3><div class="solde-grand pos">${mtd(b.report + b.recettes)}</div><div class="aide">${b.report ? `dont report de l'exercice précédent : ${mtd(b.report)}` : 'cotisations et dons'}</div></div>
        <div class="carte"><h3>Dépenses</h3><div class="solde-grand neg">${mtd(b.depenses)}</div><div class="aide">${S.session.depenses.length} dépense(s)</div></div>
        <div class="carte"><h3>Solde</h3><div class="solde-grand ${b.solde >= 0 ? 'pos' : 'neg'}">${mtd(b.solde)}</div><div class="aide">${b.solde >= 0 ? 'excédent' : 'déficit'}</div></div></div>
      <div class="grille g2">
        <div class="carte"><h3>Recettes</h3><table class="tab tab-compact">
          ${b.report ? `<tr><td>Report de l'exercice précédent</td><td class="num">${mtd(b.report)}</td></tr>` : ''}
          ${b.cotisations.map(x => `<tr><td>${esc(x.nom)}</td><td class="num">${mtd(x.total)}</td></tr>${avecGenre && !reserve(x) ? `<tr class="sous-ligne"><td>dont hommes</td><td class="num">${mtd(x.parGenre.H)}</td></tr><tr class="sous-ligne"><td>dont femmes</td><td class="num">${mtd(x.parGenre.F)}</td></tr>${x.parGenre.N ? `<tr class="sous-ligne"><td>dont genre non renseigné</td><td class="num">${mtd(x.parGenre.N)}</td></tr>` : ''}` : ''}`).join('')}
          <tr><td>Dons reçus</td><td class="num">${mtd(b.dons)}</td></tr>
          <tr style="font-weight:700"><td>TOTAL DES RESSOURCES</td><td class="num">${mtd(b.report + b.recettes)}</td></tr></table></div>
        <div class="carte"><h3>Dépenses par catégorie</h3><table class="tab tab-compact">
          ${cats.map(c => `<tr><td>${esc(c)}</td><td class="num">${mtd(b.parCategorie[c])}</td></tr>`).join('') || '<tr><td class="aide">Aucune dépense</td></tr>'}
          <tr style="font-weight:700"><td>TOTAL DES DÉPENSES</td><td class="num">${mtd(b.depenses)}</td></tr></table></div></div>
      ${avecGenre ? `<div class="carte" style="margin-top:18px"><h3>Cotisations par genre</h3><table class="tab tab-compact"><tr><th>Type de cotisation</th><th class="num">Hommes</th><th class="num">Femmes</th>${b.cotParGenre.N ? '<th class="num">Non renseigné</th>' : ''}<th class="num">Total</th></tr>
        ${b.cotisations.map(x => `<tr><td>${esc(x.nom)}</td><td class="num">${mtd(x.parGenre.H)}</td><td class="num">${mtd(x.parGenre.F)}</td>${b.cotParGenre.N ? `<td class="num">${mtd(x.parGenre.N)}</td>` : ''}<td class="num"><b>${mtd(x.total)}</b></td></tr>`).join('')}
        <tr style="font-weight:700"><td>TOTAL</td><td class="num">${mtd(b.cotParGenre.H)}</td><td class="num">${mtd(b.cotParGenre.F)}</td>${b.cotParGenre.N ? `<td class="num">${mtd(b.cotParGenre.N)}</td>` : ''}<td class="num">${mtd(b.totalCotisations)}</td></tr></table></div>` : ''}
      ${(() => { const sc = G.soldesCaisses(S.session), cb = G.comparaisonBudget(S.session);
        return `<div class="grille g2" style="margin-top:18px"><div class="carte"><h3>Où est l'argent <small>solde par caisse</small></h3><table class="tab tab-compact">
          ${sc.caisses.map(c => `<tr><td>${esc(c.nom)}</td><td class="num">${mtd(c.solde)}</td></tr>`).join('')}<tr style="font-weight:700"><td>TOTAL (= solde)</td><td class="num">${mtd(sc.total)}</td></tr></table></div>
          <div class="carte"><h3>Budget prévu et réalisé</h3>${cb.actif ? `<table class="tab tab-compact"><tr><th></th><th class="num">Prévu</th><th class="num">Réalisé</th><th class="num">Taux</th></tr>
            <tr><td>Recettes</td><td class="num">${mtd(cb.totRec.prevu)}</td><td class="num">${mtd(cb.totRec.realise)}</td><td class="num">${cb.totRec.prevu ? Math.round(100 * cb.totRec.realise / cb.totRec.prevu) + ' %' : '–'}</td></tr>
            <tr><td>Dépenses</td><td class="num">${mtd(cb.totDep.prevu)}</td><td class="num">${mtd(cb.totDep.realise)}</td><td class="num">${cb.totDep.prevu ? Math.round(100 * cb.totDep.realise / cb.totDep.prevu) + ' %' : '–'}</td></tr></table>` : '<p class="aide">Aucun budget saisi. Le trésorier peut le saisir dans Paramètres › Budget.</p>'}</div></div>`; })()}
      <div class="carte" style="margin-top:18px"><h3>Mouvements par mois <small>toutes les cotisations, dons et dépenses ; le total est égal aux recettes et aux dépenses</small></h3>
        <div class="tableau-conteneur"><table class="tab tab-compact"><tr><th></th>${M.MOIS.map(m => `<th class="num">${m.slice(0, 4)}.</th>`).join('')}${nr ? '<th class="num" title="Versements sans mois (colonnes « Versement 1 »…) et opérations sans date">Non réparti</th>' : ''}<th class="num">Total</th></tr>
        <tr><td><b>Recettes</b></td>${b.parMois.map(x => `<td class="num">${x.recettes ? mt(x.recettes) : ''}</td>`).join('')}${nr ? `<td class="num">${b.nonReparti.recettes ? mt(b.nonReparti.recettes) : ''}</td>` : ''}<td class="num"><b>${mt(b.parMois.reduce((t, x) => t + x.recettes, 0) + b.nonReparti.recettes)}</b></td></tr>
        <tr><td><b>Dépenses</b></td>${b.parMois.map(x => `<td class="num">${x.depenses ? mt(x.depenses) : ''}</td>`).join('')}${nr ? `<td class="num">${b.nonReparti.depenses ? mt(b.nonReparti.depenses) : ''}</td>` : ''}<td class="num"><b>${mt(b.parMois.reduce((t, x) => t + x.depenses, 0) + b.nonReparti.depenses)}</b></td></tr></table></div></div>`;
    $('#b-pdf').onclick = (e) => pdf(Docs.bilan(S.session), e.target);
    $('#b-imp').onclick = (e) => imprimer(Docs.bilan(S.session), e.target);
    $('#b-xls').onclick = exporterExcel;
  }

  // ------------------------------------------------------------ documents
  // ------------------------------------------------------------ caisses (1.6)
  function vueCaisses() {
    const sc = G.soldesCaisses(S.session), b = M.bilan(S.session);
    actionsEntete(`<button class="btn btn-primaire ecriture" id="c-transfert">+ Transfert entre caisses</button><button class="btn ecriture" id="c-gerer">Caisses et report…</button><button class="btn" id="c-pdf">Situation des caisses (PDF)</button>`);
    const tr = S.session.transferts.slice().sort((a, x) => String(x.date).localeCompare(String(a.date)));
    $('#vue').innerHTML = `<div class="caisses-grille">${sc.caisses.map(c => `<div class="caisse ${c.solde < 0 ? 'neg' : ''}"><small>${esc(c.nom)}</small><b>${mtd(c.solde)}</b></div>`).join('')}
        <div class="caisse" style="border-top-color:#1b2a4a"><small>Total (= solde du bilan)</small><b>${mtd(sc.total)}</b>${Math.abs(sc.total - b.solde) > 0.5 ? `<span class="aide" style="color:var(--rouge)">écart avec le bilan : ${mtd(sc.total - b.solde)}</span>` : ''}</div></div>
      <div class="carte"><h3>Détail par caisse</h3><table class="tab tab-compact"><tr><th>Caisse</th><th class="num">Report</th><th class="num">Entrées</th><th class="num">Sorties</th><th class="num">Transferts reçus</th><th class="num">Transferts envoyés</th><th class="num">Solde</th></tr>
        ${sc.caisses.map(c => `<tr><td><b>${esc(c.nom)}</b></td><td class="num">${mt(c.report)}</td><td class="num">${mt(c.entrees)}</td><td class="num">${mt(c.sorties)}</td><td class="num">${mt(c.transfertsIn)}</td><td class="num">${mt(c.transfertsOut)}</td><td class="num"><b>${mt(c.solde)}</b></td></tr>`).join('')}</table>
        <p class="aide">Entrées : cotisations (selon le mode de paiement saisi) et dons. Sorties : dépenses. Comparez chaque solde avec l'argent réellement en caisse, le relevé Wave / Mobile Money ou le relevé bancaire.</p></div>
      <div class="carte"><h3>Transferts entre caisses <small>dépôt en banque, retrait Wave…</small></h3>
        ${tr.length ? `<table class="tab tab-compact"><tr><th>Date</th><th>De</th><th>Vers</th><th>Libellé</th><th class="num">Montant</th><th></th></tr>${tr.map(t => `<tr><td>${dateFr(t.date)}</td><td>${esc(t.de)}</td><td>${esc(t.vers)}</td><td>${esc(t.libelle)}</td><td class="num">${mt(t.montant)}</td><td><button class="btn-icone ecriture" data-tsup="${t.id}" title="Supprimer">✕</button></td></tr>`).join('')}</table>` : '<p class="aide">Aucun transfert.</p>'}</div>`;
    $('#c-pdf').onclick = (e) => pdf(Docs.caisses(S.session), e.target);
    $('#c-transfert').onclick = async () => {
      if (!peutModifier()) return;
      const r = await modale({ titre: 'Transfert entre caisses', corps: `<div class="form-grille"><div class="champ"><label>De</label>${selCaisse('t-de', caisses()[0])}</div><div class="champ"><label>Vers</label>${selCaisse('t-vers', caisses().find(c => /banque/i.test(c)) || caisses()[1])}</div>
          <div class="champ"><label>Montant (${esc(dev())})</label><input class="entree" id="t-mt" type="number" min="0" step="any"></div><div class="champ"><label>Date</label><input class="entree" id="t-date" type="date" value="${aujourdhui()}"></div>
          <div class="champ plein"><label>Libellé</label><input class="entree" id="t-lib" placeholder="ex. Dépôt à la banque"></div></div>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Enregistrer', classe: 'btn-primaire', avant: (md) => { try { G.ajouterTransfert({ transferts: [], params: P() }, { de: $('#t-de', md).value, vers: $('#t-vers', md).value, montant: $('#t-mt', md).value }); } catch (e) { toast(nettoyerErreur(e), 'err'); return false; } },
          val: (md) => ({ de: $('#t-de', md).value, vers: $('#t-vers', md).value, montant: $('#t-mt', md).value, date: $('#t-date', md).value, libelle: $('#t-lib', md).value.trim() }) }] });
      if (!r) return;
      const t = G.ajouterTransfert(S.session, r); journal('Transfert entre caisses', `${t.de} → ${t.vers} : ${mt(t.montant)}`); modifie(); vueCaisses();
    };
    $$('[data-tsup]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return; const t = S.session.transferts.find(x => x.id === b.dataset.tsup);
      if (!await confirmer('Supprimer le transfert', `${esc(t.de)} → ${esc(t.vers)} : ${mtd(t.montant)} ?`, 'Supprimer', true)) return;
      S.session.transferts = S.session.transferts.filter(x => x !== t); journal('Transfert supprimé', `${t.de} → ${t.vers} : ${mt(t.montant)}`); modifie(); vueCaisses();
    });
    $('#c-gerer').onclick = async () => {
      if (!peutModifier()) return;
      const rep = P().reportCaisses || {};
      const r = await modale({ titre: 'Caisses et report de l\'exercice précédent', corps: `<div class="champ"><label>Caisses (une par ligne)</label><textarea class="entree" id="g-l" rows="6" style="width:100%">${esc(caisses().join('\n'))}</textarea></div>
          <p class="aide">La première caisse est la caisse par défaut (paiements sans mode précisé).</p>
          <h4 style="margin:12px 0 6px">Répartition du report (${mtd(P().reportSolde || 0)})</h4><table class="tab tab-compact">${caisses().map(c => `<tr><td>${esc(c)}</td><td><input class="entree" type="number" step="any" data-rc="${esc(c)}" value="${esc(rep[c] || '')}" style="width:140px"></td></tr>`).join('')}</table>
          <p class="aide">La part du report non répartie est comptée dans la caisse par défaut.</p>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Enregistrer', classe: 'btn-primaire', val: (md) => ({ l: $('#g-l', md).value.split('\n').map(x => x.trim()).filter(Boolean), rep: Object.fromEntries($$('[data-rc]', md).filter(i => i.value !== '').map(i => [i.dataset.rc, Number(i.value) || 0])) }) }] });
      if (!r) return;
      if (!r.l.length) { toast('Gardez au moins une caisse.', 'err'); return; }
      P().caisses = Array.from(new Set(r.l)); P().reportCaisses = r.rep; journal('Caisses modifiées', P().caisses.join(', ')); modifie(); vueCaisses();
    };
  }

  // ------------------------------------------------------------ réunions, présences, amendes (1.6)
  function vueReunions(opts) {
    const l = S.session.reunions.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (opts && opts.reunion) { const u = S.session.reunions.find(x => x.id === opts.reunion); if (u) return feuillePresence(u); }
    actionsEntete(`<button class="btn btn-primaire ecriture" id="u-ajout">+ Nouvelle réunion</button><button class="btn" id="u-stats">Assiduité des membres (PDF)</button>`);
    const st = (u) => { const c = { P: 0, R: 0, A: 0, E: 0 }; Object.values(u.presences || {}).forEach(x => { if (c[x] !== undefined) c[x]++; }); return c; };
    $('#vue').innerHTML = l.length ? `<div class="grille g3">${l.map(u => { const c = st(u), am = Object.entries(u.presences || {}).reduce((t, [, x]) => t + (Number((u.amendes || {})[x]) || 0), 0);
      return `<div class="carte reunion-carte" data-u="${u.id}"><h3>${esc(u.objet)} <small>${dateFr(u.date)}${u.lieu ? ' · ' + esc(u.lieu) : ''}</small></h3>
        <div class="aide">Présents <b>${c.P}</b> · en retard <b>${c.R}</b> · absents <b>${c.A}</b> · excusés <b>${c.E}</b></div>
        <div class="aide">${am ? `Amendes : <b>${mtd(am)}</b>` : 'Pas d\'amende'}${u.pv ? ' · compte rendu rédigé' : ''}</div></div>`; }).join('')}</div>`
      : `<div class="vide">Aucune réunion enregistrée. Cliquez sur « + Nouvelle réunion » pour faire l'appel et, si l'association en a, calculer les amendes d'absence ou de retard.</div>`;
    $$('[data-u]').forEach(c => c.onclick = () => feuillePresence(S.session.reunions.find(x => x.id === c.dataset.u)));
    $('#u-stats').onclick = (e) => pdf(Docs.assiduite(S.session), e.target);
    $('#u-ajout').onclick = async () => {
      if (!peutModifier()) return;
      const der = l[0];
      const r = await modale({ titre: 'Nouvelle réunion', corps: `<div class="form-grille"><div class="champ"><label>Date</label><input class="entree" type="date" id="nu-date" value="${aujourdhui()}"></div>
          <div class="champ"><label>Objet</label><input class="entree" id="nu-obj" value="Réunion mensuelle"></div><div class="champ plein"><label>Lieu</label><input class="entree" id="nu-lieu" value="${esc(der ? der.lieu : P().siege || '')}"></div>
          <div class="champ"><label>Amende pour absence (${esc(dev())})</label><input class="entree" type="number" min="0" id="nu-a" value="${der ? der.amendes.A || '' : ''}" placeholder="0 = pas d'amende"></div>
          <div class="champ"><label>Amende pour retard (${esc(dev())})</label><input class="entree" type="number" min="0" id="nu-r" value="${der ? der.amendes.R || '' : ''}" placeholder="0 = pas d'amende"></div></div>
          <p class="aide">Les amendes s'ajoutent automatiquement à la cotisation « Amendes (réunions) » de chaque membre concerné ; elles se paient comme les autres cotisations.</p>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Créer et faire l\'appel', classe: 'btn-primaire', val: (md) => ({ date: $('#nu-date', md).value, objet: $('#nu-obj', md).value.trim() || 'Réunion', lieu: $('#nu-lieu', md).value.trim(), amendes: { A: $('#nu-a', md).value, R: $('#nu-r', md).value } }) }] });
      if (!r) return;
      const u = G.ajouterReunion(S.session, r); journal('Réunion créée', `${u.objet} du ${dateFr(u.date)}`); modifie(); feuillePresence(u);
    };
  }
  function feuillePresence(u) {
    S.vue = 'reunions';
    actionsEntete(`<button class="btn" id="fp-retour">← Toutes les réunions</button><button class="btn" id="fp-emarg">Feuille d'émargement (PDF)</button><button class="btn btn-primaire" id="fp-pv">Compte rendu (PDF)</button>`);
    const l = actifs().slice().sort(M.triMembres), ro = lectureSeule() ? 'disabled' : '';
    $('#titre-vue').textContent = `${u.objet} — ${dateFr(u.date)}`;
    $('#vue').innerHTML = `<div class="grille g2" style="align-items:start"><div class="carte"><h3>Appel <small>${l.length} membre(s) actif(s)</small></h3>
        <div class="barre-outils"><button class="btn btn-petit ecriture" id="fp-tous">Tous présents</button><input class="entree recherche" id="fp-rech" placeholder="Rechercher…"><span class="compteur" id="fp-cpt"></span></div>
        <div class="tableau-conteneur" style="max-height:calc(100vh - 320px)"><table class="tab tab-compact" id="fp-t">${l.map(m => `<tr data-m="${m.id}" data-q="${esc(norm(m.ident + ' ' + M.nomComplet(m)))}"><td><b>${esc(m.ident)}</b> · ${esc(M.nomComplet(m))}</td>
          <td><span class="pres-sel">${Object.entries(G.STATUTS).map(([k2, lib]) => `<label class="${k2}" title="${lib}"><input type="radio" name="p-${m.id}" value="${k2}" ${(u.presences || {})[m.id] === k2 ? 'checked' : ''} ${ro}><span>${k2}</span></label>`).join('')}</span></td></tr>`).join('')}</table></div>
        <p class="aide">P présent · R en retard · A absent · E excusé. Amendes : absence ${mtd(u.amendes.A || 0)}, retard ${mtd(u.amendes.R || 0)}.</p></div>
      <div class="carte"><h3>Réunion</h3><div class="form-grille">
          <div class="champ"><label>Date</label><input class="entree ecriture-champ" type="date" data-u="date" value="${esc(u.date)}"></div><div class="champ"><label>Objet</label><input class="entree ecriture-champ" data-u="objet" value="${esc(u.objet)}"></div>
          <div class="champ"><label>Lieu</label><input class="entree ecriture-champ" data-u="lieu" value="${esc(u.lieu)}"></div><div class="champ"></div>
          <div class="champ"><label>Amende absence</label><input class="entree ecriture-champ" type="number" min="0" data-ua="A" value="${esc(u.amendes.A || '')}"></div><div class="champ"><label>Amende retard</label><input class="entree ecriture-champ" type="number" min="0" data-ua="R" value="${esc(u.amendes.R || '')}"></div>
          <div class="champ plein"><label>Compte rendu / procès-verbal (ordre du jour, décisions…)</label><textarea class="entree ecriture-champ" data-u="pv" rows="12" style="width:100%">${esc(u.pv || '')}</textarea></div></div>
        <div class="groupe-btn"><button class="btn btn-danger ecriture" id="fp-suppr">Supprimer la réunion</button></div></div></div>`;
    const compter = () => { const c = { P: 0, R: 0, A: 0, E: 0 }; Object.values(u.presences).forEach(x => c[x] !== undefined && c[x]++); $('#fp-cpt').textContent = `P ${c.P} · R ${c.R} · A ${c.A} · E ${c.E} · non renseignés ${l.length - c.P - c.R - c.A - c.E}`; };
    const changer = () => { G.majAmendes(S.session); modifie(); compter(); };
    $$('#fp-t input[type=radio]').forEach(i => i.onchange = () => { if (!peutModifier()) return; u.presences[i.name.slice(2)] = i.value; changer(); });
    $('#fp-tous').onclick = () => { if (!peutModifier()) return; l.forEach(m => { u.presences[m.id] = 'P'; }); journal('Appel', `${u.objet} du ${dateFr(u.date)} : tous présents`); changer(); feuillePresence(u); };
    $('#fp-rech').oninput = (e) => { const q = norm(e.target.value); $$('#fp-t tr').forEach(tr => { tr.style.display = !q || tr.dataset.q.includes(q) ? '' : 'none'; }); };
    $$('[data-u]', $('#vue')).forEach(i => { if (i.tagName === 'DIV') return; i.onchange = () => { if (!peutModifier()) return; u[i.dataset.u] = i.value; modifie(); }; });
    $$('[data-ua]').forEach(i => i.onchange = () => { if (!peutModifier()) return; u.amendes[i.dataset.ua] = Number(i.value) || 0; journal('Amendes de réunion', `${u.objet} : absence ${mt(u.amendes.A)}, retard ${mt(u.amendes.R)}`); changer(); });
    $('#fp-retour').onclick = () => allerA('reunions');
    $('#fp-emarg').onclick = (e) => pdf(Docs.emargement(S.session, u), e.target);
    $('#fp-pv').onclick = (e) => pdf(Docs.compteRendu(S.session, u), e.target);
    $('#fp-suppr').onclick = async () => {
      if (!peutModifier()) return;
      if (!await confirmer('Supprimer la réunion', `Supprimer « ${esc(u.objet)} » du ${dateFr(u.date)} et ses présences ? Les amendes correspondantes seront retirées.`, 'Supprimer', true)) return;
      S.session.reunions = S.session.reunions.filter(x => x !== u); journal('Réunion supprimée', `${u.objet} du ${dateFr(u.date)}`); G.majAmendes(S.session); modifie(); allerA('reunions');
    };
    if (lectureSeule()) $$('#vue .ecriture-champ').forEach(x => { x.disabled = true; });
    bandeauRole(); compter();
  }

  // ------------------------------------------------------------ solidarité (1.6)
  function vueSolidarite() {
    const l = S.session.evenements.slice().reverse();
    actionsEntete(`<button class="btn btn-primaire ecriture" id="ev-ajout">+ Nouvel événement</button>`);
    $('#vue').innerHTML = (l.length ? `<div class="grille g2">${l.map(ev => { const r = G.resumeEvenement(S.session, ev);
      return `<div class="carte" style="border-top:4px solid #6d28d9"><h3>${esc(G.TYPES_EVT[ev.type])} — ${esc(ev.libelle)} <small>${dateFr(ev.date)}</small></h3>
        ${ev.beneficiaire ? `<div class="aide">Bénéficiaire : <b>${esc(ev.beneficiaire)}</b></div>` : ''}
        <table class="tab tab-compact"><tr><td>Contribution demandée par membre</td><td class="num">${mtd(ev.contribution)}</td></tr><tr><td>Collecté</td><td class="num"><b>${mtd(r.collecte)}</b> / ${mtd(r.attendu)}</td></tr>
          <tr><td>Membres ayant contribué</td><td class="num">${r.aJour} (${r.pasAJour} pas encore)</td></tr><tr><td>Aide remise</td><td class="num">${ev.aide ? `${mtd(ev.aide.montant)} le ${dateFr(ev.aide.date)} (${esc(ev.aide.mode)})` : '–'}</td></tr>
          <tr style="font-weight:700"><td>Solde de l'événement</td><td class="num">${mtd(r.solde)}</td></tr></table>
        <div class="groupe-btn" style="margin-top:10px">${r.k ? `<button class="btn btn-petit" data-ev-cot="${r.k.id}">Saisir les contributions</button>` : ''}${ev.aide ? '' : `<button class="btn btn-petit btn-primaire ecriture" data-ev-aide="${ev.id}">Remettre l'aide…</button>`}<button class="btn btn-petit" data-ev-pdf="${ev.id}">Situation (PDF)</button></div></div>`; }).join('')}</div>`
      : `<div class="vide">Aucun événement de solidarité. Pour un décès, une naissance, un mariage ou une maladie : « + Nouvel événement » crée la contribution demandée à chaque membre (suivie comme une cotisation) puis enregistre l'aide remise (dépense « Solidarité »).</div>`);
    $$('[data-ev-cot]').forEach(b => b.onclick = () => { S.cotActive = b.dataset.evCot; allerA('cotisations', { genre: '' }); });
    $$('[data-ev-pdf]').forEach(b => b.onclick = (e) => pdf(Docs.evenement(S.session, S.session.evenements.find(x => x.id === b.dataset.evPdf)), e.target));
    $$('[data-ev-aide]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return; const ev = S.session.evenements.find(x => x.id === b.dataset.evAide), r0 = G.resumeEvenement(S.session, ev);
      const r = await modale({ titre: `Remettre l'aide — ${ev.libelle}`, corps: `<div class="form-grille"><div class="champ"><label>Montant remis (${esc(dev())})</label><input class="entree" id="ai-mt" type="number" min="0" value="${r0.collecte || ''}"></div>
          <div class="champ"><label>Date</label><input class="entree" type="date" id="ai-date" value="${aujourdhui()}"></div><div class="champ"><label>Payé par</label>${selCaisse('ai-mode', caisses()[0])}</div></div>
          <p class="aide">Une dépense de catégorie « Solidarité » est enregistrée automatiquement.</p>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Enregistrer l\'aide', classe: 'btn-primaire', val: (md) => ({ montant: Number($('#ai-mt', md).value), date: $('#ai-date', md).value, mode: $('#ai-mode', md).value }) }] });
      if (!r) return;
      try { const d = G.remettreAide(S.session, ev.id, r); journal('Aide de solidarité remise', `${ev.libelle} : ${mt(d.montant)} (${d.mode})`); } catch (e) { toast(nettoyerErreur(e), 'err'); return; }
      modifie(); vueSolidarite(); toast('Aide enregistrée (dépense « Solidarité »).', 'ok');
    });
    $('#ev-ajout').onclick = async () => {
      if (!peutModifier()) return;
      const r = await modale({ titre: 'Nouvel événement de solidarité', corps: `<div class="form-grille"><div class="champ"><label>Type</label><select class="entree" id="ne-type">${Object.entries(G.TYPES_EVT).map(([k2, v]) => `<option value="${k2}">${v}</option>`).join('')}</select></div>
          <div class="champ"><label>Date</label><input class="entree" type="date" id="ne-date" value="${aujourdhui()}"></div>
          <div class="champ plein"><label>Objet</label><input class="entree" id="ne-lib" placeholder="ex. Décès de la mère de M. …"></div>
          <div class="champ plein"><label>Bénéficiaire (membre ou famille)</label><input class="entree" id="ne-ben" list="ne-liste"><datalist id="ne-liste">${actifs().map(m => `<option value="${esc(M.nomComplet(m) + ' (' + m.ident + ')')}">`).join('')}</datalist></div>
          <div class="champ"><label>Contribution demandée à chaque membre (${esc(dev())})</label><input class="entree" type="number" min="0" id="ne-mt" placeholder="0 = pas de collecte"></div></div>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Créer', classe: 'btn-primaire', avant: (md) => { if (!$('#ne-lib', md).value.trim()) { toast("Indiquez l'objet.", 'err'); return false; } },
          val: (md) => ({ type: $('#ne-type', md).value, date: $('#ne-date', md).value, libelle: $('#ne-lib', md).value.trim(), beneficiaire: $('#ne-ben', md).value.trim(), contribution: Number($('#ne-mt', md).value) || 0 }) }] });
      if (!r) return;
      const ev = G.creerEvenement(S.session, r); journal('Événement de solidarité', `${G.TYPES_EVT[ev.type]} — ${ev.libelle} (contribution ${mt(ev.contribution)})`); modifie(); vueSolidarite();
      if (ev.kid) toast(`Contribution « ${ev.libelle} » ajoutée aux cotisations de chaque membre.`, 'ok');
    };
  }

  // ------------------------------------------------------------ codes QR et publication en ligne
  const PUB = () => P().publication;
  async function qrSvg(texte, niveau) {
    const m = await A.qrMatrice(niveau ? { texte, niveau } : texte), n = m.length, b = 3, t = n + 2 * b; let d = '';
    m.forEach((l, r) => { for (let c = 0; c < n; c++) if (l[c] === '1') d += `M${c + b},${r + b}h1v1h-1z`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  /** Image PNG du code QR avec un titre (pour WhatsApp ou l'impression) */
  async function qrPng(texte, titre, sousTitre) {
    const m = await A.qrMatrice(texte), n = m.length, px = Math.max(8, Math.floor(640 / (n + 8))), q = (n + 8) * px, h = q + 150;
    const c = document.createElement('canvas'); c.width = q; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, q, h); x.fillStyle = '#000';
    m.forEach((l, r) => { for (let k = 0; k < n; k++) if (l[k] === '1') x.fillRect((k + 4) * px, (r + 4) * px, px, px); });
    x.textAlign = 'center'; x.fillStyle = '#0f6b45'; x.font = 'bold 30px Arial'; x.fillText(String(titre || '').slice(0, 40), q / 2, q + 50);
    x.fillStyle = '#333'; x.font = '22px Arial'; x.fillText(String(sousTitre || '').slice(0, 60), q / 2, q + 90);
    x.fillStyle = '#777'; x.font = '18px Arial'; x.fillText('Consultation seulement — AMEDIS pro Asso', q / 2, q + 128);
    return c.toDataURL('image/png');
  }
  let minuteriePub = null;
  /** Publie la copie en lecture seule sur le site. silencieux : publication automatique après enregistrement */
  async function publier(silencieux) {
    const pub = PUB();
    if (!pub.url) { if (!silencieux) toast("Indiquez d'abord l'adresse du site (menu Codes QR).", 'err'); return false; }
    if (lectureSeule() && !zoneRestreinte()) { if (!silencieux) toast('Lecture seule : publication impossible.', 'err'); return false; }
    try {
      // codes d'accès et liens (dossier, carte) créés avant la publication et ENREGISTRÉS : un lien publié ou imprimé ne doit jamais changer
      let nouveaux = false;
      for (const m of membres()) { const av = [m.code, m.jeton, m.jetonCarte].join('|'); M.accesMembre(m); if ([m.code, m.jeton, m.jetonCarte].join('|') !== av) nouveaux = true; }
      if (nouveaux) { modifie(); await enregistrer(); }
      const donnees = await Publication.construire(S.session, reduireImage);
      const r = await A.publier({ url: pub.url, cle: pub.cle, donnees });
      pub.dernier = donnees.publieLe; pub.dernierEtat = `Publié : ${r.membres} membre(s)`;
      if (!silencieux) toast(`Publication réussie : ${r.membres} membre(s) consultables en ligne.`, 'ok');
      if (S.vue === 'qr') vueQR();
      return true;
    } catch (e) {
      pub.dernierEtat = 'Échec : ' + nettoyerErreur(e);
      if (!silencieux) toast('Publication impossible : ' + nettoyerErreur(e), 'err');
      if (S.vue === 'qr') vueQR();
      return false;
    }
  }
  /** Après chaque enregistrement : republie automatiquement (au plus une fois par minute) */
  function publicationAuto() {
    const pub = S.session && PUB();
    if (!pub || !pub.url || !pub.auto) return;
    if (pub.dernier && S.session.modifieLe && S.session.modifieLe <= pub.dernier) return;
    clearTimeout(minuteriePub); minuteriePub = setTimeout(() => { if (S.session) publier(true); }, 60000);
  }
  async function vueQR() {
    const pub = PUB(), l = Publication.liens(S.session);
    actionsEntete(l ? `<button class="btn btn-primaire" id="q-publier">Publier maintenant</button>` : '');
    const etat = pub.dernierEtat ? `<div class="pub-etat ${/^Échec/.test(pub.dernierEtat) ? 'err' : 'ok'}">${esc(pub.dernierEtat)}${pub.dernier && !/^Échec/.test(pub.dernierEtat) ? ` — le ${new Date(pub.dernier).toLocaleString('fr-FR')}` : ''}${pub.dernier && S.session.modifieLe > pub.dernier ? ' — <b>des modifications ne sont pas encore publiées</b>' : ''}</div>` : '';
    const config = `<div class="carte"><h3>1. Site de consultation en ligne <small>une seule fois, sur le compte Google de l'association</small></h3>
      <ol class="etapes-site">
        <li><button class="btn btn-petit" id="q-fichiers">Enregistrer les fichiers du site…</button> (Code.gs, Page.html, Demandes.gs et Bureau.gs) — ou <button class="btn btn-petit" id="q-copier-code">Copier Code.gs</button> <button class="btn btn-petit" id="q-copier-page">Copier Page.html</button> <button class="btn btn-petit" id="q-copier-dem">Copier Demandes.gs</button> <button class="btn btn-petit" id="q-copier-bur">Copier Bureau.gs</button></li>
        <li>Ouvrez <a class="lien" id="q-script" style="cursor:pointer;text-decoration:underline">script.google.com</a> &gt; <b>Nouveau projet</b>. Remplacez le contenu de <code>Code.gs</code> par celui du fichier Code.gs ; ajoutez un fichier HTML nommé <code>Page</code> et collez-y Page.html ; ajoutez deux fichiers de script (Fichier &gt; + &gt; Script) nommés <code>Demandes</code> et <code>Bureau</code>, et collez-y Demandes.gs et Bureau.gs (démarches, messagerie et opérations du trésorier depuis l'appli Android). Enregistrez. <span class="aide">Site déjà installé : remplacez Code.gs, ajoutez les fichiers manquants, puis Déployer &gt; Gérer les déploiements &gt; crayon &gt; Nouvelle version.</span></li>
        <li><b>Déployer &gt; Nouveau déploiement</b> &gt; type <b>Application Web</b> ; « Exécuter en tant que » : <b>Moi</b> ; « Qui a accès » : <b>Tout le monde</b>. Autorisez l'accès demandé (votre Google Drive, où la copie publiée est rangée).</li>
        <li>Copiez l'<b>adresse de l'application Web</b> (elle se termine par <code>/exec</code>) et collez-la ci-dessous.</li></ol>
      <div class="barre-outils" style="margin-top:10px"><input class="entree" id="q-url" style="flex:1" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(pub.url)}">
        <button class="btn" id="q-tester">Tester</button><button class="btn btn-primaire" id="q-url-ok">Enregistrer l'adresse</button></div>
      <label class="case" style="margin-top:10px"><input type="checkbox" id="q-auto" ${pub.auto ? 'checked' : ''}> Publier automatiquement après chaque modification (au plus une fois par minute, si Internet est disponible)</label>
      ${etat}</div>`;
    const carte = (k, titre, texte) => `<div class="carte qr-carte"><h3>${titre}</h3><p class="aide" style="min-height:38px">${texte}</p><div class="qr-img" id="qr-${k}"></div>
      <div class="lien-qr">${esc(l[k])}</div>
      <div class="groupe-btn"><button class="btn btn-petit" data-q-msg="${k}">Copier le message WhatsApp</button><button class="btn btn-petit" data-q-lien="${k}">Copier le lien</button>
        <button class="btn btn-petit" data-q-png="${k}">Enregistrer l'image</button><button class="btn btn-petit" data-q-affiche="${k}">Affiche PDF</button></div></div>`;
    $('#vue').innerHTML = config + (l ? `<h3 class="titre-section" style="margin-top:22px">2. Codes QR à publier dans le groupe WhatsApp de l'association</h3><div class="qr-grille">
        ${carte('asso', 'Espace des membres', "Tableau de bord, liste des membres (sans contacts), totaux des cotisations, dépenses, dons et bilan, plus son propre dossier. Les contacts et cotisations des autres membres restent confidentiels. Accès : identifiant + code personnel.")}
        ${carte('membre', 'Ma fiche de membre', 'Uniquement les informations du membre : identité, cotisations et versements. Accès : identifiant + code personnel.')}
        <div class="carte"><h3>3. Lien personnel et codes personnels</h3>
          <p>Le <b>troisième code QR</b> est dans le dossier de chaque membre (Membres &gt; clic sur le membre), sous sa photo : il donne accès à son seul dossier, <b>sans identifiant</b>. Envoyez-le uniquement à ce membre (bouton WhatsApp du dossier).</p>
          <p>Chaque membre a un <b>code personnel</b> à 4 chiffres, nécessaire avec son identifiant pour les deux codes QR ci-contre. Après 5 essais incorrects, l'identifiant est bloqué 15 minutes.</p>
          <div class="groupe-btn"><button class="btn" id="q-codes">Codes d'accès des membres (PDF à découper)</button></div>
          <p class="aide">Les données en ligne sont celles de la dernière publication. Personne ne peut rien modifier par le site.</p></div></div>`
      : `<div class="alerte info" style="margin-top:16px">Les trois codes QR apparaîtront ici dès que l'adresse du site sera enregistrée.</div>`);
    // branchements
    $('#q-fichiers').onclick = async () => { const t = await A.sourcesSite(); const d = await A.enregistrerFichiersSite({ texte: t }); if (d) toast('Fichiers du site enregistrés dans : ' + d, 'ok'); };
    $('#q-copier-code').onclick = async () => { const t = await A.sourcesSite(); await A.copier(t['Code.gs']); toast('Code.gs copié : collez-le dans le projet Apps Script.', 'ok'); };
    $('#q-copier-page').onclick = async () => { const t = await A.sourcesSite(); await A.copier(t['Page.html']); toast('Page.html copié : collez-le dans le fichier HTML « Page ».', 'ok'); };
    $('#q-copier-bur').onclick = async () => { const t = await A.sourcesSite(); await A.copier(t['Bureau.gs']); toast('Bureau.gs copié : collez-le dans le fichier de script « Bureau ».', 'ok'); };
    $('#q-copier-dem').onclick = async () => { const t = await A.sourcesSite(); await A.copier(t['Demandes.gs']); toast('Demandes.gs copié : collez-le dans le fichier de script « Demandes ».', 'ok'); };
    $('#q-script').onclick = () => A.ouvrirLien('https://script.google.com/home/projects/create');
    $('#q-tester').onclick = async () => { try { const r = await A.publicationTester($('#q-url').value.trim()); toast(`Site joignable (version ${r.version})${r.publie ? ', données déjà publiées' : ', aucune donnée publiée pour l\'instant'}.`, 'ok'); } catch (e) { toast(nettoyerErreur(e), 'err'); } };
    $('#q-url-ok').onclick = async () => {
      const u = $('#q-url').value.trim();
      if (u && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u) && !/^http:\/\/127\.0\.0\.1:\d+\/exec$/.test(u)) { toast('Adresse incorrecte : elle doit ressembler à https://script.google.com/macros/s/…/exec', 'err'); return; }
      pub.url = u; modifie(); toast(u ? 'Adresse enregistrée. Cliquez sur « Publier maintenant ».' : 'Adresse retirée.', 'ok'); vueQR();
    };
    $('#q-auto').onchange = (e) => { pub.auto = e.target.checked; modifie(); };
    if (!l) return;
    $('#q-publier').onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Publication…'; await publier(false); };
    for (const k of ['asso', 'membre']) $('#qr-' + k).innerHTML = await qrSvg(l[k]);
    const titres = { asso: 'Espace des membres', membre: 'Ma fiche de membre' };
    $$('[data-q-msg]').forEach(b => b.onclick = async () => { await A.copier(Publication.messageGeneral(S.session, b.dataset.qMsg)); toast('Message copié : collez-le dans le groupe WhatsApp (avec l\'image du code QR).', 'ok'); });
    $$('[data-q-lien]').forEach(b => b.onclick = async () => { await A.copier(l[b.dataset.qLien]); toast('Lien copié.', 'ok'); });
    $$('[data-q-png]').forEach(b => b.onclick = async () => { const k = b.dataset.qPng; const f = await A.enregistrerImage({ nom: `QR ${titres[k]} - ${P().nom || 'association'}.png`, dataUrl: await qrPng(l[k], P().nom || 'Association', titres[k]) }); if (f) toast('Image enregistrée : ' + f, 'ok'); });
    $$('[data-q-affiche]').forEach(b => b.onclick = async () => { const k = b.dataset.qAffiche; pdf(Docs.afficheQR(S.session, titres[k], await qrSvg(l[k]), k === 'asso' ? 'Tableau de bord, membres, totaux des cotisations, dépenses, dons et bilan de l\'association, et votre propre dossier (les cotisations et contacts des autres membres sont confidentiels).' : 'Votre identité, vos cotisations et vos versements.', l[k]), b); });
    $('#q-codes').onclick = (e) => pdf(Docs.codesAcces(S.session), e.target);
  }

  function vueDocuments() {
    actionsEntete('<button class="btn" id="d-dossier">Ouvrir le dossier des PDF</button><button class="btn" id="d-xls">Exporter tout vers Excel</button>');
    $('#d-dossier').onclick = () => A.ouvrirDossier('pdf');
    $('#d-xls').onclick = exporterExcel;
    const selG = (id) => `<select class="entree" id="${id}" title="Genre"><option value="">Ensemble</option><option value="H">Hommes</option><option value="F">Femmes</option></select>`;
    const selCot = (id) => `<select class="entree" id="${id}">${cots().map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}</select>`;
    const doc = (id, ico, titre, texte, extra) => `<div class="doc"><h4><span class="icone">${ico}</span>${titre}</h4><p>${texte}</p>${extra ? `<div class="opts">${extra}</div>` : ''}
      <div class="opts"><button class="btn btn-primaire btn-petit" data-pdf="${id}">Créer le PDF</button><button class="btn btn-petit" data-imp="${id}">Imprimer…</button></div></div>`;
    $('#vue').innerHTML = `<h3 class="titre-section">Membres</h3><div class="docs" style="margin-bottom:24px">
        ${doc('membres', '☺', 'Liste des membres', 'Identifiant, nom, prénoms, genre, lieu de résidence et contact des membres actifs : ensemble, hommes ou femmes.', selG('d-g-membres'))}
        ${doc('cartes', '▭', 'Cartes de membre', 'Cartes au format carte bancaire (8 par page), logo en fond : photo, identité, numéros d\'urgence du Président, du SG et du Trésorier, et code QR vers la fiche d\'identité en ligne du membre (sans informations financières) ; ensemble, hommes ou femmes.', selG('d-g-cartes'))}
        ${doc('assiduite', '☑', 'Assiduité aux réunions', 'Présences, retards, excuses, absences, taux de présence et amendes de chaque membre.')}
        ${doc('fiches', '▣', 'Fiches des membres', 'Une page par membre : photo, identité et détail de ses cotisations ; ensemble, hommes ou femmes.', `${selG('d-g-fiches')}<select class="entree" id="d-fiches"><option value="tous">Tous les membres actifs</option><option value="retard">Membres pas à jour</option><option value="un">Un membre…</option></select><input class="entree masque" id="d-fiche-id" placeholder="Identifiant" style="width:120px">`)}
      </div>
      <h3 class="titre-section">Cotisations</h3><div class="docs" style="margin-bottom:24px">
        ${doc('ajour', '✔', 'Membres à jour', 'Liste des membres à jour de la cotisation choisie, avec le montant cotisé.', selCot('d-cot-ajour') + selG('d-g-ajour'))}
        ${doc('retard', '✖', 'Membres pas à jour', 'Liste des membres en retard, avec le reste à payer.', selCot('d-cot-retard') + selG('d-g-retard'))}
        ${doc('etat', '▦', 'État des cotisations', 'Grille complète des versements par période, totaux et situation (format paysage).', selCot('d-cot-etat') + selG('d-g-etat'))}
      </div>
      <h3 class="titre-section">Finances</h3><div class="docs">
        ${doc('depenses', '↘', 'Liste des dépenses', 'Toutes les dépenses de l\'exercice avec le montant total.')}
        ${doc('dons', '♥', 'Liste des dons', 'Tous les dons reçus avec le montant total.')}
        ${doc('bilan', '⚖', 'Bilan financier', 'Recettes (cotisations détaillées par genre), dépenses par catégorie, solde par caisse, budget et mouvements par mois, signé du trésorier et du président.')}
        ${doc('caisses', '▤', 'Situation des caisses', 'Solde de chaque caisse (espèces, Wave, Mobile Money, banque…), transferts et tableau de contrôle.')}
        ${doc('recus', '🧾', 'Registre des reçus', 'Tous les reçus numérotés de l\'exercice, y compris les reçus annulés.')}
        ${doc('journal', '☰', 'Journal des opérations', 'Qui a fait quoi et quand : encaissements, modifications, dépenses, clôture…')}
      </div>
      <h3 class="titre-section" style="margin-top:24px">Assemblée générale</h3><div class="docs">
        ${doc('ag', '★', 'Rapport à l\'assemblée générale', 'Effectifs, cotisations par genre, vie associative, finances, caisses, budget, membres pas à jour, avec la comparaison à l\'exercice précédent.')}
      </div>`;
    $('#d-fiches').onchange = (e) => $('#d-fiche-id').classList.toggle('masque', e.target.value !== 'un');
    $$('[data-pdf]').forEach(b => b.onclick = () => produire(b.dataset.pdf, 'pdf', b));
    $$('[data-imp]').forEach(b => b.onclick = () => produire(b.dataset.imp, 'imp', b));
  }
  function documentPour(id) {
    const s = S.session, kc = (sel) => cots().find(c => c.id === ($(sel) ? $(sel).value : '')) || cot();
    const sg = (sel) => M.sousSession(s, $(sel) ? $(sel).value : '');
    if (id === 'membres') return Docs.listeMembres(sg('#d-g-membres'));
    if (id === 'ajour') return Docs.situationCotisation(sg('#d-g-ajour'), kc('#d-cot-ajour'), 'ajour');
    if (id === 'retard') return Docs.situationCotisation(sg('#d-g-retard'), kc('#d-cot-retard'), 'pasajour');
    if (id === 'etat') return Docs.etatCotisations(sg('#d-g-etat'), kc('#d-cot-etat'));
    if (id === 'depenses') return Docs.listeDepenses(s);
    if (id === 'dons') return Docs.listeDons(s);
    if (id === 'bilan') return Docs.bilan(s);
    if (id === 'caisses') return Docs.caisses(s);
    if (id === 'recus') return Docs.registreRecus(s);
    if (id === 'journal') return Docs.journal(s);
    if (id === 'assiduite') return Docs.assiduite(s);
    if (id === 'ag') return Docs.rapportAG(s);
    if (id === 'cartes') return cartesMembres(sg('#d-g-cartes'));
    if (id === 'fiches') {
      const sf = sg('#d-g-fiches'), choix = $('#d-fiches').value; let l = sf.membres.filter(m => m.actif !== false).sort(M.triMembres);
      if (choix === 'retard') l = l.filter(m => cots().some(c => !M.situation(c, m, P()).aJour));
      if (choix === 'un') { const v = norm($('#d-fiche-id').value); if (!v) return { vide: "Indiquez l'identifiant du membre." }; l = sf.membres.filter(m => norm(m.ident) === v); if (!l.length) return { vide: sf.genre ? `Aucun membre « ${libGenre(sf.genre)} » avec cet identifiant.` : 'Aucun membre avec cet identifiant.' }; }
      if (!l.length && sf.genre) return { vide: `Aucun membre « ${libGenre(sf.genre)} » : indiquez le genre dans la fiche de chaque membre.` };
      return Docs.fiches(sf, l);
    }
    return null;
  }
  const contactsUrgence = () => M.contactsUrgence(S.session);
  async function cartesMembres(sf) {
    const l = sf.membres.filter(m => m.actif !== false).sort(M.triMembres);
    if (!l.length) return { vide: sf.genre ? `Aucun membre « ${libGenre(sf.genre)} ».` : 'Aucun membre actif.' };
    // code QR = lien de la carte : page en ligne avec l'identité du membre et les numéros d'urgence, sans aucune information financière
    const qr = {}; let nouveau = false;
    if (Publication.liens(S.session, l[0])) {
      for (const m of l) { const avant = m.code; M.accesMembre(m); if (m.code !== avant) nouveau = true; const li = Publication.liens(S.session, m); if (li && li.carte) qr[m.id] = await qrSvg(li.carte); }
      if (nouveau) { modifie(); await enregistrer(); }
      // les cartes ne fonctionnent qu'une fois leurs liens publiés : publication immédiate si nécessaire
      const pub = PUB();
      if (nouveau || !pub.dernier || (S.session.modifieLe && S.session.modifieLe > pub.dernier)) {
        toast('Publication sur le site pour activer les codes QR des cartes…', '');
        if (!(await publier(true))) toast("Attention : publication impossible (Internet ?). Les codes QR des cartes ne fonctionneront qu'après « Publier maintenant » (menu Codes QR).", 'err');
        else toast('Site mis à jour : les codes QR des cartes sont actifs.', 'ok');
      }
    } else toast("Cartes sans code QR : le site en ligne n'est pas configuré (menu Codes QR).", '');
    return Docs.cartes(sf, l, qr, contactsUrgence());
  }
  async function produire(id, mode, bouton) {
    let d;
    try { d = await documentPour(id); } catch (e) { toast('Erreur de préparation : ' + e.message, 'err'); return; }
    return mode === 'pdf' ? pdf(d, bouton) : imprimer(d, bouton);
  }
  async function pdf(d, bouton) {
    if (!d || d.vide) { toast(d && d.vide ? d.vide : 'Aucune donnée pour ce document.', 'err'); return; }
    const lib = bouton ? bouton.textContent : ''; if (bouton) { bouton.disabled = true; bouton.textContent = 'Préparation…'; }
    try {
      const p = await A.genererPDF({ html: d.html, nomFichier: d.nom, sousDossier: `Exercice ${P().exercice}`, paysage: d.paysage, piedPage: d.pied });
      toast('PDF créé : ' + p.split(/[\\/]/).pop(), 'ok');
    } catch (e) { toast('Échec : ' + nettoyerErreur(e), 'err'); }
    finally { if (bouton) { bouton.disabled = false; bouton.textContent = lib; } }
  }
  async function imprimer(d, bouton) {
    if (!d || d.vide) { toast(d && d.vide ? d.vide : 'Aucune donnée pour ce document.', 'err'); return; }
    try { const r = await A.imprimer({ html: d.html, paysage: d.paysage }); if (r && r.ok) toast("Document envoyé à l'imprimante.", 'ok'); }
    catch (e) { toast('Échec : ' + nettoyerErreur(e), 'err'); }
  }

  async function exporterExcel() {
    const s = S.session, b = M.bilan(s);
    const tete = ['Identifiant', 'Nom', 'Prénoms', 'Genre', P().libelleResidence, 'Contact', 'Fonction', "Date d'adhésion", 'Actif'];
    const feuilles = [{ nom: 'Membres', lignes: [tete, ...membres().slice().sort(M.triMembres).map(m => [m.ident, m.nom, m.prenoms, libGenre(M.genreDe(m)), m.residence, m.contact, m.fonction, m.dateAdhesion, m.actif === false ? 'Non' : 'Oui'])], largeurs: [12, 18, 24, 9, 22, 16, 16, 14, 8] }];
    cots().forEach(k => feuilles.push({ nom: (k.court || k.nom).slice(0, 28), lignes: [['Identifiant', 'Nom et prénoms', 'Genre', ...k.colonnes, 'Total', 'Attendu', 'Reste', 'Situation'],
      ...actifs().filter(m => M.concerne(k, m) || M.totalMembre(k, m.id) > 0).sort(M.triMembres).map(m => { const st = M.situation(k, m, P()); return [m.ident, M.nomComplet(m), libGenre(M.genreDe(m)), ...k.colonnes.map((c, j) => { const v = M.valeur(k, m.id, j); return v === null ? '' : v; }), st.total, st.attendu, st.reste, st.aJour ? 'À jour' : 'Pas à jour']; })],
      largeurs: [12, 30, 9, ...k.colonnes.map(() => 10), 10, 10, 10, 12] }));
    feuilles.push({ nom: 'Dépenses', lignes: [['N°', 'Date', 'Désignation', 'Catégorie', 'Montant'], ...s.depenses.map(x => [x.numero, dateFr(x.date), x.designation, x.categorie, Number(x.montant) || 0])], largeurs: [12, 12, 40, 24, 12] });
    feuilles.push({ nom: 'Dons', lignes: [['N°', 'Date', 'Désignation', 'Donateur', 'Montant'], ...s.dons.map(x => [x.numero, dateFr(x.date), x.designation, x.donateur, Number(x.montant) || 0])], largeurs: [12, 12, 40, 24, 12] });
    feuilles.push({ nom: 'Bilan', lignes: [[`${P().nom} — bilan de l'exercice ${P().exercice}`, ''], ['Report', b.report], ...b.cotisations.flatMap(c => [[c.nom, c.total], ['   dont hommes', c.parGenre.H], ['   dont femmes', c.parGenre.F], ...(c.parGenre.N ? [['   dont genre non renseigné', c.parGenre.N]] : [])]), ['Dons', b.dons], ['Total des ressources', b.report + b.recettes], ['Total des dépenses', b.depenses], ['SOLDE', b.solde]], largeurs: [40, 16] });
    try { const p = await A.exporterExcel({ nom: `${nomExercice(P())}`, feuilles }); if (p) toast('Classeur Excel créé : ' + p.split(/[\\/]/).pop(), 'ok'); }
    catch (e) { toast('Export impossible : ' + nettoyerErreur(e), 'err'); }
  }

  // ------------------------------------------------------------ paramètres
  function vueParametres() {
    actionsEntete(`<button class="btn" id="p-copie">Enregistrer une copie…</button><button class="btn" id="p-sauv">Dossier des sauvegardes</button>`);
    $('#p-copie').onclick = async () => { const r = await A.enregistrerSous({ nom: nomExercice(P()) + ' copie', donnees: S.session }); if (r) toast('Copie enregistrée.', 'ok'); };
    $('#p-sauv').onclick = () => A.ouvrirDossier('sauvegardes');
    const ong = [['association', "Association et documents"], ['cotisations', 'Types de cotisation'], ['depenses', 'Catégories de dépenses'], ['exercice', 'Exercice'], ['budget', 'Budget'], ['journal', 'Journal'], ['sauvegardes', 'Sauvegardes'], ['securite', 'Sécurité'], ...(licenceActive() ? [['utilisateurs', 'Utilisateurs']] : [])];
    if (S.ongletParam === 'utilisateurs' && !licenceActive()) S.ongletParam = 'association';
    $('#vue').innerHTML = `<div class="onglets">${ong.map(([k, l]) => `<button data-po="${k}" class="${S.ongletParam === k ? 'actif' : ''}">${l}</button>`).join('')}</div><div id="p-contenu"></div>`;
    $$('[data-po]').forEach(b => b.onclick = () => { S.ongletParam = b.dataset.po; vueParametres(); });
    ({ association: paramAssociation, cotisations: paramCotisations, depenses: paramCategories, exercice: paramExercice, utilisateurs: paramUtilisateurs, budget: paramBudget, journal: paramJournal, sauvegardes: paramSauvegardes, securite: paramSecurite })[S.ongletParam]();
    if (['utilisateurs', 'journal', 'sauvegardes', 'securite'].includes(S.ongletParam)) return;
    document.body.classList.toggle('lecture-seule', lectureSeule());
    if (lectureSeule()) { $$('#p-contenu input, #p-contenu select, #p-contenu button').forEach(x => { if (!x.classList.contains('toujours')) x.disabled = true; }); $('#p-contenu').insertAdjacentHTML('afterbegin', exerciceClos() && !(S.lic && S.lic.lectureSeule) ? `<div class="bandeau-role">🔒 <b>Exercice clôturé</b> : réglages en consultation seule.</div>` : zoneRestreinte() ? `<div class="bandeau-role">👁 <b>Consultation seule</b> — en tant que ${esc(libRole())}, vous pouvez consulter ces réglages ; seul le trésorier peut les modifier.</div>` : `<div class="alerte alerte-forte">🔒 Lecture seule : ${esc(S.lic.message)}</div>`); }
  }
  function paramAssociation() {
    const p = P();
    const ch = (k, l, cls, type) => `<div class="champ ${cls || ''}"><label>${l}</label><input data-p="${k}" ${type ? `type="${type}"` : ''} value="${esc(p[k])}"></div>`;
    $('#p-contenu').innerHTML = `
      <div class="carte"><h3>Association</h3><div class="form-grille">
        ${ch('nom', "Nom de l'association", 'large')}${ch('sigle', 'Sigle')}
        ${ch('siege', 'Siège (ville)')}${ch('contact', 'Contact (téléphone, e-mail)')}${ch('devise', 'Devise ou slogan')}
        ${ch('president', 'Président(e)')}${ch('tresorier', 'Trésorier(e)')}${ch('secretaire', 'Secrétaire général(e)')}
        ${ch('contactPresident', 'Contact du Président (urgence)')}${ch('contactTresorier', 'Contact du Trésorier (urgence)')}${ch('contactSecretaire', 'Contact du SG (urgence)')}
        <div class="champ plein"><span class="aide">Ces trois numéros sont imprimés comme numéros d'urgence sur les cartes de membre. S'ils sont vides, le contact du membre dont la fonction correspond (Président, Trésorier, Secrétaire général) est utilisé.</span></div>
      </div></div>
      <div class="carte"><h3>Documents et affichage</h3><div class="form-grille">
        ${ch('signataireListes', 'Signataire des listes')}${ch('signataireBilan', 'Signataire du bilan et des dépenses')}${ch('libelleResidence', 'Intitulé de la colonne « résidence »')}
        ${ch('prefixeIdent', 'Préfixe des identifiants (ex. A2B)')}${ch('monnaie', 'Monnaie')}
        <div class="champ"><label>Couleur de l'association</label><input type="color" data-p="couleur" value="${esc(p.couleur)}" style="height:36px;padding:2px"></div>
        <div class="champ plein"><label>Logo (affiché dans le logiciel et sur tous les documents)</label>
          <div class="groupe-btn">${p.logo ? `<img src="${p.logo}" style="height:52px;border:1px solid var(--bord);border-radius:6px;padding:2px">` : '<span class="aide">Aucun logo</span>'}
          <button class="btn btn-petit" id="p-logo">Choisir une image…</button>${p.logo ? '<button class="btn btn-petit btn-danger" id="p-logo-suppr">Retirer</button>' : ''}</div></div>
      </div></div>`;
    $$('[data-p]').forEach(inp => inp.onchange = () => { if (!peutModifier()) return; p[inp.dataset.p] = inp.dataset.p === 'nom' ? inp.value.trim().toUpperCase() : inp.value.trim(); modifie(); appliquerTheme(); $('#sous-titre').textContent = sousTitre(); });
    $('#p-logo').onclick = async () => { const brut = await A.choisirImage(); if (!brut) return; const img = await reduireImage(brut, 400, 'png'); if (img) { p.logo = img; modifie(); vueParametres(); } };
    if ($('#p-logo-suppr')) $('#p-logo-suppr').onclick = () => { p.logo = ''; modifie(); vueParametres(); };
  }
  /** Type jumeau d'une cotisation divisée (« … Hommes » <-> « … Femmes ») */
  function paire(k) {
    if (k.arriere || (k.public !== 'H' && k.public !== 'F')) return null;
    const base = (x) => norm(String(x.nom).replace(/\s*(hommes?|femmes?)\s*$/i, ''));
    return cots().find(x => x !== k && x.public === (k.public === 'H' ? 'F' : 'H') && base(x) === base(k)) || null;
  }
  function carteArrieres(k, i) {
    const d = Object.entries(k.du || {}).filter(([, v]) => v > 0), r = M.resumeCotisation(S.session, k);
    return `<div class="carte cot-param" style="--c:${esc(k.couleur)}"><h3>${esc(k.nom)} <small>créée à la clôture de l'exercice ${esc(k.arriere.annee)}</small></h3>
      <p>Dettes de l'exercice ${esc(k.arriere.annee)} reportées : <b>${d.length} membre(s)</b>, <b>${mtd(d.reduce((t, [, v]) => t + v, 0))}</b> au total ; déjà recouvré : <b>${mtd(r.total)}</b>.</p>
      <p class="aide">Le montant attendu est propre à chaque membre (sa dette). Les rattrapages se saisissent dans Cotisations &gt; ${esc(k.nom)}, dans la case du mois du paiement. Ce type ne se modifie pas ; il peut être supprimé s'il a été créé par erreur.</p>
      <div class="groupe-btn"><button class="btn btn-petit btn-danger" data-cotsuppr="${i}">Supprimer ce type de cotisation</button></div></div>`;
  }
  function paramCotisations() {
    $('#p-contenu').innerHTML = cots().map((k, i) => {
      if (k.arriere) return carteArrieres(k, i);
      const nbVer = Object.keys(k.versements).length;
      return `<div class="carte cot-param" style="--c:${esc(k.couleur)}"><h3>${esc(k.nom)} <small>${nbVer} membre(s) ont déjà versé</small></h3>
      <div class="form-grille">
        <div class="champ large"><label>Nom</label><input data-k="${i}" data-c="nom" value="${esc(k.nom)}"></div>
        <div class="champ"><label>Nom court (onglets, colonnes)</label><input data-k="${i}" data-c="court" value="${esc(k.court)}"></div>
        <div class="champ"><label>Le membre est « à jour » quand il a versé…</label><select data-k="${i}" data-c="mode"><option value="total" ${k.mode !== 'periode' ? 'selected' : ''}>un montant fixe sur l'exercice</option><option value="periode" ${k.mode === 'periode' ? 'selected' : ''}>un montant par mois échu</option></select></div>
        ${(() => { const per = k.mode === 'periode', c = per ? 'montantPeriode' : 'montantAttendu', lib = per ? `Montant par mois (${esc(dev())})` : `Montant attendu sur l'exercice (${esc(dev())})`;
          const pub = k.public === 'H' || k.public === 'F';
          const general = `<div class="champ"><label>${k.montantsGenre && !pub ? lib + ' — genre non renseigné' : lib}</label><input type="number" min="0" data-k="${i}" data-c="${c}" value="${esc(k[c])}"></div>`;
          const parGenre = ['H', 'F'].map(g => `<div class="champ"><label>${lib} — <b>${g === 'H' ? 'Hommes' : 'Femmes'}</b></label><input type="number" min="0" data-k="${i}" data-g="${g}" data-c="${c}" value="${esc(k.genre[g][c])}"></div>`).join('');
          return `<div class="champ"><label>Cotisation due par</label><select data-k="${i}" data-c="public"><option value="tous" ${!pub ? 'selected' : ''}>Tous les membres</option><option value="H" ${k.public === 'H' ? 'selected' : ''}>Les hommes uniquement</option><option value="F" ${k.public === 'F' ? 'selected' : ''}>Les femmes uniquement</option></select></div>
            ${pub ? `<div class="champ"><label>${lib} — <b>${k.public === 'H' ? 'Hommes' : 'Femmes'}</b></label><input type="number" min="0" data-k="${i}" data-g="${k.public}" data-c="${c}" value="${esc(k.genre[k.public][c])}"></div>`
              : `<div class="champ"><label>&nbsp;</label><label class="case"><input type="checkbox" data-k="${i}" data-c="montantsGenre" ${k.montantsGenre ? 'checked' : ''}> Montant différent pour les hommes et les femmes</label></div>`}
            ${!pub && k.montantsGenre ? parGenre + general : !pub ? general : ''}
            <div class="champ"><label>Attendu ${per ? `aujourd'hui (${M.moisEchus(P().exercice)} mois échus)` : 'par membre'}</label><b style="padding-top:8px">${attTxt(k)}</b></div>`; })()}
        <div class="champ"><label>Couleur</label><input type="color" data-k="${i}" data-c="couleur" value="${esc(k.couleur)}" style="height:36px;padding:2px"></div>
        <div class="champ plein"><label>Colonnes de versement (périodes)</label><div class="liste-cols">${k.colonnes.map((c, j) => `<span class="col">${esc(c)}<button data-colsuppr="${i}:${j}" title="Retirer">×</button></span>`).join('')}
          <button class="btn btn-petit" data-colajout="${i}">+ Colonne</button><button class="btn btn-petit" data-colmois="${i}">Mettre les 12 mois</button></div></div>
      </div>
      <div class="groupe-btn" style="margin-top:12px">${k.public === 'H' || k.public === 'F' ? (paire(k) ? `<button class="btn btn-petit" data-cotregroup="${i}" title="Revenir à une seule cotisation pour tous">Regrouper Hommes et Femmes</button>` : '')
          : `<button class="btn btn-petit" data-cotdiv="${i}" title="Créer « ${esc(k.nom)} Hommes » et « ${esc(k.nom)} Femmes »">Diviser en Hommes / Femmes</button>`}<button class="btn btn-petit btn-danger" data-cotsuppr="${i}">Supprimer ce type de cotisation</button></div></div>`; }).join('') +
      `<div style="margin-top:18px"><button class="btn btn-primaire" id="p-cot-ajout">+ Ajouter un type de cotisation</button>
        <span class="aide" style="margin-left:10px">Ex. : cotisation décès, mariage, projet, adhésion…</span></div>`;
    $$('[data-c]').forEach(inp => inp.onchange = () => {
      if (!peutModifier()) return;
      const k = cots()[+inp.dataset.k], c = inp.dataset.c, g = inp.dataset.g;
      M.normaliserGenreCot(k);
      if (g) k.genre[g][c] = Number(inp.value) || 0;
      else if (inp.type === 'checkbox') {
        k[c] = inp.checked;
        if (c === 'montantsGenre' && inp.checked) ['H', 'F'].forEach(x => { if (!k.genre[x].montantAttendu) k.genre[x].montantAttendu = Number(k.montantAttendu) || 0; if (!k.genre[x].montantPeriode) k.genre[x].montantPeriode = Number(k.montantPeriode) || 0; });
      }
      else k[c] = inp.type === 'number' ? Number(inp.value) || 0 : inp.value.trim();
      if (c === 'public' && (k.public === 'H' || k.public === 'F')) { const x = k.genre[k.public]; if (!k.montantsGenre) { x.montantAttendu = Number(k.montantAttendu) || 0; x.montantPeriode = Number(k.montantPeriode) || 0; } k.montantsGenre = true; }
      if (c === 'public' && k.public === 'tous') k.montantsGenre = false;
      if (c === 'mode' && k.mode === 'periode') ['H', 'F'].forEach(x => { if (!k.genre[x].montantPeriode) k.genre[x].montantPeriode = Math.round((Number(k.genre[x].montantAttendu) || 0) / Math.max(1, k.colonnes.length)); });
      if (c === 'mode' && k.mode === 'periode' && !k.montantPeriode) k.montantPeriode = Math.round((Number(k.montantAttendu) || 0) / Math.max(1, k.colonnes.length));
      modifie(); paramCotisations();
    });
    $$('[data-colsuppr]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const [i, j] = b.dataset.colsuppr.split(':').map(Number), k = cots()[i];
      const n = Object.values(k.versements).filter(v => v[j] !== undefined).length;
      if (k.colonnes.length === 1) { toast('Il faut au moins une colonne.', 'err'); return; }
      if (n && !await confirmer('Retirer la colonne', `${n} membre(s) ont un versement dans « ${esc(k.colonnes[j])} » : ces versements seront supprimés.`, 'Retirer', true)) return;
      k.colonnes.splice(j, 1);
      Object.keys(k.versements).forEach(id => { const v = k.versements[id], nv = {}; Object.keys(v).forEach(c => { const x = +c; if (x < j) nv[x] = v[c]; else if (x > j) nv[x - 1] = v[c]; }); k.versements[id] = nv; });
      modifie(); paramCotisations();
    });
    $$('[data-colajout]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const k = cots()[+b.dataset.colajout];
      const nom = await modale({ titre: 'Nouvelle colonne', corps: `<div class="champ"><label>Nom de la colonne</label><input id="nc" value="Versement ${k.colonnes.length + 1}"></div>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Ajouter', classe: 'btn-primaire', val: (m) => $('#nc', m).value.trim() }] });
      if (!nom) return; k.colonnes.push(nom); modifie(); paramCotisations();
    });
    $$('[data-colmois]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const k = cots()[+b.dataset.colmois];
      if (Object.keys(k.versements).length && !await confirmer('Mettre les 12 mois', 'Les colonnes seront renommées Janvier … Décembre. Les versements déjà saisis restent dans leur position (1re colonne = Janvier, etc.) ; ceux au-delà de la 12e colonne seront supprimés.', 'Continuer')) return;
      k.colonnes = M.MOIS.slice();
      Object.values(k.versements).forEach(v => Object.keys(v).forEach(c => { if (+c >= 12) delete v[c]; }));
      modifie(); paramCotisations();
    });
    $$('[data-cotdiv]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const k = cots()[+b.dataset.cotdiv];
      const e = M.effectifsGenre(S.session);
      if (!await confirmer('Diviser la cotisation par genre', `<b>${esc(k.nom)}</b> sera remplacée par deux cotisations dans le même esprit (mêmes colonnes, même mode de calcul) :<br><br>
        • <b>${esc(k.nom)} Hommes</b> — due par les ${e.H} homme(s), montant ${mtd(M.attendu(k, P(), undefined, { genre: 'H' }))}<br>
        • <b>${esc(k.nom)} Femmes</b> — due par les ${e.F} femme(s), montant ${mtd(M.attendu(k, P(), undefined, { genre: 'F' }))}<br><br>
        Les versements déjà saisis passent dans la cotisation du genre de chaque membre ; le total du bilan ne change pas.${e.N ? `<br><br><b>${e.N} membre(s) actif(s) n'ont pas de genre</b> : ils ne seront concernés par aucune des deux tant que leur genre n'est pas indiqué.` : ''}`, 'Diviser')) return;
      const avant = M.resumeCotisation(S.session, k).total;
      const r = M.diviserParGenre(S.session, k);
      if (r.erreur) { toast(r.erreur + (r.sansGenre ? ' : indiquez d\'abord leur genre (Membres > filtre « Genre non renseigné »).' : ''), 'err'); return; }
      const apres = M.resumeCotisation(S.session, r.hommes).total + M.resumeCotisation(S.session, r.femmes).total;
      if (Math.abs(apres - avant) > 0.01) toast(`Attention : total avant ${mtd(avant)}, après ${mtd(apres)}.`, 'err');
      if (S.cotActive === k.id) S.cotActive = r.hommes.id;
      modifie(); paramCotisations(); toast(`Cotisation divisée : « ${r.hommes.nom} » et « ${r.femmes.nom} » (${mtd(apres)} de versements repris).`, 'ok');
    });
    $$('[data-cotregroup]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const k = cots()[+b.dataset.cotregroup], j = paire(k); if (!j) return;
      const h = k.public === 'H' ? k : j, f = k.public === 'H' ? j : k;
      if (!await confirmer('Regrouper Hommes et Femmes', `<b>${esc(h.nom)}</b> et <b>${esc(f.nom)}</b> seront regroupées en une seule cotisation pour tous les membres, avec un montant différent pour les hommes et les femmes. Les versements sont conservés.`, 'Regrouper')) return;
      const n = M.regrouperGenre(S.session, h, f); S.cotActive = n.id;
      modifie(); paramCotisations(); toast(`Cotisations regroupées : « ${n.nom} ».`, 'ok');
    });
    $$('[data-cotsuppr]').forEach(b => b.onclick = async () => {
      if (!peutModifier()) return;
      const k = cots()[+b.dataset.cotsuppr], tot = M.resumeCotisation(S.session, k).total;
      if (!await confirmer('Supprimer le type de cotisation', `Supprimer <b>${esc(k.nom)}</b>${tot ? ` et tous ses versements (<b>${mtd(tot)}</b>) ? Le bilan diminuera d'autant.` : ' ?'}`, 'Supprimer', true)) return;
      S.session.cotisations = cots().filter(x => x !== k); modifie(); paramCotisations();
    });
    $('#p-cot-ajout').onclick = async () => {
      if (!peutModifier()) return;
      const r = await modale({ titre: 'Nouveau type de cotisation', corps: `<div class="form-grille" style="grid-template-columns:1fr 1fr">
          <div class="champ plein"><label>Nom</label><input id="nt-nom" placeholder="ex. Cotisation décès"></div>
          <div class="champ"><label>Montant attendu par membre</label><input id="nt-mt" type="number" min="0" value="0"></div>
          <div class="champ"><label>Colonnes</label><select id="nt-cols"><option value="mois">Les 12 mois</option><option value="4">4 versements</option><option value="1">Un seul versement</option></select></div>
          <div class="champ plein"><label>Cotisation due par</label><select id="nt-pub"><option value="tous">Tous les membres</option><option value="H">Les hommes uniquement</option><option value="F">Les femmes uniquement</option></select></div>
          <div class="champ plein aide">Pour un montant différent selon le genre, cochez ensuite « Montant différent pour les hommes et les femmes » dans la carte de la cotisation.</div></div>`,
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Ajouter', classe: 'btn-primaire', avant: (m) => { if (!$('#nt-nom', m).value.trim()) { toast('Indiquez le nom.', 'err'); return false; } },
          val: (m) => ({ nom: $('#nt-nom', m).value.trim(), mt: Number($('#nt-mt', m).value) || 0, cols: $('#nt-cols', m).value, pub: $('#nt-pub', m).value }) }] });
      if (!r) return;
      const colonnes = r.cols === 'mois' ? M.MOIS.slice() : r.cols === '4' ? ['Versement 1', 'Versement 2', 'Versement 3', 'Versement 4'] : ['Versement'];
      cots().push({ id: M.nouvelId('k'), nom: r.nom, court: r.nom.replace(/^Cotisations? /i, '').slice(0, 16) || r.nom, couleur: M.COULEURS[(cots().length + 3) % M.COULEURS.length], colonnes, mode: 'total', montantAttendu: r.mt, montantPeriode: 0, versements: {} });
      { const k = M.normaliserGenreCot(cots()[cots().length - 1]); if (r.pub === 'H' || r.pub === 'F') { k.public = r.pub; k.montantsGenre = true; } }
      modifie(); paramCotisations(); toast('Type de cotisation ajouté : il apparaît dans « Cotisations ».', 'ok');
    };
  }
  function paramCategories() {
    const cs = S.session.categories;
    $('#p-contenu').innerHTML = `<div class="carte"><h3>Catégories de dépenses <small>utilisées pour classer les dépenses et dans le bilan</small></h3>
      <table class="tab tab-compact">${cs.map((c, i) => { const n = S.session.depenses.filter(d => d.categorie === c).length;
        return `<tr><td><input class="entree" data-cat="${i}" value="${esc(c)}" style="width:340px"></td><td class="aide">${n} dépense(s)</td><td><button class="btn btn-petit btn-danger" data-catsuppr="${i}" ${n ? 'disabled title="Catégorie utilisée"' : ''}>Retirer</button></td></tr>`; }).join('')}</table>
      <div style="margin-top:12px"><button class="btn btn-petit" id="p-cat-ajout">+ Ajouter une catégorie</button></div></div>`;
    $$('[data-cat]').forEach(inp => inp.onchange = () => {
      if (!peutModifier()) return;
      const i = +inp.dataset.cat, ancien = cs[i], nouveau = inp.value.trim(); if (!nouveau) { inp.value = ancien; return; }
      cs[i] = nouveau; S.session.depenses.forEach(d => { if (d.categorie === ancien) d.categorie = nouveau; }); modifie();
    });
    $$('[data-catsuppr]').forEach(b => b.onclick = () => { if (!peutModifier()) return; cs.splice(+b.dataset.catsuppr, 1); modifie(); paramCategories(); });
    $('#p-cat-ajout').onclick = () => { if (!peutModifier()) return; cs.push('Nouvelle catégorie'); modifie(); paramCategories(); };
  }
  /** Clôture : décision pour chaque membre pas à jour, PDF de l'état des arriérés, nouvel exercice, ancien en lecture seule */
  async function cloturerExercice() {
    const p = P(), an = Number(p.exercice), suiv = an + 1;
    const liste = M.arrieres(S.session, M.finExercice(S.session)), b = M.bilan(S.session);
    const tot = liste.reduce((t, x) => t + x.total, 0);
    const decisionsDe = (md) => { const d = {}; liste.forEach(x => { d[x.m.id] = { action: $(`[data-cl-act="${x.m.id}"]`, md).value, motif: $(`[data-cl-mot="${x.m.id}"]`, md).value.trim() }; }); return d; };
    const lignesDe = (d) => liste.map(x => ({ id: x.m.id, ident: x.m.ident, nom: M.nomComplet(x.m), total: x.total, detail: x.detail, action: d[x.m.id].action, motif: d[x.m.id].motif }));
    const corps = `<div class="alerte info" style="margin-top:0">👥 <b>Faites valider cet état par le bureau avant de clôturer.</b> L'exercice ${an} passera en consultation seule et l'exercice ${suiv} sera créé avec les mêmes membres et types de cotisation, et un report de caisse de <b>${mtd(b.solde)}</b>.</div>
      ${liste.length ? `<p><b>${liste.length} membre(s) actif(s) ne sont pas à jour</b> au 31/12/${an}, pour <b>${mtd(tot)}</b>. Par défaut, chaque dette est <b>reportée</b> dans la cotisation « Arriérés » de ${suiv}.</p>
      <div class="tableau-conteneur" style="max-height:46vh"><table class="tab tab-compact"><tr><th>Identifiant</th><th>Membre</th><th>Détail de la dette</th><th class="num">Total</th><th>Décision</th><th>Motif (obligatoire si annulée)</th></tr>
      ${liste.map(x => `<tr><td><b>${esc(x.m.ident)}</b></td><td>${esc(M.nomComplet(x.m))}</td><td style="font-size:12px">${x.detail.map(y => `${esc(y.nom)}${y.annee !== an ? ` (${y.annee})` : ''} : ${mt(y.reste)}`).join('<br>')}</td><td class="num"><b>${mt(x.total)}</b></td>
        <td><select class="entree" data-cl-act="${x.m.id}" style="min-width:140px"><option value="reporter">Reporter en ${suiv}</option><option value="annuler">Annuler la dette</option><option value="inactif">Rendre inactif</option></select></td>
        <td><input class="entree" data-cl-mot="${x.m.id}" placeholder="ex. décès, décision du bureau du …" style="min-width:180px"></td></tr>`).join('')}</table></div>
      <p class="aide">« Annuler la dette » : remise décidée par le bureau, inscrite dans l'état des arriérés. « Rendre inactif » : départ ou exclusion, sans report.</p>
      <button class="btn" id="cl-pdf">Aperçu de l'état des arriérés (PDF)</button>` : `<p>✅ Tous les membres actifs sont à jour : aucun arriéré à reporter.</p>`}`;
    const d = await modale({ titre: `Clôturer l'exercice ${an} et démarrer ${suiv}`, large: true, corps,
      apresOuverture: (md) => { if ($('#cl-pdf', md)) $('#cl-pdf', md).onclick = (e) => pdf(Docs.etatArrieres(S.session, lignesDe(decisionsDe(md)), an, null), e.target); },
      boutons: [{ lib: 'Annuler', val: null }, { lib: `Clôturer ${an} et créer ${suiv}`, classe: 'btn-primaire', avant: (md) => {
        const dd = decisionsDe(md), sans = liste.filter(x => dd[x.m.id].action === 'annuler' && !dd[x.m.id].motif);
        if (sans.length) { toast(`Indiquez le motif de l'annulation pour : ${sans.map(x => x.m.ident).join(', ')}.`, 'err'); return false; }
      }, val: (md) => decisionsDe(md) }] });
    if (!d) return;
    await enregistrer(true);
    const ancien = S.session, chemin = S.chemin;
    const n = M.exerciceSuivant(ancien, d), tt = M.totauxCloture(n.reportArrieres.lignes);
    ancien.cloture = { le: new Date().toISOString(), par: S.user ? S.user.nom : '', vers: suiv, lignes: n.reportArrieres.lignes, totaux: tt };
    G.journaliser(ancien, parQui(), 'Clôture de l\'exercice', `${tt.nReporte} report(s) (${mt(tt.reporte)}), ${tt.nAnnule} annulation(s), ${tt.nInactif} inactif(s)`);
    try { await A.enregistrer({ chemin, donnees: ancien, sauvegardeForcee: true }); } catch (e) { delete ancien.cloture; toast('Clôture impossible : ' + nettoyerErreur(e), 'err'); return; }
    if (liste.length) await pdf(Docs.etatArrieres(ancien, ancien.cloture.lignes, an, ancien.cloture));
    if (await creerExercice(n, nomExercice(n.params))) {
      UI.confettis(200);
      toast(`Exercice ${an} clôturé, exercice ${suiv} créé${tt.nReporte ? ` : ${tt.nReporte} membre(s) avec des arriérés (${mtd(tt.reporte)}) dans « Arriérés ${an} »` : ''}.`, 'ok');
    } else {
      delete ancien.cloture; await A.enregistrer({ chemin, donnees: ancien, sauvegardeForcee: false }).catch(() => {});
      toast(`L'exercice ${suiv} n'a pas été créé : l'exercice ${an} reste ouvert.`, 'err');
    }
  }
  // ---- budget prévisionnel
  function paramBudget() {
    const c = G.comparaisonBudget(S.session), bu = S.session.budget;
    const lignes = (l, sorte) => l.map(x => `<tr><td>${esc(x.nom)}</td><td><input class="entree" type="number" min="0" step="any" data-bu="${sorte}" data-cle="${esc(x.cle)}" value="${x.prevu || ''}" style="width:130px"></td>
      <td class="num">${mt(x.realise)}</td><td class="num" style="color:${(sorte === 'recettes' ? x.ecart >= 0 : x.ecart <= 0) ? 'var(--vert)' : 'var(--rouge)'}">${x.prevu ? (x.ecart > 0 ? '+' : '') + mt(x.ecart) : ''}</td><td class="num">${x.taux !== null ? Math.round(100 * x.taux) + ' %' : ''}</td></tr>`).join('');
    $('#p-contenu').innerHTML = `<div class="carte"><h3>Budget prévisionnel ${esc(P().exercice)} <small>prévu, réalisé, écart</small></h3>
      <p class="aide">Saisissez ce que l'association prévoit de recevoir et de dépenser cette année ; le bilan financier montre ensuite le réalisé et l'écart.</p>
      <div class="grille g2"><div><h4>Recettes</h4><table class="tab tab-compact"><tr><th>Poste</th><th>Prévu</th><th class="num">Réalisé</th><th class="num">Écart</th><th class="num">%</th></tr>${lignes(c.recettes, 'recettes')}
        <tr style="font-weight:700"><td>TOTAL</td><td>${mt(c.totRec.prevu)}</td><td class="num">${mt(c.totRec.realise)}</td><td></td><td></td></tr></table></div>
      <div><h4>Dépenses</h4><table class="tab tab-compact"><tr><th>Catégorie</th><th>Prévu</th><th class="num">Réalisé</th><th class="num">Écart</th><th class="num">%</th></tr>${lignes(c.depenses, 'depenses')}
        <tr style="font-weight:700"><td>TOTAL</td><td>${mt(c.totDep.prevu)}</td><td class="num">${mt(c.totDep.realise)}</td><td></td><td></td></tr></table></div></div>
      <p class="aide">Solde prévu : <b>${mtd(c.totRec.prevu - c.totDep.prevu)}</b> · solde réalisé : <b>${mtd(c.totRec.realise - c.totDep.realise)}</b>.</p></div>`;
    $$('[data-bu]').forEach(i => i.onchange = () => { if (!peutModifier()) return; bu[i.dataset.bu][i.dataset.cle] = Number(i.value) || 0; journal('Budget prévisionnel', `${i.dataset.bu === 'recettes' ? 'Recette' : 'Dépense'} « ${(i.closest('tr').querySelector('td') || {}).textContent || i.dataset.cle} » : ${mt(i.value)}`); modifie(); paramBudget(); });
    if (lectureSeule()) $$('#p-contenu input').forEach(x => { x.disabled = true; });
  }
  // ---- journal des opérations
  function paramJournal() {
    const j = S.session.journal.slice().reverse();
    const vj = G.verifierJournal(S.session);
    $('#p-contenu').innerHTML = `<div class="${vj.ok ? 'alerte info' : 'alerte alerte-forte'}" style="display:flex;gap:10px;align-items:center">${UI.icone(vj.ok ? 'bouclier' : 'alerte')}<span>${vj.ok
        ? `<b>Journal infalsifiable : chaîne intacte.</b> ${vj.scelles} opération(s) scellée(s) : chacune est liée à la précédente par une empreinte SHA-256, si bien qu'une ligne modifiée, ajoutée ou supprimée en dehors du logiciel serait détectée.${vj.anciens ? ` (${vj.anciens} opération(s) antérieure(s) à la version 2.0, non scellées.)` : ''}`
        : `<b>Attention : la chaîne du journal est rompue</b> à l'opération du ${new Date(vj.entree.le).toLocaleString('fr-FR')} (« ${esc(vj.entree.quoi)} ») : le journal a été modifié en dehors du logiciel.`}</span></div>
      <div class="carte"><h3>Journal des opérations <small>${j.length} opération(s) — qui a fait quoi, et quand</small></h3>
      <div class="barre-outils"><input class="entree recherche" id="j-rech" placeholder="Rechercher (nom, membre, reçu…)"><select class="entree" id="j-par"><option value="">Tous les utilisateurs</option>${Array.from(new Set(j.map(x => x.par))).map(x => `<option>${esc(x)}</option>`).join('')}</select>
        <button class="btn toujours" id="j-pdf">Journal (PDF)</button></div>
      <div class="tableau-conteneur" style="max-height:calc(100vh - 290px)"><table class="tab tab-compact" id="j-t"></table></div>
      <p class="aide">Le journal est tenu automatiquement et ne peut pas être modifié. Il repart à zéro avec chaque nouvel exercice (celui de l'exercice précédent reste dans son fichier).</p></div>`;
    const dessiner = () => {
      const q = norm($('#j-rech').value), u = $('#j-par').value;
      const l = j.filter(x => (!u || x.par === u) && (!q || norm(x.quoi + ' ' + x.detail + ' ' + x.par).includes(q)));
      $('#j-t').innerHTML = `<tr><th>Date et heure</th><th>Utilisateur</th><th>Opération</th><th>Détail</th></tr>` + l.slice(0, 800).map(x => `<tr><td style="white-space:nowrap">${new Date(x.le).toLocaleString('fr-FR')}</td><td>${esc(x.par)}</td><td><b>${esc(x.quoi)}</b></td><td>${esc(x.detail)}</td></tr>`).join('') +
        (l.length > 800 ? `<tr><td colspan="4" class="aide">… ${l.length - 800} opération(s) plus anciennes : utilisez le PDF.</td></tr>` : '') + (l.length ? '' : '<tr><td colspan="4" class="aide">Aucune opération.</td></tr>');
    };
    $('#j-rech').oninput = dessiner; $('#j-par').onchange = dessiner; $('#j-pdf').onclick = (e) => pdf(Docs.journal(S.session), e.target); dessiner();
  }
  // ---- centre de sécurité
  function ilYa(j) { return j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : `il y a ${j} jours`; }
  async function paramSecurite() {
    const pc = $('#p-contenu'), lic = licenceActive(), sec = SEC(), jours = (iso) => iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null;
    let comptesL = [], hist = [];
    if (lic && estTresorier()) { try { comptesL = await A.comptesListe(); hist = await A.comptesHistorique(); } catch (e) { /* non connecté */ } }
    const vj = G.verifierJournal(S.session), dv = delaiVerrou(), ju = jours(sec.derniereCopie), jg = jours(sec.derniereGoogle);
    const echecs = hist.filter(h => (h.ev === 'echec' || h.ev === 'blocage') && Date.now() - Date.parse(h.le) < 7 * 86400000).length;
    const prov = comptesL.filter(c => c.provisoire);
    const c = [];
    const aj = (etat, titre, texte, bouton) => c.push({ etat, titre, texte, bouton });
    aj(lic ? 'ok' : 'av', 'Licence et comptes', lic ? 'Version activée : chaque membre du bureau se connecte avec son propre compte.' : "Version d'évaluation : pas de comptes ni de connexion. Activez la licence pour protéger l'accès.", lic ? '' : ['Licence…', () => fenetreLicence()]);
    if (lic && estTresorier()) {
      const manque = ['president', 'sg'].filter(r => !comptesL.some(x => x.role === r));
      aj(manque.length ? 'av' : 'ok', 'Comptes du bureau', manque.length ? `À créer : ${manque.map(r => r === 'sg' ? 'Secrétaire général' : 'Président').join(', ')}. Sans compte, ils utiliseraient celui du trésorier.` : 'Trésorier, Président et Secrétaire général ont chacun leur compte.', manque.length ? ['Créer les comptes', () => { S.ongletParam = 'utilisateurs'; vueParametres(); }] : '');
      aj(prov.length ? 'av' : 'ok', 'Mots de passe personnels', prov.length ? `${prov.map(x => esc(x.nom)).join(', ')} ${prov.length > 1 ? "n'ont" : "n'a"} pas encore remplacé le mot de passe provisoire : ce sera demandé à la prochaine connexion.` : 'Chacun utilise son mot de passe personnel (8 caractères au moins, lettres et chiffres).');
      aj(echecs ? 'av' : 'ok', 'Tentatives de connexion', echecs ? `${echecs} échec(s) de connexion ces 7 derniers jours : voyez l'historique ci-dessous.` : 'Aucun échec de connexion ces 7 derniers jours. Un compte est bloqué 5 minutes après 5 essais incorrects.');
    }
    aj(dv > 0 && dv <= 15 ? 'ok' : dv > 0 ? 'av' : 'ko', "Verrouillage automatique", dv > 0 ? `L'écran se verrouille après ${dv} minute(s) sans activité${lic ? '' : ' (avec la version activée)'}.` : "Désactivé : n'importe qui peut utiliser le logiciel si vous vous absentez.");
    aj(ju !== null && ju <= 7 ? 'ok' : 'ko', 'Copie de secours', sec.dossier ? (ju === null ? 'Dossier choisi, aucune copie encore faite.' : `Dernière copie ${ilYa(ju)}.`) : "Aucun dossier de secours : en cas de panne ou de vol du téléphone, tout serait perdu.", ['Sauvegardes', () => { S.ongletParam = 'sauvegardes'; vueParametres(); }]);
    aj(jg !== null && jg <= 7 ? 'ok' : 'av', 'Sauvegarde Google Drive', PUB().url ? (jg === null ? 'Aucune sauvegarde envoyée sur Google Drive.' : `Dernière sauvegarde ${ilYa(jg)}.`) : "Le site n'est pas installé : pas de sauvegarde en ligne.", PUB().url ? ['Sauvegarder', async () => { await sauverGoogle(false); paramSecurite(); }] : '');
    aj(vj.ok ? 'ok' : 'ko', 'Journal infalsifiable', vj.ok ? `Chaîne intacte (${vj.scelles} opération(s) scellée(s)).` : "La chaîne est rompue : le journal a été modifié en dehors du logiciel.", ['Voir le journal', () => { S.ongletParam = 'journal'; vueParametres(); }]);
    aj(S.integrite === 'altere' ? 'ko' : 'ok', "Sceau du fichier d'exercice", S.integrite === 'altere' ? "À l'ouverture, le sceau ne correspondait pas : le fichier avait été modifié hors du logiciel." : S.integrite === 'intact' ? "Le fichier ouvert porte un sceau d'intégrité conforme." : "Le sceau d'intégrité sera posé au prochain enregistrement.");
    const pts = c.reduce((t, x) => t + (x.etat === 'ok' ? 1 : x.etat === 'av' ? .5 : 0), 0), score = pts / c.length;
    pc.innerHTML = `<div class="carte"><div class="score-secu">${UI.anneau(score, score >= .85 ? '#16a34a' : score >= .6 ? '#d97706' : '#c0392b', 'Niveau de protection', '')}
        <div><h3 style="margin-bottom:6px">Centre de sécurité</h3><p style="margin:0;color:var(--texte-2);line-height:1.55">${score >= .85 ? 'Vos données sont bien protégées.' : score >= .6 ? 'Bonne base : quelques points restent à régler.' : 'Des protections importantes manquent : suivez les recommandations ci-dessous.'}<br>
        Mots de passe chiffrés, blocage après 5 essais, verrouillage de l'écran, journal infalsifiable (SHA-256), sceau d'intégrité des fichiers, sauvegardes automatiques.</p></div></div></div>
      <div class="carte"><h3>Contrôles</h3><div class="controles">${c.map((x, i) => `<div class="controle ${x.etat}">${UI.icone(x.etat === 'ok' ? 'ok' : 'alerte')}<div><b>${x.titre}</b><small>${x.texte}</small>${x.bouton ? `<button class="btn btn-petit toujours" data-sc="${i}">${x.bouton[0]}</button>` : ''}</div></div>`).join('')}</div></div>
      <div class="carte"><h3>Vérifier l'authenticité d'un document <small>chaque PDF porte une référence unique en bas de page</small></h3>
        <div class="groupe-btn"><input class="entree toujours" id="sc-ref" placeholder="ex. 7F3A9-1C2B4" style="width:200px;font-family:Consolas,monospace;text-transform:uppercase"><button class="btn btn-primaire toujours" id="sc-verif">${UI.icone('bouclier')} Vérifier</button><span id="sc-res"></span></div>
        <p class="aide" style="margin-bottom:0">Un reçu, un bilan ou une attestation présenté par quelqu'un : saisissez la référence imprimée en bas de page (« Réf. ») pour savoir s'il a bien été produit par ce poste, quand et par qui.</p></div>
      ${!lic || estTresorier() ? `<div class="carte"><h3>Appli du trésorier <small>opérations faites sur le téléphone</small></h3>
        <p style="margin-top:0">Avec l'appli Android <b>AMEDIS Asso</b>, le trésorier peut encaisser (avec reçu), saisir des dépenses et des dons, ajouter ou modifier des membres, faire l'appel d'une réunion et gérer la solidarité depuis son téléphone. Chaque opération est envoyée au site, puis <b>appliquée par ce logiciel</b> dès qu'il est ouvert et connecté : l'ordinateur reste la référence.</p>
        <div class="groupe-btn">${PUB().codeOps ? `<span class="badge b-ok" style="font-size:13px">${UI.icone('ok')} Activé</span><button class="btn btn-petit toujours" id="ops-changer">Changer le code</button><button class="btn btn-petit btn-danger toujours" id="ops-off">Désactiver</button>`
          : `<button class="btn btn-primaire toujours" id="ops-changer">Activer : choisir le code d'opérations</button>`}</div>
        <p class="aide" style="margin-bottom:0">Le code d'opérations (6 chiffres) est demandé par l'appli au trésorier, en plus de son accès de membre ; il n'est jamais publié en clair. Seul le membre dont la fonction est « Trésorier » peut s'en servir.</p></div>` : ''}
      <div class="carte"><h3>Verrouillage automatique <small>sur ce poste</small></h3>
        <div class="groupe-btn"><label>Verrouiller l'écran après</label><select class="entree toujours" id="sc-delai">${[[0, 'jamais'], [3, '3 minutes'], [5, '5 minutes'], [10, '10 minutes'], [15, '15 minutes'], [30, '30 minutes']].map(([v, l]) => `<option value="${v}" ${v === dv ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="aide">sans activité. Raccourci pour verrouiller tout de suite : <b>Ctrl + L</b>.</span></div></div>
      ${lic && estTresorier() ? `<div class="carte"><h3>Historique des connexions <small>${hist.length} événement(s) sur ce poste</small></h3>
        <div class="tableau-conteneur" style="max-height:340px"><table class="tab tab-compact"><tr><th>Date et heure</th><th>Événement</th><th>Utilisateur</th><th>Détail</th></tr>
        ${hist.slice(0, 200).map(h => `<tr><td>${new Date(h.le).toLocaleString('fr-FR')}</td><td class="ev-${esc(h.ev)}">${esc({ connexion: 'Connexion', echec: 'Échec de connexion', blocage: 'Compte bloqué', deconnexion: 'Déconnexion', verrouillage: 'Écran verrouillé', deverrouillage: 'Déverrouillage', creation: 'Compte créé', suppression: 'Compte supprimé', 'mot de passe': 'Mot de passe', reinitialisation: 'Comptes réinitialisés', fichier: 'Alerte fichier' }[h.ev] || h.ev)}</td><td>${esc(h.nom || h.login || '–')}</td><td>${esc(h.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="aide">Aucun événement.</td></tr>'}</table></div></div>` : ''}
      <div class="carte"><h3>Bonnes pratiques</h3><ul style="margin:0;padding-left:18px;line-height:1.75;color:var(--texte-2)">
        <li>Un compte par personne : ne communiquez jamais votre mot de passe, même à un membre du bureau.</li>
        <li>Activez la sauvegarde automatique sur Google Drive : en cas de perte du téléphone, l'exercice se restaure sur un autre téléphone ou sur un ordinateur.</li>
        <li>Verrouillez l'écran (<b>Ctrl + L</b>) dès que vous quittez votre poste.</li>
        <li>Conservez la clé de licence en lieu sûr : elle permet de réinitialiser le compte du trésorier.</li>
        <li>Présentez chaque mois la situation des caisses au bureau (Documents › Situation des caisses).</li></ul></div>`;
    UI.animerAnneaux(pc); UI.compter(pc);
    $$('[data-sc]', pc).forEach(b => b.onclick = () => c[+b.dataset.sc].bouton[1]());
    const verifRef = async () => {
      const r = await A.documentVerifier($('#sc-ref').value);
      $('#sc-res').innerHTML = r ? `<span class="badge b-ok" style="font-size:13px">${UI.icone('ok')} Authentique</span> « ${esc(r.nom)} », produit le ${new Date(r.le).toLocaleString('fr-FR')}${r.par ? ' par ' + esc(r.par) : ''}.`
        : `<span class="badge b-non" style="font-size:13px">${UI.icone('alerte')} Inconnu</span> Aucun document de ce poste ne porte cette référence.`;
      if (!r) UI.secouer($('#sc-res'));
    };
    $('#sc-verif').onclick = verifRef; $('#sc-ref').onkeydown = (e) => { if (e.key === 'Enter') verifRef(); };
    if ($('#ops-changer')) $('#ops-changer').onclick = async () => {
      if (!PUB().url) { toast("Installez d'abord le site (menu Codes QR).", 'err'); return; }
      if (!membres().some(m => /tr[ée]sori/i.test(m.fonction || ''))) toast('Attention : aucun membre n\'a la fonction « Trésorier » ; indiquez-la dans sa fiche pour qu\'il puisse utiliser l\'appli.', 'err');
      const r = await modale({ titre: "Code d'opérations du trésorier", corps: `<p class="aide" style="margin-top:0">6 chiffres, à garder secret : il sera demandé une fois sur le téléphone du trésorier.</p>
          <div class="form-grille" style="grid-template-columns:1fr 1fr"><div class="champ"><label>Code (6 chiffres)</label><input class="entree" id="ops-c1" type="password" inputmode="numeric" maxlength="6"></div>
          <div class="champ"><label>Confirmez</label><input class="entree" id="ops-c2" type="password" inputmode="numeric" maxlength="6"></div></div>`,
        apresOuverture: (md) => setTimeout(() => $('#ops-c1', md).focus(), 60),
        boutons: [{ lib: 'Annuler', val: null }, { lib: 'Enregistrer et publier', classe: 'btn-primaire', avant: (md) => {
          const a = $('#ops-c1', md).value.trim(), b = $('#ops-c2', md).value.trim();
          if (!/^\d{6}$/.test(a)) { toast('Le code doit compter 6 chiffres.', 'err'); return false; }
          if (/^(\d)\1{5}$/.test(a) || '0123456789'.includes(a) || '9876543210'.includes(a)) { toast('Code trop simple : évitez 111111, 123456…', 'err'); return false; }
          if (a !== b) { toast('Les deux codes sont différents.', 'err'); return false; }
        }, val: (md) => $('#ops-c1', md).value.trim() }] });
      if (!r) return;
      PUB().codeOps = r; journal("Code d'opérations du trésorier", 'défini'); modifie(); await enregistrer(true);
      if (await publier(true)) toast("Code d'opérations enregistré et publié : le trésorier peut l'utiliser dans l'appli.", 'ok'); else toast("Code enregistré ; publiez dès qu'Internet est disponible (menu Codes QR).", 'err');
      paramSecurite();
    };
    if ($('#ops-off')) $('#ops-off').onclick = async () => {
      if (!await confirmer('Désactiver', "Plus aucune opération ne pourra être faite depuis l'appli du trésorier (les opérations déjà envoyées restent à appliquer).", 'Désactiver', true)) return;
      delete PUB().codeOps; journal("Code d'opérations du trésorier", 'désactivé'); modifie(); await enregistrer(true); await publier(true); toast("Opérations depuis l'appli désactivées.", 'ok'); paramSecurite();
    };
    $('#sc-delai').onchange = (e) => { UI.ecrireLS('asso-verrou-min', e.target.value); toast(Number(e.target.value) ? `Verrouillage automatique après ${e.target.value} minute(s).` : 'Verrouillage automatique désactivé.', 'ok'); paramSecurite(); };
  }
  // ---- sauvegardes hors de l'ordinateur
  const SEC = () => { P().secours = P().secours || { dossier: '', auto: true, google: true, derniereCopie: '', derniereGoogle: '' }; return P().secours; };
  const contenuSecours = () => JSON.stringify(S.session, null, 1);
  const nomSecours = () => (S.chemin || '').split(/[\\/]/).pop().replace(/\.amasso$/i, '') || nomExercice(P());
  async function copierSecours(silencieux) {
    const sec = SEC(); if (!sec.dossier) { if (!silencieux) toast("Choisissez d'abord le dossier de secours.", 'err'); return false; }
    try { const f = await A.secoursCopier({ dossier: sec.dossier, nom: nomSecours(), contenu: contenuSecours() }); sec.derniereCopie = new Date().toISOString(); if (!silencieux) toast('Copie de secours faite : ' + f, 'ok'); return true; }
    catch (e) { if (!silencieux) toast('Copie impossible : ' + nettoyerErreur(e) + ' (le dossier est-il toujours disponible ?)', 'err'); return false; }
  }
  async function sauverGoogle(silencieux) {
    const pub = PUB(); if (!pub.url) { if (!silencieux) toast("Installez d'abord le site (menu Codes QR) : la sauvegarde Google utilise le même compte.", 'err'); return false; }
    try { const r = await A.sauvegardeGoogle({ url: pub.url, cle: pub.cle, nom: nomSecours(), contenu: contenuSecours() }); SEC().derniereGoogle = new Date().toISOString(); if (!silencieux) toast(`Sauvegardé sur Google Drive : ${r.nom}`, 'ok'); return true; }
    catch (e) { if (!silencieux) toast('Sauvegarde Google impossible : ' + nettoyerErreur(e), 'err'); return false; }
  }
  let minuterieSecours = null;
  function sauvegardeAuto() {
    if (!S.session || exerciceClos()) return;
    clearTimeout(minuterieSecours);
    minuterieSecours = setTimeout(async () => {
      const sec = SEC(), age = (d) => d ? Date.now() - new Date(d).getTime() : Infinity;
      if (sec.dossier && sec.auto && age(sec.derniereCopie) > 10 * 60000) await copierSecours(true);
      if (sec.google && PUB().url && age(sec.derniereGoogle) > 12 * 3600000) await sauverGoogle(true);
    }, 20000);
  }
  async function paramSauvegardes() {
    const sec = SEC(), pub = PUB();
    $('#p-contenu').innerHTML = `<div class="carte"><h3>1. Copie dans un dossier du téléphone, une carte SD ou une clé USB</h3>
        <p class="aide">Une copie de l'exercice est faite automatiquement (au plus toutes les 10 minutes) dans le dossier choisi, et une copie datée par jour est conservée.</p>
        <div class="barre-outils"><input class="entree" style="flex:1" value="${esc(sec.dossier || 'Aucun dossier choisi')}" disabled><button class="btn toujours" id="s-choisir">Choisir le dossier…</button><button class="btn btn-primaire toujours" id="s-copier">Copier maintenant</button></div>
        <label class="case"><input type="checkbox" class="toujours" id="s-auto" ${sec.auto ? 'checked' : ''}> Copie automatique</label>
        <div class="aide">${sec.derniereCopie ? 'Dernière copie : ' + new Date(sec.derniereCopie).toLocaleString('fr-FR') : 'Aucune copie pour l\'instant.'}</div></div>
      <div class="carte"><h3>2. Sauvegarde sur le Google Drive de l'association</h3>
        ${pub.url ? `<p class="aide">Utilise le site de consultation (menu Codes QR) : les sauvegardes sont rangées dans votre Google Drive, dossier « AMEDIS pro Asso - sauvegardes » (les 40 dernières sont gardées). Si le téléphone est perdu ou en panne, réinstallez le logiciel et restaurez depuis cette liste.</p>
          <div class="barre-outils"><button class="btn btn-primaire toujours" id="s-google">Sauvegarder maintenant sur Google Drive</button><label class="case"><input type="checkbox" class="toujours" id="s-gauto" ${sec.google ? 'checked' : ''}> Automatique (deux fois par jour au plus)</label></div>
          <div class="aide">${sec.derniereGoogle ? 'Dernière sauvegarde Google : ' + new Date(sec.derniereGoogle).toLocaleString('fr-FR') : 'Aucune sauvegarde Google pour l\'instant.'}</div>
          <h4 style="margin:14px 0 6px">Sauvegardes disponibles</h4><div id="s-liste" class="aide">Chargement…</div>`
        : `<div class="alerte info">Installez d'abord le site de consultation (menu « Codes QR ») : la sauvegarde Google utilise le même projet, sur le compte Google de l'association.</div>`}</div>
      <div class="carte"><h3>3. Restaurer</h3><p class="aide">Depuis un fichier : « Changer d'exercice » &gt; « Ouvrir un exercice… » et choisissez le fichier .amasso (reçu par WhatsApp, courriel, carte SD…). Depuis Google Drive : bouton « Restaurer » de la liste ci-dessus (un nouveau fichier est créé, l'actuel n'est pas écrasé).</p></div>`;
    $('#s-choisir').onclick = async () => { const d = await A.secoursChoisir(); if (d) { sec.dossier = d; modifie(); await copierSecours(false); paramSauvegardes(); } };
    $('#s-copier').onclick = async () => { await copierSecours(false); paramSauvegardes(); };
    $('#s-auto').onchange = (e) => { sec.auto = e.target.checked; modifie(); };
    if (!pub.url) return;
    $('#s-google').onclick = async (e) => { e.target.disabled = true; await sauverGoogle(false); paramSauvegardes(); };
    $('#s-gauto').onchange = (e) => { sec.google = e.target.checked; modifie(); };
    try {
      const r = await A.sauvegardeListe({ url: pub.url, cle: pub.cle });
      $('#s-liste').innerHTML = r.sauvegardes.length ? `<table class="tab tab-compact"><tr><th>Sauvegarde</th><th>Date</th><th class="num">Taille</th><th></th></tr>${r.sauvegardes.map((x, i) => `<tr><td>${esc(x.nom)}</td><td>${new Date(x.date).toLocaleString('fr-FR')}</td><td class="num">${Math.round(x.taille / 1024)} Ko</td><td><button class="btn btn-petit toujours" data-rest="${i}">Restaurer…</button></td></tr>`).join('')}</table>` : 'Aucune sauvegarde sur Google Drive.';
      $$('[data-rest]').forEach(b => b.onclick = async () => {
        const x = r.sauvegardes[+b.dataset.rest];
        if (!await confirmer('Restaurer une sauvegarde', `La sauvegarde <b>${esc(x.nom)}</b> sera enregistrée comme un <b>nouveau fichier</b> d'exercice, puis ouverte. Le fichier actuel n'est pas modifié.`, 'Restaurer')) return;
        try { const c = await A.sauvegardeLire({ url: pub.url, cle: pub.cle, nom: x.nom }); await enregistrer(true); if (await creerExercice(M.normaliser(JSON.parse(c.contenu)), x.nom.replace(/\.amasso$/i, '') + ' (restauré)')) toast('Sauvegarde restaurée.', 'ok'); }
        catch (e) { toast('Restauration impossible : ' + nettoyerErreur(e), 'err'); }
      });
    } catch (e) { $('#s-liste').innerHTML = `<span style="color:var(--rouge)">${esc(nettoyerErreur(e))}</span> — le site doit être à la version 1.6 (voir Codes QR).`; }
  }
  function paramExercice() {
    const p = P(), b = M.bilan(S.session);
    $('#p-contenu').innerHTML = `<div class="carte"><h3>Exercice ${esc(p.exercice)}</h3><div class="form-grille">
        <div class="champ"><label>Année de l'exercice</label><input type="number" data-p="exercice" value="${esc(p.exercice)}"></div>
        <div class="champ"><label>Report de l'exercice précédent (${esc(dev())})</label><input type="number" step="any" data-p="reportSolde" value="${esc(p.reportSolde)}"></div>
        <div class="champ"><label>Solde actuel</label><b style="padding-top:8px">${mtd(b.solde)}</b></div></div></div>
      ${S.session.reportArrieres ? (() => { const ra = S.session.reportArrieres, tt = M.totauxCloture(ra.lignes); return `<div class="carte"><h3>Arriérés reçus de l'exercice ${esc(ra.depuis)}</h3>
        <p>${tt.nReporte} membre(s) reporté(s) pour <b>${mtd(tt.reporte)}</b>${tt.nAnnule ? ` · ${tt.nAnnule} dette(s) annulée(s) (${mtd(tt.annule)})` : ''}${tt.nInactif ? ` · ${tt.nInactif} membre(s) rendu(s) inactif(s)` : ''}.</p>
        <button class="btn toujours" id="p-etat-recu">État des arriérés ${esc(ra.depuis)} (PDF)</button></div>`; })() : ''}
      ${exerciceClos() ? `<div class="carte"><h3>Exercice clôturé</h3><p>Clôturé le <b>${new Date(S.session.cloture.le).toLocaleString('fr-FR')}</b>${S.session.cloture.par ? ' par <b>' + esc(S.session.cloture.par) + '</b>' : ''} ; exercice suivant : <b>${esc(S.session.cloture.vers)}</b>.</p>
        <div class="groupe-btn"><button class="btn toujours" id="p-etat-clos">État des arriérés au 31/12/${esc(p.exercice)} (PDF)</button>${estTresorier() && !(S.lic && S.lic.lectureSeule) ? '<button class="btn btn-danger toujours" id="p-rouvrir">Rouvrir l\'exercice…</button>' : ''}</div></div>` : `
      <div class="carte"><h3>Clôturer l'exercice et passer à ${Number(p.exercice) + 1}</h3>
        <p class="aide">Crée un nouveau fichier pour l'année ${Number(p.exercice) + 1} avec les mêmes membres, les mêmes types de cotisation et paramètres. Les versements, dépenses et dons repartent à zéro et le solde actuel (<b>${mtd(b.solde)}</b>) est reporté. L'exercice ${esc(p.exercice)} reste intact et consultable.</p>
        <p class="aide"><b>Membres pas à jour :</b> une fenêtre de clôture les liste ; pour chacun, la dette est <b>reportée</b> (cotisation « Arriérés ${esc(p.exercice)} » de l'année suivante), <b>annulée</b> (motif obligatoire) ou le membre est <b>rendu inactif</b>. L'exercice ${esc(p.exercice)} passe ensuite en consultation seule.</p>
        <button class="btn btn-primaire" id="p-suivant">Clôturer ${esc(p.exercice)} et démarrer ${Number(p.exercice) + 1}…</button></div>`}
      <div class="carte"><h3>Remise à zéro</h3><div class="groupe-btn">
        <button class="btn btn-danger" id="p-raz-cot">Effacer tous les versements</button><button class="btn btn-danger" id="p-raz-op">Effacer dépenses et dons</button></div>
        <p class="aide">Une sauvegarde automatique est faite avant chaque effacement (dossier des sauvegardes).</p></div>`;
    $$('[data-p]').forEach(inp => inp.onchange = () => { if (!peutModifier()) return; p[inp.dataset.p] = Number(inp.value) || 0; modifie(); appliquerTheme(); $('#sous-titre').textContent = sousTitre(); paramExercice(); });
    if ($('#p-suivant')) $('#p-suivant').onclick = () => { if (!peutModifier()) return; if (!estTresorier()) { toast('Réservé au trésorier.', 'err'); return; } cloturerExercice(); };
    if ($('#p-etat-clos')) $('#p-etat-clos').onclick = (e) => pdf(Docs.etatArrieres(S.session, S.session.cloture.lignes, Number(p.exercice), S.session.cloture), e.target);
    if ($('#p-etat-recu')) $('#p-etat-recu').onclick = (e) => pdf(Docs.etatArrieres(S.session, S.session.reportArrieres.lignes, S.session.reportArrieres.depuis, null), e.target);
    if ($('#p-rouvrir')) $('#p-rouvrir').onclick = async () => {
      if (!await confirmer("Rouvrir l'exercice", `L'exercice <b>${esc(p.exercice)}</b> redeviendra modifiable. <b>Attention</b> : l'exercice ${esc(S.session.cloture.vers)} a déjà été créé avec les arriérés calculés à la clôture ; une modification ici ne s'y reportera pas. À n'utiliser que pour corriger une erreur, en accord avec le bureau.`, 'Rouvrir', true)) return;
      S.session.historiqueClotures = (S.session.historiqueClotures || []).concat([Object.assign({ rouvertLe: new Date().toISOString(), rouvertPar: S.user ? S.user.nom : '' }, S.session.cloture)]);
      delete S.session.cloture; journal('Réouverture de l\'exercice', ''); modifie(); allerA('parametres'); toast('Exercice rouvert.', 'ok');
    };
    $('#p-raz-cot').onclick = async () => {
      if (!peutModifier()) return;
      if (!await confirmer('Effacer les versements', 'Tous les versements de toutes les cotisations seront effacés.', 'Tout effacer', true)) return;
      await enregistrer(true); cots().forEach(k => { k.versements = {}; }); modifie(); toast('Versements effacés.');
    };
    $('#p-raz-op').onclick = async () => {
      if (!peutModifier()) return;
      if (!await confirmer('Effacer dépenses et dons', 'Toutes les dépenses et tous les dons seront effacés.', 'Tout effacer', true)) return;
      await enregistrer(true); S.session.depenses = []; S.session.dons = []; modifie(); toast('Dépenses et dons effacés.');
    };
  }

  // ------------------------------------------------------------ verrouillage de l'écran
  let dernierGeste = Date.now();
  const geste = () => { dernierGeste = Date.now(); };
  ['pointerdown', 'keydown', 'wheel'].forEach(ev => document.addEventListener(ev, geste, true));
  let dernierMvt = 0; document.addEventListener('pointermove', () => { const t = Date.now(); if (t - dernierMvt > 4000) { dernierMvt = t; geste(); } }, true);
  const delaiVerrou = () => { const v = UI.lireLS('asso-verrou-min'); return v === null ? 10 : Number(v) || 0; };
  const peutVerrouiller = () => !!(S.user && licenceActive());
  async function verrouiller(cause) {
    if (S.verrouille) return;
    if (!peutVerrouiller()) { toast("Le verrouillage de l'écran fonctionne avec la version activée (comptes utilisateurs).", ''); return; }
    S.verrouille = true;
    if (S.chemin && S.session) { try { await enregistrer(true); } catch (e) { /* enregistrement best effort */ } }
    A.comptesNoter({ ev: 'verrouillage', detail: cause === 'auto' ? `inactivité (${delaiVerrou()} min)` : 'manuel' }).catch(() => {});
    $$('.palette-fond').forEach(x => x.remove());
    const v = document.createElement('div'); v.className = 'verrou';
    v.innerHTML = `<div class="verrou-heure" id="vr-h"></div><div class="verrou-carte"><div class="grand-cadenas">${UI.icone('cadenas')}</div>
      <h3>Session verrouillée</h3><p>${esc(S.user.nom)} — ${esc(S.user.libelleRole)}<br>${cause === 'auto' ? `Verrouillage automatique après ${delaiVerrou()} minute(s) d'inactivité.` : 'Écran verrouillé.'} Vos données sont enregistrées.</p>
      <div class="champ cx-champ" style="text-align:left"><label>Mot de passe</label>${UI.icone('cadenas')}<input type="password" class="entree" id="vr-mdp" autocomplete="off"></div>
      <div id="vr-err" style="text-align:left"></div>
      <button class="btn btn-primaire btn-grand" id="vr-ok" style="width:100%;justify-content:center;margin-top:12px">Déverrouiller</button>
      <p class="aide" style="margin-top:12px"><a class="lien" id="vr-autre" style="cursor:pointer;text-decoration:underline">Changer d'utilisateur</a></p></div>`;
    document.body.appendChild(v);
    const heure = () => { const h = $('#vr-h', v); if (h) h.innerHTML = `${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}<small>${dateLongue()}</small>`; };
    heure(); const mh = setInterval(heure, 15000);
    const fin = () => { clearInterval(mh); v.remove(); S.verrouille = false; geste(); };
    const ok = async () => {
      try { await A.comptesVerifier($('#vr-mdp', v).value); fin(); toast(`Bon retour, ${S.user.nom}.`, 'ok'); }
      catch (e) {
        const m = nettoyerErreur(e); $('#vr-err', v).innerHTML = `<div class="erreur-cx">${esc(m)}</div>`; UI.secouer($('.verrou-carte', v)); $('#vr-mdp', v).value = '';
        if (/bloqué/i.test(m)) setTimeout(() => { fin(); deconnecter(); }, 2500);
      }
    };
    $('#vr-ok', v).onclick = ok; $('#vr-mdp', v).onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    $('#vr-autre', v).onclick = () => { fin(); deconnecter(); };
    setTimeout(() => $('#vr-mdp', v).focus(), 80);
  }
  setInterval(() => { const d = delaiVerrou(); if (d > 0 && peutVerrouiller() && !S.verrouille && !$('#ecran-connexion:not(.masque)') && Date.now() - dernierGeste > d * 60000) verrouiller('auto'); }, 15000);

  // ------------------------------------------------------------ palette de commandes (Ctrl + K)
  function commandes() {
    const c = [];
    const ecr = [['tableau', 'tableau'], ['membres', 'membres'], ['reunions', 'reunions'], ['cotisations', 'cotisations'], ['depenses', 'depenses'], ['dons', 'dons'], ['solidarite', 'solidarite'], ['caisses', 'caisses'], ['bilan', 'bilan'], ['documents', 'documents'], ['qr', 'qr'], ['parametres', 'parametres']];
    ecr.forEach(([v, i]) => c.push({ g: 'Écrans', ico: i, lib: TITRES[v], cle: TITRES[v], f: () => allerA(v) }));
    [['securite', 'Centre de sécurité'], ['sauvegardes', 'Sauvegardes'], ['journal', 'Journal des opérations'], ['budget', 'Budget prévisionnel'], ['utilisateurs', 'Utilisateurs']].forEach(([o, l]) => {
      if (o === 'utilisateurs' && !licenceActive()) return;
      c.push({ g: 'Écrans', ico: o === 'securite' ? 'bouclier' : o === 'sauvegardes' ? 'sauvegarde' : 'parametres', lib: l, det: 'Paramètres', cle: l, f: () => { S.ongletParam = o; allerA('parametres'); } });
    });
    const ec = peutModifierSilencieux();
    if (ec) c.push({ g: 'Actions', ico: 'recu', lib: 'Encaisser un paiement', det: 'Ctrl + E', cle: 'encaisser paiement reçu cotisation', f: () => encaisserMembre(null, null) });
    if (ec) c.push({ g: 'Actions', ico: 'depenses', lib: 'Nouvelle dépense', cle: 'nouvelle dépense', f: () => { allerA('depenses'); editerOperation('depenses', null); } });
    if (ec) c.push({ g: 'Actions', ico: 'dons', lib: 'Nouveau don', cle: 'nouveau don', f: () => { allerA('dons'); editerOperation('dons', null); } });
    if (!lectureSeule()) c.push({ g: 'Actions', ico: 'membres', lib: 'Ajouter un membre', cle: 'ajouter nouveau membre', f: () => { allerA('membres'); editerMembre(null); } });
    c.push({ g: 'Actions', ico: 'whatsapp', lib: 'Relancer les membres pas à jour', cle: 'relancer relance whatsapp retard', f: () => { allerA('cotisations'); relancer(actifs()); } });
    if (PUB().url) c.push({ g: 'Actions', ico: 'qr', lib: 'Publier le site des membres', cle: 'publier site en ligne', f: () => publier(false) });
    c.push({ g: 'Actions', ico: 'sauvegarde', lib: 'Sauvegarder maintenant (copie de secours et Google Drive)', cle: 'sauvegarder sauvegarde usb google', f: async () => { if (SEC().dossier) await copierSecours(false); if (PUB().url) await sauverGoogle(false); if (!SEC().dossier && !PUB().url) { S.ongletParam = 'sauvegardes'; allerA('parametres'); } } });
    if (peutVerrouiller()) c.push({ g: 'Actions', ico: 'cadenas', lib: "Verrouiller l'écran", det: 'Ctrl + L', cle: 'verrouiller verrou', f: () => verrouiller('manuel') });
    c.push({ g: 'Actions', ico: UI.themeActuel() === 'sombre' ? 'soleil' : 'lune', lib: UI.themeActuel() === 'sombre' ? 'Passer en mode clair' : 'Passer en mode sombre', det: 'Ctrl + Maj + D', cle: 'mode sombre clair thème', f: () => UI.basculerTheme() });
    c.push({ g: 'Actions', ico: 'visite', lib: 'Visite guidée', det: 'F1', cle: 'visite guidée aide', f: lancerVisite });
    c.push({ g: 'Actions', ico: 'clavier', lib: 'Raccourcis clavier', cle: 'raccourcis clavier', f: raccourcis });
    c.push({ g: 'Actions', ico: 'sortie', lib: "Changer d'exercice", cle: 'changer exercice ouvrir', f: async () => { await enregistrer(true); afficherAccueil(); } });
    return c;
  }
  function peutModifierSilencieux() { return !lectureSeule(); }
  function palette() {
    if (!S.session || S.verrouille || $('.palette-fond')) return;
    const f = document.createElement('div'); f.className = 'palette-fond';
    f.innerHTML = `<div class="palette"><div class="palette-saisie">${UI.icone('recherche')}<input id="pal-q" placeholder="Rechercher un membre, un reçu, un écran, une action…" autocomplete="off"></div>
      <div class="palette-liste" id="pal-l"></div><div class="palette-pied"><span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span></div></div>`;
    document.body.appendChild(f);
    const cmds = commandes(); let items = [], sel = 0;
    const fermer = () => f.remove();
    const dessiner = () => {
      const q = norm($('#pal-q', f).value).trim(), mots = q.split(/\s+/).filter(Boolean);
      const vrai = (t) => mots.every(m => norm(t).includes(m));
      items = [];
      if (q) {
        membres().filter(m => vrai([m.ident, m.nom, m.prenoms, m.contact, m.residence, m.fonction].join(' '))).sort(M.triMembres).slice(0, 8)
          .forEach(m => items.push({ g: 'Membres', ico: 'utilisateur', lib: `${m.ident} · ${M.nomComplet(m)}`, det: [m.residence, m.contact].filter(Boolean).join(' · '), f: () => editerMembre(m) }));
        (S.session.recus || []).filter(r => vrai([r.num, r.nom, r.ident].join(' '))).slice(-6).reverse()
          .forEach(r => items.push({ g: 'Reçus', ico: 'recu', lib: `Reçu ${r.num} — ${r.nom}`, det: `${dateFr(r.date)} · ${mtd(r.total)}${r.annule ? ' · annulé' : ''}`, f: () => actionsRecu(r) }));
      }
      cmds.filter(c => !q || vrai(c.cle + ' ' + c.lib)).slice(0, q ? 12 : 30).forEach(c => items.push(c));
      sel = Math.min(sel, Math.max(0, items.length - 1));
      let g = '';
      $('#pal-l', f).innerHTML = items.map((x, i) => `${x.g !== g ? `<div class="palette-groupe">${(g = x.g)}</div>` : ''}<div class="palette-item ${i === sel ? 'sel' : ''}" data-i="${i}">${UI.icone(x.ico)}<span>${esc(x.lib)}</span>${x.det ? `<small>${esc(x.det)}</small>` : ''}</div>`).join('')
        || '<div class="vide" style="margin:10px">Aucun résultat.</div>';
      $$('.palette-item', f).forEach(el => { el.onclick = () => lancer(+el.dataset.i); el.onmousemove = () => { if (sel !== +el.dataset.i) { sel = +el.dataset.i; $$('.palette-item', f).forEach(x => x.classList.toggle('sel', +x.dataset.i === sel)); } }; });
      const s = $('.palette-item.sel', f); if (s) s.scrollIntoView({ block: 'nearest' });
    };
    const lancer = (i) => { const x = items[i]; if (!x) return; fermer(); x.f(); };
    $('#pal-q', f).oninput = () => { sel = 0; dessiner(); };
    $('#pal-q', f).onkeydown = (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); dessiner(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); dessiner(); e.preventDefault(); }
      else if (e.key === 'Enter') lancer(sel);
      else if (e.key === 'Escape') fermer();
    };
    f.onclick = (e) => { if (e.target === f) fermer(); };
    dessiner(); setTimeout(() => $('#pal-q', f).focus(), 30);
  }
  function raccourcis() {
    const l = [['Ctrl + K', 'Rechercher un membre, un reçu, un écran ou une action'], ['Ctrl + E', 'Encaisser un paiement'], ['Ctrl + L', "Verrouiller l'écran"], ['Ctrl + Maj + D', 'Mode sombre / mode clair'],
      ['Alt + 1 … 9', 'Aller à un écran du menu (dans l\'ordre)'], ['F1', 'Visite guidée'], ['Échap', 'Fermer une fenêtre']];
    modale({ titre: 'Raccourcis clavier', corps: `<table class="tab">${l.map(([k, t]) => `<tr><td style="width:150px"><span class="outil" style="height:26px;cursor:default"><kbd>${k}</kbd></span></td><td>${t}</td></tr>`).join('')}</table>` });
  }
  document.addEventListener('keydown', (e) => {
    if (S.verrouille) return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'k') { e.preventDefault(); palette(); }
    else if (ctrl && k === 'l') { e.preventDefault(); if (S.session || S.user) verrouiller('manuel'); }
    else if (ctrl && k === 'e' && S.session && !$('#modale-fond:not(.masque)')) { e.preventDefault(); if (!lectureSeule()) encaisserMembre(null, null); }
    else if (ctrl && e.shiftKey && k === 'd') { e.preventDefault(); UI.basculerTheme(); }
    else if (e.key === 'F1' && S.session) { e.preventDefault(); lancerVisite(); }
    else if (e.altKey && /^[1-9]$/.test(e.key) && S.session && !$('#modale-fond:not(.masque)')) {
      e.preventDefault(); const v = $$('#nav a:not(.sous-nav)')[Number(e.key) - 1]; if (v) allerA(v.dataset.vue, { genre: '' });
    }
  });

  // ------------------------------------------------------------ visite guidée
  function lancerVisite() {
    if (!S.session) return;
    if (S.vue !== 'tableau') allerA('tableau');
    setTimeout(() => UI.visite([
      { titre: 'Bienvenue dans AMEDIS pro Asso 2.0', texte: `Cette visite vous présente l'essentiel en quelques étapes. Vous pourrez la relancer à tout moment avec la touche <b>F1</b> ou le bouton en bas du menu.` },
      { cible: '#nav', titre: 'Le menu', texte: 'Chaque écran de la gestion : membres, réunions, cotisations, dépenses, dons, solidarité, caisses, bilan, documents et codes QR. <b>Alt + 1 … 9</b> y mène directement.' },
      { cible: '.bandeau-accueil', titre: 'Le tableau de bord', texte: "L'état de l'association en un coup d'œil : taux de recouvrement, membres à jour, solde et caisses, avec un voyant qui signale ce qui demande votre attention." },
      { cible: '#tb-encaisser', titre: 'Encaisser un paiement', texte: 'Le geste principal du trésorier : choisissez le membre, le logiciel propose ce qu\'il doit, et un <b>reçu numéroté</b> est émis (PDF, image ou WhatsApp). Raccourci : <b>Ctrl + E</b>.' },
      { cible: '#nav a[data-vue="caisses"]', titre: "Où est l'argent", texte: 'Espèces, Wave, Orange Money, MTN, Moov, banque : chaque encaissement et chaque dépense vont dans leur caisse. Le total est toujours égal au solde du bilan.' },
      { cible: '#nav a[data-vue="qr"]', titre: 'Espace des membres', texte: 'Publiez le site de consultation : chaque membre voit son dossier, ses cotisations et ses reçus sur son téléphone, grâce aux codes QR et aux cartes de membre.' },
      { cible: '#btn-palette', titre: 'Recherche rapide', texte: 'Un membre, un reçu, un écran, une action : tapez quelques lettres. Raccourci : <b>Ctrl + K</b>.' },
      { cible: '.outils-entete', titre: 'Confort et sécurité', texte: "Mode sombre pour le soir, et verrouillage de l'écran quand vous vous absentez (<b>Ctrl + L</b>). L'écran se verrouille aussi tout seul après quelques minutes d'inactivité." },
      { cible: '#nav a[data-vue="parametres"]', titre: 'Paramètres et centre de sécurité', texte: "Association, cotisations, budget, journal infalsifiable, sauvegardes sur clé USB et Google Drive, utilisateurs, et le <b>centre de sécurité</b> qui note la protection de vos données." }
    ], (termine) => { if (termine) toast('Bonne gestion avec AMEDIS pro Asso !', 'ok'); }), 350);
  }

  // ------------------------------------------------------------ démarrage
  UI.iconesMenu($('#nav'));
  $('#btn-palette').innerHTML = `${UI.icone('recherche')}<span style="font-size:12.5px">Rechercher</span><kbd>Ctrl K</kbd>`; $('#btn-palette').onclick = palette;
  $('#btn-verrou').innerHTML = UI.icone('cadenas'); $('#btn-verrou').onclick = () => verrouiller('manuel');
  $('#btn-visite').innerHTML = `${UI.icone('visite')} Visite guidée`; $('#btn-visite').onclick = lancerVisite;
  $('#btn-raccourcis').innerHTML = `${UI.icone('clavier')} Raccourcis`; $('#btn-raccourcis').onclick = raccourcis;
  $$('[data-bascule-theme]').forEach(b => b.onclick = () => { UI.basculerTheme(); });
  UI.majBoutonsTheme();
  window.addEventListener('resize', () => UI.pastille($('#nav')));
  $$('#nav a').forEach(a => a.onclick = () => allerA(a.dataset.vue, { genre: a.dataset.genre || '' }));
  $('#btn-nouvelle').onclick = () => estTresorier() ? nouvelExercice() : toast('Réservé au trésorier.', 'err');
  $('#btn-reprise').onclick = () => estTresorier() ? repriseExcel() : toast('Réservé au trésorier.', 'err');
  $('#btn-licence').onclick = fenetreLicence;
  $('#btn-ouvrir').onclick = () => ouvrir(null);
  $('#btn-changer-session').onclick = async () => { await enregistrer(true); afficherAccueil(); };
  majUtilisateur();
  setInterval(() => { if (S.session) chargerLicence(); }, 10 * 60 * 1000);
  porteEntree();
})();
