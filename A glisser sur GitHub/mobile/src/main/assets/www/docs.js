/* AMEDIS pro Asso — documents (HTML A4 converti en PDF par Electron) */
(function (root) {
  'use strict';
  const A = root.Asso;
  const Docs = {};

  function esc(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mt(n) { if (n === null || n === undefined || n === '') return ''; const x = Number(n); if (!isFinite(x)) return esc(n); return x.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/ /g, ' '); }
  function dateFr(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : esc(iso || ''); }
  const deux = (n) => String(n).padStart(2, '0');
  function horodatage() { const d = new Date(); return `${deux(d.getDate())}/${deux(d.getMonth() + 1)}/${d.getFullYear()} à ${deux(d.getHours())}:${deux(d.getMinutes())}`; }

  function hexRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const n = m ? parseInt(m[1], 16) : 0x1b2a4a; return [n >> 16, (n >> 8) & 255, n & 255]; }
  function teinte(h, t) { return '#' + hexRgb(h).map(x => Math.round(t >= 0 ? x + (255 - x) * t : x * (1 + t))).map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join(''); }

  function css(c) {
    const fonce = teinte(c, -0.2), clair = teinte(c, 0.84), tres = teinte(c, 0.94);
    return `
    @page { size: A4; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; position: relative; }
    .page:last-child { page-break-after: auto; }
    .entete { display: grid; grid-template-columns: 30mm 1fr 30mm; align-items: center; gap: 8px; border-bottom: 3px solid ${c}; padding-bottom: 6px; margin-bottom: 8px; }
    .entete .logo img { max-width: 28mm; max-height: 24mm; display: block; }
    .entete .nom { text-align: center; }
    .entete .nom b { display: block; font-size: 13pt; letter-spacing: .4px; color: ${fonce}; text-transform: uppercase; }
    .entete .nom span { display: block; font-size: 8.5pt; color: #444; margin-top: 2px; }
    .compte { border: 1.5px solid ${c}; text-align: center; padding: 3px; }
    .compte small { display: block; font-size: 7pt; text-transform: uppercase; color: #444; }
    .compte b { font-size: 15pt; color: ${fonce}; }
    h1 { font-size: 13pt; text-align: center; margin: 8px 25mm 4px; padding: 5px; border: 1.5px solid ${c}; text-transform: uppercase; letter-spacing: .5px; background: ${tres}; }
    .sous { text-align: center; font-size: 10pt; margin: 2px 0 8px; font-weight: bold; color: ${fonce}; }
    .montant-total { font-size: 11.5pt; margin: 6px 0 8px; font-weight: bold; display: flex; gap: 18px; justify-content: center; }
    .montant-total span { border-bottom: 2px solid ${c}; padding: 0 6px 2px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #555; padding: 3.5px 5px; }
    th { background: ${clair}; font-size: 8.2pt; text-transform: uppercase; }
    td { font-size: 9pt; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .c { text-align: center; } .r { text-align: right; white-space: nowrap; } .b { font-weight: bold; } .nw { white-space: nowrap; }
    .petit td { font-size: 7.6pt; padding: 2px 3px; } .petit th { font-size: 6.8pt; padding: 2px 3px; }
    tr.total td { font-weight: bold; background: ${tres}; font-size: 10pt; }
    .vert { color: #0a5a39; font-weight: bold; } .rouge { color: #a0261b; font-weight: bold; }
    .signature { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-start; page-break-inside: avoid; }
    .signature .lieu { font-size: 9.5pt; padding-top: 4px; }
    .signature .bloc { text-align: center; width: 70mm; font-size: 10pt; }
    .signature .bloc .espace { height: 22mm; }
    .signature .bloc small { display: block; font-size: 8pt; color: #444; }
    .deux { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .fiche { display: grid; grid-template-columns: 38mm 1fr; gap: 12px; margin: 10px 0; }
    .fiche .photo { width: 38mm; height: 46mm; border: 1px solid #555; display: flex; align-items: center; justify-content: center; overflow: hidden; color: #888; font-size: 8pt; }
    .fiche .photo img { width: 100%; height: 100%; object-fit: cover; }
    .fiche table td { font-size: 10.5pt; padding: 5px 7px; }
    .fiche table td:first-child { width: 48mm; background: ${tres}; font-weight: bold; }
    .etat { display: inline-block; padding: 1px 8px; border-radius: 8px; font-size: 8pt; font-weight: bold; }
    .etat.ok { background: #d9f2e4; color: #0a5a39; } .etat.non { background: #fbe0dc; color: #a0261b; }
    h3 { font-size: 10.5pt; margin: 14px 0 5px; color: ${fonce}; text-transform: uppercase; }
    .barre { height: 7px; background: ${c}; }
    tr.dont td { font-size: 8pt; color: #333; padding-top: 1.5px; padding-bottom: 1.5px; } tr.dont td:first-child { padding-left: 14px; font-style: italic; }
  `;
  }
  function page(contenu, s, paysage) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>${css(s.params.couleur || '#1b2a4a')}${paysage ? '@page{size:A4 landscape}' : ''}</style></head><body>${contenu}</body></html>`;
  }
  function entete(s, compte) {
    const p = s.params;
    return `<div class="entete"><div class="logo">${p.logo ? `<img src="${p.logo}">` : ''}</div>
      <div class="nom"><b>${esc(p.nom)}${p.sigle ? ` (${esc(p.sigle)})` : ''}</b><span>${[p.devise, p.siege ? 'Siège : ' + p.siege : '', p.contact].filter(Boolean).map(esc).join(' · ')}</span></div>
      <div>${compte ? `<div class="compte"><small>${esc(compte[0])}</small><b>${esc(compte[1])}</b></div>` : ''}</div></div>`;
  }
  function signature(s, qui) {
    const p = s.params;
    return `<div class="signature"><div class="lieu">Fait à <b>${esc(p.siege || '……………')}</b>, le ${horodatage()}</div>
      <div class="bloc">${esc(qui || p.signataireListes)}<div class="espace"></div><small>Cachet et signature</small></div></div>`;
  }
  const pied = (s, doc) => `${s.params.sigle || s.params.nom} — ${doc} — exercice ${s.params.exercice}`;
  const dev = (s) => esc(s.params.monnaie || 'F CFA');
  const membresTries = (s) => s.membres.slice().sort(A.triMembres);
  // genre : titre « … — HOMMES / FEMMES » et colonne Genre dans les listes d'ensemble
  const gT = (s) => s.genreLib ? ` — ${esc(s.genreLib)}` : '';
  const gN = (s) => s.genreLib ? ` - ${s.genreLib}` : '';
  const colGenre = (s) => !s.genreLib && s.membres.some(m => A.genreDe(m));
  const libG = (m) => ({ H: 'H', F: 'F' })[A.genreDe(m)] || '–';
  function repartition(s, l) {
    if (!colGenre(s)) return '';
    const h = l.filter(m => A.genreDe(m) === 'H').length, f = l.filter(m => A.genreDe(m) === 'F').length, n = l.length - h - f;
    return `<div class="sous" style="font-weight:normal">Hommes : <b>${h}</b> · Femmes : <b>${f}</b>${n ? ` · genre non renseigné : <b>${n}</b>` : ''}</div>`;
  }

  // ---------------------------------------------------------------- liste des membres
  Docs.listeMembres = function (s) {
    const l = membresTries(s).filter(m => m.actif !== false);
    if (!l.length) return { vide: s.genreLib ? `Aucun membre parmi les ${s.genreLib.toLowerCase()} : indiquez le genre dans la fiche de chaque membre.` : 'Aucun membre enregistré.' };
    const avecFonction = l.some(m => m.fonction);
    const html = page(`<div class="page">${entete(s, ['Nombre de membres', l.length])}
      <h1>Liste des membres${gT(s)}</h1><div class="sous">Exercice ${esc(s.params.exercice)}</div>${repartition(s, l)}
      <table><thead><tr><th>N°</th><th>Identifiant</th><th>Nom</th><th>Prénoms</th>${colGenre(s) ? '<th>Genre</th>' : ''}${avecFonction ? '<th>Fonction</th>' : ''}<th>${esc(s.params.libelleResidence)}</th><th>Contact</th></tr></thead><tbody>
      ${l.map((m, i) => `<tr><td class="c">${i + 1}</td><td class="nw b">${esc(m.ident)}</td><td>${esc(m.nom)}</td><td>${esc(m.prenoms)}</td>${colGenre(s) ? `<td class="c">${libG(m)}</td>` : ''}${avecFonction ? `<td>${esc(m.fonction)}</td>` : ''}<td>${esc(m.residence)}</td><td class="nw">${esc(m.contact)}</td></tr>`).join('')}
      </tbody></table>${signature(s)}</div>`, s);
    return { html, nom: 'Liste des membres' + gN(s), pied: pied(s, 'Liste des membres' + gN(s)) };
  };

  // ---------------------------------------------------------------- à jour / pas à jour
  Docs.situationCotisation = function (s, k, quoi) {
    const tous = membresTries(s).filter(m => m.actif !== false && A.concerne(k, m)).map(m => ({ m, st: A.situation(k, m, s.params) }));
    const l = quoi === 'ajour' ? tous.filter(x => x.st.aJour) : quoi === 'pasajour' ? tous.filter(x => !x.st.aJour) : tous;
    if (!tous.length && s.genreLib) return { vide: `Aucun membre parmi les ${s.genreLib.toLowerCase()} : indiquez le genre dans la fiche de chaque membre.` };
    if (!l.length) return { vide: quoi === 'ajour' ? 'Aucun membre à jour.' : quoi === 'pasajour' ? 'Aucun membre en retard : tous sont à jour.' : 'Aucun membre.' };
    const titre = quoi === 'ajour' ? 'Liste des membres à jour' : quoi === 'pasajour' ? 'Liste des membres pas à jour' : 'Situation des membres';
    const totalCot = l.reduce((t, x) => t + x.st.total, 0), totalReste = l.reduce((t, x) => t + x.st.reste, 0);
    const att = A.attendu(k, s.params);
    const html = page(`<div class="page">${entete(s, ['Nombre de membres', l.length])}
      <h1>${titre}${gT(s)}</h1><div class="sous">${esc(k.nom)} ${esc(s.params.exercice)} — montant attendu : ${esc(A.libelleAttendu(k, s.params, (n) => mt(n) + ' ' + s.params.monnaie))}${k.mode === 'periode' ? ' (mois échus)' : ''}</div>
      ${repartition(s, l.map(x => x.m))}<table><thead><tr><th>N°</th><th>Identifiant</th><th>Nom</th><th>Prénoms</th>${colGenre(s) ? '<th>Genre</th>' : ''}<th>${esc(s.params.libelleResidence)}</th><th>Montant cotisé</th>${quoi !== 'ajour' ? '<th>Reste à payer</th>' : ''}<th>Situation</th></tr></thead><tbody>
      ${l.map((x, i) => `<tr><td class="c">${i + 1}</td><td class="nw b">${esc(x.m.ident)}</td><td>${esc(x.m.nom)}</td><td>${esc(x.m.prenoms)}</td>${colGenre(s) ? `<td class="c">${libG(x.m)}</td>` : ''}<td>${esc(x.m.residence)}</td><td class="r">${mt(x.st.total)}</td>${quoi !== 'ajour' ? `<td class="r">${x.st.reste ? mt(x.st.reste) : '–'}</td>` : ''}<td class="c ${x.st.aJour ? 'vert' : 'rouge'}">${x.st.aJour ? 'À jour' : 'Pas à jour'}</td></tr>`).join('')}
      <tr class="total"><td colspan="${colGenre(s) ? 6 : 5}" class="r">TOTAL</td><td class="r">${mt(totalCot)}</td>${quoi !== 'ajour' ? `<td class="r">${mt(totalReste)}</td>` : ''}<td></td></tr>
      </tbody></table>${signature(s)}</div>`, s);
    return { html, nom: `${titre} - ${k.court || k.nom}${gN(s)}`, pied: pied(s, `${titre} (${k.nom})${gN(s)}`) };
  };

  // ---------------------------------------------------------------- état détaillé des cotisations (grille)
  Docs.etatCotisations = function (s, k) {
    const l = membresTries(s).filter(m => m.actif !== false && (A.concerne(k, m) || A.totalMembre(k, m.id) > 0));
    if (!l.length) return { vide: s.genreLib ? `Aucun membre parmi les ${s.genreLib.toLowerCase()} pour cette cotisation.` : 'Aucun membre.' };
    const r = A.resumeCotisation(s, k);
    const html = page(`<div class="page">${entete(s, ['Membres à jour', `${r.aJour} / ${r.aJour + r.pasAJour}`])}
      <h1>État des ${esc(k.nom.toLowerCase())}${gT(s)}</h1><div class="sous">Exercice ${esc(s.params.exercice)} — montant attendu : ${esc(A.libelleAttendu(k, s.params, (n) => mt(n) + ' ' + s.params.monnaie))} — total collecté : ${mt(r.total)} ${dev(s)}</div>
      ${repartition(s, l)}<table class="petit"><thead><tr><th>N°</th><th>Identifiant</th><th>Nom et prénoms</th>${colGenre(s) ? '<th>G.</th>' : ''}${k.colonnes.map(c => `<th>${esc(String(c).slice(0, 10))}</th>`).join('')}<th>Total</th><th>Reste</th><th>Situation</th></tr></thead><tbody>
      ${l.map((m, i) => { const st = A.situation(k, m, s.params); return `<tr><td class="c">${i + 1}</td><td class="nw b">${esc(m.ident)}</td><td>${esc(A.nomComplet(m))}</td>${colGenre(s) ? `<td class="c">${libG(m)}</td>` : ''}${k.colonnes.map((c, j) => { const v = A.valeur(k, m.id, j); return `<td class="r">${v === null ? '' : mt(v)}</td>`; }).join('')}<td class="r b">${mt(st.total)}</td><td class="r">${st.reste ? mt(st.reste) : '–'}</td><td class="c ${st.aJour ? 'vert' : 'rouge'}">${st.aJour ? 'À jour' : 'Pas à jour'}</td></tr>`; }).join('')}
      <tr class="total"><td colspan="${colGenre(s) ? 4 : 3}" class="r">TOTAL</td>${r.parColonne.map(v => `<td class="r">${v ? mt(v) : ''}</td>`).join('')}<td class="r">${mt(r.total)}</td><td class="r">${mt(r.resteTotal)}</td><td></td></tr>
      </tbody></table>${signature(s, s.params.signataireBilan)}</div>`, s, true);
    return { html, nom: `Etat des cotisations - ${k.court || k.nom}${gN(s)}`, paysage: true, pied: pied(s, `État des ${k.nom.toLowerCase()}${gN(s)}`) };
  };

  // ---------------------------------------------------------------- dépenses / dons
  function listeOperations(s, liste, quoi) {
    const dep = quoi === 'depenses';
    const l = liste.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.numero).localeCompare(String(b.numero), 'fr', { numeric: true }));
    if (!l.length) return { vide: dep ? 'Aucune dépense enregistrée.' : 'Aucun don enregistré.' };
    const total = A.somme(l);
    const titre = dep ? 'Liste des dépenses' : 'Liste des dons reçus';
    const html = page(`<div class="page">${entete(s, [dep ? 'Nombre de dépenses' : 'Nombre de dons', String(l.length).padStart(2, '0')])}
      <h1>${titre}</h1><div class="sous">Exercice ${esc(s.params.exercice)}</div>
      <div class="montant-total"><span>MONTANT TOTAL : ${mt(total)} ${dev(s)}</span></div>
      <table><thead><tr><th>N°</th><th>Mois</th><th>Date</th><th>${dep ? 'Désignation des dépenses' : 'Désignation des dons'}</th><th>${dep ? 'Catégorie' : 'Donateur'}</th><th>Montant</th></tr></thead><tbody>
      ${l.map(x => { const mo = A.moisDe(x.date); return `<tr><td class="nw b">${esc(x.numero)}</td><td>${mo === null ? esc(x.mois || '') : A.MOIS[mo]}</td><td class="c nw">${dateFr(x.date)}</td><td>${esc(x.designation)}</td><td>${esc(dep ? x.categorie : x.donateur)}</td><td class="r">${mt(x.montant)}</td></tr>`; }).join('')}
      <tr class="total"><td colspan="5" class="r">TOTAL</td><td class="r">${mt(total)}</td></tr>
      </tbody></table>${signature(s, dep ? s.params.signataireBilan : s.params.signataireListes)}</div>`, s);
    return { html, nom: titre, pied: pied(s, titre) };
  }
  Docs.listeDepenses = (s) => listeOperations(s, s.depenses, 'depenses');
  Docs.listeDons = (s) => listeOperations(s, s.dons, 'dons');

  // ---------------------------------------------------------------- bilan financier
  Docs.bilan = function (s) {
    const b = A.bilan(s), d = dev(s), p = s.params;
    const cats = Object.keys(b.parCategorie), nr = b.nonReparti.recettes || b.nonReparti.depenses, avecGenre = s.membres.some(m => A.genreDe(m));
    const reserve = (x) => { const c = s.cotisations.find(y => y.id === x.id); return c && (c.public === 'H' || c.public === 'F'); };
    const html = page(`<div class="page">${entete(s, ['Exercice', p.exercice])}
      <h1>Bilan financier</h1><div class="sous">Exercice ${esc(p.exercice)} — arrêté le ${horodatage()}</div>
      <div class="deux">
        <div><h3>Recettes</h3><table><thead><tr><th>Désignation</th><th>Montant (${d})</th></tr></thead><tbody>
          ${b.report ? `<tr><td>Report de l'exercice précédent</td><td class="r">${mt(b.report)}</td></tr>` : ''}
          ${b.cotisations.map(x => `<tr><td>${esc(x.nom)}</td><td class="r">${mt(x.total)}</td></tr>${avecGenre && !reserve(x) ? `<tr class="dont"><td>dont hommes</td><td class="r">${mt(x.parGenre.H)}</td></tr><tr class="dont"><td>dont femmes</td><td class="r">${mt(x.parGenre.F)}</td></tr>${x.parGenre.N ? `<tr class="dont"><td>dont genre non renseigné</td><td class="r">${mt(x.parGenre.N)}</td></tr>` : ''}` : ''}`).join('')}
          <tr><td>Dons reçus</td><td class="r">${mt(b.dons)}</td></tr>
          <tr class="total"><td>TOTAL DES RESSOURCES</td><td class="r">${mt(b.report + b.recettes)}</td></tr></tbody></table></div>
        <div><h3>Dépenses</h3><table><thead><tr><th>Catégorie</th><th>Montant (${d})</th></tr></thead><tbody>
          ${cats.map(c => `<tr><td>${esc(c)}</td><td class="r">${mt(b.parCategorie[c])}</td></tr>`).join('') || '<tr><td colspan="2" class="c">Aucune dépense</td></tr>'}
          <tr class="total"><td>TOTAL DES DÉPENSES</td><td class="r">${mt(b.depenses)}</td></tr></tbody></table></div>
      </div>
      <table style="margin-top:14px"><tbody><tr class="total"><td style="font-size:12pt">SOLDE ${b.solde >= 0 ? '(excédent)' : '(déficit)'}</td><td class="r" style="font-size:13pt">${mt(b.solde)} ${d}</td></tr></tbody></table>
      ${avecGenre ? `<h3>Cotisations par genre</h3><table class="petit"><thead><tr><th>Type de cotisation</th><th>Hommes</th><th>Femmes</th>${b.cotParGenre.N ? '<th>Non renseigné</th>' : ''}<th>Total</th></tr></thead><tbody>
        ${b.cotisations.map(x => `<tr><td>${esc(x.nom)}</td><td class="r">${mt(x.parGenre.H)}</td><td class="r">${mt(x.parGenre.F)}</td>${b.cotParGenre.N ? `<td class="r">${mt(x.parGenre.N)}</td>` : ''}<td class="r b">${mt(x.total)}</td></tr>`).join('')}
        <tr class="total"><td>TOTAL</td><td class="r">${mt(b.cotParGenre.H)}</td><td class="r">${mt(b.cotParGenre.F)}</td>${b.cotParGenre.N ? `<td class="r">${mt(b.cotParGenre.N)}</td>` : ''}<td class="r">${mt(b.totalCotisations)}</td></tr></tbody></table>` : ''}
      ${root.Gestion ? `<h3>Où est l'argent (soldes par caisse)</h3>${tableCaisses(s)}` : ''}
      ${root.Gestion && root.Gestion.comparaisonBudget(s).actif ? (() => { const cb = root.Gestion.comparaisonBudget(s); return `<h3>Budget prévu et réalisé</h3><table class="petit" style="width:80%"><thead><tr><th></th><th>Prévu</th><th>Réalisé</th><th>Écart</th></tr></thead><tbody>
        <tr><td>Recettes</td><td class="r">${mt(cb.totRec.prevu)}</td><td class="r">${mt(cb.totRec.realise)}</td><td class="r">${mt(cb.totRec.realise - cb.totRec.prevu)}</td></tr>
        <tr><td>Dépenses</td><td class="r">${mt(cb.totDep.prevu)}</td><td class="r">${mt(cb.totDep.realise)}</td><td class="r">${mt(cb.totDep.realise - cb.totDep.prevu)}</td></tr></tbody></table>`; })() : ''}
      <h3>Mouvements par mois</h3>
      <table class="petit"><thead><tr><th>Mois</th>${A.MOIS.map(m => `<th>${m.slice(0, 4)}.</th>`).join('')}${nr ? '<th>Non rép.</th>' : ''}<th>Total</th></tr></thead><tbody>
        <tr><td class="b">Recettes</td>${b.parMois.map(x => `<td class="r">${x.recettes ? mt(x.recettes) : ''}</td>`).join('')}${nr ? `<td class="r">${b.nonReparti.recettes ? mt(b.nonReparti.recettes) : ''}</td>` : ''}<td class="r b">${mt(b.parMois.reduce((t, x) => t + x.recettes, 0) + b.nonReparti.recettes)}</td></tr>
        <tr><td class="b">Dépenses</td>${b.parMois.map(x => `<td class="r">${x.depenses ? mt(x.depenses) : ''}</td>`).join('')}${nr ? `<td class="r">${b.nonReparti.depenses ? mt(b.nonReparti.depenses) : ''}</td>` : ''}<td class="r b">${mt(b.parMois.reduce((t, x) => t + x.depenses, 0) + b.nonReparti.depenses)}</td></tr>
      </tbody></table>
      ${nr ? '<p style="font-size:7.5pt;color:#444;margin:3px 0">« Non rép. » : versements sans mois (colonnes « Versement 1 »…) et opérations sans date. Les totaux sont égaux à ceux du bilan.</p>' : ''}
      <div class="signature"><div class="bloc">${esc(p.signataireBilan)}${p.tresorier ? `<br><b>${esc(p.tresorier)}</b>` : ''}<div class="espace"></div><small>Cachet et signature</small></div>
        <div class="bloc">Le Président${p.president ? `<br><b>${esc(p.president)}</b>` : ''}<div class="espace"></div><small>Cachet et signature</small></div></div>
      <div style="font-size:9pt;margin-top:6px">Fait à <b>${esc(p.siege)}</b>, le ${horodatage()}</div></div>`, s);
    return { html, nom: 'Bilan financier', pied: pied(s, 'Bilan financier') };
  };

  // ---------------------------------------------------------------- fiche de membre
  Docs.fiches = function (s, membres) {
    if (!membres.length) return { vide: 'Aucun membre sélectionné.' };
    const d = dev(s);
    const html = page(membres.map(m => `<div class="page">${entete(s, ['Identifiant', m.ident || '–'])}
      <h1>Fiche de membre</h1><div class="sous">Exercice ${esc(s.params.exercice)}</div>
      <div class="fiche"><div class="photo">${m.photo ? `<img src="${m.photo}">` : 'Photo'}</div>
        <table><tbody><tr><td>Identifiant</td><td class="b">${esc(m.ident)}</td></tr><tr><td>Nom</td><td class="b">${esc(m.nom)}</td></tr><tr><td>Prénoms</td><td class="b">${esc(m.prenoms)}</td></tr>${A.genreDe(m) ? `<tr><td>Genre</td><td>${A.GENRE_UN[A.genreDe(m)]}</td></tr>` : ''}
        ${m.fonction ? `<tr><td>Fonction</td><td>${esc(m.fonction)}</td></tr>` : ''}<tr><td>${esc(s.params.libelleResidence)}</td><td>${esc(m.residence)}</td></tr><tr><td>Contact</td><td>${esc(m.contact)}</td></tr>
        ${m.dateAdhesion ? `<tr><td>Date d'adhésion</td><td>${dateFr(m.dateAdhesion)}</td></tr>` : ''}</tbody></table></div>
      ${s.cotisations.filter(k => A.concerne(k, m) || A.totalMembre(k, m.id) > 0).map(k => { const st = A.situation(k, m, s.params); const v = k.colonnes.map((c, j) => [c, A.valeur(k, m.id, j)]).filter(x => x[1] !== null);
        return `<h3>${esc(k.nom)} <span class="etat ${st.aJour ? 'ok' : 'non'}">${st.aJour ? 'À jour' : 'Pas à jour'}</span></h3>
        ${v.length > 4 ? (() => { const h = Math.ceil(v.length / 2), cel = (e) => e ? `<td>${esc(e[0])}</td><td class="r">${mt(e[1])}</td>` : '<td></td><td></td>';
          return `<table><thead><tr><th>Période / versement</th><th>Montant (${d})</th><th>Période / versement</th><th>Montant (${d})</th></tr></thead><tbody>
          ${v.slice(0, h).map((e, i) => `<tr>${cel(e)}${cel(v[h + i])}</tr>`).join('')}
          <tr class="total"><td colspan="3">Total versé (attendu : ${mt(st.attendu)})</td><td class="r">${mt(st.total)}</td></tr>
          ${st.reste ? `<tr><td colspan="3" class="rouge">Reste à payer</td><td class="r rouge">${mt(st.reste)}</td></tr>` : ''}</tbody></table>`; })()
        : `<table><thead><tr><th>Période / versement</th><th>Montant (${d})</th></tr></thead><tbody>
        ${v.map(([c, x]) => `<tr><td>${esc(c)}</td><td class="r">${mt(x)}</td></tr>`).join('') || '<tr><td colspan="2" class="c">Aucun versement</td></tr>'}
        <tr class="total"><td>Total versé (attendu : ${mt(st.attendu)})</td><td class="r">${mt(st.total)}</td></tr>
        ${st.reste ? `<tr><td class="rouge">Reste à payer</td><td class="r rouge">${mt(st.reste)}</td></tr>` : ''}</tbody></table>`}`; }).join('')}
      ${signature(s, s.params.signataireBilan)}</div>`).join(''), s);
    return { html, nom: membres.length === 1 ? `Fiche ${membres[0].ident || A.nomComplet(membres[0])}` : 'Fiches des membres' + gN(s), pied: pied(s, 'Fiche de membre' + gN(s)) };
  };

  // ---------------------------------------------------------------- codes QR (1.4)
  /** Affiche A4 d'un code QR (à imprimer ou à partager) */
  Docs.afficheQR = function (s, titre, svg, texte, lien) {
    const html = page(`<div class="page">${entete(s)}
      <div style="text-align:center;margin-top:18px">
        <h1 style="font-size:24pt;margin:10px 0 4px">${esc(titre)}</h1>
        <div class="sous" style="font-size:11pt">Exercice ${esc(s.params.exercice)} — consultation en ligne</div>
        <div style="width:110mm;height:110mm;margin:12mm auto 6mm">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>
        <p style="font-size:12.5pt;margin:4px 20mm">Scannez ce code avec l'appareil photo de votre téléphone.</p>
        <p style="font-size:11pt;color:#333;margin:6px 20mm">${esc(texte)}</p>
        <p style="font-size:11pt;margin:10px 20mm"><b>Identifiant de membre + code personnel (4 chiffres)</b> remis par le bureau de l'association.</p>
        <p style="font-size:8pt;color:#666;word-break:break-all;margin:10mm 20mm 0">${esc(lien)}</p>
        <p style="font-size:9pt;color:#0f6b45;margin-top:4mm">Consultation seulement : rien ne peut être modifié par ce site.</p>
      </div></div>`, s);
    return { html, nom: 'Affiche QR - ' + titre, pied: pied(s, 'Affiche ' + titre) };
  };
  /** Codes d'accès des membres : coupons à découper (identifiant + code personnel) */
  Docs.codesAcces = function (s) {
    const l = membresTries(s).filter(m => m.actif !== false);
    if (!l.length) return { vide: 'Aucun membre actif.' };
    const coupon = (m) => `<div style="border:1px dashed #888;border-radius:4px;padding:3mm 4mm;height:31mm;box-sizing:border-box;break-inside:avoid;font-size:9pt">
      <div style="font-weight:bold;font-size:9.5pt;color:#0f6b45">${esc(s.params.nom || 'Association')}</div>
      <div style="margin-top:1mm"><b>${esc(A.nomComplet(m))}</b></div>
      <div style="margin-top:1.5mm">Identifiant : <b style="font-size:11pt">${esc(m.ident || '–')}</b></div>
      <div>Code personnel : <b style="font-size:13pt;letter-spacing:2px">${esc(m.code || '')}</b></div>
      <div style="font-size:7pt;color:#555;margin-top:1mm">Espace des membres en ligne — code strictement personnel</div></div>`;
    const html = page(`<div class="page">${entete(s, ['Nombre de membres', l.length])}
      <h1>Codes d'accès des membres</h1><div class="sous">À découper et à remettre à chaque membre — document confidentiel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-top:4mm">${l.map(coupon).join('')}</div></div>`, s);
    return { html, nom: "Codes d'acces des membres", pied: pied(s, "Codes d'accès des membres — CONFIDENTIEL") };
  };

  // ---------------------------------------------------------------- clôture (1.5)
  /** État des arriérés au 31/12 : dettes des membres pas à jour et décision du bureau pour chacune */
  Docs.etatArrieres = function (s, lignes, annee, cloture) {
    lignes = lignes || [];
    if (!lignes.length) return { vide: `Aucun arriéré : tous les membres étaient à jour au 31/12/${annee}.` };
    const t = A.totauxCloture(lignes), suiv = Number(annee) + 1;
    const dec = (l) => l.action === 'annuler' ? `<b>Annulée</b>${l.motif ? ' — ' + esc(l.motif) : ''}` : l.action === 'inactif' ? 'Membre rendu inactif (non reportée)' : `Reportée en ${suiv}`;
    const html = page(`<div class="page">${entete(s, ['Membres concernés', lignes.length])}
      <h1>État des arriérés au 31/12/${esc(annee)}</h1>
      <div class="sous">${cloture ? `Exercice clôturé le ${new Date(cloture.le).toLocaleDateString('fr-FR')}${cloture.par ? ' par ' + esc(cloture.par) : ''}` : 'Projet — à valider par le bureau avant la clôture'}</div>
      <table><colgroup><col style="width:5%"><col style="width:10%"><col style="width:25%"><col style="width:27%"><col style="width:11%"><col style="width:22%"></colgroup><thead><tr><th>N°</th><th>Identifiant</th><th>Nom et prénoms</th><th>Détail</th><th>Montant dû</th><th>Décision</th></tr></thead><tbody>
      ${lignes.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${esc(l.ident)}</td><td>${esc(l.nom)}</td><td style="font-size:8pt">${(l.detail || []).map(y => `${esc(String(y.court || y.nom).replace(/^Cotisations? /i, ''))}${Number(y.annee) !== Number(annee) ? ` (${y.annee})` : ''} : <span style="white-space:nowrap">${mt(y.reste)}</span>`).join('<br>')}</td><td class="r" style="white-space:nowrap">${mt(l.total)}</td><td style="font-size:8.5pt">${dec(l)}</td></tr>`).join('')}
      <tr class="total"><td colspan="4" class="r">TOTAL DES ARRIÉRÉS</td><td class="r">${mt(t.reporte + t.annule + t.inactif)}</td><td></td></tr></tbody></table>
      <table class="petit" style="width:60%;margin-top:4mm"><tbody>
        <tr><td>Reporté dans « Arriérés ${esc(annee)} » de l'exercice ${suiv} (${t.nReporte} membre(s))</td><td class="r b">${mt(t.reporte)} ${dev(s)}</td></tr>
        <tr><td>Dettes annulées par décision du bureau (${t.nAnnule})</td><td class="r b">${mt(t.annule)} ${dev(s)}</td></tr>
        <tr><td>Non reporté : membres rendus inactifs (${t.nInactif})</td><td class="r b">${mt(t.inactif)} ${dev(s)}</td></tr></tbody></table>
      <p style="font-size:8pt;color:#444">Les arriérés sont des sommes dues à l'association : ils ne figurent pas dans le solde de caisse tant qu'ils ne sont pas payés.</p>
      <div class="signature"><div class="bloc">${esc(s.params.signataireBilan || 'Le Trésorier')}${s.params.tresorier ? `<br><b>${esc(s.params.tresorier)}</b>` : ''}<div class="espace"></div><small>Cachet et signature</small></div>
        <div class="bloc">Le Président${s.params.president ? `<br><b>${esc(s.params.president)}</b>` : ''}<div class="espace"></div><small>Vu et approuvé</small></div></div>
      <div style="font-size:9pt;margin-top:6px">Fait à <b>${esc(s.params.siege || '……………')}</b>, le ${horodatage()}</div></div>`, s);
    return { html, nom: `Etat des arrieres ${annee}`, pied: pied(s, `État des arriérés au 31/12/${annee}`) };
  };

  // ---------------------------------------------------------------- gestion courante (1.6)
  const Gx = () => root.Gestion;
  const signer = (s, gauche, droite) => `<div class="signature"><div class="bloc">${esc(gauche || s.params.signataireBilan || 'Le Trésorier')}${s.params.tresorier && !gauche ? `<br><b>${esc(s.params.tresorier)}</b>` : ''}<div class="espace"></div><small>Cachet et signature</small></div>
      <div class="bloc">${esc(droite || 'Le Président')}${s.params.president && !droite ? `<br><b>${esc(s.params.president)}</b>` : ''}<div class="espace"></div><small>Cachet et signature</small></div></div>
      <div style="font-size:9pt;margin-top:6px">Fait à <b>${esc(s.params.siege || '……………')}</b>, le ${horodatage()}</div>`;
  /** Reçu : deux exemplaires sur une page A4 (membre / souche de l'association) */
  Docs.recu = function (s, r) {
    const ex = (qui) => `<div style="border:1.5px solid #333;border-radius:6px;padding:7mm 8mm;height:128mm;box-sizing:border-box;position:relative">
      ${r.annule ? `<div style="position:absolute;top:40%;left:18%;font-size:52pt;color:rgba(200,0,0,.3);transform:rotate(-18deg);font-weight:bold">ANNULÉ</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start">${entete(s).replace('class="entete"', 'class="entete" style="flex:1;margin:0;border:0"')}<div style="text-align:right;font-size:9pt;color:#555">${qui}</div></div>
      <h1 style="margin:3mm 0 1mm;font-size:16pt">REÇU N° ${esc(r.num)}</h1><div class="sous">Exercice ${esc(s.params.exercice)} — le ${dateFr(r.date)}</div>
      <p style="font-size:11pt;margin:4mm 0 2mm">Reçu de <b>${esc(r.nom)}</b> (identifiant <b>${esc(r.ident)}</b>) la somme de :</p>
      <table class="petit"><thead><tr><th>Cotisation</th><th>Période</th><th>Montant</th></tr></thead><tbody>
        ${r.lignes.map(l => `<tr><td>${esc(l.nom)}</td><td>${esc(l.periode)}</td><td class="r">${mt(l.montant)} ${dev(s)}</td></tr>`).join('')}
        <tr class="total"><td colspan="2" class="r">TOTAL</td><td class="r">${mt(r.total)} ${dev(s)}</td></tr></tbody></table>
      <p style="font-size:10pt;margin:3mm 0">Mode de paiement : <b>${esc(r.mode)}</b>${r.annule ? `<br><b style="color:#b00">Reçu annulé le ${dateFr(r.annule.le)} : ${esc(r.annule.motif)}</b>` : ''}</p>
      <div style="display:flex;justify-content:space-between;margin-top:5mm;font-size:10pt"><div>Le membre</div><div style="text-align:center">Le Trésorier<br><b>${esc(r.par || s.params.tresorier || '')}</b><div style="height:14mm"></div></div></div></div>`;
    const html = page(`<div class="page">${ex('Exemplaire du membre')}<div style="border-top:1px dashed #999;margin:5mm 0;text-align:center;font-size:7.5pt;color:#888">✂ ✂ ✂</div>${ex("Souche de l'association")}</div>`, s);
    return { html, nom: `Recu ${r.num} - ${r.nom}`, pied: pied(s, `Reçu n° ${r.num}`) };
  };
  Docs.registreRecus = function (s) {
    const l = (s.recus || []).slice();
    if (!l.length) return { vide: "Aucun reçu émis pour cet exercice." };
    const ok = l.filter(r => !r.annule), tot = ok.reduce((t, r) => t + r.total, 0);
    const html = page(`<div class="page">${entete(s, ['Reçus émis', l.length])}<h1>Registre des reçus</h1><div class="sous">Exercice ${esc(s.params.exercice)}</div>
      <table><thead><tr><th>N°</th><th>Date</th><th>Membre</th><th>Détail</th><th>Caisse</th><th>Montant</th></tr></thead><tbody>
      ${l.map(r => `<tr${r.annule ? ' style="color:#999;text-decoration:line-through"' : ''}><td>${esc(r.num)}</td><td>${dateFr(r.date)}</td><td>${esc(r.ident)} · ${esc(r.nom)}</td><td style="font-size:8pt">${r.lignes.map(x => `${esc(x.nom)} ${esc(x.periode)} : ${mt(x.montant)}`).join('<br>')}${r.annule ? '<br>ANNULÉ : ' + esc(r.annule.motif) : ''}</td><td>${esc(r.mode)}</td><td class="r">${mt(r.total)}</td></tr>`).join('')}
      <tr class="total"><td colspan="5" class="r">TOTAL DES REÇUS VALIDES (${ok.length})</td><td class="r">${mt(tot)}</td></tr></tbody></table>${signer(s)}</div>`, s);
    return { html, nom: 'Registre des recus', pied: pied(s, 'Registre des reçus') };
  };
  function tableCaisses(s) {
    const sc = Gx().soldesCaisses(s);
    return `<table class="petit"><thead><tr><th>Caisse</th><th>Report</th><th>Entrées</th><th>Sorties</th><th>Transferts +</th><th>Transferts −</th><th>Solde</th></tr></thead><tbody>
      ${sc.caisses.map(c => `<tr><td>${esc(c.nom)}</td><td class="r">${mt(c.report)}</td><td class="r">${mt(c.entrees)}</td><td class="r">${mt(c.sorties)}</td><td class="r">${mt(c.transfertsIn)}</td><td class="r">${mt(c.transfertsOut)}</td><td class="r b">${mt(c.solde)}</td></tr>`).join('')}
      <tr class="total"><td colspan="6" class="r">TOTAL</td><td class="r">${mt(sc.total)}</td></tr></tbody></table>`;
  }
  Docs.tableCaisses = tableCaisses;
  Docs.caisses = function (s) {
    const tr = s.transferts || [];
    const html = page(`<div class="page">${entete(s)}<h1>Situation des caisses</h1><div class="sous">Exercice ${esc(s.params.exercice)} — au ${horodatage()}</div>
      ${tableCaisses(s)}
      ${tr.length ? `<h3>Transferts entre caisses</h3><table class="petit"><thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Libellé</th><th>Montant</th></tr></thead><tbody>${tr.map(t => `<tr><td>${dateFr(t.date)}</td><td>${esc(t.de)}</td><td>${esc(t.vers)}</td><td>${esc(t.libelle)}</td><td class="r">${mt(t.montant)}</td></tr>`).join('')}</tbody></table>` : ''}
      <p style="font-size:8.5pt;color:#444">Contrôle : comparer chaque solde avec l'argent compté, le relevé Wave / Mobile Money et le relevé bancaire.</p>
      <table class="petit" style="width:70%"><thead><tr><th>Caisse</th><th>Solde du logiciel</th><th>Montant constaté</th><th>Écart</th></tr></thead><tbody>${Gx().soldesCaisses(s).caisses.map(c => `<tr><td>${esc(c.nom)}</td><td class="r">${mt(c.solde)}</td><td></td><td></td></tr>`).join('')}</tbody></table>
      ${signer(s)}</div>`, s);
    return { html, nom: 'Situation des caisses', pied: pied(s, 'Situation des caisses') };
  };
  Docs.journal = function (s) {
    const j = (s.journal || []).slice().reverse();
    if (!j.length) return { vide: 'Le journal est vide.' };
    const html = page(`<div class="page">${entete(s, ['Opérations', j.length])}<h1>Journal des opérations</h1><div class="sous">Exercice ${esc(s.params.exercice)} — qui a fait quoi, et quand</div>
      <table class="petit"><thead><tr><th>Date et heure</th><th>Utilisateur</th><th>Opération</th><th>Détail</th></tr></thead><tbody>
      ${j.map(x => `<tr><td style="white-space:nowrap">${new Date(x.le).toLocaleString('fr-FR')}</td><td>${esc(x.par)}</td><td>${esc(x.quoi)}</td><td>${esc(x.detail)}</td></tr>`).join('')}</tbody></table></div>`, s);
    return { html, nom: 'Journal des operations', pied: pied(s, 'Journal des opérations') };
  };
  Docs.emargement = function (s, u) {
    const l = membresTries(s).filter(m => m.actif !== false);
    const html = page(`<div class="page">${entete(s)}<h1>Feuille d'émargement</h1><div class="sous">${esc(u.objet)} — ${dateFr(u.date)}${u.lieu ? ' — ' + esc(u.lieu) : ''}</div>
      <table><thead><tr><th>N°</th><th>Identifiant</th><th>Nom et prénoms</th><th>Heure d'arrivée</th><th style="width:45mm">Signature</th></tr></thead><tbody>
      ${l.map((m, i) => `<tr style="height:9mm"><td class="c">${i + 1}</td><td>${esc(m.ident)}</td><td>${esc(A.nomComplet(m))}</td><td></td><td></td></tr>`).join('')}</tbody></table></div>`, s);
    return { html, nom: `Emargement ${u.date}`, pied: pied(s, "Feuille d'émargement") };
  };
  Docs.compteRendu = function (s, u) {
    const l = membresTries(s), parSt = (k) => l.filter(m => (u.presences || {})[m.id] === k);
    const bloc = (k, t) => { const x = parSt(k); return `<p style="margin:2mm 0"><b>${t} (${x.length})</b> : ${x.map(m => esc(A.nomComplet(m))).join(', ') || '–'}</p>`; };
    const am = l.map(m => ({ m, v: Number((u.amendes || {})[(u.presences || {})[m.id]]) || 0 })).filter(x => x.v);
    const html = page(`<div class="page">${entete(s)}<h1>Compte rendu de réunion</h1><div class="sous">${esc(u.objet)} — ${dateFr(u.date)}${u.lieu ? ' — ' + esc(u.lieu) : ''}</div>
      <h3>Participation</h3>${bloc('P', 'Présents')}${bloc('R', 'En retard')}${bloc('E', 'Excusés')}${bloc('A', 'Absents')}
      ${am.length ? `<h3>Amendes</h3><table class="petit" style="width:70%"><tbody>${am.map(x => `<tr><td>${esc(A.nomComplet(x.m))}</td><td>${(u.presences || {})[x.m.id] === 'A' ? 'Absence' : 'Retard'}</td><td class="r">${mt(x.v)} ${dev(s)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h3>Déroulement et décisions</h3><div style="white-space:pre-wrap;font-size:10.5pt;line-height:1.5;min-height:60mm">${esc(u.pv || '')}</div>
      ${signer(s, 'Le Secrétaire général', 'Le Président')}</div>`, s);
    return { html, nom: `Compte rendu ${u.date}`, pied: pied(s, 'Compte rendu de réunion') };
  };
  Docs.assiduite = function (s) {
    if (!(s.reunions || []).length) return { vide: 'Aucune réunion enregistrée.' };
    const st = Gx().statsPresence(s), am = Gx().amendesParMembre(s), l = membresTries(s).filter(m => m.actif !== false);
    const html = page(`<div class="page">${entete(s, ['Réunions', s.reunions.length])}<h1>Assiduité des membres</h1><div class="sous">Exercice ${esc(s.params.exercice)} — ${s.reunions.length} réunion(s)</div>
      <table><thead><tr><th>Identifiant</th><th>Nom et prénoms</th><th>Présent</th><th>Retard</th><th>Excusé</th><th>Absent</th><th>Taux de présence</th><th>Amendes</th></tr></thead><tbody>
      ${l.map(m => { const x = st[m.id]; return `<tr><td>${esc(m.ident)}</td><td>${esc(A.nomComplet(m))}</td><td class="c">${x.P}</td><td class="c">${x.R}</td><td class="c">${x.E}</td><td class="c">${x.A}</td><td class="c">${x.taux === null ? '–' : Math.round(100 * x.taux) + ' %'}</td><td class="r">${am[m.id] ? mt(am[m.id]) : ''}</td></tr>`; }).join('')}</tbody></table></div>`, s);
    return { html, nom: 'Assiduite des membres', pied: pied(s, 'Assiduité des membres') };
  };
  Docs.evenement = function (s, ev) {
    const r = Gx().resumeEvenement(s, ev), k = r.k;
    const l = k ? membresTries(s).filter(m => m.actif !== false && A.concerne(k, m)).map(m => ({ m, st: A.situation(k, m, s.params) })) : [];
    const html = page(`<div class="page">${entete(s)}<h1>Solidarité — ${esc(ev.libelle)}</h1><div class="sous">${esc(Gx().TYPES_EVT[ev.type])} — ${dateFr(ev.date)}${ev.beneficiaire ? ' — bénéficiaire : ' + esc(ev.beneficiaire) : ''}</div>
      <table class="petit" style="width:70%"><tbody><tr><td>Contribution demandée par membre</td><td class="r">${mt(ev.contribution)} ${dev(s)}</td></tr><tr><td>Collecté</td><td class="r b">${mt(r.collecte)} ${dev(s)}</td></tr>
        <tr><td>Aide remise</td><td class="r">${ev.aide ? `${mt(ev.aide.montant)} ${dev(s)} le ${dateFr(ev.aide.date)} (${esc(ev.aide.mode)})` : '–'}</td></tr><tr class="total"><td>Solde</td><td class="r">${mt(r.solde)} ${dev(s)}</td></tr></tbody></table>
      ${l.length ? `<h3>Contributions des membres</h3><table class="petit"><thead><tr><th>Identifiant</th><th>Nom et prénoms</th><th>Versé</th><th>Situation</th></tr></thead><tbody>${l.map(x => `<tr><td>${esc(x.m.ident)}</td><td>${esc(A.nomComplet(x.m))}</td><td class="r">${mt(x.st.total)}</td><td>${x.st.aJour ? 'A contribué' : 'Reste ' + mt(x.st.reste)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${signer(s)}</div>`, s);
    return { html, nom: `Solidarite - ${ev.libelle}`.slice(0, 80), pied: pied(s, 'Solidarité') };
  };
  /** Cartes de membre (8 par page, format carte bancaire) ; qr : { idMembre: svg } */
  /** Cartes de membre (8 par page) ; qr : { idMembre: svg } — le QR contient l'identité et les numéros d'urgence */
  Docs.cartes = function (s, membres, qr, urgence) {
    if (!membres.length) return { vide: 'Aucun membre.' };
    const p = s.params, c = p.couleur || '#1b2a4a';
    const g = (m) => ({ H: 'Homme', F: 'Femme' })[A.genreDe(m)] || '';
    const carte = (m) => `<div style="width:85.6mm;height:54mm;border:1px solid #bbb;border-radius:3.5mm;overflow:hidden;box-sizing:border-box;position:relative;break-inside:avoid;font-family:Arial,sans-serif;background:#fff">
      ${p.logo ? `<img src="${p.logo}" style="position:absolute;left:24mm;top:9mm;width:40mm;height:40mm;object-fit:contain;opacity:.10;z-index:0">` : ''}
      <div style="position:relative;z-index:1;background:${c};color:#fff;padding:1.6mm 3mm;font-size:7.3pt;font-weight:bold;display:flex;align-items:center;gap:2mm">${p.logo ? `<img src="${p.logo}" style="height:6.5mm;width:6.5mm;object-fit:contain;background:#fff;border-radius:1mm;padding:.3mm">` : ''}<span style="flex:1;line-height:1.15">${esc(p.nom || 'Association')}</span><span style="font-size:6.3pt;opacity:.9">CARTE DE MEMBRE</span></div>
      <div style="position:relative;z-index:1;display:flex;gap:2.4mm;padding:2.2mm 2.6mm 0">
        <div style="flex:none;width:18mm;height:23mm;background:#eef1f5 center/cover no-repeat;border-radius:1.5mm;border:.3mm solid #d5dbe2;${m.photo ? `background-image:url('${m.photo}')` : ''};display:flex;align-items:center;justify-content:center;color:#889;font-size:6pt">${m.photo ? '' : 'Photo'}</div>
        <table style="flex:1;min-width:0;border-collapse:collapse;font-size:6.6pt;line-height:1.22;table-layout:fixed;width:auto;margin:0">
          <colgroup><col style="width:12.5mm"><col></colgroup>
          ${[['Nom', m.nom, 1], ['Prénoms', m.prenoms, 1], ['N° membre', m.ident, 1], ['Genre', g(m)], ['Fonction', m.fonction || 'Membre'],
             [String(p.libelleResidence || 'Quartier').split('/')[0].trim() || 'Quartier', m.residence], ['Contact', m.contact], ['Adhésion', m.dateAdhesion ? dateFr(m.dateAdhesion) : ''], ['Exercice', p.exercice, 1]]
            .map(([t, v, gras]) => `<tr><td style="padding:.1mm 0;border:0;color:#666;font-size:5.4pt;line-height:1.45;vertical-align:top;white-space:nowrap;background:none">${esc(t)} :</td><td style="padding:.1mm 0 .1mm .8mm;border:0;vertical-align:top;background:none;font-size:6.6pt;line-height:1.2;${gras ? 'font-weight:bold;' : ''}${t === 'Nom' || t === 'Prénoms' ? 'word-break:break-word' : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis'}">${esc(v || '–')}</td></tr>`).join('')}
        </table>
        ${qr && qr[m.id] ? `<div style="flex:none;width:23mm;text-align:center"><div style="width:23mm;height:23mm;background:#fff">${qr[m.id].replace('<svg ', '<svg style="width:100%;height:100%;display:block" ')}</div><div style="font-size:4.9pt;color:#555;line-height:1.1;margin-top:.4mm">Carte vérifiable en ligne</div></div>` : ''}</div>
      ${(urgence || []).length ? `<div style="position:absolute;z-index:1;left:2.6mm;right:29.5mm;bottom:4.6mm;background:#fdecec;border:.25mm solid #e7b4b4;border-radius:1.2mm;padding:.4mm 1.6mm;font-size:5.5pt;line-height:1.22;display:flex;gap:2.2mm;align-items:center">
        <b style="color:#b42318;letter-spacing:.2px;flex:none">URGENCE</b><span style="display:grid;grid-template-columns:auto 1fr;column-gap:1.4mm;row-gap:0">${urgence.map(u => `<span style="color:#666;white-space:nowrap">${esc({ 'Secrétaire général': 'Secrétaire gén.' }[u.role] || u.role)}</span><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.tel)}</b>`).join('')}</span></div>` : ''}
      <div style="position:absolute;z-index:1;bottom:1.2mm;left:3mm;right:29.5mm;font-size:5.6pt;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.siege || '')}${p.contact ? ' · ' + esc(p.contact) : ''}</div>
      <div style="position:absolute;z-index:1;right:2.6mm;bottom:1.2mm;width:25mm;text-align:center;font-size:5.6pt;color:#555;border-top:.25mm dotted #999;padding-top:.4mm">Signature du Président</div></div>`;
    const html = page(`<div class="page" style="padding-top:6mm"><div style="display:grid;grid-template-columns:85.6mm 85.6mm;gap:5mm 6mm;justify-content:center">${membres.map(carte).join('')}</div></div>`, s);
    return { html, nom: 'Cartes de membre' + (s.genreLib ? ' - ' + s.genreLib : ''), pied: pied(s, 'Cartes de membre') };
  };
  /** Rapport pour l'assemblée générale : effectifs, cotisations, réunions, solidarité, finances, caisses, arriérés, budget, comparaison N-1 */
  Docs.rapportAG = function (s) {
    const G = Gx(), p = s.params, b = A.bilan(s), e = A.effectifsGenre(s), prec = s.precedent, cb = G.comparaisonBudget(s);
    const pc = (x, t) => t ? Math.round(100 * x / t) + ' %' : '–';
    const evo = (a, n) => (n === undefined || n === null) ? '' : `<td class="r">${mt(n)}</td><td class="r">${n ? ((a - n) / Math.abs(n) * 100 >= 0 ? '+' : '') + Math.round((a - n) / Math.abs(n) * 100) + ' %' : ''}</td>`;
    const st = G.statsPresence(s), nbR = (s.reunions || []).length;
    const tauxMoy = nbR ? Object.values(st).filter(x => x.n).reduce((t, x, i, l) => t + x.taux / l.length, 0) : null;
    const arr = A.arrieres(s), totArr = arr.reduce((t, x) => t + x.total, 0);
    const cotRows = s.cotisations.map(k => { const r = A.resumeCotisation(s, k), x = b.cotisations.find(y => y.id === k.id) || { parGenre: {} }; return `<tr><td>${esc(k.nom)}</td><td class="r">${mt(r.total)}</td><td class="r">${mt(x.parGenre.H)}</td><td class="r">${mt(x.parGenre.F)}</td><td class="c">${r.aJour} / ${r.aJour + r.pasAJour}</td><td class="r">${mt(r.resteTotal)}</td></tr>`; }).join('');
    const html = page(`<div class="page">${entete(s)}
      <h1>Rapport d'activités et financier</h1><div class="sous">Exercice ${esc(p.exercice)} — présenté à l'assemblée générale</div>
      <h3>1. Les membres</h3><table class="petit" style="width:80%"><thead><tr><th></th><th>Hommes</th><th>Femmes</th><th>Non renseigné</th><th>Total actifs</th>${prec ? `<th>${esc(prec.exercice)}</th><th>Évolution</th>` : ''}</tr></thead>
        <tbody><tr><td>Membres actifs</td><td class="c">${e.H} (${pc(e.H, e.total)})</td><td class="c">${e.F} (${pc(e.F, e.total)})</td><td class="c">${e.N}</td><td class="c b">${e.total}</td>${prec ? evo(e.total, prec.effectifs.total) : ''}</tr></tbody></table>
      <h3>2. Les cotisations</h3><table class="petit"><thead><tr><th>Cotisation</th><th>Collecté</th><th>dont hommes</th><th>dont femmes</th><th>À jour</th><th>Reste à recouvrer</th></tr></thead><tbody>${cotRows}
        <tr class="total"><td>TOTAL</td><td class="r">${mt(b.totalCotisations)}</td><td class="r">${mt(b.cotParGenre.H)}</td><td class="r">${mt(b.cotParGenre.F)}</td><td></td><td class="r">${mt(totArr)}</td></tr></tbody></table>
      <h3>3. Vie associative</h3><p style="margin:1mm 0">${nbR} réunion(s) tenue(s)${tauxMoy !== null ? `, taux moyen de présence ${Math.round(100 * tauxMoy)} %` : ''}. ${(s.evenements || []).length} événement(s) de solidarité${(s.evenements || []).length ? ' : ' + s.evenements.map(ev => `${esc(G.TYPES_EVT[ev.type])} — ${esc(ev.libelle)}${ev.aide ? ` (aide de ${mt(ev.aide.montant)} ${dev(s)})` : ''}`).join(' ; ') : ''}.</p>
      <h3>4. Situation financière</h3><table class="petit" style="width:85%"><thead><tr><th></th><th>${esc(p.exercice)}</th>${prec ? `<th>${esc(prec.exercice)}</th><th>Évolution</th>` : ''}</tr></thead><tbody>
        <tr><td>Report de l'exercice précédent</td><td class="r">${mt(b.report)}</td>${prec ? '<td></td><td></td>' : ''}</tr>
        <tr><td>Cotisations</td><td class="r">${mt(b.totalCotisations)}</td>${prec ? evo(b.totalCotisations, prec.totalCotisations) : ''}</tr>
        <tr><td>Dons</td><td class="r">${mt(b.dons)}</td>${prec ? evo(b.dons, prec.dons) : ''}</tr>
        <tr><td>Dépenses</td><td class="r">${mt(b.depenses)}</td>${prec ? evo(b.depenses, prec.depenses) : ''}</tr>
        <tr class="total"><td>Solde</td><td class="r">${mt(b.solde)}</td>${prec ? evo(b.solde, prec.solde) : ''}</tr></tbody></table>
      <p style="margin:1mm 0 0">Dépenses par catégorie : ${Object.entries(b.parCategorie).map(([c, v]) => `${esc(c)} ${mt(v)}`).join(' · ') || '–'}.</p>
      <h3>5. Où est l'argent</h3>${tableCaisses(s)}
      ${cb.actif ? `<h3>6. Budget prévu et réalisé</h3><table class="petit" style="width:85%"><thead><tr><th></th><th>Prévu</th><th>Réalisé</th><th>Taux</th></tr></thead><tbody>
        <tr><td>Recettes</td><td class="r">${mt(cb.totRec.prevu)}</td><td class="r">${mt(cb.totRec.realise)}</td><td class="c">${pc(cb.totRec.realise, cb.totRec.prevu)}</td></tr>
        <tr><td>Dépenses</td><td class="r">${mt(cb.totDep.prevu)}</td><td class="r">${mt(cb.totDep.realise)}</td><td class="c">${pc(cb.totDep.realise, cb.totDep.prevu)}</td></tr></tbody></table>` : ''}
      <h3>${cb.actif ? 7 : 6}. Membres pas à jour</h3><p style="margin:1mm 0">${arr.length} membre(s) actif(s) ne sont pas à jour, pour un total de <b>${mt(totArr)} ${dev(s)}</b>${arr.length ? ' (détail : document « Membres pas à jour »)' : ''}.</p>
      ${signer(s)}</div>`, s);
    return { html, nom: `Rapport AG ${p.exercice}`, pied: pied(s, "Rapport à l'assemblée générale") };
  };

  root.Docs = Docs;
})(typeof window !== 'undefined' ? window : globalThis);
