package ci.amedis.asso.membres;

import android.app.Activity;
import android.Manifest;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.content.pm.PackageManager;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Build;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Base64;
import android.widget.CheckBox;
import android.widget.ListView;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.AlphaAnimation;
import android.view.animation.TranslateAnimation;
import android.view.animation.AnimationSet;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ArrayAdapter;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AMEDIS Asso – appli des membres. Écrans natifs alimentés par le site de l'association, menu latéral, messagerie du bureau (écrite et vocale),
 * gestion du trésorier (opérations appliquées par le logiciel du PC),
 * avec copie hors connexion, carte de membre numérique, numéros d'urgence et verrouillage par code.
 * Conception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.
 */
public class MainActivity extends Activity {

    private static final int T_ACCUEIL = 0, T_RECUS = 1, T_DEMARCHES = 2, T_CARTE = 3, T_ASSO = 4, T_MESSAGES = 5,
            T_G_ENC = 6, T_G_DEP = 7, T_G_MEM = 8, T_G_REU = 9, T_G_SOL = 10, T_G_OPS = 11;
    private static final String[] NOMS_MENU = {"Tableau de bord", "Mes reçus", "Mes démarches", "Ma carte", "Réglages et aide", "Messagerie",
            "Encaisser", "Dépenses et dons", "Membres", "Réunions et appel", "Solidarité", "Opérations envoyées"};
    private static final int[] ICONES_PAGES = {Icone.TABLEAU, Icone.RECU, Icone.MESSAGE, Icone.CARTE, Icone.REGLAGES, Icone.ENVELOPPE,
            Icone.PIECES, Icone.LISTE, Icone.GROUPE, Icone.CALENDRIER, Icone.COEUR, Icone.ACTUALISER};
    private static final long UN_JOUR = 24L * 3600 * 1000, VERROU_APRES = 60 * 1000;

    private Donnees donnees;
    private Demarches demarches;
    private JSONObject DEM;            // démarches : les miennes, et celles du bureau si j'en fais partie
    private View pastilleDem;
    private final ExecutorService fond = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    private FrameLayout racine, contenu;
    private ProgressBar chargementVue;
    private FrameLayout tiroir;
    private LinearLayout panneau;
    private TextView titreBarre;
    private View pointMenu, pastilleMsg;
    private Bureau bureau;
    private JSONObject MSG, CTX;       // messagerie ; contexte des opérations du trésorier
    private View pastilleRecus, bienvenue, verrou, site;
    private WebView web;
    private SwipeRefreshLayout tirer;

    private int onglet = T_ACCUEIL;
    private JSONObject M, AS;          // données du membre, données de l'association
    private boolean horsLigne, chargement, verrouille;
    private String erreur;
    private long sortieLe;

    // ================================================================== cycle de vie
    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        Ui.init(this);
        getWindow().setStatusBarColor(Ui.VERT_FONCE);
        getWindow().setNavigationBarColor(Ui.CARTE);
        donnees = new Donnees(getSharedPreferences("amedis", MODE_PRIVATE));
        demarches = new Demarches(donnees, getSharedPreferences("amedis", MODE_PRIVATE));
        DEM = demarches.listeMemorisee();
        bureau = new Bureau(donnees, getSharedPreferences("amedis", MODE_PRIVATE));
        MSG = bureau.boiteMemorisee();
        CTX = bureau.contexteMemorise();

        racine = new FrameLayout(this);
        racine.setBackgroundColor(Ui.FOND);
        setContentView(racine);
        construireAppli();

