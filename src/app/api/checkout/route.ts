import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSquareClient, SQUARE_LOCATION_ID, SCAN_PACKS } from "@/lib/square";
import { checkoutLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { randomUUID } from "crypto";

const schema = z.object({
  packId: z.enum(["starter", "pro", "agency"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Rate limit by userId
    const rl = checkoutLimiter.check(user.userId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const { packId } = schema.parse(body);

    const pack = SCAN_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack." }, { status: 400 });
    }

    const square = await getSquareClient();
    const idempotencyKey = randomUUID();

    const ALLOWED_ORIGINS = ["https://luminetic.io", "https://www.luminetic.io", "http://localhost:3000"];
    const requestOrigin = request.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : "https://luminetic.io";

    const response = await square.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: SQUARE_LOCATION_ID,
        lineItems: [
          {
            name: `Luminetic ${pack.name} — ${pack.scans} scan${pack.scans > 1 ? "s" : ""}`,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(pack.priceInCents),
              currency: "USD",
            },
          },
        ],
        metadata: {
          userId: user.userId,
          packId: pack.id,
          scans: pack.scans.toString(),
        },
      },
      checkoutOptions: {
        redirectUrl: `${origin}/dashboard?purchased=${pack.id}`,
        askForShippingAddress: false,
      },
    });

    const checkoutUrl = response.paymentLink?.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "Failed to create checkout." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}
