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

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/verify",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/verify",
  "/api/auth/refresh",
  "/api/webhooks",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (accessToken) {
    try {
      await jwtVerify(accessToken, getJWKS(), {
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${getPoolId()}`,
      });
      return NextResponse.next();
    } catch {
      if (refreshToken) {
        const refreshResponse = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const response = NextResponse.next();
          const isProd = process.env.NODE_ENV === "production";
          response.cookies.set("access_token", data.accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: "strict",
            maxAge: 15 * 60,
            path: "/",
          });
          return response;
        }
      }
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon).*)"],
};
