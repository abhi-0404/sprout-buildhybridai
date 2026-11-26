package dev.sprout.kids;

import android.content.Context;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

/** Release builds: App Check with Play Integrity. */
final class AppCheckSetup {
    private AppCheckSetup() {}

    static void install(Context context) {
        // No google-services.json (Demo mode or CI): Firebase is not initialised, so skip.
        if (FirebaseApp.getApps(context).isEmpty()) return;
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
    }
}
