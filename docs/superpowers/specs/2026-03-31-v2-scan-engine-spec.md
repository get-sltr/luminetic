
# Luminetic V2: Complete Scan Engine Rebuild

## Overview

This spec defines three new layers for Luminetic's scan engine. The goal is premium-quality scan results with zero false positives from static analysis, real device runtime validation, and intelligent feedback across re-scans. This replaces the current approach where AI models guess about app behavior without evidence.

After implementing this spec, a Luminetic scan should be near-equivalent to what Apple's review team does: automated binary checks + real device testing + human-like feedback.

---

## Architecture: Three Layers

```
User uploads IPA
       |
       v
[Layer 1: Deep Static Analysis] -- instant, zero false positives
       |
       v
[Layer 2: AWS Device Farm Runtime] -- 3-5 min, real iOS device
       |
       v
[Layer 3: AI Synthesis + Scan Memory] -- four-model pipeline with history
       |
       v
Severity-ranked report with Apple guideline citations
```

---

## Layer 1: Deep Static Analysis

This layer extracts and analyzes everything provable from the IPA binary. Every finding here must be backed by evidence from the file itself. No guessing, no "might be an issue." If it can't be proven from the binary, it does not belong in Layer 1.

### 1.1 IPA Extraction

An IPA is a ZIP archive. Extract it and locate the .app bundle inside `Payload/`.

Key files to parse:
- `Info.plist` (binary plist, convert to XML/JSON)
- `embedded.mobileprovision` (contains entitlements)
- `Frameworks/` directory (all embedded frameworks/SDKs)
- `PrivacyInfo.xcprivacy` (privacy manifest, may also exist inside each framework)
- `Assets.car` (compiled asset catalog)
- `_CodeSignature/` (code signing info)
- `*.storyboardc` / `*.nib` (compiled UI files)

### 1.2 Privacy Compliance Engine

This is where ~40% of App Store rejections happen. Be thorough.

**Privacy Manifest Analysis:**
- Parse the app's `PrivacyInfo.xcprivacy` file
- Parse each embedded framework's `PrivacyInfo.xcprivacy` (inside `Frameworks/*.framework/`)
- Cross-reference `NSPrivacyAccessedAPITypes` against Apple's required API categories:
  - File timestamp APIs
  - System boot time APIs
  - Disk space APIs
  - Active keyboard APIs
  - User defaults APIs
- Flag any required API usage that is NOT declared in a privacy manifest
- Flag any framework that Apple requires to have its own privacy manifest but doesn't (reference Apple's list of third-party SDKs requiring privacy manifests)

**NSUsageDescription Validation:**
- Extract all `NS*UsageDescription` keys from Info.plist
- Cross-reference against actual framework imports in the binary:
  - If app imports `AVFoundation` but has no `NSCameraUsageDescription` = CRITICAL finding
  - If app imports `CoreLocation` but has no `NSLocationWhenInUseUsageDescription` = CRITICAL finding
  - If app has `NSCameraUsageDescription` but doesn't import any camera framework = WARNING (unnecessary permission request, Apple may question this)
- Check that usage description strings are meaningful, not placeholder text like "We need camera access" (feed to AI for quality assessment)

**Privacy Nutrition Label Readiness:**
- Based on detected SDKs and framework imports, predict what data types should be declared in App Store Connect privacy labels
- Flag potential mismatches between what the app collects (based on SDK analysis) and common privacy label declarations

### 1.3 Entitlements vs Capabilities Cross-Check

Extract entitlements from `embedded.mobileprovision` and from the code signature.

For each entitlement claimed:
- `com.apple.developer.healthkit` -- does Info.plist contain `UIRequiredDeviceCapabilities` with `healthkit`? Are there health-related privacy strings?
- `com.apple.developer.in-app-payments` (Apple Pay) -- is there a corresponding merchant ID?
- `aps-environment` (Push Notifications) -- is there push notification setup?
- `com.apple.developer.icloud-container-identifiers` -- are iCloud containers properly configured?
- `com.apple.developer.associated-domains` -- are the associated domains valid format?

Flag any entitlement that exists without the corresponding Info.plist configuration. These are guaranteed rejections. Zero false positive rate.

