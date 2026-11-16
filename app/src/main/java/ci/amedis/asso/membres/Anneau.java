package ci.amedis.asso.membres;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

/** Anneau de progression animé, avec le pourcentage au centre. */
final class Anneau extends View {
    private final Paint piste = new Paint(Paint.ANTI_ALIAS_FLAG), arc = new Paint(Paint.ANTI_ALIAS_FLAG),
            txt = new Paint(Paint.ANTI_ALIAS_FLAG), sous = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r = new RectF();
    private float part, affiche;
    private String legende = "";

    Anneau(Context c, int couleurPiste, int couleurArc, int couleurTexte) {
        super(c);
        for (Paint p : new Paint[]{piste, arc}) {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeCap(Paint.Cap.ROUND);
        }
        piste.setColor(couleurPiste);
        arc.setColor(couleurArc);
        txt.setColor(couleurTexte);
        txt.setTextAlign(Paint.Align.CENTER);
        txt.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        sous.setColor(couleurTexte);
        sous.setAlpha(190);
        sous.setTextAlign(Paint.Align.CENTER);
    }

    void valeur(double p, String legende) {
        part = (float) Math.max(0, Math.min(1, p));
        this.legende = legende == null ? "" : legende;
        ValueAnimator a = ValueAnimator.ofFloat(0, part);
        a.setDuration(900);
        a.setInterpolator(new DecelerateInterpolator());
        a.addUpdateListener(v -> {
            affiche = (Float) v.getAnimatedValue();
            invalidate();
        });
        a.start();
    }

    @Override
    protected void onDraw(Canvas cv) {
        float t = Math.min(getWidth(), getHeight()), e = t * 0.1f;
        piste.setStrokeWidth(e);
        arc.setStrokeWidth(e);
        r.set((getWidth() - t) / 2 + e / 2, (getHeight() - t) / 2 + e / 2,
                (getWidth() + t) / 2 - e / 2, (getHeight() + t) / 2 - e / 2);
        cv.drawArc(r, 0, 360, false, piste);
        if (affiche > 0.001f) cv.drawArc(r, -90, 360 * affiche, false, arc);
        txt.setTextSize(t * 0.24f);
        sous.setTextSize(t * 0.105f);
        float cx = getWidth() / 2f, cy = getHeight() / 2f;
        cv.drawText(Math.round(affiche * 100) + " %", cx, cy + t * 0.04f, txt);
        cv.drawText(legende, cx, cy + t * 0.2f, sous);
    }
}
