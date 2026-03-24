import { SquareClient, SquareEnvironment } from "square";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedToken: string | null = null;
let tokenFetchedAt = 0;
const TOKEN_TTL_MS = 30 * 60 * 1000; // Re-fetch from Secrets Manager every 30 minutes

async function getSquareToken(): Promise<string> {
  // Try env var first (works on Amplify without Secrets Manager credentials)
  const envToken = process.env.SQUARE_ACCESS_TOKEN;
  if (envToken) return envToken;

  // Fall back to Secrets Manager (works locally with AWS CLI credentials)
  const now = Date.now();
  if (cachedToken && now - tokenFetchedAt < TOKEN_TTL_MS) return cachedToken;
  try {
    const command = new GetSecretValueCommand({
      SecretId: "luminetic/square-access-token",
    });
    const response = await secretsClient.send(command);
    const token = response.SecretString
      ? JSON.parse(response.SecretString).SQUARE_ACCESS_TOKEN
      : null;
    if (!token) throw new Error("Square access token not found in Secrets Manager");
    cachedToken = token;
    tokenFetchedAt = now;
    return token;
  } catch {
    throw new Error(
      "Square access token is not configured. Set SQUARE_ACCESS_TOKEN environment variable."
    );
  }
}

export async function getSquareClient(): Promise<SquareClient> {
  const isSandbox = process.env.SQUARE_ENVIRONMENT === "sandbox";

  if (isSandbox) {
    const sandboxToken = process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    if (!sandboxToken) throw new Error("SQUARE_SANDBOX_ACCESS_TOKEN not set");
    return new SquareClient({
      token: sandboxToken,
      environment: SquareEnvironment.Sandbox,
    });
  }

  const token = await getSquareToken();
  return new SquareClient({
    token,
    environment: SquareEnvironment.Production,
  });
}

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";
export const SQUARE_APP_ID = process.env.SQUARE_APP_ID || "";

export { SCAN_PACKS } from "./scan-packs";