### 1.4 SDK Audit

Scan the `Frameworks/` directory and the main binary for embedded SDKs.

For each detected SDK:
- Identify the SDK name and version (from framework bundle Info.plist)
- Check against a maintained list of:
  - SDKs that Apple has deprecated or flagged
  - SDKs with known privacy manifest requirements
  - SDKs known to use private APIs (which cause rejection)
  - SDKs with minimum version requirements for current App Store submissions
- Flag use of `UIWebView` (deprecated, apps using it are rejected since April 2020)
- Detect use of any non-public/private Apple APIs by scanning symbol tables

### 1.5 App Icon and Asset Validation

- Check that all required app icon sizes are present in the asset catalog
- Verify launch screen exists (LaunchScreen.storyboard or launch image set)
- Check for alpha channel in app icons (Apple rejects icons with transparency)
- Verify icon doesn't contain rounded corners (Apple applies its own mask)

### 1.6 Build Configuration Analysis

From Info.plist:
- `MinimumOSVersion` -- flag if below Apple's current minimum (check against current requirement)
- `UIRequiredDeviceCapabilities` -- validate against actual device capabilities used
- `CFBundleShortVersionString` and `CFBundleVersion` -- check format validity
- `UIBackgroundModes` -- if declared, verify the app has legitimate justification (cross-reference with actual framework usage)
- `ITSAppUsesNonExemptEncryption` -- if missing, flag (causes App Store Connect submission delay)
- `UIApplicationSceneManifest` -- check scene configuration
- `CFBundleURLTypes` -- validate URL scheme registrations
- `NSAppTransportSecurity` -- flag any ATS exceptions, especially `NSAllowsArbitraryLoads = YES`
- Check for `LSApplicationQueriesSchemes` (if querying other apps)

### 1.7 Code Signing Validation

- Verify the code signature is valid and not expired
- Check the provisioning profile type (development vs distribution vs ad-hoc)
- Flag if the build is not signed for App Store distribution
- Check team ID consistency across the app and embedded frameworks

### 1.8 Xcode and SDK Version Check

- Detect the Xcode version used to build (from `DTXcodeBuild` in Info.plist)
- Detect the SDK version (from `DTSDKName` and `DTSDKBuild`)
- Flag if built with an outdated Xcode version that Apple no longer accepts
- Starting April 2026: all submissions must use iOS 26 SDK -- flag if not

### 1.9 Output Format

Layer 1 produces a structured JSON array of findings:

```json
{
  "layer": "static_analysis",
  "findings": [
    {
      "id": "SA-001",
      "severity": "CRITICAL",
      "category": "privacy",
      "title": "Missing NSCameraUsageDescription",
      "description": "App imports AVFoundation framework but Info.plist does not contain NSCameraUsageDescription. Apple will reject this app.",
      "guideline": "5.1.1",
      "guideline_url": "https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage",
      "evidence": "AVFoundation.framework detected in Frameworks/ directory. NSCameraUsageDescription not found in Info.plist.",
      "remediation": "Add NSCameraUsageDescription to Info.plist with a clear, user-facing explanation of why your app needs camera access.",
      "false_positive_risk": "none",
      "confidence": 1.0
    }
  ],
  "metadata": {
    "bundle_id": "com.example.app",
    "bundle_version": "1.2.3",
    "build_number": "42",
    "minimum_os": "16.0",
    "xcode_version": "15.4",
    "sdk_version": "17.5",
    "embedded_frameworks": ["Alamofire", "Firebase", "Sentry"],
    "entitlements": ["push", "healthkit"],
    "code_signing": "valid",
    "provisioning_type": "app-store"
  }
}
```

---

## Layer 2: AWS Device Farm Runtime Testing

This layer installs the IPA on a real physical iOS device and captures runtime behavior.

### 2.1 Integration Architecture

- Use AWS Device Farm API (us-west-2 region, Device Farm is only available there)
- Create a dedicated Device Farm project: "Luminetic-Scans"
- Use the built-in Fuzz test (no test scripts needed, no maintenance)
- Select a device pool of 1 popular iPhone model (minimize cost per scan)
- Set test timeout to 5 minutes max

### 2.2 Scan Flow

