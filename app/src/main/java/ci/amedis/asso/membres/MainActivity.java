package ci.amedis.asso.membres;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AMEDIS pro Asso – Espace des membres (application Android).
 * Affiche le site de consultation de l'association (Google Apps Script),
 * alimenté par le logiciel AMEDIS pro Asso du trésorier. Consultation seulement.
 * Conception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.
 */
public class MainActivity extends Activity {

    private static final Pattern LIEN = Pattern.compile(
            "https://script\\.google\\.com/macros/s/[A-Za-z0-9_-]+/exec[^\\s\"'<>]*");
    private static final int VERT = 0xFF0F6B45, VERT_FONCE = 0xFF0C4B32, OR = 0xFFD4A017;
    private static final long UN_JOUR = 24L * 3600 * 1000;

    private static final int M_ACTUALISER = 1, M_DOSSIER = 2, M_CARTE = 3, M_ESPACE = 4,
            M_SCANNER = 5, M_MAJ = 6, M_APROPOS = 7, M_OUBLIER = 8;

    private SharedPreferences prefs;
    private FrameLayout racine;
    private WebView web;
    private ProgressBar chargement;
    private View accueil, horsLigne;

    // ------------------------------------------------------------------ cycle de vie
    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        prefs = getSharedPreferences("amedis", MODE_PRIVATE);
        racine = new FrameLayout(this);
        setContentView(racine);
        construireWeb();

        if (!traiterIntent(getIntent())) {
            String depart = pageDeDepart();
            if (depart == null) montrerAccueil();
            else ouvrir(depart);
        }
        if (System.currentTimeMillis() - prefs.getLong("majLe", 0) > UN_JOUR) verifierMaj(false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        traiterIntent(intent);
    }

