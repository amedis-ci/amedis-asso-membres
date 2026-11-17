package ci.amedis.asso.membres;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.View;

/** Icônes dessinées au trait (grille de 24 x 24), sans fichier image. */
final class Icone extends View {
    static final int MAISON = 1, RECU = 2, CARTE = 3, GROUPE = 4, TEL = 5, MESSAGE = 6, OK = 7, ALERTE = 8,
            CADENAS = 9, QR = 10, ACTUALISER = 11, LIEN = 12, PERSONNE = 13, NUAGE = 14, BOUCLIER = 15,
            MENU = 16, TABLEAU = 17, ENVELOPPE = 18, CALENDRIER = 19, COEUR = 20, MICRO = 21, LECTURE = 22, PAUSE = 23,
            ENVOYER = 24, PIECES = 25, REGLAGES = 26, SORTIE = 27, LISTE = 28, PLUS = 29;

    private final int type;
    private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path chemin = new Path();
    private final RectF r = new RectF();

    Icone(Context c, int type, int couleur) {
        super(c);
        this.type = type;
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setColor(couleur);
    }

    void couleur(int c) {
        p.setColor(c);
        invalidate();
    }

    @Override
    protected void onDraw(Canvas cv) {
        float k = Math.min(getWidth(), getHeight()) / 24f;
        cv.save();
        cv.translate((getWidth() - 24 * k) / 2, (getHeight() - 24 * k) / 2);
        cv.scale(k, k);
        p.setStrokeWidth(1.9f);
        p.setStyle(type == LECTURE ? Paint.Style.FILL_AND_STROKE : Paint.Style.STROKE);
        chemin.reset();
        switch (type) {
            case MAISON:
                chemin.moveTo(3, 11); chemin.lineTo(12, 3.5f); chemin.lineTo(21, 11);
                chemin.moveTo(5.5f, 9.5f); chemin.lineTo(5.5f, 20); chemin.lineTo(18.5f, 20); chemin.lineTo(18.5f, 9.5f);
                chemin.moveTo(10, 20); chemin.lineTo(10, 14); chemin.lineTo(14, 14); chemin.lineTo(14, 20);
                break;
            case RECU:
                chemin.moveTo(6, 3); chemin.lineTo(18, 3); chemin.lineTo(18, 21); chemin.lineTo(15.5f, 19.3f);
                chemin.lineTo(13, 21); chemin.lineTo(10.5f, 19.3f); chemin.lineTo(8, 21); chemin.lineTo(6, 19.5f); chemin.close();
                chemin.moveTo(9, 8); chemin.lineTo(15, 8); chemin.moveTo(9, 11.5f); chemin.lineTo(15, 11.5f);
                chemin.moveTo(9, 15); chemin.lineTo(12.5f, 15);
                break;
            case CARTE:
                r.set(2.5f, 5, 21.5f, 19); chemin.addRoundRect(r, 2.5f, 2.5f, Path.Direction.CW);
                chemin.addCircle(8, 11, 2, Path.Direction.CW);
                chemin.moveTo(5, 16); chemin.quadTo(8, 13, 11, 16);
                chemin.moveTo(14, 10); chemin.lineTo(19, 10); chemin.moveTo(14, 13.5f); chemin.lineTo(18, 13.5f);
                break;
            case GROUPE:
                chemin.addCircle(9, 8, 3.2f, Path.Direction.CW);
                chemin.moveTo(3, 20); chemin.quadTo(3.5f, 13.5f, 9, 13.5f); chemin.quadTo(14.5f, 13.5f, 15, 20);
                chemin.addCircle(17, 9, 2.5f, Path.Direction.CW);
                chemin.moveTo(16.5f, 14); chemin.quadTo(20.5f, 14, 21, 19);
                break;
            case TEL:
                chemin.moveTo(5, 4); chemin.lineTo(9, 4); chemin.lineTo(10.5f, 8.5f); chemin.lineTo(8, 10);
                chemin.quadTo(9.5f, 13.5f, 14, 16); chemin.lineTo(15.5f, 13.5f); chemin.lineTo(20, 15);
                chemin.lineTo(20, 19); chemin.quadTo(20, 20.5f, 18.5f, 20.5f);
                chemin.quadTo(4, 19.5f, 3.5f, 5.5f); chemin.quadTo(3.5f, 4, 5, 4);
                break;
            case MESSAGE:
                chemin.moveTo(12, 3.5f); chemin.quadTo(20.5f, 3.5f, 20.5f, 11.5f); chemin.quadTo(20.5f, 19.5f, 12, 19.5f);
                chemin.quadTo(9.5f, 19.5f, 7.5f, 18.5f); chemin.lineTo(3.5f, 20.5f); chemin.lineTo(5, 16.5f);
                chemin.quadTo(3.5f, 14.5f, 3.5f, 11.5f); chemin.quadTo(3.5f, 3.5f, 12, 3.5f);
                break;
            case OK:
                chemin.addCircle(12, 12, 9, Path.Direction.CW);
                chemin.moveTo(7.5f, 12.5f); chemin.lineTo(10.5f, 15.5f); chemin.lineTo(16.5f, 9);
                break;
            case ALERTE:
                chemin.moveTo(12, 3.5f); chemin.lineTo(21, 19.5f); chemin.lineTo(3, 19.5f); chemin.close();
                chemin.moveTo(12, 9.5f); chemin.lineTo(12, 13.5f); chemin.moveTo(12, 16.6f); chemin.lineTo(12, 16.7f);
                break;
            case CADENAS:
                r.set(5, 10.5f, 19, 20.5f); chemin.addRoundRect(r, 2, 2, Path.Direction.CW);
                chemin.moveTo(8, 10.5f); chemin.lineTo(8, 7.5f); chemin.quadTo(8, 3.5f, 12, 3.5f);
                chemin.quadTo(16, 3.5f, 16, 7.5f); chemin.lineTo(16, 10.5f);
                chemin.moveTo(12, 14.5f); chemin.lineTo(12, 16.5f);
                break;
            case QR:
                r.set(3.5f, 3.5f, 10, 10); chemin.addRect(r, Path.Direction.CW);
                r.set(14, 3.5f, 20.5f, 10); chemin.addRect(r, Path.Direction.CW);
                r.set(3.5f, 14, 10, 20.5f); chemin.addRect(r, Path.Direction.CW);
                chemin.moveTo(14, 14); chemin.lineTo(14, 17); chemin.moveTo(17.5f, 14); chemin.lineTo(20.5f, 14);
                chemin.moveTo(17, 17.5f); chemin.lineTo(17, 20.5f); chemin.lineTo(20.5f, 20.5f);
                break;
            case ACTUALISER:
                r.set(4.5f, 4.5f, 19.5f, 19.5f); chemin.addArc(r, -40, 290);
                chemin.moveTo(19.5f, 3.5f); chemin.lineTo(18.2f, 7.8f); chemin.lineTo(14, 6.6f);
                break;
            case LIEN:
                chemin.moveTo(10, 14); chemin.lineTo(14, 10);
                chemin.moveTo(9, 11); chemin.lineTo(6.5f, 13.5f); chemin.quadTo(4, 16, 6.5f, 18.5f) ; chemin.quadTo(9, 20, 11, 18.5f); chemin.lineTo(13, 16.5f);
                chemin.moveTo(15, 13); chemin.lineTo(17.5f, 10.5f); chemin.quadTo(20, 8, 17.5f, 5.5f); chemin.quadTo(15, 4, 13, 5.5f); chemin.lineTo(11, 7.5f);
                break;
            case PERSONNE:
                chemin.addCircle(12, 8, 3.8f, Path.Direction.CW);
                chemin.moveTo(4.5f, 20.5f); chemin.quadTo(5, 13.5f, 12, 13.5f); chemin.quadTo(19, 13.5f, 19.5f, 20.5f);
                break;
            case NUAGE:
                chemin.moveTo(7, 18); chemin.quadTo(3, 18, 3, 14.5f); chemin.quadTo(3, 11, 6.5f, 11);
                chemin.quadTo(7.5f, 6, 12.5f, 6); chemin.quadTo(17, 6, 17.8f, 10.5f); chemin.quadTo(21, 11, 21, 14.3f);
                chemin.quadTo(21, 18, 17, 18); chemin.close();
                chemin.moveTo(4, 4); chemin.lineTo(20, 20);
                break;
            case BOUCLIER:
                chemin.moveTo(12, 3); chemin.lineTo(19.5f, 6); chemin.lineTo(19.5f, 11.5f);
                chemin.quadTo(19.5f, 18, 12, 21); chemin.quadTo(4.5f, 18, 4.5f, 11.5f); chemin.lineTo(4.5f, 6); chemin.close();
                chemin.moveTo(8.5f, 12); chemin.lineTo(11, 14.5f); chemin.lineTo(15.5f, 9.5f);
                break;
            case MENU:
                chemin.moveTo(4, 7); chemin.lineTo(20, 7); chemin.moveTo(4, 12); chemin.lineTo(20, 12); chemin.moveTo(4, 17); chemin.lineTo(20, 17);
                break;
            case TABLEAU:
                chemin.moveTo(4, 20); chemin.lineTo(20, 20);
                r.set(5.5f, 12, 8.5f, 20); chemin.addRect(r, Path.Direction.CW);
                r.set(10.5f, 6, 13.5f, 20); chemin.addRect(r, Path.Direction.CW);
                r.set(15.5f, 9.5f, 18.5f, 20); chemin.addRect(r, Path.Direction.CW);
                break;
            case ENVELOPPE:
                r.set(3, 5.5f, 21, 18.5f); chemin.addRoundRect(r, 2, 2, Path.Direction.CW);
                chemin.moveTo(3.5f, 7); chemin.lineTo(12, 13); chemin.lineTo(20.5f, 7);
                break;
            case CALENDRIER:
                r.set(3.5f, 5, 20.5f, 20.5f); chemin.addRoundRect(r, 2, 2, Path.Direction.CW);
                chemin.moveTo(3.5f, 10); chemin.lineTo(20.5f, 10); chemin.moveTo(8, 3); chemin.lineTo(8, 7); chemin.moveTo(16, 3); chemin.lineTo(16, 7);
                chemin.moveTo(8, 14); chemin.lineTo(8.1f, 14); chemin.moveTo(12, 14); chemin.lineTo(12.1f, 14); chemin.moveTo(16, 14); chemin.lineTo(16.1f, 14);
                break;
            case COEUR:
                chemin.moveTo(12, 20); chemin.cubicTo(4, 14.5f, 2.5f, 10, 4.5f, 7); chemin.cubicTo(6.5f, 4, 10.5f, 4.5f, 12, 7.5f);
                chemin.cubicTo(13.5f, 4.5f, 17.5f, 4, 19.5f, 7); chemin.cubicTo(21.5f, 10, 20, 14.5f, 12, 20); chemin.close();
                break;
            case MICRO:
                r.set(9, 3, 15, 14); chemin.addRoundRect(r, 3, 3, Path.Direction.CW);
                chemin.moveTo(5.5f, 11); chemin.quadTo(5.5f, 17.5f, 12, 17.5f); chemin.quadTo(18.5f, 17.5f, 18.5f, 11);
                chemin.moveTo(12, 17.5f); chemin.lineTo(12, 21); chemin.moveTo(9, 21); chemin.lineTo(15, 21);
                break;
            case LECTURE:
                chemin.moveTo(8, 5); chemin.lineTo(19, 12); chemin.lineTo(8, 19); chemin.close();
                break;
            case PAUSE:
                chemin.moveTo(9, 5); chemin.lineTo(9, 19); chemin.moveTo(15, 5); chemin.lineTo(15, 19);
                break;
            case ENVOYER:
                chemin.moveTo(3.5f, 11.5f); chemin.lineTo(20.5f, 4); chemin.lineTo(14, 20.5f); chemin.lineTo(11, 13); chemin.close();
                chemin.moveTo(11, 13); chemin.lineTo(20.5f, 4);
                break;
            case PIECES:
                chemin.addCircle(9, 9, 5.5f, Path.Direction.CW);
                chemin.moveTo(14.5f, 10); chemin.quadTo(20.5f, 11, 20.5f, 15); chemin.quadTo(20.5f, 20.5f, 15, 20.5f); chemin.quadTo(11, 20.5f, 10, 14.5f);
                chemin.moveTo(9, 6.5f); chemin.lineTo(9, 11.5f);
                break;
            case REGLAGES:
                chemin.addCircle(12, 12, 3, Path.Direction.CW);
                for (int i = 0; i < 8; i++) {
                    double a = Math.PI / 4 * i;
                    chemin.moveTo(12 + (float) (Math.cos(a) * 6.5), 12 + (float) (Math.sin(a) * 6.5));
                    chemin.lineTo(12 + (float) (Math.cos(a) * 9), 12 + (float) (Math.sin(a) * 9));
                }
                chemin.addCircle(12, 12, 6.5f, Path.Direction.CW);
                break;
            case SORTIE:
                chemin.moveTo(10, 4); chemin.lineTo(5, 4); chemin.lineTo(5, 20); chemin.lineTo(10, 20);
                chemin.moveTo(10, 12); chemin.lineTo(20, 12); chemin.moveTo(16, 8); chemin.lineTo(20, 12); chemin.lineTo(16, 16);
                break;
            case LISTE:
                chemin.moveTo(9, 7); chemin.lineTo(20, 7); chemin.moveTo(9, 12); chemin.lineTo(20, 12); chemin.moveTo(9, 17); chemin.lineTo(20, 17);
                chemin.moveTo(4.5f, 7); chemin.lineTo(4.6f, 7); chemin.moveTo(4.5f, 12); chemin.lineTo(4.6f, 12); chemin.moveTo(4.5f, 17); chemin.lineTo(4.6f, 17);
                break;
            case PLUS:
                chemin.moveTo(12, 5); chemin.lineTo(12, 19); chemin.moveTo(5, 12); chemin.lineTo(19, 12);
                break;
            default:
                break;
        }
        cv.drawPath(chemin, p);
        cv.restore();
    }
}
