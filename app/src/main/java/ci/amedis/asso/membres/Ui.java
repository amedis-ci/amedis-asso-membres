package ci.amedis.asso.membres;

import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Couleurs (clair / sombre), mesures, textes et petites briques d'interface. */
final class Ui {
    static final int VERT = 0xFF0F6B45, VERT_FONCE = 0xFF0C4B32, OR = 0xFFD4A017, ROUGE = 0xFFB42318, ORANGE = 0xFFC0571B;
    static boolean sombre;
    static int FOND, CARTE, TEXTE, DOUX, LIGNE, PISTE, VERT_TEXTE, VERT_PALE, ROUGE_PALE, OR_PALE;
    private static float densite = 2f, echelle = 2f;

    private Ui() { }

    static void init(Context c) {
        sombre = (c.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        densite = c.getResources().getDisplayMetrics().density;
        echelle = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 1, c.getResources().getDisplayMetrics());
        if (sombre) {
            FOND = 0xFF0E1613; CARTE = 0xFF17221E; TEXTE = 0xFFE7F0EB; DOUX = 0xFF9DB3A8; LIGNE = 0xFF263630;
            PISTE = 0xFF263630; VERT_TEXTE = 0xFF5FD39B; VERT_PALE = 0xFF143A2A; ROUGE_PALE = 0xFF3B1A17; OR_PALE = 0xFF3A2F12;
        } else {
            FOND = 0xFFF2F6F3; CARTE = 0xFFFFFFFF; TEXTE = 0xFF1A2420; DOUX = 0xFF5D6E66; LIGNE = 0xFFE1E9E4;
            PISTE = 0xFFE4ECE7; VERT_TEXTE = VERT; VERT_PALE = 0xFFE3F3EA; ROUGE_PALE = 0xFFFDECEA; OR_PALE = 0xFFFFF4D6;
        }
    }

    static int dp(float v) { return Math.round(v * densite); }

