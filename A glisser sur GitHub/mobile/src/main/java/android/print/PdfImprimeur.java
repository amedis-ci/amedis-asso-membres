package android.print;

import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;

import java.io.File;

/**
 * Écrit en PDF le document d'une WebView (reçus, listes, bilan, cartes), sans passer par la boîte d'impression.
 * Placée dans le paquet android.print pour pouvoir créer les rappels de mise en page et d'écriture.
 */
public final class PdfImprimeur {

    public interface Fin {
        void termine(File f, String erreur);
    }

    private PdfImprimeur() { }

    public static void ecrire(final PrintDocumentAdapter adaptateur, final PrintAttributes attributs, final File cible, final Fin fin) {
        adaptateur.onStart();
        adaptateur.onLayout(null, attributs, null, new PrintDocumentAdapter.LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean change) {
                final ParcelFileDescriptor pfd;
                try {
                    if (cible.exists()) cible.delete();
                    cible.getParentFile().mkdirs();
                    cible.createNewFile();
                    pfd = ParcelFileDescriptor.open(cible, ParcelFileDescriptor.MODE_READ_WRITE);
                } catch (Exception e) {
                    adaptateur.onFinish();
                    fin.termine(null, "Fichier PDF impossible à créer.");
                    return;
                }
                adaptateur.onWrite(new PageRange[]{PageRange.ALL_PAGES}, pfd, new CancellationSignal(), new PrintDocumentAdapter.WriteResultCallback() {
                    @Override
                    public void onWriteFinished(PageRange[] pages) {
                        fermer(pfd);
                        adaptateur.onFinish();
                        fin.termine(cible, null);
                    }

                    @Override
                    public void onWriteFailed(CharSequence erreur) {
                        fermer(pfd);
                        adaptateur.onFinish();
                        fin.termine(null, "Écriture du PDF impossible" + (erreur == null ? "." : " : " + erreur));
                    }

                    @Override
                    public void onWriteCancelled() {
                        fermer(pfd);
                        adaptateur.onFinish();
                        fin.termine(null, "PDF annulé.");
                    }
                });
            }

            @Override
            public void onLayoutFailed(CharSequence erreur) {
                adaptateur.onFinish();
                fin.termine(null, "Mise en page du PDF impossible" + (erreur == null ? "." : " : " + erreur));
            }

            @Override
            public void onLayoutCancelled() {
                adaptateur.onFinish();
                fin.termine(null, "PDF annulé.");
            }
        }, null);
    }

    private static void fermer(ParcelFileDescriptor p) {
        try { p.close(); } catch (Exception ignore) { /* déjà fermé */ }
    }
}
