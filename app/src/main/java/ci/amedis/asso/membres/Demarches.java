package ci.amedis.asso.membres;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.UUID;

/**
 * Démarches des membres (déclaration de paiement, coordonnées, événement, message au bureau).
 * Reprend le principe de la saisie hors connexion de l'appli PAI Secondaire : le réseau est tenté
 * d'abord ; en cas d'échec réseau seulement, la démarche est gardée sur le téléphone et renvoyée
 * plus tard. Chaque démarche porte un identifiant unique : la renvoyer deux fois ne crée pas de doublon.
 * Rien ici ne touche aux cotisations ni aux reçus : le trésorier reste seul maître de la caisse.
 */
final class Demarches {

    /** Refus du site (règle non respectée) : la démarche ne doit pas rester en file. */
    static final class Refus extends Exception {
        Refus(String m) { super(m); }
    }

    private final Donnees donnees;
    private final SharedPreferences p;

    Demarches(Donnees donnees, SharedPreferences p) {
        this.donnees = donnees;
        this.p = p;
    }

    /** La carte seule ne permet aucune démarche (règle du site). */
    boolean possible() {
        return donnees.base() != null && (donnees.jetonPerso() != null || donnees.ident() != null);
    }

    // ------------------------------------------------------------------ file d'attente
    JSONArray file() {
        try { return new JSONArray(p.getString("fileDem", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    private void ecrireFile(JSONArray f) {
        p.edit().putString("fileDem", f.toString()).apply();
    }

    /** Prépare une démarche avec son identifiant unique. */
    static JSONObject nouvelle(String type) {
        JSONObject d = new JSONObject();
        try {
            d.put("type", type);
            d.put("idAppli", UUID.randomUUID().toString().replace("-", "").substring(0, 24));
            d.put("creeeLe", System.currentTimeMillis());
        } catch (Exception ignore) { /* impossible */ }
        return d;
    }

    /**
     * Envoie la démarche. Retourne true si le site l'a enregistrée, false si elle a été mise en file
     * (pas de réseau). Lève Refus si le site la rejette (limite, montant…).
     */
    boolean envoyer(JSONObject d) throws Exception {
        try {
            JSONObject r = appel("envoyer", "demande", d);
            if (!r.optBoolean("ok")) throw new Refus(r.optString("erreur", "Démarche refusée."));
            return true;
        } catch (Refus | Donnees.SiteAncien e) {
            throw e;
        } catch (IOException e) {
            JSONArray f = file();
            f.put(d);
            ecrireFile(f);
            return false;
        }
    }

    /** Renvoie les démarches gardées hors connexion ; retourne le nombre envoyé, les refus en message. */
    int viderFile(StringBuilder refus) {
        JSONArray f = file(), reste = new JSONArray();
        int envoyees = 0;
        for (int i = 0; i < f.length(); i++) {
            JSONObject d = f.optJSONObject(i);
            if (d == null) continue;
            try {
                JSONObject r = appel("envoyer", "demande", d);
                if (r.optBoolean("ok")) envoyees++;
                else if (refus != null) refus.append("• ").append(r.optString("erreur", "Démarche refusée.")).append('\n');
            } catch (Exception e) {
                reste.put(d);
            }
        }
        ecrireFile(reste);
        return envoyees;
    }

    JSONObject liste() throws Exception {
        JSONObject r = appel("liste", null, null);
        if (r.optBoolean("ok")) p.edit().putString("cacheDem", r.toString()).apply();
        return r;
    }

    JSONObject listeMemorisee() {
        try { String s = p.getString("cacheDem", null); return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; }
    }

    JSONObject annuler(String id) throws Exception {
        return appel("annuler", "id", id);
    }

    /** Réservé au bureau : le site vérifie lui-même la fonction du membre connecté. */
    JSONObject statuer(String id, String statut, String reponse) throws Exception {
        JSONObject x = new JSONObject();
        x.put("id", id);
        x.put("statut", statut);
        x.put("reponse", reponse == null ? "" : reponse);
        return appel("statuer", null, x);
    }

    void oublier() {
        p.edit().remove("fileDem").remove("cacheDem").apply();
    }

    // ------------------------------------------------------------------ appel au site
    private JSONObject appel(String op, String cle, Object valeur) throws Exception {
        JSONObject o = new JSONObject();
        o.put("action", "demande");
        o.put("op", op);
        if (donnees.jetonPerso() != null) {
            o.put("mode", "perso");
            o.put("jeton", donnees.jetonPerso());
        } else if (donnees.ident() != null) {
            o.put("mode", "asso");
            o.put("ident", donnees.ident());
            o.put("code", donnees.code());
        } else {
            throw new Refus("Ouvrez votre dossier personnel ou connectez-vous pour faire une démarche.");
        }
        if (cle != null) o.put(cle, valeur);
        else if (valeur instanceof JSONObject) {
            JSONObject v = (JSONObject) valeur;
            JSONArray noms = v.names();
            for (int i = 0; noms != null && i < noms.length(); i++) o.put(noms.getString(i), v.get(noms.getString(i)));
        }
        JSONObject r = donnees.appel(o.toString());
        if (!r.has("versionDemandes")) throw new Donnees.SiteAncien();   // site sans le module Demandes
        return r;
    }
}