    // ------------------------------------------------------------------ textes
    static TextView texte(Context c, CharSequence t, float taille, int couleur, boolean gras) {
        TextView v = new TextView(c);
        v.setText(t);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, taille);
        v.setTextColor(couleur);
        if (gras) v.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        v.setLineSpacing(0, 1.12f);
        return v;
    }

    static TextView etiquette(Context c, String t) {
        TextView v = texte(c, t.toUpperCase(Locale.FRANCE), 11.5f, DOUX, true);
        v.setLetterSpacing(0.06f);
        return v;
    }

    static TextView puce(Context c, String t, int fond, int couleur) {
        TextView v = texte(c, t, 12, couleur, true);
        v.setPadding(dp(10), dp(4), dp(10), dp(4));
        v.setBackground(arrondi(fond, dp(20)));
        return v;
    }

    // ------------------------------------------------------------------ surfaces
    static GradientDrawable arrondi(int couleur, int rayon) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(couleur);
        g.setCornerRadius(rayon);
        return g;
    }

    static GradientDrawable bordure(int fond, int trait, int rayon) {
        GradientDrawable g = arrondi(fond, rayon);
        g.setStroke(dp(1), trait);
        return g;
    }

    /** Carte blanche (ou sombre) à bords arrondis, contenu vertical. */
    static LinearLayout carte(Context c) {
        LinearLayout l = new LinearLayout(c);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(dp(16), dp(14), dp(16), dp(14));
        l.setBackground(bordure(CARTE, LIGNE, dp(16)));
        l.setElevation(sombre ? 0 : dp(1));
        return l;
    }

    static LinearLayout ligne(Context c) {
        LinearLayout l = new LinearLayout(c);
        l.setOrientation(LinearLayout.HORIZONTAL);
        l.setGravity(Gravity.CENTER_VERTICAL);
        return l;
    }

    static LinearLayout colonne(Context c) {
        LinearLayout l = new LinearLayout(c);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }

    static LinearLayout.LayoutParams large(int haut) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = haut;
        return lp;
    }

    static LinearLayout.LayoutParams poids(float p) {
        return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, p);
    }

    static View espace(Context c, int largeur) {
        View v = new View(c);
        v.setLayoutParams(new LinearLayout.LayoutParams(largeur, 1));
        return v;
    }

    /** Barre de progression horizontale (0..1) dans la couleur donnée. */
    static View barre(Context c, double part, int couleur) {
        LinearLayout piste = new LinearLayout(c);
        piste.setBackground(arrondi(PISTE, dp(4)));
        View plein = new View(c);
        plein.setBackground(arrondi(couleur, dp(4)));
        float p = (float) Math.max(0, Math.min(1, part));
        piste.addView(plein, new LinearLayout.LayoutParams(0, dp(8), p));
        View vide = new View(c);
        piste.addView(vide, new LinearLayout.LayoutParams(0, dp(8), 1 - p));
        piste.setLayoutParams(large(dp(10)));
        return piste;
    }

    // ------------------------------------------------------------------ nombres et dates
    static String argent(double n, String monnaie) {
        String s = String.format(Locale.FRANCE, "%,d", Math.round(n))
                .replace(' ', ' ').replace(' ', ' ');
        return s + " " + (monnaie == null || monnaie.isEmpty() ? "F CFA" : monnaie);
    }

    static String nombre(double n) {
        return String.format(Locale.FRANCE, "%,d", Math.round(n)).replace(' ', ' ').replace(' ', ' ');
    }

    /** "2019-01-05" -> "05/01/2019" ; texte laissé tel quel sinon. */
    static String date(String iso) {
        if (iso == null || iso.length() < 10 || iso.charAt(4) != '-') return iso == null ? "" : iso;
        return iso.substring(8, 10) + "/" + iso.substring(5, 7) + "/" + iso.substring(0, 4);
    }

    /** Horodatage ISO (UTC) -> "16/11/2026 à 14h59" à l'heure du téléphone. */
    static String moment(String iso) {
        try {
            SimpleDateFormat lu = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            lu.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date d = lu.parse(iso.substring(0, 19));
            return new SimpleDateFormat("dd/MM/yyyy 'à' HH'h'mm", Locale.FRANCE).format(d);
        } catch (Exception e) {
            return date(iso);
        }
    }

    static String moment(long ms) {
        return new SimpleDateFormat("dd/MM/yyyy 'à' HH'h'mm", Locale.FRANCE).format(new Date(ms));
    }

    // ------------------------------------------------------------------ images
    /** Image "data:image/...;base64,..." -> Bitmap (null si absente ou illisible). */
    static Bitmap image(String dataUrl) {
        try {
            if (dataUrl == null || dataUrl.isEmpty()) return null;
            int i = dataUrl.indexOf(',');
            byte[] b = Base64.decode(i >= 0 ? dataUrl.substring(i + 1) : dataUrl, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(b, 0, b.length);
        } catch (Exception e) {
            return null;
        }
    }

    /** Recadre une image en disque. */
    static Bitmap rond(Bitmap src, int taille) {
        if (src == null) return null;
        Bitmap sortie = Bitmap.createBitmap(taille, taille, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(sortie);
        int cote = Math.min(src.getWidth(), src.getHeight());
        Bitmap carre = Bitmap.createBitmap(src, (src.getWidth() - cote) / 2, (src.getHeight() - cote) / 2, cote, cote);
        Bitmap redim = Bitmap.createScaledBitmap(carre, taille, taille, true);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setShader(new BitmapShader(redim, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP));
        cv.drawCircle(taille / 2f, taille / 2f, taille / 2f, p);
        return sortie;
    }

    /** Pastille ronde avec les initiales, quand il n'y a pas de photo. */
    static Bitmap initiales(String texte, int taille) {
        Bitmap b = Bitmap.createBitmap(taille, taille, Bitmap.Config.ARGB_8888);
        Canvas cv = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(OR);
        cv.drawCircle(taille / 2f, taille / 2f, taille / 2f, p);
        p.setColor(VERT_FONCE);
        p.setTextAlign(Paint.Align.CENTER);
        p.setTextSize(taille * 0.38f);
        p.setTypeface(Typeface.DEFAULT_BOLD);
        cv.drawText(texte, taille / 2f, taille / 2f - (p.descent() + p.ascent()) / 2, p);
        return b;
    }

    static String initialesDe(String prenoms, String nom) {
        String a = prenoms == null ? "" : prenoms.trim(), b = nom == null ? "" : nom.trim();
        String r = (a.isEmpty() ? "" : a.substring(0, 1)) + (b.isEmpty() ? "" : b.substring(0, 1));
        return r.isEmpty() ? "?" : r.toUpperCase(Locale.FRANCE);
    }

    static int couleur(String hex, int defaut) {
        try { return Color.parseColor(hex); } catch (Exception e) { return defaut; }
    }

    static float sp() { return echelle; }
}
