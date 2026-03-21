import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const REGION = process.env.AWS_REGION || "us-east-1";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!_jwks) {
    const poolId = process.env.COGNITO_USER_POOL_ID;
    if (!poolId) throw new Error("COGNITO_USER_POOL_ID is not set");
    _jwks = createRemoteJWKSet(
      new URL(`https://cognito-idp.${REGION}.amazonaws.com/${poolId}/.well-known/jwks.json`)
    );
  }
  return _jwks;
}
function getPoolId() {
  const id = process.env.COGNITO_USER_POOL_ID;
  if (!id) throw new Error("COGNITO_USER_POOL_ID is not set");
  return id;
}

export interface AuthUser {
  userId: string;
  email: string;
  plan: string;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `https://cognito-idp.${REGION}.amazonaws.com/${getPoolId()}`,
    });

    return {
      userId: payload.sub as string,
      email: (payload.email as string) || "",
      plan: (payload["custom:plan"] as string) || "free",
    };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
) {
  const isProd = process.env.NODE_ENV === "production";

  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
}

export function requireAuth(request: NextRequest): string | null {
  return request.cookies.get("access_token")?.value || null;
}
