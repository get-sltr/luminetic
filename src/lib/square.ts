import { SquareClient } from "square";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

let cachedToken: string | null = null;

async function getSquareToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const command = new GetSecretValueCommand({
    SecretId: "luminetic/square-access-token",
  });
  const response = await secretsClient.send(command);
  const token = response.SecretString
    ? JSON.parse(response.SecretString).SQUARE_ACCESS_TOKEN
    : null;
  if (!token) throw new Error("Square access token not found in Secrets Manager");
  cachedToken = token;
  return token;
}

export async function getSquareClient(): Promise<SquareClient> {
  const token = await getSquareToken();
  return new SquareClient({
    token,
    environment: "production",
  });
}

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "LA734SKS22172";
export const SQUARE_APP_ID = process.env.SQUARE_APP_ID || "sq0idp-wpV9sdOfB-BsA2aM-KoE9w";

export interface ScanPack {
  id: string;
  name: string;
  scans: number;
  priceInCents: number;
}

export const SCAN_PACKS: ScanPack[] = [
  { id: "starter", name: "Starter", scans: 1, priceInCents: 1500 },
  { id: "pro", name: "Pro", scans: 3, priceInCents: 4000 },
  { id: "agency", name: "Agency", scans: 10, priceInCents: 14900 },
];
