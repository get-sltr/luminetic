import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NextRequest, NextResponse } from "next/server";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

const SYSTEM_PROMPT = `You are AppReady's Apple Review Analyzer. A user will paste their Apple App Store rejection email. Your job:

1. Identify the specific Apple guideline(s) violated (e.g., "Guideline 2.1 - App Completeness")
2. Explain in plain English WHY the app was rejected
3. Give a numbered list of concrete, actionable fixes
4. End with a pro tip specific to their rejection type

Keep your response concise and practical. No fluff. Format with clear sections using line breaks.
If the input doesn't look like a rejection email, politely say so and ask them to paste the actual email.`;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || email.trim().length < 10) {
      return NextResponse.json(
        { error: "Please paste a valid rejection email." },
        { status: 400 }
      );
    }

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is my Apple App Store rejection email:\n\n${email.trim()}`,
        },
      ],
    });

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-4-6",
      contentType: "application/json",
      accept: "application/json",
      body: new TextEncoder().encode(body),
    });

    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const text = result.content?.[0]?.text || "";

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    console.error("Analyze API error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to analyze rejection email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
