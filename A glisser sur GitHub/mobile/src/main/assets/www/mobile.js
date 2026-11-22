/* AMEDIS pro Asso Mobile — bouton de menu (≡), voile, fermeture du menu après un choix */
(function () {
  'use strict';
  function preparer() {
    const g = document.querySelector('.entete-gauche');
    if (!g || g.querySelector('.btn-menu')) return;
    const b = document.createElement('button');
    b.className = 'btn-menu'; b.type = 'button'; b.title = 'Menu'; b.setAttribute('aria-label', 'Ouvrir le menu');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    b.onclick = () => document.body.classList.toggle('menu-ouvert');
    g.insertBefore(b, g.firstChild);
    const v = document.createElement('div'); v.className = 'voile-menu'; v.onclick = () => document.body.classList.remove('menu-ouvert');
    document.body.appendChild(v);
    const barre = document.querySelector('.barre');
    if (barre) barre.addEventListener('click', (e) => { if (e.target.closest('#nav a, #btn-changer-session, #btn-licence')) setTimeout(() => document.body.classList.remove('menu-ouvert'), 60); });
    // le clavier virtuel ne doit pas cacher le champ en cours de saisie
    document.addEventListener('focusin', (e) => { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* rien */ } }, 300); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preparer); else preparer();
})();