    /** Lien partagé depuis WhatsApp (Partager > AMEDIS Asso). */
    private boolean traiterIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
            String texte = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (texte != null) return recevoirLien(texte);
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (web.getVisibility() == View.VISIBLE && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ------------------------------------------------------------------ navigateur intégré
    private void construireWeb() {
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return externe(r.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return externe(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icone) {
                chargement.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                chargement.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) montrerHorsLigne();
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView v, int code, String description, String url) {
                montrerHorsLigne();
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        // Reçus et documents PDF : ouverts par le téléphone
        web.setDownloadListener((url, agent, disposition, type, taille) -> ouvrirExterne(Uri.parse(url)));
        racine.addView(web, plein());

        chargement = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        chargement.setIndeterminate(true);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(4), Gravity.TOP);
        racine.addView(chargement, lp);
        chargement.setVisibility(View.GONE);
    }

    /** Les pages de l'association restent dans l'appli ; le reste (appel, WhatsApp, PDF…) s'ouvre à part. */
    private boolean externe(Uri u) {
        String schema = u.getScheme() == null ? "" : u.getScheme();
        String hote = u.getHost() == null ? "" : u.getHost();
        if ((schema.equals("https") || schema.equals("http"))
                && (hote.equals("script.google.com") || hote.endsWith(".googleusercontent.com")
                || hote.equals("accounts.google.com"))) {
            return false;
        }
        ouvrirExterne(u);
        return true;
    }

    private void ouvrirExterne(Uri u) {
        try {
            Intent i = "intent".equals(u.getScheme())
                    ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            message("Impossible d'ouvrir ce lien sur ce téléphone.");
        }
    }

    private void ouvrir(String url) {
        retirer(accueil);
        accueil = null;
        retirer(horsLigne);
        horsLigne = null;
        web.setVisibility(View.VISIBLE);
        web.getSettings().setCacheMode(enLigne()
                ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        web.loadUrl(url);
    }

    // ------------------------------------------------------------------ liens de l'association
    /** Accepte un lien AMEDIS pro Asso (code QR scanné, lien collé ou partagé). */
    private boolean recevoirLien(String texte) {
        Matcher m = LIEN.matcher(texte == null ? "" : texte);
        if (!m.find()) {
            new AlertDialog.Builder(this)
                    .setTitle("Code non reconnu")
                    .setMessage("Ce n'est pas un lien de l'espace des membres AMEDIS pro Asso.\n\n"
                            + "Scannez le code QR de votre carte de membre, le code QR personnel de "
                            + "votre dossier, ou collez le lien reçu par WhatsApp.")
                    .setPositiveButton("Compris", null)
                    .show();
            return false;
        }
        String lien = m.group();
        String base = lien.substring(0, lien.indexOf("/exec") + 5);
        SharedPreferences.Editor ed = prefs.edit().putString("base", base);
        if (lien.contains("v=perso")) ed.putString("perso", lien);
        else if (lien.contains("v=carte")) ed.putString("carte", lien);
        ed.apply();
        message("Lien enregistré : l'appli s'ouvrira directement sur votre espace.");
        ouvrir(lien);
        invalidateOptionsMenu();
        return true;
    }

    private String pageDeDepart() {
        String perso = prefs.getString("perso", null);
        if (perso != null) return perso;
        String carte = prefs.getString("carte", null);
        if (carte != null) return carte;
        String base = prefs.getString("base", null);
        return base == null ? null : base + "?v=membre";
    }

    private void scanner() {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build();
            GmsBarcodeScanner lecteur = GmsBarcodeScanning.getClient(this, options);
            lecteur.startScan()
                    .addOnSuccessListener(code -> recevoirLien(code.getRawValue()))
                    .addOnFailureListener(e -> message(
                            "Lecture du code QR impossible sur ce téléphone : utilisez « Coller le lien reçu »."));
        } catch (Exception e) {
            message("Lecture du code QR impossible sur ce téléphone : utilisez « Coller le lien reçu ».");
        }
    }

    private void collerLien() {
        final EditText champ = new EditText(this);
        champ.setHint("https://script.google.com/macros/s/…/exec…");
        champ.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        try {
            ClipboardManager pp = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = pp == null ? null : pp.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                CharSequence t = clip.getItemAt(0).coerceToText(this);
                if (t != null && LIEN.matcher(t).find()) champ.setText(t);
            }
        } catch (Exception ignore) { /* presse-papiers indisponible */ }
        FrameLayout cadre = new FrameLayout(this);
        cadre.setPadding(dp(20), dp(8), dp(20), 0);
        cadre.addView(champ);
        new AlertDialog.Builder(this)
                .setTitle("Coller le lien reçu")
                .setMessage("Dans WhatsApp, appuyez longuement sur le message contenant le lien, "
                        + "choisissez « Copier », puis collez-le ici.")
                .setView(cadre)
                .setPositiveButton("Ouvrir", (d, w) -> recevoirLien(champ.getText().toString()))
                .setNegativeButton("Annuler", null)
                .show();
    }

    // ------------------------------------------------------------------ écrans natifs
    private void montrerAccueil() {
        retirer(accueil);
        web.setVisibility(View.GONE);

        ScrollView defil = new ScrollView(this);
        defil.setFillViewport(true);
        GradientDrawable fond = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{VERT, VERT_FONCE});
        defil.setBackground(fond);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        col.setPadding(dp(28), dp(40), dp(28), dp(28));
        defil.addView(col, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        col.addView(logo, new LinearLayout.LayoutParams(dp(104), dp(104)));

        col.addView(texte("AMEDIS pro Asso", 28, Color.WHITE, true, dp(18)));
        col.addView(texte("Espace des membres", 17, OR, true, dp(4)));
        col.addView(texte("Consultez votre dossier, vos cotisations, vos reçus, votre carte de membre "
                + "et les numéros d'urgence de l'association.", 15, 0xFFE6F1EB, false, dp(22)));
        col.addView(texte("Pour commencer, scannez le code QR de votre carte de membre ou le code QR "
                + "personnel de votre dossier.", 15, 0xFFE6F1EB, false, dp(12)));

        col.addView(bouton("Scanner le code QR", true, v -> scanner()), largeur(dp(28)));
        col.addView(bouton("Coller le lien reçu par WhatsApp", false, v -> collerLien()), largeur(dp(12)));

        View ressort = new View(this);
        col.addView(ressort, new LinearLayout.LayoutParams(1, 0, 1f));
        col.addView(texte("Consultation seulement : aucune donnée ne peut être modifiée depuis l'appli.",
                12, 0xFFA9CDB9, false, dp(28)));
        col.addView(texte("Conception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.",
                12, 0xFFA9CDB9, false, dp(6)));

        accueil = defil;
        racine.addView(accueil, plein());
    }

