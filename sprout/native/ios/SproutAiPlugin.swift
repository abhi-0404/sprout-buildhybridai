import Capacitor
import FirebaseCore
import FirebaseAILogic // Product name verified: renamed from FirebaseAI in Firebase Apple SDK 12.5.0
import FoundationModels // Apple on-device model, iOS 26+

/// Capacitor plugin "SproutAi": Firebase AI Logic hybrid inference on iOS.
///
/// Docs: https://firebase.google.com/docs/ai-logic/hybrid/ios/get-started
///
/// Pinned to the Firebase Apple SDK 12.x (>= 12.13.0, < 13.0.0). Firebase 13 removed HybridModel,
/// SystemLanguageModel and generativeModelSession (see native/ios/README.md).
///
/// Foundation Models and HybridModel need iOS 26. The app target may have a lower deployment target
/// (Capacitor defaults to a low one), so every use of them sits behind `@available(iOS 26.0, *)` or
/// `#available`, and older systems report status "unavailable" with reason "os_too_old".
///
/// JS contract (see app/src/ai/capacitorAi.ts):
///   deviceStatus()   -> { status: "available" | "downloadable" | "downloading" | "unavailable", reason?: string }
///                       reason: "os_too_old" | "device_not_eligible" | "apple_intelligence_off" | "model_not_ready" | "unknown"
///   prepareDevice()  -> resolves when Apple Intelligence reports the model ready; emits "downloadProgress" (1.0 when ready)
///   generate({ task, mode, prompt, jsonSchema?, cloudModel? }) -> { text, source: "device" | "cloud", latencyMs }
@objc(SproutAiPlugin)
public class SproutAiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SproutAiPlugin"
    public let jsName = "SproutAi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "deviceStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise),
    ]

    // Fallback cloud model. JS may pass "cloudModel" (from VITE_CLOUD_MODEL / Remote Config) per request.
    private static let defaultCloudModelName = "gemini-3.5-flash"

    /// CAPPluginCall and the plugin are not Sendable. They are only used to hand a result back to
    /// JavaScript, so the hop is hidden behind this box and always lands on the main actor.
    private struct CallRef: @unchecked Sendable {
        let plugin: SproutAiPlugin
        let call: CAPPluginCall

        @MainActor func resolve(_ data: [String: Any]? = nil) {
            if let data = data { call.resolve(data) } else { call.resolve() }
        }

        @MainActor func reject(_ message: String, code: String) {
            call.reject(message, code)
        }

        @MainActor func progress(_ fraction: Double) {
            plugin.notifyListeners("downloadProgress", data: ["fraction": fraction])
        }
    }

    // ---- deviceStatus ----------------------------------------------------------------------

    /// Reads availability from Firebase's SystemLanguageModel, the same model inference goes through,
    /// so the status and the routing agree. The cases are the ones listed on the Firebase
    /// configuration-options page: available, unavailable(deviceNotEligible | appleIntelligenceNotEnabled | modelNotReady).
    @available(iOS 26.0, *)
    private static func statusAndReason() -> (status: String, reason: String?) {
        switch FirebaseAI.SystemLanguageModel.default.availability {
        case .available:
            return ("available", nil)
        case .unavailable(let reason):
            switch reason {
            case .modelNotReady: return ("downloading", "model_not_ready") // Apple Intelligence is still fetching the model
            case .appleIntelligenceNotEnabled: return ("unavailable", "apple_intelligence_off") // the user can fix this in Settings
            case .deviceNotEligible: return ("unavailable", "device_not_eligible")
            @unknown default: return ("unavailable", "unknown")
            }
        @unknown default:
            return ("unavailable", "unknown")
        }
    }

    private static func currentStatus() -> (status: String, reason: String?) {
        if #available(iOS 26.0, *) {
            return statusAndReason()
        }
        return ("unavailable", "os_too_old")
    }

    /// Message for the JS side. Apple Intelligence being off is fixable by the user, so it must not say "needs iPhone 15 Pro".
    private static func unavailableMessage(_ reason: String?) -> String {
        switch reason {
        case "apple_intelligence_off": return "Apple Intelligence is turned off. Turn it on in Settings > Apple Intelligence & Siri."
        case "os_too_old": return "The on-device model needs iOS 26 or newer."
        case "device_not_eligible": return "This device cannot run Apple Intelligence (needs iPhone 15 Pro or newer)."
        default: return "The on-device model is not available."
        }
    }

    @objc func deviceStatus(_ call: CAPPluginCall) {
        let s = SproutAiPlugin.currentStatus()
        var out: [String: Any] = ["status": s.status]
        if let reason = s.reason { out["reason"] = reason }
        call.resolve(out)
    }

    // ---- prepareDevice ---------------------------------------------------------------------
    // Apple manages the model download itself (Settings > Apple Intelligence). There is no download API,
    // so this waits (bounded) for it to become ready. Apple reports no progress number, so nothing is
    // emitted until the model is ready (a bar stuck at 0 would be misleading).

    @objc func prepareDevice(_ call: CAPPluginCall) {
        let ref = CallRef(plugin: self, call: call)
        Task {
            let deadline = Date().addingTimeInterval(10 * 60)
            while Date() < deadline {
                let s = SproutAiPlugin.currentStatus()
                switch s.status {
                case "available":
                    await ref.progress(1.0)
                    await ref.resolve()
                    return
                case "downloading":
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                default:
                    await ref.reject(SproutAiPlugin.unavailableMessage(s.reason), code: s.reason ?? "unavailable")
                    return
                }
            }
            await ref.reject("Timed out waiting for the on-device model", code: "timeout")
        }
    }

    // ---- generate --------------------------------------------------------------------------

    @objc func generate(_ call: CAPPluginCall) {
        guard let basePrompt = call.getString("prompt") else {
            call.reject("prompt is required")
            return
        }
        let mode = call.getString("mode") ?? "prefer_device"
        let schema = call.getString("jsonSchema")
        let cloudModel = call.getString("cloudModel") ?? SproutAiPlugin.defaultCloudModelName

        // Sprout's JSON schemas are dynamic, so the schema is appended to the prompt (VERIFY: the SDK also
        // offers typed structured output via Apple's @Generable; not used here to keep one code path).
        var prompt = basePrompt
        if let schema = schema {
            prompt += "\n\nReturn ONLY a single JSON object that matches this JSON Schema. "
                + "No markdown, no code fences, no commentary.\nJSON Schema:\n" + schema
        }
        let finalPrompt = prompt
        let ref = CallRef(plugin: self, call: call)

        // Besides the box, only Sendable values (Strings) are captured, and `self` is not used inside.
        Task {
            guard #available(iOS 26.0, *) else {
                await ref.reject(SproutAiPlugin.unavailableMessage("os_too_old"), code: "os_too_old")
                return
            }
            let clock = ContinuousClock()
            let start = clock.now
            do {
                // New session per request: a GenerativeModelSession keeps chat history, Sprout is single-turn.
                let session = try SproutAiPlugin.makeSession(mode: mode, cloudModel: cloudModel)
                let response = try await session.respond(to: finalPrompt)
                let elapsed = start.duration(to: clock.now)
                let ms = Int(elapsed.components.seconds * 1000 + elapsed.components.attoseconds / 1_000_000_000_000_000)

                // rawResponse.modelVersion tells which model answered: "apple-foundation-models-system-language-model"
                // for the device, a Gemini model name for the cloud (Firebase configuration-options page).
                let version = response.rawResponse.modelVersion ?? ""
                let onDevice = version.contains("apple-foundation-models")
                await ref.resolve([
                    "text": response.content,
                    "source": onDevice ? "device" : "cloud",
                    "latencyMs": ms,
                ])
            } catch {
                await ref.reject(error.localizedDescription, code: "generate_failed")
            }
        }
    }

    /// Builds a single-turn session for the requested mode. HybridModel and SystemLanguageModel are iOS 26+.
    @available(iOS 26.0, *)
    private static func makeSession(mode: String, cloudModel: String) throws -> GenerativeModelSession {
        // Without FirebaseApp.configure() (AppDelegate) firebaseAI() hits a fatal error; reject instead of crashing.
        guard FirebaseApp.app() != nil else {
            throw NSError(domain: "SproutAi", code: 2, userInfo: [NSLocalizedDescriptionKey: "Firebase is not configured (call FirebaseApp.configure() in AppDelegate)"])
        }
        // FirebaseAI.firebaseAI(backend:) returns the shared instance for the default app and backend.
        let ai = FirebaseAI.firebaseAI(backend: .googleAI())
        let system = FirebaseAI.SystemLanguageModel.default
        let gemini = ai.geminiModel(name: cloudModel)
        // VERIFY on CI: exact overloads of generativeModelSession(model:) for a single (non-hybrid) model.
        // The official page builds `HybridModel(primary:secondary:)` and passes it as `model:`;
        // the `.hybridModel(primary:secondary:)` static form is from the research brief. Use whichever compiles.
        switch mode {
        case "only_device":
            return ai.generativeModelSession(model: system)
        case "only_cloud":
            return ai.generativeModelSession(model: gemini)
        case "prefer_cloud":
            return ai.generativeModelSession(model: .hybridModel(primary: gemini, secondary: system))
        case "prefer_device":
            return ai.generativeModelSession(model: .hybridModel(primary: system, secondary: gemini))
        default:
            throw NSError(domain: "SproutAi", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unknown mode: \(mode)"])
        }
    }
}
