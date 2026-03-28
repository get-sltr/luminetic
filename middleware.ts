import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const REGION = process.env.AWS_REGION || "us-east-1";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  const poolId = process.env.COGNITO_USER_POOL_ID;
  if (!poolId) throw new Error("COGNITO_USER_POOL_ID is not set");
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://cognito-idp.${REGION}.amazonaws.com/${poolId}/.well-known/jwks.json`)
    );
  }
  return jwks;
}

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/verify",
  "/forgot-password",
  "/pricing",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublic(pathname: string): boolean {
  // All API routes handle their own auth
  if (pathname.startsWith("/api/")) return true;
  // Static/public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true;
  return false;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (accessToken) {
    try {
      const poolId = process.env.COGNITO_USER_POOL_ID;
      await jwtVerify(accessToken, getJWKS(), {
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${poolId}`,
      });
      return NextResponse.next();
    } catch {
      // Token expired, try refresh
      if (refreshToken) {
        const res = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          const response = NextResponse.next();
          response.cookies.set("access_token", data.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 60 * 60, // 1 hour — must match setAuthCookies in lib/auth.ts
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