    private void montrerHorsLigne() {
        if (horsLigne != null) return;
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        col.setPadding(dp(32), dp(32), dp(32), dp(32));
        col.setBackgroundColor(Color.WHITE);
        col.setClickable(true);
        col.addView(texte("Pas de connexion", 22, VERT_FONCE, true, 0));
        col.addView(texte("Les informations de l'association ne peuvent pas être chargées pour le moment. "
                + "Vérifiez les données mobiles ou le Wi-Fi, puis réessayez.", 15, 0xFF4A5568, false, dp(12)));
        col.addView(bouton("Réessayer", true, v -> {
            retirer(horsLigne);
            horsLigne = null;
            String url = web.getUrl();
            ouvrir(url == null || url.startsWith("data:") || url.startsWith("about:")
                    ? pageDeDepart() : url);
        }), largeur(dp(24)));
        horsLigne = col;
        racine.addView(horsLigne, plein());
    }

    // ------------------------------------------------------------------ menu
    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        menu.clear();
        MenuItem act = menu.add(0, M_ACTUALISER, 0, "Actualiser");
        act.setIcon(android.R.drawable.ic_popup_sync);
        act.setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
        if (prefs.getString("perso", null) != null) menu.add(0, M_DOSSIER, 1, "Mon dossier");
        if (prefs.getString("carte", null) != null) menu.add(0, M_CARTE, 2, "Ma carte de membre");
        if (prefs.getString("base", null) != null) menu.add(0, M_ESPACE, 3, "Espace des membres");
        menu.add(0, M_SCANNER, 4, "Scanner un code QR");
        menu.add(0, M_MAJ, 5, "Rechercher une mise à jour");
        menu.add(0, M_APROPOS, 6, "À propos");
        if (prefs.getString("base", null) != null) menu.add(0, M_OUBLIER, 7, "Changer d'association");
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case M_ACTUALISER:
                String url = web.getUrl();
                if (url == null || accueil != null) {
                    String d = pageDeDepart();
                    if (d != null) ouvrir(d);
                } else ouvrir(url);
                return true;
            case M_DOSSIER: ouvrir(prefs.getString("perso", "")); return true;
            case M_CARTE: ouvrir(prefs.getString("carte", "")); return true;
            case M_ESPACE: ouvrir(prefs.getString("base", "") + "?v=membre"); return true;
            case M_SCANNER: scanner(); return true;
            case M_MAJ: verifierMaj(true); return true;
            case M_APROPOS: aPropos(); return true;
            case M_OUBLIER:
                new AlertDialog.Builder(this)
                        .setTitle("Changer d'association")
                        .setMessage("Les liens enregistrés sur ce téléphone seront effacés. "
                                + "Vous pourrez scanner un nouveau code QR.")
                        .setPositiveButton("Effacer", (d, w) -> {
                            prefs.edit().remove("base").remove("perso").remove("carte").apply();
                            CookieManager.getInstance().removeAllCookies(null);
                            web.clearHistory();
                            web.loadUrl("about:blank");
                            invalidateOptionsMenu();
                            montrerAccueil();
                        })
                        .setNegativeButton("Annuler", null)
                        .show();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    private void aPropos() {
        new AlertDialog.Builder(this)
                .setTitle("AMEDIS pro Asso – Membres")
                .setMessage("Version " + BuildConfig.VERSION_NAME + "\n\n"
                        + "Espace de consultation des membres, alimenté par le logiciel AMEDIS pro Asso "
                        + "de l'association. Consultation seulement.\n\n"
                        + "Conception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.")
                .setPositiveButton("Fermer", null)
                .show();
    }