1. After Layer 1 completes, upload the IPA to Device Farm via `CreateUpload` API
2. Wait for upload processing to complete (poll `GetUpload` until status = "SUCCEEDED")
3. Create a test run via `ScheduleRun` API:
   - App: the uploaded IPA
   - Test: built-in Fuzz test type (`BUILTIN_FUZZ`)
   - Device pool: single device (e.g., latest iPhone, latest iOS)
   - Execution configuration: 5 minute timeout
4. Poll `GetRun` until status = "COMPLETED"
5. Retrieve artifacts via `ListArtifacts`:
   - Screenshots (capture app launch and UI states)
   - Video recording of the test session
   - Device logs (iOS system logs)
   - Test result logs (crash reports, performance data)
6. Download and parse all artifacts

### 2.3 What to Extract from Device Farm Results

- **Did the app launch successfully?** (CRITICAL if not)
- **Did the app crash during fuzz testing?** (capture crash logs and stack traces)
- **Memory usage** (flag if exceeding reasonable thresholds)
- **CPU usage** (flag if excessive)
- **Launch time** (flag if slow)
- **Screenshots** (feed to AI for UI analysis in Layer 3)
- **Network calls** (if captured in device logs)

### 2.4 Output Format

```json
{
  "layer": "runtime_analysis",
  "device": {
    "name": "iPhone 15 Pro",
    "os_version": "17.5",
    "model_id": "iphone15pro"
  },
  "results": {
    "launch_success": true,
    "crashes": [],
    "crash_count": 0,
    "test_duration_seconds": 285,
    "memory_peak_mb": 142,
    "cpu_peak_percent": 67,
    "screenshots": ["s3://luminetic-scans/{scan_id}/screenshot_001.png", "..."],
    "video_url": "s3://luminetic-scans/{scan_id}/video.mp4",
    "device_logs": "s3://luminetic-scans/{scan_id}/device.log"
  },
  "fuzz_results": {
    "events_sent": 1200,
    "ui_elements_discovered": 34,
    "unresponsive_periods": 0
  }
}
```

### 2.5 Cost Control

- Use pay-as-you-go pricing: $0.17 per device minute
- Target 5 minutes per scan = $0.85 per scan
- Set hard timeout at 5 minutes to prevent runaway costs
- Use a single device per scan (not parallel multi-device)
- Store artifacts in S3 with 30-day lifecycle policy (auto-delete)
- This is covered by AWS Activate credits

### 2.6 Handling Device Farm Failures

- If IPA upload fails (e.g., not built for device, signing issues): report this as a Layer 1 finding (code signing / build config issue)
- If Device Farm is unavailable or times out: complete the scan with Layer 1 + Layer 3 only, note that runtime testing was skipped, do NOT charge less (the static analysis + AI synthesis is still valuable)
- If the app crashes immediately on launch: this IS valuable data, report it as a CRITICAL finding

---

## Layer 3: AI Synthesis + Scan Memory

This layer takes the structured outputs from Layer 1 and Layer 2, combines them with scan history for this Bundle ID, and produces the final human-readable report.

### 3.1 Scan Memory (DynamoDB)

**Table: luminetic-scan-history**

```
Partition Key: bundle_id (String)
Sort Key: scan_timestamp (String, ISO 8601)

Attributes:
- scan_id (String, UUID)
- user_id (String, Cognito user ID)
- ipa_hash (String, SHA256 of the uploaded IPA)
- layer1_findings (String, JSON array of Layer 1 findings)
- layer2_results (String, JSON of Layer 2 results)
- final_report (String, JSON of the AI-synthesized report)
- finding_count (Map: { critical: N, major: N, medium: N, minor: N })
- status (String: "completed" | "failed" | "in_progress")
```

**On every scan:**
1. Before running the scan, query previous scans for this bundle_id (limit 3 most recent)
2. After scan completes, store the full results
3. Feed previous scan findings into the AI prompt for comparison

### 3.2 AI Pipeline (Modified)

The existing four-model pipeline (Gemini 2.5 Pro + Claude Sonnet + DeepSeek in parallel, Claude Opus as judge) is retained but the input is now much richer.

**Input to AI models:**

