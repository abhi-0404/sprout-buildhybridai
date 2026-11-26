package dev.sprout.kids;

import android.content.Context;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

/** Debug builds: App Check debug provider. Logcat prints a token to register in the Firebase console. */
final class AppCheckSetup {
    private AppCheckSetup() {}

    static void install(Context context) {
        // No google-services.json (Demo mode or CI): Firebase is not initialised, so skip.
        if (FirebaseApp.getApps(context).isEmpty()) return;
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance());
    }
}
