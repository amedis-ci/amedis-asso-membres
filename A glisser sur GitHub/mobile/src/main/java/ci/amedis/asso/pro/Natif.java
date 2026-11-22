package ci.amedis.asso.pro;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PdfImprimeur;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Pont entre le logiciel (HTML/JS, le même que sur PC) et Android.
 * Méthodes synchrones : fichiers de l'appli, empreintes, compression, presse-papiers.
 * Méthodes asynchrones (lancer) : Internet, choix de fichiers, PDF, impression, téléchargements ; la réponse
 * revient par window.__natifRetour(id, ok, json).
 * Les fichiers de l'appli restent dans sa mémoire privée ; seuls les documents produits vont dans Téléchargements.
 */
final class Natif {

    static final int REQ_FICHIER = 51, REQ_IMAGE = 52, REQ_DOSSIER = 53;
    private static final String ERR = "\u0000ERR:";
    private static final String HOTE = "https://appassets.androidplatform.net/www/";

    private final MainActivity act;
    private final WebView web;
    private final File racine;
    private final ExecutorService fond = Executors.newFixedThreadPool(3);
    private final Map<Integer, String> enAttente = new HashMap<>();
    private final SecureRandom alea = new SecureRandom();
    String fichierDemarrage;

    Natif(MainActivity act, WebView web) {
        this.act = act;
        this.web = web;
        this.racine = new File(act.getFilesDir(), "AMEDIS pro Asso");
        for (String d : new String[]{"Exercices", "Sauvegardes", "Config"}) new File(racine, d).mkdirs();
    }

    // ================================================================== fichiers de l'appli (mémoire privée)
    private File chemin(String rel) throws Exception {
        String r = String.valueOf(rel).replace('\\', '/');
        if (r.contains("..") || r.startsWith("/")) throw new Exception("Chemin refusé.");
        File f = new File(racine, r);
        if (!f.getCanonicalPath().startsWith(racine.getCanonicalPath())) throw new Exception("Chemin refusé.");
        return f;
    }

    @JavascriptInterface
    public String lireTexte(String rel) {
        try {
            File f = chemin(rel);
            if (!f.isFile()) return "\u0000ABSENT";
            return new String(lire(new FileInputStream(f)), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return ERR + "Lecture impossible : " + e.getMessage();
        }
    }

    @JavascriptInterface
    public String ecrireTexte(String rel, String texte) {
        try {
            File f = chemin(rel);
            f.getParentFile().mkdirs();
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream o = new FileOutputStream(tmp)) {
                o.write(texte.getBytes(StandardCharsets.UTF_8));
                o.getFD().sync();
            }
            if (!tmp.renameTo(f)) { f.delete(); if (!tmp.renameTo(f)) throw new Exception("renommage"); }
            return "1";
        } catch (Exception e) {
            return ERR + "Enregistrement impossible sur le téléphone (mémoire pleine ?).";
        }
    }

    @JavascriptInterface
    public String lister(String rel) {
        try {
            JSONArray a = new JSONArray();
            File[] l = chemin(rel).listFiles();
            if (l != null) for (File f : l) {
                if (!f.isFile() || f.getName().endsWith(".tmp")) continue;
                JSONObject o = new JSONObject();
                o.put("nom", f.getName());
                o.put("modifie", f.lastModified());
                o.put("taille", f.length());
                a.put(o);
            }
            return a.toString();
        } catch (Exception e) {
            return "[]";
        }
    }

    @JavascriptInterface
    public String supprimer(String rel) {
        try { return chemin(rel).delete() ? "1" : "0"; } catch (Exception e) { return "0"; }
    }

    @JavascriptInterface
    public String existe(String rel) {
        try { return chemin(rel).exists() ? "1" : "0"; } catch (Exception e) { return "0"; }
    }

