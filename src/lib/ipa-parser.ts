import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET!;

// ── Types ──────────────────────────────────────────────────

export interface IpaMetadata {
  bundleId: string | null;
  appName: string | null;
  version: string | null;
  buildNumber: string | null;
  minimumOSVersion: string | null;
  exportCompliance: boolean | null; // ITSAppUsesNonExemptEncryption
  supportsIndirectInputEvents: boolean | null;
  privacyUsageDescriptions: Record<string, string>;
  requiredDeviceCapabilities: string[];
  backgroundModes: string[];
  urlSchemes: string[];
  urlTypes: UrlType[];
  queriesSchemes: string[];
  entitlements: Record<string, unknown>;
  frameworks: string[];
}

export interface UrlType {
  role: string | null;
  name: string | null;
  schemes: string[];
}

// ── XML Plist Parser ───────────────────────────────────────

/**
 * Simple XML plist parser using regex.
 * Handles <string>, <true/>, <false/>, <integer>, <real>, <array>, <dict>.
 * Sufficient for most Info.plist files shipped inside .ipa bundles.
 */
function parseXmlPlist(xml: string): Record<string, unknown> | null {
  // Quick check: is this actually an XML plist?
  if (!xml.includes("<plist") || !xml.includes("<dict>")) {
    return null;
  }

  // Remove XML declaration and plist wrapper
  const dictMatch = xml.match(/<dict>([\s\S]*)<\/dict>/);
  if (!dictMatch) return null;

  return parseDictContent(dictMatch[1]!);
}

function parseDictContent(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  // Tokenize: find all top-level tags
  const tokens = tokenize(content);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.type === "key") {
      const key = token.value;
      i++;
      if (i < tokens.length) {
        const valToken = tokens[i]!;
        result[key] = tokenToValue(valToken);
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

interface PlistToken {
  type: "key" | "string" | "integer" | "real" | "true" | "false" | "array" | "dict" | "data" | "date";
  value: string;
  raw?: string; // for array/dict, holds inner content
}

function tokenize(content: string): PlistToken[] {
  const tokens: PlistToken[] = [];
  const tagRe =
    /<(key|string|integer|real|data|date)>([\s\S]*?)<\/\1>|<(true|false)\s*\/>|<(array)>([\s\S]*?)<\/array>|<(dict)>([\s\S]*?)<\/dict>/g;

  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(content)) !== null) {
    if (match[1]) {
      // key, string, integer, real, data, date
      tokens.push({ type: match[1] as PlistToken["type"], value: match[2]! });
    } else if (match[3]) {
      // true / false
      tokens.push({ type: match[3] as "true" | "false", value: match[3]! });
    } else if (match[4] === "array") {
      tokens.push({ type: "array", value: "", raw: match[5]! });
    } else if (match[6] === "dict") {
      tokens.push({ type: "dict", value: "", raw: match[7]! });
    }
  }

  return tokens;
}

function tokenToValue(token: PlistToken): unknown {
  switch (token.type) {
    case "string":
    case "date":
      return token.value;
    case "data":
      return token.value.trim();
    case "integer":
      return parseInt(token.value, 10);
    case "real":
      return parseFloat(token.value);
    case "true":
      return true;
    case "false":
      return false;
    case "array": {
      const items = tokenize(token.raw || "");
      return items.map(tokenToValue);
    }
    case "dict":
      return parseDictContent(token.raw || "");
    case "key":
      return token.value;
    default:
      return token.value;
  }
}

// ── Entitlements Extractor ─────────────────────────────────

/**
 * Parses entitlements from the embedded.mobileprovision XML envelope.
 * The file is a CMS/PKCS7 blob with an XML plist embedded inside it.
 */
function extractEntitlementsFromProvision(raw: Uint8Array): Record<string, unknown> {
  // The XML plist is embedded directly inside the binary blob — find it by markers
  const text = new TextDecoder("utf-8", { fatal: false }).decode(raw);
  const plistStart = text.indexOf("<?xml");
  const plistEnd = text.indexOf("</plist>");

  if (plistStart === -1 || plistEnd === -1) return {};

  const plistXml = text.slice(plistStart, plistEnd + "</plist>".length);
  const parsed = parseXmlPlist(plistXml);
  if (!parsed) return {};

  // The Entitlements dict is nested inside the top-level dict
  const entitlements = parsed["Entitlements"];
  if (entitlements && typeof entitlements === "object" && !Array.isArray(entitlements)) {
    return entitlements as Record<string, unknown>;
  }

  return {};
}

