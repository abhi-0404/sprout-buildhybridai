package dev.sprout.kids;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the Sprout AI plugin (Firebase AI Logic hybrid inference) before the bridge starts.
        registerPlugin(SproutAiPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