    // ================================================================== empreintes
    @JavascriptInterface
    public String sha256(String t) {
        try { return hex(MessageDigest.getInstance("SHA-256").digest(t.getBytes(StandardCharsets.UTF_8))); } catch (Exception e) { return ERR + e.getMessage(); }
    }

    @JavascriptInterface
    public String hmac(String cle, String t) {
        try {
            Mac m = Mac.getInstance("HmacSHA256");
            m.init(new SecretKeySpec(cle.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return hex(m.doFinal(t.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return ERR + e.getMessage();
        }
    }

    /** Mots de passe des comptes : PBKDF2-HMAC-SHA256, 120 000 tours, 32 octets. */
    @JavascriptInterface
    public String pbkdf2(String mdp, String selHex) {
        try {
            SecretKeyFactory f = SecretKeyFactory.getInstance(Build.VERSION.SDK_INT >= 26 ? "PBKDF2WithHmacSHA256" : "PBKDF2WithHmacSHA1");
            byte[] k = f.generateSecret(new PBEKeySpec(mdp.toCharArray(), selHex.getBytes(StandardCharsets.UTF_8), 120000, 256)).getEncoded();
            return hex(k);
        } catch (Exception e) {
            return ERR + e.getMessage();
        }
    }

    @JavascriptInterface
    public String aleatoire(int n) {
        byte[] b = new byte[Math.max(1, Math.min(n, 64))];
        alea.nextBytes(b);
        return hex(b);
    }

    @JavascriptInterface
    public String idAppareil() {
        String id = Settings.Secure.getString(act.getContentResolver(), Settings.Secure.ANDROID_ID);
        return id == null ? "inconnu" : id;
    }

    @JavascriptInterface
    public String version() { return BuildConfig.VERSION_NAME; }

    @JavascriptInterface
    public String miseAuPoint() { return BuildConfig.DEBUG ? "1" : "0"; }

    /** Licence d'essai automatique : version de mise au point seulement, et seulement si le fichier de test existe. */
    @JavascriptInterface
    public String testLicence() {
        return BuildConfig.DEBUG && new File(racine, "Config/test-licence").exists() ? "1" : "0";
    }

    @JavascriptInterface
    public String fichierDemarrage() {
        String f = fichierDemarrage;
        fichierDemarrage = null;
        return f == null ? "" : f;
    }

    // ================================================================== compression (classeurs Excel)
    @JavascriptInterface
    public String inflateRaw(String b64) {
        try {
            Inflater inf = new Inflater(true);
            inf.setInput(Base64.decode(b64, Base64.DEFAULT));
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] tampon = new byte[65536];
            while (!inf.finished()) {
                int n = inf.inflate(tampon);
                if (n == 0 && (inf.needsInput() || inf.needsDictionary())) break;
                o.write(tampon, 0, n);
            }
            inf.end();
            return Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return ERR + "Classeur illisible.";
        }
    }

    @JavascriptInterface
    public String deflateRaw(String b64) {
        Deflater d = new Deflater(Deflater.DEFAULT_COMPRESSION, true);
        d.setInput(Base64.decode(b64, Base64.DEFAULT));
        d.finish();
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] tampon = new byte[65536];
        while (!d.finished()) o.write(tampon, 0, d.deflate(tampon));
        d.end();
        return Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP);
    }

    // ================================================================== petites actions
    @JavascriptInterface
    public void copier(String t) {
        act.runOnUiThread(() -> {
            ClipboardManager cm = (ClipboardManager) act.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("AMEDIS pro Asso", t));
        });
    }

    @JavascriptInterface
    public void quitter() { act.runOnUiThread(act::finish); }

