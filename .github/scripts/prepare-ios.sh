#!/usr/bin/env bash
# Generates the iOS project on a CI runner and wires in the SproutAi plugin and the Firebase Apple SDK.
# Called by .github/workflows/ios-build.yml. Nothing here is committed: package.json and the lockfile
# change only inside the runner's checkout.
#
# Approach (chosen because editing project.pbxproj by hand is fragile):
#   1. Capacitor 8 generates an iOS project that uses Swift Package Manager (ios/App/CapApp-SPM).
#   2. The Swift plugin is wrapped in a small LOCAL Capacitor plugin package, "capacitor-sprout-ai".
#      Its Package.swift depends on capacitor-swift-pm and on firebase-ios-sdk (12.13.0 up to, not
#      including, 13.0.0), so SwiftPM resolves Firebase for us.
#   3. `pnpm add ./.ci-plugins/capacitor-sprout-ai` then `cap sync ios` makes the Capacitor CLI add that
#      package to CapApp-SPM and register the plugin class. No pbxproj edits, no storyboard edits.
#
# UNVERIFIED (never run): the exact plugin package layout the CLI expects and how it names the product.
# The script prints the generated CapApp-SPM/Package.swift so a failed run shows what the CLI did.
# If the plugin is not picked up, the fallback is README steps 4-6 (add the package and register the
# plugin by hand), or a ruby `xcodeproj` script on the runner.
set -euo pipefail

cd "$(dirname "$0")/../../sprout/app"

IOS_VERSION="8.6.2"   # must match @capacitor/core and @capacitor/cli
PLUGIN_DIR=".ci-plugins/capacitor-sprout-ai"

echo "::group::Add @capacitor/ios on the runner only"
pnpm add "@capacitor/ios@${IOS_VERSION}"
echo "::endgroup::"

echo "::group::Build the web app"
pnpm build
echo "::endgroup::"

echo "::group::Generate the iOS project"
pnpm exec cap add ios --packagemanager SPM
echo "::endgroup::"

echo "::group::Create the local plugin package"
mkdir -p "${PLUGIN_DIR}/ios/Sources/SproutAiNative"
cp ../native/ios/SproutAiPlugin.swift "${PLUGIN_DIR}/ios/Sources/SproutAiNative/SproutAiPlugin.swift"

cat > "${PLUGIN_DIR}/package.json" <<'JSON'
{
  "name": "capacitor-sprout-ai",
  "version": "0.0.0",
  "private": true,
  "files": ["ios/Sources", "Package.swift"],
  "capacitor": { "ios": { "src": "ios" } },
  "peerDependencies": { "@capacitor/core": ">=8.0.0" }
}
JSON

cat > "${PLUGIN_DIR}/Package.swift" <<'SWIFT'
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorSproutAi",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapacitorSproutAi", targets: ["SproutAiNative"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        // Hybrid inference exists only in 12.x. 13.0.0 removed HybridModel (see sprout/native/ios/README.md).
        .package(url: "https://github.com/firebase/firebase-ios-sdk", "12.13.0"..<"13.0.0"),
    ],
    targets: [
        .target(
            name: "SproutAiNative",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAILogic", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAppCheck", package: "firebase-ios-sdk"),
            ],
            path: "ios/Sources/SproutAiNative"
        ),
    ]
)
SWIFT
echo "::endgroup::"

echo "::group::Install the plugin and sync"
pnpm add "./${PLUGIN_DIR}"
pnpm exec cap sync ios
echo "::endgroup::"

echo "::group::Export compliance flag in Info.plist"
# The app only uses standard HTTPS, so TestFlight needs no export-compliance question.
/usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" ios/App/App/Info.plist 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" ios/App/App/Info.plist
echo "::endgroup::"

echo "::group::What the Capacitor CLI generated (for debugging)"
cat ios/App/CapApp-SPM/Package.swift || true
grep -rl "SproutAiPlugin" ios --include=*.json --include=*.swift --include=*.pbxproj 2>/dev/null || true
echo "::endgroup::"