    // ------------------------------------------------------------------ mises à jour de l'appli
    /** Compare la version installée à la dernière version publiée sur GitHub (sans Play Store). */
    private void verifierMaj(final boolean manuel) {
        final String depot = BuildConfig.DEPOT;
        if (depot == null || depot.isEmpty()) {
            if (manuel) message("Recherche de mise à jour non disponible pour cette version.");
            return;
        }
        if (manuel) message("Recherche d'une nouvelle version…");
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection)
                        new URL("https://api.github.com/repos/" + depot + "/releases/latest").openConnection();
                c.setRequestProperty("Accept", "application/vnd.github+json");
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                StringBuilder sb = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                    String ligne;
                    while ((ligne = br.readLine()) != null) sb.append(ligne).append('\n');
                }
                JSONObject j = new JSONObject(sb.toString());
                final String version = j.optString("tag_name", "").replaceFirst("^[vV]", "");
                final String notes = j.optString("body", "");
                String apk = null;
                JSONArray a = j.optJSONArray("assets");
                for (int i = 0; a != null && i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    if (o.optString("name", "").toLowerCase().endsWith(".apk")) {
                        apk = o.optString("browser_download_url", null);
                        break;
                    }
                }
                final String lienApk = apk;
                prefs.edit().putLong("majLe", System.currentTimeMillis()).apply();
                runOnUiThread(() -> {
                    if (isFinishing()) return;
                    if (lienApk != null && plusRecente(version, BuildConfig.VERSION_NAME)) {
                        new AlertDialog.Builder(this)
                                .setTitle("Nouvelle version " + version)
                                .setMessage("Une nouvelle version de l'appli est disponible."
                                        + (notes.isEmpty() ? "" : "\n\n" + notes)
                                        + "\n\nTéléchargez-la puis ouvrez le fichier pour l'installer : "
                                        + "vos liens enregistrés sont conservés.")
                                .setPositiveButton("Télécharger", (d, w) -> ouvrirExterne(Uri.parse(lienApk)))
                                .setNegativeButton("Plus tard", null)
                                .show();
                    } else if (manuel) {
                        message("Vous avez la dernière version (" + BuildConfig.VERSION_NAME + ").");
                    }
                });
            } catch (Exception e) {
                if (manuel) runOnUiThread(() -> message("Recherche impossible : vérifiez la connexion Internet."));
            }
        }).start();
    }

    static boolean plusRecente(String a, String b) {
        String[] x = a.split("\\."), y = b.split("\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            int u = i < x.length ? nombre(x[i]) : 0, v = i < y.length ? nombre(y[i]) : 0;
            if (u != v) return u > v;
        }
        return false;
    }

    private static int nombre(String s) {
        try { return Integer.parseInt(s.replaceAll("[^0-9]", "")); } catch (Exception e) { return 0; }
    }

    // ------------------------------------------------------------------ outils
    private boolean enLigne() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            @SuppressWarnings("deprecation") NetworkInfo ni = cm == null ? null : cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void retirer(View v) {
        if (v != null && v.getParent() != null) ((ViewGroup) v.getParent()).removeView(v);
    }

    private void message(String m) {
        Toast.makeText(this, m, Toast.LENGTH_LONG).show();
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private FrameLayout.LayoutParams plein() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private LinearLayout.LayoutParams largeur(int haut) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = haut;
        return lp;
    }

    private TextView texte(String t, int taille, int couleur, boolean gras, int haut) {
        TextView v = new TextView(this);
        v.setText(t);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, taille);
        v.setTextColor(couleur);
        v.setGravity(Gravity.CENTER);
        if (gras) v.setTypeface(Typeface.DEFAULT_BOLD);
        v.setLineSpacing(0, 1.15f);
        LinearLayout.LayoutParams lp = largeur(haut);
        v.setLayoutParams(lp);
        return v;
    }

    private Button bouton(String t, boolean principal, View.OnClickListener action) {
        Button b = new Button(this);
        b.setText(t);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(principal ? VERT_FONCE : Color.WHITE);
        GradientDrawable f = new GradientDrawable();
        f.setCornerRadius(dp(12));
        if (principal) f.setColor(OR);
        else {
            f.setColor(0x22FFFFFF);
            f.setStroke(dp(1), 0x66FFFFFF);
        }
        b.setBackground(f);
        b.setPadding(dp(16), dp(14), dp(16), dp(14));
        b.setOnClickListener(action);
        return b;
    }
}