    @JavascriptInterface
    public void ouvrirLien(String url) {
        if (!url.startsWith("https://")) return;
        act.runOnUiThread(() -> {
            try { act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { avis("Aucune application pour ouvrir ce lien."); }
        });
    }

    @JavascriptInterface
    public void ouvrirTelechargements() {
        act.runOnUiThread(() -> {
            try { act.startActivity(new Intent(android.app.DownloadManager.ACTION_VIEW_DOWNLOADS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
            catch (Exception e) { avis("Les documents sont dans Téléchargements › AMEDIS pro Asso."); }
        });
    }

    @JavascriptInterface
    public void ouvrirUri(String u) {
        act.runOnUiThread(() -> {
            try {
                Uri uri = Uri.parse(u);
                Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, act.getContentResolver().getType(uri));
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                act.startActivity(Intent.createChooser(i, "Ouvrir avec"));
            } catch (Exception e) {
                avis("Aucune application pour ouvrir ce document.");
            }
        });
    }

    @JavascriptInterface
    public void partagerUri(String u, String mime) {
        act.runOnUiThread(() -> {
            try {
                Intent i = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, Uri.parse(u));
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                act.startActivity(Intent.createChooser(i, "Envoyer la copie (WhatsApp, Drive, courriel…)"));
            } catch (Exception e) {
                avis("Partage impossible.");
            }
        });
    }

    private void avis(String t) { Toast.makeText(act, t, Toast.LENGTH_LONG).show(); }

    // ================================================================== actions longues
    @JavascriptInterface
    public void lancer(final String id, final String methode, final String json) {
        final JSONObject a;
        try { a = new JSONObject(json); } catch (Exception e) { repondre(id, false, erreur("Demande illisible.")); return; }
        switch (methode) {
            case "http": fond.execute(() -> http(id, a)); break;
            case "deposer": fond.execute(() -> deposerAsync(id, a)); break;
            case "ecrireDossier": fond.execute(() -> ecrireDossier(id, a)); break;
            case "choisirFichier": choisir(id, REQ_FICHIER, a); break;
            case "choisirImage": choisir(id, REQ_IMAGE, a); break;
            case "choisirDossier": choisir(id, REQ_DOSSIER, a); break;
            case "pdf": act.runOnUiThread(() -> pdf(id, a)); break;
            case "imprimer": act.runOnUiThread(() -> imprimer(id, a)); break;
            default: repondre(id, false, erreur("Action inconnue : " + methode));
        }
    }

    void repondre(final String id, final boolean ok, final String json) {
        final String js = "window.__natifRetour(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(json == null ? "null" : json) + ")";
        web.post(() -> web.evaluateJavascript(js, null));
    }

    private static String erreur(String m) {
        try { return new JSONObject().put("erreur", m).toString(); } catch (Exception e) { return "{}"; }
    }

    // ---- Internet (site de l'association, Google Apps Script)
    private void http(String id, JSONObject a) {
        try {
            String adresse = a.getString("url");
            String corps = a.isNull("corps") ? null : a.optString("corps", null);
            HttpURLConnection c = null;
            int sauts = 0;
            byte[] donnees = corps == null ? null : corps.getBytes(StandardCharsets.UTF_8);
            while (true) {
                c = (HttpURLConnection) new URL(adresse).openConnection();
                c.setConnectTimeout(20000);
                c.setReadTimeout(90000);
                c.setInstanceFollowRedirects(false);
                if (donnees != null) {
                    c.setRequestMethod("POST");
                    c.setDoOutput(true);
                    c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
                    try (OutputStream o = c.getOutputStream()) { o.write(donnees); }
                }
                int code = c.getResponseCode();
                if ((code == 301 || code == 302 || code == 303 || code == 307 || code == 308) && sauts++ < 6) {
                    String loc = c.getHeaderField("Location");
                    c.disconnect();
                    adresse = new URL(new URL(adresse), loc).toString();
                    if (code != 307 && code != 308) donnees = null;   // Apps Script : la réponse se lit en GET sur l'adresse donnée
                    continue;
                }
                InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                String texte = in == null ? "" : new String(lire(in), StandardCharsets.UTF_8);
                c.disconnect();
                repondre(id, true, new JSONObject().put("statut", code).put("texte", texte).toString());
                return;
            }
        } catch (Exception e) {
            repondre(id, false, erreur("Pas de connexion Internet."));
        }
    }

    // ---- documents produits : Téléchargements › AMEDIS pro Asso › …
    private void deposerAsync(String id, JSONObject a) {
        try {
            byte[] b = Base64.decode(a.getString("base64"), Base64.DEFAULT);
            JSONObject r = deposer(a.getString("sousDossier"), a.getString("nom"), b, a.optString("mime", "application/octet-stream"));
            if (a.optBoolean("ouvrir")) ouvrirUri(r.getString("uri"));
            repondre(id, true, r.toString());
        } catch (Exception e) {
            repondre(id, false, erreur("Enregistrement dans Téléchargements impossible."));
        }
    }

    JSONObject deposer(String sousDossier, String nom, byte[] contenu, String mime) throws Exception {
        String sous = sousDossier.replaceAll("[\\\\:*?\"<>|]+", "_").replaceAll("\\.\\.", "_");
        String n = nom.replaceAll("[\\\\/:*?\"<>|]+", "_");
        Uri uri;
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, n);
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/AMEDIS pro Asso/" + sous);
            ContentResolver cr = act.getContentResolver();
            uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new Exception("insertion");
            try (OutputStream o = cr.openOutputStream(uri)) { o.write(contenu); }
        } else {
            File d = new File(act.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "AMEDIS pro Asso/" + sous);
            d.mkdirs();
            File f = new File(d, n);
            try (FileOutputStream o = new FileOutputStream(f)) { o.write(contenu); }
            uri = FileProvider.getUriForFile(act, act.getPackageName() + ".fichiers", f);
        }
        return new JSONObject().put("uri", uri.toString()).put("affiche", "Téléchargements/AMEDIS pro Asso/" + sous + "/" + n);
    }

    // ---- copie de secours dans un dossier choisi (carte SD, clé USB, dossier partagé)
    private void ecrireDossier(String id, JSONObject a) {
        try {
            Uri arbre = Uri.parse(a.getString("arbre"));
            byte[] b = Base64.decode(a.getString("base64"), Base64.DEFAULT);
            JSONArray chemins = a.getJSONArray("chemins");
            String affiche = "";
            for (int k = 0; k < chemins.length(); k++) {
                JSONArray c = chemins.getJSONArray(k);
                Uri parent = DocumentsContract.buildDocumentUriUsingTree(arbre, DocumentsContract.getTreeDocumentId(arbre));
                for (int i = 0; i < c.length() - 1; i++) parent = enfant(arbre, parent, c.getString(i), true);
                String nom = c.getString(c.length() - 1);
                Uri f = enfant(arbre, parent, nom, false);
                if (f == null) f = DocumentsContract.createDocument(act.getContentResolver(), parent, "application/octet-stream", nom);
                try (OutputStream o = act.getContentResolver().openOutputStream(f, "wt")) { o.write(b); }
                if (k == 0) affiche = nom;
            }
            repondre(id, true, new JSONObject().put("affiche", affiche).toString());
        } catch (Exception e) {
            repondre(id, false, erreur("Dossier de secours inaccessible : choisissez-le à nouveau."));
        }
    }

    private Uri enfant(Uri arbre, Uri parent, String nom, boolean dossier) throws Exception {
        ContentResolver cr = act.getContentResolver();
        Uri enfants = DocumentsContract.buildChildDocumentsUriUsingTree(arbre, DocumentsContract.getDocumentId(parent));
        try (Cursor c = cr.query(enfants, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null)) {
            while (c != null && c.moveToNext()) {
                if (nom.equals(c.getString(1))) return DocumentsContract.buildDocumentUriUsingTree(arbre, c.getString(0));
            }
        }
        if (!dossier) return null;
        return DocumentsContract.createDocument(cr, parent, DocumentsContract.Document.MIME_TYPE_DIR, nom);
    }

    // ---- choix d'un fichier, d'une image ou d'un dossier
    private void choisir(final String id, final int req, final JSONObject a) {
        act.runOnUiThread(() -> {
            Intent i;
            if (req == REQ_DOSSIER) {
                i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            } else if (req == REQ_IMAGE) {
                i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*");
            } else {
                i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                JSONArray m = a.optJSONArray("mimes");
                if (m != null && m.length() > 0) {
                    String[] mimes = new String[m.length()];
                    for (int k = 0; k < m.length(); k++) mimes[k] = m.optString(k);
                    i.putExtra(Intent.EXTRA_MIME_TYPES, mimes);
                }
            }
            enAttente.put(req, id);
            try {
                act.startActivityForResult(i, req);
            } catch (Exception e) {
                enAttente.remove(req);
                repondre(id, false, erreur("Aucun gestionnaire de fichiers sur ce téléphone."));
            }
        });
    }

    void resultat(int req, int code, Intent data) {
        final String id = enAttente.remove(req);
        if (id == null) return;
        if (code != Activity.RESULT_OK || data == null || data.getData() == null) { repondre(id, true, null); return; }
        final Uri uri = data.getData();
        if (req == REQ_DOSSIER) {
            try {
                act.getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception ignore) { /* permission temporaire seulement */ }
            repondre(id, true, JSONObject.quote(uri.toString()));
            return;
        }
        fond.execute(() -> {
            try {
                String nom = nomDe(uri);
                if (req == REQ_IMAGE) {
                    repondre(id, true, new JSONObject().put("nom", nom).put("dataUrl", imageReduite(uri)).toString());
                } else {
                    byte[] b = lire(act.getContentResolver().openInputStream(uri));
                    if (b.length > 40 * 1024 * 1024) throw new Exception("trop gros");
                    repondre(id, true, new JSONObject().put("nom", nom).put("base64", Base64.encodeToString(b, Base64.NO_WRAP)).toString());
                }
            } catch (Exception e) {
                repondre(id, false, erreur("Fichier illisible."));
            }
        });
    }

    private String nomDe(Uri uri) {
        try (Cursor c = act.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignore) { /* nom inconnu */ }
        String s = uri.getLastPathSegment();
        return s == null ? "fichier" : s;
    }

    /** Photos et logos : réduits à 900 px au plus (fichiers d'exercice légers). */
    private String imageReduite(Uri uri) throws Exception {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        try (InputStream in = act.getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(in, null, o); }
        int ech = 1;
        while (Math.max(o.outWidth, o.outHeight) / ech > 1800) ech *= 2;
        o = new BitmapFactory.Options();
        o.inSampleSize = ech;
        Bitmap b;
        try (InputStream in = act.getContentResolver().openInputStream(uri)) { b = BitmapFactory.decodeStream(in, null, o); }
        if (b == null) throw new Exception("image");
        int max = Math.max(b.getWidth(), b.getHeight());
        if (max > 900) b = Bitmap.createScaledBitmap(b, b.getWidth() * 900 / max, b.getHeight() * 900 / max, true);
        ByteArrayOutputStream s = new ByteArrayOutputStream();
        boolean png = String.valueOf(act.getContentResolver().getType(uri)).contains("png");
        b.compress(png ? Bitmap.CompressFormat.PNG : Bitmap.CompressFormat.JPEG, 86, s);
        return "data:image/" + (png ? "png" : "jpeg") + ";base64," + Base64.encodeToString(s.toByteArray(), Base64.NO_WRAP);
    }

    // ---- PDF (reçus, listes, bilan, cartes) et impression
    private WebView pageHorsEcran(String html, final Runnable prete) {
        final WebView w = new WebView(act);
        w.getSettings().setJavaScriptEnabled(false);
        w.setWebViewClient(new WebViewClient() {
            private boolean fait;

            @Override
            public void onPageFinished(WebView v, String url) {
                if (fait) return;
                fait = true;
                v.postDelayed(prete, 350);   // laisser les images se décoder
            }
        });
        w.loadDataWithBaseURL(HOTE, html, "text/html", "utf-8", null);
        return w;
    }

    private static PrintAttributes attributs(boolean paysage) {
        return new PrintAttributes.Builder()
                .setMediaSize(paysage ? PrintAttributes.MediaSize.ISO_A4.asLandscape() : PrintAttributes.MediaSize.ISO_A4.asPortrait())
                .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                .build();
    }

    private void pdf(final String id, final JSONObject a) {
        try {
            final String nom = a.getString("nom");
            final boolean paysage = a.optBoolean("paysage");
            final WebView[] w = new WebView[1];
            w[0] = pageHorsEcran(a.getString("html"), () -> {
                PrintDocumentAdapter ad = w[0].createPrintDocumentAdapter(nom);
                File tmp = new File(act.getCacheDir(), "pdf/" + System.currentTimeMillis() + ".pdf");
                PdfImprimeur.ecrire(ad, attributs(paysage), tmp, (f, err) -> {
                    w[0].destroy();
                    if (f == null) { repondre(id, false, erreur(err)); return; }
                    fond.execute(() -> {
                        try {
                            JSONObject r = deposer(a.optString("sousDossier", "Documents PDF"), nom, lire(new FileInputStream(f)), "application/pdf");
                            f.delete();
                            if (a.optBoolean("ouvrir", true)) ouvrirUri(r.getString("uri"));
                            repondre(id, true, r.toString());
                        } catch (Exception e) {
                            repondre(id, false, erreur("PDF créé mais impossible à ranger dans Téléchargements."));
                        }
                    });
                });
            });
        } catch (Exception e) {
            repondre(id, false, erreur("PDF impossible."));
        }
    }

    private void imprimer(final String id, final JSONObject a) {
        try {
            final boolean paysage = a.optBoolean("paysage");
            final WebView[] w = new WebView[1];
            w[0] = pageHorsEcran(a.getString("html"), () -> {
                PrintManager pm = (PrintManager) act.getSystemService(Context.PRINT_SERVICE);
                pm.print("AMEDIS pro Asso", w[0].createPrintDocumentAdapter("AMEDIS pro Asso"), attributs(paysage));
                repondre(id, true, "{\"ok\":true}");
            });
            act.garder(w[0]);
        } catch (Exception e) {
            repondre(id, false, erreur("Impression impossible."));
        }
    }

    // ================================================================== fichier .amasso reçu (WhatsApp, courriel, gestionnaire de fichiers)
    String importer(Uri uri) {
        try {
            String nom = nomDe(uri).replaceAll("[\\\\/:*?\"<>|]+", " ").trim();
            if (!nom.toLowerCase().endsWith(".amasso")) nom = nom.replaceAll("\\.[^.]*$", "") + ".amasso";
            byte[] b = lire(act.getContentResolver().openInputStream(uri));
            String texte = new String(b, StandardCharsets.UTF_8);
            if (!texte.contains("\"AMEDISPROASSO\"")) { avis("Ce fichier n'est pas un exercice AMEDIS pro Asso."); return null; }
            String base = nom.substring(0, nom.length() - 7);
            File f = new File(racine, "Exercices/" + nom);
            for (int i = 2; f.exists(); i++) f = new File(racine, "Exercices/" + base + " (" + i + ").amasso");
            try (FileOutputStream o = new FileOutputStream(f)) { o.write(b); }
            return "Exercices/" + f.getName();
        } catch (Exception e) {
            avis("Fichier reçu illisible.");
            return null;
        }
    }

    // ================================================================== outils
    static byte[] lire(InputStream in) throws Exception {
        try (InputStream i = in) {
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] t = new byte[65536];
            int n;
            while ((n = i.read(t)) > 0) o.write(t, 0, n);
            return o.toByteArray();
        }
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x & 255));
        return s.toString();
    }
}
