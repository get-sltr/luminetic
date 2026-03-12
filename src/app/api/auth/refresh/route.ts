import { NextRequest, NextResponse } from "next/server";
import { refreshSession } from "@/lib/cognito";
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(1, "No refresh token."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = schema.parse(body);

    const result = await refreshSession(refreshToken);
    const accessToken = result.AuthenticationResult?.AccessToken;

    if (!accessToken) return NextResponse.json({ error: "Refresh failed." }, { status: 401 });

    return NextResponse.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }
}
