/* AMEDIS pro Asso — modèle de données et calculs (membres, cotisations, dépenses, dons, bilan)
   Utilisable dans l'interface (window.Asso) et dans les tests Node (module.exports). */
(function (root) {
  'use strict';

  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const COULEURS = ['#1b2a4a', '#0f6b45', '#2563a8', '#7a3aa8', '#c0571b', '#b42318', '#0e7490', '#a16207', '#be185d', '#4d7c0f'];
  const CATEGORIES = ['Fonctionnement', 'Social (décès, mariages, naissances…)', 'Événements et réunions', 'Projets et investissements', 'Autres'];

  const PARAMS_DEFAUT = {
    nom: 'MON ASSOCIATION', sigle: '', siege: 'Bouaké', devise: '', contact: '', exercice: new Date().getFullYear(),
    monnaie: 'F CFA', couleur: '#1b2a4a', logo: '',
    president: '', tresorier: '', secretaire: '', contactPresident: '', contactTresorier: '', contactSecretaire: '',
    signataireListes: 'Le Secrétaire général', signataireBilan: 'Le Trésorier général',
    libelleResidence: 'Quartier / lieu de résidence', prefixeIdent: '',
    reportSolde: 0
  };

  function nouvelId(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  const estNombre = (v) => typeof v === 'number' && isFinite(v);
  function lireMontant(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const t = String(v).replace(/\s| | /g, '').replace(/f?cfa|fcfa|f$/i, '').replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return isFinite(n) ? n : null;
  }
  const arrondi = (n) => Math.round(n * 100) / 100;

  /** Types de cotisation proposés à la création d'un exercice */
  function cotisationMensuelle(montantAnnuel) {
    return { id: nouvelId('k'), nom: 'Cotisations mensuelles', court: 'Mensuelles', couleur: '#0f6b45', colonnes: MOIS.slice(),
      mode: 'total', montantAttendu: montantAnnuel || 12000, montantPeriode: Math.round((montantAnnuel || 12000) / 12), versements: {} };
  }
  function cotisationExceptionnelle(montant) {
    return { id: nouvelId('k'), nom: 'Cotisations exceptionnelles', court: 'Exceptionnelles', couleur: '#c0571b', colonnes: ['Versement 1', 'Versement 2', 'Versement 3', 'Versement 4'],
      mode: 'total', montantAttendu: montant || 6000, montantPeriode: 0, versements: {} };
  }

  function nouvelExercice(params) {
    return {
      format: 'AMEDISPROASSO', version: 1, creeLe: new Date().toISOString(),
      params: Object.assign(clone(PARAMS_DEFAUT), params || {}),
      membres: [], cotisations: [cotisationMensuelle(), cotisationExceptionnelle()],
      depenses: [], dons: [], categories: CATEGORIES.slice()
    };
  }

  /** Complète un exercice lu sur disque */
  function normaliser(s) {
    s.params = Object.assign(clone(PARAMS_DEFAUT), s.params || {});
    s.membres = Array.isArray(s.membres) ? s.membres : [];
    s.membres.forEach(m => { if (!m.id) m.id = nouvelId('m'); if (m.actif === undefined) m.actif = true; m.genre = lireGenre(m.genre); accesMembre(m); });
    // publication en ligne (consultation des membres) : clé propre à l'association et sel des codes
    s.params.publication = Object.assign({ url: '', auto: true, dernier: '', dernierEtat: '' }, s.params.publication || {});
    if (!s.params.publication.cle) s.params.publication.cle = aleatoire(40);
    if (!s.params.publication.sel) s.params.publication.sel = aleatoire(16);
    s.cotisations = Array.isArray(s.cotisations) ? s.cotisations : [];
    s.cotisations.forEach(k => { if (!k.id) k.id = nouvelId('k'); if (!Array.isArray(k.colonnes)) k.colonnes = MOIS.slice(); if (!k.versements) k.versements = {}; if (!k.mode) k.mode = 'total'; normaliserGenreCot(k); });
    // montants enregistrés en texte (anciens fichiers, imports) : convertis en nombres pour qu'ils comptent dans les totaux
    s.cotisations.forEach(k => Object.keys(k.versements).forEach(mid => {
      const l = k.versements[mid] || {};
      Object.keys(l).forEach(c => { if (!estNombre(l[c])) { const v = lireMontant(l[c]); if (v === null || v === 0) delete l[c]; else l[c] = v; } });
    }));
    s.depenses = Array.isArray(s.depenses) ? s.depenses : [];
    s.dons = Array.isArray(s.dons) ? s.dons : [];
    s.categories = Array.isArray(s.categories) && s.categories.length ? s.categories : CATEGORIES.slice();
    const G = root.Gestion || (typeof require !== 'undefined' ? (() => { try { return require('./gestion.js'); } catch (e) { return null; } })() : null);
    if (G) G.normaliser(s);
    return s;
  }

  // ---------------------------------------------------------------- membres
  /** Chaîne aléatoire (codes d'accès, liens personnels) */
  function aleatoire(n, chiffres) {
    const alpha = chiffres ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const b = new Uint8Array(n); (globalThis.crypto || require('crypto').webcrypto).getRandomValues(b);
    let r = ''; for (let i = 0; i < n; i++) r += alpha[b[i] % alpha.length]; return r;
  }
  /** Code personnel (4 chiffres) et lien personnel secret de chaque membre, pour la consultation en ligne */
  function accesMembre(m, renouveler) {
    if (renouveler || !/^\d{4}$/.test(String(m.code || ''))) m.code = aleatoire(4, true);
    if (renouveler || !m.jeton || String(m.jeton).length < 20) m.jeton = aleatoire(24);
    // lien de la carte de membre (identité seulement) : distinct du lien personnel, non renouvelé avec lui (cartes imprimées)
    if (!m.jetonCarte || String(m.jetonCarte).length < 20) m.jetonCarte = aleatoire(24);
    return m;
  }
  /** Numéros d'urgence (cartes de membre) : contacts saisis dans Paramètres, sinon contact du membre qui a la fonction */
  function contactsUrgence(s) {
    const p = s.params;
    const parFonction = (re) => { const m = s.membres.find(x => x.actif !== false && re.test(normTete(x.fonction)) && String(x.contact || '').trim()); return m ? { nom: nomComplet(m), tel: String(m.contact).trim() } : null; };
    return [['Président', p.president, p.contactPresident, /^(?!.*(vice|honneur|adjoint)).*president/],
      ['Secrétaire général', p.secretaire, p.contactSecretaire, /^(?!.*(adjoint|vice)).*secretaire/],
      ['Trésorier', p.tresorier, p.contactTresorier, /^(?!.*(adjoint|vice)).*tresorier/]]
      .map(([role, nom, tel, re]) => { if (String(tel || '').trim()) return { role, nom: nom || '', tel: String(tel).trim() }; const f = parFonction(re); return f ? { role, nom: nom || f.nom, tel: f.tel } : null; })
      .filter(Boolean);
  }
  /** Genre d'un membre : 'H', 'F' ou '' (non renseigné). Accepte H, M, Homme, Masculin, F, Femme, Féminin… */
  const GENRES = { H: 'Hommes', F: 'Femmes' };
  const GENRE_UN = { H: 'Homme', F: 'Femme' };
  function lireGenre(v) {
    const t = String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (!t) return '';
    if (/^(h|m|homme|hommes|masculin|male|garcon|monsieur|mr|m\.)$/.test(t)) return 'H';
    if (/^(f|femme|femmes|feminin|female|fille|madame|mme|mlle|mademoiselle)$/.test(t)) return 'F';
    return '';
  }
  const genreDe = (m) => (m && (m.genre === 'H' || m.genre === 'F')) ? m.genre : '';
  /** Exercice restreint aux membres d'un genre ('H' ou 'F') : mêmes cotisations, dépenses et dons, membres filtrés.
      Tous les calculs (situation, résumé, bilan des cotisations) s'appliquent alors au seul genre choisi. */
  function sousSession(s, g) {
    if (g !== 'H' && g !== 'F') return s;
    return Object.assign({}, s, { membres: s.membres.filter(m => genreDe(m) === g), genre: g, genreLib: GENRES[g] });
  }
  /** Effectifs par genre (membres actifs) */
  function effectifsGenre(s) {
    const r = { H: 0, F: 0, N: 0, total: 0 };
    s.membres.filter(m => m.actif !== false).forEach(m => { r[genreDe(m) || 'N']++; r.total++; });
    return r;
  }
  const nomComplet = (m) => [m.nom, m.prenoms].map(x => String(x || '').trim()).filter(Boolean).join(' ');
  function triMembres(a, b) {
    return String(a.ident || '').localeCompare(String(b.ident || ''), 'fr', { numeric: true }) || nomComplet(a).localeCompare(nomComplet(b), 'fr');
  }
  function prochainIdent(s) {
    const pre = (s.params.prefixeIdent || s.params.sigle || 'M').trim();
    let max = 0;
    s.membres.forEach(m => { const r = /(\d+)\s*$/.exec(String(m.ident || '')); if (r) max = Math.max(max, +r[1]); });
    return `${pre} ${max + 1}`;
  }

  // ---------------------------------------------------------------- cotisations
  function valeur(k, membreId, col) {
    const v = ((k.versements || {})[membreId] || {})[col];
    return estNombre(v) ? v : null;
  }
  function totalMembre(k, membreId) {
    const l = (k.versements || {})[membreId] || {};
    return arrondi(Object.keys(l).filter(c => +c < k.colonnes.length).reduce((t, c) => t + (estNombre(l[c]) ? l[c] : 0), 0));
  }
  /** Nombre de mois échus de l'exercice à une date donnée (pour le mode « par mois ») */
  function moisEchus(exercice, date) {
    const d = date || new Date(), an = Number(exercice) || d.getFullYear();
    if (d.getFullYear() > an) return 12;
    if (d.getFullYear() < an) return 0;
    return d.getMonth() + 1;
  }
  /** Paramétrage par genre d'un type de cotisation :
      k.public = 'tous' | 'H' | 'F' (qui doit la payer) ;
      k.montantsGenre = true -> k.genre.H / k.genre.F donnent le montant attendu (et par mois) propre à chaque genre. */
  function normaliserGenreCot(k) {
    if (k.public !== 'H' && k.public !== 'F') k.public = 'tous';
    k.montantsGenre = !!k.montantsGenre;
    k.genre = k.genre || {};
    ['H', 'F'].forEach(g => {
      const x = k.genre[g] = k.genre[g] || {};
      if (!estNombre(x.montantAttendu)) x.montantAttendu = Number(k.montantAttendu) || 0;
      if (!estNombre(x.montantPeriode)) x.montantPeriode = Number(k.montantPeriode) || 0;
    });
    return k;
  }
  /** Le membre est-il concerné par ce type de cotisation ? (cotisation réservée aux hommes ou aux femmes) */
  function concerne(k, m) {
    if (k.arriere || k.amende) return !!m && (Number((k.du || {})[m.id]) || 0) > 0;   // arriérés, amendes : seuls les membres qui doivent
    if (!k.public || k.public === 'tous' || !m) return true;
    return genreDe(m) === k.public;
  }
  /** Montants (attendu sur l'exercice, par mois) applicables à un membre, ou au genre g */
  function montants(k, g) {
    if (k.montantsGenre && k.genre && (g === 'H' || g === 'F') && k.genre[g]) return { montantAttendu: Number(k.genre[g].montantAttendu) || 0, montantPeriode: Number(k.genre[g].montantPeriode) || 0 };
    return { montantAttendu: Number(k.montantAttendu) || 0, montantPeriode: Number(k.montantPeriode) || 0 };
  }
  /** Montant attendu d'un membre (ou, sans membre, du cas général) pour ce type de cotisation */
  function attendu(k, params, date, m) {
    if (k.arriere || k.amende) return m && m.id ? (Number((k.du || {})[m.id]) || 0) : 0;
    if (m && !concerne(k, m)) return 0;
    const mo = montants(k, m ? genreDe(m) : (k.public === 'H' || k.public === 'F' ? k.public : ''));
    if (k.mode === 'periode') return arrondi(mo.montantPeriode * Math.min(k.colonnes.length, moisEchus(params.exercice, date)));
    return mo.montantAttendu;
  }
  /** Texte du montant attendu : « 12 000 », ou « Hommes : 12 000 · Femmes : 6 000 », avec qui est concerné */
  function libelleAttendu(k, params, fmt, date) {
    const f = fmt || ((n) => String(n));
    if (k.arriere || k.amende) { const d = Object.values(k.du || {}).map(Number).filter(x => x > 0); return `${f(d.reduce((t, x) => t + x, 0))} dus par ${d.length} membre(s) (montant propre à chacun)`; }
    const parMois = k.mode === 'periode';
    const val = (g) => { const mo = montants(k, g); return parMois ? arrondi(mo.montantPeriode * Math.min(k.colonnes.length, moisEchus(params.exercice, date))) : mo.montantAttendu; };
    if (k.public === 'H' || k.public === 'F') return `${f(val(k.public))} (${k.public === 'H' ? 'hommes' : 'femmes'} uniquement)`;
    if (k.montantsGenre) return `Hommes : ${f(val('H'))} · Femmes : ${f(val('F'))}`;
    return f(val(''));
  }
  /** Divise un type de cotisation en deux types « … Hommes » et « … Femmes », dans le même esprit
      (mêmes colonnes, même mode, montants du genre), chaque versement allant au type du genre du membre.
      Refusé si des membres sans genre ont déjà versé (il faut d'abord indiquer leur genre). */
  function diviserParGenre(s, k) {
    normaliserGenreCot(k);
    if (k.public === 'H' || k.public === 'F') return { erreur: 'Cette cotisation est déjà réservée à un seul genre.' };
    const sansGenre = s.membres.filter(m => !genreDe(m) && totalMembre(k, m.id) > 0);
    if (sansGenre.length) return { erreur: `${sansGenre.length} membre(s) sans genre ont déjà versé pour cette cotisation`, sansGenre };
    const base = String(k.nom).replace(/\s*[-–—]?\s*(hommes?|femmes?)\s*$/i, '').trim();
    const court = String(k.court || k.nom).replace(/^Cotisations? /i, '').slice(0, 10);
    const faire = (g) => {
      const mo = montants(k, g);
      const n = clone(k);
      Object.assign(n, { id: nouvelId('k'), nom: `${base} ${g === 'H' ? 'Hommes' : 'Femmes'}`, court: `${court} ${g === 'H' ? 'H' : 'F'}`,
        couleur: g === 'H' ? '#2563a8' : '#be185d', public: g, montantsGenre: true,
        montantAttendu: mo.montantAttendu, montantPeriode: mo.montantPeriode, versements: {} });
      n.genre = { H: { montantAttendu: mo.montantAttendu, montantPeriode: mo.montantPeriode }, F: { montantAttendu: mo.montantAttendu, montantPeriode: mo.montantPeriode } };
      s.membres.filter(m => genreDe(m) === g).forEach(m => { if (k.versements[m.id]) n.versements[m.id] = clone(k.versements[m.id]); });
      return n;
    };
    const h = faire('H'), f = faire('F');
    const i = s.cotisations.indexOf(k);
    s.cotisations.splice(i, 1, h, f);
    return { ok: true, hommes: h, femmes: f };
  }
  /** Regroupe deux types « … Hommes » / « … Femmes » en un seul type pour tous (montant différent par genre conservé) */
  function regrouperGenre(s, h, f) {
    const n = clone(h);
    const base = String(h.nom).replace(/\s*(hommes?)\s*$/i, '').trim();
    Object.assign(n, { id: nouvelId('k'), nom: base, court: String(h.court).replace(/\s*H$/, ''), couleur: '#0f6b45', public: 'tous', montantsGenre: true,
      genre: { H: montants(h, 'H'), F: montants(f, 'F') }, versements: Object.assign({}, clone(h.versements), clone(f.versements)) });
    n.montantAttendu = n.genre.H.montantAttendu; n.montantPeriode = n.genre.H.montantPeriode;
    const i = s.cotisations.indexOf(h);
    s.cotisations = s.cotisations.filter(x => x !== h && x !== f);
    s.cotisations.splice(Math.min(i, s.cotisations.length), 0, n);
    return n;
  }
  /** Situation d'un membre : { total, attendu, reste, aJour, nonConcerne } */
  function situation(k, m, params, date) {
    const total = totalMembre(k, m.id);
    if (!concerne(k, m)) return { total, attendu: 0, reste: 0, aJour: true, avance: total, nonConcerne: true };
    const att = attendu(k, params, date, m);
    return { total, attendu: att, reste: Math.max(0, arrondi(att - total)), aJour: total >= att, avance: Math.max(0, arrondi(total - att)) };
  }
  function membresActifs(s) { return s.membres.filter(m => m.actif !== false); }

  function resumeCotisation(s, k, date) {
    const r = { total: 0, aJour: 0, pasAJour: 0, attenduTotal: 0, resteTotal: 0, parColonne: k.colonnes.map(() => 0), nbVersements: 0 };
    membresActifs(s).filter(m => concerne(k, m)).forEach(m => {
      const st = situation(k, m, s.params, date);
      r.attenduTotal += st.attendu; r.resteTotal += st.reste;
      if (st.aJour) r.aJour++; else r.pasAJour++;
    });
    s.membres.forEach(m => {
      r.total += totalMembre(k, m.id);
      k.colonnes.forEach((c, i) => { const v = valeur(k, m.id, i); if (v !== null) { r.parColonne[i] += v; r.nbVersements++; } });
    });
    r.total = arrondi(r.total); r.attenduTotal = arrondi(r.attenduTotal); r.resteTotal = arrondi(r.resteTotal);
    r.taux = r.aJour + r.pasAJour ? r.aJour / (r.aJour + r.pasAJour) : 0;
    return r;
  }

  // ---------------------------------------------------------------- dépenses / dons
  const somme = (l) => arrondi(l.reduce((t, x) => t + (estNombre(Number(x.montant)) ? Number(x.montant) : 0), 0));
  function moisDe(iso) { const m = /^(\d{4})-(\d{2})/.exec(iso || ''); return m ? +m[2] - 1 : null; }
  function prochainNumero(liste, prefixe) {
    let max = 0;
    liste.forEach(x => { const r = /(\d+)\s*$/.exec(String(x.numero || '')); if (r) max = Math.max(max, +r[1]); });
    return `${prefixe} ${max + 1}`;
  }

  // ---------------------------------------------------------------- bilan
  /** Mois (0 à 11) correspondant à un intitulé de colonne : « Février », « FEVRIER », « Fév. », « 02 », « Mois 2 »… sinon null */
  const PREF_MOIS = [['jan'], ['fev', 'feb'], ['mar'], ['avr', 'apr'], ['mai', 'may'], ['juin', 'jun'], ['juil', 'jul'], ['aou', 'aug'], ['sep'], ['oct'], ['nov'], ['dec']];
  function moisDeColonne(c) {
    const t = normTete(c);
    if (!t) return null;
    const n = /^(?:mois\s*)?(\d{1,2})$/.exec(t);
    if (n) { const x = +n[1]; return x >= 1 && x <= 12 ? x - 1 : null; }
    const mot = t.split(' ')[0];
    for (let i = 0; i < 12; i++) if (PREF_MOIS[i].some(p => mot.startsWith(p))) return i;
    return null;
  }
  /** Mois de chaque colonne d'un type de cotisation, ou null si le type n'est pas mensuel.
      Un type est mensuel dès que la plupart de ses colonnes sont des mois (au moins 6, ou toutes s'il en a moins). */
  function moisDesColonnes(k) {
    const m = k.colonnes.map(moisDeColonne), reconnus = m.filter(x => x !== null).length;
    return reconnus >= Math.min(6, k.colonnes.length) && reconnus > 0 ? m : null;
  }
  function bilan(s, date) {
    const cot = s.cotisations.map(k => {
      const parGenre = { H: 0, F: 0, N: 0 };
      s.membres.forEach(m => { parGenre[genreDe(m) || 'N'] += totalMembre(k, m.id); });
      Object.keys(parGenre).forEach(g => { parGenre[g] = arrondi(parGenre[g]); });
      return { id: k.id, nom: k.nom, total: resumeCotisation(s, k, date).total, parGenre };
    });
    const cotParGenre = { H: 0, F: 0, N: 0 };
    cot.forEach(c => Object.keys(cotParGenre).forEach(g => { cotParGenre[g] = arrondi(cotParGenre[g] + c.parGenre[g]); }));
    const totalCot = arrondi(cot.reduce((t, x) => t + x.total, 0));
    const dons = somme(s.dons), depenses = somme(s.depenses);
    const report = Number(s.params.reportSolde) || 0;
    const recettes = arrondi(totalCot + dons);
    const parCategorie = {};
    s.depenses.forEach(d => { const c = d.categorie || 'Autres'; parCategorie[c] = arrondi((parCategorie[c] || 0) + (Number(d.montant) || 0)); });
    // mouvements mensuels : chaque versement dans une colonne « mois » va dans son mois ; tout le reste
    // (cotisations sans mois, dons ou dépenses sans date) va dans « non réparti », pour que le total par mois
    // soit toujours égal au total des recettes et des dépenses.
    const parMois = MOIS.map(() => ({ recettes: 0, depenses: 0 }));
    const nonReparti = { recettes: 0, depenses: 0 };
    s.cotisations.forEach(k => {
      const mm = moisDesColonnes(k);
      s.membres.forEach(m => k.colonnes.forEach((c, i) => {
        const v = valeur(k, m.id, i); if (v === null) return;
        const mo = mm ? mm[i] : null;
        if (mo !== null) parMois[mo].recettes += v; else nonReparti.recettes += v;
      }));
    });
    s.dons.forEach(d => { const i = moisDe(d.date), v = Number(d.montant) || 0; if (i !== null) parMois[i].recettes += v; else nonReparti.recettes += v; });
    s.depenses.forEach(d => { const i = moisDe(d.date), v = Number(d.montant) || 0; if (i !== null) parMois[i].depenses += v; else nonReparti.depenses += v; });
    parMois.forEach(x => { x.recettes = arrondi(x.recettes); x.depenses = arrondi(x.depenses); });
    nonReparti.recettes = arrondi(nonReparti.recettes); nonReparti.depenses = arrondi(nonReparti.depenses);
    return { cotisations: cot, cotParGenre, totalCotisations: totalCot, dons, recettes, depenses, report, solde: arrondi(report + recettes - depenses), parCategorie, parMois, nonReparti };
  }

  /** Exercice suivant : mêmes paramètres, membres et types de cotisation ; versements, dépenses et dons remis à zéro */
  /** Membres actifs qui ne sont pas à jour : [{ m, total, detail: [{ nom, reste, annee }] }] (cotisations et arriérés) */
  function arrieres(s, date) {
    const r = [];
    membresActifs(s).slice().sort(triMembres).forEach(m => {
      const detail = [];
      s.cotisations.forEach(k => {
        if (!concerne(k, m)) return;
        const st = situation(k, m, s.params, date);
        if (st.reste > 0) detail.push({ kid: k.id, nom: k.nom, court: k.court || k.nom, reste: st.reste, annee: k.arriere ? k.arriere.annee : Number(s.params.exercice) });
      });
      if (detail.length) r.push({ m, total: arrondi(detail.reduce((t, x) => t + x.reste, 0)), detail });
    });
    return r;
  }
  /** Exercice suivant.
      decisions : { idMembre: { action: 'reporter' | 'annuler' | 'inactif', motif } } — sans décision, la dette est reportée.
      Les dettes reportées deviennent des cotisations « Arriérés AAAA » (une par année d'origine) : montant attendu propre à chaque membre. */
  function exerciceSuivant(s, decisions) {
    decisions = decisions || {};
    const b = bilan(s), liste = arrieres(s, finExercice(s));
    const n = clone(s);
    n.creeLe = new Date().toISOString(); delete n.modifieLe;
    n.params.exercice = (Number(s.params.exercice) || new Date().getFullYear()) + 1;
    n.params.reportSolde = b.solde;
    n.cotisations = n.cotisations.filter(k => !k.arriere && !k.amende && !k.evenement);   // arriérés, amendes, solidarité : les restes passent en arriérés
    n.cotisations.forEach(k => { k.versements = {}; k.modes = {}; });
    n.depenses = []; n.dons = []; delete n.cloture;
    const parAnnee = {}, lignes = [];
    liste.forEach(x => {
      const d = decisions[x.m.id] || { action: 'reporter' };
      lignes.push({ id: x.m.id, ident: x.m.ident, nom: nomComplet(x.m), total: x.total, detail: x.detail.map(y => ({ nom: y.nom, court: y.court, reste: y.reste, annee: y.annee })), action: d.action || 'reporter', motif: d.motif || '' });
      if (d.action === 'inactif') { const nm = n.membres.find(y => y.id === x.m.id); if (nm) nm.actif = false; return; }
      if (d.action === 'annuler') return;
      x.detail.forEach(y => { const a = parAnnee[y.annee] = parAnnee[y.annee] || {}; a[x.m.id] = arrondi((a[x.m.id] || 0) + y.reste); });
    });
    Object.keys(parAnnee).sort().forEach(an => n.cotisations.push({
      id: nouvelId('k'), nom: `Arriérés ${an}`, court: `Arr. ${an}`, couleur: '#8a5a00', mode: 'total', colonnes: MOIS.slice(),
      montantAttendu: 0, montantPeriode: 0, public: 'tous', montantsGenre: false, genre: {}, arriere: { annee: Number(an) }, du: parAnnee[an], versements: {}
    }));
    n.cotisations.forEach(normaliserGenreCot);
    n.reportArrieres = { depuis: Number(s.params.exercice), lignes };
    if (typeof root !== 'undefined' && root.Gestion) root.Gestion.preparerExerciceSuivant(s, n);
    else if (typeof require !== 'undefined') { try { require('./gestion.js').preparerExerciceSuivant(s, n); } catch (e) { /* module absent */ } }
    if (n.params.publication) { n.params.publication.dernier = ''; n.params.publication.dernierEtat = ''; }
    return n;
  }
  /** Date de fin d'exercice (31/12) pour le calcul des cotisations « par mois échu » à la clôture */
  function finExercice(s) { const a = Number(s.params.exercice) || new Date().getFullYear(); return new Date(a, 11, 31, 12); }
  /** Résumé chiffré des décisions de clôture */
  function totauxCloture(lignes) {
    const t = { reporte: 0, annule: 0, inactif: 0, nReporte: 0, nAnnule: 0, nInactif: 0 };
    (lignes || []).forEach(l => { const k = l.action === 'annuler' ? 'annule' : l.action === 'inactif' ? 'inactif' : 'reporte'; t[k] = arrondi(t[k] + l.total); t['n' + k[0].toUpperCase() + k.slice(1)]++; });
    return t;
  }

  // ---------------------------------------------------------------- import du classeur Excel d'origine (BASE_A2B)
  function excelVersIso(v) {
    if (typeof v === 'number' && v > 1000 && v < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
      return d.toISOString().slice(0, 10);
    }
    const t = String(v || '').trim(), m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    return '';
  }
  const txt = (v) => v === null || v === undefined ? '' : String(v).trim();
  function normTete(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  /** Reconnaît le classeur « BASE_A2B » (feuilles Base Membre, Cotisation, Cotisation2, Depence, Dons) */
  function estClasseurA2B(feuilles) {
    const noms = feuilles.map(f => normTete(f.nom));
    return noms.includes('base membre') && (noms.includes('cotisation') || noms.includes('depence') || noms.includes('dons'));
  }

  function importerA2B(feuilles, exercice) {
    const F = (n) => feuilles.find(f => normTete(f.nom) === n);
    const rapport = { membres: 0, cotisations: [], depenses: 0, dons: 0, photos: [] };
    const membres = [], parIdent = {};
    const bm = F('base membre');
    (bm ? bm.lignes.slice(1) : []).forEach(l => {
      const ident = txt(l[0]); if (!ident) return;
      if (parIdent[ident.toUpperCase()]) return;
      const m = { id: nouvelId('m'), ident, nom: txt(l[1]), prenoms: txt(l[2]), residence: txt(l[3]), contact: txt(l[4]), fonction: '', genre: '', dateAdhesion: '', photo: '', actif: true };
      if (txt(l[5])) rapport.photos.push({ membre: m.id, chemin: txt(l[5]) });
      membres.push(m); parIdent[ident.toUpperCase()] = m;
    });
    rapport.membres = membres.length;

    const cotisations = [];
    [['cotisation', 'Cotisations mensuelles', 'Mensuelles', '#0f6b45'], ['cotisation2', 'Cotisations exceptionnelles', 'Exceptionnelles', '#c0571b']].forEach(([n, nom, court, couleur]) => {
      const f = F(n); if (!f) return;
      const tete = f.lignes[0] || [];
      const colonnes = tete.slice(6, 18).map((x, i) => txt(x) || `Versement ${i + 1}`);
      // montant attendu : cellule V2 (ou V1/V3) du classeur, ex. « 12000 Cfa »
      let seuil = null;
      for (const r of [1, 0, 2]) { const v = lireMontant((f.lignes[r] || [])[21]); if (v && v > 0) { seuil = v; break; } }
      const k = { id: nouvelId('k'), nom, court, couleur, colonnes, mode: 'total', montantAttendu: seuil || 0, montantPeriode: seuil ? Math.round(seuil / 12) : 0, versements: {} };
      let nb = 0;
      f.lignes.slice(1).forEach(l => {
        const m = parIdent[txt(l[0]).toUpperCase()]; if (!m) return;
        colonnes.forEach((c, i) => { const v = lireMontant(l[6 + i]); if (v !== null && v !== 0) { (k.versements[m.id] = k.versements[m.id] || {})[i] = v; nb++; } });
      });
      cotisations.push(k);
      rapport.cotisations.push({ nom, versements: nb, montantAttendu: k.montantAttendu });
    });

    const operations = (n, prefixe) => {
      const f = F(n); if (!f) return [];
      return f.lignes.slice(1).filter(l => txt(l[0]) || txt(l[3]) || lireMontant(l[4])).map(l => ({
        id: nouvelId(prefixe === 'Don' ? 'd' : 'p'), numero: txt(l[0]) || '', date: excelVersIso(l[2]), mois: txt(l[1]),
        designation: txt(l[3]), montant: lireMontant(l[4]) || 0, categorie: prefixe === 'Dépense' ? 'Autres' : undefined, donateur: ''
      }));
    };
    const depenses = operations('depence', 'Dépense').map(d => { delete d.donateur; d.numero = d.numero.replace(/^Depense/i, 'Dépense'); return d; });
    const dons = operations('dons', 'Don').map(d => { delete d.categorie; return d; });
    rapport.depenses = depenses.length; rapport.dons = dons.length;
    return { membres, cotisations, depenses, dons, rapport, exercice };
  }

  /** Import d'une liste de membres depuis un classeur quelconque (colonnes reconnues par leur intitulé) */
  const ALIAS = {
    ident: ['identifiant', 'idfant', 'id', 'matricule', 'numero', 'n', 'code', 'n membre', 'numero membre'],
    nom: ['nom', 'noms', 'nom de famille'],
    prenoms: ['prenoms', 'prenom'],
    nomComplet: ['nom et prenoms', 'nom prenoms', 'nom et prenom', 'nom complet'],
    residence: ['quartier', 'quartier a bouake', 'residence', 'lieu de residence', 'adresse', 'ville', 'localite'],
    contact: ['contact', 'contacts', 'telephone', 'tel', 'cellulaire', 'numero de telephone', 'portable'],
    fonction: ['fonction', 'poste', 'role', 'responsabilite', 'qualite'],
    dateAdhesion: ['date adhesion', 'date d adhesion', 'adhesion', 'date d entree'],
    genre: ['genre', 'sexe', 'genre h f', 'sexe h f', 'h f', 'm f']
  };
  function detecterColonnes(lignes) {
    for (let r = 0; r < Math.min(10, lignes.length); r++) {
      const map = {};
      (lignes[r] || []).forEach((v, i) => {
        const t = normTete(v);
        Object.keys(ALIAS).forEach(k => { if (map[k] === undefined && ALIAS[k].includes(t)) map[k] = i; });
      });
      if (map.nom !== undefined || map.nomComplet !== undefined) return { entete: r, map };
    }
    return null;
  }
  function importerMembresListe(lignes) {
    const d = detecterColonnes(lignes);
    if (!d) return null;
    const out = [];
    lignes.slice(d.entete + 1).forEach(l => {
      const g = (k) => d.map[k] === undefined ? '' : txt(l[d.map[k]]);
      let nom = g('nom'), prenoms = g('prenoms');
      if (!nom && g('nomComplet')) { const p = g('nomComplet').split(/\s+/); nom = p.shift(); prenoms = p.join(' '); }
      if (!nom && !prenoms) return;
      out.push({ id: nouvelId('m'), ident: g('ident'), nom, prenoms, residence: g('residence'), contact: g('contact'), fonction: g('fonction'), genre: lireGenre(g('genre')), dateAdhesion: excelVersIso(l[d.map.dateAdhesion]) || g('dateAdhesion'), photo: '', actif: true });
    });
    return { membres: out, colonnes: Object.keys(d.map) };
  }

  const api = { MOIS, COULEURS, CATEGORIES, PARAMS_DEFAUT, nouvelId, clone, estNombre, lireMontant, arrondi,
    cotisationMensuelle, cotisationExceptionnelle, nouvelExercice, normaliser, nomComplet, triMembres, prochainIdent,
    valeur, totalMembre, moisEchus, attendu, situation, membresActifs, resumeCotisation, somme, moisDe, prochainNumero,
    bilan, arrieres, finExercice, totauxCloture, aleatoire, accesMembre, contactsUrgence, diviserParGenre, regrouperGenre, concerne, montants, libelleAttendu, normaliserGenreCot, GENRES, GENRE_UN, lireGenre, genreDe, sousSession, effectifsGenre, moisDeColonne, moisDesColonnes, exerciceSuivant, excelVersIso, estClasseurA2B, importerA2B, importerMembresListe, normTete };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Asso = api;
})(typeof window !== 'undefined' ? window : globalThis);
