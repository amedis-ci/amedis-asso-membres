/* AMEDIS pro Asso — gestion courante (1.6) : caisses et modes de paiement, reçus, journal, réunions et amendes,
   solidarité, budget, résumé d'exercice et préparation de l'exercice suivant. Fonctionne dans le logiciel et sous Node (tests). */
(function (root) {
  'use strict';
  const A = root.Asso || (typeof require !== 'undefined' ? require('./modele.js') : null);
  const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const id = (p) => A.nouvelId(p);
  const MODES = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Banque'];
  const STATUTS = { P: 'Présent', R: 'En retard', A: 'Absent', E: 'Excusé' };
  const TYPES_EVT = { deces: 'Décès', naissance: 'Naissance', mariage: 'Mariage', maladie: 'Maladie', autre: 'Autre' };

  // ---------------------------------------------------------------- initialisation
  function normaliser(s) {
    const p = s.params;
    if (!Array.isArray(p.caisses) || !p.caisses.length) p.caisses = MODES.slice();
    p.reportCaisses = p.reportCaisses || {};
    if (!p.prochainRecu) p.prochainRecu = 1;
    ['recus', 'journal', 'reunions', 'evenements', 'transferts'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
    s.budget = s.budget || { recettes: {}, depenses: {} };
    s.budget.recettes = s.budget.recettes || {}; s.budget.depenses = s.budget.depenses || {};
    s.cotisations.forEach(k => { if (!k.modes) k.modes = {}; });
    if (!s.categories.includes('Solidarité')) s.categories.push('Solidarité');
    return s;
  }
  const caisseDefaut = (s) => s.params.caisses[0] || 'Espèces';
  const modeCellule = (s, k, mid, j) => ((k.modes || {})[mid] || {})[j] || caisseDefaut(s);

  // ---------------------------------------------------------------- caisses
  /** Solde de chaque caisse : report + entrées (versements, dons) − sorties (dépenses) ± transferts */
  function soldesCaisses(s) {
    const c = {}, ajout = (nom, champ, v) => { if (!c[nom]) c[nom] = { report: 0, entrees: 0, sorties: 0, transfertsIn: 0, transfertsOut: 0 }; c[nom][champ] = arrondi(c[nom][champ] + v); };
    s.params.caisses.forEach(n => ajout(n, 'report', 0));
    const rep = s.params.reportCaisses || {}, sommeRep = Object.values(rep).reduce((t, v) => t + (Number(v) || 0), 0), report = Number(s.params.reportSolde) || 0;
    Object.entries(rep).forEach(([n, v]) => ajout(n, 'report', Number(v) || 0));
    if (Math.abs(report - sommeRep) > 0.009) ajout(caisseDefaut(s), 'report', report - sommeRep);   // report non réparti : caisse par défaut
    s.cotisations.forEach(k => Object.keys(k.versements || {}).forEach(mid => {
      if (!s.membres.some(m => m.id === mid)) return;
      Object.entries(k.versements[mid]).forEach(([j, v]) => { if (+j < k.colonnes.length && typeof v === 'number') ajout(modeCellule(s, k, mid, j), 'entrees', v); });
    }));
    s.dons.forEach(d => ajout(d.mode || caisseDefaut(s), 'entrees', Number(d.montant) || 0));
    s.depenses.forEach(d => ajout(d.mode || caisseDefaut(s), 'sorties', Number(d.montant) || 0));
    (s.transferts || []).forEach(t => { ajout(t.de, 'transfertsOut', Number(t.montant) || 0); ajout(t.vers, 'transfertsIn', Number(t.montant) || 0); });
    const l = Object.entries(c).map(([nom, x]) => Object.assign({ nom, solde: arrondi(x.report + x.entrees - x.sorties + x.transfertsIn - x.transfertsOut) }, x));
    return { caisses: l, total: arrondi(l.reduce((t, x) => t + x.solde, 0)) };
  }
  function ajouterTransfert(s, t) {
    const o = { id: id('t'), date: t.date || '', de: t.de, vers: t.vers, montant: Number(t.montant) || 0, libelle: t.libelle || '' };
    if (!o.de || !o.vers || o.de === o.vers) throw new Error('Choisissez deux caisses différentes.');
    if (!(o.montant > 0)) throw new Error('Indiquez un montant supérieur à 0.');
    s.transferts.push(o); return o;
  }

  // ---------------------------------------------------------------- reçus et encaissements
  const numeroRecu = (s, n) => `${s.params.exercice}-${String(n).padStart(4, '0')}`;
  /** Sommes déjà couvertes par un reçu, par cellule : { 'kid|mid|j': montant } */
  function couvertures(s) {
    const c = {};
    s.recus.filter(r => !r.annule).forEach(r => r.lignes.forEach(l => { const k = `${l.kid}|${r.membreId}|${l.j}`; c[k] = arrondi((c[k] || 0) + l.montant); }));
    return c;
  }
  /** Versements d'un membre sans reçu (saisis directement dans la grille) */
  function sansRecu(s, mid) {
    const c = couvertures(s), r = [];
    s.cotisations.forEach(k => k.colonnes.forEach((col, j) => {
      const v = A.valeur(k, mid, j); if (v === null) return;
      const reste = arrondi(v - (c[`${k.id}|${mid}|${j}`] || 0));
      if (reste > 0.009) r.push({ kid: k.id, j, montant: reste, mode: modeCellule(s, k, mid, j) });
    }));
    return r;
  }
  function creerRecu(s, { membreId, lignes, mode, date, par }) {
    const m = s.membres.find(x => x.id === membreId);
    if (!m) throw new Error('Membre introuvable.');
    lignes = (lignes || []).filter(l => Number(l.montant) > 0);
    if (!lignes.length) throw new Error('Aucun montant à inscrire sur le reçu.');
    const r = {
      id: id('r'), num: numeroRecu(s, s.params.prochainRecu++), date: date || new Date().toISOString().slice(0, 10), le: new Date().toISOString(),
      membreId, ident: m.ident, nom: A.nomComplet(m), mode: mode || caisseDefaut(s), par: par || '',
      lignes: lignes.map(l => { const k = s.cotisations.find(x => x.id === l.kid); return { kid: l.kid, j: Number(l.j), nom: k ? k.nom : '', periode: k ? k.colonnes[l.j] : '', montant: arrondi(l.montant) }; })
    };
    r.total = arrondi(r.lignes.reduce((t, l) => t + l.montant, 0));
    s.recus.push(r); return r;
  }
  /** Encaissement : ajoute les montants aux cases de la grille, note le mode de paiement et émet le reçu */
  function encaisser(s, { membreId, lignes, mode, date, par }) {
    lignes = (lignes || []).filter(l => Number(l.montant) > 0);
    if (!lignes.length) throw new Error('Indiquez au moins un montant.');
    lignes.forEach(l => {
      const k = s.cotisations.find(x => x.id === l.kid); if (!k) throw new Error('Type de cotisation introuvable.');
      const j = Number(l.j); if (!(j >= 0 && j < k.colonnes.length)) throw new Error('Période invalide.');
      const ver = k.versements[membreId] = k.versements[membreId] || {};
      ver[j] = arrondi((Number(ver[j]) || 0) + Number(l.montant));
      k.modes = k.modes || {}; (k.modes[membreId] = k.modes[membreId] || {})[j] = mode || caisseDefaut(s);
    });
    return creerRecu(s, { membreId, lignes, mode, date, par });
  }
  function annulerRecu(s, rid, motif) {
    const r = s.recus.find(x => x.id === rid); if (!r) throw new Error('Reçu introuvable.');
    if (!String(motif || '').trim()) throw new Error("Indiquez le motif de l'annulation.");
    r.annule = { le: new Date().toISOString(), motif: String(motif).trim() }; return r;
  }
  /** Proposition d'encaissement pour un membre : pour chaque cotisation due, la première période non soldée et le montant conseillé */
  function proposition(s, m, date) {
    const r = [];
    s.cotisations.forEach(k => {
      if (!A.concerne(k, m)) return;
      const st = A.situation(k, m, s.params, date);
      if (st.reste <= 0) return;
      const n = k.colonnes.length, mens = A.moisDesColonnes(k);
      const parPeriode = k.mode === 'periode' ? Number(A.montants(k, A.genreDe(m)).montantPeriode) || 0 : (mens && !k.arriere && !k.amende ? arrondi(st.attendu / n) : st.reste);
      let j = 0; for (; j < n; j++) { const v = A.valeur(k, m.id, j) || 0; if (!parPeriode || v < parPeriode) break; }
      if (j >= n) j = n - 1;
      const deja = A.valeur(k, m.id, j) || 0;
      r.push({ kid: k.id, j, montant: arrondi(Math.min(st.reste, parPeriode ? Math.max(parPeriode - deja, 0) || st.reste : st.reste)), reste: st.reste });
    });
    return r;
  }

  // ---------------------------------------------------------------- journal
  // ---- SHA-256 (journal infalsifiable : chaque opération est chaînée à la précédente)
  const K256 = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(texte) {
    const b = Array.from(unescape(encodeURIComponent(String(texte))), c => c.charCodeAt(0)), l = b.length * 8;
    b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 0xff);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, bb, c, dd, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (dd + t1) | 0; dd = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + dd) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const sceauEntree = (prec, x) => sha256([prec || '', x.le, x.par, x.quoi, x.detail].join('␟')).slice(0, 20);
  function journaliser(s, par, quoi, detail) {
    const prec = s.journal.length ? s.journal[s.journal.length - 1].h || '' : s.journalBase || '';
    const x = { le: new Date().toISOString(), par: par || '', quoi, detail: detail || '' };
    x.h = sceauEntree(prec, x);
    s.journal.push(x);
    if (s.journal.length > 6000) { const ret = s.journal.splice(0, s.journal.length - 6000); s.journalBase = ret[ret.length - 1].h || ''; }
  }
  /** Contrôle du chaînage : une opération modifiée, ajoutée ou supprimée hors du logiciel rompt la chaîne */
  function verifierJournal(s) {
    let prec = s.journalBase || '', scelles = 0, anciens = 0;
    for (let i = 0; i < s.journal.length; i++) {
      const x = s.journal[i];
      if (!x.h) { anciens++; prec = ''; continue; }
      if (sceauEntree(prec, x) !== x.h) return { ok: false, rupture: i, entree: x, scelles, anciens, total: s.journal.length };
      scelles++; prec = x.h;
    }
    return { ok: true, rupture: -1, scelles, anciens, total: s.journal.length };
  }

  // ---------------------------------------------------------------- réunions et amendes
  function ajouterReunion(s, r) {
    const o = { id: id('u'), date: r.date || '', objet: r.objet || 'Réunion', lieu: r.lieu || '', amendes: { A: Number((r.amendes || {}).A) || 0, R: Number((r.amendes || {}).R) || 0 }, presences: {}, pv: '' };
    s.reunions.push(o); return o;
  }
  /** Amende de chaque membre (somme sur les réunions) */
  function amendesParMembre(s) {
    const d = {};
    s.reunions.forEach(u => Object.entries(u.presences || {}).forEach(([mid, st]) => { const a = Number((u.amendes || {})[st]) || 0; if (a > 0) d[mid] = arrondi((d[mid] || 0) + a); }));
    return d;
  }
  /** Met à jour la cotisation « Amendes (réunions) » : montant dû par membre = ses amendes */
  function majAmendes(s) {
    const d = amendesParMembre(s);
    let k = s.cotisations.find(x => x.amende);
    if (!k && !Object.keys(d).length) return null;
    if (!k) { k = { id: id('k'), nom: 'Amendes (réunions)', court: 'Amendes', couleur: '#b45309', mode: 'total', colonnes: A.MOIS.slice(), montantAttendu: 0, montantPeriode: 0, amende: true, du: {}, versements: {}, modes: {} }; A.normaliserGenreCot(k); s.cotisations.push(k); }
    k.du = d;
    if (!Object.keys(d).length && !Object.keys(k.versements).length) s.cotisations = s.cotisations.filter(x => x !== k);
    return k;
  }
  function statsPresence(s) {
    const r = {};
    s.membres.forEach(m => { r[m.id] = { P: 0, R: 0, A: 0, E: 0, n: 0 }; });
    s.reunions.forEach(u => Object.entries(u.presences || {}).forEach(([mid, st]) => { if (r[mid] && STATUTS[st]) { r[mid][st]++; r[mid].n++; } }));
    Object.values(r).forEach(x => { x.taux = x.n ? (x.P + x.R) / x.n : null; });
    return r;
  }

  // ---------------------------------------------------------------- solidarité
  function creerEvenement(s, e) {
    const contribution = Number(e.contribution) || 0;
    if (!String(e.libelle || '').trim()) throw new Error("Indiquez l'objet de l'événement.");
    const ev = { id: id('e'), type: TYPES_EVT[e.type] ? e.type : 'autre', libelle: String(e.libelle).trim(), beneficiaire: e.beneficiaire || '', date: e.date || '', contribution, aide: null, cree: new Date().toISOString() };
    if (contribution > 0) {
      const k = { id: id('k'), nom: `Solidarité — ${ev.libelle}`, court: 'Solid.', couleur: '#6d28d9', mode: 'total', colonnes: ['Versement 1', 'Versement 2', 'Versement 3'],
        montantAttendu: contribution, montantPeriode: 0, evenement: ev.id, versements: {}, modes: {} };
      A.normaliserGenreCot(k); s.cotisations.push(k); ev.kid = k.id;
    }
    s.evenements.push(ev); return ev;
  }
  function remettreAide(s, evId, { montant, date, mode, numero }) {
    const ev = s.evenements.find(x => x.id === evId); if (!ev) throw new Error('Événement introuvable.');
    if (!(Number(montant) > 0)) throw new Error('Indiquez le montant remis.');
    if (!s.categories.includes('Solidarité')) s.categories.push('Solidarité');
    const d = { id: id('p'), numero: numero || A.prochainNumero(s.depenses, 'Dépense'), date: date || new Date().toISOString().slice(0, 10), designation: `Aide de solidarité — ${ev.libelle}${ev.beneficiaire ? ' (' + ev.beneficiaire + ')' : ''}`,
      categorie: 'Solidarité', montant: Number(montant), mode: mode || caisseDefaut(s), evenement: ev.id };
    s.depenses.push(d); ev.aide = { depenseId: d.id, montant: d.montant, date: d.date, mode: d.mode }; return d;
  }
  function resumeEvenement(s, ev) {
    const k = s.cotisations.find(x => x.id === ev.kid);
    const r = k ? A.resumeCotisation(s, k) : { total: 0, aJour: 0, pasAJour: 0, resteTotal: 0, taux: 0 };
    return { k, collecte: r.total, attendu: k ? arrondi(r.total + r.resteTotal) : 0, aJour: r.aJour, pasAJour: r.pasAJour, aide: ev.aide ? ev.aide.montant : 0, solde: arrondi(r.total - (ev.aide ? ev.aide.montant : 0)) };
  }

  // ---------------------------------------------------------------- budget
  function comparaisonBudget(s) {
    const b = A.bilan(s), bu = s.budget || { recettes: {}, depenses: {} };
    const rec = s.cotisations.map(k => ({ cle: k.id, nom: k.nom, prevu: Number(bu.recettes[k.id]) || 0, realise: (b.cotisations.find(x => x.id === k.id) || {}).total || 0 }))
      .concat([{ cle: 'dons', nom: 'Dons', prevu: Number(bu.recettes.dons) || 0, realise: b.dons }]);
    const cats = Array.from(new Set(s.categories.concat(Object.keys(b.parCategorie))));
    const dep = cats.map(c => ({ cle: c, nom: c, prevu: Number(bu.depenses[c]) || 0, realise: b.parCategorie[c] || 0 }));
    const fin = (l) => l.map(x => Object.assign(x, { ecart: arrondi(x.realise - x.prevu), taux: x.prevu ? x.realise / x.prevu : null }));
    const t = (l, c) => arrondi(l.reduce((s2, x) => s2 + x[c], 0));
    fin(rec); fin(dep);
    return { recettes: rec, depenses: dep, totRec: { prevu: t(rec, 'prevu'), realise: t(rec, 'realise') }, totDep: { prevu: t(dep, 'prevu'), realise: t(dep, 'realise') }, actif: Object.values(bu.recettes).some(Number) || Object.values(bu.depenses).some(Number) };
  }

  // ---------------------------------------------------------------- résumé d'exercice et exercice suivant
  function resumeExercice(s) {
    const b = A.bilan(s), e = A.effectifsGenre(s);
    const cots = s.cotisations.map(k => { const r = A.resumeCotisation(s, k); return { nom: k.nom, total: r.total, taux: r.taux }; });
    return { exercice: s.params.exercice, effectifs: e, cotisations: cots, totalCotisations: b.totalCotisations, dons: b.dons, depenses: b.depenses, solde: b.solde,
      parCategorie: b.parCategorie, reunions: s.reunions.length, evenements: s.evenements.length };
  }
  /** Appelé par Asso.exerciceSuivant : remet à zéro la gestion courante, garde caisses et budget comme modèle */
  function preparerExerciceSuivant(s, n) {
    normaliser(s);
    const sc = soldesCaisses(s);
    n.params.reportCaisses = {}; sc.caisses.forEach(c => { if (Math.abs(c.solde) > 0.009) n.params.reportCaisses[c.nom] = c.solde; });
    n.params.prochainRecu = 1;
    n.recus = []; n.journal = []; delete n.journalBase; n.reunions = []; n.evenements = []; n.transferts = [];
    n.budget = { recettes: {}, depenses: Object.assign({}, (s.budget || {}).depenses || {}) };
    (s.cotisations || []).forEach(k => { if (!k.arriere && !k.amende && !k.evenement && s.budget && s.budget.recettes[k.id] && n.cotisations.some(x => x.id === k.id)) n.budget.recettes[k.id] = s.budget.recettes[k.id]; });
    n.precedent = resumeExercice(s);
    return n;
  }

  const api = { MODES, STATUTS, TYPES_EVT, normaliser, modeCellule, caisseDefaut, soldesCaisses, ajouterTransfert, couvertures, sansRecu, creerRecu, encaisser, annulerRecu, proposition,
    journaliser, verifierJournal, sha256, ajouterReunion, amendesParMembre, majAmendes, statsPresence, creerEvenement, remettreAide, resumeEvenement, comparaisonBudget, resumeExercice, preparerExerciceSuivant };
  root.Gestion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
