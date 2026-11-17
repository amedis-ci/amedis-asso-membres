package ci.amedis.asso.membres;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.UUID;

/**
 * Messagerie du bureau et opérations du trésorier (site 1.9.0, fichier Bureau.gs).
 * - Messagerie : le Président, le SG et le Trésorier écrivent (texte ou vocal) à des membres ou à toute
 *   l'association ; les membres répondent seulement au membre du bureau qui leur a écrit.
 * - Opérations : le trésorier (code d'opérations en plus) envoie encaissements, dépenses, dons, membres,
 *   réunions, solidarité ; le logiciel du PC les applique puis publie. Sans réseau, elles attendent ici.
 * Le site contrôle toutes les règles : l'appli ne fait que les présenter.
 */
final class Bureau {

    static final class Refus extends Exception {
        final boolean codeRefuse;
        Refus(String m, boolean codeRefuse) { super(m); this.codeRefuse = codeRefuse; }
    }

    private final Donnees donnees;
    private final SharedPreferences p;

    Bureau(Donnees donnees, SharedPreferences p) {
        this.donnees = donnees;
        this.p = p;
    }

    boolean possible() {
        return donnees.base() != null && (donnees.jetonPerso() != null || donnees.ident() != null);
    }

    static String nouvelId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 24);
    }

    // ------------------------------------------------------------------ messagerie
    JSONObject boite() throws Exception {
        JSONObject r = appel("message", "boite", null);
        if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Messagerie indisponible."), false);
        p.edit().putString("cacheMsg", r.toString()).apply();
        return r;
    }

    JSONObject boiteMemorisee() { return json(p.getString("cacheMsg", null)); }

    /** Message écrit gardé hors connexion s'il n'y a pas de réseau ; un message vocal demande Internet. */
    boolean envoyerMessage(JSONObject m) throws Exception {
        JSONObject x = new JSONObject();
        x.put("message", m);
        try {
            JSONObject r = appel("message", "envoyer", x);
            if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Message refusé."), false);
            return true;
        } catch (Refus | Donnees.SiteAncien e) {
            throw e;
        } catch (IOException e) {
            if (m.has("audio")) throw e;
            ajouter("fileMsg", m);
            return false;
        }
    }

    String audio(String id) throws Exception {
        JSONObject x = new JSONObject();
        x.put("id", id);
        JSONObject r = appel("message", "audio", x);
        if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Message vocal indisponible."), false);
        return r.optString("audio", "");
    }

    // ------------------------------------------------------------------ opérations du trésorier
    String codeOps() { return p.getString("codeOps", null); }
    void definirCodeOps(String c) { p.edit().putString("codeOps", c).apply(); }
    void oublierCodeOps() { p.edit().remove("codeOps").remove("cacheCtx").apply(); }

    JSONObject contexte() throws Exception {
        JSONObject r = appel("operation", "contexte", null);
        if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Accès refusé."), r.optBoolean("codeRefuse"));
        p.edit().putString("cacheCtx", r.toString()).apply();
        return r;
    }

    JSONObject contexteMemorise() { return json(p.getString("cacheCtx", null)); }

    /** true : reçue par le site ; false : gardée sur le téléphone (pas de réseau), envoyée plus tard. */
    boolean envoyerOperation(JSONObject o) throws Exception {
        JSONObject x = new JSONObject();
        x.put("operation", o);
        try {
            JSONObject r = appel("operation", "envoyer", x);
            if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Opération refusée."), r.optBoolean("codeRefuse"));
            return true;
        } catch (Refus | Donnees.SiteAncien e) {
            throw e;
        } catch (IOException e) {
            ajouter("fileOps", o);
            return false;
        }
    }

    JSONArray fileOps() { return tableau(p.getString("fileOps", "[]")); }
    JSONArray fileMsg() { return tableau(p.getString("fileMsg", "[]")); }

    /** Renvoie ce qui attendait (messages écrits, opérations) ; retourne le nombre envoyé. */
    int viderFiles(StringBuilder refus) {
        int n = 0;
        for (String cle : new String[]{"fileMsg", "fileOps"}) {
            JSONArray f = tableau(p.getString(cle, "[]")), reste = new JSONArray();
            for (int i = 0; i < f.length(); i++) {
                JSONObject d = f.optJSONObject(i);
                if (d == null) continue;
                try {
                    JSONObject x = new JSONObject();
                    x.put(cle.equals("fileMsg") ? "message" : "operation", d);
                    JSONObject r = appel(cle.equals("fileMsg") ? "message" : "operation", "envoyer", x);
                    if (r.optBoolean("ok")) n++;
                    else if (refus != null) refus.append("• ").append(r.optString("erreur", "Envoi refusé.")).append('\n');
                } catch (Exception e) {
                    reste.put(d);
                }
            }
            p.edit().putString(cle, reste.toString()).apply();
        }
        return n;
    }

    void oublier() {
        p.edit().remove("cacheMsg").remove("cacheCtx").remove("fileMsg").remove("fileOps").remove("codeOps").remove("msgVus").apply();
    }

    // ------------------------------------------------------------------ outils
    private void ajouter(String cle, JSONObject o) {
        JSONArray f = tableau(p.getString(cle, "[]"));
        f.put(o);
        p.edit().putString(cle, f.toString()).apply();
    }

    private static JSONArray tableau(String s) {
        try { return new JSONArray(s); } catch (Exception e) { return new JSONArray(); }
    }

    private static JSONObject json(String s) {
        try { return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    private JSONObject appel(String action, String op, JSONObject extra) throws Exception {
        JSONObject o = new JSONObject();
        o.put("action", action);
        o.put("op", op);
        if (donnees.jetonPerso() != null) {
            o.put("mode", "perso");
            o.put("jeton", donnees.jetonPerso());
        } else if (donnees.ident() != null) {
            o.put("mode", "asso");
            o.put("ident", donnees.ident());
            o.put("code", donnees.code());
        } else {
            throw new Refus("Ouvrez votre dossier personnel ou connectez-vous.", false);
        }
        if ("operation".equals(action)) o.put("codeOps", codeOps() == null ? "" : codeOps());
        if (extra != null) {
            JSONArray noms = extra.names();
            for (int i = 0; noms != null && i < noms.length(); i++) o.put(noms.getString(i), extra.get(noms.getString(i)));
        }
        JSONObject r = donnees.appel(o.toString());
        if (!r.has("versionBureau")) throw new Donnees.SiteAncien();   // site sans le module Bureau (1.9.0)
        return r;
    }
}
