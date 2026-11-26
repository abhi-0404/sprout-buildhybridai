package dev.sprout.kids;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App Check first: AI Logic enforcement rejects every cloud call without it.
        AppCheckSetup.install(this);
        // Register the Sprout AI plugin (Firebase AI Logic hybrid inference) before the bridge starts.
        registerPlugin(SproutAiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