// ── Helpers ────────────────────────────────────────────────

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function extractUrlTypes(val: unknown): UrlType[] {
  if (!Array.isArray(val)) return [];
  return val.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") return { role: null, name: null, schemes: [] };
    const dict = entry as Record<string, unknown>;
    return {
      role: typeof dict["CFBundleURLRole"] === "string" ? dict["CFBundleURLRole"] : null,
      name: typeof dict["CFBundleURLName"] === "string" ? dict["CFBundleURLName"] : null,
      schemes: toStringArray(dict["CFBundleURLSchemes"]),
    };
  });
}

function collectPrivacyUsageDescriptions(plist: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(plist)) {
    if (key.startsWith("NS") && key.endsWith("UsageDescription") && typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

// ── Main Parser ────────────────────────────────────────────

export async function parseIpa(s3Key: string): Promise<IpaMetadata> {
  // 1. Download from S3
  const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  if (!resp.Body) throw new Error("Empty response body from S3");

  const bodyBytes = await resp.Body.transformToByteArray();
  const zip = await JSZip.loadAsync(bodyBytes);

  // 2. Locate Payload/*.app/Info.plist
  const appDirPrefix = "Payload/";
  let appDir: string | null = null;

  for (const path of Object.keys(zip.files)) {
    if (path.startsWith(appDirPrefix) && path.endsWith(".app/Info.plist")) {
      appDir = path.replace("Info.plist", "");
      break;
    }
  }

  if (!appDir) throw new Error("Could not find Payload/*.app/Info.plist in IPA");

  // 3. Parse Info.plist
  const plistFile = zip.file(`${appDir}Info.plist`);
  if (!plistFile) throw new Error("Info.plist not found in zip");

  const plistData = await plistFile.async("uint8array");
  const plistText = new TextDecoder("utf-8", { fatal: false }).decode(plistData);
  const plist = parseXmlPlist(plistText);

  if (!plist) {
    throw new Error(
      "Could not parse Info.plist. Binary plists are not supported — " +
        "only XML format Info.plist files can be parsed."
    );
  }

  // 4. Extract embedded.mobileprovision entitlements
  let entitlements: Record<string, unknown> = {};
  const provisionFile = zip.file(`${appDir}embedded.mobileprovision`);
  if (provisionFile) {
    const provisionData = await provisionFile.async("uint8array");
    entitlements = extractEntitlementsFromProvision(provisionData);
  }

  // 5. List frameworks
  const frameworksPrefix = `${appDir}Frameworks/`;
  const frameworks: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (path.startsWith(frameworksPrefix) && path.endsWith(".framework/")) {
      const name = path.slice(frameworksPrefix.length, -".framework/".length);
      // Skip nested paths (only take top-level frameworks)
      if (!name.includes("/")) {
        frameworks.push(name);
      }
    }
  }

  // 6. Build metadata
  const getString = (key: string): string | null => {
    const v = plist[key];
    return typeof v === "string" ? v : null;
  };

  const getBool = (key: string): boolean | null => {
    const v = plist[key];
    return typeof v === "boolean" ? v : null;
  };

  return {
    bundleId: getString("CFBundleIdentifier"),
    appName: getString("CFBundleDisplayName") || getString("CFBundleName"),
    version: getString("CFBundleShortVersionString"),
    buildNumber: getString("CFBundleVersion"),
    minimumOSVersion: getString("MinimumOSVersion"),
    exportCompliance: getBool("ITSAppUsesNonExemptEncryption"),
    supportsIndirectInputEvents: getBool("UIApplicationSupportsIndirectInputEvents"),
    privacyUsageDescriptions: collectPrivacyUsageDescriptions(plist),
    requiredDeviceCapabilities: toStringArray(plist["UIRequiredDeviceCapabilities"]),
    backgroundModes: toStringArray(plist["UIBackgroundModes"]),
    urlSchemes: [],
    urlTypes: extractUrlTypes(plist["CFBundleURLTypes"]),
    queriesSchemes: toStringArray(plist["LSApplicationQueriesSchemes"]),
    entitlements,
    frameworks: frameworks.sort(),
  };
}
