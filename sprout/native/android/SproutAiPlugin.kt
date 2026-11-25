package dev.sprout.kids

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.GenerativeModel
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
// VERIFY: exact packages of the on-device types below (firebase-ai-ondevice 16.0.0-beta08).
// The docs page does not print the import lines. Let Android Studio resolve them.
import com.google.firebase.ai.ondevice.FirebaseAIOnDevice
import com.google.firebase.ai.ondevice.DownloadStatus
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ondevice.OnDeviceModelStatus
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.InferenceSource
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collect

/**
 * Capacitor plugin "SproutAi": Firebase AI Logic hybrid inference on Android.
 *
 * Docs: https://firebase.google.com/docs/ai-logic/hybrid/android/get-started
 *
 * JS contract (see app/src/ai/capacitorAi.ts):
 *   deviceStatus()   -> { status: 'available' | 'downloadable' | 'downloading' | 'unavailable' }
 *   prepareDevice()  -> resolves when the on-device model is downloaded; emits 'downloadProgress' { fraction }
 *   generate({ task, mode, prompt, jsonSchema? }) -> { text, source: 'device' | 'cloud', latencyMs }
 */
@OptIn(PublicPreviewAPI::class)
@CapacitorPlugin(name = "SproutAi")
class SproutAiPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val models = HashMap<String, GenerativeModel>()

    override fun handleOnDestroy() {
        scope.cancel()
        super.handleOnDestroy()
    }

    // ---- deviceStatus ----------------------------------------------------------------------

    @PluginMethod
    fun deviceStatus(call: PluginCall) {
        scope.launch {
            try {
                // VERIFY: checkStatus() is called from a coroutine here; the docs show it inside `when`
                // over OnDeviceModelStatus, the return type and suspend-ness are not stated.
                val status = when (FirebaseAIOnDevice.checkStatus()) {
                    OnDeviceModelStatus.AVAILABLE -> "available"
                    OnDeviceModelStatus.DOWNLOADABLE -> "downloadable"
                    OnDeviceModelStatus.DOWNLOADING -> "downloading"
                    else -> "unavailable"
                }
                call.resolve(JSObject().put("status", status))
            } catch (e: Exception) {
                call.resolve(JSObject().put("status", "unavailable"))
            }
        }
    }

    // ---- prepareDevice (the SDK never downloads the model by itself) ------------------------

    @PluginMethod
    fun prepareDevice(call: PluginCall) {
        scope.launch {
            try {
                var total = 0L
                FirebaseAIOnDevice.download().collect { s ->
                    when (s) {
                        // VERIFY: property names bytesToDownload / totalBytesDownloaded come from the docs page.
                        is DownloadStatus.DownloadStarted -> {
                            total = s.bytesToDownload
                            emitProgress(0.0)
                        }
                        is DownloadStatus.DownloadInProgress ->
                            emitProgress(if (total > 0) s.totalBytesDownloaded.toDouble() / total else 0.0)
                        is DownloadStatus.DownloadCompleted -> emitProgress(1.0)
                        is DownloadStatus.DownloadFailed -> throw IllegalStateException("Model download failed")
                        else -> Unit
                    }
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject(e.message ?: "prepareDevice failed", e)
            }
        }
    }

    private fun emitProgress(fraction: Double) {
        notifyListeners("downloadProgress", JSObject().put("fraction", fraction.coerceIn(0.0, 1.0)))
    }

    // ---- generate ----------------------------------------------------------------------------

    @PluginMethod
    fun generate(call: PluginCall) {
        val task = call.getString("task") ?: "answer"
        val modeName = call.getString("mode") ?: "prefer_device"
        val basePrompt = call.getString("prompt")
        if (basePrompt == null) {
            call.reject("prompt is required")
            return
        }
        val schema = call.getString("jsonSchema")
        // On-device Android does not accept a manual response schema (VERIFY against the docs:
        // structured output uses generateObject() with a KSP @Generable class). Sprout's JSON schemas are
        // dynamic, so the schema is appended to the prompt and the model is told to return only JSON.
        val prompt = if (schema != null) {
            basePrompt + "\n\nReturn ONLY a single JSON object that matches this JSON Schema. " +
                "No markdown, no code fences, no commentary.\nJSON Schema:\n" + schema
        } else basePrompt

        scope.launch {
            val t0 = System.nanoTime()
            try {
                val model = modelFor(modeName, task)
                val response = model.generateContent(prompt)
                val latencyMs = (System.nanoTime() - t0) / 1_000_000
                // VERIFY: `inferenceSource` on the response is described by the docs ("determine inference mode")
                // but the property is not shown on the page. Research brief says ON_DEVICE | IN_CLOUD.
                val source = when (response.inferenceSource) {
                    InferenceSource.ON_DEVICE -> "device"
                    InferenceSource.IN_CLOUD -> "cloud"
                    else -> if (modeName == "only_device") "device" else "cloud"
                }
                call.resolve(
                    JSObject()
                        .put("text", response.text ?: "")
                        .put("source", source)
                        .put("latencyMs", latencyMs)
                )
            } catch (e: Exception) {
                call.reject(e.message ?: "generate failed", e)
            }
        }
    }

    private fun modelFor(modeName: String, task: String): GenerativeModel {
        val key = "$modeName|$task"
        return models.getOrPut(key) {
            val mode = when (modeName) {
                "only_device" -> InferenceMode.ONLY_ON_DEVICE
                "prefer_device" -> InferenceMode.PREFER_ON_DEVICE
                "prefer_cloud" -> InferenceMode.PREFER_IN_CLOUD
                "only_cloud" -> InferenceMode.ONLY_IN_CLOUD
                else -> throw IllegalArgumentException("Unknown mode: $modeName")
            }
            Firebase.ai(backend = GenerativeBackend.googleAI()).generativeModel(
                modelName = CLOUD_MODEL,
                // VERIFY: OnDeviceConfig(mode, maxOutputTokens) per the plan; the research brief also lists
                // modelOption = OnDeviceModelOption.PREVIEW, which needs the AICore Developer Preview.
                // On-device requests are single-turn and limited to 4000 tokens.
                onDeviceConfig = OnDeviceConfig(
                    mode = mode,
                    maxOutputTokens = if (task == "guard" || task == "referee") 200 else 400,
                ),
            )
        }
    }

    companion object {
        // Keep in sync with VITE_CLOUD_MODEL / Remote Config. Cloud model names are not on-device.
        private const val CLOUD_MODEL = "gemini-3.8-flash"
    }
}