        if (!traiterIntent(getIntent())) {
            if (donnees.connu()) {
                M = donnees.membreMemorise();
                AS = donnees.assoMemorisee();
                afficher();
                rafraichir(false);
            } else {
                montrerBienvenue();
            }
        }
        if (donnees.aUnCode() && donnees.connu()) verrouiller();
        long derniere = getSharedPreferences("amedis", MODE_PRIVATE).getLong("majLe", 0);
        if (System.currentTimeMillis() - derniere > UN_JOUR) verifierMaj(false);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        traiterIntent(intent);
    }

    @Override
    protected void onPause() {
        super.onPause();
        sortieLe = System.currentTimeMillis();
        arreterLecture();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (sortieLe > 0 && !verrouille && donnees.aUnCode() && donnees.connu()
                && System.currentTimeMillis() - sortieLe > VERROU_APRES) verrouiller();
        luminosite();
    }

    @Override
    public void onBackPressed() {
        if (site != null) {
            if (web != null && web.canGoBack()) web.goBack();
            else fermerSite();
        } else if (verrouille) {
            moveTaskToBack(true);
        } else if (tiroirOuvert()) {
            fermerTiroir();
        } else if (bienvenue == null && onglet == T_G_REU && reuSaisie != null) {
            reuSaisie = null;
            presences.clear();
            afficher();
        } else if (bienvenue == null && onglet != T_ACCUEIL) {
            choisir(T_ACCUEIL);
        } else {
            super.onBackPressed();
        }
    }

    /** Lien partagé depuis WhatsApp (Partager > AMEDIS Asso). */
    private boolean traiterIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
            String t = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (t != null) return recevoirLien(t);
        }
        return false;
    }

    // ================================================================== structure : barre du haut + contenu + menu latéral
    private void construireAppli() {
        LinearLayout col = Ui.colonne(this);
        LinearLayout barre = Ui.ligne(this);
        barre.setBackgroundColor(Ui.VERT_FONCE);
        barre.setPadding(Ui.dp(6), Ui.dp(6), Ui.dp(6), Ui.dp(6));
        FrameLayout bm = new FrameLayout(this);
        bm.setPadding(Ui.dp(10), Ui.dp(10), Ui.dp(10), Ui.dp(10));
        bm.addView(new Icone(this, Icone.MENU, Color.WHITE), new FrameLayout.LayoutParams(Ui.dp(26), Ui.dp(26)));
        pointMenu = point();
        bm.addView(pointMenu, new FrameLayout.LayoutParams(Ui.dp(10), Ui.dp(10), Gravity.END | Gravity.TOP));
        bm.setOnClickListener(v -> ouvrirTiroir());
        bm.setContentDescription("Menu");
        barre.addView(bm);
        titreBarre = Ui.texte(this, "Tableau de bord", 18, Color.WHITE, true);
        titreBarre.setMaxLines(1);
        titreBarre.setEllipsize(android.text.TextUtils.TruncateAt.END);
        titreBarre.setPadding(Ui.dp(8), 0, Ui.dp(8), 0);
        barre.addView(titreBarre, Ui.poids(1));
        FrameLayout ba = new FrameLayout(this);
        ba.setPadding(Ui.dp(10), Ui.dp(10), Ui.dp(10), Ui.dp(10));
        ba.addView(new Icone(this, Icone.ACTUALISER, Color.WHITE), new FrameLayout.LayoutParams(Ui.dp(24), Ui.dp(24)));
        ba.setOnClickListener(v -> rafraichir(true));
        ba.setContentDescription("Actualiser");
        barre.addView(ba);
        col.addView(barre);
        contenu = new FrameLayout(this);
        col.addView(contenu, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        racine.addView(col, plein());

        pastilleRecus = point();
        pastilleDem = point();
        pastilleMsg = point();

        chargementVue = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        chargementVue.setIndeterminate(true);
        chargementVue.setVisibility(View.GONE);
        racine.addView(chargementVue, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, Ui.dp(4), Gravity.TOP));
        construireTiroir();
        majBarre();
    }

    private void choisir(int n) {
        if (n >= T_G_ENC && !estTresorier()) n = T_ACCUEIL;
        if (n == T_MESSAGES && !bureau.possible() && bienvenue == null) { /* la page explique l'accès */ }
        onglet = n;
        if (n == T_RECUS) marquerRecusVus();
        if (n == T_DEMARCHES) { pastilleDem.setVisibility(View.GONE); signalerReponses(); synchroniserDemarches(); }
        if (n == T_MESSAGES) { marquerMessagesVus(); synchroniserMessages(); }
        if (n >= T_G_ENC) chargerContexte(true);
        majBarre();
        afficher();
        luminosite();
    }

    private void majBarre() {
        if (titreBarre == null) return;
        titreBarre.setText(onglet == T_ACCUEIL ? "Tableau de bord" : NOMS_MENU[onglet]);
        boolean p = pastilleRecus.getVisibility() == View.VISIBLE || pastilleDem.getVisibility() == View.VISIBLE
                || pastilleMsg.getVisibility() == View.VISIBLE;
        pointMenu.setVisibility(p ? View.VISIBLE : View.GONE);
        if (tiroirOuvert()) remplirTiroir();
    }

    /** La carte de membre s'affiche à pleine luminosité, pour que son code QR se lise bien. */
    private void luminosite() {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = onglet == T_CARTE && bienvenue == null && site == null ? 1f : -1f;
        getWindow().setAttributes(lp);
    }

    private void afficher() {
        majBarre();
        contenu.removeAllViews();
        LinearLayout page = Ui.colonne(this);
        page.setPadding(0, 0, 0, Ui.dp(24));
        switch (onglet) {
            case T_RECUS: pageRecus(page); break;
            case T_DEMARCHES: pageDemarches(page); break;
            case T_CARTE: pageCarte(page); break;
            case T_ASSO: pageAsso(page); break;
            case T_MESSAGES: pageMessages(page); break;
            case T_G_ENC: pageEncaisser(page); break;
            case T_G_DEP: pageDepenses(page); break;
            case T_G_MEM: pageMembres(page); break;
            case T_G_REU: pageReunions(page); break;
            case T_G_SOL: pageSolidarite(page); break;
            case T_G_OPS: pageOperations(page); break;
            default: pageAccueil(page); break;
        }
        ScrollView defil = new ScrollView(this);
        defil.setFillViewport(true);
        defil.addView(page);
        tirer = new SwipeRefreshLayout(this);
        tirer.setColorSchemeColors(Ui.VERT, Ui.OR);
        tirer.setProgressBackgroundColorSchemeColor(Ui.CARTE);
        tirer.setOnRefreshListener(() -> rafraichir(true));
        tirer.addView(defil);
        contenu.addView(tirer, plein());
        apparition(page);
    }

    private void apparition(View v) {
        AnimationSet a = new AnimationSet(true);
        a.addAnimation(new AlphaAnimation(0f, 1f));
        a.addAnimation(new TranslateAnimation(0, 0, Ui.dp(14), 0));
        a.setDuration(260);
        v.startAnimation(a);
    }

    // ================================================================== briques de page
    private LinearLayout marge(LinearLayout page) {
        LinearLayout l = Ui.colonne(this);
        l.setPadding(Ui.dp(16), 0, Ui.dp(16), 0);
        page.addView(l, Ui.large(0));
        return l;
    }

    private void titre(LinearLayout page, String titre, String sous) {
        LinearLayout l = Ui.colonne(this);
        l.setPadding(Ui.dp(20), Ui.dp(22), Ui.dp(20), Ui.dp(6));
        l.addView(Ui.texte(this, titre, 24, Ui.TEXTE, true));
        if (sous != null && !sous.isEmpty()) {
            TextView s = Ui.texte(this, sous, 13.5f, Ui.DOUX, false);
            s.setPadding(0, Ui.dp(2), 0, 0);
            l.addView(s);
        }
        page.addView(l);
    }

    private TextView section(LinearLayout parent, String t) {
        TextView v = Ui.etiquette(this, t);
        v.setPadding(Ui.dp(4), Ui.dp(22), 0, Ui.dp(8));
        parent.addView(v);
        return v;
    }

    /** Bandeau « hors connexion » ou message d'erreur du site. */
    private void bandeauEtat(LinearLayout parent) {
        if (!horsLigne && (erreur == null || erreur.isEmpty())) return;
        LinearLayout b = Ui.ligne(this);
        b.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
        b.setBackground(Ui.arrondi(horsLigne ? Ui.OR_PALE : Ui.ROUGE_PALE, Ui.dp(12)));
        b.addView(new Icone(this, horsLigne ? Icone.NUAGE : Icone.ALERTE, horsLigne ? Ui.ORANGE : Ui.ROUGE),
                new LinearLayout.LayoutParams(Ui.dp(22), Ui.dp(22)));
        b.addView(Ui.espace(this, Ui.dp(10)));
        long le = donnees.memoriseLe();
        String t = horsLigne
                ? "Hors connexion" + (le > 0 ? " : informations du " + Ui.moment(le) + "." : ".") + " Tirez vers le bas pour réessayer."
                : erreur;
        b.addView(Ui.texte(this, t, 13.5f, Ui.TEXTE, false), Ui.poids(1));
        LinearLayout.LayoutParams lp = Ui.large(Ui.dp(14));
        parent.addView(b, lp);
    }

    private View bouton(String t, boolean principal, View.OnClickListener action) {
        TextView b = Ui.texte(this, t, 15, principal ? Ui.VERT_FONCE : Ui.VERT_TEXTE, true);
        b.setGravity(Gravity.CENTER);
        b.setPadding(Ui.dp(16), Ui.dp(13), Ui.dp(16), Ui.dp(13));
        b.setBackground(principal ? Ui.arrondi(Ui.OR, Ui.dp(12)) : Ui.bordure(Color.TRANSPARENT, Ui.VERT_TEXTE, Ui.dp(12)));
        b.setOnClickListener(action);
        b.setClickable(true);
        return b;
    }

    private View rondIcone(int type, int fond, int trait, int taille) {
        FrameLayout f = new FrameLayout(this);
        f.setBackground(Ui.arrondi(fond, taille / 2));
        Icone i = new Icone(this, type, trait);
        int m = taille / 4;
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(taille - 2 * m, taille - 2 * m, Gravity.CENTER);
        f.addView(i, lp);
        f.setLayoutParams(new LinearLayout.LayoutParams(taille, taille));
        return f;
    }

    private boolean aFinances() {
        return M != null && M.optJSONObject("moi") != null && M.optJSONObject("moi").optJSONArray("c") != null;
    }

    private String monnaie() {
        JSONObject a = M == null ? null : M.optJSONObject("asso");
        return a == null ? "F CFA" : a.optString("monnaie", "F CFA");
    }

    /** Invitation à ouvrir le lien personnel ou à se connecter, quand seule la carte est connue. */
    private void inviterAccesComplet(LinearLayout parent, String pourquoi) {
        LinearLayout c = Ui.carte(this);
        LinearLayout l = Ui.ligne(this);
        l.addView(rondIcone(Icone.CADENAS, Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(44)));
        l.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.texte(this, "Accès à vos informations", 16, Ui.TEXTE, true));
        t.addView(Ui.texte(this, pourquoi, 13.5f, Ui.DOUX, false));
        l.addView(t, Ui.poids(1));
        c.addView(l);
        c.addView(bouton("Scanner le code QR de mon dossier", true, v -> scanner()), Ui.large(Ui.dp(14)));
        if (donnees.base() != null) c.addView(bouton("Me connecter avec mon identifiant", false, v -> connexion()), Ui.large(Ui.dp(10)));
        parent.addView(c, Ui.large(Ui.dp(14)));
    }

    // ================================================================== ACCUEIL
    private void pageAccueil(LinearLayout page) {
        JSONObject asso = M == null ? new JSONObject() : M.optJSONObject("asso");
        if (asso == null) asso = new JSONObject();
        JSONObject moi = M == null ? new JSONObject() : M.optJSONObject("moi");
        if (moi == null) moi = new JSONObject();

        // en-tête vert
        LinearLayout tete = Ui.colonne(this);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{Ui.VERT, Ui.VERT_FONCE});
        g.setCornerRadii(new float[]{0, 0, 0, 0, Ui.dp(28), Ui.dp(28), Ui.dp(28), Ui.dp(28)});
        tete.setBackground(g);
        tete.setPadding(Ui.dp(20), Ui.dp(20), Ui.dp(20), Ui.dp(64));
        LinearLayout haut = Ui.ligne(this);
        ImageView logo = new ImageView(this);
        Bitmap bl = Ui.image(asso.optString("logo", ""));
        logo.setImageBitmap(bl != null ? Ui.rond(bl, Ui.dp(44)) : Ui.initiales("A", Ui.dp(44)));
        haut.addView(logo, new LinearLayout.LayoutParams(Ui.dp(44), Ui.dp(44)));
        haut.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout nomAsso = Ui.colonne(this);
        nomAsso.addView(Ui.texte(this, asso.optString("nom", "Mon association"), 15, Color.WHITE, true));
        String ex = asso.has("exercice") ? "Exercice " + asso.optString("exercice") : "";
        String siege = asso.optString("siege", "");
        nomAsso.addView(Ui.texte(this, ex + (siege.isEmpty() ? "" : (ex.isEmpty() ? "" : " · ") + siege), 12.5f, 0xFFCFE7DA, false));
        haut.addView(nomAsso, Ui.poids(1));
        tete.addView(haut);
        String prenom = moi.optString("prenoms", "").trim().split("\\s+")[0];
        tete.addView(Ui.texte(this, salutation() + (prenom.isEmpty() ? "" : ", " + capitaliser(prenom)), 25, Color.WHITE, true), Ui.large(Ui.dp(22)));
        String detail = (moi.optString("i", "").isEmpty() ? "" : "Membre n° " + moi.optString("i"))
                + (moi.optString("fonction", "").isEmpty() ? "" : " · " + moi.optString("fonction"));
        if (!detail.isEmpty()) tete.addView(Ui.texte(this, detail, 13.5f, 0xFFCFE7DA, false), Ui.large(Ui.dp(2)));
        page.addView(tete);

        LinearLayout corps = marge(page);
        if (!aFinances()) {
            LinearLayout.LayoutParams lp = Ui.large(-Ui.dp(44));
            LinearLayout vide = Ui.colonne(this);
            corps.addView(vide, lp);
            bandeauEtat(corps);
            inviterAccesComplet(corps, "Votre carte de membre est enregistrée. Pour voir vos cotisations et vos reçus, "
                    + "scannez le code QR personnel de votre dossier (envoyé par le bureau) ou connectez-vous.");
            blocUrgence(corps, asso);
            return;
        }

        // carte « ma situation »
        JSONArray cots = M.optJSONArray("cotisations");
        JSONArray c = moi.optJSONArray("c");
        double attendu = 0, reste = 0, paye = 0;
        boolean toutOk = true;
        int concernees = 0;
        for (int i = 0; c != null && i < c.length(); i++) {
            JSONObject x = c.optJSONObject(i);
            if (x == null || x.optBoolean("nc")) continue;
            concernees++;
            attendu += x.optDouble("a", 0);
            reste += x.optDouble("r", 0);
            paye += x.optDouble("t", 0);
            if (!x.optBoolean("ok")) toutOk = false;
        }
        double part = attendu > 0 ? (attendu - reste) / attendu : (toutOk ? 1 : 0);

        LinearLayout sit = Ui.carte(this);
        sit.setElevation(Ui.dp(4));
        LinearLayout l = Ui.ligne(this);
        Anneau an = new Anneau(this, Ui.PISTE, toutOk ? Ui.VERT_TEXTE : Ui.OR, Ui.TEXTE);
        l.addView(an, new LinearLayout.LayoutParams(Ui.dp(104), Ui.dp(104)));
        an.valeur(part, "payé");
        l.addView(Ui.espace(this, Ui.dp(16)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.etiquette(this, "Ma situation"));
        if (toutOk) {
            LinearLayout ok = Ui.ligne(this);
            ok.addView(new Icone(this, Icone.OK, Ui.VERT_TEXTE), new LinearLayout.LayoutParams(Ui.dp(24), Ui.dp(24)));
            ok.addView(Ui.espace(this, Ui.dp(6)));
            ok.addView(Ui.texte(this, "À jour", 24, Ui.VERT_TEXTE, true));
            t.addView(ok, Ui.large(Ui.dp(4)));
            t.addView(Ui.texte(this, "Merci pour votre engagement !", 13.5f, Ui.DOUX, false));
        } else {
            t.addView(Ui.texte(this, "Reste à payer", 14, Ui.DOUX, false), Ui.large(Ui.dp(4)));
            t.addView(Ui.texte(this, Ui.argent(reste, monnaie()), 23, Ui.ROUGE, true));
        }
        t.addView(Ui.texte(this, "Versé : " + Ui.argent(paye, monnaie()), 12.5f, Ui.DOUX, false), Ui.large(Ui.dp(6)));
        l.addView(t, Ui.poids(1));
        sit.addView(l);
        corps.addView(sit, Ui.large(-Ui.dp(44)));

        bandeauEtat(corps);

        // cotisations
        section(corps, "Mes cotisations (" + concernees + ")");
        for (int i = 0; cots != null && c != null && i < cots.length() && i < c.length(); i++) {
            JSONObject k = cots.optJSONObject(i), x = c.optJSONObject(i);
            if (k == null || x == null || x.optBoolean("nc")) continue;
            corps.addView(carteCotisation(k, x), Ui.large(Ui.dp(10)));
        }

        // derniers reçus
        JSONArray rc = moi.optJSONArray("rc");
        if (rc != null && rc.length() > 0) {
            section(corps, "Dernier reçu");
            corps.addView(carteRecu(rc.optJSONObject(rc.length() - 1)), Ui.large(0));
            TextView tous = Ui.texte(this, "Voir tous mes reçus (" + rc.length() + ")  →", 14, Ui.VERT_TEXTE, true);
            tous.setPadding(Ui.dp(4), Ui.dp(12), 0, 0);
            tous.setOnClickListener(v -> choisir(T_RECUS));
            corps.addView(tous);
        }

        TextView dem = Ui.texte(this, "Déclarer un paiement ou écrire au bureau  →", 14, Ui.VERT_TEXTE, true);
        dem.setPadding(Ui.dp(4), Ui.dp(16), 0, 0);
        dem.setOnClickListener(v -> choisir(T_DEMARCHES));
        corps.addView(dem);

        blocTresorier(corps);
        blocChiffres(corps);
        blocUrgence(corps, asso);

        TextView pied = Ui.texte(this, "Informations publiées par le trésorier le " + Ui.moment(M.optString("publieLe", ""))
                + ". Vos montants changent après saisie par le trésorier.", 12, Ui.DOUX, false);
        pied.setGravity(Gravity.CENTER);
        pied.setPadding(Ui.dp(8), Ui.dp(24), Ui.dp(8), 0);
        corps.addView(pied);
    }

    private View carteCotisation(JSONObject k, JSONObject x) {
        int teinte = Ui.couleur(k.optString("couleur", ""), Ui.VERT);
        LinearLayout c = Ui.carte(this);
        LinearLayout l = Ui.ligne(this);
        View point = new View(this);
        point.setBackground(Ui.arrondi(teinte, Ui.dp(5)));
        l.addView(point, new LinearLayout.LayoutParams(Ui.dp(10), Ui.dp(10)));
        l.addView(Ui.espace(this, Ui.dp(10)));
        l.addView(Ui.texte(this, k.optString("nom"), 15.5f, Ui.TEXTE, true), Ui.poids(1));
        boolean ok = x.optBoolean("ok");
        l.addView(ok ? Ui.puce(this, "À jour", Ui.VERT_PALE, Ui.VERT_TEXTE)
                : Ui.puce(this, "Reste " + Ui.nombre(x.optDouble("r", 0)), Ui.ROUGE_PALE, Ui.ROUGE));
        c.addView(l);
        double a = x.optDouble("a", 0), t = x.optDouble("t", 0);
        c.addView(Ui.texte(this, "Versé " + Ui.argent(t, monnaie()) + (a > 0 ? " sur " + Ui.argent(a, monnaie()) : ""),
                13.5f, Ui.DOUX, false), Ui.large(Ui.dp(6)));
        c.addView(Ui.barre(this, a > 0 ? t / a : (ok ? 1 : 0), ok ? Ui.VERT_TEXTE : teinte));

        // détail par période, à déplier
        final LinearLayout grille = Ui.colonne(this);
        grille.setVisibility(View.GONE);
        JSONArray cols = k.optJSONArray("colonnes"), v = x.optJSONArray("v");
        LinearLayout rang = null;
        for (int j = 0; cols != null && j < cols.length(); j++) {
            if (j % 4 == 0) {
                rang = Ui.ligne(this);
                grille.addView(rang, Ui.large(Ui.dp(8)));
            }
            double m = v == null || v.isNull(j) ? 0 : v.optDouble(j, 0);
            LinearLayout cel = Ui.colonne(this);
            cel.setGravity(Gravity.CENTER_HORIZONTAL);
            cel.setPadding(Ui.dp(4), Ui.dp(7), Ui.dp(4), Ui.dp(7));
            cel.setBackground(Ui.arrondi(m > 0 ? Ui.VERT_PALE : Ui.PISTE, Ui.dp(10)));
            cel.addView(Ui.texte(this, abrege(cols.optString(j)), 11, Ui.DOUX, true));
            cel.addView(Ui.texte(this, m > 0 ? Ui.nombre(m) : "–", 13, m > 0 ? Ui.VERT_TEXTE : Ui.DOUX, true));
            LinearLayout.LayoutParams lp = Ui.poids(1);
            lp.setMargins(Ui.dp(3), 0, Ui.dp(3), 0);
            if (rang != null) rang.addView(cel, lp);
        }
        if (rang != null) {
            int manque = (4 - cols.length() % 4) % 4;
            for (int z = 0; z < manque; z++) rang.addView(new View(this), Ui.poids(1));
        }
        c.addView(grille);
        final TextView voir = Ui.texte(this, "Détail des versements  ▾", 13, Ui.VERT_TEXTE, true);
        voir.setPadding(0, Ui.dp(10), 0, 0);
        c.addView(voir);
        c.setOnClickListener(w -> {
            boolean ouvrir = grille.getVisibility() != View.VISIBLE;
            grille.setVisibility(ouvrir ? View.VISIBLE : View.GONE);
            voir.setText(ouvrir ? "Masquer le détail  ▴" : "Détail des versements  ▾");
        });
        return c;
    }

    // ================================================================== REÇUS
    private void pageRecus(LinearLayout page) {
        JSONArray rc = aFinances() ? M.optJSONObject("moi").optJSONArray("rc") : null;
        int n = rc == null ? 0 : rc.length();
        titre(page, "Mes reçus", n == 0 ? "" : n + " reçu" + (n > 1 ? "s" : "") + " pour l'exercice");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!aFinances()) {
            inviterAccesComplet(corps, "Vos reçus sont visibles avec le lien personnel de votre dossier ou votre identifiant.");
            return;
        }
        if (n == 0) {
            LinearLayout v = Ui.colonne(this);
            v.setGravity(Gravity.CENTER_HORIZONTAL);
            v.setPadding(Ui.dp(20), Ui.dp(50), Ui.dp(20), Ui.dp(20));
            v.addView(rondIcone(Icone.RECU, Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(72)));
            TextView t = Ui.texte(this, "Aucun reçu pour l'instant", 17, Ui.TEXTE, true);
            t.setPadding(0, Ui.dp(14), 0, Ui.dp(4));
            v.addView(t);
            TextView s = Ui.texte(this, "Chaque paiement enregistré par le trésorier apparaîtra ici.", 14, Ui.DOUX, false);
            s.setGravity(Gravity.CENTER);
            v.addView(s);
            corps.addView(v);
            return;
        }
        for (int i = n - 1; i >= 0; i--) corps.addView(carteRecu(rc.optJSONObject(i)), Ui.large(Ui.dp(10)));
    }

    private View carteRecu(JSONObject r) {
        LinearLayout c = Ui.carte(this);
        if (r == null) return c;
        boolean annule = r.optInt("x", 0) == 1;
        LinearLayout l = Ui.ligne(this);
        l.addView(rondIcone(Icone.RECU, annule ? Ui.ROUGE_PALE : Ui.VERT_PALE, annule ? Ui.ROUGE : Ui.VERT_TEXTE, Ui.dp(42)));
        l.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.texte(this, "Reçu n° " + r.optString("n"), 15.5f, Ui.TEXTE, true));
        String mode = r.optString("m", "");
        t.addView(Ui.texte(this, Ui.date(r.optString("d")) + (mode.isEmpty() ? "" : " · " + mode), 13, Ui.DOUX, false));
        l.addView(t, Ui.poids(1));
        TextView mt = Ui.texte(this, Ui.argent(r.optDouble("t", 0), monnaie()), 15.5f, annule ? Ui.DOUX : Ui.VERT_TEXTE, true);
        if (annule) mt.setPaintFlags(mt.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
        l.addView(mt);
        c.addView(l);
        JSONArray lignes = r.optJSONArray("l");
        if (lignes != null && lignes.length() > 0) {
            LinearLayout d = Ui.colonne(this);
            d.setPadding(Ui.dp(54), Ui.dp(6), 0, 0);
            for (int i = 0; i < lignes.length(); i++) d.addView(Ui.texte(this, "• " + lignes.optString(i), 13, Ui.TEXTE, false));
            c.addView(d);
        }
        if (annule) {
            LinearLayout p = Ui.ligne(this);
            p.setPadding(Ui.dp(54), Ui.dp(8), 0, 0);
            p.addView(Ui.puce(this, "Reçu annulé", Ui.ROUGE_PALE, Ui.ROUGE));
            c.addView(p);
        }
        return c;
    }

    // ================================================================== CARTE DE MEMBRE
    private void pageCarte(LinearLayout page) {
        titre(page, "Ma carte de membre", "À présenter sur demande");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        JSONObject moi = M == null ? null : M.optJSONObject("moi");
        JSONObject asso = M == null ? null : M.optJSONObject("asso");
        if (moi == null || asso == null) {
            inviterAccesComplet(corps, "Scannez le code QR de votre carte de membre ou de votre dossier.");
            return;
        }
        // la carte garde toujours ses couleurs de carte imprimée (claire), même en mode sombre
        int encre = 0xFF1A2420, gris = 0xFF5D6E66;
        LinearLayout carte = Ui.colonne(this);
        carte.setBackground(Ui.bordure(Color.WHITE, 0xFFD5E2DA, Ui.dp(18)));
        carte.setElevation(Ui.dp(6));
        carte.setClipToOutline(true);

        LinearLayout bande = Ui.ligne(this);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{Ui.VERT, Ui.VERT_FONCE});
        g.setCornerRadii(new float[]{Ui.dp(18), Ui.dp(18), Ui.dp(18), Ui.dp(18), 0, 0, 0, 0});
        bande.setBackground(g);
        bande.setPadding(Ui.dp(16), Ui.dp(14), Ui.dp(16), Ui.dp(14));
        ImageView logo = new ImageView(this);
        Bitmap bl = Ui.image(asso.optString("logo", ""));
        logo.setImageBitmap(bl != null ? Ui.rond(bl, Ui.dp(40)) : Ui.initiales("A", Ui.dp(40)));
        bande.addView(logo, new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40)));
        bande.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout tb = Ui.colonne(this);
        tb.addView(Ui.texte(this, asso.optString("nom", ""), 14.5f, Color.WHITE, true));
        TextView ct = Ui.texte(this, "CARTE DE MEMBRE · " + asso.optString("exercice", ""), 11.5f, Ui.OR, true);
        ct.setLetterSpacing(0.08f);
        tb.addView(ct);
        bande.addView(tb, Ui.poids(1));
        carte.addView(bande);

        LinearLayout milieu = Ui.ligne(this);
        milieu.setGravity(Gravity.TOP);
        milieu.setPadding(Ui.dp(16), Ui.dp(16), Ui.dp(16), Ui.dp(8));
        ImageView photo = new ImageView(this);
        Bitmap bp = Ui.image(moi.optString("photo", ""));
        photo.setImageBitmap(bp != null ? Ui.rond(bp, Ui.dp(88))
                : Ui.initiales(Ui.initialesDe(moi.optString("prenoms"), moi.optString("nom")), Ui.dp(88)));
        milieu.addView(photo, new LinearLayout.LayoutParams(Ui.dp(88), Ui.dp(88)));
        milieu.addView(Ui.espace(this, Ui.dp(14)));
        LinearLayout champs = Ui.colonne(this);
        champ(champs, "Nom", moi.optString("nom"), encre, gris, true);
        champ(champs, "Prénoms", moi.optString("prenoms"), encre, gris, true);
        champ(champs, "N° membre", moi.optString("i"), encre, gris, false);
        milieu.addView(champs, Ui.poids(1));
        carte.addView(milieu);

        LinearLayout bas = Ui.ligne(this);
        bas.setGravity(Gravity.TOP);
        bas.setPadding(Ui.dp(16), 0, Ui.dp(16), Ui.dp(14));
        LinearLayout gauche = Ui.colonne(this);
        String genre = "H".equals(moi.optString("genre")) ? "Homme" : "F".equals(moi.optString("genre")) ? "Femme" : "";
        if (!genre.isEmpty()) champ(gauche, "Genre", genre, encre, gris, false);
        champ(gauche, "Fonction", moi.optString("fonction", ""), encre, gris, false);
        champ(gauche, asso.optString("libelleResidence", "Quartier").replaceAll("(?i)\\s*/.*$", ""), moi.optString("residence", ""), encre, gris, false);
        champ(gauche, "Adhésion", Ui.date(moi.optString("dateAdhesion", "")), encre, gris, false);
        bas.addView(gauche, Ui.poids(1));
        Bitmap qr = qrCarte();
        if (qr != null) {
            ImageView q = new ImageView(this);
            q.setImageBitmap(qr);
            q.setBackgroundColor(Color.WHITE);
            bas.addView(q, new LinearLayout.LayoutParams(Ui.dp(118), Ui.dp(118)));
        }
        carte.addView(bas);

        LinearLayout pied = Ui.ligne(this);
        pied.setBackgroundColor(moi.optBoolean("actif", true) ? 0xFFFFF4D6 : 0xFFFDECEA);
        pied.setPadding(Ui.dp(16), Ui.dp(8), Ui.dp(16), Ui.dp(8));
        pied.addView(Ui.texte(this, moi.optBoolean("actif", true) ? "Membre actif" : "Membre inactif", 12.5f,
                moi.optBoolean("actif", true) ? 0xFF8A6400 : Ui.ROUGE, true), Ui.poids(1));
        pied.addView(Ui.texte(this, "Valable pour l'exercice " + asso.optString("exercice", ""), 12, gris, false));
        carte.addView(pied);
        corps.addView(carte, Ui.large(Ui.dp(10)));

        TextView aide = Ui.texte(this, qr != null
                ? "Le code QR ouvre votre fiche d'identité et les numéros d'urgence de l'association, sans aucune information financière. L'écran est mis à pleine luminosité pour faciliter sa lecture."
                : "Le code QR de la carte apparaîtra après la prochaine actualisation (le trésorier doit avoir créé les cartes).",
                12.5f, Ui.DOUX, false);
        aide.setPadding(Ui.dp(4), Ui.dp(14), Ui.dp(4), 0);
        corps.addView(aide);
    }

    private void champ(LinearLayout parent, String titre, String valeur, int encre, int gris, boolean fort) {
        if (valeur == null || valeur.trim().isEmpty()) return;
        LinearLayout l = Ui.colonne(this);
        TextView t = Ui.texte(this, titre.toUpperCase(Locale.FRANCE), 10, gris, true);
        t.setLetterSpacing(0.06f);
        l.addView(t);
        l.addView(Ui.texte(this, valeur, fort ? 16 : 14, encre, fort));
        parent.addView(l, Ui.large(Ui.dp(6)));
    }

    private Bitmap qrCarte() {
        String jc = donnees.jetonCarte();
        if (jc == null && M != null) jc = M.optString("jetonCarte", null);
        if (jc == null || donnees.base() == null) return null;
        try {
            String texte = donnees.base() + "?v=carte&t=" + Uri.encode(jc);
            Map<EncodeHintType, Object> h = new EnumMap<>(EncodeHintType.class);
            h.put(EncodeHintType.MARGIN, 1);
            BitMatrix m = new QRCodeWriter().encode(texte, BarcodeFormat.QR_CODE, 360, 360, h);
            int w = m.getWidth(), ht = m.getHeight();
            int[] px = new int[w * ht];
            for (int y = 0; y < ht; y++) for (int x = 0; x < w; x++) px[y * w + x] = m.get(x, y) ? 0xFF0C2B1E : 0xFFFFFFFF;
            return Bitmap.createBitmap(px, w, ht, Bitmap.Config.ARGB_8888);
        } catch (Exception e) {
            return null;
        }
    }

    // ================================================================== ASSOCIATION
    private void pageAsso(LinearLayout page) {
        JSONObject asso = M == null ? null : M.optJSONObject("asso");
        titre(page, "Réglages et aide", asso == null ? "" : asso.optString("nom", "") + " · Exercice " + asso.optString("exercice", "")
                + (asso.optString("siege", "").isEmpty() ? "" : " · " + asso.optString("siege")));
        LinearLayout corps = marge(page);
        bandeauEtat(corps);

        // plus
        section(corps, "Plus");
        LinearLayout reg = Ui.carte(this);
        reg.setPadding(Ui.dp(6), Ui.dp(4), Ui.dp(6), Ui.dp(4));
        reglage(reg, Icone.LIEN, "Ouvrir l'espace complet sur le site", null, v -> ouvrirSite(lienSite()));
        reglage(reg, Icone.CADENAS, "Verrouiller l'appli par un code", donnees.aUnCode() ? "Activé" : "Désactivé", v -> reglerCode());
        reglage(reg, Icone.ACTUALISER, "Actualiser maintenant", donnees.memoriseLe() > 0 ? "Dernière fois : " + Ui.moment(donnees.memoriseLe()) : null, v -> rafraichir(true));
        reglage(reg, Icone.QR, "Scanner un autre code QR", null, v -> scanner());
        reglage(reg, Icone.BOUCLIER, "Rechercher une mise à jour de l'appli", "Version " + BuildConfig.VERSION_NAME, v -> verifierMaj(true));
        if (estTresorier() && bureau.codeOps() != null)
            reglage(reg, Icone.BOUCLIER, "Oublier le code d'opérations", "La gestion le redemandera", v -> confirmer("Oublier le code d'opérations ?",
                    "Le code sera redemandé avant la prochaine opération.", () -> { bureau.oublierCodeOps(); CTX = null; message("Code oublié sur ce téléphone."); afficher(); }));
        reglage(reg, Icone.SORTIE, "Se déconnecter (changer de membre ou d'association)", null, v -> oublier());
        corps.addView(reg);

        TextView cr = Ui.texte(this, "AMEDIS Asso " + BuildConfig.VERSION_NAME + "\nConception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.\n"
                + "Les démarches et les opérations du trésorier sont appliquées par le logiciel AMEDIS pro Asso du PC, qui reste la référence.", 12, Ui.DOUX, false);
        cr.setGravity(Gravity.CENTER);
        cr.setPadding(Ui.dp(8), Ui.dp(22), Ui.dp(8), 0);
        corps.addView(cr);
    }

    private void blocUrgence(LinearLayout corps, JSONObject asso) {
        JSONArray u = asso == null ? null : asso.optJSONArray("urgence");
        if (u != null && u.length() > 0) {
            section(corps, "En cas d'urgence");
            for (int i = 0; i < u.length(); i++) {
                JSONObject x = u.optJSONObject(i);
                if (x == null) continue;
                corps.addView(carteContact(x), Ui.large(i == 0 ? 0 : Ui.dp(10)));
            }
        }

    }

    private void blocChiffres(LinearLayout corps) {
        JSONObject src = AS != null && AS.optJSONObject("tableau") != null ? AS : M;
        // l'association en chiffres
        JSONObject tab = src == null ? null : src.optJSONObject("tableau");
        section(corps, "L'association en chiffres");
        if (tab == null) {
            LinearLayout c = Ui.carte(this);
            c.addView(Ui.texte(this, "Effectifs, cotisations encaissées, dons, dépenses et solde de l'association sont visibles "
                    + "avec votre identifiant de membre et votre code personnel (4 chiffres, remis par le bureau).", 13.5f, Ui.DOUX, false));
            if (donnees.base() != null) c.addView(bouton("Me connecter", true, v -> connexion()), Ui.large(Ui.dp(12)));
            corps.addView(c);
        } else {
            String mon = monnaie();
            JSONObject eff = tab.optJSONObject("effectifs");
            LinearLayout r1 = Ui.ligne(this);
            r1.addView(tuile("Membres actifs", eff == null ? "–" : String.valueOf(eff.optInt("total")),
                    eff == null ? "" : eff.optInt("H") + " H · " + eff.optInt("F") + " F", Ui.VERT_TEXTE), Ui.poids(1));
            r1.addView(Ui.espace(this, Ui.dp(10)));
            r1.addView(tuile("Solde", Ui.nombre(tab.optDouble("solde", 0)), mon, tab.optDouble("solde", 0) < 0 ? Ui.ROUGE : Ui.VERT_TEXTE), Ui.poids(1));
            corps.addView(r1);
            LinearLayout r2 = Ui.ligne(this);
            r2.addView(tuile("Cotisations", Ui.nombre(tab.optDouble("totalCotisations", 0)), mon, Ui.TEXTE), Ui.poids(1));
            r2.addView(Ui.espace(this, Ui.dp(10)));
            r2.addView(tuile("Dons", Ui.nombre(tab.optDouble("dons", 0)), mon, Ui.TEXTE), Ui.poids(1));
            r2.addView(Ui.espace(this, Ui.dp(10)));
            r2.addView(tuile("Dépenses", Ui.nombre(tab.optDouble("depenses", 0)), mon, Ui.TEXTE), Ui.poids(1));
            corps.addView(r2, Ui.large(Ui.dp(10)));

            JSONArray cots = src.optJSONArray("cotisations");
            if (cots != null && cots.length() > 0) {
                LinearLayout c = Ui.carte(this);
                c.addView(Ui.texte(this, "Membres à jour, par cotisation", 15, Ui.TEXTE, true));
                for (int i = 0; i < cots.length(); i++) {
                    JSONObject k = cots.optJSONObject(i);
                    JSONObject r = k == null ? null : k.optJSONObject("resume");
                    if (r == null) continue;
                    LinearLayout l = Ui.ligne(this);
                    l.addView(Ui.texte(this, k.optString("nom"), 13.5f, Ui.TEXTE, false), Ui.poids(1));
                    l.addView(Ui.texte(this, Math.round(r.optDouble("taux", 0) * 100) + " %", 13.5f, Ui.TEXTE, true));
                    c.addView(l, Ui.large(Ui.dp(12)));
                    c.addView(Ui.barre(this, r.optDouble("taux", 0), Ui.couleur(k.optString("couleur"), Ui.VERT)));
                }
                corps.addView(c, Ui.large(Ui.dp(10)));
            }
        }

    }

    private View carteContact(JSONObject x) {
        LinearLayout c = Ui.carte(this);
        LinearLayout l = Ui.ligne(this);
        l.addView(rondIcone(Icone.TEL, Ui.ROUGE_PALE, Ui.ROUGE, Ui.dp(44)));
        l.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.etiquette(this, x.optString("role")));
        if (!x.optString("nom").isEmpty()) t.addView(Ui.texte(this, x.optString("nom"), 15, Ui.TEXTE, true));
        TextView tel = Ui.texte(this, x.optString("tel"), 15, Ui.TEXTE, false);
        tel.setTextIsSelectable(true);
        t.addView(tel);
        l.addView(t, Ui.poids(1));
        c.addView(l);
        LinearLayout b = Ui.ligne(this);
        final String num = x.optString("tel");
        View appeler = bouton("Appeler", true, v -> ouvrirExterne(Uri.parse("tel:" + num.replaceAll("[^\\d+]", ""))));
        b.addView(appeler, Ui.poids(1));
        b.addView(Ui.espace(this, Ui.dp(10)));
        b.addView(bouton("WhatsApp", false, v -> {
            String w = numeroWhatsApp(num);
            if (w.isEmpty()) message("Numéro WhatsApp non reconnu.");
            else ouvrirExterne(Uri.parse("https://wa.me/" + w));
        }), Ui.poids(1));
        c.addView(b, Ui.large(Ui.dp(12)));
        return c;
    }

    private View tuile(String titre, String valeur, String unite, int couleur) {
        LinearLayout c = Ui.carte(this);
        c.setPadding(Ui.dp(12), Ui.dp(12), Ui.dp(12), Ui.dp(12));
        c.addView(Ui.etiquette(this, titre));
        TextView v = Ui.texte(this, valeur, 19, couleur, true);
        v.setPadding(0, Ui.dp(4), 0, 0);
        c.addView(v);
        if (unite != null && !unite.isEmpty()) c.addView(Ui.texte(this, unite, 11.5f, Ui.DOUX, false));
        return c;
    }

    private void reglage(LinearLayout parent, int icone, String titre, String sous, View.OnClickListener action) {
        LinearLayout l = Ui.ligne(this);
        l.setPadding(Ui.dp(10), Ui.dp(12), Ui.dp(10), Ui.dp(12));
        l.addView(new Icone(this, icone, Ui.VERT_TEXTE), new LinearLayout.LayoutParams(Ui.dp(22), Ui.dp(22)));
        l.addView(Ui.espace(this, Ui.dp(14)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.texte(this, titre, 15, Ui.TEXTE, false));
        if (sous != null) t.addView(Ui.texte(this, sous, 12.5f, Ui.DOUX, false));
        l.addView(t, Ui.poids(1));
        l.addView(Ui.texte(this, "›", 20, Ui.DOUX, false));
        l.setOnClickListener(action);
        parent.addView(l);
    }

    // ================================================================== DÉMARCHES (membre) et ESPACE BUREAU
    private static final String[] MODES_PAIEMENT = {"Orange Money", "MTN MoMo", "Moov Money", "Wave",
            "Espèces remises à un membre du bureau", "Virement bancaire", "Autre"};

    private void pageDemarches(LinearLayout page) {
        titre(page, "Mes démarches", "Vos demandes au bureau, suivies jusqu'à la réponse");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!demarches.possible()) {
            inviterAccesComplet(corps, "Les démarches se font depuis votre dossier personnel ou avec votre identifiant : "
                    + "la carte de membre seule sert uniquement à vous identifier.");
            return;
        }
        if (DEM != null && !DEM.optBoolean("ok") && !DEM.optString("erreur").isEmpty()) {
            LinearLayout b = Ui.carte(this);
            b.addView(Ui.texte(this, DEM.optString("erreur"), 13.5f, Ui.ROUGE, false));
            corps.addView(b, Ui.large(Ui.dp(10)));
        }

        // nouvelles démarches
        section(corps, "Nouvelle démarche");
        LinearLayout r1 = Ui.ligne(this), r2 = Ui.ligne(this);
        r1.addView(tuileAction(Icone.RECU, "Déclarer un paiement", "Mobile Money, espèces…", v -> formulairePaiement()), Ui.poids(1));
        r1.addView(Ui.espace(this, Ui.dp(10)));
        r1.addView(tuileAction(Icone.PERSONNE, "Mes coordonnées", "Téléphone, quartier…", v -> formulaireTexte("coordonnees")), Ui.poids(1));
        r2.addView(tuileAction(Icone.ALERTE, "Signaler un événement", "Décès, naissance, mariage…", v -> formulaireTexte("solidarite")), Ui.poids(1));
        r2.addView(Ui.espace(this, Ui.dp(10)));
        r2.addView(tuileAction(Icone.MESSAGE, "Écrire au bureau", "Question, suggestion", v -> formulaireTexte("message")), Ui.poids(1));
        corps.addView(r1);
        corps.addView(r2, Ui.large(Ui.dp(10)));

        // file hors connexion
        int n = demarches.file().length();
        if (n > 0) {
            LinearLayout b = Ui.ligne(this);
            b.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
            b.setBackground(Ui.arrondi(Ui.OR_PALE, Ui.dp(12)));
            b.addView(new Icone(this, Icone.NUAGE, Ui.ORANGE), new LinearLayout.LayoutParams(Ui.dp(22), Ui.dp(22)));
            b.addView(Ui.espace(this, Ui.dp(10)));
            b.addView(Ui.texte(this, n + (n > 1 ? " démarches gardées" : " démarche gardée") + " sur le téléphone : envoi automatique au retour d'Internet.",
                    13.5f, Ui.TEXTE, false), Ui.poids(1));
            corps.addView(b, Ui.large(Ui.dp(14)));
        }

        // mes démarches
        JSONArray m = DEM == null ? null : DEM.optJSONArray("miennes");
        section(corps, "Suivi" + (m == null || m.length() == 0 ? "" : " (" + m.length() + ")"));
        if (m == null || m.length() == 0) {
            LinearLayout c = Ui.carte(this);
            c.addView(Ui.texte(this, DEM == null ? "Tirez l'écran vers le bas pour charger vos démarches."
                    : "Aucune démarche pour l'instant.", 13.5f, Ui.DOUX, false));
            corps.addView(c);
        } else {
            for (int i = 0; i < m.length(); i++) corps.addView(carteDemarche(m.optJSONObject(i), false, false), Ui.large(i == 0 ? 0 : Ui.dp(10)));
        }

        // espace bureau (le site décide qui y a droit)
        JSONObject role = DEM == null ? null : DEM.optJSONObject("role");
        if (role != null && role.optBoolean("bureau")) {
            JSONArray b = DEM.optJSONArray("bureau");
            int aTraiter = 0;
            for (int i = 0; b != null && i < b.length(); i++) {
                String s = b.optJSONObject(i).optString("statut");
                if ("En attente".equals(s) || "En cours".equals(s)) aTraiter++;
            }
            section(corps, "Espace bureau · " + aTraiter + " à traiter");
            LinearLayout info = Ui.carte(this);
            info.setBackground(Ui.arrondi(Ui.VERT_PALE, Ui.dp(16)));
            info.addView(Ui.texte(this, "Vous voyez les démarches des membres en tant que " + role.optString("fonction", "membre du bureau")
                    + ". " + (role.optBoolean("tresorier")
                    ? "Un paiement validé ici doit être saisi dans AMEDIS pro Asso sur le PC : c'est cette saisie qui crée le reçu et met la caisse à jour."
                    : "Les paiements sont validés par le trésorier seul."), 13, Ui.TEXTE, false));
            corps.addView(info);
            for (int i = 0; b != null && i < b.length(); i++)
                corps.addView(carteDemarche(b.optJSONObject(i), true, role.optBoolean("tresorier")), Ui.large(Ui.dp(10)));
        }

        TextView regles = Ui.texte(this, "Règles : un paiement déclaré n'est compté qu'après validation du trésorier et émission du reçu. "
                + "Vous ne voyez que vos propres démarches. Limites : 15 démarches par jour, 3 paiements en attente au plus.",
                12, Ui.DOUX, false);
        regles.setGravity(Gravity.CENTER);
        regles.setPadding(Ui.dp(8), Ui.dp(22), Ui.dp(8), 0);
        corps.addView(regles);
    }

    private View tuileAction(int icone, String titre, String sous, View.OnClickListener action) {
        LinearLayout c = Ui.carte(this);
        c.setPadding(Ui.dp(12), Ui.dp(14), Ui.dp(12), Ui.dp(14));
        c.addView(rondIcone(icone, Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(38)));
        TextView t = Ui.texte(this, titre, 14.5f, Ui.TEXTE, true);
        t.setPadding(0, Ui.dp(8), 0, 0);
        c.addView(t);
        c.addView(Ui.texte(this, sous, 12, Ui.DOUX, false));
        c.setClickable(true);
        c.setOnClickListener(action);
        return c;
    }

    private View carteDemarche(final JSONObject d, boolean vueBureau, boolean tresorier) {
        LinearLayout c = Ui.carte(this);
        if (d == null) return c;
        String statut = d.optString("statut", "En attente");
        LinearLayout l = Ui.ligne(this);
        l.addView(Ui.texte(this, d.optString("libelle"), 15, Ui.TEXTE, true), Ui.poids(1));
        int fond = Ui.OR_PALE, encre = Ui.ORANGE;
        if ("Validée".equals(statut) || "Répondu".equals(statut)) { fond = Ui.VERT_PALE; encre = Ui.VERT_TEXTE; }
        else if ("Refusée".equals(statut) || "Annulée".equals(statut)) { fond = Ui.ROUGE_PALE; encre = Ui.ROUGE; }
        l.addView(Ui.puce(this, statut, fond, encre));
        c.addView(l);
        String qui = vueBureau ? d.optString("membre") + " (n° " + d.optString("numero") + ") · " : "";
        c.addView(Ui.texte(this, qui + "envoyée le " + Ui.moment(d.optString("recueLe")), 12.5f, Ui.DOUX, false), Ui.large(Ui.dp(2)));
        if ("paiement".equals(d.optString("type"))) {
            c.addView(Ui.texte(this, Ui.argent(d.optDouble("montant", 0), monnaie()) + " · " + d.optString("cotisation"), 15, Ui.VERT_TEXTE, true), Ui.large(Ui.dp(8)));
            String det = d.optString("modePaiement") + (d.optString("reference").isEmpty() ? "" : " · réf. " + d.optString("reference"))
                    + (d.optString("datePaiement").isEmpty() ? "" : " · le " + Ui.date(d.optString("datePaiement")));
            c.addView(Ui.texte(this, det, 13, Ui.TEXTE, false));
        }
        if (!d.optString("detail").isEmpty()) c.addView(Ui.texte(this, d.optString("detail"), 13.5f, Ui.TEXTE, false), Ui.large(Ui.dp(6)));
        if (!d.optString("reponse").isEmpty()) {
            LinearLayout rep = Ui.colonne(this);
            rep.setPadding(Ui.dp(12), Ui.dp(10), Ui.dp(12), Ui.dp(10));
            rep.setBackground(Ui.arrondi(Ui.PISTE, Ui.dp(10)));
            rep.addView(Ui.etiquette(this, "Réponse · " + d.optString("traiteePar")));
            rep.addView(Ui.texte(this, d.optString("reponse"), 13.5f, Ui.TEXTE, false));
            c.addView(rep, Ui.large(Ui.dp(10)));
        }
        final String id = d.optString("id");
        boolean ouverte = "En attente".equals(statut) || "En cours".equals(statut);
        if (!vueBureau && "En attente".equals(statut)) {
            c.addView(bouton("Annuler cette démarche", false, v -> confirmer("Annuler cette démarche ?",
                    "Le bureau ne la traitera pas.", () -> actionDemarche(() -> demarches.annuler(id), "Démarche annulée."))), Ui.large(Ui.dp(12)));
        }
        if (vueBureau && ouverte) {
            boolean paiement = "paiement".equals(d.optString("type"));
            LinearLayout b = Ui.ligne(this);
            if (!paiement || tresorier) {
                if ("En attente".equals(statut)) {
                    b.addView(bouton("Prendre en charge", false, v -> actionDemarche(() -> demarches.statuer(id, "En cours", ""), "Démarche prise en charge.")), Ui.poids(1));
                    b.addView(Ui.espace(this, Ui.dp(8)));
                }
                b.addView(bouton(paiement ? "Valider" : "Répondre", true, v -> repondre(id, paiement ? "Validée" : "Répondu", paiement)), Ui.poids(1));
                b.addView(Ui.espace(this, Ui.dp(8)));
                b.addView(bouton("Refuser", false, v -> repondre(id, "Refusée", paiement)), Ui.poids(1));
                c.addView(b, Ui.large(Ui.dp(12)));
            } else {
                c.addView(Ui.texte(this, "À valider par le trésorier.", 12.5f, Ui.DOUX, false), Ui.large(Ui.dp(8)));
            }
        }
        return c;
    }

    private interface Appel { JSONObject faire() throws Exception; }

    private void actionDemarche(final Appel a, final String succes) {
        enChargement(true);
        fond.execute(() -> {
            String err;
            try {
                JSONObject r = a.faire();
                err = r.optBoolean("ok") ? null : r.optString("erreur", "Opération refusée.");
                if (err == null) DEM = demarches.liste();
            } catch (Donnees.SiteAncien e) {
                err = "Le site de l'association doit être mis à jour (version 1.8.0) pour les démarches.";
            } catch (Exception e) {
                err = "Pas de connexion Internet : réessayez plus tard.";
            }
            final String fe = err;
            ui.post(() -> {
                enChargement(false);
                message(fe == null ? succes : fe);
                afficher();
            });
        });
    }

    private void repondre(final String id, final String statut, boolean paiement) {
        final EditText t = new EditText(this);
        t.setHint("Refusée".equals(statut) ? "Motif du refus (obligatoire)" : "Réponse au membre (facultatif)");
        t.setMinLines(2);
        String msg = "Validée".equals(statut)
                ? "Après validation, enregistrez ce paiement dans AMEDIS pro Asso sur le PC : le reçu sera publié automatiquement au membre."
                : "Refusée".equals(statut) ? "Le membre verra le motif dans son appli." : "Le membre verra votre réponse dans son appli.";
        new AlertDialog.Builder(this).setTitle(paiement && "Validée".equals(statut) ? "Valider le paiement" : statut)
                .setMessage(msg).setView(encadrer(t))
                .setPositiveButton("Confirmer", (dlg, w) -> actionDemarche(() -> demarches.statuer(id, statut, t.getText().toString().trim()), "Réponse enregistrée."))
                .setNegativeButton("Annuler", null).show();
    }

    private void confirmer(String titre, String texte, final Runnable oui) {
        new AlertDialog.Builder(this).setTitle(titre).setMessage(texte)
                .setPositiveButton("Oui", (d, w) -> oui.run()).setNegativeButton("Non", null).show();
    }

    private Spinner liste(String[] choix) {
        Spinner s = new Spinner(this);
        ArrayAdapter<String> a = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, choix);
        a.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        s.setAdapter(a);
        return s;
    }

    private void formulairePaiement() {
        JSONArray cots = M == null ? null : M.optJSONArray("cotisations");
        java.util.ArrayList<String> noms = new java.util.ArrayList<>();
        for (int i = 0; cots != null && i < cots.length(); i++) {
            String nm = cots.optJSONObject(i) == null ? "" : cots.optJSONObject(i).optString("nom");
            if (!nm.isEmpty()) noms.add(nm);
        }
        if (noms.isEmpty()) noms.add("Cotisation");
        LinearLayout f = Ui.colonne(this);
        f.addView(Ui.etiquette(this, "Cotisation"));
        final Spinner cot = liste(noms.toArray(new String[0]));
        f.addView(cot);
        final EditText montant = new EditText(this);
        montant.setHint("Montant versé (" + monnaie() + ")");
        montant.setInputType(InputType.TYPE_CLASS_NUMBER);
        f.addView(montant, Ui.large(Ui.dp(8)));
        f.addView(Ui.etiquette(this, "Mode de paiement"), Ui.large(Ui.dp(8)));
        final Spinner mode = liste(MODES_PAIEMENT);
        f.addView(mode);
        final EditText ref = new EditText(this);
        ref.setHint("Référence de la transaction (facultatif)");
        f.addView(ref, Ui.large(Ui.dp(8)));
        final EditText date = new EditText(this);
        date.setHint("Date du paiement (JJ/MM/AAAA)");
        date.setInputType(InputType.TYPE_CLASS_DATETIME | InputType.TYPE_DATETIME_VARIATION_DATE);
        date.setText(new java.text.SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE).format(new java.util.Date()));
        f.addView(date);
        final EditText note = new EditText(this);
        note.setHint("Précision pour le trésorier (facultatif)");
        f.addView(note);
        ScrollView sv = new ScrollView(this);
        sv.addView(encadrer(f));
        new AlertDialog.Builder(this).setTitle("Déclarer un paiement")
                .setMessage("Le trésorier vérifie puis enregistre votre paiement. Votre situation et votre reçu sont mis à jour après sa validation.")
                .setView(sv)
                .setPositiveButton("Envoyer", (dlg, w) -> {
                    long mt;
                    try { mt = Long.parseLong(montant.getText().toString().replaceAll("\\D", "")); } catch (Exception e) { mt = 0; }
                    if (mt <= 0) { message("Indiquez le montant versé."); return; }
                    JSONObject d = Demarches.nouvelle("paiement");
                    try {
                        d.put("cotisation", cot.getSelectedItem().toString());
                        d.put("montant", mt);
                        d.put("modePaiement", mode.getSelectedItem().toString());
                        d.put("reference", ref.getText().toString().trim());
                        d.put("datePaiement", dateIso(date.getText().toString().trim()));
                        d.put("detail", note.getText().toString().trim());
                    } catch (Exception ignore) { /* champs simples */ }
                    envoyerDemarche(d);
                })
                .setNegativeButton("Annuler", null).show();
    }

    private void formulaireTexte(final String type) {
        String titre, aide, indice;
        switch (type) {
            case "coordonnees":
                titre = "Mettre à jour mes coordonnées";
                aide = "Indiquez les informations à corriger (téléphone, quartier, adresse…). Le bureau les reportera dans le logiciel.";
                indice = "Ex. : nouveau numéro 07 00 00 00 00";
                break;
            case "solidarite":
                titre = "Signaler un événement";
                aide = "Décès, naissance, mariage, maladie… Le bureau en sera informé pour organiser la solidarité.";
                indice = "Ex. : naissance de ma fille le 12/11";
                break;
            default:
                titre = "Écrire au bureau";
                aide = "Question, suggestion ou réclamation. Le bureau vous répondra ici.";
                indice = "Votre message";
                break;
        }
        final EditText t = new EditText(this);
        t.setHint(indice);
        t.setMinLines(3);
        t.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        new AlertDialog.Builder(this).setTitle(titre).setMessage(aide).setView(encadrer(t))
                .setPositiveButton("Envoyer", (dlg, w) -> {
                    String s = t.getText().toString().trim();
                    if (s.isEmpty()) { message("Écrivez d'abord votre texte."); return; }
                    JSONObject d = Demarches.nouvelle(type);
                    try { d.put("detail", s.length() > 600 ? s.substring(0, 600) : s); } catch (Exception ignore) { /* simple */ }
                    envoyerDemarche(d);
                })
                .setNegativeButton("Annuler", null).show();
    }

    private void envoyerDemarche(final JSONObject d) {
        enChargement(true);
        fond.execute(() -> {
            String msg;
            try {
                boolean envoyee = demarches.envoyer(d);
                if (envoyee) { DEM = demarches.liste(); msg = "Démarche envoyée au bureau."; }
                else msg = "Pas de connexion : démarche gardée sur le téléphone, envoi automatique plus tard.";
            } catch (Demarches.Refus e) {
                msg = e.getMessage();
            } catch (Donnees.SiteAncien e) {
                msg = "Le site de l'association doit être mis à jour (version 1.8.0) pour les démarches.";
            } catch (Exception e) {
                msg = "Envoi impossible : réessayez plus tard.";
            }
            final String fm = msg;
            ui.post(() -> { enChargement(false); message(fm); afficher(); });
        });
    }

    /** Synchronise les démarches en arrière-plan : file hors connexion d'abord, puis suivi. */
    private void synchroniserDemarches() {
        if (!demarches.possible()) return;
        fond.execute(() -> {
            StringBuilder refus = new StringBuilder();
            int envoyees = 0;
            JSONObject r = null;
            try {
                envoyees = demarches.viderFile(refus);
                r = demarches.liste();
            } catch (Exception ignore) { /* hors connexion ou site ancien : on garde l'affichage */ }
            final JSONObject fr = r;
            final int fe = envoyees;
            ui.post(() -> {
                if (fr != null) { DEM = fr; signalerReponses(); }
                if (fe > 0) message(fe + (fe > 1 ? " démarches envoyées." : " démarche envoyée."));
                if (refus.length() > 0) new AlertDialog.Builder(this).setTitle("Démarche refusée par le site")
                        .setMessage(refus.toString()).setPositiveButton("Compris", null).show();
                if (onglet == T_DEMARCHES) afficher();
            });
        });
    }

    /** Message quand le bureau a répondu depuis la dernière ouverture. */
    private void signalerReponses() {
        JSONArray m = DEM == null ? null : DEM.optJSONArray("miennes");
        int traitees = 0;
        for (int i = 0; m != null && i < m.length(); i++) {
            String s = m.optJSONObject(i).optString("statut");
            if (!"En attente".equals(s) && !"Annulée".equals(s)) traitees++;
        }
        android.content.SharedPreferences p = getSharedPreferences("amedis", MODE_PRIVATE);
        int vues = p.getInt("demVues", -1);
        if (vues >= 0 && traitees > vues) {
            pastilleDem.setVisibility(View.VISIBLE);
            message("Le bureau a répondu à une de vos démarches.");
        }
        if (vues < 0 || onglet == T_DEMARCHES) p.edit().putInt("demVues", traitees).apply();
    }

    /** « 12/11/2026 » -> « 2026-11-12 » (texte laissé tel quel s'il n'est pas reconnu). */
    private static String dateIso(String s) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{4})$").matcher(s);
        if (!m.find()) return s;
        return m.group(3) + "-" + String.format(Locale.ROOT, "%02d", Integer.parseInt(m.group(2)))
                + "-" + String.format(Locale.ROOT, "%02d", Integer.parseInt(m.group(1)));
    }

    // ================================================================== ÉCRAN DE BIENVENUE
    private void montrerBienvenue() {
        retirer(bienvenue);
        ScrollView defil = new ScrollView(this);
        defil.setFillViewport(true);
        defil.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Ui.VERT, Ui.VERT_FONCE}));
        LinearLayout col = Ui.colonne(this);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        col.setPadding(Ui.dp(26), Ui.dp(48), Ui.dp(26), Ui.dp(28));
        defil.addView(col);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        col.addView(logo, new LinearLayout.LayoutParams(Ui.dp(96), Ui.dp(96)));
        TextView t = Ui.texte(this, "AMEDIS Asso", 30, Color.WHITE, true);
        t.setPadding(0, Ui.dp(14), 0, 0);
        col.addView(t);
        col.addView(Ui.texte(this, "Votre association dans votre poche", 16, Ui.OR, true));

        LinearLayout atouts = Ui.colonne(this);
        atouts.setPadding(0, Ui.dp(26), 0, Ui.dp(10));
        atout(atouts, Icone.OK, "Mes cotisations", "Ce que vous avez versé, ce qu'il reste, mois par mois.");
        atout(atouts, Icone.RECU, "Mes reçus", "Tous vos reçus de paiement, toujours à portée de main.");
        atout(atouts, Icone.MESSAGE, "Mes démarches", "Déclarer un paiement, écrire au bureau, suivre la réponse.");
        atout(atouts, Icone.CARTE, "Ma carte de membre", "Une carte numérique avec son code QR, à présenter.");
        atout(atouts, Icone.TEL, "Urgence", "Président, secrétaire général et trésorier en un toucher.");
        atout(atouts, Icone.NUAGE, "Même sans Internet", "Les dernières informations restent consultables.");
        col.addView(atouts, Ui.large(0));

        col.addView(bouton("Scanner un code QR", true, v -> scanner()), Ui.large(Ui.dp(14)));
        TextView coller = Ui.texte(this, "Coller le lien reçu par WhatsApp", 15, Color.WHITE, true);
        coller.setGravity(Gravity.CENTER);
        coller.setPadding(Ui.dp(16), Ui.dp(13), Ui.dp(16), Ui.dp(13));
        coller.setBackground(Ui.bordure(0x22FFFFFF, 0x66FFFFFF, Ui.dp(12)));
        coller.setOnClickListener(v -> collerLien());
        col.addView(coller, Ui.large(Ui.dp(10)));

        View ressort = new View(this);
        col.addView(ressort, new LinearLayout.LayoutParams(1, 0, 1f));
        TextView cr = Ui.texte(this, "Vos cotisations et reçus ne sont jamais modifiés depuis l'appli.\n"
                + "Conception : M. KAMAGATE, Inspecteur d'Orientation, CIO Bouaké 2.", 12, 0xFFA9CDB9, false);
        cr.setGravity(Gravity.CENTER);
        cr.setPadding(0, Ui.dp(26), 0, 0);
        col.addView(cr);

        bienvenue = defil;
        racine.addView(bienvenue, plein());
        apparition(col);
        luminosite();
    }

    private void atout(LinearLayout parent, int icone, String titre, String texte) {
        LinearLayout l = Ui.ligne(this);
        l.setPadding(0, Ui.dp(8), 0, Ui.dp(8));
        FrameLayout f = new FrameLayout(this);
        f.setBackground(Ui.arrondi(0x26FFFFFF, Ui.dp(20)));
        f.addView(new Icone(this, icone, Ui.OR), new FrameLayout.LayoutParams(Ui.dp(22), Ui.dp(22), Gravity.CENTER));
        l.addView(f, new LinearLayout.LayoutParams(Ui.dp(40), Ui.dp(40)));
        l.addView(Ui.espace(this, Ui.dp(14)));
        LinearLayout t = Ui.colonne(this);
        t.addView(Ui.texte(this, titre, 15.5f, Color.WHITE, true));
        t.addView(Ui.texte(this, texte, 13.5f, 0xFFCFE7DA, false));
        l.addView(t, Ui.poids(1));
        parent.addView(l);
    }

    // ================================================================== liens, scan, connexion
    private boolean recevoirLien(String texte) {
        String quoi = donnees.enregistrerLien(texte);
        if (quoi == null) {
            new AlertDialog.Builder(this)
                    .setTitle("Code non reconnu")
                    .setMessage("Ce n'est pas un lien de l'espace des membres AMEDIS pro Asso.\n\n"
                            + "Scannez le code QR de votre carte de membre, celui de votre dossier ou celui de l'espace des membres, "
                            + "ou collez le lien reçu par WhatsApp.")
                    .setPositiveButton("Compris", null)
                    .show();
            return false;
        }
        retirer(bienvenue);
        bienvenue = null;
        if ("groupe".equals(quoi) && !donnees.connu()) {
            M = null;
            onglet = T_ACCUEIL;
            afficher();
            connexion();
            return true;
        }
        onglet = "carte".equals(quoi) && donnees.jetonPerso() == null && donnees.ident() == null ? T_CARTE : T_ACCUEIL;
        majBarre();
        if (M == null) M = donnees.membreMemorise();
        afficher();
        rafraichir(true);
        if ("groupe".equals(quoi)) connexion();
        luminosite();
        return true;
    }

    private void scanner() {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build();
            GmsBarcodeScanner lecteur = GmsBarcodeScanning.getClient(this, options);
            lecteur.startScan()
                    .addOnSuccessListener(code -> recevoirLien(code.getRawValue()))
                    .addOnFailureListener(e -> message("Lecture du code QR impossible sur ce téléphone : collez plutôt le lien reçu."));
        } catch (Exception e) {
            message("Lecture du code QR impossible sur ce téléphone : collez plutôt le lien reçu.");
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
                if (t != null && Donnees.LIEN.matcher(t).find()) champ.setText(t);
            }
        } catch (Exception ignore) { /* presse-papiers indisponible */ }
        new AlertDialog.Builder(this)
                .setTitle("Coller le lien reçu")
                .setMessage("Dans WhatsApp, appuyez longuement sur le message qui contient le lien, choisissez « Copier », puis collez-le ici.")
                .setView(encadrer(champ))
                .setPositiveButton("Ouvrir", (d, w) -> recevoirLien(champ.getText().toString()))
                .setNegativeButton("Annuler", null)
                .show();
    }

    /** Connexion à l'espace des membres : identifiant + code personnel (5 essais, puis blocage de 15 minutes). */
    private void connexion() {
        if (donnees.base() == null) {
            message("Scannez d'abord un code QR de l'association.");
            return;
        }
        LinearLayout f = Ui.colonne(this);
        final EditText id = new EditText(this);
        id.setHint("Identifiant de membre (ex. A2B 12)");
        id.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        if (donnees.ident() != null) id.setText(donnees.ident());
        final EditText code = new EditText(this);
        code.setHint("Code personnel (4 chiffres)");
        code.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        f.addView(id);
        f.addView(code);
        new AlertDialog.Builder(this)
                .setTitle("Espace des membres")
                .setMessage("Saisissez l'identifiant et le code personnel remis par le bureau de l'association.")
                .setView(encadrer(f))
                .setPositiveButton("Se connecter", (d, w) -> seConnecter(id.getText().toString().trim(), code.getText().toString().trim()))
                .setNegativeButton("Annuler", null)
                .show();
    }

    private void seConnecter(final String ident, final String code) {
        if (ident.isEmpty() || code.isEmpty()) {
            message("Saisissez l'identifiant et le code.");
            return;
        }
        enChargement(true);
        fond.execute(() -> {
            try {
                final JSONObject r = donnees.essayerConnexion(ident, code);
                ui.post(() -> {
                    enChargement(false);
                    if (r.optBoolean("ok")) {
                        donnees.enregistrerConnexion(ident, code);
                        AS = r;
                        if (donnees.jetonPerso() == null) M = r;
                        donnees.enregistrerJetonCarte(r.optString("jetonCarte", null));
                        donnees.memoriser(M, AS);
                        erreur = null;
                        horsLigne = false;
                        message("Connexion réussie.");
                        afficher();
                    } else {
                        new AlertDialog.Builder(this).setTitle("Connexion refusée")
                                .setMessage(r.optString("erreur", "Identifiant ou code incorrect."))
                                .setPositiveButton("Réessayer", (d, w) -> connexion())
                                .setNegativeButton("Fermer", null).show();
                    }
                });
            } catch (Donnees.SiteAncien e) {
                ui.post(() -> { enChargement(false); siteAncien(); });
            } catch (Exception e) {
                ui.post(() -> { enChargement(false); message("Pas de connexion Internet : réessayez plus tard."); });
            }
        });
    }

    // ================================================================== actualisation
    private void rafraichir(final boolean manuel) {
        if (chargement || !donnees.connu()) {
            if (tirer != null) tirer.setRefreshing(false);
            return;
        }
        enChargement(true);
        fond.execute(() -> {
            JSONObject m = null, a = null;
            Exception pb = null;
            try {
                m = donnees.lireMembre();
                if (donnees.ident() != null) {
                    if (donnees.jetonPerso() == null) a = m;
                    else try { a = donnees.lireAsso(); } catch (Exception ignore) { a = null; }
                }
            } catch (Exception e) {
                pb = e;
            }
            final JSONObject fm = m, fa = a;
            final Exception fpb = pb;
            ui.post(() -> {
                enChargement(false);
                if (fpb instanceof Donnees.SiteAncien) {
                    siteAncien();
                } else if (fpb != null) {
                    horsLigne = true;
                    if (manuel) message("Pas de connexion Internet : informations enregistrées affichées.");
                } else if (fm != null && fm.optBoolean("ok")) {
                    horsLigne = false;
                    erreur = null;
                    M = fm;
                    if (fa != null && fa.optBoolean("ok")) AS = fa;
                    donnees.enregistrerJetonCarte(fm.optString("jetonCarte", null));
                    donnees.memoriser(M, AS);
                    nouveauxRecus();
                    synchroniserDemarches();
                    synchroniserMessages();
                    if (estTresorier()) chargerContexte(!manuel);
                    if (manuel) message("Informations à jour.");
                } else if (fm != null) {
                    horsLigne = false;
                    erreur = fm.optString("erreur", "Le site n'a pas pu répondre.");
                }
                afficher();
            });
        });
    }

    private void enChargement(boolean oui) {
        chargement = oui;
        chargementVue.setVisibility(oui ? View.VISIBLE : View.GONE);
        if (!oui && tirer != null) tirer.setRefreshing(false);
    }

    /** Pastille rouge sur l'onglet Reçus quand un nouveau reçu est arrivé. */
    private void nouveauxRecus() {
        int n = nbRecus();
        android.content.SharedPreferences p = getSharedPreferences("amedis", MODE_PRIVATE);
        int vus = p.getInt("recusVus", -1);
        if (vus < 0) p.edit().putInt("recusVus", n).apply();
        else if (n > vus) {
            pastilleRecus.setVisibility(View.VISIBLE);
            message(n - vus == 1 ? "Nouveau reçu disponible." : (n - vus) + " nouveaux reçus disponibles.");
        }
    }

    private void marquerRecusVus() {
        pastilleRecus.setVisibility(View.GONE);
        getSharedPreferences("amedis", MODE_PRIVATE).edit().putInt("recusVus", nbRecus()).apply();
    }

    private int nbRecus() {
        JSONObject moi = M == null ? null : M.optJSONObject("moi");
        JSONArray rc = moi == null ? null : moi.optJSONArray("rc");
        return rc == null ? 0 : rc.length();
    }

    private void siteAncien() {
        new AlertDialog.Builder(this)
                .setTitle("Site de l'association à mettre à jour")
                .setMessage("Pour profiter de l'appli complète, le trésorier doit mettre à jour le site de l'association "
                        + "(version 1.7.0 ou plus récente). En attendant, votre espace s'ouvre en mode site.")
                .setPositiveButton("Ouvrir en mode site", (d, w) -> ouvrirSite(lienSite()))
                .setNegativeButton("Fermer", null)
                .show();
    }

    private String lienSite() {
        String b = donnees.base();
        if (b == null) return null;
        if (donnees.jetonPerso() != null) return b + "?v=perso&t=" + Uri.encode(donnees.jetonPerso());
        if (donnees.ident() != null) return b + "?v=asso";
        if (donnees.jetonCarte() != null) return b + "?v=carte&t=" + Uri.encode(donnees.jetonCarte());
        return b + "?v=asso";
    }

    // ================================================================== site dans l'appli (secours)
    private void ouvrirSite(String url) {
        if (url == null) return;
        fermerSite();
        LinearLayout col = Ui.colonne(this);
        col.setBackgroundColor(Ui.FOND);
        LinearLayout barre = Ui.ligne(this);
        barre.setBackgroundColor(Ui.VERT_FONCE);
        barre.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
        TextView retour = Ui.texte(this, "←  Retour à l'appli", 15, Color.WHITE, true);
        retour.setOnClickListener(v -> fermerSite());
        barre.addView(retour, Ui.poids(1));
        col.addView(barre);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return externe(r.getUrl()); }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String u) { return externe(Uri.parse(u)); }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.setDownloadListener((u, agent, disposition, type, taille) -> ouvrirExterne(Uri.parse(u)));
        col.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        web.loadUrl(url);
        site = col;
        racine.addView(site, plein());
        luminosite();
    }

    private void fermerSite() {
        retirer(site);
        site = null;
        if (web != null) web.destroy();
        web = null;
        luminosite();
    }

    private boolean externe(Uri u) {
        String sc = u.getScheme() == null ? "" : u.getScheme(), h = u.getHost() == null ? "" : u.getHost();
        if ((sc.equals("https") || sc.equals("http")) && (h.equals("script.google.com")
                || h.endsWith(".googleusercontent.com") || h.equals("accounts.google.com"))) return false;
        ouvrirExterne(u);
        return true;
    }

    private void ouvrirExterne(Uri u) {
        try {
            Intent i = "intent".equals(u.getScheme()) ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            message("Impossible d'ouvrir ce lien sur ce téléphone.");
        }
    }

    // ================================================================== verrouillage par code
    private void reglerCode() {
        if (donnees.aUnCode()) {
            new AlertDialog.Builder(this).setTitle("Verrouillage par code")
                    .setMessage("Le verrouillage est activé : l'appli demande votre code à l'ouverture et après une minute en arrière-plan.")
                    .setPositiveButton("Désactiver", (d, w) -> { donnees.retirerCode(); message("Verrouillage désactivé."); afficher(); })
                    .setNegativeButton("Garder", null).show();
            return;
        }
        LinearLayout f = Ui.colonne(this);
        final EditText c1 = champCode("Nouveau code (4 à 6 chiffres)"), c2 = champCode("Confirmez le code");
        f.addView(c1);
        f.addView(c2);
        new AlertDialog.Builder(this).setTitle("Protéger l'appli par un code")
                .setMessage("Vos cotisations et vos reçus seront protégés si quelqu'un d'autre utilise votre téléphone.")
                .setView(encadrer(f))
                .setPositiveButton("Activer", (d, w) -> {
                    String a = c1.getText().toString(), b = c2.getText().toString();
                    if (!a.matches("\\d{4,6}")) message("Le code doit compter 4 à 6 chiffres.");
                    else if (!a.equals(b)) message("Les deux codes sont différents.");
                    else { donnees.definirCode(a); message("Verrouillage activé."); afficher(); }
                })
                .setNegativeButton("Annuler", null).show();
    }

    private EditText champCode(String indice) {
        EditText e = new EditText(this);
        e.setHint(indice);
        e.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        return e;
    }

    private void verrouiller() {
        if (verrouille) return;
        verrouille = true;
        LinearLayout col = Ui.colonne(this);
        col.setGravity(Gravity.CENTER_HORIZONTAL);
        col.setPadding(Ui.dp(32), Ui.dp(90), Ui.dp(32), Ui.dp(32));
        col.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Ui.VERT, Ui.VERT_FONCE}));
        col.setClickable(true);
        FrameLayout rond = new FrameLayout(this);
        rond.setBackground(Ui.arrondi(0x26FFFFFF, Ui.dp(40)));
        rond.addView(new Icone(this, Icone.CADENAS, Ui.OR), new FrameLayout.LayoutParams(Ui.dp(40), Ui.dp(40), Gravity.CENTER));
        col.addView(rond, new LinearLayout.LayoutParams(Ui.dp(80), Ui.dp(80)));
        TextView t = Ui.texte(this, "AMEDIS Asso est verrouillée", 21, Color.WHITE, true);
        t.setPadding(0, Ui.dp(18), 0, Ui.dp(6));
        col.addView(t);
        col.addView(Ui.texte(this, "Saisissez votre code pour continuer.", 14.5f, 0xFFCFE7DA, false));
        final EditText code = champCode("Code");
        code.setGravity(Gravity.CENTER);
        code.setTextColor(Color.WHITE);
        code.setHintTextColor(0x99FFFFFF);
        code.setTextSize(24);
        code.setLetterSpacing(0.4f);
        col.addView(code, Ui.large(Ui.dp(24)));
        col.addView(bouton("Déverrouiller", true, v -> {
            if (donnees.codeJuste(code.getText().toString())) deverrouiller();
            else { code.setText(""); message("Code incorrect."); }
        }), Ui.large(Ui.dp(14)));
        TextView oubli = Ui.texte(this, "Code oublié ?", 14, 0xFFCFE7DA, true);
        oubli.setPadding(0, Ui.dp(22), 0, 0);
        oubli.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Code oublié")
                .setMessage("Pour retrouver l'accès, les informations enregistrées sur ce téléphone seront effacées. "
                        + "Vous scannerez ensuite de nouveau votre code QR.")
                .setPositiveButton("Effacer et recommencer", (d, w) -> { donnees.toutEffacer(); demarches.oublier(); DEM = null; deverrouiller(); M = null; AS = null; montrerBienvenue(); })
                .setNegativeButton("Annuler", null).show());
        col.addView(oubli);
        verrou = col;
        racine.addView(verrou, plein());
    }

    private void deverrouiller() {
        verrouille = false;
        retirer(verrou);
        verrou = null;
    }

    private void oublier() {
        new AlertDialog.Builder(this).setTitle("Changer de membre ou d'association")
                .setMessage("Les liens et les informations enregistrés sur ce téléphone seront effacés. "
                        + "Vous pourrez ensuite scanner un nouveau code QR.")
                .setPositiveButton("Effacer", (d, w) -> {
                    donnees.toutEffacer();
                    demarches.oublier();
                    DEM = null;
                    bureau.oublier();
                    MSG = null;
                    CTX = null;
                    arreterLecture();
                    getSharedPreferences("amedis", MODE_PRIVATE).edit().remove("recusVus").apply();
                    CookieManager.getInstance().removeAllCookies(null);
                    M = null;
                    AS = null;
                    erreur = null;
                    horsLigne = false;
                    onglet = T_ACCUEIL;
                    majBarre();
                    afficher();
                    montrerBienvenue();
                })
                .setNegativeButton("Annuler", null).show();
    }

    // ================================================================== MENU LATÉRAL (sur le modèle de l'appli PAI Secondaire)
    private void construireTiroir() {
        if (tiroir != null) retirer(tiroir);
        tiroir = new FrameLayout(this);
        View voile = new View(this);
        voile.setBackgroundColor(0x88000000);
        voile.setOnClickListener(v -> fermerTiroir());
        tiroir.addView(voile, plein());
        ScrollView sc = new ScrollView(this);
        sc.setBackgroundColor(Ui.CARTE);
        sc.setFillViewport(true);
        sc.setElevation(Ui.dp(12));
        panneau = Ui.colonne(this);
        sc.addView(panneau);
        int largeur = Math.min(Ui.dp(320), (int) (getResources().getDisplayMetrics().widthPixels * 0.84));
        tiroir.addView(sc, new FrameLayout.LayoutParams(largeur, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.START));
        tiroir.setVisibility(View.GONE);
        racine.addView(tiroir, plein());
    }

    private boolean tiroirOuvert() { return tiroir != null && tiroir.getVisibility() == View.VISIBLE; }

    private void ouvrirTiroir() {
        if (bienvenue != null || verrouille) return;
        remplirTiroir();
        tiroir.setVisibility(View.VISIBLE);
        View p = (View) panneau.getParent();
        p.setTranslationX(-Ui.dp(330));
        p.animate().translationX(0).setDuration(220).start();
        tiroir.getChildAt(0).setAlpha(0f);
        tiroir.getChildAt(0).animate().alpha(1f).setDuration(220).start();
    }

    private void fermerTiroir() {
        if (!tiroirOuvert()) return;
        View p = (View) panneau.getParent();
        p.animate().translationX(-Ui.dp(330)).setDuration(180).withEndAction(() -> tiroir.setVisibility(View.GONE)).start();
        tiroir.getChildAt(0).animate().alpha(0f).setDuration(180).start();
    }

    private void remplirTiroir() {
        panneau.removeAllViews();
        JSONObject asso = M == null ? null : M.optJSONObject("asso");
        LinearLayout tete = Ui.ligne(this);
        tete.setPadding(Ui.dp(20), Ui.dp(24), Ui.dp(16), Ui.dp(18));
        ImageView logo = new ImageView(this);
        Bitmap bl = asso == null ? null : Ui.image(asso.optString("logo", ""));
        if (bl != null) logo.setImageBitmap(Ui.rond(bl, Ui.dp(50)));
        else logo.setImageBitmap(Ui.initiales("A", Ui.dp(50)));
        tete.addView(logo, new LinearLayout.LayoutParams(Ui.dp(50), Ui.dp(50)));
        tete.addView(Ui.espace(this, Ui.dp(14)));
        LinearLayout tt = Ui.colonne(this);
        tt.addView(Ui.texte(this, asso == null ? "AMEDIS Asso" : asso.optString("nom", "AMEDIS Asso"), 17, Ui.TEXTE, true));
        tt.addView(Ui.texte(this, "Espace des membres" + (asso != null && asso.has("exercice") ? " · " + asso.optString("exercice") : ""), 13, Ui.DOUX, false));
        tete.addView(tt, Ui.poids(1));
        panneau.addView(tete);
        trait(panneau);

        rubrique("Pilotage");
        entree(T_ACCUEIL, null);
        entree(T_MESSAGES, pastilleMsg);
        rubrique("Mon espace");
        entree(T_RECUS, pastilleRecus);
        entree(T_DEMARCHES, pastilleDem);
        entree(T_CARTE, null);
        if (estTresorier()) {
            rubrique("Gestion");
            entree(T_G_ENC, null);
            entree(T_G_DEP, null);
            entree(T_G_MEM, null);
            entree(T_G_REU, null);
            entree(T_G_SOL, null);
            entree(T_G_OPS, null);
        }
        rubrique("Plus");
        entree(T_ASSO, null);

        View ressort = new View(this);
        panneau.addView(ressort, new LinearLayout.LayoutParams(1, 0, 1f));
        trait(panneau);
        JSONObject moi = M == null ? null : M.optJSONObject("moi");
        LinearLayout pied = Ui.ligne(this);
        pied.setPadding(Ui.dp(20), Ui.dp(16), Ui.dp(16), Ui.dp(6));
        ImageView av = new ImageView(this);
        String ini = moi == null ? "?" : Ui.initialesDe(moi.optString("prenoms"), moi.optString("nom"));
        Bitmap ph = moi == null ? null : Ui.image(moi.optString("photo", ""));
        av.setImageBitmap(ph != null ? Ui.rond(ph, Ui.dp(46)) : carreInitiales(ini, Ui.dp(46)));
        pied.addView(av, new LinearLayout.LayoutParams(Ui.dp(46), Ui.dp(46)));
        pied.addView(Ui.espace(this, Ui.dp(14)));
        LinearLayout pt = Ui.colonne(this);
        pt.addView(Ui.texte(this, moi == null ? "Membre" : (moi.optString("nom") + " " + moi.optString("prenoms")).trim().toUpperCase(Locale.FRANCE), 15, Ui.TEXTE, true));
        String sous = moi == null ? "" : "N° " + moi.optString("i") + (fonction().isEmpty() ? "" : " · " + fonction());
        pt.addView(Ui.texte(this, sous, 12.5f, Ui.DOUX, false));
        pied.addView(pt, Ui.poids(1));
        panneau.addView(pied);
        TextView dec = Ui.texte(this, "Se déconnecter", 14.5f, Ui.TEXTE, false);
        dec.setPadding(Ui.dp(22), Ui.dp(14), Ui.dp(16), Ui.dp(22));
        dec.setOnClickListener(v -> { fermerTiroir(); oublier(); });
        panneau.addView(dec);
    }

    private Bitmap carreInitiales(String t, int taille) {
        Bitmap b = Bitmap.createBitmap(taille, taille, Bitmap.Config.ARGB_8888);
        android.graphics.Canvas cv = new android.graphics.Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(Ui.VERT);
        cv.drawRoundRect(new android.graphics.RectF(0, 0, taille, taille), taille * 0.24f, taille * 0.24f, p);
        p.setColor(Color.WHITE);
        p.setTextAlign(Paint.Align.CENTER);
        p.setTextSize(taille * 0.38f);
        p.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        cv.drawText(t, taille / 2f, taille / 2f - (p.descent() + p.ascent()) / 2, p);
        return b;
    }

    private void trait(LinearLayout parent) {
        View t = new View(this);
        t.setBackgroundColor(Ui.LIGNE);
        parent.addView(t, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1));
    }

    private void rubrique(String t) {
        TextView v = Ui.etiquette(this, t);
        v.setPadding(Ui.dp(26), Ui.dp(18), 0, Ui.dp(6));
        panneau.addView(v);
    }

    private void entree(final int t, View pastille) {
        LinearLayout l = Ui.ligne(this);
        l.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
        boolean actif = t == onglet;
        if (actif) l.setBackground(Ui.arrondi(Ui.VERT_PALE, Ui.dp(14)));
        l.addView(new Icone(this, ICONES_PAGES[t], actif ? Ui.VERT_TEXTE : Ui.DOUX), new LinearLayout.LayoutParams(Ui.dp(24), Ui.dp(24)));
        l.addView(Ui.espace(this, Ui.dp(16)));
        l.addView(Ui.texte(this, NOMS_MENU[t], 15.5f, actif ? Ui.VERT_TEXTE : Ui.TEXTE, actif), Ui.poids(1));
        if (pastille != null) {
            retirer(pastille);
            l.addView(pastille, new LinearLayout.LayoutParams(Ui.dp(10), Ui.dp(10)));
        }
        l.setOnClickListener(v -> { fermerTiroir(); choisir(t); });
        LinearLayout.LayoutParams lp = Ui.large(Ui.dp(2));
        lp.leftMargin = Ui.dp(10);
        lp.rightMargin = Ui.dp(10);
        panneau.addView(l, lp);
    }

    private View point() {
        View p = new View(this);
        p.setBackground(Ui.arrondi(Ui.ROUGE, Ui.dp(5)));
        p.setVisibility(View.GONE);
        return p;
    }

    // ================================================================== rôles (le site les contrôle aussi)
    private JSONObject role() {
        JSONObject r = M == null ? null : M.optJSONObject("role");
        return r == null ? new JSONObject() : r;
    }

    private String fonction() {
        JSONObject moi = M == null ? null : M.optJSONObject("moi");
        return moi == null ? "" : moi.optString("fonction", "").trim();
    }

    private boolean estBureau() {
        return role().optBoolean("bureau", fonction().toLowerCase(Locale.FRANCE).matches(".*(tr[ée]sori|pr[ée]sident|secr[ée]taire).*"));
    }

    private boolean estTresorier() {
        return role().optBoolean("tresorier", fonction().toLowerCase(Locale.FRANCE).matches(".*tr[ée]sori.*"));
    }

    private boolean fonctionBureau(String f) {
        return String.valueOf(f).toLowerCase(Locale.FRANCE).matches(".*(tr[ée]sori|pr[ée]sident|secr[ée]taire).*");
    }

    // ================================================================== MESSAGERIE
    private MediaRecorder enregistreur;
    private MediaPlayer lecteur;
    private String lectureId;
    private TextView lectureVue, etiquetteEnAttente;
    private File fichierVocal;
    private long debutEnreg;
    private int dureeVocal;

    private void pageMessages(LinearLayout page) {
        boolean bur = estBureau();
        titre(page, "Messagerie", bur ? "Écrivez ou parlez à un membre, à plusieurs ou à toute l'association"
                : "Les messages du Président, du Secrétaire général et du Trésorier");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!bureau.possible()) {
            inviterAccesComplet(corps, "La messagerie s'ouvre avec votre dossier personnel ou votre identifiant de membre.");
            return;
        }
        if (bur) {
            LinearLayout b = Ui.ligne(this);
            b.addView(boutonIcone(Icone.ENVELOPPE, "Message écrit", true, v -> composer(null, false)), Ui.poids(1));
            b.addView(Ui.espace(this, Ui.dp(10)));
            b.addView(boutonIcone(Icone.MICRO, "Message vocal", false, v -> composer(null, true)), Ui.poids(1));
            corps.addView(b, Ui.large(Ui.dp(12)));
        }
        int n = bureau.fileMsg().length();
        if (n > 0) corps.addView(info(Icone.NUAGE, n + (n > 1 ? " messages gardés" : " message gardé") + " sur le téléphone : envoi automatique au retour d'Internet."), Ui.large(Ui.dp(12)));
        JSONArray l = MSG == null ? null : MSG.optJSONArray("messages");
        if (l == null || l.length() == 0) {
            LinearLayout v = Ui.colonne(this);
            v.setGravity(Gravity.CENTER_HORIZONTAL);
            v.setPadding(Ui.dp(20), Ui.dp(44), Ui.dp(20), Ui.dp(20));
            v.addView(rondIcone(Icone.ENVELOPPE, Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(72)));
            TextView t = Ui.texte(this, MSG == null ? "Chargement des messages…" : "Aucun message pour l'instant", 17, Ui.TEXTE, true);
            t.setPadding(0, Ui.dp(14), 0, Ui.dp(4));
            v.addView(t);
            TextView s = Ui.texte(this, bur ? "Vos messages et les réponses des membres apparaîtront ici."
                    : "Quand le bureau vous écrit, le message apparaît ici. Vous pourrez lui répondre par écrit ou par un message vocal.", 14, Ui.DOUX, false);
            s.setGravity(Gravity.CENTER);
            v.addView(s);
            corps.addView(v);
            return;
        }
        section(corps, "Messages (" + l.length() + ")");
        for (int i = 0; i < l.length(); i++) {
            JSONObject x = l.optJSONObject(i);
            if (x != null) corps.addView(carteMessage(x, bur), Ui.large(i == 0 ? 0 : Ui.dp(10)));
        }
    }

    private View carteMessage(final JSONObject x, boolean bur) {
        boolean moi = x.optBoolean("moi"), vocal = "vocal".equals(x.optString("type"));
        LinearLayout c = Ui.carte(this);
        LinearLayout l = Ui.ligne(this);
        l.addView(rondIcone(moi ? Icone.ENVOYER : vocal ? Icone.MICRO : Icone.ENVELOPPE, moi ? Ui.PISTE : Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(40)));
        l.addView(Ui.espace(this, Ui.dp(12)));
        LinearLayout t = Ui.colonne(this);
        String qui = moi ? "Vous → " + x.optString("pourNoms")
                : x.optString("deNom") + (x.optString("deFonction").isEmpty() ? "" : " · " + x.optString("deFonction"));
        t.addView(Ui.texte(this, qui, 15, Ui.TEXTE, true));
        t.addView(Ui.texte(this, Ui.moment(x.optString("le")) + (!moi && x.optBoolean("pourTous") ? " · à toute l'association" : ""), 12.5f, Ui.DOUX, false));
        l.addView(t, Ui.poids(1));
        c.addView(l);
        if (!x.optString("texte").isEmpty()) {
            TextView tx = Ui.texte(this, x.optString("texte"), 14.5f, Ui.TEXTE, false);
            tx.setTextIsSelectable(true);
            c.addView(tx, Ui.large(Ui.dp(10)));
        }
        if (x.optBoolean("audio")) c.addView(lecteurVocal(x.optString("id"), x.optInt("duree")), Ui.large(Ui.dp(10)));
        if (!moi && (bur || fonctionBureau(x.optString("deFonction")))) {
            LinearLayout b = Ui.ligne(this);
            b.addView(boutonIcone(Icone.ENVELOPPE, "Répondre", false, v -> composer(x, false)), Ui.poids(1));
            b.addView(Ui.espace(this, Ui.dp(10)));
            b.addView(boutonIcone(Icone.MICRO, "Réponse vocale", false, v -> composer(x, true)), Ui.poids(1));
            c.addView(b, Ui.large(Ui.dp(12)));
        }
        return c;
    }

    private View lecteurVocal(final String id, int duree) {
        LinearLayout l = Ui.ligne(this);
        l.setPadding(Ui.dp(10), Ui.dp(8), Ui.dp(14), Ui.dp(8));
        l.setBackground(Ui.arrondi(Ui.PISTE, Ui.dp(24)));
        l.addView(rondIcone(Icone.LECTURE, Ui.VERT, Color.WHITE, Ui.dp(36)));
        l.addView(Ui.espace(this, Ui.dp(12)));
        final TextView t = Ui.texte(this, "Message vocal · " + duree(duree), 14, Ui.TEXTE, true);
        l.addView(t, Ui.poids(1));
        l.setOnClickListener(v -> jouer(id, t, duree));
        return l;
    }

    private static String duree(long s) {
        return (s / 60) + ":" + String.format(Locale.US, "%02d", s % 60);
    }

    private void arreterLecture() {
        if (lecteur != null) {
            try { lecteur.stop(); } catch (Exception ignore) { /* déjà arrêté */ }
            lecteur.release();
            lecteur = null;
        }
        if (lectureVue != null) lectureVue.setText(lectureVue.getText().toString().replace("■ Lecture en cours", "Message vocal"));
        lectureId = null;
        lectureVue = null;
    }

    private void jouer(final String id, final TextView vue, final int duree) {
        if (id.equals(lectureId)) { arreterLecture(); return; }
        arreterLecture();
        final File f = new File(getCacheDir(), "vocal_" + id.replaceAll("[^\\w]", "") + ".m4a");
        vue.setText("Chargement… · " + duree(duree));
        fond.execute(() -> {
            String err = null;
            try {
                if (!f.exists() || f.length() == 0) {
                    byte[] b = Base64.decode(bureau.audio(id), Base64.DEFAULT);
                    try (FileOutputStream o = new FileOutputStream(f)) { o.write(b); }
                }
            } catch (Bureau.Refus e) {
                err = e.getMessage();
            } catch (Exception e) {
                err = "Pas de connexion Internet : le message vocal se télécharge à la première écoute.";
            }
            final String fe = err;
            ui.post(() -> {
                if (fe != null) { vue.setText("Message vocal · " + duree(duree)); message(fe); return; }
                try {
                    lecteur = new MediaPlayer();
                    lecteur.setDataSource(f.getAbsolutePath());
                    lecteur.setOnCompletionListener(mp -> arreterLecture());
                    lecteur.prepare();
                    lecteur.start();
                    lectureId = id;
                    lectureVue = vue;
                    vue.setText("■ Lecture en cours · " + duree(duree));
                } catch (Exception e) {
                    arreterLecture();
                    message("Lecture impossible sur ce téléphone.");
                }
            });
        });
    }

    private String nomExpediteur(JSONObject x) {
        return x.optString("deNom") + (x.optString("deFonction").isEmpty() ? "" : " (" + x.optString("deFonction") + ")");
    }

    /** Nouveau message (bureau) ou réponse ; écrit et/ou vocal. */
    private void composer(final JSONObject rep, boolean vocalDAbord) {
        final boolean bur = estBureau();
        if (rep == null && !bur) { message("Seuls le Président, le Secrétaire général et le Trésorier écrivent à l'association."); return; }
        final java.util.ArrayList<String> choisis = new java.util.ArrayList<>();
        final boolean[] tous = {true};
        LinearLayout f = Ui.colonne(this);
        final TextView dest = Ui.texte(this, "", 14.5f, Ui.VERT_TEXTE, true);
        dest.setPadding(0, Ui.dp(4), 0, Ui.dp(8));
        final Runnable majDest = () -> dest.setText(rep != null ? "À : " + nomExpediteur(rep)
                : tous[0] ? "À : toute l'association  ▾" : "À : " + choisis.size() + " membre(s) choisi(s)  ▾");
        majDest.run();
        if (rep == null) dest.setOnClickListener(v -> choisirDestinataires(choisis, tous, majDest));
        f.addView(dest);
        final EditText t = new EditText(this);
        t.setHint(rep == null ? "Votre message (facultatif avec un message vocal)" : "Votre réponse");
        t.setMinLines(3);
        t.setGravity(Gravity.TOP);
        t.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        f.addView(t);
        final TextView vocal = Ui.texte(this, "🎤  Enregistrer un message vocal (2 min 30 au plus)", 14.5f, Ui.VERT_TEXTE, true);
        vocal.setPadding(Ui.dp(12), Ui.dp(12), Ui.dp(12), Ui.dp(12));
        vocal.setBackground(Ui.bordure(Color.TRANSPARENT, Ui.VERT_TEXTE, Ui.dp(10)));
        f.addView(vocal, Ui.large(Ui.dp(10)));
        fichierVocal = null;
        dureeVocal = 0;
        vocal.setOnClickListener(v -> basculerEnregistrement(vocal));
        final AlertDialog d = new AlertDialog.Builder(this)
                .setTitle(rep == null ? "Nouveau message" : "Répondre")
                .setView(encadrer(f))
                .setPositiveButton("Envoyer", null)
                .setNegativeButton("Annuler", (x, w) -> arreterEnregistrement(null))
                .create();
        d.setOnShowListener(x -> d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w -> {
            if (enregistreur != null) arreterEnregistrement(vocal);
            String texte = t.getText().toString().trim();
            if (texte.isEmpty() && fichierVocal == null) { message("Écrivez un message ou enregistrez un message vocal."); return; }
            if (rep == null && !tous[0] && choisis.isEmpty()) { message("Choisissez au moins un destinataire."); return; }
            try {
                JSONObject m = new JSONObject();
                m.put("texte", texte);
                m.put("idAppli", Bureau.nouvelId());
                if (rep != null) {
                    m.put("reponseA", rep.optString("id"));
                    m.put("pour", new JSONArray());
                } else {
                    m.put("pour", tous[0] ? "TOUS" : new JSONArray(choisis));
                }
                if (fichierVocal != null && fichierVocal.exists()) {
                    m.put("audio", Base64.encodeToString(lireFichier(fichierVocal), Base64.NO_WRAP));
                    m.put("duree", dureeVocal);
                }
                d.dismiss();
                envoyerMessage(m);
            } catch (Exception e) {
                message("Message vocal illisible : recommencez l'enregistrement.");
            }
        }));
        d.show();
        if (vocalDAbord) basculerEnregistrement(vocal);
    }

    private static byte[] lireFichier(File f) throws java.io.IOException {
        java.io.ByteArrayOutputStream o = new java.io.ByteArrayOutputStream();
        try (java.io.FileInputStream in = new java.io.FileInputStream(f)) {
            byte[] b = new byte[16384];
            int n;
            while ((n = in.read(b)) > 0) o.write(b, 0, n);
        }
        return o.toByteArray();
    }

    private void choisirDestinataires(final java.util.ArrayList<String> choisis, final boolean[] tous, final Runnable majDest) {
        JSONArray a = MSG == null ? null : MSG.optJSONArray("annuaire");
        if (a == null || a.length() == 0) {
            message("Liste des membres indisponible : actualisez la messagerie avec Internet.");
            return;
        }
        new AlertDialog.Builder(this).setTitle("Destinataires")
                .setItems(new String[]{"Toute l'association", "Choisir des membres…"}, (dlg, w) -> {
                    if (w == 0) { tous[0] = true; choisis.clear(); majDest.run(); return; }
                    final String[] noms = new String[a.length()], ids = new String[a.length()];
                    final boolean[] coches = new boolean[a.length()];
                    for (int i = 0; i < a.length(); i++) {
                        JSONObject m = a.optJSONObject(i);
                        ids[i] = m.optString("i");
                        noms[i] = m.optString("nom") + "  (" + m.optString("i") + ")" + (m.optString("fonction").isEmpty() ? "" : " · " + m.optString("fonction"));
                        coches[i] = choisis.contains(ids[i]);
                    }
                    new AlertDialog.Builder(this).setTitle("Choisir les membres")
                            .setMultiChoiceItems(noms, coches, (d2, i, c) -> coches[i] = c)
                            .setPositiveButton("Valider", (d2, w2) -> {
                                choisis.clear();
                                for (int i = 0; i < ids.length; i++) if (coches[i]) choisis.add(ids[i]);
                                tous[0] = choisis.isEmpty();
                                majDest.run();
                            })
                            .setNegativeButton("Annuler", null).show();
                }).show();
    }

    private void basculerEnregistrement(final TextView etiquette) {
        if (enregistreur != null) { arreterEnregistrement(etiquette); return; }
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            etiquetteEnAttente = etiquette;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 41);
            return;
        }
        arreterLecture();
        try {
            fichierVocal = new File(getCacheDir(), "vocal_envoi.m4a");
            if (fichierVocal.exists()) fichierVocal.delete();
            enregistreur = new MediaRecorder();
            enregistreur.setAudioSource(MediaRecorder.AudioSource.MIC);
            enregistreur.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            enregistreur.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            enregistreur.setAudioEncodingBitRate(32000);
            enregistreur.setAudioSamplingRate(22050);
            enregistreur.setMaxDuration(150000);
            enregistreur.setOutputFile(fichierVocal.getAbsolutePath());
            enregistreur.setOnInfoListener((mr, quoi, extra) -> {
                if (quoi == MediaRecorder.MEDIA_RECORDER_INFO_MAX_DURATION_REACHED) arreterEnregistrement(etiquette);
            });
            enregistreur.prepare();
            enregistreur.start();
            debutEnreg = System.currentTimeMillis();
            etiquette.setTextColor(Ui.ROUGE);
            etiquette.setBackground(Ui.bordure(Ui.ROUGE_PALE, Ui.ROUGE, Ui.dp(10)));
            ui.post(new Runnable() {
                @Override
                public void run() {
                    if (enregistreur == null) return;
                    etiquette.setText("■  Arrêter l'enregistrement  " + duree((System.currentTimeMillis() - debutEnreg) / 1000));
                    ui.postDelayed(this, 500);
                }
            });
        } catch (Exception e) {
            if (enregistreur != null) enregistreur.release();
            enregistreur = null;
            fichierVocal = null;
            message("Enregistrement impossible sur ce téléphone.");
        }
    }

    private void arreterEnregistrement(TextView etiquette) {
        if (enregistreur == null) return;
        try { enregistreur.stop(); } catch (Exception e) { fichierVocal = null; }
        enregistreur.release();
        enregistreur = null;
        dureeVocal = (int) ((System.currentTimeMillis() - debutEnreg) / 1000);
        if (dureeVocal < 1) fichierVocal = null;
        if (etiquette != null) {
            etiquette.setTextColor(Ui.VERT_TEXTE);
            etiquette.setBackground(Ui.bordure(fichierVocal != null ? Ui.VERT_PALE : Color.TRANSPARENT, Ui.VERT_TEXTE, Ui.dp(10)));
            etiquette.setText(fichierVocal != null ? "✓  Message vocal prêt (" + duree(dureeVocal) + ") · toucher pour recommencer"
                    : "🎤  Enregistrer un message vocal (2 min 30 au plus)");
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] resultats) {
        super.onRequestPermissionsResult(code, permissions, resultats);
        if (code != 41) return;
        if (resultats.length > 0 && resultats[0] == PackageManager.PERMISSION_GRANTED && etiquetteEnAttente != null) basculerEnregistrement(etiquetteEnAttente);
        else message("Autorisez le micro pour envoyer un message vocal.");
        etiquetteEnAttente = null;
    }

    private void envoyerMessage(final JSONObject m) {
        enChargement(true);
        fond.execute(() -> {
            String msg;
            try {
                boolean ok = bureau.envoyerMessage(m);
                msg = ok ? "Message envoyé." : "Pas d'Internet : le message est gardé et partira tout seul.";
                try { MSG = bureau.boite(); } catch (Exception ignore) { /* affichage gardé */ }
            } catch (Bureau.Refus e) {
                msg = e.getMessage();
            } catch (Donnees.SiteAncien e) {
                msg = "Le site de l'association doit être mis à jour (version 1.9.0) pour la messagerie.";
            } catch (Exception e) {
                msg = "Pas d'Internet : un message vocal ne peut partir qu'avec une connexion. Réessayez plus tard.";
            }
            final String fm = msg;
            ui.post(() -> { enChargement(false); message(fm); afficher(); });
        });
    }

    /** Messagerie et opérations en arrière-plan : files hors connexion d'abord, puis boîte de réception. */
    private void synchroniserMessages() {
        if (!bureau.possible()) return;
        fond.execute(() -> {
            StringBuilder refus = new StringBuilder();
            int n = 0;
            JSONObject r = null;
            try {
                n = bureau.viderFiles(refus);
                r = bureau.boite();
            } catch (Exception ignore) { /* hors connexion ou site ancien */ }
            final JSONObject fr = r;
            final int fn = n;
            ui.post(() -> {
                if (fr != null) { MSG = fr; signalerMessages(); }
                if (fn > 0) message(fn + (fn > 1 ? " envois en attente sont partis." : " envoi en attente est parti."));
                if (refus.length() > 0) new AlertDialog.Builder(this).setTitle("Envoi refusé par le site")
                        .setMessage(refus.toString()).setPositiveButton("Compris", null).show();
                if (onglet == T_MESSAGES) { marquerMessagesVus(); afficher(); }
                else majBarre();
            });
        });
    }

    private String dernierRecu() {
        JSONArray l = MSG == null ? null : MSG.optJSONArray("messages");
        String max = "";
        for (int i = 0; l != null && i < l.length(); i++) {
            JSONObject x = l.optJSONObject(i);
            if (x != null && !x.optBoolean("moi") && x.optString("le").compareTo(max) > 0) max = x.optString("le");
        }
        return max;
    }

    private void signalerMessages() {
        String d = dernierRecu(), vus = getSharedPreferences("amedis", MODE_PRIVATE).getString("msgVus", null);
        if (vus == null) { getSharedPreferences("amedis", MODE_PRIVATE).edit().putString("msgVus", d).apply(); return; }
        if (d.compareTo(vus) > 0 && onglet != T_MESSAGES) {
            pastilleMsg.setVisibility(View.VISIBLE);
            message("Nouveau message du bureau dans la Messagerie.");
        }
    }

    private void marquerMessagesVus() {
        pastilleMsg.setVisibility(View.GONE);
        getSharedPreferences("amedis", MODE_PRIVATE).edit().putString("msgVus", dernierRecu()).apply();
    }

    // ================================================================== GESTION (trésorier) : opérations appliquées par le logiciel du PC
    private boolean ctxEnCours;
    private JSONObject encMembre, reuSaisie;
    private final java.util.LinkedHashMap<String, String> presences = new java.util.LinkedHashMap<>();
    private boolean modeDepense = true;

    private boolean gestionPrete(LinearLayout corps) {
        if (!estTresorier()) {
            corps.addView(info(Icone.CADENAS, "Réservé au trésorier de l'association."), Ui.large(Ui.dp(10)));
            return false;
        }
        if (bureau.codeOps() == null) {
            LinearLayout c = Ui.carte(this);
            LinearLayout l = Ui.ligne(this);
            l.addView(rondIcone(Icone.BOUCLIER, Ui.VERT_PALE, Ui.VERT_TEXTE, Ui.dp(44)));
            l.addView(Ui.espace(this, Ui.dp(12)));
            LinearLayout t = Ui.colonne(this);
            t.addView(Ui.texte(this, "Code d'opérations", 16, Ui.TEXTE, true));
            t.addView(Ui.texte(this, "Saisissez le code à 6 chiffres choisi dans AMEDIS pro Asso (Paramètres › Sécurité › Appli du trésorier). Il n'est demandé qu'une fois sur ce téléphone.", 13.5f, Ui.DOUX, false));
            l.addView(t, Ui.poids(1));
            c.addView(l);
            final EditText code = new EditText(this);
            code.setHint("Code à 6 chiffres");
            code.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
            code.setGravity(Gravity.CENTER);
            code.setTextSize(22);
            code.setLetterSpacing(0.3f);
            c.addView(code, Ui.large(Ui.dp(10)));
            c.addView(bouton("Valider", true, v -> testerCodeOps(code.getText().toString().trim())), Ui.large(Ui.dp(10)));
            corps.addView(c, Ui.large(Ui.dp(10)));
            return false;
        }
        if (CTX == null) {
            corps.addView(info(Icone.ACTUALISER, ctxEnCours ? "Chargement des listes (membres, cotisations, caisses)…" : "Listes indisponibles : vérifiez la connexion Internet puis tirez l'écran vers le bas."), Ui.large(Ui.dp(10)));
            if (!ctxEnCours) chargerContexte(true);
            return false;
        }
        return true;
    }

    private void testerCodeOps(final String code) {
        if (!code.matches("\\d{6}")) { message("Le code compte 6 chiffres."); return; }
        bureau.definirCodeOps(code);
        enChargement(true);
        fond.execute(() -> {
            String msg = null;
            try {
                CTX = bureau.contexte();
            } catch (Bureau.Refus e) {
                if (e.codeRefuse || e.getMessage().contains("pas activées")) bureau.oublierCodeOps();
                msg = e.getMessage();
            } catch (Donnees.SiteAncien e) {
                bureau.oublierCodeOps();
                msg = "Le site de l'association doit être mis à jour (version 1.9.0) pour les opérations du trésorier.";
            } catch (Exception e) {
                bureau.oublierCodeOps();
                msg = "Pas de connexion Internet : le code sera vérifié à la prochaine connexion.";
            }
            final String fm = msg;
            ui.post(() -> { enChargement(false); message(fm == null ? "Code accepté : la gestion est ouverte." : fm); afficher(); });
        });
    }

    private void chargerContexte(final boolean silencieux) {
        if (!estTresorier() || bureau.codeOps() == null || ctxEnCours) return;
        ctxEnCours = true;
        fond.execute(() -> {
            String msg = null;
            try {
                bureau.viderFiles(null);
                CTX = bureau.contexte();
            } catch (Bureau.Refus e) {
                if (e.codeRefuse) { bureau.oublierCodeOps(); CTX = null; }
                msg = e.getMessage();
            } catch (Donnees.SiteAncien e) {
                msg = "Le site de l'association doit être mis à jour (version 1.9.0) pour les opérations du trésorier.";
            } catch (Exception e) {
                if (CTX == null) CTX = bureau.contexteMemorise();
                if (!silencieux) msg = "Pas de connexion Internet : listes enregistrées affichées.";
            }
            final String fm = msg;
            ui.post(() -> {
                ctxEnCours = false;
                if (fm != null) message(fm);
                if (onglet >= T_G_ENC) afficher();
            });
        });
    }

    private void envoyerOp(final String type, final String resume, final JSONObject donnees, final Runnable apres) {
        if (CTX == null) return;
        try {
            final JSONObject o = new JSONObject();
            o.put("type", type);
            o.put("exercice", CTX.optString("exercice"));
            o.put("resume", resume);
            o.put("donnees", donnees);
            o.put("idAppli", Bureau.nouvelId());
            enChargement(true);
            fond.execute(() -> {
                String msg;
                boolean reussi = false;
                try {
                    boolean ok = bureau.envoyerOperation(o);
                    reussi = true;
                    msg = ok ? "Opération envoyée : le logiciel du PC l'appliquera dès qu'il sera ouvert, puis publiera le résultat."
                            : "Pas d'Internet : l'opération est gardée sur le téléphone et partira toute seule.";
                    try { CTX = bureau.contexte(); } catch (Exception ignore) { /* liste gardée */ }
                } catch (Bureau.Refus e) {
                    if (e.codeRefuse) { bureau.oublierCodeOps(); CTX = null; }
                    msg = e.getMessage();
                } catch (Donnees.SiteAncien e) {
                    msg = "Le site de l'association doit être mis à jour (version 1.9.0).";
                } catch (Exception e) {
                    msg = "Envoi impossible : réessayez plus tard.";
                }
                final String fm = msg;
                final boolean fr = reussi;
                ui.post(() -> {
                    enChargement(false);
                    if (fr && apres != null) apres.run();
                    new AlertDialog.Builder(this).setTitle(fr ? "C'est noté" : "Opération non envoyée").setMessage(fm)
                            .setPositiveButton("Compris", null).show();
                    afficher();
                });
            });
        } catch (Exception e) {
            message("Opération illisible.");
        }
    }

    // ---- petites briques de formulaire
    private View info(int icone, String texte) {
        LinearLayout b = Ui.ligne(this);
        b.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
        b.setBackground(Ui.arrondi(Ui.OR_PALE, Ui.dp(12)));
        b.addView(new Icone(this, icone, Ui.ORANGE), new LinearLayout.LayoutParams(Ui.dp(22), Ui.dp(22)));
        b.addView(Ui.espace(this, Ui.dp(10)));
        b.addView(Ui.texte(this, texte, 13.5f, Ui.TEXTE, false), Ui.poids(1));
        return b;
    }

    private View boutonIcone(int icone, String t, boolean principal, View.OnClickListener action) {
        LinearLayout b = Ui.ligne(this);
        b.setGravity(Gravity.CENTER);
        b.setPadding(Ui.dp(12), Ui.dp(12), Ui.dp(12), Ui.dp(12));
        b.setBackground(principal ? Ui.arrondi(Ui.OR, Ui.dp(12)) : Ui.bordure(Color.TRANSPARENT, Ui.VERT_TEXTE, Ui.dp(12)));
        b.addView(new Icone(this, icone, principal ? Ui.VERT_FONCE : Ui.VERT_TEXTE), new LinearLayout.LayoutParams(Ui.dp(20), Ui.dp(20)));
        b.addView(Ui.espace(this, Ui.dp(8)));
        b.addView(Ui.texte(this, t, 14.5f, principal ? Ui.VERT_FONCE : Ui.VERT_TEXTE, true));
        b.setOnClickListener(action);
        return b;
    }

    private void libelle(LinearLayout c, String t) {
        TextView v = Ui.etiquette(this, t);
        v.setPadding(0, Ui.dp(12), 0, Ui.dp(2));
        c.addView(v);
    }

    private EditText champ(String indice, int type, String valeur) {
        EditText e = new EditText(this);
        e.setHint(indice);
        e.setInputType(type);
        if (valeur != null) e.setText(valeur);
        return e;
    }

    private static String aujourdhui() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new java.util.Date());
    }

    private TextView champDate(String iso) {
        final TextView t = Ui.texte(this, Ui.date(iso), 15.5f, Ui.TEXTE, false);
        t.setTag(iso);
        t.setPadding(Ui.dp(12), Ui.dp(12), Ui.dp(12), Ui.dp(12));
        t.setBackground(Ui.bordure(Color.TRANSPARENT, Ui.LIGNE, Ui.dp(10)));
        t.setOnClickListener(v -> {
            String s = String.valueOf(t.getTag());
            int y = entier(s.substring(0, 4)), m = entier(s.substring(5, 7)), d = entier(s.substring(8, 10));
            new DatePickerDialog(this, (dp, yy, mm, dd) -> {
                String n = String.format(Locale.US, "%04d-%02d-%02d", yy, mm + 1, dd);
                t.setTag(n);
                t.setText(Ui.date(n));
            }, y, m - 1, d).show();
        });
        return t;
    }

    private String[] chaines(JSONArray a, String defaut) {
        if (a == null || a.length() == 0) return new String[]{defaut};
        String[] r = new String[a.length()];
        for (int i = 0; i < a.length(); i++) r[i] = a.optString(i);
        return r;
    }

    private String[] caissesCtx() {
        JSONArray a = CTX == null ? null : CTX.optJSONArray("caisses");
        return a == null || a.length() == 0 ? new String[]{"Espèces", "Wave", "Orange Money", "MTN MoMo", "Moov Money", "Banque"} : chaines(a, "Espèces");
    }

    private JSONObject membreCtx(String ident) {
        JSONArray a = CTX == null ? null : CTX.optJSONArray("membres");
        for (int i = 0; a != null && i < a.length(); i++) if (ident.equals(a.optJSONObject(i).optString("i"))) return a.optJSONObject(i);
        return null;
    }

    private static String nomDe(JSONObject m) {
        return (m.optString("nom") + " " + m.optString("prenoms")).trim();
    }

    private interface ChoixMembre { void choisi(JSONObject m); }

    /** Liste des membres avec recherche par nom ou numéro. */
    private void choisirMembre(final boolean actifsSeulement, final ChoixMembre apres) {
        JSONArray a = CTX == null ? null : CTX.optJSONArray("membres");
        if (a == null) return;
        final java.util.ArrayList<JSONObject> tous = new java.util.ArrayList<>(), vus = new java.util.ArrayList<>();
        for (int i = 0; i < a.length(); i++) if (!actifsSeulement || a.optJSONObject(i).optBoolean("actif", true)) tous.add(a.optJSONObject(i));
        LinearLayout f = Ui.colonne(this);
        final EditText q = champ("Rechercher un nom ou un numéro", InputType.TYPE_CLASS_TEXT, null);
        f.addView(q);
        final ListView lv = new ListView(this);
        final ArrayAdapter<String> ad = new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, new java.util.ArrayList<>());
        lv.setAdapter(ad);
        f.addView(lv, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, Ui.dp(360)));
        final Runnable filtrer = () -> {
            String s = q.getText().toString().trim().toLowerCase(Locale.FRANCE);
            vus.clear();
            ad.clear();
            for (JSONObject m : tous) {
                String lib = m.optString("i") + " — " + nomDe(m) + (m.optBoolean("actif", true) ? "" : " (inactif)");
                if (s.isEmpty() || lib.toLowerCase(Locale.FRANCE).contains(s)) { vus.add(m); ad.add(lib); }
            }
        };
        filtrer.run();
        q.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a1, int a2, int a3) { }
            public void onTextChanged(CharSequence s, int a1, int a2, int a3) { filtrer.run(); }
            public void afterTextChanged(Editable e) { }
        });
        final AlertDialog d = new AlertDialog.Builder(this).setTitle("Choisir le membre").setView(encadrer(f)).setNegativeButton("Annuler", null).create();
        lv.setOnItemClickListener((p, v, pos, id) -> { d.dismiss(); apres.choisi(vus.get(pos)); });
        d.show();
    }

    // ---- ENCAISSER
    private void pageEncaisser(LinearLayout page) {
        titre(page, "Encaisser", "Le reçu numéroté est émis par le logiciel du PC, puis publié au membre");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        LinearLayout c = Ui.carte(this);
        c.addView(Ui.etiquette(this, "Membre"));
        TextView ch = Ui.texte(this, encMembre == null ? "Choisir le membre  ▾" : encMembre.optString("i") + " — " + nomDe(encMembre) + "  ▾", 16.5f, Ui.VERT_TEXTE, true);
        ch.setPadding(0, Ui.dp(6), 0, Ui.dp(2));
        ch.setOnClickListener(v -> choisirMembre(true, m -> { encMembre = m; afficher(); }));
        c.addView(ch);
        corps.addView(c, Ui.large(Ui.dp(10)));
        if (encMembre == null) return;

        JSONArray cots = CTX.optJSONArray("cotisations"), mc = encMembre.optJSONArray("c");
        final java.util.ArrayList<Integer> idx = new java.util.ArrayList<>();
        final java.util.ArrayList<Spinner> periodes = new java.util.ArrayList<>();
        final java.util.ArrayList<EditText> montants = new java.util.ArrayList<>();
        section(corps, "Montants versés");
        for (int i = 0; cots != null && mc != null && i < cots.length() && i < mc.length(); i++) {
            JSONObject k = cots.optJSONObject(i), x = mc.optJSONObject(i);
            if (k == null || x == null || x.optBoolean("nc")) continue;
            LinearLayout kc = Ui.carte(this);
            LinearLayout l = Ui.ligne(this);
            l.addView(Ui.texte(this, k.optString("nom"), 15, Ui.TEXTE, true), Ui.poids(1));
            double r = x.optDouble("r", 0);
            l.addView(r > 0 ? Ui.puce(this, "Reste " + Ui.nombre(r), Ui.ROUGE_PALE, Ui.ROUGE) : Ui.puce(this, "À jour", Ui.VERT_PALE, Ui.VERT_TEXTE));
            kc.addView(l);
            JSONArray cols = k.optJSONArray("colonnes"), v = x.optJSONArray("v");
            Spinner sp = liste(chaines(cols, "—"));
            double attenduParPeriode = cols == null || cols.length() == 0 ? 0 : x.optDouble("a", 0) / cols.length();
            int j0 = 0;
            for (; cols != null && j0 < cols.length(); j0++) {
                double vj = v == null || v.isNull(j0) ? 0 : v.optDouble(j0, 0);
                if (vj <= 0 || (attenduParPeriode > 0 && vj < attenduParPeriode - 0.5)) break;
            }
            if (cols != null && j0 >= cols.length()) j0 = cols.length() - 1;
            sp.setSelection(Math.max(0, j0));
            LinearLayout l2 = Ui.ligne(this);
            l2.addView(sp, Ui.poids(1));
            l2.addView(Ui.espace(this, Ui.dp(8)));
            EditText mt = champ(r > 0 && attenduParPeriode > 0 ? Ui.nombre(Math.min(r, attenduParPeriode)) : "Montant", InputType.TYPE_CLASS_NUMBER, null);
            l2.addView(mt, Ui.poids(1));
            kc.addView(l2, Ui.large(Ui.dp(6)));
            corps.addView(kc, Ui.large(Ui.dp(8)));
            idx.add(i);
            periodes.add(sp);
            montants.add(mt);
        }
        LinearLayout pc = Ui.carte(this);
        libelle(pc, "Payé par (caisse)");
        final String[] cs = caissesCtx();
        final Spinner caisse = liste(cs);
        pc.addView(caisse);
        libelle(pc, "Date du paiement");
        final TextView date = champDate(aujourdhui());
        pc.addView(date);
        corps.addView(pc, Ui.large(Ui.dp(10)));
        corps.addView(boutonIcone(Icone.ENVOYER, "Encaisser et émettre le reçu", true, w -> {
            try {
                JSONArray lignes = new JSONArray();
                double total = 0;
                for (int n = 0; n < idx.size(); n++) {
                    double mt = Double.parseDouble("0" + montants.get(n).getText().toString().replaceAll("[^0-9.]", ""));
                    if (mt <= 0) continue;
                    JSONObject k = cots.optJSONObject(idx.get(n));
                    JSONObject li = new JSONObject();
                    li.put("index", idx.get(n));
                    li.put("nom", k.optString("nom"));
                    li.put("j", periodes.get(n).getSelectedItemPosition());
                    li.put("montant", mt);
                    lignes.put(li);
                    total += mt;
                }
                if (lignes.length() == 0) { message("Indiquez au moins un montant."); return; }
                final JSONObject dn = new JSONObject();
                dn.put("membre", encMembre.optString("i"));
                dn.put("lignes", lignes);
                dn.put("caisse", cs[caisse.getSelectedItemPosition()]);
                dn.put("date", String.valueOf(date.getTag()));
                final String resume = encMembre.optString("i") + " " + nomDe(encMembre) + " — " + Ui.argent(total, monnaie());
                confirmer("Encaisser " + Ui.argent(total, monnaie()) + " ?", nomDe(encMembre) + " · " + cs[caisse.getSelectedItemPosition()]
                        + "\n\nLe reçu sera émis par le logiciel du PC et publié au membre.", () -> envoyerOp("encaissement", resume, dn, () -> encMembre = null));
            } catch (Exception e) {
                message("Montant invalide.");
            }
        }), Ui.large(Ui.dp(14)));
    }

    // ---- DÉPENSES ET DONS
    private void pageDepenses(LinearLayout page) {
        titre(page, "Dépenses et dons", "Saisie enregistrée dans le logiciel du PC, avec sa caisse");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        LinearLayout choix = Ui.ligne(this);
        choix.addView(boutonIcone(Icone.PIECES, "Dépense", modeDepense, v -> { modeDepense = true; afficher(); }), Ui.poids(1));
        choix.addView(Ui.espace(this, Ui.dp(10)));
        choix.addView(boutonIcone(Icone.COEUR, "Don reçu", !modeDepense, v -> { modeDepense = false; afficher(); }), Ui.poids(1));
        corps.addView(choix, Ui.large(Ui.dp(10)));
        LinearLayout c = Ui.carte(this);
        libelle(c, "Désignation");
        final EditText des = champ(modeDepense ? "ex. Achat de chaises" : "ex. Don du parrain", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES, null);
        c.addView(des);
        libelle(c, "Montant (" + monnaie() + ")");
        final EditText mt = champ("0", InputType.TYPE_CLASS_NUMBER, null);
        c.addView(mt);
        final String[] cats = chaines(CTX.optJSONArray("categories"), "Divers");
        final Spinner cat = liste(cats);
        final EditText donateur = champ("Nom du donateur (facultatif)", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS, null);
        if (modeDepense) { libelle(c, "Catégorie"); c.addView(cat); }
        else { libelle(c, "Donateur"); c.addView(donateur); }
        libelle(c, modeDepense ? "Payé par (caisse)" : "Reçu dans (caisse)");
        final String[] cs = caissesCtx();
        final Spinner caisse = liste(cs);
        c.addView(caisse);
        libelle(c, "Date");
        final TextView date = champDate(aujourdhui());
        c.addView(date);
        corps.addView(c, Ui.large(Ui.dp(10)));
        corps.addView(boutonIcone(Icone.ENVOYER, modeDepense ? "Enregistrer la dépense" : "Enregistrer le don", true, w -> {
            String d = des.getText().toString().trim();
            double m;
            try { m = Double.parseDouble(mt.getText().toString().replaceAll("[^0-9.]", "")); } catch (Exception e) { m = 0; }
            if (d.isEmpty()) { message("Indiquez la désignation."); return; }
            if (m <= 0) { message("Indiquez un montant supérieur à 0."); return; }
            try {
                JSONObject dn = new JSONObject();
                dn.put("designation", d);
                dn.put("montant", m);
                dn.put("caisse", cs[caisse.getSelectedItemPosition()]);
                dn.put("date", String.valueOf(date.getTag()));
                if (modeDepense) dn.put("categorie", cats[cat.getSelectedItemPosition()]);
                else dn.put("donateur", donateur.getText().toString().trim());
                final double fm = m;
                confirmer((modeDepense ? "Dépense de " : "Don de ") + Ui.argent(m, monnaie()) + " ?", d,
                        () -> envoyerOp(modeDepense ? "depense" : "don", d + " — " + Ui.argent(fm, monnaie()), dn, null));
            } catch (Exception e) {
                message("Saisie invalide.");
            }
        }), Ui.large(Ui.dp(14)));
    }

    // ---- MEMBRES
    private void pageMembres(LinearLayout page) {
        titre(page, "Membres", "Ajout et mise à jour, appliqués par le logiciel du PC");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        corps.addView(boutonIcone(Icone.PLUS, "Ajouter un membre", true, v -> ficheMembre(null)), Ui.large(Ui.dp(10)));
        final EditText q = champ("Rechercher un nom ou un numéro", InputType.TYPE_CLASS_TEXT, null);
        corps.addView(q, Ui.large(Ui.dp(10)));
        final LinearLayout liste = Ui.colonne(this);
        corps.addView(liste);
        final JSONArray a = CTX.optJSONArray("membres");
        final Runnable remplir = () -> {
            liste.removeAllViews();
            String s = q.getText().toString().trim().toLowerCase(Locale.FRANCE);
            int n = 0;
            for (int i = 0; a != null && i < a.length() && n < 80; i++) {
                final JSONObject m = a.optJSONObject(i);
                String lib = m.optString("i") + " " + nomDe(m) + " " + m.optString("fonction");
                if (!s.isEmpty() && !lib.toLowerCase(Locale.FRANCE).contains(s)) continue;
                n++;
                LinearLayout l = Ui.ligne(this);
                l.setPadding(Ui.dp(14), Ui.dp(12), Ui.dp(14), Ui.dp(12));
                l.setBackground(Ui.bordure(Ui.CARTE, Ui.LIGNE, Ui.dp(12)));
                LinearLayout t = Ui.colonne(this);
                t.addView(Ui.texte(this, nomDe(m), 15, m.optBoolean("actif", true) ? Ui.TEXTE : Ui.DOUX, true));
                t.addView(Ui.texte(this, m.optString("i") + (m.optString("fonction").isEmpty() ? "" : " · " + m.optString("fonction"))
                        + (m.optString("contact").isEmpty() ? "" : " · " + m.optString("contact")), 12.5f, Ui.DOUX, false));
                l.addView(t, Ui.poids(1));
                if (!m.optBoolean("actif", true)) l.addView(Ui.puce(this, "Inactif", Ui.PISTE, Ui.DOUX));
                l.setOnClickListener(v -> ficheMembre(m));
                liste.addView(l, Ui.large(Ui.dp(8)));
            }
            if (n == 0) liste.addView(Ui.texte(this, "Aucun membre trouvé.", 14, Ui.DOUX, false), Ui.large(Ui.dp(12)));
        };
        remplir.run();
        q.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int a1, int a2, int a3) { }
            public void onTextChanged(CharSequence s, int a1, int a2, int a3) { remplir.run(); }
            public void afterTextChanged(Editable e) { }
        });
    }

    private void ficheMembre(final JSONObject m) {
        final boolean nouveau = m == null;
        LinearLayout f = Ui.colonne(this);
        final EditText nom = champ("Nom", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS, nouveau ? null : m.optString("nom"));
        final EditText pre = champ("Prénoms", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS, nouveau ? null : m.optString("prenoms"));
        final EditText tel = champ("Contact (téléphone)", InputType.TYPE_CLASS_PHONE, nouveau ? null : m.optString("contact"));
        final EditText res = champ("Quartier / résidence", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS, nouveau ? null : m.optString("residence"));
        final EditText fon = champ("Fonction (facultatif)", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES, nouveau ? null : m.optString("fonction"));
        final String[] genres = {"Genre à préciser", "Homme", "Femme"};
        final Spinner genre = liste(genres);
        String g = nouveau ? "" : m.optString("genre");
        genre.setSelection("H".equals(g) ? 1 : "F".equals(g) ? 2 : 0);
        final CheckBox actif = new CheckBox(this);
        actif.setText("Membre actif");
        actif.setChecked(nouveau || m.optBoolean("actif", true));
        f.addView(nom); f.addView(pre); f.addView(genre); f.addView(tel); f.addView(res); f.addView(fon);
        if (!nouveau) f.addView(actif);
        ScrollView sc = new ScrollView(this);
        sc.addView(encadrer(f));
        new AlertDialog.Builder(this).setTitle(nouveau ? "Ajouter un membre" : "Membre " + m.optString("i")).setView(sc)
                .setPositiveButton(nouveau ? "Ajouter" : "Enregistrer", (d, w) -> {
                    try {
                        String gs = genre.getSelectedItemPosition() == 1 ? "H" : genre.getSelectedItemPosition() == 2 ? "F" : "";
                        if (nouveau) {
                            if (nom.getText().toString().trim().isEmpty()) { message("Indiquez le nom du membre."); return; }
                            JSONObject dn = new JSONObject();
                            dn.put("nom", nom.getText().toString().trim());
                            dn.put("prenoms", pre.getText().toString().trim());
                            dn.put("genre", gs);
                            dn.put("contact", tel.getText().toString().trim());
                            dn.put("residence", res.getText().toString().trim());
                            dn.put("fonction", fon.getText().toString().trim());
                            dn.put("dateAdhesion", aujourdhui());
                            envoyerOp("membre_ajout", "Nouveau : " + (dn.optString("nom").toUpperCase(Locale.FRANCE) + " " + dn.optString("prenoms")).trim(), dn, null);
                        } else {
                            JSONObject ch = new JSONObject();
                            String[][] champs = {{"nom", nom.getText().toString().trim()}, {"prenoms", pre.getText().toString().trim()},
                                    {"contact", tel.getText().toString().trim()}, {"residence", res.getText().toString().trim()}, {"fonction", fon.getText().toString().trim()}};
                            for (String[] c : champs) if (!c[1].equals(m.optString(c[0]))) ch.put(c[0], c[1]);
                            if (!gs.equals(m.optString("genre"))) ch.put("genre", gs);
                            if (actif.isChecked() != m.optBoolean("actif", true)) ch.put("actif", actif.isChecked());
                            if (ch.length() == 0) { message("Aucune modification."); return; }
                            JSONObject dn = new JSONObject();
                            dn.put("membre", m.optString("i"));
                            dn.put("champs", ch);
                            JSONArray noms = ch.names();
                            StringBuilder q = new StringBuilder();
                            for (int i = 0; noms != null && i < noms.length(); i++) q.append(i == 0 ? "" : ", ").append(noms.getString(i));
                            envoyerOp("membre_modif", m.optString("i") + " " + nomDe(m) + " : " + q, dn, null);
                        }
                    } catch (Exception e) {
                        message("Saisie invalide.");
                    }
                })
                .setNegativeButton("Annuler", null).show();
    }

    // ---- RÉUNIONS ET APPEL
    private static final String[] STATUTS = {"P", "R", "A", "E"};
    private static final String[] LIB_STATUTS = {"Présent", "Retard", "Absent", "Excusé"};

    private void pageReunions(LinearLayout page) {
        titre(page, "Réunions", reuSaisie == null ? "Appel des présents et amendes, appliqués par le logiciel du PC" : "Appel : touchez un membre pour changer son statut");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        if (reuSaisie == null) {
            corps.addView(boutonIcone(Icone.PLUS, "Nouvelle réunion et appel", true, v -> nouvelleReunion()), Ui.large(Ui.dp(10)));
            JSONArray r = CTX.optJSONArray("reunions");
            section(corps, "Réunions enregistrées");
            if (r == null || r.length() == 0) { corps.addView(Ui.texte(this, "Aucune réunion pour l'instant.", 14, Ui.DOUX, false)); return; }
            for (int i = r.length() - 1; i >= 0; i--) {
                final JSONObject u = r.optJSONObject(i);
                LinearLayout c = Ui.carte(this);
                c.addView(Ui.texte(this, u.optString("objet"), 15.5f, Ui.TEXTE, true));
                c.addView(Ui.texte(this, Ui.date(u.optString("date")) + (u.optString("lieu").isEmpty() ? "" : " · " + u.optString("lieu")) + " · " + u.optInt("n") + " présence(s) notée(s)", 13, Ui.DOUX, false));
                c.addView(bouton("Compléter l'appel", false, v -> {
                    reuSaisie = u;
                    presences.clear();
                    afficher();
                }), Ui.large(Ui.dp(10)));
                corps.addView(c, Ui.large(Ui.dp(10)));
            }
            return;
        }
        LinearLayout tete = Ui.carte(this);
        tete.addView(Ui.texte(this, reuSaisie.optString("objet"), 16, Ui.TEXTE, true));
        tete.addView(Ui.texte(this, Ui.date(reuSaisie.optString("date")) + (reuSaisie.optString("lieu").isEmpty() ? "" : " · " + reuSaisie.optString("lieu")), 13, Ui.DOUX, false));
        int[] nb = new int[4];
        for (String s : presences.values()) for (int k = 0; k < 4; k++) if (STATUTS[k].equals(s)) nb[k]++;
        tete.addView(Ui.texte(this, nb[0] + " présent(s) · " + nb[1] + " retard(s) · " + nb[2] + " absent(s) · " + nb[3] + " excusé(s)", 13.5f, Ui.VERT_TEXTE, true), Ui.large(Ui.dp(6)));
        corps.addView(tete, Ui.large(Ui.dp(10)));
        LinearLayout b = Ui.ligne(this);
        b.addView(bouton("Tous présents", false, v -> {
            JSONArray a = CTX.optJSONArray("membres");
            for (int i = 0; a != null && i < a.length(); i++) if (a.optJSONObject(i).optBoolean("actif", true) && !presences.containsKey(a.optJSONObject(i).optString("i"))) presences.put(a.optJSONObject(i).optString("i"), "P");
            afficher();
        }), Ui.poids(1));
        b.addView(Ui.espace(this, Ui.dp(8)));
        b.addView(bouton("Annuler", false, v -> { reuSaisie = null; presences.clear(); afficher(); }), Ui.poids(1));
        corps.addView(b, Ui.large(Ui.dp(10)));
        JSONArray a = CTX.optJSONArray("membres");
        for (int i = 0; a != null && i < a.length(); i++) {
            final JSONObject m = a.optJSONObject(i);
            if (!m.optBoolean("actif", true)) continue;
            final String id = m.optString("i"), st = presences.get(id);
            LinearLayout l = Ui.ligne(this);
            l.setPadding(Ui.dp(14), Ui.dp(10), Ui.dp(10), Ui.dp(10));
            l.setBackground(Ui.bordure(Ui.CARTE, Ui.LIGNE, Ui.dp(12)));
            LinearLayout t = Ui.colonne(this);
            t.addView(Ui.texte(this, nomDe(m), 14.5f, Ui.TEXTE, true));
            t.addView(Ui.texte(this, id, 12, Ui.DOUX, false));
            l.addView(t, Ui.poids(1));
            int k = st == null ? -1 : java.util.Arrays.asList(STATUTS).indexOf(st);
            int fondP = k == 0 ? Ui.VERT_PALE : k == 1 ? Ui.OR_PALE : k == 2 ? Ui.ROUGE_PALE : k == 3 ? Ui.PISTE : Ui.PISTE;
            int encre = k == 0 ? Ui.VERT_TEXTE : k == 1 ? Ui.ORANGE : k == 2 ? Ui.ROUGE : Ui.DOUX;
            l.addView(Ui.puce(this, k < 0 ? "— à noter" : LIB_STATUTS[k], fondP, encre));
            l.setOnClickListener(v -> {
                int n = st == null ? 0 : java.util.Arrays.asList(STATUTS).indexOf(st) + 1;
                if (n >= 4) presences.remove(id); else presences.put(id, STATUTS[n]);
                afficher();
            });
            corps.addView(l, Ui.large(Ui.dp(6)));
        }
        corps.addView(boutonIcone(Icone.ENVOYER, "Envoyer l'appel (" + presences.size() + ")", true, v -> {
            if (presences.isEmpty()) { message("Notez au moins une présence."); return; }
            try {
                JSONObject dn = new JSONObject();
                if (reuSaisie.has("id")) dn.put("reunionId", reuSaisie.optString("id"));
                dn.put("date", reuSaisie.optString("date"));
                dn.put("objet", reuSaisie.optString("objet"));
                dn.put("lieu", reuSaisie.optString("lieu"));
                dn.put("amendes", reuSaisie.optJSONObject("amendes") == null ? new JSONObject() : reuSaisie.optJSONObject("amendes"));
                JSONObject pr = new JSONObject();
                for (java.util.Map.Entry<String, String> e : presences.entrySet()) pr.put(e.getKey(), e.getValue());
                dn.put("presences", pr);
                envoyerOp("reunion", reuSaisie.optString("objet") + " du " + Ui.date(reuSaisie.optString("date")) + " : " + presences.size() + " présence(s)", dn,
                        () -> { reuSaisie = null; presences.clear(); });
            } catch (Exception e) {
                message("Appel illisible.");
            }
        }), Ui.large(Ui.dp(14)));
    }

    private void nouvelleReunion() {
        LinearLayout f = Ui.colonne(this);
        final EditText objet = champ("Objet (ex. Assemblée mensuelle)", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES, "Réunion mensuelle");
        final EditText lieu = champ("Lieu", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS, null);
        final TextView date = champDate(aujourdhui());
        final EditText amA = champ("Amende d'absence (" + monnaie() + ")", InputType.TYPE_CLASS_NUMBER, null);
        final EditText amR = champ("Amende de retard (" + monnaie() + ")", InputType.TYPE_CLASS_NUMBER, null);
        f.addView(objet); f.addView(date); f.addView(lieu); f.addView(amA); f.addView(amR);
        new AlertDialog.Builder(this).setTitle("Nouvelle réunion").setView(encadrer(f))
                .setPositiveButton("Faire l'appel", (d, w) -> {
                    try {
                        JSONObject u = new JSONObject();
                        u.put("objet", objet.getText().toString().trim().isEmpty() ? "Réunion" : objet.getText().toString().trim());
                        u.put("date", String.valueOf(date.getTag()));
                        u.put("lieu", lieu.getText().toString().trim());
                        JSONObject am = new JSONObject();
                        am.put("A", entier(amA.getText().toString()));
                        am.put("R", entier(amR.getText().toString()));
                        u.put("amendes", am);
                        reuSaisie = u;
                        presences.clear();
                        afficher();
                    } catch (Exception e) {
                        message("Saisie invalide.");
                    }
                }).setNegativeButton("Annuler", null).show();
    }

    // ---- SOLIDARITÉ
    private void pageSolidarite(LinearLayout page) {
        titre(page, "Solidarité", "Décès, naissance, mariage, maladie : contribution et aide remise");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        corps.addView(boutonIcone(Icone.PLUS, "Nouvel événement", true, v -> nouvelEvenement()), Ui.large(Ui.dp(10)));
        corps.addView(info(Icone.PIECES, "Les contributions des membres s'encaissent dans « Encaisser » : la cotisation « Solidarité — … » y apparaît après application par le PC."), Ui.large(Ui.dp(10)));
        JSONArray e = CTX.optJSONArray("evenements");
        section(corps, "Événements");
        if (e == null || e.length() == 0) { corps.addView(Ui.texte(this, "Aucun événement pour l'instant.", 14, Ui.DOUX, false)); return; }
        JSONObject types = CTX.optJSONObject("typesEvenement");
        for (int i = e.length() - 1; i >= 0; i--) {
            final JSONObject ev = e.optJSONObject(i);
            LinearLayout c = Ui.carte(this);
            LinearLayout l = Ui.ligne(this);
            l.addView(Ui.texte(this, ev.optString("libelle"), 15.5f, Ui.TEXTE, true), Ui.poids(1));
            l.addView(ev.optDouble("aide", 0) > 0 ? Ui.puce(this, "Aide remise", Ui.VERT_PALE, Ui.VERT_TEXTE) : Ui.puce(this, "Aide à remettre", Ui.OR_PALE, Ui.ORANGE));
            c.addView(l);
            String t = (types == null ? ev.optString("type") : types.optString(ev.optString("type"), ev.optString("type"))) + " · " + Ui.date(ev.optString("date"))
                    + (ev.optString("beneficiaire").isEmpty() ? "" : " · " + ev.optString("beneficiaire"))
                    + (ev.optDouble("contribution", 0) > 0 ? " · " + Ui.argent(ev.optDouble("contribution"), monnaie()) + " par membre" : "");
            c.addView(Ui.texte(this, t, 13, Ui.DOUX, false));
            if (ev.optDouble("aide", 0) > 0) c.addView(Ui.texte(this, "Aide remise : " + Ui.argent(ev.optDouble("aide"), monnaie()), 13.5f, Ui.VERT_TEXTE, true), Ui.large(Ui.dp(6)));
            else c.addView(bouton("Remettre l'aide", false, v -> remettreAide(ev)), Ui.large(Ui.dp(10)));
            corps.addView(c, Ui.large(Ui.dp(10)));
        }
    }

    private void nouvelEvenement() {
        JSONObject types = CTX.optJSONObject("typesEvenement");
        final String[] cles = {"deces", "naissance", "mariage", "maladie", "autre"};
        final String[] libs = new String[cles.length];
        for (int i = 0; i < cles.length; i++) libs[i] = types == null ? cles[i] : types.optString(cles[i], cles[i]);
        LinearLayout f = Ui.colonne(this);
        final Spinner type = liste(libs);
        final EditText lib = champ("Objet (ex. Décès du père de M. X)", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES, null);
        final EditText ben = champ("Bénéficiaire", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS, null);
        final TextView date = champDate(aujourdhui());
        final EditText con = champ("Contribution par membre (" + monnaie() + ", 0 si aucune)", InputType.TYPE_CLASS_NUMBER, null);
        f.addView(type); f.addView(lib); f.addView(ben); f.addView(date); f.addView(con);
        new AlertDialog.Builder(this).setTitle("Nouvel événement de solidarité").setView(encadrer(f))
                .setPositiveButton("Enregistrer", (d, w) -> {
                    String l = lib.getText().toString().trim();
                    if (l.isEmpty()) { message("Indiquez l'objet de l'événement."); return; }
                    try {
                        JSONObject dn = new JSONObject();
                        dn.put("type", cles[type.getSelectedItemPosition()]);
                        dn.put("libelle", l);
                        dn.put("beneficiaire", ben.getText().toString().trim());
                        dn.put("date", String.valueOf(date.getTag()));
                        dn.put("contribution", entier(con.getText().toString()));
                        envoyerOp("solidarite_evt", l, dn, null);
                    } catch (Exception e) {
                        message("Saisie invalide.");
                    }
                }).setNegativeButton("Annuler", null).show();
    }

    private void remettreAide(final JSONObject ev) {
        LinearLayout f = Ui.colonne(this);
        final EditText mt = champ("Montant remis (" + monnaie() + ")", InputType.TYPE_CLASS_NUMBER, null);
        final String[] cs = caissesCtx();
        final Spinner caisse = liste(cs);
        final TextView date = champDate(aujourdhui());
        f.addView(mt); f.addView(caisse); f.addView(date);
        new AlertDialog.Builder(this).setTitle("Remettre l'aide — " + ev.optString("libelle")).setView(encadrer(f))
                .setPositiveButton("Enregistrer", (d, w) -> {
                    int m = entier(mt.getText().toString());
                    if (m <= 0) { message("Indiquez le montant remis."); return; }
                    try {
                        JSONObject dn = new JSONObject();
                        dn.put("evenementId", ev.optString("id"));
                        dn.put("montant", m);
                        dn.put("caisse", cs[caisse.getSelectedItemPosition()]);
                        dn.put("date", String.valueOf(date.getTag()));
                        envoyerOp("solidarite_aide", "Aide « " + ev.optString("libelle") + " » — " + Ui.argent(m, monnaie()), dn, null);
                    } catch (Exception e) {
                        message("Saisie invalide.");
                    }
                }).setNegativeButton("Annuler", null).show();
    }

    // ---- OPÉRATIONS ENVOYÉES
    private void pageOperations(LinearLayout page) {
        titre(page, "Opérations envoyées", "Résultat de chaque opération, appliquée par le logiciel du PC");
        LinearLayout corps = marge(page);
        bandeauEtat(corps);
        if (!gestionPrete(corps)) return;
        corps.addView(info(Icone.ACTUALISER, "Une opération reste « En attente » tant que le logiciel AMEDIS pro Asso n'est pas ouvert sur le PC du trésorier avec Internet. Il l'applique alors, émet le reçu au besoin et publie."), Ui.large(Ui.dp(10)));
        JSONArray f = bureau.fileOps();
        if (f.length() > 0) {
            section(corps, "Sur le téléphone (pas encore envoyées)");
            for (int i = 0; i < f.length(); i++) {
                JSONObject o = f.optJSONObject(i);
                LinearLayout c = Ui.carte(this);
                c.addView(Ui.texte(this, o.optString("resume"), 14.5f, Ui.TEXTE, true));
                c.addView(Ui.puce(this, "Attend Internet", Ui.OR_PALE, Ui.ORANGE), Ui.large(Ui.dp(6)));
                corps.addView(c, Ui.large(Ui.dp(8)));
            }
        }
        JSONArray l = CTX.optJSONArray("operations");
        section(corps, "Envoyées au site");
        if (l == null || l.length() == 0) { corps.addView(Ui.texte(this, "Aucune opération pour l'instant.", 14, Ui.DOUX, false)); return; }
        for (int i = 0; i < l.length(); i++) {
            JSONObject o = l.optJSONObject(i);
            LinearLayout c = Ui.carte(this);
            LinearLayout r = Ui.ligne(this);
            r.addView(Ui.texte(this, o.optString("libelle"), 14.5f, Ui.TEXTE, true), Ui.poids(1));
            String st = o.optString("statut");
            r.addView("Appliquée".equals(st) ? Ui.puce(this, st, Ui.VERT_PALE, Ui.VERT_TEXTE) : "Rejetée".equals(st) ? Ui.puce(this, st, Ui.ROUGE_PALE, Ui.ROUGE) : Ui.puce(this, st, Ui.OR_PALE, Ui.ORANGE));
            c.addView(r);
            c.addView(Ui.texte(this, o.optString("resume"), 13.5f, Ui.TEXTE, false), Ui.large(Ui.dp(4)));
            c.addView(Ui.texte(this, "Envoyée le " + Ui.moment(o.optString("recueLe")) + (o.optString("resultat").isEmpty() ? "" : "\n" + o.optString("resultat")), 12.5f, Ui.DOUX, false), Ui.large(Ui.dp(4)));
            corps.addView(c, Ui.large(Ui.dp(8)));
        }
    }

    // ================================================================== tableau de bord : chiffres de l'association et raccourcis
    private void blocTresorier(LinearLayout corps) {
        if (!estTresorier()) return;
        section(corps, "Gestion rapide");
        LinearLayout r = Ui.ligne(this);
        r.addView(boutonIcone(Icone.PIECES, "Encaisser", true, v -> choisir(T_G_ENC)), Ui.poids(1));
        r.addView(Ui.espace(this, Ui.dp(8)));
        r.addView(boutonIcone(Icone.CALENDRIER, "Appel", false, v -> choisir(T_G_REU)), Ui.poids(1));
        corps.addView(r);
        LinearLayout r2 = Ui.ligne(this);
        r2.addView(boutonIcone(Icone.LISTE, "Dépense / don", false, v -> choisir(T_G_DEP)), Ui.poids(1));
        r2.addView(Ui.espace(this, Ui.dp(8)));
        r2.addView(boutonIcone(Icone.ENVELOPPE, "Message", false, v -> choisir(T_MESSAGES)), Ui.poids(1));
        corps.addView(r2, Ui.large(Ui.dp(8)));
    }

    // ================================================================== mise à jour de l'appli (GitHub, sans Play Store)
    private void verifierMaj(final boolean manuel) {
        final String depot = BuildConfig.DEPOT;
        if (depot == null || depot.isEmpty()) {
            if (manuel) message("Recherche de mise à jour non disponible pour cette version.");
            return;
        }
        if (manuel) message("Recherche d'une nouvelle version…");
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL("https://api.github.com/repos/" + depot + "/releases/latest").openConnection();
                c.setRequestProperty("Accept", "application/vnd.github+json");
                c.setConnectTimeout(10000);
                c.setReadTimeout(10000);
                if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                StringBuilder sb = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"))) {
                    String l;
                    while ((l = br.readLine()) != null) sb.append(l).append('\n');
                }
                JSONObject j = new JSONObject(sb.toString());
                final String version = j.optString("tag_name", "").replaceFirst("^[vV]", "");
                final String notes = j.optString("body", "");
                String apk = null;
                JSONArray a = j.optJSONArray("assets");
                for (int i = 0; a != null && i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    if (o.optString("name", "").toLowerCase(Locale.ROOT).endsWith(".apk")) {
                        apk = o.optString("browser_download_url", null);
                        break;
                    }
                }
                final String lienApk = apk;
                getSharedPreferences("amedis", MODE_PRIVATE).edit().putLong("majLe", System.currentTimeMillis()).apply();
                runOnUiThread(() -> {
                    if (isFinishing()) return;
                    if (lienApk != null && plusRecente(version, BuildConfig.VERSION_NAME)) {
                        new AlertDialog.Builder(this)
                                .setTitle("Nouvelle version " + version)
                                .setMessage("Une nouvelle version de l'appli est disponible." + (notes.isEmpty() ? "" : "\n\n" + notes)
                                        + "\n\nTéléchargez-la puis ouvrez le fichier pour l'installer : vos informations sont conservées.")
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
            int u = i < x.length ? entier(x[i]) : 0, v = i < y.length ? entier(y[i]) : 0;
            if (u != v) return u > v;
        }
        return false;
    }

    private static int entier(String s) {
        try { return Integer.parseInt(s.replaceAll("[^0-9]", "")); } catch (Exception e) { return 0; }
    }

    // ================================================================== outils
    /** Numéro WhatsApp international (Côte d'Ivoire : 225 + 10 chiffres). */
    static String numeroWhatsApp(String contact) {
        String d = String.valueOf(contact).split("[/,;]| et ")[0].replaceAll("[^\\d+]", "");
        if (d.isEmpty()) return "";
        if (d.startsWith("+")) d = d.substring(1);
        else if (d.startsWith("00")) d = d.substring(2);
        if (!d.startsWith("225") || d.length() <= 10) d = "225" + d;
        return d.length() >= 11 ? d : "";
    }

    private static String salutation() {
        int h = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    }

    private static String capitaliser(String s) {
        if (s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase(Locale.FRANCE) + s.substring(1).toLowerCase(Locale.FRANCE);
    }

    /** « JANVIER » -> « Janv », « Coti 1 » reste « Coti 1 ». */
    private static String abrege(String s) {
        String t = s == null ? "" : s.trim();
        if (t.matches("(?i)[a-zàâçéèêëîïôûùüÿ]+")) return capitaliser(t.length() > 4 ? t.substring(0, 4) : t);
        return t.length() <= 7 ? t : t.substring(0, 7);
    }

    private FrameLayout encadrer(View v) {
        FrameLayout f = new FrameLayout(this);
        f.setPadding(Ui.dp(20), Ui.dp(8), Ui.dp(20), 0);
        f.addView(v);
        return f;
    }

    private void retirer(View v) {
        if (v != null && v.getParent() != null) ((ViewGroup) v.getParent()).removeView(v);
    }

    private void message(String m) {
        Toast.makeText(this, m, Toast.LENGTH_LONG).show();
    }

    private FrameLayout.LayoutParams plein() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }
}