```
You are analyzing an iOS app for App Store Review compliance.

## Static Analysis Results (Layer 1 - Proven Facts)
{layer1_findings_json}

## Runtime Test Results (Layer 2 - Real Device)
{layer2_results_json}

## Previous Scan History for this Bundle ID
{previous_scans_json_or_"First scan for this app"}

## Instructions

Based on the PROVEN findings from static analysis and the REAL runtime results:

1. Synthesize all findings into a severity-ranked report
2. For each finding, provide:
   - Severity: CRITICAL / MAJOR / MEDIUM / MINOR
   - The exact Apple App Store Review Guideline section that applies
   - Specific remediation steps (code changes, plist edits, etc.)
   - Confidence level (1.0 for static analysis findings, 0.7-0.9 for AI-inferred)

3. If previous scan history exists:
   - Identify which issues from the previous scan are now RESOLVED
   - For resolved issues, acknowledge the fix and note if it was done correctly
   - Identify which issues PERSIST from the previous scan
   - Identify any NEW issues that were not in the previous scan
   - If a fix introduced a new issue, explicitly call this out

4. DO NOT flag anything that cannot be verified from the provided data
5. DO NOT speculate about issues that might exist
6. Every finding must cite specific evidence from Layer 1 or Layer 2 data

## Report Sections:
- Summary (overall readiness score 0-100, critical/major/medium/minor counts)
- Resolved Issues (only if previous scan exists)
- Persistent Issues (only if previous scan exists)
- New Issues (issues not in previous scan, or all issues if first scan)
- Detailed Findings (each finding with full evidence and remediation)
- Positive Signals (things the app does right, important for developer morale)
```

### 3.3 Re-scan Comparison Logic

When a previous scan exists for the same bundle_id:

**Matching algorithm:**
- Compare findings by `category` + `title` (not by ID, since IDs are per-scan)
- If a Layer 1 finding from the previous scan no longer appears: mark as RESOLVED
- If a Layer 1 finding still appears with same evidence: mark as PERSISTENT
- If a new finding appears that wasn't in previous scan: mark as NEW
- If the IPA hash is identical to the previous scan: warn the user that the binary hasn't changed and the results will be the same (save them a credit)

**Feedback quality:**
- For RESOLVED issues: "Issue #4 (Missing NSCameraUsageDescription) is now fixed. Your privacy string reads: '[their actual string]'. This is clear and specific. Apple should accept this."
- For PERSISTENT issues: "Issue #7 (HealthKit entitlement without privacy manifest declaration) is still present. The fix requires adding a PrivacyInfo.xcprivacy file to your HealthKit framework with NSPrivacyAccessedAPIType set to..."
- For NEW issues introduced by a fix: "Your fix for Issue #3 appears to have introduced a new issue: you added UIBackgroundModes but declared 'audio' mode without importing AVAudioSession. Apple may reject this under Guideline 2.5.4."

### 3.4 IPA Hash Deduplication

Before running a scan, compute the SHA256 hash of the uploaded IPA. Check if a scan with this exact hash already exists for this bundle_id and user.

If the hash matches the most recent scan:
- Do NOT deduct a credit
- Do NOT re-run the scan
- Return the previous results with a message: "This is the same build as your last scan. No changes detected. Your previous results are still valid. Upload a new build to see updated results."

This prevents users from accidentally wasting credits on unchanged builds.

### 3.5 Report Output Format

The final report should be structured for both the web dashboard and PDF export:

```json
{
  "scan_id": "uuid",
  "bundle_id": "com.example.app",
  "scan_timestamp": "2026-03-31T12:00:00Z",
  "readiness_score": 72,
  "summary": {
    "critical": 1,
    "major": 2,
    "medium": 3,
    "minor": 1,
    "resolved_since_last_scan": 4,
    "new_since_last_scan": 1
  },
  "comparison": {
    "previous_scan_id": "uuid-of-previous",
    "previous_scan_date": "2026-03-28T15:00:00Z",
    "resolved": [
      {
        "original_id": "SA-004",
        "title": "Missing NSCameraUsageDescription",
        "feedback": "Fixed. Your privacy string is clear and specific."
      }
    ],
    "persistent": [...],
    "new": [...]
  },
  "findings": [...],
  "positive_signals": [
    "App Transport Security is properly configured with no exceptions",
    "All required app icon sizes are present",
    "Privacy manifest is comprehensive and well-structured"
  ],
  "device_farm": {
    "launch_success": true,
    "crash_count": 0,
    "screenshots": [...]
  }
}
```

