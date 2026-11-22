import Capacitor
import FirebaseCore
import FirebaseAILogic // VERIFY: product/module name. The docs say to add the "FirebaseAILogic" library.
import FoundationModels // Apple on-device model, iOS 26+

/// Capacitor plugin "SproutAi": Firebase AI Logic hybrid inference on iOS.
///
/// Docs: https://firebase.google.com/docs/ai-logic/hybrid/ios/get-started
///
/// Pinned to the Firebase Apple SDK 12.x (>= 12.13.0, < 13.0.0). Firebase 13 removed HybridModel,
/// SystemLanguageModel and generativeModelSession (see native/ios/README.md).
///
/// JS contract (see app/src/ai/capacitorAi.ts):
///   deviceStatus()   -> { status: "available" | "downloadable" | "downloading" | "unavailable" }
///   prepareDevice()  -> resolves when Apple Intelligence reports the model ready; emits "downloadProgress"
///   generate({ task, mode, prompt, jsonSchema? }) -> { text, source: "device" | "cloud", latencyMs }
@objc(SproutAiPlugin)
public class SproutAiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SproutAiPlugin"
    public let jsName = "SproutAi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "deviceStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareDevice", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise),
    ]

    // Keep in sync with VITE_CLOUD_MODEL / Remote Config.
    private static let cloudModelName = "gemini-3.8-flash"

    private lazy var ai = FirebaseAI.firebaseAI(backend: .googleAI())

    // ---- deviceStatus ----------------------------------------------------------------------

    private func currentStatus() -> String {
        // VERIFY: the docs link a "Check if the on-device model is available" section that is not printed
        // on the get-started page. Apple's API is SystemLanguageModel.default.availability; Firebase's
        // FirebaseAI.SystemLanguageModel may wrap or alias it.
        switch SystemLanguageModel.default.availability {
        case .available:
            return "available"
        case .unavailable(let reason):
            switch reason {
            case .modelNotReady: return "downloading" // Apple Intelligence is still fetching the model
            default: return "unavailable" // .deviceNotEligible, .appleIntelligenceNotEnabled, ...
            }
        @unknown default:
            return "unavailable"
        }
    }

    @objc func deviceStatus(_ call: CAPPluginCall) {
        call.resolve(["status": currentStatus()])
    }

    // ---- prepareDevice ---------------------------------------------------------------------
    // Apple manages the model download itself (Settings > Apple Intelligence). There is no download API,
    // so this waits (bounded) for it to become ready and reports coarse progress.

    @objc func prepareDevice(_ call: CAPPluginCall) {
        Task {
            let deadline = Date().addingTimeInterval(10 * 60)
            while Date() < deadline {
                switch currentStatus() {
                case "available":
                    self.notifyListeners("downloadProgress", data: ["fraction": 1.0])
                    call.resolve()
                    return
                case "downloading":
                    self.notifyListeners("downloadProgress", data: ["fraction": 0.0])
                    try? await Task.sleep(nanoseconds: 2_000_000_000)
                default:
                    call.reject("On-device model unavailable (needs iPhone 15 Pro or newer with Apple Intelligence on)")
                    return
                }
            }
            call.reject("Timed out waiting for the on-device model")
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

        // Sprout's JSON schemas are dynamic, so the schema is appended to the prompt (VERIFY: the SDK also
        // offers typed structured output via Apple's @Generable; not used here to keep one code path).
        var prompt = basePrompt
        if let schema = schema {
            prompt += "\n\nReturn ONLY a single JSON object that matches this JSON Schema. "
                + "No markdown, no code fences, no commentary.\nJSON Schema:\n" + schema
        }
        let finalPrompt = prompt

        Task {
            let clock = ContinuousClock()
            let start = clock.now
            do {
                // New session per request: a GenerativeModelSession keeps chat history, Sprout is single-turn.
                let session = try self.makeSession(mode: mode)
                let response = try await session.respond(to: finalPrompt)
                let elapsed = start.duration(to: clock.now)
                let ms = Int(elapsed.components.seconds * 1000 + elapsed.components.attoseconds / 1_000_000_000_000_000)

                // VERIFY: rawResponse.modelVersion is the documented way to tell which model answered
                // (the get-started page links "Determine which model was used" but does not print it).
                let version = response.rawResponse.modelVersion ?? ""
                let onDevice = version.contains("apple-foundation-models")
                call.resolve([
                    "text": response.content,
                    "source": onDevice ? "device" : "cloud",
                    "latencyMs": ms,
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Builds a single-turn session for the requested mode.
    private func makeSession(mode: String) throws -> GenerativeModelSession {
        let system = FirebaseAI.SystemLanguageModel.default
        let gemini = ai.geminiModel(name: SproutAiPlugin.cloudModelName)
        // VERIFY: exact overloads of generativeModelSession(model:) for a single (non-hybrid) model.
        // VERIFY: the official page builds `HybridModel(primary:secondary:)` and passes it as `model:`;
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
