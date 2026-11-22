package ci.amedis.asso.pro;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AMEDIS pro Asso Mobile : le logiciel complet de gestion d'association, sans ordinateur.
 * Les écrans sont ceux du logiciel PC (HTML/JS), servis depuis l'appli à l'adresse sécurisée
 * https://appassets.androidplatform.net/www/ ; le pont Natif remplace la partie Windows.
 */
public class MainActivity extends Activity {

    private static final String HOTE = "appassets.androidplatform.net";
    private static final String ACCUEIL = "https://" + HOTE + "/www/index.html";
    private static final int WEBVIEW_MINI = 90;

    private WebView web;
    private Natif natif;
    private boolean pret;
    private final List<WebView> gardees = new ArrayList<>();
    private static final Map<String, String> TYPES = new HashMap<>();

    static {
        TYPES.put("html", "text/html");
        TYPES.put("js", "application/javascript");
        TYPES.put("css", "text/css");
        TYPES.put("png", "image/png");
        TYPES.put("jpg", "image/jpeg");
        TYPES.put("svg", "image/svg+xml");
        TYPES.put("json", "application/json");
        TYPES.put("woff2", "font/woff2");
        TYPES.put("gs", "text/plain");
        TYPES.put("txt", "text/plain");
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        Window f = getWindow();
        f.setStatusBarColor(Color.parseColor("#0c2340"));
        f.setNavigationBarColor(Color.parseColor("#0c2340"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#f3f5f9"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        natif = new Natif(this, web);
        web.addJavascriptInterface(natif, "AmedisNatif");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOTE.equals(u.getHost()) || u.getPath() == null || !u.getPath().startsWith("/www/")) return null;
                String chemin = u.getPath().substring(1);
                if (chemin.contains("..")) return null;
                try {
                    InputStream in = getAssets().open(chemin);
                    String ext = chemin.substring(chemin.lastIndexOf('.') + 1).toLowerCase();
                    String type = TYPES.containsKey(ext) ? TYPES.get(ext) : "application/octet-stream";
                    WebResourceResponse rep = new WebResourceResponse(type, "utf-8", in);
                    Map<String, String> h = new HashMap<>();
                    h.put("Cache-Control", "no-cache");
                    rep.setResponseHeaders(h);
                    return rep;
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Absent", new HashMap<>(), null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOTE.equals(u.getHost())) return false;
                // tout lien externe s'ouvre dans le navigateur ou WhatsApp, jamais dans le logiciel
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignore) { /* aucune appli */ }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) { pret = true; }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                if (BuildConfig.DEBUG) Log.d("AMEDIS", m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
                return true;
            }
        });
        setContentView(web);
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        recevoir(getIntent(), true);
        web.loadUrl(ACCUEIL);
        verifierWebView();
    }

    /** Les écrans demandent un moteur Web récent (Android System WebView ou Chrome à jour). */
    private void verifierWebView() {
        try {
            PackageInfo p = WebView.getCurrentWebViewPackage();
            if (p == null) return;
            int majeure = Integer.parseInt(p.versionName.split("\\.")[0]);
            if (majeure >= WEBVIEW_MINI) return;
            new AlertDialog.Builder(this)
                    .setTitle("Mise à jour nécessaire")
                    .setMessage("Le composant « Android System WebView » de ce téléphone est trop ancien (version " + majeure + ").\n\n"
                            + "Ouvrez le Play Store, cherchez « Android System WebView » (ou « Chrome ») et touchez « Mettre à jour », puis rouvrez AMEDIS pro Asso.")
                    .setPositiveButton("Ouvrir le Play Store", (d, w) -> {
                        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.webview"))); } catch (Exception ignore) { /* pas de Play Store */ }
                    })
                    .setNegativeButton("Plus tard", null)
                    .show();
        } catch (Exception ignore) { /* version illisible : on continue */ }
    }

    // ------------------------------------------------------------------ fichier .amasso ouvert depuis WhatsApp, un courriel ou le gestionnaire de fichiers
    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        recevoir(i, false);
    }

    private void recevoir(Intent i, boolean demarrage) {
        if (i == null) return;
        Uri u = null;
        if (Intent.ACTION_VIEW.equals(i.getAction())) u = i.getData();
        else if (Intent.ACTION_SEND.equals(i.getAction())) u = i.getParcelableExtra(Intent.EXTRA_STREAM);
        if (u == null) return;
        String chemin = natif.importer(u);
        if (chemin == null) return;
        if (demarrage || !pret) natif.fichierDemarrage = chemin;
        else web.evaluateJavascript("window.__natifOuvrirFichier && window.__natifOuvrirFichier(" + org.json.JSONObject.quote(chemin) + ")", null);
    }

    @Override
    protected void onActivityResult(int req, int code, Intent data) {
        super.onActivityResult(req, code, data);
        natif.resultat(req, code, data);
    }

    // ------------------------------------------------------------------ retour arrière : fenêtre ouverte, puis tableau de bord, puis quitter (après enregistrement)
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__natifRetourArriere ? window.__natifRetourArriere() : false", r -> {
            if (!"true".equals(r)) finish();
        });
    }

    /** L'exercice est enregistré dès que l'appli passe en arrière-plan (appel, WhatsApp, écran éteint). */
    @Override
    protected void onPause() {
        super.onPause();
        if (pret) web.evaluateJavascript("window.__natifPause && window.__natifPause()", null);
    }

    void garder(WebView w) {
        gardees.add(w);
        while (gardees.size() > 3) gardees.remove(0).destroy();
    }

    @Override
    protected void onDestroy() {
        for (WebView w : gardees) w.destroy();
        gardees.clear();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
