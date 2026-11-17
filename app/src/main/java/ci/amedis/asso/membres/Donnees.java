package ci.amedis.asso.membres;

import android.content.SharedPreferences;
import android.net.Uri;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Liens enregistrés, appels au site de l'association (lecture seule) et copie hors connexion.
 * Rien n'est jamais envoyé au site en dehors du lien ou de l'identifiant et du code du membre.
 */
final class Donnees {
    static final Pattern LIEN = Pattern.compile(
            "https://script\\.google\\.com/macros/s/[A-Za-z0-9_-]+/exec[^\\s\"'<>]*");

    /** Le site répond en HTML : il est encore en version 1.6.x (sans l'accès pour l'appli). */
    static final class SiteAncien extends IOException {
        SiteAncien() { super("site ancien"); }
    }

    private final SharedPreferences p;

    Donnees(SharedPreferences p) { this.p = p; }

    // ------------------------------------------------------------------ liens enregistrés
    String base() { return p.getString("base", null); }
    String jetonPerso() { return p.getString("jPerso", null); }
    String jetonCarte() { return p.getString("jCarte", null); }
    String ident() { return p.getString("ident", null); }
    String code() { return p.getString("code", null); }
    boolean connu() { return base() != null && (jetonPerso() != null || jetonCarte() != null || ident() != null); }

    /** Résultat de la lecture d'un lien : 'perso', 'carte', 'groupe' (espace des membres) ou null. */
    String enregistrerLien(String texte) {
        Matcher m = LIEN.matcher(texte == null ? "" : texte);
        if (!m.find()) return null;
        String lien = m.group();
        Uri u = Uri.parse(lien);
        String base = lien.substring(0, lien.indexOf("/exec") + 5);
        String v = u.getQueryParameter("v"), t = u.getQueryParameter("t");
        String ancienne = base();
        SharedPreferences.Editor ed = p.edit();
        if (ancienne != null && !ancienne.equals(base)) {
            // autre association : on repart de zéro
            ed.remove("jPerso").remove("jCarte").remove("ident").remove("code").remove("cache").remove("cacheAsso").remove("nbRecus");
        }
        ed.putString("base", base);
        String quoi = "groupe";
        if ("perso".equals(v) && t != null && t.length() >= 16) { ed.putString("jPerso", t); quoi = "perso"; }
        else if ("carte".equals(v) && t != null && t.length() >= 16) { ed.putString("jCarte", t); quoi = "carte"; }
        ed.apply();
        return quoi;
    }

    void enregistrerConnexion(String ident, String code) {
        p.edit().putString("ident", ident).putString("code", code).apply();
    }

    void enregistrerJetonCarte(String jc) {
        if (jc != null && jc.length() >= 16 && !jc.equals(jetonCarte())) p.edit().putString("jCarte", jc).apply();
    }

    void toutEffacer() {
        p.edit().remove("base").remove("jPerso").remove("jCarte").remove("ident").remove("code")
                .remove("cache").remove("cacheAsso").remove("cacheLe").remove("nbRecus").remove("pin").apply();
    }

    // ------------------------------------------------------------------ lecture sur le site
    /** Données principales du membre : dossier personnel, sinon espace des membres, sinon carte. */
    JSONObject lireMembre() throws Exception {
        if (jetonPerso() != null) return appel(corps("perso", null, null, jetonPerso()));
        if (ident() != null) return appel(corps("asso", ident(), code(), null));
        if (jetonCarte() != null) return appel(corps("carte", null, null, jetonCarte()));
        throw new IOException("aucun lien");
    }

    /** Données de l'association (tableau de bord, bilan) : seulement avec l'identifiant et le code. */
    JSONObject lireAsso() throws Exception {
        if (ident() == null) return null;
        return appel(corps("asso", ident(), code(), null));
    }

    JSONObject essayerConnexion(String ident, String code) throws Exception {
        return appel(corps("asso", ident, code, null));
    }

    private static String corps(String mode, String ident, String code, String jeton) throws Exception {
        JSONObject o = new JSONObject();
        o.put("action", "app");
        o.put("mode", mode);
        if (ident != null) o.put("ident", ident);
        if (code != null) o.put("code", code);
        if (jeton != null) o.put("jeton", jeton);
        return o.toString();
    }

    /** POST vers /exec ; Google répond par une redirection vers le résultat, suivie à la main. */
    JSONObject appel(String corps) throws Exception {
        String base = base();
        if (base == null) throw new IOException("aucun site");
        HttpURLConnection c = (HttpURLConnection) new URL(base).openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestMethod("POST");
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "text/plain; charset=utf-8");
        try (OutputStream o = c.getOutputStream()) {
            o.write(corps.getBytes(StandardCharsets.UTF_8));
        }
        int code = c.getResponseCode();
        String texte;
        if (code >= 300 && code < 400) {
            String vers = c.getHeaderField("Location");
            c.disconnect();
            if (vers == null) throw new IOException("redirection sans adresse");
            HttpURLConnection g = (HttpURLConnection) new URL(vers).openConnection();
            g.setConnectTimeout(15000);
            g.setReadTimeout(30000);
            texte = lire(g.getInputStream());
            g.disconnect();
        } else {
            texte = lire(code >= 400 ? c.getErrorStream() : c.getInputStream());
            c.disconnect();
        }
        String t = texte.trim();
        if (!t.startsWith("{")) throw new SiteAncien();
        JSONObject r = new JSONObject(t);
        if (!r.has("ok")) throw new SiteAncien();
        return r;
    }

    private static String lire(InputStream in) throws IOException {
        if (in == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            char[] tampon = new char[8192];
            int n;
            while ((n = br.read(tampon)) > 0) sb.append(tampon, 0, n);
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------ copie hors connexion
    void memoriser(JSONObject membre, JSONObject asso) {
        SharedPreferences.Editor ed = p.edit().putString("cache", membre.toString()).putLong("cacheLe", System.currentTimeMillis());
        if (asso != null) ed.putString("cacheAsso", asso.toString());
        ed.apply();
    }

    JSONObject membreMemorise() { return json(p.getString("cache", null)); }
    JSONObject assoMemorisee() { return json(p.getString("cacheAsso", null)); }
    long memoriseLe() { return p.getLong("cacheLe", 0); }

    private static JSONObject json(String s) {
        try { return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    // ------------------------------------------------------------------ code de verrouillage
    boolean aUnCode() { return p.getString("pin", null) != null; }
    void definirCode(String pin) { p.edit().putString("pin", empreinte(pin)).apply(); }
    void retirerCode() { p.edit().remove("pin").apply(); }
    boolean codeJuste(String pin) { return empreinte(pin).equals(p.getString("pin", "")); }

    private static String empreinte(String s) {
        try {
            byte[] b = MessageDigest.getInstance("SHA-256").digest(("amedis-asso|" + s).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte x : b) sb.append(String.format("%02x", x));
            return sb.toString();
        } catch (Exception e) {
            return s;
        }
    }
}
