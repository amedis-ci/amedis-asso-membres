/* AMEDIS pro Asso — copie en lecture seule publiée sur le site de consultation des membres (Google Apps Script).
   Tout est calculé ici (situations, bilan) : le site ne fait qu'afficher. Les codes personnels ne sont jamais publiés en clair. */
(function (root) {
  'use strict';
  const A = root.Asso || (typeof require !== 'undefined' ? require('./modele.js') : null);

  const normIdent = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
  async function sha256(t) {
    const c = root.crypto || (typeof require !== 'undefined' ? require('crypto').webcrypto : null);
    const b = await c.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  }
  const hashCode = (sel, ident, code) => sha256(sel + '|' + normIdent(ident) + '|' + String(code || '').trim());

  /** Liens des trois codes QR */
  function liens(s, m) {
    const u = String((s.params.publication || {}).url || '').trim();
    if (!u) return null;
    return { asso: u + '?v=asso', membre: u + '?v=membre', perso: m ? u + '?v=perso&t=' + encodeURIComponent(m.jeton) : '', carte: m && m.jetonCarte ? u + '?v=carte&t=' + encodeURIComponent(m.jetonCarte) : '' };
  }

  /** Construit la publication. reduire(dataUrl, taille) -> Promise<dataUrl> (photos et logo allégés) */
  async function construire(s, reduire) {
    const p = s.params, pub = p.publication, mon = p.monnaie || 'F CFA';
    const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' ' + mon;
    const red = async (img, t) => { if (!img) return ''; try { return reduire ? (await reduire(img, t)) || '' : img; } catch (e) { return ''; } };
    const b = A.bilan(s), eff = A.effectifsGenre(s);
    const cots = s.cotisations.map(k => {
      const r = A.resumeCotisation(s, k);
      return { nom: k.nom, court: k.court || k.nom, couleur: k.couleur, colonnes: k.colonnes.slice(), attendu: A.libelleAttendu(k, p, fmt),
        resume: { total: r.total, aJour: r.aJour, pasAJour: r.pasAJour, resteTotal: r.resteTotal, taux: r.taux, parColonne: r.parColonne } };
    });
    const membres = [];
    for (const m of s.membres.slice().sort(A.triMembres)) {
      A.accesMembre(m);
      membres.push({
        i: m.ident || '', h: await hashCode(pub.sel, m.ident, m.code), j: m.jeton, jc: m.jetonCarte || '',
        nom: m.nom || '', prenoms: m.prenoms || '', genre: A.genreDe(m), residence: m.residence || '', contact: m.contact || '', fonction: m.fonction || '',
        dateAdhesion: m.dateAdhesion || '', actif: m.actif !== false, photo: await red(m.photo, 200),
        c: s.cotisations.map(k => { const st = A.situation(k, m, p); return { t: st.total, a: st.attendu, r: st.reste, ok: st.aJour, nc: !!st.nonConcerne, v: k.colonnes.map((c, j) => A.valeur(k, m.id, j)) }; }),
        rc: (s.recus || []).filter(r => r.membreId === m.id).map(r => ({ n: r.num, d: r.date, t: r.total, m: r.mode, l: r.lignes.map(x => `${x.nom} ${x.periode} : ${fmt(x.montant)}`), x: r.annule ? 1 : 0 }))
      });
    }
    const reserve = (id) => { const k = s.cotisations.find(x => x.id === id); return !!(k && (k.public === 'H' || k.public === 'F')); };
    return {
      v: 1, publieLe: new Date().toISOString(), sel: pub.sel,
      asso: { nom: p.nom || '', siege: p.siege || p.ville || '', exercice: p.exercice, monnaie: mon, libelleResidence: p.libelleResidence || 'Résidence', logo: await red(p.logo, 120), urgence: A.contactsUrgence(s) },
      cotisations: cots, membres,
      tableau: { effectifs: eff, totalCotisations: b.totalCotisations, dons: b.dons, depenses: b.depenses, solde: b.solde, report: b.report, cotParGenre: b.cotParGenre },
      bilan: { cotisations: b.cotisations.map(x => ({ nom: x.nom, total: x.total, parGenre: x.parGenre, reserve: reserve(x.id) })), dons: b.dons, recettes: b.recettes, depenses: b.depenses,
        parCategorie: b.parCategorie, report: b.report, solde: b.solde, nonReparti: b.nonReparti, parMois: b.parMois.map((x, i) => ({ mois: A.MOIS[i], recettes: x.recettes, depenses: x.depenses })) },
      depenses: s.depenses.map(d => ({ numero: d.numero || '', date: d.date || '', designation: d.designation || '', categorie: d.categorie || '', montant: Number(d.montant) || 0 })),
      dons: s.dons.map(d => ({ numero: d.numero || '', date: d.date || '', designation: d.designation || '', donateur: d.donateur || '', montant: Number(d.montant) || 0 })),
      // pour l'appli du trésorier (site 1.9.0) : listes de choix ; le code d'opérations n'est publié que sous forme d'empreinte
      gestion: {
        caisses: (p.caisses || []).slice(), categories: (s.categories || []).slice(), prochainIdent: A.prochainIdent(s),
        reunions: (s.reunions || []).slice(-30).map(u => ({ id: u.id, date: u.date || '', objet: u.objet || '', lieu: u.lieu || '', amendes: u.amendes || {}, n: Object.keys(u.presences || {}).length })),
        evenements: (s.evenements || []).map(e => ({ id: e.id, type: e.type, libelle: e.libelle, beneficiaire: e.beneficiaire || '', date: e.date || '', contribution: e.contribution || 0, aide: e.aide ? e.aide.montant : 0 })),
        typesEvenement: { deces: 'Décès', naissance: 'Naissance', mariage: 'Mariage', maladie: 'Maladie', autre: 'Autre' },
        opsH: pub.codeOps ? await sha256(pub.sel + '|OPS|' + String(pub.codeOps).trim()) : ''
      }
    };
  }

  /** Message WhatsApp : général (QR 1 / QR 2) ou personnel (QR 3) */
  function messageGeneral(s, quoi) {
    const l = liens(s); if (!l) return '';
    const asso = s.params.nom || "l'association";
    return quoi === 'membre'
      ? `📋 *${asso}* — Consultez votre fiche de membre et vos cotisations (exercice ${s.params.exercice}) :\n${l.membre}\n\nSaisissez votre identifiant de membre et votre code personnel (4 chiffres, remis par le bureau). Consultation seulement.`
      : `📊 *${asso}* — Espace des membres (exercice ${s.params.exercice}) : votre dossier et vos cotisations, ainsi que le tableau de bord, les dépenses, les dons et le bilan de l'association.\n${l.asso}\n\nSaisissez votre identifiant de membre et votre code personnel (4 chiffres, remis par le bureau). Consultation seulement, rien ne peut être modifié.`;
  }
  function messagePersonnel(s, m) {
    const l = liens(s, m); if (!l) return '';
    return `Bonjour ${[m.prenoms, m.nom].filter(Boolean).join(' ')},\n\nVoici votre lien personnel pour consulter votre dossier de membre de *${s.params.nom || "l'association"}* (identité, cotisations, versements) :\n${l.perso}\n\nCe lien vous est réservé : ne le transférez pas.\nPour l'espace des membres (code QR du groupe), votre identifiant est *${m.ident}* et votre code personnel *${m.code}*.`;
  }
  /** Numéro WhatsApp international (Côte d'Ivoire : 225 + 10 chiffres) */
  function numeroWhatsApp(contact, indicatif) {
    let d = String(contact || '').split(/[\/,;]| et /)[0].replace(/[^\d+]/g, '');
    if (!d) return '';
    if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2);
    const ind = String(indicatif || '225');
    if (!d.startsWith(ind) || d.length <= 10) d = ind + d;
    return d.length >= 11 ? d : '';
  }

  const api = { construire, liens, hashCode, normIdent, messageGeneral, messagePersonnel, numeroWhatsApp };
  root.Publication = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
