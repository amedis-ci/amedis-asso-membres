/* AMEDIS pro Asso Mobile — remplace le processus principal Electron (main.js) dans la WebView Android.
   Expose window.amedis avec exactement les mêmes fonctions que preload.js du logiciel PC.
   Le pont Java « AmedisNatif » fournit : fichiers de l'appli, empreintes (SHA-256, HMAC, PBKDF2), Internet,
   sélecteurs de fichiers, PDF, impression, partage et téléchargements. Aucune clé privée ici. */
(function () {
  'use strict';
  const N = window.AmedisNatif;
  const L = window.LibsNode;

  // ------------------------------------------------------------------ appels au pont
  function sync(nom, ...args) {
    const r = N[nom](...args);
    if (typeof r === 'string' && r.startsWith('\u0000ERR:')) throw new Error(r.slice(5));
    return r;
  }
  const attentes = {};
  let compteur = 0;
  window.__natifRetour = (id, ok, json) => {
    const a = attentes[id]; if (!a) return; delete attentes[id];
    let v = null; try { v = json ? JSON.parse(json) : null; } catch (e) { v = json; }
    if (ok) a.ok(v); else a.ko(new Error((v && v.erreur) || String(v || 'Opération impossible.')));
  };
  function asynchrone(methode, args) {
    return new Promise((ok, ko) => {
      const id = 'n' + (++compteur);
      attentes[id] = { ok, ko };
      try { N.lancer(id, methode, JSON.stringify(args || {})); } catch (e) { delete attentes[id]; ko(e); }
    });
  }

  // ------------------------------------------------------------------ fichiers de l'appli
  const F = {
    lire: (rel) => { const t = sync('lireTexte', rel); return t === '\u0000ABSENT' ? null : t; },
    ecrire: (rel, texte) => sync('ecrireTexte', rel, String(texte)),
    liste: (rel) => JSON.parse(sync('lister', rel) || '[]'),
    supprimer: (rel) => sync('supprimer', rel),
    existe: (rel) => sync('existe', rel) === '1',
    lireJSON(rel, defaut) { try { const t = F.lire(rel); return t == null ? defaut : JSON.parse(t); } catch (e) { return defaut; } }
  };
  const sha256 = (t) => sync('sha256', String(t));
  const hmac = (cle, t) => sync('hmac', String(cle), String(t));
  const aleatoire = (n) => sync('aleatoire', n);
  const NOM_APP = 'AMEDIS pro Asso', EXT = 'amasso';
  const nomFichierSur = (s) => String(s || 'exercice').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'session';
  const base = (p) => String(p || '').split(/[\\/]/).pop();
  const sansExt = (p) => base(p).replace(/\.[^.]+$/, '');
  const fichierDe = (nom, contenu) => ({ nom, contenu });

  // ------------------------------------------------------------------ licence (même clé que le logiciel PC : le code de ce téléphone figure parmi les postes)
  const LIC = (function () {
    const CLE_PUBLIQUE = 'MCowBQYDK2VwAyEABdgABYOinuTMp+LSw9PWI9/k71827UA/i/28b4mJXZo=';
    const JOURS_ESSAI = 7, JOURS_RAPPEL = 30, PREFIXE = 'AMEDIS1', PRODUIT = 'ASSO';
    const NOMS_PRODUITS = { EXAMEN: 'AMEDIS 2026 PRO', ASSO: 'AMEDIS pro Asso', HEXA: 'AMEDIS HEXA 3D' };
    const deb64u = (s) => { const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
    const deb64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
    const identifiantMachine = () => 'android:' + sync('idAppareil');
    const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let codeCache = null;
    function codePoste() {
      if (codeCache) return codeCache;
      const hex = sha256('AMEDIS|poste|' + identifiantMachine());
      let bits = '', code = '';
      for (let i = 0; i < hex.length; i += 2) bits += parseInt(hex.slice(i, i + 2), 16).toString(2).padStart(8, '0');
      for (let i = 0; i < 12; i++) code += ALPHABET[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
      codeCache = `AMD-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      return codeCache;
    }
    const normaliserCode = (c) => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^AMD/, '');
    function lireCle(texte) {
      const brut = String(texte || '').replace(/\s+/g, '');
      const m = new RegExp('^' + PREFIXE + '\\.([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$').exec(brut);
      if (!m) throw new Error('Format de clé non reconnu. Copiez la clé complète, qui commence par « AMEDIS1. ».');
      const donnees = deb64u(m[1]), signature = deb64u(m[2]);
      const pub = deb64(CLE_PUBLIQUE).slice(-32);   // clé Ed25519 brute à la fin de la structure SPKI
      let signee = false; try { signee = !!window.nacl && window.nacl.sign.detached.verify(donnees, signature, pub); } catch (e) { signee = false; }
      if (!signee) throw new Error('Clé invalide : la signature ne correspond pas (clé modifiée ou mal copiée).');
      const l = JSON.parse(new TextDecoder('utf-8').decode(donnees));
      if (!l || l.v !== 1 || !l.fin || !Array.isArray(l.postes)) throw new Error('Clé incomplète.');
      if (l.prod !== PRODUIT) throw new Error(`Cette clé est une licence ${NOMS_PRODUITS[l.prod || 'EXAMEN'] || "d'un autre logiciel"} : elle ne convient pas à AMEDIS pro Asso. Demandez une clé « AMEDIS pro Asso ».`);
      l.texte = brut;
      return l;
    }
    const FICHIERS = ['Config/licence.json', 'Config/.etat-licence.dat'];
    const sceau = (o) => hmac('AMEDIS-ASSO|' + identifiantMachine(), JSON.stringify([o.premierLancement, o.derniereVue, o.licence || ''])).slice(0, 32);
    function chargerEtat() {
      const [a, b] = FICHIERS.map(f => F.lireJSON(f, null));
      const valides = [a, b].filter(x => x && x.sceau === sceau(x));
      const altere = [a, b].some(x => x && x.sceau !== sceau(x));
      const maintenant = new Date().toISOString();
      return {
        premierLancement: valides.map(x => x.premierLancement).filter(Boolean).sort()[0] || (altere ? '2000-01-01T00:00:00.000Z' : maintenant),
        derniereVue: valides.map(x => x.derniereVue).filter(Boolean).sort().pop() || maintenant,
        licence: (valides.find(x => x.licence) || {}).licence || null
      };
    }
    function sauverEtat(etat) { const o = Object.assign({}, etat); o.sceau = sceau(o); FICHIERS.forEach(f => { try { F.ecrire(f, JSON.stringify(o)); } catch (e) { /* sans effet */ } }); }
    const finDeJour = (iso) => new Date(iso + 'T23:59:59');
    const joursEntre = (a, b) => Math.ceil((b - a) / 86400000);
    function etatLicence() {
      const etat = chargerEtat(), maintenant = new Date(), code = codePoste();
      const r = { codePoste: code, mode: '', jours: 0, licence: null, message: '', lectureSeule: false, filigrane: null, joursEssai: JOURS_ESSAI };
      const derniere = new Date(etat.derniereVue);
      if (maintenant < new Date(derniere.getTime() - 36 * 3600 * 1000)) {
        r.mode = 'horloge'; r.lectureSeule = true; r.filigrane = 'DATE DU TÉLÉPHONE INCORRECTE — DOCUMENT NON OFFICIEL';
        r.message = `La date du téléphone (${maintenant.toLocaleDateString('fr-FR')}) est antérieure à la dernière utilisation (${derniere.toLocaleDateString('fr-FR')}). Corrigez la date et l'heure dans les réglages du téléphone.`;
        return r;
      }
      if (maintenant > derniere) etat.derniereVue = maintenant.toISOString();
      let lic = null, erreurLic = '';
      if (etat.licence) {
        try {
          lic = lireCle(etat.licence);
          if (!lic.postes.map(normaliserCode).includes(normaliserCode(code))) { erreurLic = 'La licence enregistrée ne concerne pas ce téléphone.'; lic = null; }
        } catch (e) { erreurLic = e.message; lic = null; }
      }
      if (lic) {
        r.licence = { numero: lic.n, etablissement: lic.etab, codeEtablissement: lic.codeEtab || '', fin: lic.fin, debut: lic.debut, postes: lic.postes, formule: lic.formule || 'PRO' };
        const fin = finDeJour(lic.fin);
        r.jours = joursEntre(maintenant, fin);
        if (maintenant > fin) {
          r.mode = 'expiree'; r.lectureSeule = true; r.filigrane = 'LICENCE EXPIRÉE — DOCUMENT NON OFFICIEL';
          r.message = `La licence de ${lic.etab} a expiré le ${fin.toLocaleDateString('fr-FR')}. Renouvelez-la pour enregistrer de nouvelles opérations et produire les documents officiels. Vos données restent consultables et exportables.`;
        } else if (r.jours <= JOURS_RAPPEL) {
          r.mode = 'rappel'; r.message = `La licence de ${lic.etab} expire le ${fin.toLocaleDateString('fr-FR')} (dans ${r.jours} jour${r.jours > 1 ? 's' : ''}). Pensez à la renouveler.`;
        } else r.mode = 'valide';
      } else {
        const debut = new Date(etat.premierLancement), finEssai = new Date(debut.getTime() + JOURS_ESSAI * 86400000);
        r.jours = Math.max(0, joursEntre(maintenant, finEssai)); r.finEssai = finEssai.toISOString();
        if (maintenant < finEssai) {
          r.mode = 'essai'; r.filigrane = "VERSION D'ÉVALUATION — DOCUMENT NON OFFICIEL";
          r.message = `Version d'évaluation : ${r.jours} jour${r.jours > 1 ? 's' : ''} restant${r.jours > 1 ? 's' : ''}. Les documents portent la mention « Version d'évaluation ».`;
        } else {
          r.mode = 'essai-expire'; r.lectureSeule = true; r.filigrane = "VERSION D'ÉVALUATION EXPIRÉE — DOCUMENT NON OFFICIEL";
          r.message = `La période d'essai de ${JOURS_ESSAI} jours est terminée. Activez une licence pour continuer à enregistrer des opérations. Vos données restent consultables et exportables.`;
        }
        if (erreurLic) r.message = erreurLic + ' ' + r.message;
      }
      sauverEtat(etat);
      return r;
    }
    function activer(texte) {
      const lic = lireCle(texte), code = codePoste();
      if (!lic.postes.map(normaliserCode).includes(normaliserCode(code)))
        throw new Error(`Cette clé est destinée aux postes ${lic.postes.join(', ')}. Le code de ce téléphone est ${code} : demandez une clé qui l'inclut (la même licence peut couvrir l'ordinateur et le téléphone).`);
      if (new Date() > finDeJour(lic.fin)) throw new Error(`Cette clé a expiré le ${finDeJour(lic.fin).toLocaleDateString('fr-FR')}.`);
      const etat = chargerEtat(); etat.licence = lic.texte; sauverEtat(etat);
      return etatLicence();
    }
    function retirer() { const etat = chargerEtat(); etat.licence = null; sauverEtat(etat); return etatLicence(); }
    return { codePoste, lireCle, etatLicence, activer, retirer };
  })();

  let etatCache = null, etatCacheLe = 0;
  function etatLic(forcer) {
    if (forcer || !etatCache || Date.now() - etatCacheLe > 60000) { etatCache = LIC.etatLicence(); etatCacheLe = Date.now(); }
    // essais automatiques uniquement (jamais dans l'APK publiée : version de mise au point seulement)
    if (sync('miseAuPoint') === '1' && sync('testLicence') === '1' && !etatCache.licence) etatCache = Object.assign({}, etatCache, { mode: 'valide', lectureSeule: false, filigrane: null, message: '', jours: 300,
      licence: { numero: 'TEST-1', etablissement: 'ASSOCIATION EXEMPLE (FICTIVE)', codeEtablissement: '', fin: '2027-12-31', debut: '2026-01-01', postes: ['TEST'], formule: 'PRO' } });
    return etatCache;
  }
  function exigerEcriture() { const e = etatLic(); if (e.lectureSeule) throw new Error(e.message || 'Licence inactive : lecture seule.'); }

  // ------------------------------------------------------------------ comptes (mots de passe protégés par PBKDF2 sur le téléphone)
  const CPT = (function () {
    const ROLES = { tresorier: 'Trésorier (administrateur)', president: 'Président', sg: 'Secrétaire général' };
    const FICHIER = 'Config/comptes.json';
    const normLogin = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.');
    const lire = () => { const d = F.lireJSON(FICHIER, null); if (d && Array.isArray(d.comptes)) { d.historique = Array.isArray(d.historique) ? d.historique : []; return d; } return { comptes: [], historique: [] }; };
    const ECHECS_MAX = 5, BLOCAGE_MIN = 5;
    function consigner(d, ev, c, detail) {
      d.historique.push({ le: new Date().toISOString(), ev, login: c ? c.login : '', nom: c ? c.nom : '', detail: String(detail || '').slice(0, 80) });
      if (d.historique.length > 400) d.historique.splice(0, d.historique.length - 400);
    }
    function verifierBlocage(c) {
      if (c && c.bloqueJusqua && Date.parse(c.bloqueJusqua) > Date.now()) {
        throw new Error(`Compte bloqué après ${ECHECS_MAX} essais incorrects. Réessayez dans ${Math.ceil((Date.parse(c.bloqueJusqua) - Date.now()) / 60000)} minute(s).`);
      }
    }
    function noterEchec(d, c, quoi) {
      if (c) { c.echecs = (c.echecs || 0) + 1; if (c.echecs >= ECHECS_MAX) { c.bloqueJusqua = new Date(Date.now() + BLOCAGE_MIN * 60000).toISOString(); c.echecs = 0; consigner(d, 'blocage', c, `${BLOCAGE_MIN} min`); } }
      consigner(d, 'echec', c, quoi);
    }
    const ecrire = (d) => F.ecrire(FICHIER, JSON.stringify(d, null, 1));
    const hacher = (mdp, sel) => sync('pbkdf2', String(mdp), sel);
    const verifierMdp = (c, mdp) => { const h = hacher(mdp, c.sel); let diff = h.length ^ c.hash.length; for (let i = 0; i < Math.min(h.length, c.hash.length); i++) diff |= h.charCodeAt(i) ^ c.hash.charCodeAt(i); return diff === 0; };
    function controleMdp(mdp) {
      const m = String(mdp || '');
      if (m.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      if (!/[A-Za-zÀ-ÿ]/.test(m) || !/[0-9]/.test(m)) throw new Error('Le mot de passe doit contenir au moins une lettre et un chiffre.');
    }
    const publique = (c) => ({ login: c.login, nom: c.nom, role: c.role, libelleRole: ROLES[c.role], creeLe: c.creeLe, derniereConnexion: c.derniereConnexion || '',
      provisoire: !!c.provisoire, mdpChangeLe: c.mdpChangeLe || c.creeLe || '', bloque: !!(c.bloqueJusqua && Date.parse(c.bloqueJusqua) > Date.now()) });
    const trouver = (d, login) => d.comptes.find(x => x.login === normLogin(login));
    return {
      ROLES,
      etat() { const d = lire(); return { aDesComptes: d.comptes.length > 0, administrateur: d.comptes.some(c => c.role === 'tresorier') }; },
      creer({ login, nom, mdp, role }) {
        const d = lire(), l = normLogin(login);
        if (!l) throw new Error("Indiquez un nom d'utilisateur.");
        if (!ROLES[role]) throw new Error('Rôle inconnu.');
        if (!String(nom || '').trim()) throw new Error('Indiquez le nom et les prénoms.');
        controleMdp(mdp);
        if (d.comptes.some(c => c.login === l)) throw new Error(`Le nom d'utilisateur « ${l} » existe déjà.`);
        if (role === 'tresorier' && d.comptes.some(c => c.role === 'tresorier')) throw new Error('Le compte du trésorier existe déjà.');
        if (role !== 'tresorier' && d.comptes.some(c => c.role === role)) throw new Error(`Un compte ${ROLES[role]} existe déjà : supprimez-le d'abord.`);
        const sel = aleatoire(16);
        const c = { login: l, nom: String(nom).trim(), role, sel, hash: hacher(mdp, sel), creeLe: new Date().toISOString(), mdpChangeLe: new Date().toISOString(), provisoire: role !== 'tresorier' };
        d.comptes.push(c); consigner(d, 'creation', c, ROLES[role]); ecrire(d);
        return publique(c);
      },
      connecter(login, mdp) {
        const d = lire(), c = trouver(d, login);
        verifierBlocage(c);
        if (!c || !verifierMdp(c, mdp)) {
          noterEchec(d, c, c ? 'mot de passe incorrect' : 'utilisateur inconnu : ' + normLogin(login)); ecrire(d);
          const reste = c ? ECHECS_MAX - (c.echecs || 0) : 0;
          throw new Error("Nom d'utilisateur ou mot de passe incorrect." + (c && c.echecs ? ` Encore ${reste} essai(s) avant blocage du compte.` : '') + (c && c.bloqueJusqua && Date.parse(c.bloqueJusqua) > Date.now() ? ` Compte bloqué ${BLOCAGE_MIN} minutes.` : ''));
        }
        c.precedenteConnexion = c.derniereConnexion || ''; c.derniereConnexion = new Date().toISOString(); c.echecs = 0; delete c.bloqueJusqua;
        consigner(d, 'connexion', c); ecrire(d);
        return Object.assign(publique(c), { precedenteConnexion: c.precedenteConnexion });
      },
      verifier(login, mdp) {
        const d = lire(), c = trouver(d, login);
        if (!c) throw new Error('Compte introuvable.');
        verifierBlocage(c);
        if (!verifierMdp(c, mdp)) { noterEchec(d, c, 'déverrouillage'); ecrire(d); throw new Error('Mot de passe incorrect.' + (c.bloqueJusqua ? ' Compte bloqué : reconnectez-vous plus tard.' : ` Encore ${ECHECS_MAX - (c.echecs || 0)} essai(s).`)); }
        c.echecs = 0; consigner(d, 'deverrouillage', c); ecrire(d); return true;
      },
      noter(login, ev, detail) { const d = lire(); consigner(d, ev, trouver(d, login), detail); ecrire(d); return true; },
      historique() { return lire().historique.slice().reverse(); },
      lister() { return lire().comptes.map(publique); },
      supprimer(login) {
        const d = lire(), c = trouver(d, login);
        if (!c) throw new Error('Compte introuvable.');
        if (c.role === 'tresorier') throw new Error("Le compte du trésorier (administrateur) ne peut pas être supprimé.");
        d.comptes = d.comptes.filter(x => x !== c); consigner(d, 'suppression', c); ecrire(d); return true;
      },
      changerMdp(login, ancien, nouveau) {
        const d = lire(), c = trouver(d, login);
        if (!c || !verifierMdp(c, ancien)) throw new Error('Mot de passe actuel incorrect.');
        controleMdp(nouveau);
        if (verifierMdp(c, nouveau)) throw new Error("Le nouveau mot de passe doit être différent de l'ancien.");
        c.sel = aleatoire(16); c.hash = hacher(nouveau, c.sel); c.provisoire = false; c.mdpChangeLe = new Date().toISOString();
        consigner(d, 'mot de passe', c, 'changé'); ecrire(d); return true;
      },
      reinitialiserMdp(login, nouveau) {
        const d = lire(), c = trouver(d, login);
        if (!c) throw new Error('Compte introuvable.');
        if (c.role === 'tresorier') throw new Error('Utilisez « Changer mon mot de passe ».');
        controleMdp(nouveau); c.sel = aleatoire(16); c.hash = hacher(nouveau, c.sel); c.provisoire = true; c.mdpChangeLe = new Date().toISOString(); c.echecs = 0; delete c.bloqueJusqua;
        consigner(d, 'mot de passe', c, 'réinitialisé par le trésorier'); ecrire(d); return true;
      },
      toutEffacer() { const d = lire(); d.comptes = []; consigner(d, 'reinitialisation', null, 'comptes effacés avec la clé de licence'); ecrire(d); return true; }
    };
  })();
  let utilisateur = null;
  const licenceActive = () => !!etatLic().licence;
  function exigerTresorier() { if (licenceActive() && (!utilisateur || utilisateur.role !== 'tresorier')) throw new Error('Réservé au trésorier (administrateur).'); }

  // ------------------------------------------------------------------ configuration et exercices
  const CONFIG = 'Config/config.json';
  const lireConfig = () => F.lireJSON(CONFIG, { recents: [] });
  const ecrireConfig = (c) => F.ecrire(CONFIG, JSON.stringify(c, null, 2));
  function ajouterRecent(p) {
    const c = lireConfig();
    c.recents = [p, ...(c.recents || []).filter(x => x.toLowerCase() !== p.toLowerCase())].slice(0, 20);
    c.derniere = p; ecrireConfig(c);
  }
  function lireSession(p) {
    const t = F.lire(p); if (t == null) throw new Error('Exercice introuvable sur ce téléphone.');
    const s = JSON.parse(t);
    if (s.format !== 'AMEDISPROASSO') throw new Error("Ce fichier n'est pas un exercice AMEDIS pro Asso.");
    return s;
  }
  const CLE_SCEAU = 'AMEDIS-pro-Asso/sceau/2026/' + 'k7Qm2xV9pL4tR8wZ';   // même sceau que sur PC : les fichiers passent d'un appareil à l'autre
  function texteScelle(donnees) {
    const o = Object.assign({}, donnees); delete o.sceau;
    o.sceau = hmac(CLE_SCEAU, JSON.stringify(o, null, 1));
    return JSON.stringify(o, null, 1);
  }
  function integrite(s) {
    if (!s || !s.sceau) return 'absent';
    const o = Object.assign({}, s), sc = o.sceau; delete o.sceau;
    return hmac(CLE_SCEAU, JSON.stringify(o, null, 1)) === sc ? 'intact' : 'altere';
  }
  const derniereSauvegarde = {};
  function sauvegardeRotative(p, texte, forcer) {
    const maintenant = Date.now();
    if (!forcer && derniereSauvegarde[p] && maintenant - derniereSauvegarde[p] < 5 * 60 * 1000) return;
    derniereSauvegarde[p] = maintenant;
    const dossier = 'Sauvegardes/' + sansExt(p);
    const horo = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    F.ecrire(`${dossier}/${horo}.${EXT}`, texte);
    const tous = F.liste(dossier).map(x => x.nom).filter(f => f.endsWith('.' + EXT)).sort();
    while (tous.length > 30) F.supprimer(`${dossier}/${tous.shift()}`);
  }
  function cheminLibre(nom) {
    let p = `Exercices/${nomFichierSur(nom)}.${EXT}`, i = 2;
    while (F.existe(p)) p = `Exercices/${nomFichierSur(nom)} (${i++}).${EXT}`;
    return p;
  }

  // ------------------------------------------------------------------ fichiers produits (téléchargements du téléphone)
  const uris = {};   // nom affiché -> adresse Android, pour « Ouvrir »
  async function deposer(sousDossier, nom, base64, mime, ouvrir) {
    const r = await asynchrone('deposer', { sousDossier, nom, base64, mime, ouvrir: !!ouvrir });
    uris[r.affiche] = r.uri;
    return r.affiche;
  }
  const b64Texte = (t) => L.Buffer.from(String(t), 'utf8').toString('base64');

  // ------------------------------------------------------------------ site en ligne (Internet par le pont : pas de blocage CORS)
  async function appelSite(url, corps, query) {
    const local = sync('miseAuPoint') === '1' && /^http:\/\/(127\.0\.0\.1|10\.0\.2\.2):\d+\/exec$/.test(String(url || '').trim());
    if (!local && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(url || '').trim())) throw new Error("Adresse du site incorrecte : elle doit ressembler à https://script.google.com/macros/s/…/exec");
    let r;
    try { r = await asynchrone('http', { url: url.trim() + (query || ''), corps: corps ? JSON.stringify(corps) : null }); }
    catch (e) { throw new Error("Pas de connexion Internet, ou le site ne répond pas. Réessayez plus tard."); }
    let j = null;
    try { j = JSON.parse(r.texte); } catch (err) { throw new Error(/accounts\.google\.com|ServiceLogin/.test(r.texte) ? "Le site demande une connexion Google : dans le déploiement, « Qui a accès » doit être « Tout le monde »." : `Réponse inattendue du site (HTTP ${r.statut}).`); }
    if (!j.ok) throw new Error(j.erreur || 'Le site a refusé la demande.');
    return j;
  }
  function demarchesSite(corps, action) {
    if (licenceActive() && !utilisateur) return Promise.reject(new Error('Connectez-vous pour consulter les démarches.'));
    return appelSite(corps.url, Object.assign({ action: action || 'demandesPC' }, corps, { url: undefined })).catch((e) => {
      if (/Action inconnue|not defined|n'est pas défini|is not a function/i.test(e.message))
        throw new Error(action === 'operationsPC' || action === 'messagesPC'
          ? 'Le site doit être mis à jour en version 1.9.0 (menu Codes QR > Enregistrer les fichiers du site : remplacez Code.gs, ajoutez Bureau.gs, puis Nouvelle version du déploiement).'
          : 'Le site doit être mis à jour en version 1.8.0 (menu Codes QR > Enregistrer les fichiers du site : ajoutez Demandes.gs et remplacez Code.gs, puis Nouvelle version du déploiement).');
      throw e;
    });
  }

  // ------------------------------------------------------------------ documents PDF
  function marquerDocument(html) {
    const e = etatLic();
    if (!e.filigrane) return html;
    const fili = `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999">
      <div style="transform:rotate(-35deg);font:bold 34pt Arial,sans-serif;color:rgba(180,30,20,.16);text-align:center;line-height:1.3;white-space:nowrap">${e.filigrane.replace(' — ', '<br>')}</div></div>`;
    return /<body[^>]*>/.test(html) ? html.replace(/<body[^>]*>/, (m) => m + fili) : fili + html;
  }
  function mentionPied(texte) {
    const e = etatLic();
    if (e.licence && !e.lectureSeule) return texte + ' — Licence : ' + e.licence.etablissement;
    if (e.filigrane) return texte + ' — ' + e.filigrane;
    return texte;
  }
  const cssTexte = (t) => '"' + String(t || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
  /** Mise en page A4 et pied de page (numéros de page) par les règles @page de Chrome */
  function pagePDF(html, paysage, pied) {
    const css = `<style>@page{size:A4 ${paysage ? 'landscape' : 'portrait'};margin:9mm 9mm 12mm 9mm;${pied != null ? `@bottom-left{content:${cssTexte(pied)};font:7.5px Arial,sans-serif;color:#444}@bottom-right{content:"Page " counter(page) " / " counter(pages);font:7.5px Arial,sans-serif;color:#444}` : ''}}
      html{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style>`;
    return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, css + '</head>') : css + html;
  }
  const REGISTRE = 'Config/registre_documents.json';
  const lireRegistre = () => { const r = F.lireJSON(REGISTRE, []); return Array.isArray(r) ? r : []; };
  function enregistrerDocument(ref, nom) {
    const r = lireRegistre(); r.push({ ref, le: new Date().toISOString(), nom: String(nom || ''), par: utilisateur ? utilisateur.nom : '', poste: 'Téléphone ' + LIC.codePoste() });
    while (r.length > 5000) r.shift();
    try { F.ecrire(REGISTRE, JSON.stringify(r)); } catch (e) { /* registre au mieux */ }
  }
  const nouvelleRef = (html) => { const h = sha256(String(html).slice(0, 20000) + Date.now() + Math.random()).slice(0, 10).toUpperCase(); return h.slice(0, 5) + '-' + h.slice(5); };

  // ------------------------------------------------------------------ codes QR
  function utf8EnLatin1(t) { return L.Buffer.from(String(t || ''), 'utf8').toString('latin1'); }
  function qrMatrice(arg) {
    const o = typeof arg === 'object' && arg ? arg : { texte: arg };
    const q = new L.QRCode(-1, L.QRErrorCorrectLevel[o.niveau === 'L' ? 'L' : 'M']); q.addData(utf8EnLatin1(o.texte)); q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { let l = ''; for (let c = 0; c < n; c++) l += q.isDark(r, c) ? '1' : '0'; m.push(l); }
    return m;
  }

  // ------------------------------------------------------------------ fermeture, retour arrière, fichiers reçus
  const surFermeture = [], surFichier = [];
  let enPause = false;
  window.__natifPause = () => { enPause = true; surFermeture.forEach(fn => { try { fn(); } catch (e) { /* rien */ } }); setTimeout(() => { enPause = false; }, 4000); };
  window.__natifOuvrirFichier = (p) => surFichier.forEach(fn => fn(p));
  /** Bouton « retour » d'Android : ferme ce qui est ouvert, revient au tableau de bord, puis quitte (après enregistrement) */
  window.__natifRetourArriere = () => {
    if (document.body.classList.contains('menu-ouvert')) { document.body.classList.remove('menu-ouvert'); return true; }
    const fond = document.getElementById('modale-fond');
    if (fond && !fond.classList.contains('masque')) {
      const b = fond.querySelector('.modale-pied .btn:not(.btn-primaire)') || fond.querySelector('.modale-pied .btn');
      if (b) { b.click(); return true; }
    }
    const app = document.getElementById('ecran-app'), actif = document.querySelector('#nav a.actif');
    if (app && !app.classList.contains('masque') && actif && actif.dataset.vue !== 'tableau') { const t = document.querySelector('#nav a[data-vue="tableau"]:not(.sous-nav)'); if (t) { t.click(); return true; } }
    if (surFermeture.length) { surFermeture.forEach(fn => fn()); return true; }
    return false;
  };

  const ok = (v) => Promise.resolve(v);
  const essai = (fn) => { try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); } };

  // ------------------------------------------------------------------ l'API attendue par le logiciel (identique à preload.js)
  window.amedis = {
    infos: () => essai(() => ({ version: sync('version'), racine: 'Mémoire de l\'appli (Exercices, Sauvegardes)', plateforme: 'android', config: lireConfig(), fichierDemarrage: sync('fichierDemarrage') || null, visiteAuto: sync('miseAuPoint') !== '1' })),
    fermer: () => { if (!enPause) N.quitter(); return ok(true); },
    ouvrirDossier: (quoi) => essai(() => { N.ouvrirTelechargements(); return true; }),
    ouvrirFichier: (p) => essai(() => { if (uris[p]) N.ouvrirUri(uris[p]); return ''; }),
    afficherFichier: (p) => essai(() => { if (uris[p]) N.ouvrirUri(uris[p]); else N.ouvrirTelechargements(); return true; }),
    recents: () => essai(() => {
      const c = lireConfig(), connus = new Set((c.recents || []).map(x => x.toLowerCase()));
      // tout exercice présent sur le téléphone apparaît, même s'il n'est plus dans la liste des récents
      const tous = [...(c.recents || []), ...F.liste('Exercices').map(x => 'Exercices/' + x.nom).filter(p => p.endsWith('.' + EXT) && !connus.has(p.toLowerCase()))];
      const meta = Object.fromEntries(F.liste('Exercices').map(x => ['Exercices/' + x.nom, x]));
      return tous.filter(p => meta[p]).map(p => {
        let infos = {};
        try { const s = lireSession(p); const pr = s.params || {}; infos = { association: pr.sigle ? `${pr.nom} (${pr.sigle})` : pr.nom, exercice: pr.exercice, nbMembres: (s.membres || []).length, nbOperations: (s.depenses || []).length + (s.dons || []).length }; } catch (e) { infos = { erreur: e.message }; }
        return { chemin: p, nom: sansExt(p), modifie: meta[p].modifie, ...infos };
      });
    }),
    creerSession: ({ nom, donnees }) => essai(() => {
      exigerEcriture();
      const p = cheminLibre(nom);
      F.ecrire(p, texteScelle(donnees)); ajouterRecent(p);
      return { chemin: p, donnees };
    }),
    ouvrirSession: async (chemin) => {
      let p = chemin;
      if (!p) {
        // « Ouvrir un exercice… » : fichier .amasso reçu (WhatsApp, Drive, clé USB, ordinateur)
        const f = await asynchrone('choisirFichier', { mimes: ['application/json', 'application/octet-stream', 'text/plain', '*/*'] });
        if (!f) return null;
        if (!/\.(amasso|json)$/i.test(f.nom)) throw new Error('Choisissez un fichier d\'exercice (.amasso).');
        const texte = L.Buffer.from(f.base64, 'base64').toString('utf8');
        const s = JSON.parse(texte);
        if (s.format !== 'AMEDISPROASSO') throw new Error("Ce fichier n'est pas un exercice AMEDIS pro Asso.");
        p = cheminLibre(sansExt(f.nom));
        F.ecrire(p, texte);
      }
      const donnees = lireSession(p);
      ajouterRecent(p);
      const etat = integrite(donnees); delete donnees.sceau;
      return { chemin: p, donnees, integrite: etat };
    },
    enregistrer: ({ chemin, donnees, sauvegardeForcee }) => essai(() => {
      exigerEcriture();
      const texte = texteScelle(donnees);
      F.ecrire(chemin, texte);
      try { sauvegardeRotative(chemin, texte, sauvegardeForcee); } catch (err) { /* une sauvegarde ratée ne bloque pas */ }
      return true;
    }),
    /** « Enregistrer une copie » : le fichier est déposé dans Téléchargements, puis proposé au partage (WhatsApp, Drive…) */
    enregistrerSous: async ({ nom, donnees }) => {
      const affiche = await deposer('Exercices', nomFichierSur(nom) + '.' + EXT, b64Texte(texteScelle(donnees)), 'application/octet-stream', false);
      N.partagerUri(uris[affiche], 'application/octet-stream');
      return affiche;
    },
    retirerRecent: (p) => essai(() => { const c = lireConfig(); c.recents = (c.recents || []).filter(x => x !== p); ecrireConfig(c); return true; }),
    importerExcel: async () => {
      const f = await asynchrone('choisirFichier', { mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel.sheet.macroEnabled.12', 'text/csv', 'text/comma-separated-values', 'application/octet-stream'] });
      if (!f) return null;
      if (/\.csv$/i.test(f.nom)) {
        const txt = L.Buffer.from(f.base64, 'base64').toString('utf8').replace(/^﻿/, '');
        const t0 = txt.split('\n')[0];
        const sep = (t0.match(/;/g) || []).length >= (t0.match(/,/g) || []).length ? ';' : ',';
        const lignes = txt.split(/\r?\n/).filter(l => l.trim()).map(l => l.split(sep).map(x => x.replace(/^"|"$/g, '').trim()));
        return { fichier: f.nom, feuilles: [{ nom: 'CSV', lignes }] };
      }
      const wb = L.xlsx.lireClasseur(L.Buffer.from(f.base64, 'base64'));
      return { fichier: f.nom, dossier: '', feuilles: wb.feuilles };
    },
    exporterExcel: async ({ nom, feuilles }) => deposer('Exports Excel', nomFichierSur(nom) + '.xlsx', L.xlsx.ecrireClasseur(feuilles).toString('base64'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true),
    genererPDF: async ({ html, nomFichier, sousDossier, paysage, piedPage, ouvrir }) => {
      const ref = nouvelleRef(html);
      const horo = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const pied = piedPage === false ? null : mentionPied(piedPage || '') + ' — Réf. ' + ref;
      const r = await asynchrone('pdf', { html: pagePDF(marquerDocument(html), paysage, pied), nom: `${nomFichierSur(nomFichier)}_${horo}.pdf`, sousDossier: 'Documents PDF/' + nomFichierSur(sousDossier || 'Exercice'), ouvrir: ouvrir !== false });
      uris[r.affiche] = r.uri;
      enregistrerDocument(ref, nomFichier);
      return r.affiche;
    },
    imprimer: ({ html, paysage }) => asynchrone('imprimer', { html: pagePDF(marquerDocument(html), paysage, null), paysage: !!paysage }),
    choisirImage: async () => { const f = await asynchrone('choisirImage', {}); return f ? f.dataUrl : null; },
    lireImage: () => ok(null),   // photos d'un classeur importé : non disponibles sur le téléphone (ajoutez-les fiche par fiche)
    licenceEtat: () => essai(() => etatLic(true)),
    licenceActiver: (texte) => essai(() => { const r = LIC.activer(texte); etatCache = null; return r; }),
    licenceImporter: async () => {
      const f = await asynchrone('choisirFichier', { mimes: ['text/plain', 'application/octet-stream', '*/*'] });
      if (!f) return null;
      const r = LIC.activer(L.Buffer.from(f.base64, 'base64').toString('utf8')); etatCache = null; return r;
    },
    licenceRetirer: () => essai(() => { const r = LIC.retirer(); etatCache = null; return r; }),
    copier: (texte) => essai(() => { N.copier(String(texte || '')); return true; }),
    comptesEtat: () => essai(() => Object.assign(CPT.etat(), { requis: licenceActive(), utilisateur, roles: CPT.ROLES })),
    comptesCreerAdmin: (d) => essai(() => {
      if (CPT.etat().administrateur) throw new Error('Le compte du trésorier existe déjà.');
      utilisateur = CPT.creer(Object.assign({}, d, { role: 'tresorier' })); return utilisateur;
    }),
    comptesConnexion: ({ login, mdp }) => essai(() => { utilisateur = CPT.connecter(login, mdp); return utilisateur; }),
    comptesDeconnexion: () => essai(() => { if (utilisateur) CPT.noter(utilisateur.login, 'deconnexion'); utilisateur = null; return true; }),
    comptesListe: () => essai(() => { exigerTresorier(); return CPT.lister(); }),
    comptesAjouter: (d) => essai(() => { exigerTresorier(); if (d.role === 'tresorier') throw new Error('Il ne peut y avoir qu\'un trésorier.'); return CPT.creer(d); }),
    comptesSupprimer: (login) => essai(() => { exigerTresorier(); return CPT.supprimer(login); }),
    comptesReinitialiser: ({ login, mdp }) => essai(() => { exigerTresorier(); return CPT.reinitialiserMdp(login, mdp); }),
    comptesChangerMdp: ({ ancien, nouveau }) => essai(() => { if (!utilisateur) throw new Error('Non connecté.'); return CPT.changerMdp(utilisateur.login, ancien, nouveau); }),
    comptesOubli: (texteLicence) => essai(() => {
      const e2 = etatLic(true);
      if (!e2.licence) throw new Error('Aucune licence active.');
      let lic; try { lic = LIC.lireCle(String(texteLicence || '').trim()); } catch (err) { throw new Error('Clé de licence invalide.'); }
      if (!lic || String(lic.n) !== String(e2.licence.numero)) throw new Error('Cette clé ne correspond pas à la licence active de ce téléphone.');
      CPT.toutEffacer(); utilisateur = null; return true;
    }),
    comptesVerifier: (mdp) => essai(() => { if (!utilisateur) throw new Error('Non connecté.'); return CPT.verifier(utilisateur.login, mdp); }),
    documentVerifier: (ref) => essai(() => { const r = String(ref || '').toUpperCase().replace(/[^0-9A-F]/g, ''); return lireRegistre().find(x => x.ref.replace('-', '') === r) || null; }),
    documentsRegistre: () => essai(() => lireRegistre().slice(-300).reverse()),
    comptesNoter: ({ ev, detail }) => essai(() => { if (utilisateur && ['verrouillage', 'fichier'].includes(ev)) CPT.noter(utilisateur.login, ev, detail); return true; }),
    comptesHistorique: () => essai(() => { exigerTresorier(); return CPT.historique(); }),
    qrMatrice: (arg) => essai(() => qrMatrice(arg)),
    publicationTester: (url) => appelSite(url, null, '?action=ping'),
    publier: ({ url, cle, donnees }) => { if (licenceActive() && !utilisateur) return Promise.reject(new Error('Connectez-vous pour publier.')); return appelSite(url, { action: 'publier', cle, donnees }); },
    enregistrerImage: async ({ nom, dataUrl }) => deposer('Images', nomFichierSur(sansExt(nom)) + '.png', String(dataUrl).split(',')[1], 'image/png', true),
    enregistrerFichiersSite: async ({ texte }) => {
      let d = '';
      for (const [n, t] of Object.entries(texte)) d = await deposer('Site AMEDIS pro Asso', n + '.txt', b64Texte(t), 'text/plain', false);
      return d.replace(/[\\/][^\\/]*$/, '') + ' (fichiers .txt à ouvrir et copier)';
    },
    ouvrirLien: (url) => essai(() => { if (/^https:\/\/(wa\.me|api\.whatsapp\.com|script\.google\.com)\//.test(String(url))) N.ouvrirLien(String(url)); return true; }),
    sourcesSite: async () => {
      const o = {};
      for (const n of ['Code.gs', 'Page.html', 'Demandes.gs', 'Bureau.gs']) o[n] = await (await fetch('site/' + n + '.txt')).text();
      return o;
    },
    demarchesListe: ({ url, cle }) => demarchesSite({ url, cle, op: 'liste' }),
    demarchesStatuer: ({ url, cle, id, statut, reponse, par }) => demarchesSite({ url, cle, op: 'statuer', id, statut, reponse, par }),
    operationsListe: ({ url, cle }) => demarchesSite({ url, cle, op: 'liste' }, 'operationsPC'),
    operationsResultat: ({ url, cle, id, statut, resultat }) => demarchesSite({ url, cle, op: 'resultat', id, statut, resultat }, 'operationsPC'),
    messagesBoite: ({ url, cle, role }) => demarchesSite({ url, cle, op: 'boite', role }, 'messagesPC'),
    messagesEnvoyer: ({ url, cle, role, nom, message }) => demarchesSite({ url, cle, op: 'envoyer', role, nom, message }, 'messagesPC'),
    /** Copie de secours : un dossier choisi sur la carte SD, une clé USB (OTG) ou un dossier partagé */
    secoursChoisir: () => asynchrone('choisirDossier', {}),
    secoursCopier: async ({ dossier, nom, contenu }) => {
      const sur = String(nom || 'exercice').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);
      const jour = new Date().toISOString().slice(0, 10);
      const r = await asynchrone('ecrireDossier', { arbre: dossier, chemins: [['AMEDIS pro Asso - secours', sur + '.' + EXT], ['AMEDIS pro Asso - secours', 'copies datées', `${sur} - ${jour}.${EXT}`]], base64: b64Texte(contenu) });
      return r.affiche;
    },
    sauvegardeGoogle: ({ url, cle, nom, contenu }) => appelSite(url, { action: 'sauvegarder', cle, nom, contenu }),
    sauvegardeListe: ({ url, cle }) => appelSite(url, { action: 'sauvegardes', cle }),
    sauvegardeLire: ({ url, cle, nom }) => appelSite(url, { action: 'lireSauvegarde', cle, nom }),
    surDemandeFermeture: (fn) => surFermeture.push(fn),
    surOuvrirFichier: (fn) => surFichier.push(fn)
  };
  document.documentElement.classList.add('android');
})();