---

## Implementation Order

### Phase 1: Prompt Tightening (do immediately, today)
- Modify existing AI prompts to ONLY flag issues they can prove
- Add confidence scores to every finding
- Suppress anything below 0.8 confidence
- Add requirement that every finding must cite specific evidence
- This immediately reduces false positives with zero new infrastructure

### Phase 2: Layer 1 Deep Static Analysis (this week)
- Build the IPA extraction and parsing pipeline
- Implement each sub-analyzer (privacy, entitlements, SDKs, assets, build config, code signing)
- Output structured JSON findings
- Feed structured findings to AI models instead of raw IPA contents
- This replaces the AI "guessing" with proven facts

### Phase 3: Scan Memory + Re-scan Comparison (next)
- Create the luminetic-scan-history DynamoDB table
- Implement scan storage and retrieval
- Add IPA hash deduplication
- Modify AI prompts to include previous scan context
- Build the resolved/persistent/new comparison logic

### Phase 4: Layer 2 AWS Device Farm (after Layer 1 is solid)
- Set up Device Farm project in us-west-2
- Implement the upload > schedule > poll > retrieve flow
- Parse Device Farm artifacts
- Feed runtime results into AI synthesis
- Handle edge cases (Device Farm unavailable, IPA won't install, etc.)

### Phase 5: PDF Export
- Generate downloadable PDF report from the final report JSON
- Include: readiness score, all findings with severity and remediation, comparison with previous scan, Device Farm screenshots
- Branded with Luminetic design system (Bebas Neue, Space Mono, DM Sans, #ff6a00 orange, dark theme)

---

## Files Likely Involved

### New files to create:
- `src/lib/ipa-analyzer.ts` -- IPA extraction and static analysis orchestrator
- `src/lib/analyzers/privacy-analyzer.ts` -- Privacy manifest + NSUsageDescription analysis
- `src/lib/analyzers/entitlements-analyzer.ts` -- Entitlements cross-check
- `src/lib/analyzers/sdk-analyzer.ts` -- Embedded SDK audit
- `src/lib/analyzers/asset-analyzer.ts` -- Icon, launch screen validation
- `src/lib/analyzers/build-config-analyzer.ts` -- Info.plist configuration analysis
- `src/lib/analyzers/code-signing-analyzer.ts` -- Signature validation
- `src/lib/device-farm.ts` -- AWS Device Farm integration
- `src/lib/scan-history.ts` -- DynamoDB scan history read/write
- `src/lib/scan-comparison.ts` -- Re-scan diff logic

### Existing files to modify:
- `src/app/api/analyze-stream/route.ts` -- Updated to use three-layer pipeline
- `src/app/api/upload-ipa/route.ts` -- Add IPA hash computation, dedup check
- `src/app/(app)/analyze/page.tsx` -- Display comparison results, resolved/persistent/new
- Lambda function (`index.mjs`) -- Updated AI prompts with structured inputs

### Infrastructure:
- New DynamoDB table: `luminetic-scan-history`
- S3 bucket or prefix for Device Farm artifacts: `luminetic-scans/`
- IAM permissions: Device Farm access for the Lambda/Amplify role
- Environment variables: `DEVICE_FARM_PROJECT_ARN` (add to Amplify)

---

## Hard Rules

1. Never use em dashes in any output
2. Never suggest Stripe. Square is the payment processor
3. Layer 1 findings must have confidence = 1.0 (provable from binary)
4. Layer 2 findings must have confidence = 0.9+ (observed on real device)
5. AI-inferred findings must have confidence >= 0.7 or be suppressed
6. Every finding MUST cite the specific Apple guideline section
7. Never flag something the AI "thinks might be an issue" without evidence
8. IPA files are deleted after scan (zero data retention policy unchanged)
9. Device Farm artifacts follow the same 30-day S3 lifecycle policy
10. If IPA hash matches previous scan, do NOT charge a credit
